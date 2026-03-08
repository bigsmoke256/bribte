import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { receipt_id } = await req.json();
    if (!receipt_id) throw new Error("receipt_id is required");

    // 1. Fetch receipt record
    const { data: receipt, error: rErr } = await supabase
      .from("receipt_uploads")
      .select("*, student:students(id, user_id, course_id, registration_number)")
      .eq("id", receipt_id)
      .single();
    if (rErr || !receipt) throw new Error("Receipt not found");

    // 2. Check duplicate file hash
    if (receipt.file_hash) {
      const { data: dup } = await supabase
        .from("receipt_uploads")
        .select("id")
        .eq("file_hash", receipt.file_hash)
        .neq("id", receipt_id)
        .neq("status", "rejected")
        .limit(1);
      if (dup && dup.length > 0) {
        await supabase.from("receipt_uploads").update({ status: "rejected", review_notes: "Duplicate file detected" }).eq("id", receipt_id);
        return new Response(JSON.stringify({ status: "rejected", reason: "duplicate_file" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 3. Fetch the file and convert to base64 for vision
    const fileUrl = receipt.file_url;
    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) throw new Error("Failed to fetch receipt file");
    const fileBuffer = await fileResp.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    const contentType = fileResp.headers.get("content-type") || "image/jpeg";
    const mediaType = contentType.includes("pdf") ? "application/pdf" : contentType;

    // 4. Send to AI for OCR extraction
    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a payment receipt OCR extraction system. Analyze this receipt image and extract the following fields. Return ONLY a valid JSON object with these fields:
{
  "amount": <number or null>,
  "transaction_id": "<string or null>",
  "payment_date": "<YYYY-MM-DD or null>",
  "sender_name": "<string or null>",
  "payment_provider": "<string or null - e.g. MTN Mobile Money, Airtel Money, Bank name, etc>",
  "confidence_score": <0.0-1.0 float indicating your confidence in the extraction>
}

Important:
- Amount should be a number without currency symbols
- Transaction ID is any reference number, receipt number, or transaction code
- Payment date in YYYY-MM-DD format
- Be honest about confidence - if the image is unclear, set a low score
- Return ONLY the JSON, no markdown, no explanation`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${base64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI Gateway error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    let extracted: any;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extracted = null;
    }

    if (!extracted) {
      await supabase.from("receipt_uploads").update({ status: "review_required", review_notes: "OCR extraction failed to parse" }).eq("id", receipt_id);
      return new Response(JSON.stringify({ status: "review_required", reason: "extraction_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Store extraction results
    const { error: exErr } = await supabase.from("receipt_extractions").insert({
      receipt_id,
      amount: extracted.amount,
      transaction_id: extracted.transaction_id,
      payment_date: extracted.payment_date,
      sender_name: extracted.sender_name,
      payment_provider: extracted.payment_provider,
      raw_text: rawContent,
      confidence_score: extracted.confidence_score ?? 0.5,
    });
    if (exErr) console.error("Extraction insert error:", exErr);

    // 6. Run verification
    const issues: string[] = [];

    // Check confidence
    if ((extracted.confidence_score ?? 0) < 0.6) {
      issues.push("Low OCR confidence score");
    }

    // Check duplicate transaction ID
    if (extracted.transaction_id) {
      const { data: dupTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("transaction_id", extracted.transaction_id)
        .limit(1);
      if (dupTx && dupTx.length > 0) {
        await supabase.from("receipt_uploads").update({ status: "rejected", review_notes: "Duplicate transaction ID: " + extracted.transaction_id }).eq("id", receipt_id);
        return new Response(JSON.stringify({ status: "rejected", reason: "duplicate_transaction" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      issues.push("No transaction ID extracted");
    }

    // Check amount validity
    if (!extracted.amount || extracted.amount <= 0) {
      issues.push("Invalid or missing amount");
    }

    // Check student enrollment
    const student = Array.isArray(receipt.student) ? receipt.student[0] : receipt.student;
    if (receipt.course_id && student) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", student.id)
        .eq("course_id", receipt.course_id)
        .limit(1);
      if (!enrollment || enrollment.length === 0) {
        issues.push("Student not enrolled in specified course");
      }
    }

    // 7. Decide outcome
    if (issues.length > 0) {
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: issues.join("; "),
      }).eq("id", receipt_id);

      return new Response(JSON.stringify({ status: "review_required", issues }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. All checks passed - apply payment
    // Insert payment record
    const { error: payErr } = await supabase.from("payments").insert({
      student_id: student.id,
      amount: extracted.amount,
      payment_status: "approved",
      receipt_url: receipt.file_url,
      notes: `Auto-verified. Tx: ${extracted.transaction_id || "N/A"}. Provider: ${extracted.payment_provider || "N/A"}`,
    });
    if (payErr) throw new Error("Failed to create payment: " + payErr.message);

    // Insert payment transaction for duplicate tracking
    if (extracted.transaction_id) {
      await supabase.from("payment_transactions").insert({
        student_id: student.id,
        course_id: receipt.course_id,
        transaction_id: extracted.transaction_id,
        amount: extracted.amount,
        receipt_id,
      });
    }

    // Recalculate fee balance
    await supabase.rpc("recalculate_fee_balance", { p_student_id: student.id });

    // Update receipt status
    await supabase.from("receipt_uploads").update({ status: "verified" }).eq("id", receipt_id);

    return new Response(JSON.stringify({ status: "verified", extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("process-receipt error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
