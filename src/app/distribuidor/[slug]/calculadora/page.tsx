"use client";
import { use, useState, useEffect } from "react";
import { getDistributorBySlug, getLatestEntry } from "@/lib/db";
import { calcular } from "@/lib/mock-data";
import type { Distributor } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import Link from "next/link";
import {
  RiArrowLeftLine,
  RiUserLine,
  RiBox3Line,
  RiShoppingBagLine,
  RiTeamLine,
  RiMoneyDollarCircleLine,
  RiFlashlightLine,
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

const DEFAULT_FORM: FormState = {
  totalCartera: 500,
  pctActivacion: 0.6,
  pctClientesFritz: 0.5,
  totalSkusFritz: 20,
  cajasPromedio: 5000,
  numVendedores: 5,
  margenGanancia: 0.15,
};

// Outside component to avoid focus loss
function Field({
  label, description, fieldKey, type, icon: Icon, colSpan = 1,
  form, onChange,
}: {
  label: string; description: string; fieldKey: keyof FormState;
  type: "number" | "percent";
  icon?: React.ComponentType<{ className?: string }>;
  colSpan?: 1 | 2;
  form: FormState;
  onChange: (key: keyof FormState, value: string, type: "number" | "percent") => void;
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
            ? <span className="text-sm font-medium text-primary-500">%</span>
            : Icon && <Icon className="w-4 h-4 text-primary-500" />
          }
        </span>
        <input
          type="number"
          value={displayValue}
          onChange={(e) => onChange(fieldKey, e.target.value, type)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all bg-white"
        />
      </div>
    </div>
  );
}

export default function CalculadoraPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  useEffect(() => {
    getDistributorBySlug(slug).then((d) => {
      setDistributor(d);
      if (!d) { setLoading(false); return; }
      getLatestEntry(d.id).then((entry) => {
        if (entry) {
          setForm({
            totalCartera:     entry.totalCartera,
            pctActivacion:    entry.pctActivacion,
            pctClientesFritz: entry.pctClientesFritz,
            totalSkusFritz:   entry.totalSkusFritz,
            cajasPromedio:    entry.cajasPromedio,
            numVendedores:    entry.numVendedores,
            margenGanancia:   entry.margenGanancia,
          });
        }
        setLoading(false);
      });
    });
  }, [slug]);

  const previewEntry = distributor ? {
    id: "calc",
    distributorId: distributor.id,
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
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

  const handleChange = (key: keyof FormState, value: string, type: "number" | "percent") => {
    const parsed = type === "percent" ? parseFloat(value) / 100 : parseFloat(value);
    setForm((prev) => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!distributor || !preview) {
    return <div className="p-8 text-gray-500">Distribuidor no encontrado.</div>;
  }

  const vendMeta     = Math.round(form.numVendedores * 1.05);
  const cli_vend_meta = vendMeta > 0 ? (preview.activadosMeta / vendMeta).toFixed(1) : "—";
  const caj_cli_meta  = preview.activadosMeta > 0 ? (preview.cajasMeta / preview.activadosMeta).toFixed(1) : "—";
  const caj_vend_meta = vendMeta > 0 ? Math.round(preview.cajasMeta / vendMeta).toLocaleString() : "—";
  const fmtPct = (v: number) => (v > 0 ? `${(v * 100).toFixed(0)}%` : "—");

  const C = {
    yellow:  { bg: "#FEF9C3", text: "#713F12" },
    blue:    { bg: "#DBEAFE", text: "#1E3A8A" },
    orange:  { bg: "#FFEDD5", text: "#7C2D12" },
    red:     { bg: "#FEE2E2", text: "#7F1D1D" },
    green:   { bg: "#DCFCE7", text: "#14532D" },
    none:    { bg: "transparent", text: "#374151" },
  } as const;
  type CellColor = keyof typeof C;

  type Row = {
    label: string;
    base: string;      baseBg?: CellColor;
    variacion: string; varBg?: CellColor;
    meta: string;      metaBg?: CellColor;
    rowBg?: string;
  };

  const tableRows: Row[] = [
    { label: "Total Cartera",         base: form.totalCartera.toLocaleString(),                 baseBg: "yellow", variacion: "—",                           meta: "—"                                                           },
    { label: "Activados",             base: Math.round(preview.activadosBase).toLocaleString(),  baseBg: "blue",   variacion: fmtPct(form.pctActivacion),    varBg: "yellow", meta: Math.round(preview.activadosMeta).toLocaleString(), metaBg: "orange" },
    { label: "Clientes con Fritz",    base: Math.round(preview.fritzeBase).toLocaleString(),     baseBg: "red",    variacion: fmtPct(form.pctClientesFritz), varBg: "blue",   meta: Math.round(preview.fritzMeta).toLocaleString(),     metaBg: "red"    },
    { label: "Número de SKUs",        base: Math.round(preview.skusBase).toLocaleString(),       baseBg: "red",    variacion: "10%",                         varBg: "blue",   meta: Math.round(preview.skusMeta).toLocaleString(),      metaBg: "red"    },
    { label: "Cajas Sell Out",        base: Math.round(preview.cajasBase).toLocaleString(),      baseBg: "red",    variacion: "10%",                         varBg: "blue",   meta: Math.round(preview.cajasMeta).toLocaleString(),     metaBg: "green"  },
    { label: "Clientes Prom × Vend.", base: preview.clientesPorVendedor.toFixed(1),              variacion: "—",                                              meta: cli_vend_meta,                                               metaBg: "green"  },
    { label: "Cajas Prom × Cliente",  base: preview.cajasPorCliente.toFixed(1),                  variacion: "—",                                              meta: caj_cli_meta                                                               },
    { label: "Incr. Vendedores",      base: form.numVendedores.toString(),                       variacion: "—",                                              meta: vendMeta > 0 ? vendMeta.toLocaleString() : "—"                             },
    { label: "Cajas Prom × Vendedor", base: preview.cajasPorVendedor.toFixed(0),                 baseBg: "green",  variacion: "—",                           meta: caj_vend_meta,                                               metaBg: "green"  },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/distribuidor/${slug}`}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900 cursor-pointer"
        >
          <RiArrowLeftLine className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <RiFlashlightLine className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-gray-900">Calculadora</h1>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {distributor.name} — ajusta los valores y ve los resultados en tiempo real
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-8 items-start">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              <Field fieldKey="totalCartera" type="number" colSpan={2}
                label="Total cartera"
                description="Número total de clientes en la cartera"
                icon={RiUserLine} form={form} onChange={handleChange} />
              <Field fieldKey="pctActivacion" type="percent"
                label="% Activación"
                description="Clientes activos actualmente"
                form={form} onChange={handleChange} />
              <Field fieldKey="pctClientesFritz" type="percent"
                label="% Clientes con Fritz"
                description="Clientes activos que tienen Fritz"
                form={form} onChange={handleChange} />
              <Field fieldKey="totalSkusFritz" type="number"
                label="SKUs Fritz en portafolio"
                description="SKUs de Fritz en el portafolio"
                icon={RiBox3Line} form={form} onChange={handleChange} />
              <Field fieldKey="cajasPromedio" type="number"
                label="Cajas promedio (Sell Out)"
                description="Cajas vendidas por período"
                icon={RiShoppingBagLine} form={form} onChange={handleChange} />
              <Field fieldKey="numVendedores" type="number"
                label="# de Vendedores"
                description="Vendedores en el equipo"
                icon={RiTeamLine} form={form} onChange={handleChange} />
              <Field fieldKey="margenGanancia" type="percent"
                label="Margen de Ganancia"
                description="Margen de ganancia actual"
                icon={RiMoneyDollarCircleLine} form={form} onChange={handleChange} />
            </div>

            <div className="mt-6 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <RiFlashlightLine className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-snug">
                Modo simulación — los cambios no se guardan. Usa <strong>Cargar datos</strong> para registrar un reporte oficial.
              </p>
            </div>
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
                    <div className="px-4 py-3 col-span-2 text-gray-700 font-medium leading-tight flex items-center">{row.label}</div>
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
              Los valores se calculan en tiempo real. Las metas usan incrementos estándar como referencia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
