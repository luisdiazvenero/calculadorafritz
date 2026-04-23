import { createClient } from "@/lib/supabase/client";
import type { Region, Distributor, MonthlyEntry } from "@/lib/mock-data";

// ── Tipos de fila DB (snake_case) ─────────────────────────────────────────────

type DbRegion = { id: string; name: string; slug: string };

type DbDistributor = {
  id: string;
  region_id: string;
  name: string;
  slug: string;
  status: string;
  email: string;
};

type DbMonthlyEntry = {
  id: string;
  distributor_id: string;
  period_year: number;
  period_month: number;
  total_cartera: number;
  pct_activacion: string | number;
  pct_clientes_fritz: string | number;
  pct_incremento_activos: string | number;
  pct_incremento_fritz: string | number;
  total_skus_fritz: number;
  pct_incremento_skus: string | number;
  cajas_promedio: number;
  pct_incremento_sell_out: string | number;
  num_vendedores: number;
  pct_incremento_vendedores: string | number;
  margen_ganancia: string | number;
  rebate: string | number;
  comentarios: string;
  meta_activacion: string | number | null;
  meta_fritz: string | number | null;
  meta_skus: number | null;
  meta_cajas: number | null;
};

// ── Mappers snake_case DB → camelCase TS ──────────────────────────────────────

function mapRegion(row: DbRegion): Region {
  return { id: row.id, name: row.name, slug: row.slug };
}

function mapDistributor(row: DbDistributor): Distributor {
  return {
    id: row.id,
    regionId: row.region_id,
    name: row.name,
    slug: row.slug,
    status: row.status as Distributor["status"],
    email: row.email,
  };
}

function mapEntry(row: DbMonthlyEntry): MonthlyEntry {
  return {
    id: row.id,
    distributorId: row.distributor_id,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    totalCartera: row.total_cartera,
    pctActivacion: Number(row.pct_activacion),
    pctClientesFritz: Number(row.pct_clientes_fritz),
    pctIncrementoActivos: Number(row.pct_incremento_activos),
    pctIncrementoFritz: Number(row.pct_incremento_fritz),
    totalSkusFritz: row.total_skus_fritz,
    pctIncrementoSkus: Number(row.pct_incremento_skus),
    cajasPromedio: row.cajas_promedio,
    pctIncrementoSellOut: Number(row.pct_incremento_sell_out),
    numVendedores: row.num_vendedores,
    pctIncrementoVendedores: Number(row.pct_incremento_vendedores),
    margenGanancia: Number(row.margen_ganancia),
    rebate: Number(row.rebate),
    comentarios: row.comentarios,
    metaActivacion: row.meta_activacion != null ? Number(row.meta_activacion) : undefined,
    metaFritz: row.meta_fritz != null ? Number(row.meta_fritz) : undefined,
    metaSkus: row.meta_skus ?? undefined,
    metaCajas: row.meta_cajas ?? undefined,
  };
}

// ── Regiones ──────────────────────────────────────────────────────────────────

export async function getRegions(): Promise<Region[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .order("id");
  if (error) { console.error("getRegions:", error.message); return []; }
  return (data as DbRegion[]).map(mapRegion);
}

export async function getRegionBySlug(slug: string): Promise<Region | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return mapRegion(data as DbRegion);
}

// ── Distribuidores ────────────────────────────────────────────────────────────

export async function getDistributors(): Promise<Distributor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .neq("status", "inactive")
    .order("name");
  if (error) { console.error("getDistributors:", error.message); return []; }
  return (data as DbDistributor[]).map(mapDistributor);
}

export async function getDistributorBySlug(slug: string): Promise<Distributor | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return mapDistributor(data as DbDistributor);
}

export async function getDistributorsByRegion(regionId: string): Promise<Distributor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("distributors")
    .select("*")
    .eq("region_id", regionId)
    .neq("status", "inactive")
    .order("name");
  if (error) { console.error("getDistributorsByRegion:", error.message); return []; }
  return (data as DbDistributor[]).map(mapDistributor);
}

// ── Entradas mensuales ────────────────────────────────────────────────────────

export async function getEntriesByDistributor(distributorId: string): Promise<MonthlyEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monthly_entries")
    .select("*")
    .eq("distributor_id", distributorId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  if (error) { console.error("getEntriesByDistributor:", error.message); return []; }
  return (data as DbMonthlyEntry[]).map(mapEntry);
}

export async function getEntry(
  distributorId: string,
  year: number,
  month: number
): Promise<MonthlyEntry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monthly_entries")
    .select("*")
    .eq("distributor_id", distributorId)
    .eq("period_year", year)
    .eq("period_month", month)
    .single();
  if (error) return null;
  return mapEntry(data as DbMonthlyEntry);
}

export async function getLatestEntry(distributorId: string): Promise<MonthlyEntry | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monthly_entries")
    .select("*")
    .eq("distributor_id", distributorId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return mapEntry(data as DbMonthlyEntry);
}

export async function getAllEntries(): Promise<MonthlyEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monthly_entries")
    .select("*")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  if (error) { console.error("getAllEntries:", error.message); return []; }
  return (data as DbMonthlyEntry[]).map(mapEntry);
}

export async function getAllEntriesForPeriod(year: number, month: number): Promise<MonthlyEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monthly_entries")
    .select("*")
    .eq("period_year", year)
    .eq("period_month", month);
  if (error) { console.error("getAllEntriesForPeriod:", error.message); return []; }
  return (data as DbMonthlyEntry[]).map(mapEntry);
}

export async function getAvailablePeriods(): Promise<Array<{ year: number; month: number }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monthly_entries")
    .select("period_year, period_month")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false });
  if (error) { console.error("getAvailablePeriods:", error.message); return []; }

  // Deduplicar períodos
  const seen = new Set<string>();
  return (data as { period_year: number; period_month: number }[]).reduce<
    Array<{ year: number; month: number }>
  >((acc, row) => {
    const key = `${row.period_year}-${row.period_month}`;
    if (!seen.has(key)) {
      seen.add(key);
      acc.push({ year: row.period_year, month: row.period_month });
    }
    return acc;
  }, []);
}

// ── Auth helper ───────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  role: "gerente" | "distribuidor";
  distributorSlug?: string;
} | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.app_metadata?.role as "gerente" | "distribuidor";
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    distributorSlug: user.app_metadata?.distributor_slug,
  };
}
