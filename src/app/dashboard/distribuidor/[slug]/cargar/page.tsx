"use client";
import { use, useState, useEffect } from "react";
import { calcular, formatPeriod } from "@/lib/mock-data";
import type { Distributor, Region } from "@/lib/mock-data";
import { getDistributorBySlug, getRegions, getEntry } from "@/lib/db";
import { upsertMonthlyEntry } from "@/lib/actions";
import { ALL_PERIOD_KEYS_AHEAD, currentPeriodKey } from "@/lib/periods";
import { cn } from "@/utils/cn";
import Link from "next/link";
import {
  RiArrowLeftLine,
  RiSaveLine,
  RiTargetLine,
  RiBarChartLine,
  RiUserLine,
  RiBox3Line,
  RiShoppingBagLine,
  RiTeamLine,
  RiCheckLine,
  RiLockLine,
  RiEditLine,
} from "@remixicon/react";

// ── Types ──────────────────────────────────────────────────────────────────────

type FormState = {
  pctIncrementoActivos: number;
  pctIncrementoFritz: number;
  pctIncrementoSkus: number;
  pctIncrementoSellOut: number;
  pctIncrementoVendedores: number;
  margenGanancia: number;
  rebate: number;
  totalCartera: number;
  pctActivacion: number;
  pctClientesFritz: number;
  totalSkusFritz: number;
  cajasPromedio: number;
  numVendedores: number;
  comentarios: string;
};

const EMPTY_FORM: FormState = {
  pctIncrementoActivos: 0.1,
  pctIncrementoFritz: 0.1,
  pctIncrementoSkus: 0.1,
  pctIncrementoSellOut: 0.1,
  pctIncrementoVendedores: 0.05,
  margenGanancia: 0.12,
  rebate: 0.01,
  totalCartera: 0,
  pctActivacion: 0,
  pctClientesFritz: 0,
  totalSkusFritz: 0,
  cajasPromedio: 0,
  numVendedores: 0,
  comentarios: "",
};

const C = {
  yellow: { bg: "#FEF9C3", text: "#713F12" },
  blue:   { bg: "#DBEAFE", text: "#1E3A8A" },
  orange: { bg: "#FFEDD5", text: "#7C2D12" },
  red:    { bg: "#FEE2E2", text: "#7F1D1D" },
  green:  { bg: "#DCFCE7", text: "#14532D" },
  none:   { bg: "transparent", text: "#374151" },
} as const;
type CellColor = keyof typeof C;

// ── Sub-components ─────────────────────────────────────────────────────────────

function PctInput({
  value, onChange, label, disabled,
}: { value: number; onChange: (v: string) => void; label: string; disabled?: boolean }) {
  return (
    <div>
      <label className={cn("block text-xs mb-1.5", disabled ? "text-gray-400" : "text-gray-500")}>
        {label}
      </label>
      <div className="relative">
        <span className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold pointer-events-none",
          disabled ? "text-gray-400" : "text-primary-500",
        )}>%</span>
        <input
          type="number"
          value={(value * 100).toFixed(0)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full pl-8 pr-3 py-2.5 border rounded-xl text-sm transition-all focus:outline-none",
            disabled
              ? "border-gray-100 bg-gray-50 text-gray-500 cursor-default"
              : "border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary-400 focus:border-transparent",
          )}
        />
      </div>
    </div>
  );
}

function NumInput({
  value, onChange, label, icon: Icon, wide, disabled,
}: {
  value: number; onChange: (v: string) => void; label: string;
  icon?: React.ComponentType<{ className?: string }>; wide?: boolean; disabled?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <label className={cn("block text-xs mb-1.5", disabled ? "text-gray-400" : "text-gray-500")}>
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={cn("w-4 h-4", disabled ? "text-gray-300" : "text-gray-400")} />
          </span>
        )}
        <input
          type="number"
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "w-full pr-3 py-2.5 border rounded-xl text-sm transition-all focus:outline-none",
            Icon ? "pl-9" : "pl-3",
            disabled
              ? "border-gray-100 bg-gray-50 text-gray-500 cursor-default"
              : "border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary-400 focus:border-transparent",
          )}
        />
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon, iconBg, iconColor, title, subtitle, locked, onEdit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string; iconColor: string;
  title: string; subtitle: string;
  locked: boolean; onEdit: () => void;
}) {
  return (
    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      {locked && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <RiLockLine className="w-3.5 h-3.5" />
            Guardado
          </span>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors cursor-pointer"
          >
            <RiEditLine className="w-3.5 h-3.5" />
            Editar
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CargarDatosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [region, setRegion]           = useState<Region | null>(null);
  const [loading, setLoading]         = useState(true);
  const [periodKey, setPeriodKey]     = useState(currentPeriodKey());
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);

  const [targetsLocked, setTargetsLocked] = useState(false);
  const [metricsLocked, setMetricsLocked] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [targetsSnapshot, setTargetsSnapshot] = useState<FormState>(EMPTY_FORM);
  const [metricsSnapshot, setMetricsSnapshot] = useState<FormState>(EMPTY_FORM);

  // Read ?period= query param on mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("period");
    if (p && ALL_PERIOD_KEYS_AHEAD.includes(p)) setPeriodKey(p);
  }, []);

  useEffect(() => {
    Promise.all([getDistributorBySlug(slug), getRegions()]).then(([d, regions]) => {
      setDistributor(d);
      if (d) setRegion(regions.find((r) => r.id === d.regionId) ?? null);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!distributor) return;
    const [y, m] = periodKey.split("-").map(Number);
    getEntry(distributor.id, y, m).then((entry) => {
      if (entry) {
        setForm({
          pctIncrementoActivos:    entry.pctIncrementoActivos,
          pctIncrementoFritz:      entry.pctIncrementoFritz,
          pctIncrementoSkus:       entry.pctIncrementoSkus,
          pctIncrementoSellOut:    entry.pctIncrementoSellOut,
          pctIncrementoVendedores: entry.pctIncrementoVendedores,
          margenGanancia:          entry.margenGanancia,
          rebate:                  entry.rebate,
          totalCartera:            entry.totalCartera,
          pctActivacion:           entry.pctActivacion,
          pctClientesFritz:        entry.pctClientesFritz,
          totalSkusFritz:          entry.totalSkusFritz,
          cajasPromedio:           entry.cajasPromedio,
          numVendedores:           entry.numVendedores,
          comentarios:             entry.comentarios,
        });
        setTargetsLocked(true);
        setMetricsLocked(true);
      } else {
        setForm(EMPTY_FORM);
        setTargetsLocked(false);
        setMetricsLocked(false);
      }
    });
  }, [distributor, periodKey]);

  const setPct = (key: keyof FormState, raw: string) => {
    const v = parseFloat(raw) / 100;
    setForm((p) => ({ ...p, [key]: isNaN(v) ? 0 : v }));
  };
  const setNum = (key: keyof FormState, raw: string) => {
    const v = parseFloat(raw);
    setForm((p) => ({ ...p, [key]: isNaN(v) ? 0 : v }));
  };

  const [periodYear, periodMonth] = periodKey.split("-").map(Number);

  const previewEntry = distributor
    ? { id: "preview", distributorId: distributor.id, periodYear, periodMonth, ...form }
    : null;
  const preview = previewEntry ? calcular(previewEntry as Parameters<typeof calcular>[0]) : null;

  const buildPayload = () => ({
    id: `${distributor!.id}-${periodYear}-${periodMonth}`,
    distributorId: distributor!.id,
    periodYear,
    periodMonth,
    ...form,
  });

  const handleSaveTargets = async () => {
    if (!distributor || savingTargets) return;
    setSavingTargets(true);
    const { error } = await upsertMonthlyEntry(buildPayload());
    setSavingTargets(false);
    if (!error) setTargetsLocked(true);
  };

  const handleSaveMetrics = async () => {
    if (!distributor || savingMetrics) return;
    setSavingMetrics(true);
    const { error } = await upsertMonthlyEntry(buildPayload());
    setSavingMetrics(false);
    if (!error) setMetricsLocked(true);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-5">
            <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          </div>
          <div className="lg:col-span-2 h-96 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!distributor || !preview) {
    return <div className="p-8 text-gray-500">Distribuidor no encontrado.</div>;
  }

  const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`;
  const vendMeta = Math.round(form.numVendedores * (1 + form.pctIncrementoVendedores));

  type Row = {
    label: string;
    base: string;      baseBg?: CellColor;
    variacion: string; varBg?: CellColor;
    meta: string;      metaBg?: CellColor;
  };

  const tableRows: Row[] = [
    { label: "Total Cartera",         base: form.totalCartera.toLocaleString(),                baseBg: "yellow", variacion: "—", meta: "—" },
    { label: "Activados",             base: Math.round(preview.activadosBase).toLocaleString(), baseBg: "blue",   variacion: fmtPct(form.pctIncrementoActivos), varBg: "yellow", meta: Math.round(preview.activadosMeta).toLocaleString(),  metaBg: "orange" },
    { label: "Clientes con Fritz",    base: Math.round(preview.fritzeBase).toLocaleString(),    baseBg: "red",    variacion: fmtPct(form.pctIncrementoFritz),   varBg: "blue",   meta: Math.round(preview.fritzMeta).toLocaleString(),       metaBg: "red"    },
    { label: "Número de SKUs",        base: Math.round(preview.skusBase).toLocaleString(),      baseBg: "red",    variacion: fmtPct(form.pctIncrementoSkus),    varBg: "blue",   meta: Math.round(preview.skusMeta).toLocaleString(),        metaBg: "red"    },
    { label: "Cajas Sell Out",        base: Math.round(preview.cajasBase).toLocaleString(),     baseBg: "red",    variacion: fmtPct(form.pctIncrementoSellOut), varBg: "blue",   meta: Math.round(preview.cajasMeta).toLocaleString(),       metaBg: "green"  },
    { label: "Clientes Prom × Vend.", base: preview.clientesPorVendedor.toFixed(1),             variacion: "—",  meta: vendMeta > 0 ? (preview.activadosMeta / vendMeta).toFixed(1) : "—", metaBg: "green" },
    { label: "Cajas Prom × Cliente",  base: preview.cajasPorCliente.toFixed(1),                 variacion: "—",  meta: preview.activadosMeta > 0 ? (preview.cajasMeta / preview.activadosMeta).toFixed(1) : "—" },
    { label: "Incr. Vendedores",      base: form.numVendedores.toString(),                      variacion: "—",  meta: vendMeta > 0 ? vendMeta.toLocaleString() : "—" },
    { label: "Cajas Prom × Vendedor", base: preview.cajasPorVendedor.toFixed(0),               baseBg: "green",  variacion: "—", meta: vendMeta > 0 ? Math.round(preview.cajasMeta / vendMeta).toLocaleString() : "—", metaBg: "green" },
  ];

  const now = new Date();

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/distribuidor/${slug}`}
          className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 hover:text-gray-900"
        >
          <RiArrowLeftLine className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-sm text-gray-400">{region?.name} / {distributor.name}</p>
          <h1 className="text-2xl font-bold text-gray-900">Cargar Datos</h1>
        </div>
      </div>

      {/* Body */}
      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* ── Forms ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Period selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Período</p>
              <p className="text-sm font-medium text-gray-700">
                Selecciona el mes al que corresponden estos datos
              </p>
            </div>
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white min-w-[140px]"
            >
              {ALL_PERIOD_KEYS_AHEAD.slice().reverse().map((k) => {
                const [y, m] = k.split("-").map(Number);
                const isNext = y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1);
                return (
                  <option key={k} value={k}>
                    {formatPeriod(y, m)}{isNext ? " (próximo)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Section 1 — Manager targets */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader
              icon={RiTargetLine}
              iconBg="bg-primary-50"
              iconColor="text-primary-600"
              title="Metas del Período"
              subtitle="Incrementos objetivo asignados por el gerente"
              locked={targetsLocked}
              onEdit={() => { setTargetsSnapshot(form); setTargetsLocked(false); }}
            />
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <PctInput value={form.pctIncrementoActivos}    onChange={(v) => setPct("pctIncrementoActivos", v)}    label="% Incr. Clientes Activos"      disabled={targetsLocked} />
                <PctInput value={form.pctIncrementoFritz}      onChange={(v) => setPct("pctIncrementoFritz", v)}      label="% Incr. Clientes con Fritz"    disabled={targetsLocked} />
                <PctInput value={form.pctIncrementoSkus}       onChange={(v) => setPct("pctIncrementoSkus", v)}       label="% Incr. SKUs"                  disabled={targetsLocked} />
                <PctInput value={form.pctIncrementoSellOut}    onChange={(v) => setPct("pctIncrementoSellOut", v)}    label="% Incr. Sell Out (Cajas)"      disabled={targetsLocked} />
                <PctInput value={form.pctIncrementoVendedores} onChange={(v) => setPct("pctIncrementoVendedores", v)} label="% Incr. Vendedores"            disabled={targetsLocked} />
                <PctInput value={form.margenGanancia}          onChange={(v) => setPct("margenGanancia", v)}          label="Margen de Ganancia"            disabled={targetsLocked} />
                <PctInput value={form.rebate}                  onChange={(v) => setPct("rebate", v)}                  label="Rebate (%)"                    disabled={targetsLocked} />
              </div>
              {!targetsLocked && (
                <div className="flex items-center justify-end gap-3 mt-5">
                  <button
                    onClick={() => { setForm(targetsSnapshot); setTargetsLocked(true); }}
                    disabled={savingTargets}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveTargets}
                    disabled={savingTargets}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60 transition-all cursor-pointer"
                  >
                    <RiSaveLine className="w-4 h-4" />
                    {savingTargets ? "Guardando..." : "Guardar Metas"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 — Distributor metrics */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <SectionHeader
              icon={RiBarChartLine}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              title="Métricas del Distribuidor"
              subtitle="Estado base reportado por el distribuidor"
              locked={metricsLocked}
              onEdit={() => { setMetricsSnapshot(form); setMetricsLocked(false); }}
            />
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <NumInput value={form.totalCartera}    onChange={(v) => setNum("totalCartera", v)}    label="Total cartera del cliente"          icon={RiUserLine}       wide     disabled={metricsLocked} />
                <PctInput value={form.pctActivacion}   onChange={(v) => setPct("pctActivacion", v)}   label="% de Activación actual"                                             disabled={metricsLocked} />
                <PctInput value={form.pctClientesFritz} onChange={(v) => setPct("pctClientesFritz", v)} label="% Clientes con Fritz actual"                                      disabled={metricsLocked} />
                <NumInput value={form.totalSkusFritz}  onChange={(v) => setNum("totalSkusFritz", v)}  label="Total SKUs Fritz en portafolio"     icon={RiBox3Line}                disabled={metricsLocked} />
                <NumInput value={form.cajasPromedio}   onChange={(v) => setNum("cajasPromedio", v)}   label="Cajas Sell Out promedio"            icon={RiShoppingBagLine}          disabled={metricsLocked} />
                <NumInput value={form.numVendedores}   onChange={(v) => setNum("numVendedores", v)}   label="# de Vendedores"                    icon={RiTeamLine}                disabled={metricsLocked} />
                <div className="col-span-2">
                  <label className={cn("block text-xs mb-1.5", metricsLocked ? "text-gray-400" : "text-gray-500")}>
                    Comentarios adicionales
                  </label>
                  <textarea
                    value={form.comentarios}
                    onChange={(e) => setForm((p) => ({ ...p, comentarios: e.target.value }))}
                    disabled={metricsLocked}
                    rows={3}
                    className={cn(
                      "w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none transition-all resize-none",
                      metricsLocked
                        ? "border-gray-100 bg-gray-50 text-gray-500 cursor-default"
                        : "border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary-400",
                    )}
                    placeholder="Observaciones del período..."
                  />
                </div>
              </div>
              {!metricsLocked && (
                <div className="flex items-center justify-end gap-3 mt-5">
                  <button
                    onClick={() => { setForm(metricsSnapshot); setMetricsLocked(true); }}
                    disabled={savingMetrics}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveMetrics}
                    disabled={savingMetrics}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {savingMetrics ? <RiSaveLine className="w-4 h-4 animate-pulse" /> : <RiCheckLine className="w-4 h-4" />}
                    {savingMetrics ? "Guardando..." : "Guardar Métricas"}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Preview table ── */}
        <div className="lg:col-span-2 sticky top-6 flex flex-col gap-3">
          <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ backgroundColor: "#f7f7f7" }}>
            <div className="grid grid-cols-5 text-sm font-semibold text-white" style={{ backgroundColor: "#1e2a3a" }}>
              <div className="px-4 py-3.5 col-span-2 text-xs font-semibold">{distributor.name.toUpperCase()}</div>
              <div className="px-2 py-3.5 text-center border-l border-white/10 text-xs">Base</div>
              <div className="px-2 py-3.5 text-center border-l border-white/10 text-xs">Var.</div>
              <div className="px-2 py-3.5 text-center border-l border-white/10 text-xs">Meta</div>
            </div>
            <div className="divide-y divide-gray-200">
              {tableRows.map((row) => {
                const bp = C[row.baseBg ?? "none"];
                const vp = C[row.varBg  ?? "none"];
                const mp = C[row.metaBg ?? "none"];
                return (
                  <div key={row.label} className="grid grid-cols-5 items-stretch" style={{ backgroundColor: "#f7f7f7" }}>
                    <div className="px-3 py-2.5 col-span-2 text-xs font-medium text-gray-700 leading-tight flex items-center">{row.label}</div>
                    <div className="px-2 py-2.5 text-center text-xs tabular-nums font-semibold border-l border-gray-200 flex items-center justify-center" style={{ backgroundColor: bp.bg, color: bp.text }}>
                      {row.base === "—"      ? <span className="text-gray-300 font-normal">—</span> : row.base}
                    </div>
                    <div className="px-2 py-2.5 text-center text-xs tabular-nums font-semibold border-l border-gray-200 flex items-center justify-center" style={{ backgroundColor: vp.bg, color: vp.text }}>
                      {row.variacion === "—" ? <span className="text-gray-300 font-normal">—</span> : row.variacion}
                    </div>
                    <div className="px-2 py-2.5 text-center text-xs tabular-nums font-bold border-l border-gray-200 flex items-center justify-center" style={{ backgroundColor: mp.bg, color: mp.text }}>
                      {row.meta === "—"      ? <span className="text-gray-300 font-normal">—</span> : row.meta}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-300 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">i</span>
            <p className="text-xs text-gray-400 leading-snug">Vista previa en tiempo real. Los cambios no se guardan hasta presionar el botón correspondiente.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
