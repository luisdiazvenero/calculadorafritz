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
  RiArrowDownSLine, RiArrowRightSLine, RiArrowUpSLine, RiArrowLeftLine,
  RiAddLine,
  RiGroupLine,
  RiSearchLine,
  RiShareBoxLine,
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

  const [skuSearch,     setSkuSearch]     = useState("");
  const [skuCatFilter,  setSkuCatFilter]  = useState("all");
  const [skuPresFilter, setSkuPresFilter] = useState("all");
  const [skuTamFilter,  setSkuTamFilter]  = useState("all");
  const [skuPage,       setSkuPage]       = useState(1);
  const [skuSortKey,    setSkuSortKey]    = useState<"sku" | "categoria" | "presentacion" | "tamano">("sku");
  const [skuSortDir,    setSkuSortDir]    = useState<"asc" | "desc">("asc");
  const [skuPageSize,   setSkuPageSize]   = useState(12);
  const [skuOpen,       setSkuOpen]       = useState(true);

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
              { label: "# de Vendedores",          base: entry.numVendedores,      meta: Math.round(entry.numVendedores * (1 + entry.pctIncrementoVendedores)), fmt: "number" as const },
            ];

            return (
              <div className="space-y-3">
                {/* Fila 1 — Gauges */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {gaugeCards.map((card) => {
                    const fmtBase = fmtNum(card.base);
                    const fmtMeta = fmtNum(card.meta);
                    const progress = Math.min((card.base / card.meta) * 100, 100);
                    const pillCls =
                      progress >= 80 ? "bg-green-100 text-green-700"
                      : progress >= 50 ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700";
                    return (
                      <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                          <p className="text-sm font-bold text-gray-800 leading-tight">{card.label}</p>
                        </div>
                        <div className="px-3 pt-2 pb-4 flex flex-col items-center gap-1.5 flex-1">
                          <GaugeChart progress={progress} />
                          <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{fmtBase}</span>
                          {card.variacion && <span className="text-xs text-gray-400 tabular-nums">{card.variacion} variación</span>}
                          <span className={cn("px-3 py-1 rounded-full text-sm font-bold tabular-nums", pillCls)}>
                            {progress.toFixed(0)}% de la meta
                          </span>
                          <span className="text-xs text-gray-400 tabular-nums">
                            Meta: <span className="font-semibold text-gray-600">{fmtMeta}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Fila 2 — Horizontal bars */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
            <div className="grid grid-cols-3 gap-3 items-stretch">
              {/* Evolución — 2/3 */}
              <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-w-0">
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

              {/* SKUs por Categoría — 1/3 */}
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
                  <div className="col-span-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col min-w-0">
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

          {/* SKUs Simulados por Categoría */}
          {(() => {
            const CAT_COLORS: Record<string, string> = {
              "Salsas y aderezos": "#0466C8",
              "BBQ":               "#f97316",
              "Salsas líquidas":   "#16a34a",
              "Picantes y ajíes":  "#a855f7",
              "Mayonesas":         "#e11d48",
              "Mostazas":          "#0891b2",
            };
            const SKU_DATA: { sku: string; categoria: string; presentacion: string; tamano: string; tamanoG: number }[] = [
              { sku: "Salsa Sabor a Tocineta",                 categoria: "Salsas y aderezos", presentacion: "Doypack",     tamano: "145 g",         tamanoG: 145   },
              { sku: "Salsa Sabor a Tocineta",                 categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",         tamanoG: 240   },
              { sku: "Salsa Sabor a Queso Cheddar",            categoria: "Salsas y aderezos", presentacion: "Doypack",     tamano: "145 g",         tamanoG: 145   },
              { sku: "Salsa Sabor a Queso Cheddar Estándar",   categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",         tamanoG: 240   },
              { sku: "Salsa Sabor a Queso Cheddar Homotético", categoria: "Salsas y aderezos", presentacion: "Homotético",  tamano: "740 g",         tamanoG: 740   },
              { sku: "Salsa Sabor a Queso Cheddar",            categoria: "Salsas y aderezos", presentacion: "Galón",       tamano: "3.3 kg",        tamanoG: 3300  },
              { sku: "Salsa Sabor a Maíz",                     categoria: "Salsas y aderezos", presentacion: "Doypack",     tamano: "145 g",         tamanoG: 145   },
              { sku: "Salsa Sabor a Maíz Estándar",            categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",         tamanoG: 240   },
              { sku: "Salsa Sabor a Maíz",                     categoria: "Salsas y aderezos", presentacion: "Homotético",  tamano: "740 g",         tamanoG: 740   },
              { sku: "Salsa Tártara Estándar",                 categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",         tamanoG: 240   },
              { sku: "Salsa Tártara",                          categoria: "Salsas y aderezos", presentacion: "Homotético",  tamano: "740 g",         tamanoG: 740   },
              { sku: "Salsa BBQ Estándar",  categoria: "BBQ", presentacion: "PET",         tamano: "290 g",  tamanoG: 290  },
              { sku: "BBQ Homotético",      categoria: "BBQ", presentacion: "Homotético",  tamano: "930 g",  tamanoG: 930  },
              { sku: "BBQ Medio Galón",     categoria: "BBQ", presentacion: "Medio Galón", tamano: "2 kg",   tamanoG: 2000 },
              { sku: "BBQ Galón",           categoria: "BBQ", presentacion: "Galón",       tamano: "4.1 kg", tamanoG: 4100 },
              { sku: "Salsa de Ajo",        categoria: "Salsas líquidas", presentacion: "Frasco", tamano: "150 cc", tamanoG: 150  },
              { sku: "Salsa de Ajo",        categoria: "Salsas líquidas", presentacion: "Frasco", tamano: "300 cc", tamanoG: 300  },
              { sku: "Salsa de Ajo Galón",  categoria: "Salsas líquidas", presentacion: "Galón",  tamano: "3.6 L",  tamanoG: 3600 },
              { sku: "Salsa Inglesa",       categoria: "Salsas líquidas", presentacion: "Frasco", tamano: "150 cc", tamanoG: 150  },
              { sku: "Salsa Inglesa",       categoria: "Salsas líquidas", presentacion: "Frasco", tamano: "300 cc", tamanoG: 300  },
              { sku: "Salsa Inglesa Galón", categoria: "Salsas líquidas", presentacion: "Galón",  tamano: "3.6 L",  tamanoG: 3600 },
              { sku: "Salsa de Soya",       categoria: "Salsas líquidas", presentacion: "Frasco", tamano: "150 cc", tamanoG: 150  },
              { sku: "Salsa de Soya Galón", categoria: "Salsas líquidas", presentacion: "Galón",  tamano: "3.6 L",  tamanoG: 3600 },
              { sku: "Salsa Picante Homotético",              categoria: "Picantes y ajíes", presentacion: "Homotético", tamano: "790 g", tamanoG: 790 },
              { sku: "Salsa Ají Picante Estándar",            categoria: "Picantes y ajíes", presentacion: "PET",        tamano: "250 g", tamanoG: 250 },
              { sku: "Salsa de Ají Dulce Estándar",           categoria: "Picantes y ajíes", presentacion: "PET",        tamano: "250 g", tamanoG: 250 },
              { sku: "Salsa Picantico Criollo",               categoria: "Picantes y ajíes", presentacion: "PET",        tamano: "310 g", tamanoG: 310 },
              { sku: "Picantina: Salsa con Tomate + Picante", categoria: "Picantes y ajíes", presentacion: "PET",        tamano: "260 g", tamanoG: 260 },
              { sku: "Mayonesa Estándar",            categoria: "Mayonesas", presentacion: "PET",         tamano: "240 g",         tamanoG: 240  },
              { sku: "Mayonesa Homotético",          categoria: "Mayonesas", presentacion: "Homotético",  tamano: "750 g",         tamanoG: 750  },
              { sku: "Mayonesa Kilo",                categoria: "Mayonesas", presentacion: "PET",         tamano: "850 g",         tamanoG: 850  },
              { sku: "Mayonesa Medio Galón",         categoria: "Mayonesas", presentacion: "Medio Galón", tamano: "1.6 kg",        tamanoG: 1600 },
              { sku: "Mayonesa Galón",               categoria: "Mayonesas", presentacion: "Galón",       tamano: "3.35 kg",       tamanoG: 3350 },
              { sku: "Mayonesa (frasco azul)",        categoria: "Mayonesas", presentacion: "Frasco",      tamano: "375 g",         tamanoG: 375  },
              { sku: "Doypack Preparado de Mayonesa", categoria: "Mayonesas", presentacion: "Doypack",     tamano: "150 g / 930 g", tamanoG: 150  },
              { sku: "Mayo Deli",                    categoria: "Mayonesas", presentacion: "Galón",       tamano: "3.1 kg",        tamanoG: 3100 },
              { sku: "Mostaza Estándar",          categoria: "Mostazas", presentacion: "PET",         tamano: "250 g",         tamanoG: 250  },
              { sku: "Mostaza Kilo",              categoria: "Mostazas", presentacion: "PET",         tamano: "1 kg",          tamanoG: 1000 },
              { sku: "Mostaza Medio Galón",       categoria: "Mostazas", presentacion: "Medio Galón", tamano: "1.8 kg",        tamanoG: 1800 },
              { sku: "Mostaza Galón",             categoria: "Mostazas", presentacion: "Galón",       tamano: "3.6 kg",        tamanoG: 3600 },
              { sku: "Aderezo Mostaza (Doypack)", categoria: "Mostazas", presentacion: "Doypack",     tamano: "160 g / 930 g", tamanoG: 160  },
              { sku: "Aderezo de Mostaza Bolsa",  categoria: "Mostazas", presentacion: "Bolsa",       tamano: "Galón",         tamanoG: 3600 },
            ];

            const PRESENTACIONES = ["Doypack", "PET", "Homotético", "Galón", "Medio Galón", "Frasco", "Bolsa"];
            const TAMANO_RANGES = [
              { label: "Individual (≤ 300 g/cc)",  value: "individual" },
              { label: "Estándar (301 g – 999 g)", value: "estandar"   },
              { label: "Grande (≥ 1 kg)",           value: "grande"     },
            ];
            const tamanoMatch = (g: number, f: string) => {
              if (f === "individual") return g <= 300;
              if (f === "estandar")  return g > 300 && g < 1000;
              if (f === "grande")    return g >= 1000;
              return true;
            };

            const skuFiltered = SKU_DATA.filter((r) => {
              const q = skuSearch.toLowerCase();
              return (
                (!q || r.sku.toLowerCase().includes(q)) &&
                (skuCatFilter  === "all" || r.categoria    === skuCatFilter)  &&
                (skuPresFilter === "all" || r.presentacion === skuPresFilter) &&
                (skuTamFilter  === "all" || tamanoMatch(r.tamanoG, skuTamFilter))
              );
            });

            const skuSorted = [...skuFiltered].sort((a, b) => {
              const va = a[skuSortKey];
              const vb = b[skuSortKey];
              if (va < vb) return skuSortDir === "asc" ? -1 :  1;
              if (va > vb) return skuSortDir === "asc" ?  1 : -1;
              return 0;
            });

            const skuTotalPages = Math.max(1, Math.ceil(skuSorted.length / skuPageSize));
            const skuSafePage   = Math.min(skuPage, skuTotalPages);
            const skuPaginated  = skuSorted.slice((skuSafePage - 1) * skuPageSize, skuSafePage * skuPageSize);

            const skuPageRange: (number | "...")[] = [];
            let skuLast = 0;
            for (let i = 1; i <= skuTotalPages; i++) {
              if (i === 1 || i === skuTotalPages || (i >= skuSafePage - 1 && i <= skuSafePage + 1)) {
                if (skuLast && i - skuLast > 1) skuPageRange.push("...");
                skuPageRange.push(i);
                skuLast = i;
              }
            }

            const toggleSkuSort = (key: typeof skuSortKey) => {
              if (skuSortKey === key) setSkuSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else { setSkuSortKey(key); setSkuSortDir("asc"); }
            };

            function SkuSortIcon({ col }: { col: typeof skuSortKey }) {
              if (skuSortKey !== col)
                return (
                  <span className="inline-flex flex-col ml-1.5">
                    <RiArrowUpSLine className="w-3.5 h-3.5 -mb-0.5" style={{ color: "#a3a3a3" }} />
                    <RiArrowDownSLine className="w-3.5 h-3.5" style={{ color: "#a3a3a3" }} />
                  </span>
                );
              return skuSortDir === "asc"
                ? <RiArrowUpSLine className="w-4 h-4 text-gray-900 ml-1.5" />
                : <RiArrowDownSLine className="w-4 h-4 text-gray-900 ml-1.5" />;
            }

            function SkuSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
              return (
                <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300 transition-colors">
                  <select
                    value={value}
                    onChange={(e) => { onChange(e.target.value); setSkuPage(1); }}
                    style={{ appearance: "none" }}
                    className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-5"
                  >
                    {children}
                  </select>
                  <RiArrowDownSLine className="w-4 h-4 text-gray-400 pointer-events-none absolute right-2" />
                </div>
              );
            }

            return (
              <>
                <div className="mt-14 mb-2 pl-6 pr-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">SKUs Simulados por Categoría</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Portafolio Fritz activo</p>
                  </div>
                  <button onClick={() => setSkuOpen((o) => !o)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer select-none">
                    {skuOpen ? "Colapsar" : "Expandir"}
                    {skuOpen ? <RiArrowDownSLine className="w-4 h-4" /> : <RiArrowRightSLine className="w-4 h-4" />}
                  </button>
                </div>

                {skuOpen && <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", skuTotalPages <= 1 && "mb-14")}>
                  <div className="px-6 py-3.5 flex items-center gap-3 border-b border-gray-100 flex-wrap">
                    <div className="relative w-60">
                      <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar SKU..."
                        value={skuSearch}
                        onChange={(e) => { setSkuSearch(e.target.value); setSkuPage(1); }}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      />
                    </div>
                    <SkuSelect value={skuCatFilter} onChange={setSkuCatFilter}>
                      <option value="all">Categoría</option>
                      {Object.keys(CAT_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                    </SkuSelect>
                    <SkuSelect value={skuPresFilter} onChange={setSkuPresFilter}>
                      <option value="all">Presentación</option>
                      {PRESENTACIONES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </SkuSelect>
                    <SkuSelect value={skuTamFilter} onChange={setSkuTamFilter}>
                      <option value="all">Tamaño</option>
                      {TAMANO_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </SkuSelect>
                    <span className="ml-auto text-sm text-gray-400">{skuSorted.length} registros</span>
                    <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white hover:border-gray-300 hover:text-gray-900 transition-colors">
                      <RiShareBoxLine className="w-4 h-4" />
                      Exportar
                    </button>
                  </div>

                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }}>
                      <tr className="border-b border-gray-200">
                        {(["sku", "categoria", "presentacion", "tamano"] as const).map((col) => (
                          <th
                            key={col}
                            onClick={() => toggleSkuSort(col)}
                            style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }}
                            className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left"
                          >
                            <span className="inline-flex items-center">
                              {{ sku: "SKU", categoria: "Categoría", presentacion: "Presentación", tamano: "Tamaño" }[col]}
                              <SkuSortIcon col={col} />
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {skuPaginated.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-16 text-center text-sm text-gray-400">No hay SKUs con esos filtros.</td>
                        </tr>
                      ) : skuPaginated.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-6 py-5 font-medium whitespace-nowrap" style={{ color: "#171717" }}>{row.sku}</td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[row.categoria] ?? "#94A3B8" }} />
                              <span className="text-sm text-gray-600">{row.categoria}</span>
                            </span>
                          </td>
                          <td className="px-6 py-5 text-gray-600 whitespace-nowrap">{row.presentacion}</td>
                          <td className="px-6 py-5 text-gray-600 tabular-nums whitespace-nowrap">{row.tamano}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}

                {skuOpen && skuTotalPages > 1 && (
                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-14 pl-6">
                    <span className="whitespace-nowrap">Página {skuSafePage} de {skuTotalPages}</span>
                    <div className="flex-1 flex items-center justify-center gap-1">
                      <button onClick={() => setSkuPage(1)} disabled={skuSafePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <span className="text-xs font-bold">«</span>
                      </button>
                      <button onClick={() => setSkuPage((p) => Math.max(1, p - 1))} disabled={skuSafePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <RiArrowLeftLine className="w-4 h-4" />
                      </button>
                      {skuPageRange.map((n, idx) =>
                        n === "..." ? (
                          <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
                        ) : (
                          <button key={n} onClick={() => setSkuPage(n as number)}
                            className={cn("min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors",
                              skuSafePage === n ? "bg-gray-100 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-500")}>
                            {n}
                          </button>
                        )
                      )}
                      <button onClick={() => setSkuPage((p) => Math.min(skuTotalPages, p + 1))} disabled={skuSafePage === skuTotalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <RiArrowRightSLine className="w-4 h-4" />
                      </button>
                      <button onClick={() => setSkuPage(skuTotalPages)} disabled={skuSafePage === skuTotalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <span className="text-xs font-bold">»</span>
                      </button>
                    </div>
                    <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors">
                      <select value={skuPageSize} onChange={(e) => { setSkuPageSize(Number(e.target.value)); setSkuPage(1); }}
                        style={{ appearance: "none" }} className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-5">
                        {[10, 12, 25, 50].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
                      </select>
                      <RiArrowDownSLine className="w-4 h-4 text-gray-400 pointer-events-none absolute right-2" />
                    </div>
                  </div>
                )}
              </>
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
