import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { email, password, full_name, role } = body;

  if (!email || !password || !full_name || !role) {
    return jsonResponse({ error: "Missing fields: email, password, full_name, and role are required" }, 400);
  }

  if (!["admin", "lecturer", "student"].includes(role)) {
    return jsonResponse({ error: "Invalid role. Must be admin, lecturer, or student" }, 400);
  }

  if (password.length < 6) {
    return jsonResponse({ error: "Password must be at least 6 characters" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is admin (if Authorization header provided)
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (caller) {
      const { data: callerRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id)
        .maybeSingle();
      if (callerRole?.role !== "admin") {
        return jsonResponse({ error: "Unauthorized: only admins can create accounts" }, 403);
      }
    }
  }

  try {
    // Create user with email_confirm: true (no verification needed)
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (createError) {
      return jsonResponse({ error: createError.message }, 400);
    }

    const userId = userData.user.id;

    // Wait for the handle_new_user trigger to complete
    await new Promise(resolve => setTimeout(resolve, 800));

    // Upsert profile (trigger may have already created it)
    const { error: profileError } = await supabase.from("profiles").upsert(
      { user_id: userId, full_name, email },
      { onConflict: "user_id" }
    );
    if (profileError) {
      // Non-fatal: log but continue
    }

    // Handle role assignment
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRole) {
      if (existingRole.role !== role) {
        await supabase.from("user_roles").update({ role }).eq("id", existingRole.id);
      }
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }

    // If lecturer, create lecturer record if not exists
    if (role === "lecturer") {
      const { data: existingLec } = await supabase.from("lecturers").select("id").eq("user_id", userId).maybeSingle();
      if (!existingLec) {
        await supabase.from("lecturers").insert({ user_id: userId });
      }
    }

    // If student, create student record if not exists
    if (role === "student") {
      const { data: existingStudent } = await supabase.from("students").select("id").eq("user_id", userId).maybeSingle();
      if (!existingStudent) {
        await supabase.from("students").insert({ user_id: userId, status: "pending" });
      }
    }

    return jsonResponse({ success: true, user_id: userId });
  } catch (e) {
    return jsonResponse({ error: e.message || "Internal server error" }, 500);
  }
});
