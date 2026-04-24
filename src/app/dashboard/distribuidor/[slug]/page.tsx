"use client";
import { use, useState, useEffect } from "react";
import { calcular, formatPeriod, delta } from "@/lib/mock-data";
import type { Distributor, Region, MonthlyEntry } from "@/lib/mock-data";
import { getDistributorBySlug, getRegions, getEntriesByDistributor } from "@/lib/db";
import { deleteMonthlyEntry } from "@/lib/actions";
import { ALL_PERIOD_KEYS, defaultPeriodKey, defaultPrevKey } from "@/lib/periods";
import { cn } from "@/utils/cn";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiArrowUpSLine,
  RiEditLine,
  RiCalculatorLine,
  RiGroupLine,
  RiSearchLine,
  RiCalendarLine,
  RiShareBoxLine,
} from "@remixicon/react";

const REGION_COLORS: Record<string, string> = {
  Capital:           "#3B82F6",
  Oriente:           "#F59E0B",
  Centro:            "#10B981",
  "Centro Occidente":"#F43F5E",
  Occidente:         "#8B5CF6",
  Andes:             "#0891B2",
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

export default function DistribuidorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [latestKey, setLatestKey] = useState(defaultPeriodKey());
  const [prevKey,   setPrevKey]   = useState(defaultPrevKey());
  const [prevResultsOpen, setPrevResultsOpen] = useState(true);

  type SortKey = "period" | "cartera" | "activados" | "pctActivacion" | "cajas" | "skus" | "vendedores" | "rentabilidad";
  type SortDir = "asc" | "desc";
  const [histSearch,       setHistSearch]       = useState("");
  const [histPeriodFilter, setHistPeriodFilter] = useState<"all" | "3m" | "6m" | "1y">("all");
  const [histSortKey,      setHistSortKey]      = useState<SortKey>("period");
  const [histSortDir,      setHistSortDir]      = useState<SortDir>("desc");
  const [histPage,         setHistPage]         = useState(1);
  const [histPageSize,     setHistPageSize]     = useState(10);

  const [skuOpen,  setSkuOpen]  = useState(true);
  const [histOpen, setHistOpen] = useState(true);

  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [skuSearch,     setSkuSearch]     = useState("");
  const [skuCatFilter,  setSkuCatFilter]  = useState("all");
  const [skuPresFilter, setSkuPresFilter] = useState("all");
  const [skuTamFilter,  setSkuTamFilter]  = useState("all");
  const [skuPage,       setSkuPage]       = useState(1);
  const [skuSortKey,    setSkuSortKey]    = useState<"sku" | "categoria" | "presentacion" | "tamano">("sku");
  const [skuSortDir,    setSkuSortDir]    = useState<"asc" | "desc">("asc");
  const [skuPageSize,   setSkuPageSize]   = useState(12);

  const PERIOD_OPTIONS = [
    { value: "all", label: "Todos los períodos" },
    { value: "3m",  label: "Últimos 3 meses" },
    { value: "6m",  label: "Últimos 6 meses" },
    { value: "1y",  label: "Último año" },
  ] as const;

  useEffect(() => {
    Promise.all([getDistributorBySlug(slug), getRegions()]).then(([d, regions]) => {
      setDistributor(d);
      if (d) {
        setRegion(regions.find((r) => r.id === d.regionId) ?? null);
        getEntriesByDistributor(d.id).then((e) => {
          setEntries(e);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, [slug]);

  const parsePeriod = (key: string) => { const [y,m] = key.split("-").map(Number); return { year: y, month: m }; };
  const selectedPeriod = parsePeriod(latestKey);
  const prevPeriodSel  = parsePeriod(prevKey);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="p-6 text-center text-gray-500">
        Distribuidor no encontrado.{" "}
        <Link href="/dashboard" className="text-primary-600 hover:underline">Volver</Link>
      </div>
    );
  }

  const regionColor = REGION_COLORS[region?.name ?? ""] ?? "#0466C8";

  // entries from DB are newest-first; sort ascending for chart
  const allEntries = [...entries].sort(
    (a, b) => a.periodYear * 100 + a.periodMonth - (b.periodYear * 100 + b.periodMonth)
  );

  const entry = entries.find(
    (m) => m.periodYear === selectedPeriod.year && m.periodMonth === selectedPeriod.month
  ) ?? null;
  const prevEntry = entries.find(
    (m) => m.periodYear === prevPeriodSel.year && m.periodMonth === prevPeriodSel.month
  ) ?? null;

  const calc = entry ? calcular(entry) : null;

  const chartData = allEntries.map((e) => {
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
      {/* Header fila 1: breadcrumb + controles */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/dashboard"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <RiArrowLeftLine className="w-3.5 h-3.5" />
            Vista Global
          </Link>
          {region && (
            <>
              <span className="text-gray-300">/</span>
              <Link href={`/dashboard/region/${region.slug}`}
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                {region.name}
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Período</span>
            <select value={latestKey} onChange={(e) => setLatestKey(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer">
              {ALL_PERIOD_KEYS.slice().reverse().map((k) => {
                const { year, month } = parsePeriod(k);
                return <option key={k} value={k}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>
          <span className="text-xs text-gray-400">vs</span>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Comparar con</span>
            <select value={prevKey} onChange={(e) => setPrevKey(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer">
              {ALL_PERIOD_KEYS.slice().reverse().map((k) => {
                const { year, month } = parsePeriod(k);
                return <option key={k} value={k}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>
          <Link href={`/dashboard/distribuidor/${slug}/calculadora`}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-150 shadow-sm">
            <RiCalculatorLine className="w-4 h-4" />
            Calculadora
          </Link>
          <Link href={`/dashboard/distribuidor/${slug}/cargar`}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-150">
            <RiEditLine className="w-4 h-4" />
            Cargar datos
          </Link>
        </div>
      </div>

      {/* Header fila 2: identidad + cartera */}
      <div className="flex items-center gap-5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
          style={{ backgroundColor: `${regionColor}20`, color: regionColor }}
        >
          {distributor.name.charAt(0)}
        </div>

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
          {/* Resultados Calculados — gauge */}
          {[{ calcData: calc, entryData: entry, period: selectedPeriod }].map(({ calcData, entryData }) => {
            const fmtNum = (v: number) => Math.round(v).toLocaleString();
            const cards = [
              { label: "Activados",               base: calcData.activadosBase,       meta: calcData.activadosMeta,           variacion: `${(entryData.pctActivacion * 100).toFixed(0)}%`,        hbar: false },
              { label: "Clientes con Fritz",       base: calcData.fritzeBase,          meta: calcData.fritzMeta,               variacion: `${(entryData.pctClientesFritz * 100).toFixed(0)}%`,     hbar: false },
              { label: "Número de SKUs",           base: calcData.skusBase,            meta: calcData.skusMeta,                variacion: `${(entryData.pctIncrementoSkus * 100).toFixed(0)}%`,    hbar: false },
              { label: "Cajas Sell Out",           base: calcData.cajasBase,           meta: calcData.cajasMeta,               variacion: `${(entryData.pctIncrementoSellOut * 100).toFixed(0)}%`, hbar: false },
              { label: "Clientes Prom x Vendedor", base: calcData.clientesPorVendedor, meta: calcData.clientesPorVendedor*1.1, variacion: null,                                                    hbar: true  },
              { label: "Cajas Prom x Cliente",     base: calcData.cajasPorCliente,     meta: calcData.cajasPorCliente*1.1,     variacion: null,                                                    hbar: true  },
              { label: "# de Vendedores",          base: entryData.numVendedores,      meta: Math.round(entryData.numVendedores * (1 + entryData.pctIncrementoVendedores)), variacion: null, hbar: true },
            ];
            const gaugeCards = cards.filter((c) => !c.hbar);
            const hbarCards  = cards.filter((c) =>  c.hbar);
            return (
              <div key="gauge-resultados">
                <div className="space-y-3">
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
                              {progress.toFixed(0)}%
                            </span>
                            <span className="text-xs text-gray-400 tabular-nums">
                              Meta: <span className="font-semibold text-gray-600">{fmtMeta}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {hbarCards.map((card) => {
                      const fmtBase = fmtNum(card.base);
                      const fmtMeta = fmtNum(card.meta);
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
              </div>
            );
          })}

          {/* Trend chart */}
          {chartData.length > 1 && (
            <div className="grid grid-cols-3 gap-3 items-stretch">
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
                      <linearGradient id="gradActivados" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={regionColor} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={regionColor} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradFritz" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f97316" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={44}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", fontSize: 12 }}
                      formatter={(v, name) => [Number(v).toLocaleString(), String(name)]}
                    />
                    <Area type="monotone" dataKey="Total Cartera"      stroke="#94A3B8" strokeWidth={1.5} fill="none"                dot={false} isAnimationActive={false} strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="Activados"          stroke={regionColor} strokeWidth={2} fill="url(#gradActivados)" dot={false} isAnimationActive={false} />
                    <Area type="monotone" dataKey="Clientes con Fritz" stroke="#f97316" strokeWidth={2}    fill="url(#gradFritz)"      dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {(() => {
                const SKU_CATS = [
                  { name: "Salsas y aderezos",   weight: 22 },
                  { name: "BBQ",                 weight: 13 },
                  { name: "Salsas líquidas",     weight: 17 },
                  { name: "Picantes y ajíes",    weight: 10 },
                  { name: "Mayonesas",           weight: 16 },
                  { name: "Mostazas",            weight: 12 },
                ];
                const CAT_COLORS = ["#0466C8","#f97316","#16a34a","#a855f7","#e11d48","#0891b2","#ca8a04","#64748b","#059669"];
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
                            contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 11 }}
                            formatter={(v, name) => [`${v} SKUs`, String(name)]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3">
                      {pieData.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                          <span className="text-[10px] text-gray-500 whitespace-nowrap">{item.name}</span>
                          <span className="text-[10px] font-bold text-gray-700 tabular-nums">{item.value}</span>
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
              { sku: "Salsa Sabor a Tocineta",                 categoria: "Salsas y aderezos", presentacion: "Doypack",     tamano: "145 g",        tamanoG: 145   },
              { sku: "Salsa Sabor a Tocineta",                 categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",        tamanoG: 240   },
              { sku: "Salsa Sabor a Queso Cheddar",            categoria: "Salsas y aderezos", presentacion: "Doypack",     tamano: "145 g",        tamanoG: 145   },
              { sku: "Salsa Sabor a Queso Cheddar Estándar",   categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",        tamanoG: 240   },
              { sku: "Salsa Sabor a Queso Cheddar Homotético", categoria: "Salsas y aderezos", presentacion: "Homotético",  tamano: "740 g",        tamanoG: 740   },
              { sku: "Salsa Sabor a Queso Cheddar",            categoria: "Salsas y aderezos", presentacion: "Galón",       tamano: "3.3 kg",       tamanoG: 3300  },
              { sku: "Salsa Sabor a Maíz",                     categoria: "Salsas y aderezos", presentacion: "Doypack",     tamano: "145 g",        tamanoG: 145   },
              { sku: "Salsa Sabor a Maíz Estándar",            categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",        tamanoG: 240   },
              { sku: "Salsa Sabor a Maíz",                     categoria: "Salsas y aderezos", presentacion: "Homotético",  tamano: "740 g",        tamanoG: 740   },
              { sku: "Salsa Tártara Estándar",                 categoria: "Salsas y aderezos", presentacion: "PET",         tamano: "240 g",        tamanoG: 240   },
              { sku: "Salsa Tártara",                          categoria: "Salsas y aderezos", presentacion: "Homotético",  tamano: "740 g",        tamanoG: 740   },
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
              { sku: "Mayonesa Estándar",             categoria: "Mayonesas", presentacion: "PET",         tamano: "240 g",        tamanoG: 240  },
              { sku: "Mayonesa Homotético",           categoria: "Mayonesas", presentacion: "Homotético",  tamano: "750 g",        tamanoG: 750  },
              { sku: "Mayonesa Kilo",                 categoria: "Mayonesas", presentacion: "PET",         tamano: "850 g",        tamanoG: 850  },
              { sku: "Mayonesa Medio Galón",          categoria: "Mayonesas", presentacion: "Medio Galón", tamano: "1.6 kg",       tamanoG: 1600 },
              { sku: "Mayonesa Galón",                categoria: "Mayonesas", presentacion: "Galón",       tamano: "3.35 kg",      tamanoG: 3350 },
              { sku: "Mayonesa (frasco azul)",         categoria: "Mayonesas", presentacion: "Frasco",      tamano: "375 g",        tamanoG: 375  },
              { sku: "Doypack Preparado de Mayonesa",  categoria: "Mayonesas", presentacion: "Doypack",     tamano: "150 g / 930 g",tamanoG: 150  },
              { sku: "Mayo Deli",                     categoria: "Mayonesas", presentacion: "Galón",       tamano: "3.1 kg",       tamanoG: 3100 },
              { sku: "Mostaza Estándar",          categoria: "Mostazas", presentacion: "PET",         tamano: "250 g",        tamanoG: 250  },
              { sku: "Mostaza Kilo",              categoria: "Mostazas", presentacion: "PET",         tamano: "1 kg",         tamanoG: 1000 },
              { sku: "Mostaza Medio Galón",       categoria: "Mostazas", presentacion: "Medio Galón", tamano: "1.8 kg",       tamanoG: 1800 },
              { sku: "Mostaza Galón",             categoria: "Mostazas", presentacion: "Galón",       tamano: "3.6 kg",       tamanoG: 3600 },
              { sku: "Aderezo Mostaza (Doypack)", categoria: "Mostazas", presentacion: "Doypack",     tamano: "160 g / 930 g",tamanoG: 160  },
              { sku: "Aderezo de Mostaza Bolsa",  categoria: "Mostazas", presentacion: "Bolsa",       tamano: "Galón",        tamanoG: 3600 },
            ];

            const PRESENTACIONES = ["Doypack", "PET", "Homotético", "Galón", "Medio Galón", "Frasco", "Bolsa"];
            const TAMANO_RANGES = [
              { label: "Individual (≤ 300 g/cc)",   value: "individual" },
              { label: "Estándar (301 g – 999 g)",  value: "estandar"   },
              { label: "Grande (≥ 1 kg)",            value: "grande"     },
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

          {/* Historical table */}
          {(() => {
            const histRows = allEntries.map((e) => {
              const c = calcular(e);
              const uploadMonth = e.periodMonth === 12 ? 1 : e.periodMonth + 1;
              const uploadYear  = e.periodMonth === 12 ? e.periodYear + 1 : e.periodYear;
              const uploadDay   = 3 + ((e.distributorId.charCodeAt(0) + e.periodMonth * 7) % 12);
              const uploadDate  = new Date(uploadYear, uploadMonth - 1, uploadDay);
              const uploadLabel = uploadDate.toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" });
              return {
                periodKey:     `${e.periodYear}-${String(e.periodMonth).padStart(2, "0")}`,
                periodLabel:   formatPeriod(e.periodYear, e.periodMonth),
                publicado:     uploadLabel,
                cartera:       e.totalCartera,
                activados:     Math.round(c.activadosBase),
                pctActivacion: e.pctActivacion,
                cajas:         e.cajasPromedio,
                skus:          e.totalSkusFritz,
                vendedores:    e.numVendedores,
                rentabilidad:  Math.round(c.rentabilidad),
              };
            });

            const histFiltered = histRows.filter((r) => {
              const q = histSearch.toLowerCase();
              const now = new Date();
              const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              const cutoffMap = {
                "3m":  toKey(new Date(now.getFullYear(), now.getMonth() - 3,  1)),
                "6m":  toKey(new Date(now.getFullYear(), now.getMonth() - 6,  1)),
                "1y":  toKey(new Date(now.getFullYear(), now.getMonth() - 12, 1)),
                "all": "0000-00",
              };
              return (!q || r.periodLabel.toLowerCase().includes(q)) && r.periodKey >= cutoffMap[histPeriodFilter];
            });

            const histSorted = [...histFiltered].sort((a, b) => {
              let va: number | string, vb: number | string;
              switch (histSortKey) {
                case "period":        va = a.periodKey;     vb = b.periodKey;     break;
                case "cartera":       va = a.cartera;       vb = b.cartera;       break;
                case "activados":     va = a.activados;     vb = b.activados;     break;
                case "pctActivacion": va = a.pctActivacion; vb = b.pctActivacion; break;
                case "cajas":         va = a.cajas;         vb = b.cajas;         break;
                case "skus":          va = a.skus;          vb = b.skus;          break;
                case "vendedores":    va = a.vendedores;    vb = b.vendedores;    break;
                case "rentabilidad":  va = a.rentabilidad;  vb = b.rentabilidad;  break;
                default:              va = a.periodKey;     vb = b.periodKey;
              }
              if (va < vb) return histSortDir === "asc" ? -1 :  1;
              if (va > vb) return histSortDir === "asc" ?  1 : -1;
              return 0;
            });

            const histTotalPages = Math.max(1, Math.ceil(histSorted.length / histPageSize));
            const histSafePage   = Math.min(histPage, histTotalPages);
            const histPaginated  = histSorted.slice((histSafePage - 1) * histPageSize, histSafePage * histPageSize);

            const histPaginationRange: (number | "...")[] = [];
            let last = 0;
            for (let i = 1; i <= histTotalPages; i++) {
              if (i === 1 || i === histTotalPages || (i >= histSafePage - 1 && i <= histSafePage + 1)) {
                if (last && i - last > 1) histPaginationRange.push("...");
                histPaginationRange.push(i);
                last = i;
              }
            }

            const toggleHistSort = (key: SortKey) => {
              if (histSortKey === key) setHistSortDir((d) => (d === "asc" ? "desc" : "asc"));
              else { setHistSortKey(key); setHistSortDir("desc"); }
            };

            function SortIcon({ col }: { col: SortKey }) {
              if (histSortKey !== col)
                return (
                  <span className="inline-flex flex-col ml-1.5">
                    <RiArrowUpSLine className="w-3.5 h-3.5 -mb-0.5" style={{ color: "#a3a3a3" }} />
                    <RiArrowDownSLine className="w-3.5 h-3.5" style={{ color: "#a3a3a3" }} />
                  </span>
                );
              return histSortDir === "asc"
                ? <RiArrowUpSLine className="w-4 h-4 text-gray-900 ml-1.5" />
                : <RiArrowDownSLine className="w-4 h-4 text-gray-900 ml-1.5" />;
            }

            return (
              <>
                <div className="mt-14 mb-2 pl-6 pr-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Historial de Reportes</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Evolución mensual del distribuidor</p>
                  </div>
                  <button onClick={() => setHistOpen((o) => !o)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer select-none">
                    {histOpen ? "Colapsar" : "Expandir"}
                    {histOpen ? <RiArrowDownSLine className="w-4 h-4" /> : <RiArrowRightSLine className="w-4 h-4" />}
                  </button>
                </div>
                {histOpen && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-3.5 flex items-center gap-3 border-b border-gray-100 flex-wrap">
                    <div className="relative w-60">
                      <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar período..."
                        value={histSearch}
                        onChange={(e) => setHistSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                      />
                    </div>
                    <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300 transition-colors">
                      <select
                        value={histPeriodFilter}
                        onChange={(e) => setHistPeriodFilter(e.target.value as typeof histPeriodFilter)}
                        style={{ appearance: "none" }}
                        className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-5"
                      >
                        {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <RiArrowDownSLine className="w-4 h-4 text-gray-400 pointer-events-none absolute right-2" />
                    </div>
                    {histFiltered.length > 0 && (() => {
                      const keys = histFiltered.map((r) => r.periodKey).sort();
                      const from = keys[0].replace("-", "/");
                      const to   = keys[keys.length - 1].replace("-", "/");
                      return (
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white">
                          <RiCalendarLine className="w-4 h-4 text-gray-400" />
                          <span>{from === to ? from : `${from} — ${to}`}</span>
                        </div>
                      );
                    })()}
                    <span className="ml-auto text-sm text-gray-400">{histSorted.length} registros</span>
                    <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white hover:border-gray-300 hover:text-gray-900 transition-colors">
                      <RiShareBoxLine className="w-4 h-4" />
                      Exportar
                    </button>
                  </div>

                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }}>
                      <tr className="border-b border-gray-200">
                        <th onClick={() => toggleHistSort("period")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                          <span className="inline-flex items-center">Período<SortIcon col="period" /></span>
                        </th>
                        <th style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize whitespace-nowrap text-left">Publicado</th>
                        <th onClick={() => toggleHistSort("cartera")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                          <span className="inline-flex items-center">Cartera<SortIcon col="cartera" /></span>
                        </th>
                        <th onClick={() => toggleHistSort("pctActivacion")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                          <span className="inline-flex items-center">% Activ.<SortIcon col="pctActivacion" /></span>
                        </th>
                        <th onClick={() => toggleHistSort("activados")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                          <span className="inline-flex items-center">Activados<SortIcon col="activados" /></span>
                        </th>
                        <th onClick={() => toggleHistSort("cajas")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                          <span className="inline-flex items-center">Cajas SO<SortIcon col="cajas" /></span>
                        </th>
                        <th onClick={() => toggleHistSort("skus")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                          <span className="inline-flex items-center">SKUs Fritz<SortIcon col="skus" /></span>
                        </th>
                        <th onClick={() => toggleHistSort("vendedores")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                          <span className="inline-flex items-center">Vendedores<SortIcon col="vendedores" /></span>
                        </th>
                        <th style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize whitespace-nowrap text-left">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {histPaginated.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-16 text-center text-sm text-gray-400">No hay registros.</td>
                        </tr>
                      ) : (
                        histPaginated.map((row) => {
                          const isCurrent = row.periodKey === latestKey;
                          return (
                            <tr
                              key={row.periodKey}
                              onClick={() => setLatestKey(row.periodKey)}
                              className={cn("hover:bg-gray-50/60 transition-colors cursor-pointer", isCurrent && "bg-primary-50/50")}
                            >
                              <td className="px-6 py-5 font-medium whitespace-nowrap" style={{ color: "#171717" }}>
                                {row.periodLabel}
                                {isCurrent && <span className="ml-2 text-xs text-primary-600">(actual)</span>}
                              </td>
                              <td className="px-6 py-5 text-xs whitespace-nowrap text-gray-400">{row.publicado}</td>
                              <td className="px-6 py-5 tabular-nums" style={{ color: "#171717" }}>{row.cartera.toLocaleString()}</td>
                              <td className="px-6 py-5 tabular-nums">
                                <span className={cn(
                                  "inline-block text-xs font-semibold px-2 py-0.5 rounded-full",
                                  row.pctActivacion >= 0.8 ? "bg-green-50 text-green-700"
                                  : row.pctActivacion >= 0.5 ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                                )}>
                                  {(row.pctActivacion * 100).toFixed(0)}%
                                </span>
                              </td>
                              <td className="px-6 py-5 tabular-nums" style={{ color: "#171717" }}>{row.activados.toLocaleString()}</td>
                              <td className="px-6 py-5 tabular-nums" style={{ color: "#171717" }}>{row.cajas.toLocaleString()}</td>
                              <td className="px-6 py-5 tabular-nums" style={{ color: "#171717" }}>{row.skus}</td>
                              <td className="px-6 py-5 tabular-nums" style={{ color: "#171717" }}>{row.vendedores}</td>
                              <td className="px-6 py-5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                {confirmDeleteKey === row.periodKey ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">¿Eliminar?</span>
                                    <button
                                      onClick={async () => {
                                        setDeleting(true);
                                        const [ey, em] = row.periodKey.split("-").map(Number);
                                        const entryId = `${distributor.id}-${ey}-${em}`;
                                        const { error } = await deleteMonthlyEntry(entryId, slug);
                                        if (!error) setEntries((prev) => prev.filter((e) => `${e.periodYear}-${String(e.periodMonth).padStart(2,"0")}` !== row.periodKey));
                                        setConfirmDeleteKey(null);
                                        setDeleting(false);
                                      }}
                                      disabled={deleting}
                                      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
                                    >
                                      {deleting ? "..." : "Sí"}
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteKey(null)}
                                      className="text-xs font-medium text-gray-400 hover:text-gray-600 cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <Link
                                      href={`/dashboard/distribuidor/${slug}/cargar?period=${row.periodKey}`}
                                      className="text-xs font-medium text-primary-600 hover:text-primary-700 cursor-pointer"
                                    >
                                      Editar
                                    </Link>
                                    <button
                                      onClick={() => setConfirmDeleteKey(row.periodKey)}
                                      className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>}

                {histOpen && <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="whitespace-nowrap">Página {histSafePage} de {histTotalPages}</span>
                  <div className="flex-1 flex items-center justify-center gap-1">
                    <button onClick={() => setHistPage(1)} disabled={histSafePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <span className="text-xs font-bold">«</span>
                    </button>
                    <button onClick={() => setHistPage((p) => Math.max(1, p - 1))} disabled={histSafePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <RiArrowLeftLine className="w-4 h-4" />
                    </button>
                    {histPaginationRange.map((n, i) =>
                      n === "..." ? (
                        <span key={`e-${i}`} className="px-2 text-gray-400">…</span>
                      ) : (
                        <button key={n} onClick={() => setHistPage(n as number)}
                          className={cn("min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors",
                            histSafePage === n ? "bg-gray-100 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-500")}>
                          {n}
                        </button>
                      )
                    )}
                    <button onClick={() => setHistPage((p) => Math.min(histTotalPages, p + 1))} disabled={histSafePage === histTotalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <RiArrowRightSLine className="w-4 h-4" />
                    </button>
                    <button onClick={() => setHistPage(histTotalPages)} disabled={histSafePage === histTotalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <span className="text-xs font-bold">»</span>
                    </button>
                  </div>
                  <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors">
                    <select value={histPageSize} onChange={(e) => { setHistPageSize(Number(e.target.value)); setHistPage(1); }}
                      style={{ appearance: "none" }} className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-5">
                      {[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
                    </select>
                    <RiArrowDownSLine className="w-4 h-4 text-gray-400 pointer-events-none absolute right-2" />
                  </div>
                </div>}
              </>
            );
          })()}
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 text-sm">No hay datos para este período.</p>
          <Link
            href={`/dashboard/distribuidor/${slug}/cargar`}
            className="mt-4 inline-flex items-center gap-2 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-xl"
          >
            <RiEditLine className="w-4 h-4" />
            Cargar datos
          </Link>
        </div>
      )}
    </div>
  );
}
