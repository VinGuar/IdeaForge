import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "Supabase not configured." }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return Response.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env to enable account deletion." },
      { status: 503 },
    );
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Deleting the auth user cascades to profiles, threads, reports, and messages
  // via the ON DELETE CASCADE foreign keys in the schema.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();
  return Response.json({ success: true });
}
