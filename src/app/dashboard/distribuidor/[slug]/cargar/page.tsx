"use client";
import { use, useState } from "react";
import { distributors, regions, monthlyEntries, calcular, formatPeriod } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RiArrowLeftLine, RiSaveLine, RiCalculatorLine } from "@remixicon/react";

const FIELDS = [
  { key: "totalCartera", label: "Total cartera del Cliente", type: "number", description: "Número total de clientes en la cartera" },
  { key: "pctActivacion", label: "% de Activación actual", type: "percent", description: "Porcentaje de clientes activos actualmente" },
  { key: "pctClientesFritz", label: "% de clientes con Fritz actual", type: "percent", description: "Porcentaje de clientes activos que tienen Fritz" },
  { key: "pctIncrementoActivos", label: "% de Incremento Clientes Activos", type: "percent", description: "Meta de incremento de clientes activos" },
  { key: "pctIncrementoFritz", label: "% de Incremento con Fritz", type: "percent", description: "Meta de incremento de clientes con Fritz" },
  { key: "totalSkusFritz", label: "Total SKUs FRITZ en portafolio", type: "number", description: "Número de SKUs de Fritz en el portafolio" },
  { key: "pctIncrementoSkus", label: "% de Incremento SKUs", type: "percent", description: "Meta de incremento de SKUs" },
  { key: "cajasPromedio", label: "Cajas Sell Out promedio", type: "number", description: "Promedio de cajas vendidas (Sell Out)" },
  { key: "pctIncrementoSellOut", label: "% de Incremento Sell Out", type: "percent", description: "Meta de incremento en Sell Out" },
  { key: "numVendedores", label: "# de Vendedores", type: "number", description: "Número de vendedores actuales" },
  { key: "pctIncrementoVendedores", label: "% de incremento Vendedores", type: "percent", description: "Meta de incremento de vendedores" },
  { key: "margenGanancia", label: "Margen de Ganancia del Distribuidor", type: "percent", description: "Margen de ganancia aplicado" },
  { key: "rebate", label: "Rebate (%)", type: "percent", description: "Porcentaje de rebate aplicado" },
] as const;

type FormState = {
  totalCartera: number;
  pctActivacion: number;
  pctClientesFritz: number;
  pctIncrementoActivos: number;
  pctIncrementoFritz: number;
  totalSkusFritz: number;
  pctIncrementoSkus: number;
  cajasPromedio: number;
  pctIncrementoSellOut: number;
  numVendedores: number;
  pctIncrementoVendedores: number;
  margenGanancia: number;
  rebate: number;
  comentarios: string;
  periodYear: number;
  periodMonth: number;
};

export default function CargarDatosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const distributor = distributors.find((d) => d.slug === slug);
  const region = distributor ? regions.find((r) => r.id === distributor.regionId) : null;

  const LATEST = { year: 2026, month: 2 };
  const existing = distributor
    ? monthlyEntries.find(
        (m) => m.distributorId === distributor.id && m.periodYear === LATEST.year && m.periodMonth === LATEST.month
      )
    : null;

  const [form, setForm] = useState<FormState>({
    totalCartera: existing?.totalCartera ?? 0,
    pctActivacion: existing?.pctActivacion ?? 0,
    pctClientesFritz: existing?.pctClientesFritz ?? 0,
    pctIncrementoActivos: existing?.pctIncrementoActivos ?? 0,
    pctIncrementoFritz: existing?.pctIncrementoFritz ?? 0,
    totalSkusFritz: existing?.totalSkusFritz ?? 0,
    pctIncrementoSkus: existing?.pctIncrementoSkus ?? 0,
    cajasPromedio: existing?.cajasPromedio ?? 0,
    pctIncrementoSellOut: existing?.pctIncrementoSellOut ?? 0,
    numVendedores: existing?.numVendedores ?? 0,
    pctIncrementoVendedores: existing?.pctIncrementoVendedores ?? 0,
    margenGanancia: existing?.margenGanancia ?? 0,
    rebate: existing?.rebate ?? 0.01,
    comentarios: existing?.comentarios ?? "",
    periodYear: LATEST.year,
    periodMonth: LATEST.month,
  });

  const [saved, setSaved] = useState(false);

  if (!distributor) {
    return <div className="p-6 text-gray-500">Distribuidor no encontrado.</div>;
  }

  const previewEntry = {
    ...(existing ?? {
      id: "preview",
      distributorId: distributor.id,
      periodYear: form.periodYear,
      periodMonth: form.periodMonth,
      comentarios: "",
    }),
    ...form,
  };

  const preview = calcular(previewEntry as Parameters<typeof calcular>[0]);

  const handleChange = (key: string, value: string, type: string) => {
    let parsed: number;
    if (type === "percent") {
      parsed = parseFloat(value) / 100;
    } else {
      parsed = parseFloat(value);
    }
    setForm((prev) => ({ ...prev, [key]: isNaN(parsed) ? 0 : parsed }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      router.push(`/dashboard/distribuidor/${slug}`);
    }, 1500);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/distribuidor/${slug}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <RiArrowLeftLine className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <p className="text-sm text-gray-400">{region?.name} / {distributor.name}</p>
          <h1 className="text-2xl font-bold text-gray-900">Cargar Datos</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={`${form.periodYear}-${form.periodMonth}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              setForm((prev) => ({ ...prev, periodYear: y, periodMonth: m }));
            }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            {[
              { year: 2026, month: 2 },
              { year: 2026, month: 1 },
              { year: 2025, month: 11 },
              { year: 2025, month: 10 },
              { year: 2025, month: 9 },
            ].map((p) => (
              <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                {formatPeriod(p.year, p.month)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-5">Métricas de Entrada</h2>
          <div className="space-y-4">
            {FIELDS.map((field) => {
              const rawValue = form[field.key as keyof FormState] as number;
              const displayValue =
                field.type === "percent"
                  ? (rawValue * 100).toFixed(0)
                  : String(rawValue);

              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <p className="text-xs text-gray-400 mb-1.5">{field.description}</p>
                  <div className="relative">
                    <input
                      type="number"
                      value={displayValue}
                      onChange={(e) => handleChange(field.key, e.target.value, field.type)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12"
                    />
                    {field.type === "percent" && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                    )}
                  </div>
                </div>
              );
            })}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios adicionales</label>
              <textarea
                value={form.comentarios}
                onChange={(e) => setForm((prev) => ({ ...prev, comentarios: e.target.value }))}
                rows={3}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Observaciones del período..."
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <RiCalculatorLine className="w-4 h-4 text-primary-600" />
              <h2 className="text-base font-semibold text-gray-900">Vista Previa Calculada</h2>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["Total Cartera", form.totalCartera.toLocaleString()],
                ["Activados (Base)", Math.round(preview.activadosBase).toLocaleString()],
                ["Activados (Meta)", Math.round(preview.activadosMeta).toLocaleString()],
                ["Clientes con Fritz (Base)", Math.round(preview.fritzeBase).toLocaleString()],
                ["Clientes con Fritz (Meta)", Math.round(preview.fritzMeta).toLocaleString()],
                ["SKUs (Base)", Math.round(preview.skusBase).toLocaleString()],
                ["SKUs (Meta)", Math.round(preview.skusMeta).toLocaleString()],
                ["Cajas Sell Out (Base)", Math.round(preview.cajasBase).toLocaleString()],
                ["Cajas Sell Out (Meta)", Math.round(preview.cajasMeta).toLocaleString()],
                ["Clientes prom. x Vendedor", preview.clientesPorVendedor.toFixed(1)],
                ["Cajas prom. x Cliente", preview.cajasPorCliente.toFixed(1)],
                ["Cajas prom. x Vendedor", preview.cajasPorVendedor.toFixed(1)],
                ["Rentabilidad Aprox.", `$${Math.round(preview.rentabilidad).toLocaleString()}`],
                ["Rebate Final", `$${Math.round(preview.rebateTotal).toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saved}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition",
              saved
                ? "bg-green-600 text-white"
                : "bg-primary-600 hover:bg-primary-700 text-white"
            )}
          >
            <RiSaveLine className="w-4 h-4" />
            {saved ? "¡Guardado! Redirigiendo..." : "Guardar datos del período"}
          </button>
        </div>
      </div>
    </div>
  );
}
