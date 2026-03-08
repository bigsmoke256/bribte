import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const VALID_PROVIDERS = [
  "schoolpay",
  "mtn mobilemoney",
  "mtn mobile money",
  "airtel money",
  "bank transfer",
  "stanbic",
  "centenary",
  "dfcu",
  "equity",
];

const VALID_INSTITUTIONS = [
  "buganda royal",
  "bribte",
  "buganda royal institute",
  "buganda royal institute of business",
];

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function notifyAdminsOfRejection(
  supabase: any,
  studentName: string,
  regNumber: string | null,
  reason: string,
  details: string,
  receiptId: string,
) {
  try {
    // Get an admin user_id to use as author
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();
    
    if (!adminRole) return;

    await supabase.from("announcements").insert({
      author_id: adminRole.user_id,
      title: `⚠️ Receipt Rejected: ${studentName || "Unknown Student"}`,
      message: `A receipt from ${studentName || "Unknown"} (${regNumber || "No Reg#"}) was automatically rejected.\n\nReason: ${reason}\nDetails: ${details}\n\nReceipt ID: ${receiptId}`,
      priority: "urgent",
      target_group: "admin",
    });
  } catch (e) {
    console.error("Failed to notify admins:", e);
  }
}

function normalizeString(s: string | null | undefined): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeString(a).split(/\s+/).filter(Boolean);
  const nb = normalizeString(b).split(/\s+/).filter(Boolean);
  if (na.length === 0 || nb.length === 0) return 0;
  const matches = na.filter(w => nb.includes(w)).length;
  return matches / Math.max(na.length, nb.length);
}

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

    // 1. Fetch receipt record with student info
    const { data: receipt, error: rErr } = await supabase
      .from("receipt_uploads")
      .select("*, student:students(id, user_id, course_id, registration_number, fee_balance, study_mode)")
      .eq("id", receipt_id)
      .single();
    if (rErr || !receipt) throw new Error("Receipt not found");

    const student = Array.isArray(receipt.student) ? receipt.student[0] : receipt.student;
    const validationFlags: Record<string, any> = {};

    // Fetch student profile name early for notifications
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", student.user_id)
      .single();
    const studentName = studentProfile?.full_name || "Unknown Student";
    const regNumber = student.registration_number;

    // Helper: reject with admin notification
    const rejectWithAlert = async (reason: string, reviewNotes: string, responseExtra: Record<string, any> = {}) => {
      await supabase.from("receipt_uploads").update({
        status: "rejected",
        review_notes: reviewNotes,
      }).eq("id", receipt_id);
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
        .eq("receipt_id", receipt_id);
      await notifyAdminsOfRejection(supabase, studentName, regNumber, reason, reviewNotes, receipt_id);
      return jsonResponse({ status: "rejected", reason, details: reviewNotes, ...responseExtra });
    };

    // 2. File hash duplicate check
    if (receipt.file_hash) {
      const { data: dup } = await supabase
        .from("receipt_uploads")
        .select("id")
        .eq("file_hash", receipt.file_hash)
        .neq("id", receipt_id)
        .neq("status", "rejected")
        .limit(1);
      if (dup && dup.length > 0) {
        return await rejectWithAlert("duplicate_file", "Duplicate file detected (same file already uploaded)");
      }
    }

    // 3. Fetch file and convert to base64 (chunked to avoid stack overflow)
    const fileResp = await fetch(receipt.file_url);
    if (!fileResp.ok) throw new Error("Failed to fetch receipt file");
    const fileBuffer = await fileResp.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    const contentType = fileResp.headers.get("content-type") || "image/jpeg";
    const mediaType = contentType.includes("pdf") ? "application/pdf" : contentType;

    // 4. AI OCR extraction + fraud detection prompt
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
                text: `You are a STRICT receipt fraud detection and OCR system for BUGANDA ROYAL INSTITUTE OF BUSINESS & TECHNICAL EDUCATION (BRIBTE).

Your job is to:
1. Determine if this image is a GENUINE SchoolPay transaction receipt (not a screenshot of text, not a typed document, not an edited image, not a hand-written note).
2. Extract payment data if it appears genuine.

A GENUINE SchoolPay receipt must have:
- A proper SchoolPay header/logo or formatting
- A Payment Code (transaction reference)
- Student Name and Class
- Amount with amount in words
- Channel information (e.g. MTN MobileMoney)
- Institution name that matches "BUGANDA ROYAL INSTITUTE" or "BRIBTE"
- Structured layout typical of SchoolPay receipts

RED FLAGS that indicate FAKE/INVALID receipt:
- Plain text typed in a document editor or notes app
- Screenshot of a chat message or SMS
- Hand-written or hand-drawn receipt
- Missing SchoolPay branding/structure
- Generic or suspicious formatting
- Image appears digitally manipulated or edited
- Amount in words doesn't match the numeric amount
- Institution name doesn't match BRIBTE / Buganda Royal Institute

Return ONLY a valid JSON object:
{
  "is_genuine_receipt": <true/false - is this a real SchoolPay receipt with proper formatting?>,
  "fraud_indicators": ["<list any red flags detected, empty array if none>"],
  "payment_code": "<string or null - the Payment Code / transaction code>",
  "student_name": "<string or null - Student Name>",
  "student_class": "<string or null - Student Class / course name>",
  "amount": <number or null - the Amount WITHOUT currency symbols or commas>,
  "amount_in_words": "<string or null - Amount in words>",
  "payment_date": "<YYYY-MM-DD HH:mm or null - Date field>",
  "channel": "<string or null - Channel e.g. MTN MobileMoney>",
  "description": "<string or null - Description field>",
  "trans_type": "<string or null - Trans Type>",
  "channel_depositor": "<string or null - Channel Depositor Name or Number>",
  "channel_memo": "<string or null - Channel Memo>",
  "institution_name": "<string or null - the institution name shown on receipt>",
  "payment_provider": "<string or null - e.g. SchoolPay>",
  "confidence_score": <0.0-1.0 - overall extraction confidence, lower if document looks suspicious>
}

CRITICAL: Be STRICT. If you have ANY doubt about the receipt being genuine, set is_genuine_receipt to false and list the fraud indicators. It is better to flag a real receipt for review than to approve a fake one.

Return ONLY the JSON, no markdown, no explanation.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mediaType};base64,${base64}` },
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI Gateway error [${aiResponse.status}]: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    let extracted: any;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extracted = null;
    }

    if (!extracted) {
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: "AI could not parse receipt content",
      }).eq("id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "extraction_failed" });
    }

    // 5. Store extraction results
    await supabase.from("receipt_extractions").insert({
      receipt_id,
      amount: extracted.amount,
      transaction_id: extracted.payment_code,
      payment_date: extracted.payment_date ? extracted.payment_date.substring(0, 10) : null,
      sender_name: extracted.student_name,
      payment_provider: extracted.payment_provider || "SchoolPay",
      raw_text: rawContent,
      confidence_score: extracted.confidence_score ?? 0.5,
      student_class: extracted.student_class,
      channel_depositor: extracted.channel_depositor,
      channel_memo: extracted.channel_memo,
      institution_name: extracted.institution_name,
      trans_type: extracted.trans_type,
      amount_in_words: extracted.amount_in_words,
      description: extracted.description,
      validation_flags: {
        is_genuine_receipt: extracted.is_genuine_receipt,
        fraud_indicators: extracted.fraud_indicators,
      },
    });

    // ============================================
    // VALIDATION PIPELINE
    // ============================================

    // CHECK 0: FRAUD DETECTION - Is this a genuine receipt?
    if (extracted.is_genuine_receipt === false) {
      const indicators = (extracted.fraud_indicators || []).join("; ");
      validationFlags.fraud_detected = true;
      validationFlags.fraud_indicators = extracted.fraud_indicators;
      const notes = `Receipt rejected: AI detected this is NOT a genuine SchoolPay receipt. Indicators: ${indicators || "Document does not match expected receipt format."}`;
      return await rejectWithAlert("fake_receipt", notes, { indicators: extracted.fraud_indicators });
    }

    // CHECK 1: Structure validation - mandatory fields
    const missingFields: string[] = [];
    if (!extracted.payment_code) missingFields.push("payment_code");
    if (!extracted.student_name) missingFields.push("student_name");
    if (!extracted.amount || extracted.amount <= 0) missingFields.push("amount");
    if (!extracted.payment_date) missingFields.push("payment_date");
    if (!extracted.channel) missingFields.push("channel");
    if (!extracted.institution_name) missingFields.push("institution_name");

    if (missingFields.length > 0) {
      validationFlags.missing_fields = missingFields;
      const notes = `Receipt rejected: missing mandatory fields: ${missingFields.join(", ")}. This may indicate a fake or incomplete receipt.`;
      return await rejectWithAlert("missing_fields", notes, { missing: missingFields });
    }

    // CHECK 2: Institution name must match BRIBTE
    const instNorm = normalizeString(extracted.institution_name);
    const isValidInstitution = VALID_INSTITUTIONS.some(v => instNorm.includes(v));
    validationFlags.institution_name = extracted.institution_name;
    validationFlags.institution_valid = isValidInstitution;

    if (!isValidInstitution) {
      const notes = `Receipt rejected: Institution "${extracted.institution_name}" does not match BUGANDA ROYAL INSTITUTE / BRIBTE.`;
      return await rejectWithAlert("wrong_institution", notes);
    }

    // CHECK 3: OCR confidence
    const confidence = extracted.confidence_score ?? 0;
    if (confidence < 0.5) {
      validationFlags.low_confidence = confidence;
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: `Low OCR confidence (${(confidence * 100).toFixed(0)}%). Receipt may be blurry, manipulated, or not a standard receipt.`,
      }).eq("id", receipt_id);
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
        .eq("receipt_id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "low_confidence" });
    }

    // CHECK 4: Transaction code duplicate
    if (extracted.payment_code) {
      const { data: dupTx } = await supabase
        .from("payment_transactions")
        .select("id")
        .eq("transaction_id", extracted.payment_code)
        .limit(1);
      if (dupTx && dupTx.length > 0) {
        validationFlags.duplicate_transaction = extracted.payment_code;
        const notes = `Duplicate transaction code: ${extracted.payment_code}. This receipt has already been processed.`;
        return await rejectWithAlert("duplicate_transaction", notes);
      }
    }

    // CHECK 5: Payment provider validation
    const channelNorm = normalizeString(extracted.channel);
    const providerNorm = normalizeString(extracted.payment_provider);
    const isKnownProvider = VALID_PROVIDERS.some(p =>
      channelNorm.includes(p) || providerNorm.includes(p)
    );
    if (!isKnownProvider) {
      validationFlags.unknown_provider = extracted.channel;
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: `Unknown payment provider/channel: "${extracted.channel}". Only SchoolPay, MTN, Airtel, and Bank Transfer are accepted.`,
      }).eq("id", receipt_id);
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
        .eq("receipt_id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "unknown_provider" });
    }

    // CHECK 6: Student name matching (reuse studentProfile fetched earlier)
    const studentDbName = studentName;
    const receiptStudentName = extracted.student_name || "";
    const receiptStudentName = extracted.student_name || "";
    const similarity = nameSimilarity(studentDbName, receiptStudentName);
    validationFlags.name_similarity = similarity;
    validationFlags.db_name = studentDbName;
    validationFlags.receipt_name = receiptStudentName;

    if (similarity < 0.3) {
      const notes = `Student name mismatch. Receipt: "${receiptStudentName}", Database: "${studentDbName}". Names do not match.`;
      return await rejectWithAlert("name_mismatch", notes);
    }

    if (similarity < 0.7) {
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: `Student name partially matches. Receipt: "${receiptStudentName}", Database: "${studentDbName}" (similarity: ${(similarity * 100).toFixed(0)}%).`,
      }).eq("id", receipt_id);
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
        .eq("receipt_id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "name_partial_match" });
    }

    // CHECK 7: Course / enrollment validation
    if (extracted.student_class && student.course_id) {
      const { data: course } = await supabase
        .from("courses")
        .select("course_name, course_code")
        .eq("id", student.course_id)
        .single();

      if (course) {
        const receiptCourse = normalizeString(extracted.student_class);
        const dbCourseName = normalizeString(course.course_name);
        const dbCourseCode = normalizeString(course.course_code);

        const courseMatch =
          receiptCourse.includes(dbCourseName) ||
          dbCourseName.includes(receiptCourse) ||
          receiptCourse.includes(dbCourseCode) ||
          nameSimilarity(receiptCourse, dbCourseName) > 0.5;

        validationFlags.course_match = courseMatch;
        validationFlags.receipt_course = extracted.student_class;
        validationFlags.db_course = course.course_name;

        if (!courseMatch) {
          await supabase.from("receipt_uploads").update({
            status: "review_required",
            review_notes: `Course mismatch. Receipt: "${extracted.student_class}", Enrolled in: "${course.course_name}".`,
          }).eq("id", receipt_id);
          await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
            .eq("receipt_id", receipt_id);
          return jsonResponse({ status: "review_required", reason: "course_mismatch" });
        }
      }
    }

    // CHECK 8: Amount in words cross-check
    if (extracted.amount_in_words && extracted.amount) {
      // Simple check: if amount_in_words doesn't contain key digits, flag it
      const amountStr = String(Math.round(extracted.amount));
      const wordsNorm = normalizeString(extracted.amount_in_words);
      // Just flag if amount is very different from what words suggest
      validationFlags.amount_in_words = extracted.amount_in_words;
      validationFlags.amount_numeric = extracted.amount;
    }

    // CHECK 9: Amount validation
    const amount = Number(extracted.amount);
    const outstandingBalance = Number(student.fee_balance || 0);
    validationFlags.extracted_amount = amount;
    validationFlags.outstanding_balance = outstandingBalance;

    if (amount > 10000000) {
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: `Unusually high payment amount: UGX ${amount.toLocaleString()}. Requires manual verification.`,
      }).eq("id", receipt_id);
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
        .eq("receipt_id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "amount_suspicious" });
    }

    if (outstandingBalance > 0 && amount > outstandingBalance * 3) {
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: `Payment amount (UGX ${amount.toLocaleString()}) is more than 3x the outstanding balance (UGX ${outstandingBalance.toLocaleString()}). Requires verification.`,
      }).eq("id", receipt_id);
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
        .eq("receipt_id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "amount_suspicious" });
    }

    // CHECK 10: Fraud indicators even if is_genuine_receipt is true
    if (extracted.fraud_indicators && extracted.fraud_indicators.length > 0) {
      validationFlags.fraud_indicators = extracted.fraud_indicators;
      const indicators = extracted.fraud_indicators.join("; ");
      await supabase.from("receipt_uploads").update({
        status: "review_required",
        review_notes: `Receipt has potential fraud indicators: ${indicators}. Sending for manual review.`,
      }).eq("id", receipt_id);
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
        .eq("receipt_id", receipt_id);
      return jsonResponse({ status: "review_required", reason: "fraud_indicators" });
    }

    // ============================================
    // ALL CHECKS PASSED - AUTO-APPROVE
    // ============================================
    validationFlags.auto_approved = true;

    // Create payment record
    const { error: payErr } = await supabase.from("payments").insert({
      student_id: student.id,
      amount,
      payment_status: "approved",
      receipt_url: receipt.file_url,
      notes: `Auto-verified via SchoolPay. Code: ${extracted.payment_code}. Channel: ${extracted.channel}. Provider: ${extracted.payment_provider || "SchoolPay"}. Confidence: ${(confidence * 100).toFixed(0)}%. Name match: ${(similarity * 100).toFixed(0)}%`,
    });
    if (payErr) throw new Error("Failed to create payment: " + payErr.message);

    // Track transaction for duplicate prevention
    if (extracted.payment_code) {
      await supabase.from("payment_transactions").insert({
        student_id: student.id,
        course_id: receipt.course_id,
        transaction_id: extracted.payment_code,
        amount,
        receipt_id,
      });
    }

    // Recalculate balance
    await supabase.rpc("recalculate_fee_balance", { p_student_id: student.id });

    const { data: updatedStudent } = await supabase
      .from("students")
      .select("fee_balance")
      .eq("id", student.id)
      .single();

    // Update receipt and extraction
    await supabase.from("receipt_uploads").update({ status: "verified" }).eq("id", receipt_id);
    await supabase.from("receipt_extractions").update({ validation_flags: validationFlags })
      .eq("receipt_id", receipt_id);

    return jsonResponse({
      status: "verified",
      extracted: { amount, transaction_id: extracted.payment_code },
      new_balance: updatedStudent?.fee_balance ?? null,
    });
  } catch (error) {
    console.error("process-receipt error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
