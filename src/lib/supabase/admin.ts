import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con la secret key: saltea RLS y puede tocar la API de Auth Admin.
// SOLO servidor. Nunca importar esto desde un componente "use client".
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Falta SUPABASE_SECRET_KEY. Sin esa variable no se puede administrar usuarios."
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
