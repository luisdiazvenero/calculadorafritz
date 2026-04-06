"use client";
import { use, useState } from "react";
import { distributors, monthlyEntries, calcular } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import {
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

export default function CalculadoraPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const distributor = distributors.find((d) => d.slug === slug);

  const allEntries = distributor
    ? monthlyEntries
        .filter((m) => m.distributorId === distributor.id)
        .sort((a, b) => a.periodYear * 100 + a.periodMonth - (b.periodYear * 100 + b.periodMonth))
    : [];
  const existing = allEntries[allEntries.length - 1] ?? null;

  const [form, setForm] = useState<FormState>({
    totalCartera:     existing?.totalCartera     ?? 500,
    pctActivacion:    existing?.pctActivacion    ?? 0.6,
    pctClientesFritz: existing?.pctClientesFritz ?? 0.5,
    totalSkusFritz:   existing?.totalSkusFritz   ?? 20,
    cajasPromedio:    existing?.cajasPromedio     ?? 5000,
    numVendedores:    existing?.numVendedores     ?? 5,
    margenGanancia:   existing?.margenGanancia    ?? 0.15,
  });

  if (!distributor) {
    return <div className="p-6 text-gray-500">Distribuidor no encontrado.</div>;
  }

  const previewEntry = {
    id: "calc",
    distributorId: distributor.id,
    periodYear: existing?.periodYear ?? 2026,
    periodMonth: existing?.periodMonth ?? 1,
    pctIncrementoActivos: 0.1,
    pctIncrementoFritz: 0.1,
    pctIncrementoSkus: 0.1,
    pctIncrementoSellOut: 0.1,
    pctIncrementoVendedores: 0.05,
    rebate: existing?.rebate ?? 0.01,
    comentarios: "",
    ...form,
  };

  const preview = calcular(previewEntry as Parameters<typeof calcular>[0]);

  const handleChange = (key: keyof FormState, value: string, type: "number" | "percent") => {
    const parsed = type === "percent" ? parseFloat(value) / 100 : parseFloat(value);
    setForm((prev) => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  const fmtCur = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `$${(v / 1_000).toFixed(1)}k`
    : `$${Math.round(v).toLocaleString()}`;

  function Field({
    label, description, fieldKey, type, icon: Icon, colSpan = 1,
  }: {
    label: string; description: string; fieldKey: keyof FormState;
    type: "number" | "percent";
    icon?: React.ComponentType<{ className?: string }>;
    colSpan?: 1 | 2;
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
            onChange={(e) => handleChange(fieldKey, e.target.value, type)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all bg-white"
          />
        </div>
      </div>
    );
  }

  const vendMeta = Math.round(form.numVendedores * 1.05);
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
    base: string;    baseBg?: CellColor;
    variacion: string; varBg?: CellColor;
    meta: string;    metaBg?: CellColor;
    rowBg?: string;
  };

  const tableRows: Row[] = [
    { label: "Total Cartera",         base: form.totalCartera.toLocaleString(),                baseBg: "yellow",  variacion: "—",                           meta: "—"                                                          },
    { label: "Activados",             base: Math.round(preview.activadosBase).toLocaleString(), baseBg: "blue",    variacion: fmtPct(form.pctActivacion),    varBg: "yellow",  meta: Math.round(preview.activadosMeta).toLocaleString(), metaBg: "orange" },
    { label: "Clientes con Fritz",    base: Math.round(preview.fritzeBase).toLocaleString(),    baseBg: "red",     variacion: fmtPct(form.pctClientesFritz), varBg: "blue",    meta: Math.round(preview.fritzMeta).toLocaleString(),     metaBg: "red"    },
    { label: "Número de SKUs",        base: Math.round(preview.skusBase).toLocaleString(),      baseBg: "red",     variacion: "10%",                         varBg: "blue",    meta: Math.round(preview.skusMeta).toLocaleString(),      metaBg: "red"    },
    { label: "Cajas Sell Out",        base: Math.round(preview.cajasBase).toLocaleString(),     baseBg: "red",     variacion: "10%",                         varBg: "blue",    meta: Math.round(preview.cajasMeta).toLocaleString(),     metaBg: "green"  },
    { label: "Clientes Prom × Vend.", base: preview.clientesPorVendedor.toFixed(1),             variacion: "—",                                               meta: cli_vend_meta,                                              metaBg: "green"  },
    { label: "Cajas Prom × Cliente",  base: preview.cajasPorCliente.toFixed(1),                 variacion: "—",                                               meta: caj_cli_meta                                                               },
    { label: "Incr. Vendedores",      base: form.numVendedores.toString(),                      variacion: "—",                                               meta: vendMeta > 0 ? vendMeta.toLocaleString() : "—"                             },
    { label: "Cajas Prom × Vendedor", base: preview.cajasPorVendedor.toFixed(0),                baseBg: "green",   variacion: "—",                           meta: caj_vend_meta,                                              metaBg: "green"  },
    { label: "Rentabilidad aprox.",   base: "—",                                                variacion: "—",    meta: fmtCur(preview.rentabilidad), rowBg: "#DCFCE7", metaBg: "green" },
    { label: "Rebate final período",  base: "—",                                                variacion: "—",    meta: fmtCur(preview.rebateTotal),  rowBg: "#DCFCE7", metaBg: "green" },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <RiFlashlightLine className="w-5 h-5 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">Calculadora</h1>
        </div>
        <p className="text-sm text-gray-400 mt-0.5">
          Ajusta los valores y ve los resultados en tiempo real
        </p>
      </div>

      {/* Body */}
      <div className="grid grid-cols-2 gap-8 items-start">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-6">
              <Field fieldKey="totalCartera" type="number" colSpan={2}
                label="Total cartera" description="Número total de clientes en la cartera" icon={RiUserLine} />
              <Field fieldKey="pctActivacion" type="percent"
                label="% Activación" description="Clientes activos actualmente" />
              <Field fieldKey="pctClientesFritz" type="percent"
                label="% Clientes con Fritz" description="Clientes activos que tienen Fritz" />
              <Field fieldKey="totalSkusFritz" type="number"
                label="SKUs Fritz en portafolio" description="SKUs de Fritz en el portafolio" icon={RiBox3Line} />
              <Field fieldKey="cajasPromedio" type="number"
                label="Cajas promedio (Sell Out)" description="Cajas vendidas por período" icon={RiShoppingBagLine} />
              <Field fieldKey="numVendedores" type="number"
                label="# de Vendedores" description="Vendedores en el equipo" icon={RiTeamLine} />
              <Field fieldKey="margenGanancia" type="percent"
                label="Margen de Ganancia" description="Margen de ganancia actual" icon={RiMoneyDollarCircleLine} />
            </div>
            <div className="mt-6 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <RiFlashlightLine className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-snug">
                Modo simulación — los cambios no se guardan.
              </p>
            </div>
          </div>
        </div>

        {/* Live preview table */}
        <div className="flex flex-col gap-3 sticky top-6">
          <div className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ backgroundColor: "#f7f7f7" }}>
            <div className="grid grid-cols-5 text-sm font-semibold text-white" style={{ backgroundColor: "#1e2a3a" }}>
              <div className="px-4 py-3.5 col-span-2">{distributor.name.toUpperCase()}</div>
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
