"use client";
import { use, useState, useEffect } from "react";
import { calcular, formatPeriod } from "@/lib/mock-data";
import type { Distributor } from "@/lib/mock-data";
import { getDistributorBySlug, getEntry } from "@/lib/db";
import { upsertDistributorMetrics } from "@/lib/actions";
import { ALL_PERIOD_KEYS, defaultPeriodKey } from "@/lib/periods";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiArrowLeftLine, RiSaveLine, RiCheckLine, RiEditLine,
  RiArrowDownSLine, RiUserLine, RiBox3Line,
  RiShoppingBagLine, RiTeamLine,
  RiMoneyDollarCircleLine, RiCalendarLine,
  RiLockLine, RiCloseLine,
} from "@remixicon/react";

type FormState = {
  totalCartera: number;
  pctActivacion: number;
  pctClientesFritz: number;
  totalSkusFritz: number;
  cajasPromedio: number;
  numVendedores: number;
  margenGanancia: number;
};

const EMPTY_FORM: FormState = {
  totalCartera: 0,
  pctActivacion: 0,
  pctClientesFritz: 0,
  totalSkusFritz: 0,
  cajasPromedio: 0,
  numVendedores: 0,
  margenGanancia: 0,
};

// ── Field component outside main to avoid focus loss on re-render ─────────────
function Field({
  label, description, fieldKey, type, icon: Icon, colSpan = 1,
  form, onChange, disabled,
}: {
  label: string;
  description: string;
  fieldKey: keyof FormState;
  type: "number" | "percent";
  icon?: React.ComponentType<{ className?: string }>;
  colSpan?: 1 | 2;
  form: FormState;
  onChange: (key: string, value: string, type: string) => void;
  disabled: boolean;
}) {
  const rawValue = form[fieldKey] as number;
  const displayValue = type === "percent" ? (rawValue * 100).toFixed(0) : String(rawValue);
  return (
    <div className={cn(colSpan === 2 ? "col-span-2" : "col-span-1")}>
      <label className="block text-sm font-medium text-gray-800 mb-1">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{description}</p>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {type === "percent"
            ? <span className={cn("text-sm font-medium", disabled ? "text-gray-300" : "text-primary-500")}>%</span>
            : Icon && <Icon className={cn("w-4 h-4", disabled ? "text-gray-300" : "text-primary-500")} />
          }
        </span>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => onChange(fieldKey, e.target.value, type)}
          disabled={disabled}
          className={cn(
            "w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition-all",
            disabled
              ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
              : "border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
          )}
        />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function NuevaEntradaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodKey, setPeriodKey] = useState(defaultPeriodKey());
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [snapshot, setSnapshot] = useState<FormState | null>(null);
  const [locked, setLocked] = useState(false);
  const [existsInDB, setExistsInDB] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("period");
    if (p && ALL_PERIOD_KEYS.includes(p)) setPeriodKey(p);
  }, []);

  useEffect(() => {
    router.replace(`/distribuidor/${slug}/datos/nueva?period=${periodKey}`);
  }, [periodKey, slug, router]);

  useEffect(() => {
    getDistributorBySlug(slug).then((d) => {
      setDistributor(d);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!distributor) return;
    const [y, m] = periodKey.split("-").map(Number);
    getEntry(distributor.id, y, m).then((entry) => {
      if (entry) {
        const loaded: FormState = {
          totalCartera:     entry.totalCartera,
          pctActivacion:    entry.pctActivacion,
          pctClientesFritz: entry.pctClientesFritz,
          totalSkusFritz:   entry.totalSkusFritz,
          cajasPromedio:    entry.cajasPromedio,
          numVendedores:    entry.numVendedores,
          margenGanancia:   entry.margenGanancia,
        };
        setForm(loaded);
        setLocked(true);
        setExistsInDB(true);
      } else {
        setForm(EMPTY_FORM);
        setLocked(false);
        setExistsInDB(false);
      }
      setSnapshot(null);
      setSaveError(null);
    });
  }, [distributor, periodKey]);

  const handleChange = (key: string, value: string, type: string) => {
    const parsed = type === "percent" ? parseFloat(value) / 100 : parseFloat(value);
    setForm((prev) => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  const handleEdit = () => {
    setSnapshot(form);
    setLocked(false);
    setSaveError(null);
  };

  const handleCancel = () => {
    if (snapshot) setForm(snapshot);
    setLocked(true);
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!distributor || saving) return;
    const [periodYear, periodMonth] = periodKey.split("-").map(Number);
    setSaving(true);
    setSaveError(null);
    const { error } = await upsertDistributorMetrics({
      id: `${distributor.id}-${periodYear}-${periodMonth}`,
      distributorId: distributor.id,
      periodYear,
      periodMonth,
      totalCartera:     form.totalCartera,
      pctActivacion:    form.pctActivacion,
      pctClientesFritz: form.pctClientesFritz,
      totalSkusFritz:   form.totalSkusFritz,
      cajasPromedio:    form.cajasPromedio,
      numVendedores:    form.numVendedores,
      margenGanancia:   form.margenGanancia,
      comentarios:      "",
    });
    if (error) { setSaveError(error); setSaving(false); return; }
    setSaved(true);
    setExistsInDB(true);
    setTimeout(() => {
      setSaved(false);
      setSaving(false);
      setLocked(true);
      setSnapshot(null);
    }, 1200);
  };

  const C = {
    yellow:  { bg: "#FEF9C3", text: "#713F12" },
    blue:    { bg: "#DBEAFE", text: "#1E3A8A" },
    orange:  { bg: "#FFEDD5", text: "#7C2D12" },
    red:     { bg: "#FEE2E2", text: "#7F1D1D" },
    green:   { bg: "#DCFCE7", text: "#14532D" },
    none:    { bg: "transparent", text: "#374151" },
  } as const;
  type CellColor = keyof typeof C;

  const [periodYear, periodMonth] = periodKey.split("-").map(Number);

  const previewEntry = distributor ? {
    id: "preview",
    distributorId: distributor.id,
    periodYear,
    periodMonth,
    pctIncrementoActivos:    0.1,
    pctIncrementoFritz:      0.1,
    pctIncrementoSkus:       0.1,
    pctIncrementoSellOut:    0.1,
    pctIncrementoVendedores: 0.05,
    rebate:                  0.01,
    comentarios:             "",
    ...form,
  } : null;

  const preview = previewEntry ? calcular(previewEntry as Parameters<typeof calcular>[0]) : null;

  const vendMeta     = preview ? Math.round(form.numVendedores * 1.05) : 0;
  const cli_vend_meta = preview && vendMeta > 0 ? (preview.activadosMeta / vendMeta).toFixed(1) : "—";
  const caj_cli_meta  = preview && preview.activadosMeta > 0 ? (preview.cajasMeta / preview.activadosMeta).toFixed(1) : "—";
  const caj_vend_meta = preview && vendMeta > 0 ? Math.round(preview.cajasMeta / vendMeta).toLocaleString() : "—";
  const fmtPct = (v: number) => v > 0 ? `${(v * 100).toFixed(0)}%` : "—";

  type Row = {
    label: string;
    base: string;      baseBg?: CellColor;
    variacion: string; varBg?: CellColor;
    meta: string;      metaBg?: CellColor;
    rowBg?: string;
  };

  const tableRows: Row[] = preview ? [
    { label: "Total Cartera",         base: form.totalCartera.toLocaleString(),                 baseBg: "yellow", variacion: "—",                           meta: "—"                                                            },
    { label: "Activados",             base: Math.round(preview.activadosBase).toLocaleString(),  baseBg: "blue",   variacion: fmtPct(form.pctActivacion),    varBg: "yellow", meta: Math.round(preview.activadosMeta).toLocaleString(), metaBg: "orange" },
    { label: "Clientes con Fritz",    base: Math.round(preview.fritzeBase).toLocaleString(),     baseBg: "red",    variacion: fmtPct(form.pctClientesFritz), varBg: "blue",   meta: Math.round(preview.fritzMeta).toLocaleString(),     metaBg: "red"    },
    { label: "Número de SKUs",        base: Math.round(preview.skusBase).toLocaleString(),       baseBg: "red",    variacion: "10%",                         varBg: "blue",   meta: Math.round(preview.skusMeta).toLocaleString(),      metaBg: "red"    },
    { label: "Cajas Sell Out",        base: Math.round(preview.cajasBase).toLocaleString(),      baseBg: "red",    variacion: "10%",                         varBg: "blue",   meta: Math.round(preview.cajasMeta).toLocaleString(),     metaBg: "green"  },
    { label: "Clientes Prom × Vend.", base: preview.clientesPorVendedor.toFixed(1),              variacion: "—",                                              meta: cli_vend_meta,                                               metaBg: "green"  },
    { label: "Cajas Prom × Cliente",  base: preview.cajasPorCliente.toFixed(1),                  variacion: "—",                                              meta: caj_cli_meta                                                               },
    { label: "Incr. Vendedores",      base: form.numVendedores.toString(),                       variacion: "—",                                              meta: vendMeta > 0 ? vendMeta.toLocaleString() : "—"                             },
    { label: "Cajas Prom × Vendedor", base: preview.cajasPorVendedor.toFixed(0),                 baseBg: "green",  variacion: "—",                           meta: caj_vend_meta,                                               metaBg: "green"  },
  ] : [];

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!distributor) {
    return <div className="p-6 text-gray-500">Distribuidor no encontrado.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/distribuidor/${slug}/datos`}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900 cursor-pointer"
        >
          <RiArrowLeftLine className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {existsInDB ? "Editar Reporte" : "Cargar Reporte"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{distributor.name} — {formatPeriod(periodYear, periodMonth)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-8 items-start">

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Section header */}
          <div className={cn(
            "px-6 py-4 flex items-center justify-between border-b",
            locked ? "border-gray-100 bg-gray-50" : "border-primary-100 bg-primary-50"
          )}>
            <div className="flex items-center gap-2">
              {locked
                ? <RiLockLine className="w-4 h-4 text-gray-400" />
                : <RiEditLine className="w-4 h-4 text-primary-500" />
              }
              <span className={cn("text-sm font-semibold", locked ? "text-gray-500" : "text-primary-700")}>
                {locked ? "Datos guardados" : existsInDB ? "Editando datos" : "Nuevo reporte"}
              </span>
            </div>
            {locked
              ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors cursor-pointer"
                >
                  <RiEditLine className="w-4 h-4" />
                  Editar
                </button>
              ) : existsInDB && snapshot && (
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <RiCloseLine className="w-4 h-4" />
                  Cancelar
                </button>
              )
            }
          </div>

          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">

              {/* Period selector */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-800 mb-1">Período del reporte</label>
                <p className="text-xs text-gray-400 mb-2">Mes y año al que corresponden estos datos</p>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <RiCalendarLine className="w-4 h-4 text-primary-500" />
                  </span>
                  <select
                    value={periodKey}
                    onChange={(e) => setPeriodKey(e.target.value)}
                    style={{ appearance: "none" }}
                    className="w-full pl-10 pr-9 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent cursor-pointer transition-all"
                  >
                    {ALL_PERIOD_KEYS.slice().reverse().map((k) => {
                      const [y, m] = k.split("-").map(Number);
                      return <option key={k} value={k}>{formatPeriod(y, m)}</option>;
                    })}
                  </select>
                  <RiArrowDownSLine className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <Field fieldKey="totalCartera" type="number" colSpan={2}
                label="Total cartera del Cliente"
                description="Número total de clientes en tu cartera"
                icon={RiUserLine}
                form={form} onChange={handleChange} disabled={locked} />

              <Field fieldKey="pctActivacion" type="percent"
                label="% de Activación actual"
                description="Clientes activos actualmente"
                form={form} onChange={handleChange} disabled={locked} />

              <Field fieldKey="pctClientesFritz" type="percent"
                label="% Clientes con Fritz"
                description="Clientes activos que tienen Fritz"
                form={form} onChange={handleChange} disabled={locked} />

              <Field fieldKey="totalSkusFritz" type="number"
                label="SKUs Fritz en portafolio"
                description="SKUs de Fritz en tu portafolio"
                icon={RiBox3Line}
                form={form} onChange={handleChange} disabled={locked} />

              <Field fieldKey="cajasPromedio" type="number"
                label="Cajas promedio (Sell Out)"
                description="Cajas vendidas por período"
                icon={RiShoppingBagLine}
                form={form} onChange={handleChange} disabled={locked} />

              <Field fieldKey="numVendedores" type="number"
                label="# de Vendedores"
                description="Vendedores en tu equipo"
                icon={RiTeamLine}
                form={form} onChange={handleChange} disabled={locked} />

              <Field fieldKey="margenGanancia" type="percent"
                label="Margen de Ganancia"
                description="Tu margen de ganancia actual"
                icon={RiMoneyDollarCircleLine}
                form={form} onChange={handleChange} disabled={locked} />
            </div>

            {!locked && (
              <>
                {saveError && (
                  <div className="mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                    {saveError}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saved || saving}
                  className={cn(
                    "mt-6 w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all",
                    saved
                      ? "bg-green-600 text-white cursor-default"
                      : saving
                      ? "bg-primary-400 text-white cursor-not-allowed"
                      : "bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white shadow-sm cursor-pointer"
                  )}
                >
                  {saved ? (
                    <><RiCheckLine className="w-4 h-4" /> ¡Guardado!</>
                  ) : (
                    <><RiSaveLine className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Reporte"}</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Live preview table */}
        <div className="flex flex-col gap-3 sticky top-6">
          <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ backgroundColor: "#f7f7f7" }}>
            <div className="grid grid-cols-5 text-sm font-semibold text-white" style={{ backgroundColor: "#1e2a3a" }}>
              <div className="px-4 py-3.5 col-span-2">CLIENTE: {distributor.name.toUpperCase()}</div>
              <div className="px-3 py-3.5 text-center border-l border-white/10">Base</div>
              <div className="px-3 py-3.5 text-center border-l border-white/10">Variación</div>
              <div className="px-3 py-3.5 text-center border-l border-white/10">Meta</div>
            </div>
            <div className="divide-y divide-gray-200 text-sm">
              {tableRows.map((row) => {
                const basePalette = C[row.baseBg ?? "none"];
                const varPalette  = C[row.varBg  ?? "none"];
                const metaPalette = C[row.metaBg ?? "none"];
                return (
                  <div key={row.label} className="grid grid-cols-5 items-stretch"
                    style={{ backgroundColor: row.rowBg ?? "#f7f7f7" }}>
                    <div className="px-4 py-3 col-span-2 text-gray-700 font-medium leading-tight flex items-center">
                      {row.label}
                    </div>
                    <div className="px-3 py-3 text-center tabular-nums font-semibold border-l border-gray-200 flex items-center justify-center"
                      style={{ backgroundColor: basePalette.bg, color: basePalette.text }}>
                      {row.base === "—" ? <span className="text-gray-300 font-normal">—</span> : row.base}
                    </div>
                    <div className="px-3 py-3 text-center tabular-nums font-semibold border-l border-gray-200 flex items-center justify-center"
                      style={{ backgroundColor: varPalette.bg, color: varPalette.text }}>
                      {row.variacion === "—" ? <span className="text-gray-300 font-normal">—</span> : row.variacion}
                    </div>
                    <div className="px-3 py-3 text-center tabular-nums font-bold border-l border-gray-200 flex items-center justify-center"
                      style={{ backgroundColor: metaPalette.bg, color: metaPalette.text }}>
                      {row.meta === "—" ? <span className="text-gray-300 font-normal">—</span> : row.meta}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-400 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">i</span>
            <p className="text-xs text-gray-400 leading-snug">
              Tabla informativa. Los valores se calculan en tiempo real a partir de los datos ingresados.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
