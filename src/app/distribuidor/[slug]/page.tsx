"use client";
import { use, useState } from "react";
import {
  distributors, regions, monthlyEntries, calcular, formatPeriod, delta,
} from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  RiArrowUpLine, RiArrowDownLine,
  RiArrowDownSLine, RiArrowRightSLine,
  RiAddLine, RiHistoryLine,
  RiGroupLine, RiBox3Line, RiPieChart2Line, RiUserAddLine,
} from "@remixicon/react";

const REGION_COLORS: Record<string, string> = {
  Capital:            "#0466C8",
  Oriente:            "#BE3054",
  Centro:             "#424656",
  "Centro Occidente": "#FB6A85",
  Occidente:          "#A7AABD",
  Andes:              "#1A2D5A",
};

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const d = delta(current, previous);
  const positive = d >= 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0",
      positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
    )}>
      {positive ? <RiArrowUpLine className="w-3 h-3" /> : <RiArrowDownLine className="w-3 h-3" />}
      {Math.abs(d * 100).toFixed(1)}%
    </span>
  );
}

export default function DistribuidorVistaGlobal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const distributor = distributors.find((d) => d.slug === slug);
  const region = distributor ? regions.find((r) => r.id === distributor.regionId) : null;
  const regionColor = REGION_COLORS[region?.name ?? ""] ?? "#0466C8";

  const allDistEntries = distributor
    ? monthlyEntries
        .filter((m) => m.distributorId === distributor.id)
        .sort((a, b) => a.periodYear * 100 + a.periodMonth - (b.periodYear * 100 + b.periodMonth))
    : [];
  const availableKeys = allDistEntries.map(
    (e) => `${e.periodYear}-${String(e.periodMonth).padStart(2, "0")}`
  );
  const defaultLatest = availableKeys[availableKeys.length - 1] ?? "2026-02";
  const defaultPrev   = availableKeys[availableKeys.length - 2] ?? "2026-01";

  const [latestKey, setLatestKey] = useState(defaultLatest);
  const [prevKey,   setPrevKey]   = useState(defaultPrev);
  const [resultsOpen, setResultsOpen] = useState(true);

  const parsePeriod = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return { year: y, month: m };
  };
  const selectedPeriod = parsePeriod(latestKey);
  const prevPeriodSel  = parsePeriod(prevKey);

  if (!distributor) {
    return (
      <div className="p-6 text-center text-gray-500">Distribuidor no encontrado.</div>
    );
  }

  const entry = monthlyEntries.find(
    (m) => m.distributorId === distributor.id &&
           m.periodYear === selectedPeriod.year &&
           m.periodMonth === selectedPeriod.month
  );
  const prevEntry = monthlyEntries.find(
    (m) => m.distributorId === distributor.id &&
           m.periodYear === prevPeriodSel.year &&
           m.periodMonth === prevPeriodSel.month
  );

  const calc     = entry     ? calcular(entry)     : null;
  const prevCalc = prevEntry ? calcular(prevEntry) : null;

  const chartData = allDistEntries.map((e) => {
    const c = calcular(e);
    return {
      periodo:      formatPeriod(e.periodYear, e.periodMonth),
      Activados:    Math.round(c.activadosBase),
      Cajas:        Math.round(c.cajasBase),
      Rentabilidad: Math.round(c.rentabilidad / 1000),
    };
  });

  const allEntriesDesc = [...allDistEntries].reverse();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium border",
              distributor.status === "active"
                ? "bg-green-50 text-green-700 border-green-100"
                : "bg-gray-100 text-gray-500 border-gray-200"
            )}>
              {distributor.status === "active" ? "Activo" : "Inactivo"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{distributor.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{distributor.email}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selectors */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Período</span>
            <select
              value={latestKey}
              onChange={(e) => setLatestKey(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableKeys.map((k) => {
                const { year, month } = parsePeriod(k);
                return <option key={k} value={k}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>
          <span className="text-xs text-gray-400">vs</span>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Comparar con</span>
            <select
              value={prevKey}
              onChange={(e) => setPrevKey(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availableKeys.map((k) => {
                const { year, month } = parsePeriod(k);
                return <option key={k} value={k}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>

          <Link
            href={`/distribuidor/${slug}/datos/nueva`}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <RiAddLine className="w-4 h-4" />
            Cargar Reporte
          </Link>
        </div>
      </div>

      {entry && calc ? (
        <>
          {/* KPI cards */}
          {(() => {
            const kpiDefs = [
              { label: "Total Cartera",  value: entry.totalCartera,      prev: prevEntry?.totalCartera,      fmt: "number" as const, icon: RiGroupLine },
              { label: "Activados",      value: calc.activadosBase,       prev: prevCalc?.activadosBase,       fmt: "number" as const, icon: RiUserAddLine },
              { label: "% Activación",   value: entry.pctActivacion,      prev: prevEntry?.pctActivacion,      fmt: "percent" as const, icon: RiPieChart2Line },
              { label: "SKUs Fritz",     value: entry.totalSkusFritz,     prev: prevEntry?.totalSkusFritz,     fmt: "number" as const, icon: RiBox3Line },
            ];
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiDefs.map((kpi) => {
                  const fmtV = (v: number) =>
                    kpi.fmt === "percent" ? `${(v * 100).toFixed(0)}%` : Math.round(v).toLocaleString();
                  const d = kpi.prev !== undefined ? (kpi.value - kpi.prev) / (kpi.prev || 1) : null;
                  const positive = d === null || d >= 0;
                  const KpiIcon = kpi.icon;
                  return (
                    <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <KpiIcon className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-500 mb-1.5 truncate">{kpi.label}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[1.5rem] font-bold text-gray-900 tabular-nums tracking-tight leading-none">
                              {fmtV(kpi.value as number)}
                            </span>
                            {d !== null && (
                              <span className={cn(
                                "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
                                positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                              )}>
                                {positive ? <RiArrowUpLine className="w-3 h-3" /> : <RiArrowDownLine className="w-3 h-3" />}
                                {Math.abs(d * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {kpi.prev !== undefined && prevEntry && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-xs text-gray-400">vs {formatPeriod(prevEntry.periodYear, prevEntry.periodMonth)}</span>
                              <span className="text-xs font-semibold text-gray-700 tabular-nums">{fmtV(kpi.prev as number)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Trend chart */}
          {chartData.length > 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Tendencia Histórica</h2>
              <div className="flex items-center gap-4 mt-1 mb-4">
                {[
                  { label: "Activados",    color: regionColor },
                  { label: "Cajas SO",     color: "#94A3B8"   },
                  { label: "Rentabilidad", color: "#818CF8"   },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 52, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={regionColor} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={regionColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={44}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#818CF8" }} axisLine={false} tickLine={false} width={52}
                    tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", fontSize: 12 }}
                    formatter={(v, name) => {
                      const n = Number(v);
                      if (name === "Activados")    return [n.toLocaleString(), "Activados"];
                      if (name === "Cajas")        return [n.toLocaleString(), "Cajas SO"];
                      if (name === "Rentabilidad") return [`$${n.toLocaleString()}k`, "Rentabilidad"];
                      return [v, name];
                    }}
                  />
                  <Area yAxisId="left"  type="monotone" dataKey="Activados"    stroke={regionColor} strokeWidth={2}   fill="url(#gradAct)" dot={false} isAnimationActive={false} />
                  <Area yAxisId="left"  type="monotone" dataKey="Cajas"        stroke="#94A3B8"     strokeWidth={1.5} fill="none"          dot={false} isAnimationActive={false} strokeDasharray="4 2" />
                  <Area yAxisId="right" type="monotone" dataKey="Rentabilidad" stroke="#818CF8"     strokeWidth={1.5} fill="none"          dot={false} isAnimationActive={false} strokeDasharray="2 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Resultados Calculados — collapsible cards */}
          {(() => {
            const fmtNum = (v: number) => Math.round(v).toLocaleString();
            const fmtCur = (v: number) =>
              v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000   ? `$${(v / 1_000).toFixed(1)}k`
              : `$${Math.round(v).toLocaleString()}`;

            const cards: { label: string; base: number; meta: number; variacion: string | null; fmt: "number" | "currency"; color: string }[] = [
              { label: "Activados",          base: calc.activadosBase,       meta: calc.activadosMeta,           variacion: `${(entry.pctActivacion * 100).toFixed(0)}%`,        fmt: "number",   color: "#3B82F6" },
              { label: "Clientes con Fritz",  base: calc.fritzeBase,          meta: calc.fritzMeta,               variacion: `${(entry.pctClientesFritz * 100).toFixed(0)}%`,     fmt: "number",   color: "#7C3AED" },
              { label: "SKUs en Portafolio",  base: calc.skusBase,            meta: calc.skusMeta,                variacion: `${(entry.pctIncrementoSkus * 100).toFixed(0)}%`,    fmt: "number",   color: "#DC2626" },
              { label: "Cajas Sell Out",      base: calc.cajasBase,           meta: calc.cajasMeta,               variacion: `${(entry.pctIncrementoSellOut * 100).toFixed(0)}%`, fmt: "number",   color: "#059669" },
              { label: "Clientes / Vendedor", base: calc.clientesPorVendedor, meta: calc.clientesPorVendedor*1.1, variacion: null,                                                 fmt: "number",   color: "#D97706" },
              { label: "Cajas / Cliente",     base: calc.cajasPorCliente,     meta: calc.cajasPorCliente*1.1,     variacion: null,                                                 fmt: "number",   color: "#D97706" },
              { label: "Rentabilidad",        base: calc.rentabilidad,        meta: calc.rentabilidad*1.15,       variacion: null,                                                 fmt: "currency", color: "#0891B2" },
              { label: "Rebate Final",        base: calc.rebateTotal,         meta: calc.rebateTotal*1.1,         variacion: null,                                                 fmt: "currency", color: "#0891B2" },
            ];

            return (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setResultsOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <h2 className="text-base font-semibold text-gray-900">Resultados Calculados</h2>
                    <span className="text-sm text-gray-400">
                      Total Cartera: <span className="text-xl font-bold text-gray-900">{entry.totalCartera.toLocaleString()}</span>
                    </span>
                  </div>
                  {resultsOpen
                    ? <RiArrowDownSLine className="w-5 h-5 text-gray-400" />
                    : <RiArrowRightSLine className="w-5 h-5 text-gray-400" />}
                </button>

                {resultsOpen && (
                  <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {cards.map((card) => {
                      const fmtBase = card.fmt === "currency" ? fmtCur(card.base) : fmtNum(card.base);
                      const fmtMeta = card.fmt === "currency" ? fmtCur(card.meta) : fmtNum(card.meta);
                      const progress = Math.min((card.base / card.meta) * 100, 100);
                      const barHex  = progress >= 80 ? "#16a34a" : progress >= 50 ? "#f97316" : "#dc2626";
                      const pctCls  = progress >= 80 ? "text-green-600" : progress >= 50 ? "text-amber-500" : "text-red-500";
                      const SEGS    = 10;
                      const filled  = Math.round((progress / 100) * SEGS);
                      return (
                        <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                            <p className="text-sm font-bold text-gray-800 leading-tight">{card.label}</p>
                          </div>
                          <div className="px-4 py-4 flex flex-col gap-4 flex-1">
                            <div>
                              <span className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{fmtBase}</span>
                              {card.variacion && (
                                <span className="ml-2 text-sm font-semibold text-gray-400 tabular-nums">
                                  {card.variacion} <span className="text-xs font-normal text-gray-400">variación</span>
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-0.5">
                                {Array.from({ length: SEGS }).map((_, i) => (
                                  <div key={i} className="flex-1 h-2.5 rounded-sm"
                                    style={{ backgroundColor: i < filled ? barHex : "#E5E7EB" }} />
                                ))}
                              </div>
                              <span className="text-sm text-gray-400 tabular-nums">
                                Meta: <span className="text-gray-600 font-medium">{fmtMeta}</span>
                                {" "}
                                <span className={cn("font-bold", pctCls)}>({progress.toFixed(0)}%)</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}


        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm mb-4">No hay datos para este período.</p>
          <Link
            href={`/distribuidor/${slug}/datos/nueva`}
            className="inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            <RiAddLine className="w-4 h-4" />
            Cargar Reporte
          </Link>
        </div>
      )}
    </div>
  );
}
