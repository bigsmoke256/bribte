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

    const student = Array.isArray(receipt.student) ? receipt.student[0] : receipt.student;

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
        return jsonResponse({ status: "rejected", reason: "duplicate_file" });
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
                text: `You are a payment receipt OCR extraction system for a university fee payment system. Analyze this receipt image and extract payment details. Return ONLY a valid JSON object:
{
  "amount": <number or null - the payment amount WITHOUT currency symbols>,
  "transaction_id": "<string or null - any reference/receipt/transaction number>",
  "payment_date": "<YYYY-MM-DD or null>",
  "sender_name": "<string or null - the payer's name>",
  "payment_provider": "<string or null - e.g. MTN Mobile Money, Airtel Money, Bank name>",
  "confidence_score": <0.0-1.0 indicating confidence in the amount extraction>
}

CRITICAL: The most important field is "amount". Try your best to extract it. If you can read any number that looks like a payment amount, extract it. Be generous with confidence if you can clearly see an amount.
Return ONLY the JSON, no markdown, no explanation.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mediaType};base64,${base64}` },
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
      await supabase.from("receipt_uploads").update({ status: "review_required", review_notes: "AI could not parse receipt content" }).eq("id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "extraction_failed" });
    }

    // 5. Store extraction results
    await supabase.from("receipt_extractions").insert({
      receipt_id,
      amount: extracted.amount,
      transaction_id: extracted.transaction_id,
      payment_date: extracted.payment_date,
      sender_name: extracted.sender_name,
      payment_provider: extracted.payment_provider,
      raw_text: rawContent,
      confidence_score: extracted.confidence_score ?? 0.5,
    });

    // 6. Check duplicate transaction ID
    if (extracted.transaction_id) {
      const { data: dupTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("transaction_id", extracted.transaction_id)
        .limit(1);
      if (dupTx && dupTx.length > 0) {
        await supabase.from("receipt_uploads").update({ status: "rejected", review_notes: "Duplicate transaction ID: " + extracted.transaction_id }).eq("id", receipt_id);
        return jsonResponse({ status: "rejected", reason: "duplicate_transaction" });
      }
    }

    // 7. Decide: auto-approve or send to review
    // Only send to review if we truly cannot extract an amount
    if (!extracted.amount || extracted.amount <= 0) {
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: "Could not extract payment amount from receipt",
      }).eq("id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "no_amount" });
    }

    // Very low confidence AND no transaction ID = send to review
    if ((extracted.confidence_score ?? 0) < 0.3 && !extracted.transaction_id) {
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: "Very low confidence and no transaction reference",
      }).eq("id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "low_confidence" });
    }

    // 8. AUTO-APPROVE: Apply payment immediately
    const { error: payErr } = await supabase.from("payments").insert({
      student_id: student.id,
      amount: extracted.amount,
      payment_status: "approved",
      receipt_url: receipt.file_url,
      notes: `AI-verified. Amount: ${extracted.amount}. Tx: ${extracted.transaction_id || "N/A"}. Provider: ${extracted.payment_provider || "N/A"}. Confidence: ${(extracted.confidence_score * 100).toFixed(0)}%`,
    });
    if (payErr) throw new Error("Failed to create payment: " + payErr.message);

    // Track transaction ID for duplicate prevention
    if (extracted.transaction_id) {
      await supabase.from("payment_transactions").insert({
        student_id: student.id,
        course_id: receipt.course_id,
        transaction_id: extracted.transaction_id,
        amount: extracted.amount,
        receipt_id,
      });
    }

    // Recalculate fee balance (supports overpayment/credit)
    await supabase.rpc("recalculate_fee_balance", { p_student_id: student.id });

    // Get updated balance for response
    const { data: updatedStudent } = await supabase
      .from("students")
      .select("fee_balance")
      .eq("id", student.id)
      .single();

    // Update receipt status
    await supabase.from("receipt_uploads").update({ status: "verified" }).eq("id", receipt_id);

    return jsonResponse({
      status: "verified",
      extracted,
      new_balance: updatedStudent?.fee_balance ?? null,
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

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" },
  });
}
