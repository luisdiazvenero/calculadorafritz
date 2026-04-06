"use client";
import { use, useState } from "react";
import {
  distributors, regions, monthlyEntries, calcular, formatPeriod, delta,
} from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import {
  RiArrowUpLine, RiArrowDownLine,
  RiArrowDownSLine, RiArrowRightSLine,
  RiAddLine,
  RiGroupLine,
} from "@remixicon/react";

const REGION_COLORS: Record<string, string> = {
  Capital:            "#3B82F6",
  Oriente:            "#F59E0B",
  Centro:             "#10B981",
  "Centro Occidente": "#F43F5E",
  Occidente:          "#8B5CF6",
  Andes:              "#0891B2",
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

function GaugeChart({ progress }: { progress: number }) {
  const p = Math.min(Math.max(progress, 0), 100);
  const gaugeColor = p >= 80 ? "#16a34a" : p >= 50 ? "#f97316" : "#dc2626";
  const cx = 90, cy = 82, r = 66;
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`;
  const angleMath = (1 - p / 100) * Math.PI;
  const needleLen = r - 16;
  const nx = cx + needleLen * Math.cos(angleMath);
  const ny = cy - needleLen * Math.sin(angleMath);
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      <path d={arcPath} fill="none" stroke="#E5E7EB" strokeWidth={13} strokeLinecap="round" />
      <path
        d={arcPath}
        fill="none"
        stroke={gaugeColor}
        strokeWidth={13}
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={`${p} 100`}
      />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4.5} fill="#374151" />
    </svg>
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
  const [resultsOpen, setResultsOpen] = useState(false);

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
      periodo: formatPeriod(e.periodYear, e.periodMonth),
      "Total Cartera": e.totalCartera,
      Activados: Math.round(c.activadosBase),
      "Clientes con Fritz": Math.round(c.fritzeBase),
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header fila 1: controles */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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

        <div className="flex-1" />

        <Link
          href={`/distribuidor/${slug}/datos/nueva`}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <RiAddLine className="w-4 h-4" />
          Cargar Reporte
        </Link>
      </div>

      {/* Header fila 2: identidad + cartera */}
      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
          style={{ backgroundColor: `${regionColor}20`, color: regionColor }}
        >
          {distributor.name.charAt(0)}
        </div>

        {/* Nombre + email */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 leading-none">{distributor.name}</h1>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium border",
              distributor.status === "active"
                ? "bg-green-50 text-green-700 border-green-100"
                : "bg-gray-100 text-gray-500 border-gray-200"
            )}>
              {distributor.status === "active" ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{distributor.email}</p>
        </div>

        {/* Divisor + Cartera */}
        {entry && (
          <>
            <div className="w-px self-stretch mx-1" style={{ backgroundColor: regionColor, opacity: 0.3 }} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <RiGroupLine className="w-3 h-3" style={{ color: regionColor }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: regionColor }}>Cartera</span>
              </div>
              <span className="text-2xl font-bold text-gray-700 tabular-nums leading-tight">{entry.totalCartera.toLocaleString()}</span>
            </div>
          </>
        )}
      </div>

      {entry && calc ? (
        <>
          {/* Métricas — Gauges + Hbars */}
          {(() => {
            const fmtNum = (v: number) => Math.round(v).toLocaleString();
            const fmtCur = (v: number) =>
              v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000   ? `$${(v / 1_000).toFixed(1)}k`
              : `$${Math.round(v).toLocaleString()}`;

            const gaugeCards = [
              { label: "Activados",         base: calc.activadosBase, meta: calc.activadosMeta, variacion: `${(entry.pctActivacion * 100).toFixed(0)}%`,        fmt: "number"   as const },
              { label: "Clientes con Fritz", base: calc.fritzeBase,   meta: calc.fritzMeta,     variacion: `${(entry.pctClientesFritz * 100).toFixed(0)}%`,     fmt: "number"   as const },
              { label: "Número de SKUs",     base: calc.skusBase,     meta: calc.skusMeta,      variacion: `${(entry.pctIncrementoSkus * 100).toFixed(0)}%`,    fmt: "number"   as const },
              { label: "Cajas Sell Out",     base: calc.cajasBase,    meta: calc.cajasMeta,     variacion: `${(entry.pctIncrementoSellOut * 100).toFixed(0)}%`, fmt: "number"   as const },
            ];

            const hbarCards = [
              { label: "Clientes Prom x Vendedor", base: calc.clientesPorVendedor, meta: calc.clientesPorVendedor * 1.1, fmt: "number"   as const },
              { label: "Cajas Prom x Cliente",     base: calc.cajasPorCliente,     meta: calc.cajasPorCliente * 1.1,     fmt: "number"   as const },
              { label: "Rentabilidad aproximada",  base: calc.rentabilidad,        meta: calc.rentabilidad * 1.15,       fmt: "currency" as const },
              { label: "Rebate Final",             base: calc.rebateTotal,         meta: calc.rebateTotal * 1.1,         fmt: "currency" as const },
            ];

            return (
              <div className="space-y-3">
                {/* Fila 1 — Gauges */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {gaugeCards.map((card) => {
                    const fmtBase = card.fmt === "currency" ? fmtCur(card.base) : fmtNum(card.base);
                    const fmtMeta = card.fmt === "currency" ? fmtCur(card.meta) : fmtNum(card.meta);
                    const progress = Math.min((card.base / card.meta) * 100, 100);
                    const pctCls = progress >= 80 ? "text-green-600" : progress >= 50 ? "text-amber-500" : "text-red-500";
                    return (
                      <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                          <p className="text-sm font-bold text-gray-800 leading-tight">{card.label}</p>
                        </div>
                        <div className="px-3 pt-2 pb-4 flex flex-col items-center gap-1 flex-1">
                          <GaugeChart progress={progress} />
                          <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{fmtBase}</span>
                          {card.variacion && <span className="text-xs text-gray-400 tabular-nums">{card.variacion} variación</span>}
                          <span className="text-xs text-gray-400 mt-0.5 tabular-nums">
                            Meta: <span className="text-gray-600 font-medium">{fmtMeta}</span>
                            {" "}<span className={cn("font-bold", pctCls)}>({progress.toFixed(0)}%)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fila 2 — Horizontal bars */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {hbarCards.map((card) => {
                    const fmtBase = card.fmt === "currency" ? fmtCur(card.base) : fmtNum(card.base);
                    const fmtMeta = card.fmt === "currency" ? fmtCur(card.meta) : fmtNum(card.meta);
                    const progress = Math.min((card.base / card.meta) * 100, 100);
                    const pctCls   = progress >= 80 ? "text-green-600"  : progress >= 50 ? "text-amber-500"  : "text-red-500";
                    const fillHex  = progress >= 80 ? "#16a34a"         : progress >= 50 ? "#f97316"         : "#dc2626";
                    const bgHex    = progress >= 80 ? "#dcfce7"         : progress >= 50 ? "#ffedd5"         : "#fee2e2";
                    const textOnBar = progress > 30;
                    return (
                      <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-none truncate">{card.label}</p>
                          <span className={cn("text-xs font-bold tabular-nums flex-shrink-0", pctCls)}>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="relative h-8 rounded-lg overflow-hidden" style={{ backgroundColor: bgHex }}>
                          <div
                            className="absolute inset-y-0 left-0 rounded-lg"
                            style={{ width: `${progress}%`, backgroundColor: fillHex }}
                          />
                          <div className="absolute inset-0 flex items-center px-2.5">
                            <span className={cn("text-xs font-bold tabular-nums leading-none", textOnBar ? "text-white" : pctCls)}>
                              {fmtBase}
                            </span>
                          </div>
                          <div className="absolute inset-y-1 right-1 w-0.5 rounded-full bg-gray-400/60" />
                        </div>
                        <p className="text-xs text-gray-400 tabular-nums leading-none">
                          Meta: <span className="font-semibold text-gray-600">{fmtMeta}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Evolución + SKUs donut */}
          {chartData.length > 1 && (
            <div className="flex gap-4 items-stretch">
              {/* Evolución — 4/6 */}
              <div className="flex-[4] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-w-0">
                <h2 className="text-base font-semibold text-gray-900 mb-1">Evolución de Cartera y Activaciones</h2>
                <div className="flex items-center gap-4 mt-1 mb-4">
                  {[
                    { label: "Total Cartera",      color: "#94A3B8" },
                    { label: "Activados",          color: regionColor },
                    { label: "Clientes con Fritz", color: "#f97316" },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs text-gray-500">{label}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradActivadosDist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={regionColor} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={regionColor} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradFritzDist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={44}
                      tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", fontSize: 12 }}
                      formatter={(v, name) => [Number(v).toLocaleString(), String(name)]}
                    />
                    <Area type="monotone" dataKey="Total Cartera"      stroke="#94A3B8"   strokeWidth={1.5} fill="none"                      dot={false} isAnimationActive={false} strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="Activados"          stroke={regionColor} strokeWidth={2}  fill="url(#gradActivadosDist)"   dot={false} isAnimationActive={false} />
                    <Area type="monotone" dataKey="Clientes con Fritz" stroke="#f97316"   strokeWidth={2}   fill="url(#gradFritzDist)"         dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* SKUs por Categoría — 2/6 */}
              {entry && (() => {
                const SKU_CATS = [
                  { name: "Salsas y aderezos", weight: 22 },
                  { name: "BBQ",               weight: 13 },
                  { name: "Salsas líquidas",   weight: 17 },
                  { name: "Picantes y ajíes",  weight: 10 },
                  { name: "Mayonesas",         weight: 16 },
                  { name: "Mostazas",          weight: 12 },
                ];
                const CAT_COLORS = ["#0466C8","#f97316","#16a34a","#a855f7","#e11d48","#0891b2"];
                const totalWeight = SKU_CATS.reduce((s, c) => s + c.weight, 0);
                const totalSkus = entry.totalSkusFritz;
                const pieData = SKU_CATS.map((c) => ({
                  name: c.name,
                  value: Math.round((c.weight / totalWeight) * totalSkus),
                }));
                return (
                  <div className="flex-[2] bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 leading-tight">SKUs por Categoría</h2>
                    <p className="text-xs text-gray-400 mt-0.5 mb-2">{totalSkus} SKUs · {formatPeriod(selectedPeriod.year, selectedPeriod.month)}</p>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height={230}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }}
                            formatter={(v, name) => [v, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Inline legend */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                          <span className="text-[11px] text-gray-500">{d.name}</span>
                          <span className="text-[11px] font-semibold text-gray-700">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Resultados Calculados — collapsible */}
          {(() => {
            const fmtNum = (v: number) => Math.round(v).toLocaleString();
            const fmtCur = (v: number) =>
              v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
              : v >= 1_000   ? `$${(v / 1_000).toFixed(1)}k`
              : `$${Math.round(v).toLocaleString()}`;

            const cards: { label: string; base: number; meta: number; variacion: string | null; fmt: "number" | "currency"; color: string }[] = [
              { label: "Activados",               base: calc.activadosBase,       meta: calc.activadosMeta,           variacion: `${(entry.pctActivacion * 100).toFixed(0)}%`,        fmt: "number",   color: "#3B82F6" },
              { label: "Clientes con Fritz",       base: calc.fritzeBase,          meta: calc.fritzMeta,               variacion: `${(entry.pctClientesFritz * 100).toFixed(0)}%`,     fmt: "number",   color: "#7C3AED" },
              { label: "Número de SKUs",           base: calc.skusBase,            meta: calc.skusMeta,                variacion: `${(entry.pctIncrementoSkus * 100).toFixed(0)}%`,    fmt: "number",   color: "#DC2626" },
              { label: "Cajas Sell Out",           base: calc.cajasBase,           meta: calc.cajasMeta,               variacion: `${(entry.pctIncrementoSellOut * 100).toFixed(0)}%`, fmt: "number",   color: "#059669" },
              { label: "Clientes Prom x Vendedor", base: calc.clientesPorVendedor, meta: calc.clientesPorVendedor*1.1, variacion: null,                                                fmt: "number",   color: "#D97706" },
              { label: "Cajas Prom x Cliente",     base: calc.cajasPorCliente,     meta: calc.cajasPorCliente*1.1,     variacion: null,                                                fmt: "number",   color: "#D97706" },
              { label: "Rentabilidad aproximada",  base: calc.rentabilidad,        meta: calc.rentabilidad*1.15,       variacion: null,                                                fmt: "currency", color: "#0891B2" },
              { label: "Rebate Final",             base: calc.rebateTotal,         meta: calc.rebateTotal*1.1,         variacion: null,                                                fmt: "currency", color: "#0891B2" },
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
                      {formatPeriod(selectedPeriod.year, selectedPeriod.month)}
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
