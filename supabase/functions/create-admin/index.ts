import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { email, password, full_name, role } = await req.json();

  if (!email || !password || !full_name || !role) {
    return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
  }

  // Verify caller is admin (except for initial seed)
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
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
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
      }
    }
  }

  // Create user
  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 });
  }

  const userId = userData.user.id;

  // Create profile
  await supabase.from("profiles").insert({
    user_id: userId,
    full_name,
    email,
  });

  // Create role
  await supabase.from("user_roles").insert({
    user_id: userId,
    role,
  });

  // If lecturer, create lecturer record
  if (role === "lecturer") {
    await supabase.from("lecturers").insert({ user_id: userId });
  }

  return new Response(JSON.stringify({ success: true, user_id: userId }), {
    headers: { "Content-Type": "application/json" },
  });
});
