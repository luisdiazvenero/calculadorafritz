"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { MonthlyEntry } from "@/lib/mock-data";

// ── Upsert entrada mensual ────────────────────────────────────────────────────
// Usada tanto por distribuidores (portal) como por gerentes (dashboard/cargar).
// NO sobreescribe meta_* — los targets solo los puede cambiar el gerente.

export async function upsertMonthlyEntry(
  data: Omit<MonthlyEntry, "metaActivacion" | "metaFritz" | "metaSkus" | "metaCajas">
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const row = {
    id:                        data.id,
    distributor_id:            data.distributorId,
    period_year:               data.periodYear,
    period_month:              data.periodMonth,
    total_cartera:             data.totalCartera,
    pct_activacion:            data.pctActivacion,
    pct_clientes_fritz:        data.pctClientesFritz,
    pct_incremento_activos:    data.pctIncrementoActivos,
    pct_incremento_fritz:      data.pctIncrementoFritz,
    total_skus_fritz:          data.totalSkusFritz,
    pct_incremento_skus:       data.pctIncrementoSkus,
    cajas_promedio:            data.cajasPromedio,
    pct_incremento_sell_out:   data.pctIncrementoSellOut,
    num_vendedores:            data.numVendedores,
    pct_incremento_vendedores: data.pctIncrementoVendedores,
    margen_ganancia:           data.margenGanancia,
    rebate:                    data.rebate,
    comentarios:               data.comentarios,
  };

  const { error } = await supabase
    .from("monthly_entries")
    .upsert(row, {
      onConflict: "distributor_id,period_year,period_month",
      ignoreDuplicates: false,
    });

  if (error) return { error: error.message };

  revalidatePath(`/distribuidor/${data.distributorId}`);
  revalidatePath(`/dashboard/distribuidor/${data.distributorId}`);
  return { error: null };
}

// ── Actualizar targets del gerente ────────────────────────────────────────────

export async function updateEntryTargets(
  entryId: string,
  targets: {
    metaActivacion?: number;
    metaFritz?: number;
    metaSkus?: number;
    metaCajas?: number;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const patch: Record<string, number | undefined> = {};
  if (targets.metaActivacion !== undefined) patch.meta_activacion = targets.metaActivacion;
  if (targets.metaFritz      !== undefined) patch.meta_fritz      = targets.metaFritz;
  if (targets.metaSkus       !== undefined) patch.meta_skus       = targets.metaSkus;
  if (targets.metaCajas      !== undefined) patch.meta_cajas      = targets.metaCajas;

  const { error } = await supabase
    .from("monthly_entries")
    .update(patch)
    .eq("id", entryId);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Eliminar entrada mensual ──────────────────────────────────────────────────

export async function deleteMonthlyEntry(
  id: string,
  slug: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("monthly_entries").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/distribuidor/${slug}`);
  revalidatePath(`/distribuidor/${slug}`);
  return { error: null };
}

// ── Actualizar status de distribuidor ─────────────────────────────────────────

export async function updateDistributorStatus(
  distributorId: string,
  status: "active" | "paused" | "inactive"
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("distributors")
    .update({ status })
    .eq("id", distributorId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/distribuidores");
  return { error: null };
}
