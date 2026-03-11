import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { email, password, full_name, role } = body;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!email || !password || !full_name || !role) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
  }

  try {
    // Create user
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = userData.user.id;

    // Wait briefly for the handle_new_user trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Upsert profile (trigger may have already created it)
    await supabase.from("profiles").upsert(
      { user_id: userId, full_name, email },
      { onConflict: "user_id" }
    );

    // Upsert role (trigger may have already created it for students)
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingRole) {
      // Update role if different
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

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
