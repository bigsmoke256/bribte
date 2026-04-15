import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const VALID_PROVIDERS = [
  "schoolpay", "mtn mobilemoney", "mtn mobile money", "airtel money",
  "bank transfer", "stanbic", "centenary", "dfcu", "equity",
];

const VALID_INSTITUTIONS = [
  "buganda royal", "bribte", "buganda royal institute",
  "buganda royal institute of business",
];

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function setReceiptStatus(
  supabase: ReturnType<typeof createClient>,
  receiptId: string,
  status: string,
  reviewNotes: string,
  validationFlags?: Record<string, unknown>,
) {
  try {
    await supabase.from("receipt_uploads").update({ status, review_notes: reviewNotes }).eq("id", receiptId);
    if (validationFlags) {
      await supabase.from("receipt_extractions").update({ validation_flags: validationFlags }).eq("receipt_id", receiptId);
    }
  } catch (e) {
    // Non-fatal
  }
}

async function notifyAdminsOfRejection(
  supabase: ReturnType<typeof createClient>,
  studentName: string,
  regNumber: string | null,
  reason: string,
  details: string,
  receiptId: string,
) {
  try {
    const { data: adminRole } = await supabase
      .from("user_roles").select("user_id").eq("role", "admin").limit(1).single();
    if (!adminRole) return;
    await supabase.from("announcements").insert({
      author_id: adminRole.user_id,
      title: `⚠️ Receipt Rejected: ${studentName || "Unknown Student"}`,
      message: `A receipt from ${studentName || "Unknown"} (${regNumber || "No Reg#"}) was automatically rejected.\n\nReason: ${reason}\nDetails: ${details}\n\nReceipt ID: ${receiptId}`,
      priority: "urgent",
      target_group: "admin",
    });
  } catch (_e) {
    // Non-fatal
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
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "LOVABLE_API_KEY not configured" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { receipt_id } = body;
    if (!receipt_id) {
      return jsonResponse({ error: "receipt_id is required" }, 400);
    }

    // 1. Fetch receipt record with student info
    const { data: receipt, error: rErr } = await supabase
      .from("receipt_uploads")
      .select("*, student:students(id, user_id, course_id, registration_number, fee_balance, study_mode)")
      .eq("id", receipt_id)
      .single();

    if (rErr || !receipt) {
      return jsonResponse({ error: "Receipt not found" }, 404);
    }

    const student = Array.isArray(receipt.student) ? receipt.student[0] : receipt.student;
    if (!student) {
      await setReceiptStatus(supabase, receipt_id, "review_required", "Student record not found for this receipt");
      return jsonResponse({ status: "review_required", reason: "student_not_found" });
    }

    const validationFlags: Record<string, unknown> = {};

    // Fetch student profile name
    let studentName = "Unknown Student";
    let regNumber: string | null = student.registration_number;
    try {
      const { data: studentProfile } = await supabase
        .from("profiles").select("full_name").eq("user_id", student.user_id).single();
      studentName = studentProfile?.full_name || "Unknown Student";
    } catch {
      // Non-fatal
    }

    // Helper: reject with admin notification
    const rejectWithAlert = async (reason: string, reviewNotes: string, responseExtra: Record<string, unknown> = {}) => {
      await setReceiptStatus(supabase, receipt_id, "rejected", reviewNotes, validationFlags);
      await notifyAdminsOfRejection(supabase, studentName, regNumber, reason, reviewNotes, receipt_id);
      return jsonResponse({ status: "rejected", reason, details: reviewNotes, ...responseExtra });
    };

    // 2. File hash duplicate check
    if (receipt.file_hash) {
      try {
        const { data: dup } = await supabase
          .from("receipt_uploads").select("id")
          .eq("file_hash", receipt.file_hash).neq("id", receipt_id).neq("status", "rejected").limit(1);
        if (dup && dup.length > 0) {
          return await rejectWithAlert("duplicate_file", "Duplicate file detected (same file already uploaded)");
        }
      } catch {
        // Non-fatal, continue processing
      }
    }

    // 3. Fetch file and convert to base64
    let base64: string;
    let mediaType: string;
    try {
      const fileResp = await fetch(receipt.file_url);
      if (!fileResp.ok) throw new Error("Failed to fetch receipt file");
      const fileBuffer = await fileResp.arrayBuffer();
      const bytes = new Uint8Array(fileBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      base64 = btoa(binary);
      const contentType = fileResp.headers.get("content-type") || "image/jpeg";
      mediaType = contentType.includes("pdf") ? "application/pdf" : contentType;
    } catch (e) {
      await setReceiptStatus(supabase, receipt_id, "review_required", "Failed to download receipt file for processing");
      return jsonResponse({ status: "review_required", reason: "file_download_failed" });
    }

    // 4. AI OCR extraction
    let extracted: Record<string, unknown> | null = null;
    try {
      const aiResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a STRICT receipt fraud detection and OCR system for BUGANDA ROYAL INSTITUTE OF BUSINESS & TECHNICAL EDUCATION (BRIBTE).

Your job is to:
1. Determine if this image is a GENUINE SchoolPay transaction receipt.
2. Extract payment data if it appears genuine.

A GENUINE SchoolPay receipt must have:
- A proper SchoolPay header/logo or formatting
- A Payment Code (transaction reference)
- Student Name and Class
- Amount with amount in words
- Channel information (e.g. MTN MobileMoney)
- Institution name that matches "BUGANDA ROYAL INSTITUTE" or "BRIBTE"

RED FLAGS that indicate FAKE/INVALID receipt:
- Plain text typed in a document editor or notes app
- Screenshot of a chat message or SMS
- Hand-written or hand-drawn receipt
- Missing SchoolPay branding/structure
- Image appears digitally manipulated

Return ONLY a valid JSON object:
{
  "is_genuine_receipt": <true/false>,
  "fraud_indicators": ["<list any red flags>"],
  "payment_code": "<string or null>",
  "student_name": "<string or null>",
  "student_class": "<string or null>",
  "amount": <number or null>,
  "amount_in_words": "<string or null>",
  "payment_date": "<YYYY-MM-DD or null>",
  "channel": "<string or null>",
  "description": "<string or null>",
  "trans_type": "<string or null>",
  "channel_depositor": "<string or null>",
  "channel_memo": "<string or null>",
  "institution_name": "<string or null>",
  "payment_provider": "<string or null>",
  "confidence_score": <0.0-1.0>
}

Return ONLY the JSON, no markdown.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mediaType};base64,${base64}` },
              },
            ],
          }],
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

      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        extracted = null;
      }

      // Store raw extraction even if parsing failed
      if (extracted) {
        try {
          await supabase.from("receipt_extractions").insert({
            receipt_id,
            amount: extracted.amount as number | null,
            transaction_id: extracted.payment_code as string | null,
            payment_date: typeof extracted.payment_date === "string" ? (extracted.payment_date as string).substring(0, 10) : null,
            sender_name: extracted.student_name as string | null,
            payment_provider: (extracted.payment_provider as string) || "SchoolPay",
            raw_text: rawContent,
            confidence_score: (extracted.confidence_score as number) ?? 0.5,
            student_class: extracted.student_class as string | null,
            channel_depositor: extracted.channel_depositor as string | null,
            channel_memo: extracted.channel_memo as string | null,
            institution_name: extracted.institution_name as string | null,
            trans_type: extracted.trans_type as string | null,
            amount_in_words: extracted.amount_in_words as string | null,
            description: extracted.description as string | null,
            validation_flags: {
              is_genuine_receipt: extracted.is_genuine_receipt,
              fraud_indicators: extracted.fraud_indicators,
            },
          });
        } catch {
          // Non-fatal
        }
      }
    } catch (e) {
      // OCR failed — set to review_required instead of crashing
      const msg = e instanceof Error ? e.message : "Unknown OCR error";
      await setReceiptStatus(supabase, receipt_id, "review_required", `OCR processing failed: ${msg}`);
      return jsonResponse({ status: "review_required", reason: "ocr_failed", details: msg });
    }

    if (!extracted) {
      await setReceiptStatus(supabase, receipt_id, "review_required", "AI could not parse receipt content");
      return jsonResponse({ status: "review_required", reason: "extraction_failed" });
    }

    // ============================================
    // VALIDATION PIPELINE
    // ============================================

    // CHECK 0: FRAUD DETECTION
    if (extracted.is_genuine_receipt === false) {
      const indicators = ((extracted.fraud_indicators as string[]) || []).join("; ");
      validationFlags.fraud_detected = true;
      validationFlags.fraud_indicators = extracted.fraud_indicators;
      return await rejectWithAlert("fake_receipt",
        `Receipt rejected: AI detected this is NOT a genuine SchoolPay receipt. Indicators: ${indicators || "Document does not match expected receipt format."}`,
        { indicators: extracted.fraud_indicators });
    }

    // CHECK 1: Mandatory fields
    const missingFields: string[] = [];
    if (!extracted.payment_code) missingFields.push("payment_code");
    if (!extracted.student_name) missingFields.push("student_name");
    if (!extracted.amount || (extracted.amount as number) <= 0) missingFields.push("amount");
    if (!extracted.payment_date) missingFields.push("payment_date");
    if (!extracted.channel) missingFields.push("channel");
    if (!extracted.institution_name) missingFields.push("institution_name");

    if (missingFields.length > 0) {
      validationFlags.missing_fields = missingFields;
      return await rejectWithAlert("missing_fields",
        `Receipt rejected: missing mandatory fields: ${missingFields.join(", ")}.`,
        { missing: missingFields });
    }

    // CHECK 2: Institution name
    const instNorm = normalizeString(extracted.institution_name as string);
    const isValidInstitution = VALID_INSTITUTIONS.some(v => instNorm.includes(v));
    validationFlags.institution_name = extracted.institution_name;
    validationFlags.institution_valid = isValidInstitution;
    if (!isValidInstitution) {
      return await rejectWithAlert("wrong_institution",
        `Receipt rejected: Institution "${extracted.institution_name}" does not match BUGANDA ROYAL INSTITUTE / BRIBTE.`);
    }

    // CHECK 3: OCR confidence
    const confidence = (extracted.confidence_score as number) ?? 0;
    if (confidence < 0.5) {
      validationFlags.low_confidence = confidence;
      await setReceiptStatus(supabase, receipt_id, "review_required",
        `Low OCR confidence (${(confidence * 100).toFixed(0)}%).`, validationFlags);
      return jsonResponse({ status: "review_required", reason: "low_confidence" });
    }

    // CHECK 4: Transaction code duplicate
    if (extracted.payment_code) {
      try {
        const { data: dupTx } = await supabase
          .from("payment_transactions").select("id")
          .eq("transaction_id", extracted.payment_code as string).limit(1);
        if (dupTx && dupTx.length > 0) {
          validationFlags.duplicate_transaction = extracted.payment_code;
          return await rejectWithAlert("duplicate_transaction",
            `Duplicate transaction code: ${extracted.payment_code}. Already processed.`);
        }
      } catch {
        // Non-fatal
      }
    }

    // CHECK 5: Payment provider
    const channelNorm = normalizeString(extracted.channel as string);
    const providerNorm = normalizeString(extracted.payment_provider as string);
    const isKnownProvider = VALID_PROVIDERS.some(p => channelNorm.includes(p) || providerNorm.includes(p));
    if (!isKnownProvider) {
      validationFlags.unknown_provider = extracted.channel;
      await setReceiptStatus(supabase, receipt_id, "review_required",
        `Unknown payment provider/channel: "${extracted.channel}".`, validationFlags);
      return jsonResponse({ status: "review_required", reason: "unknown_provider" });
    }

    // CHECK 6: Student name matching
    const receiptStudentName = (extracted.student_name as string) || "";
    const similarity = nameSimilarity(studentName, receiptStudentName);
    validationFlags.name_similarity = similarity;
    validationFlags.db_name = studentName;
    validationFlags.receipt_name = receiptStudentName;

    if (similarity < 0.3) {
      return await rejectWithAlert("name_mismatch",
        `Student name mismatch. Receipt: "${receiptStudentName}", Database: "${studentName}".`);
    }
    if (similarity < 0.7) {
      await setReceiptStatus(supabase, receipt_id, "review_required",
        `Student name partially matches. Receipt: "${receiptStudentName}", Database: "${studentName}" (${(similarity * 100).toFixed(0)}%).`, validationFlags);
      return jsonResponse({ status: "review_required", reason: "name_partial_match" });
    }

    // CHECK 7: Course validation
    if (extracted.student_class && student.course_id) {
      try {
        const { data: course } = await supabase
          .from("courses").select("course_name, course_code").eq("id", student.course_id).single();
        if (course) {
          const receiptCourse = normalizeString(extracted.student_class as string);
          const dbCourseName = normalizeString(course.course_name);
          const dbCourseCode = normalizeString(course.course_code);
          const courseMatch = receiptCourse.includes(dbCourseName) || dbCourseName.includes(receiptCourse) ||
            receiptCourse.includes(dbCourseCode) || nameSimilarity(receiptCourse, dbCourseName) > 0.5;
          validationFlags.course_match = courseMatch;
          if (!courseMatch) {
            await setReceiptStatus(supabase, receipt_id, "review_required",
              `Course mismatch. Receipt: "${extracted.student_class}", Enrolled: "${course.course_name}".`, validationFlags);
            return jsonResponse({ status: "review_required", reason: "course_mismatch" });
          }
        }
      } catch {
        // Non-fatal
      }
    }

    // CHECK 8: Amount validation
    const amount = Number(extracted.amount);
    const outstandingBalance = Number(student.fee_balance || 0);
    validationFlags.extracted_amount = amount;
    validationFlags.outstanding_balance = outstandingBalance;

    if (amount > 10000000) {
      await setReceiptStatus(supabase, receipt_id, "review_required",
        `Unusually high payment amount: UGX ${amount.toLocaleString()}.`, validationFlags);
      return jsonResponse({ status: "review_required", reason: "amount_suspicious" });
    }

    if (outstandingBalance > 0 && amount > outstandingBalance * 3) {
      await setReceiptStatus(supabase, receipt_id, "review_required",
        `Payment (UGX ${amount.toLocaleString()}) > 3x balance (UGX ${outstandingBalance.toLocaleString()}).`, validationFlags);
      return jsonResponse({ status: "review_required", reason: "amount_suspicious" });
    }

    // CHECK 9: Fraud indicators even if genuine
    if (extracted.fraud_indicators && (extracted.fraud_indicators as string[]).length > 0) {
      validationFlags.fraud_indicators = extracted.fraud_indicators;
      await setReceiptStatus(supabase, receipt_id, "review_required",
        `Receipt has potential fraud indicators: ${(extracted.fraud_indicators as string[]).join("; ")}.`, validationFlags);
      return jsonResponse({ status: "review_required", reason: "fraud_indicators" });
    }

    // ============================================
    // ALL CHECKS PASSED - AUTO-APPROVE
    // ============================================
    validationFlags.auto_approved = true;

    try {
      // Create payment record
      const { error: payErr } = await supabase.from("payments").insert({
        student_id: student.id,
        amount,
        payment_status: "approved",
        receipt_url: receipt.file_url,
        notes: `Auto-verified via SchoolPay. Code: ${extracted.payment_code}. Channel: ${extracted.channel}. Confidence: ${(confidence * 100).toFixed(0)}%.`,
      });
      if (payErr) throw new Error("Failed to create payment: " + payErr.message);

      // Track transaction
      if (extracted.payment_code) {
        await supabase.from("payment_transactions").insert({
          student_id: student.id,
          course_id: receipt.course_id,
          transaction_id: extracted.payment_code as string,
          amount,
          receipt_id,
        });
      }

      // Recalculate balance
      await supabase.rpc("recalculate_fee_balance", { p_student_id: student.id });

      const { data: updatedStudent } = await supabase
        .from("students").select("fee_balance").eq("id", student.id).single();

      await setReceiptStatus(supabase, receipt_id, "verified", "Auto-approved", validationFlags);

      return jsonResponse({
        status: "verified",
        extracted: { amount, transaction_id: extracted.payment_code },
        new_balance: updatedStudent?.fee_balance ?? null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment processing failed";
      await setReceiptStatus(supabase, receipt_id, "review_required", `Auto-approval failed: ${msg}`, validationFlags);
      return jsonResponse({ status: "review_required", reason: "approval_failed", details: msg });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: msg }, 500);
  }
});
