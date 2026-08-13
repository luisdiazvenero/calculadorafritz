"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type ManagedUser = {
  id: string;
  email: string;
  displayName: string;
  role: "gerente" | "editor" | "distribuidor" | "";
  regionSlug: string;
  distributorSlug: string;
  enabled: boolean;
  lastSignInAt: string | null;
};

// Ninguna acción de este archivo corre sin confirmar que quien llama es
// gerente. La secret key saltea RLS, así que el chequeo va acá y no en la DB.
async function requireGerente(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No hay sesión." };
  if (user.app_metadata?.role !== "gerente") {
    return { error: "Solo un administrador puede gestionar usuarios." };
  }
  return { error: null };
}

// ── Listar ────────────────────────────────────────────────────────────────────

export async function listUsers(): Promise<{ users: ManagedUser[]; error: string | null }> {
  const guard = await requireGerente();
  if (guard.error) return { users: [], error: guard.error };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return { users: [], error: error.message };

  const users = data.users.map((u): ManagedUser => ({
    id: u.id,
    email: u.email ?? "",
    displayName: (u.user_metadata?.display_name as string) ?? "",
    role: (u.app_metadata?.role as ManagedUser["role"]) ?? "",
    regionSlug: (u.app_metadata?.region_slug as string) ?? "",
    distributorSlug: (u.app_metadata?.distributor_slug as string) ?? "",
    // Supabase marca deshabilitado con banned_until en el futuro.
    enabled: !isBanned(u.banned_until as string | undefined),
    lastSignInAt: u.last_sign_in_at ?? null,
  }));

  users.sort((a, b) => a.email.localeCompare(b.email));
  return { users, error: null };
}

function isBanned(bannedUntil: string | undefined): boolean {
  if (!bannedUntil) return false;
  const until = Date.parse(bannedUntil);
  return Number.isFinite(until) && until > Date.now();
}

// ── Asignar rol y alcance ─────────────────────────────────────────────────────

export async function setUserAccess(
  userId: string,
  access:
    | { role: "gerente" }
    | { role: "editor"; regionSlug: string }
    | { role: "distribuidor"; distributorSlug: string }
): Promise<{ error: string | null }> {
  const guard = await requireGerente();
  if (guard.error) return guard;

  const admin = createAdminClient();

  // app_metadata es la fuente de verdad (la leen el proxy y las políticas RLS).
  // profiles es la copia que consulta la UI: hay que mover las dos.
  const appMetadata: Record<string, string | null> = {
    role: access.role,
    region_slug: null,
    distributor_slug: null,
  };
  const profilePatch: Record<string, string | null> = {
    role: access.role,
    region_id: null,
    distributor_id: null,
  };

  if (access.role === "editor") {
    if (!access.regionSlug) return { error: "Elegí una región." };
    const { data: region } = await admin
      .from("regions")
      .select("id")
      .eq("slug", access.regionSlug)
      .maybeSingle();
    if (!region) return { error: `No existe la región "${access.regionSlug}".` };
    appMetadata.region_slug = access.regionSlug;
    profilePatch.region_id = region.id;
  }

  if (access.role === "distribuidor") {
    if (!access.distributorSlug) return { error: "Elegí un distribuidor." };
    const { data: dist } = await admin
      .from("distributors")
      .select("id")
      .eq("slug", access.distributorSlug)
      .maybeSingle();
    if (!dist) return { error: `No existe el distribuidor "${access.distributorSlug}".` };
    appMetadata.distributor_slug = access.distributorSlug;
    profilePatch.distributor_id = dist.id;
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: appMetadata,
  });
  if (authErr) return { error: authErr.message };

  const { error: profErr } = await admin
    .from("profiles")
    .update(profilePatch)
    .eq("id", userId);
  if (profErr) return { error: profErr.message };

  revalidatePath("/dashboard/usuarios");
  return { error: null };
}

// ── Habilitar / deshabilitar ──────────────────────────────────────────────────

export async function setUserEnabled(
  userId: string,
  enabled: boolean
): Promise<{ error: string | null }> {
  const guard = await requireGerente();
  if (guard.error) return guard;

  // Un gerente no puede deshabilitarse a sí mismo y quedar afuera.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!enabled && user?.id === userId) {
    return { error: "No podés deshabilitar tu propia cuenta." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    // "none" levanta el ban; 100 años equivale a deshabilitado.
    ban_duration: enabled ? "none" : "876000h",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/usuarios");
  return { error: null };
}
