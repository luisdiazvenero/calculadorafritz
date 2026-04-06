"use client";
import { useState } from "react";
import { distributors, regions, monthlyEntries, calcular, formatPeriod, delta } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  RiArrowUpLine,
  RiArrowDownLine,
} from "@remixicon/react";

type Period = { year: number; month: number };

function getKpis(LATEST: Period) {
  const activeDistributors = distributors.filter((d) => d.status === "active");

  const calcs = activeDistributors
    .map((d) => {
      const e = monthlyEntries.find(
        (m) => m.distributorId === d.id && m.periodYear === LATEST.year && m.periodMonth === LATEST.month
      );
      return e ? { c: calcular(e), e } : null;
    })
    .filter(Boolean) as { c: ReturnType<typeof calcular>; e: (typeof monthlyEntries)[0] }[];

  const sum = (key: keyof ReturnType<typeof calcular>) =>
    calcs.reduce((acc, { c }) => acc + (c[key] ?? 0), 0);

  return {
    activados:     sum("activadosBase"),
    activadosMeta: sum("activadosMeta"),
    fritz:         sum("fritzeBase"),
    fritzMeta:     sum("fritzMeta"),
    skus:          calcs.reduce((acc, { e }) => acc + e.totalSkusFritz, 0),
    skusMeta:      sum("skusMeta"),
    cajas:         sum("cajasBase"),
    cajasMeta:     sum("cajasMeta"),
  };
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
      <path d={arcPath} fill="none" stroke={gaugeColor} strokeWidth={13} strokeLinecap="round"
        pathLength="100" strokeDasharray={`${p} 100`} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4.5} fill="#374151" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  prev,
  prevPeriod,
  format = "number",
  icon: Icon,
}: {
  label: string;
  value: number;
  prev: number;
  prevPeriod: Period;
  format?: "number" | "currency";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const d = delta(value, prev);
  const positive = d >= 0;
  const fmt = (v: number) =>
    format === "currency"
      ? `$${Math.round(v).toLocaleString()}`
      : Math.round(v).toLocaleString();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 border-t-2 border-t-primary-500 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-default">
      <div className="flex items-start gap-4 p-5">
        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1.5 truncate">{label}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[1.625rem] font-bold text-gray-900 tabular-nums tracking-tight leading-none">
              {fmt(value)}
            </span>
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full",
              positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}>
              {positive ? <RiArrowUpLine className="w-3 h-3" /> : <RiArrowDownLine className="w-3 h-3" />}
              {Math.abs(d * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-gray-400">vs {formatPeriod(prevPeriod.year, prevPeriod.month)}</span>
            <span className="text-xs font-semibold text-gray-700 tabular-nums">{fmt(prev)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivationBar({ pct }: { pct: number }) {
  const pctNum = pct * 100;
  // Semantic traffic-light colors — always green / amber / red
  const barColor = pctNum >= 70 ? "#16a34a" : pctNum >= 50 ? "#f97316" : "#dc2626";
  const textColor =
    pctNum >= 70 ? "text-green-600" : pctNum >= 50 ? "text-orange-500" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(pctNum, 100)}%`, backgroundColor: barColor }}
        />
      </div>
      <span className={cn("text-xs font-semibold w-7 tabular-nums", textColor)}>
        {pctNum.toFixed(0)}%
      </span>
    </div>
  );
}

function getRegionKpis(LATEST: Period, PREV: Period) {
  const allPeriods = [
    ...new Set(
      monthlyEntries.map((e) => `${e.periodYear}-${String(e.periodMonth).padStart(2, "0")}`)
    ),
  ].sort();

  return regions.map((region) => {
    const dists = distributors.filter((d) => d.regionId === region.id && d.status === "active");

    const sumPeriod = (year: number, month: number) =>
      dists.reduce(
        (acc, d) => {
          const e = monthlyEntries.find(
            (m) => m.distributorId === d.id && m.periodYear === year && m.periodMonth === month
          );
          const c = e ? calcular(e) : null;
          return {
            activados: acc.activados + (c?.activadosBase ?? 0),
            cajas: acc.cajas + (c?.cajasBase ?? 0),
            rentabilidad: acc.rentabilidad + (c?.rentabilidad ?? 0),
          };
        },
        { activados: 0, cajas: 0, rentabilidad: 0 }
      );

    const cur = sumPeriod(LATEST.year, LATEST.month);
    const prv = sumPeriod(PREV.year, PREV.month);

    const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const spark = allPeriods.map((p) => {
      const [y, m] = p.split("-").map(Number);
      const s = sumPeriod(y, m);
      return {
        label: `${monthNames[m - 1]} ${String(y).slice(-2)}`,
        activados: Math.round(s.activados),
        cajas: Math.round(s.cajas),
        rent: Math.round(s.rentabilidad),
      };
    });

    return { region, cur, prevActivados: prv.activados, spark };
  });
}

type SparkPoint = { label: string; activados: number; cajas: number; rent: number };

function RegionMiniCard({
  region,
  cur,
  prevActivados,
  spark,
}: {
  region: (typeof regions)[0];
  cur: { activados: number; cajas: number; rentabilidad: number };
  prevActivados: number;
  spark: SparkPoint[];
}) {
  const color = REGION_COLORS[region.name] ?? "#94A3B8";
  const d = delta(cur.activados, prevActivados);
  const positive = d >= 0;
  const sparkData = spark.map((p) => ({ v: p.activados, label: p.label }));
  const mid = Math.floor((sparkData.length - 1) / 2);
  const threeTicks = [sparkData[0]?.label, sparkData[mid]?.label, sparkData[sparkData.length - 1]?.label].filter(Boolean) as string[];

  return (
    <Link href={`/dashboard/region/${region.slug}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer">

      {/* Header: region name only */}
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{region.name}</span>
      </div>

      {/* Activados + sparkline side by side */}
      <div className="flex items-start gap-6 mt-2">
        {/* Left: label + number + badge */}
        <div className="flex-shrink-0">
          <p className="text-[10px] text-gray-400 leading-none mb-1">Activados</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-3xl font-bold text-gray-900 tabular-nums tracking-tight leading-none">
              {Math.round(cur.activados).toLocaleString()}
            </p>
            <span className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
              positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}>
              {positive ? <RiArrowUpLine className="w-2.5 h-2.5" /> : <RiArrowDownLine className="w-2.5 h-2.5" />}
              {Math.abs(d * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Right: sparkline */}
        <div className="flex-1 min-w-0 -mb-1">
        <ResponsiveContainer width="100%" height={64}>
          <AreaChart data={sparkData} margin={{ top: 2, right: 4, left: 16, bottom: 0 }}>
            <defs>
              <linearGradient id={`rg-${region.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "#9CA3AF" }}
              axisLine={false}
              tickLine={false}
              ticks={threeTicks}
            />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 11, padding: "4px 8px" }}
              formatter={(v) => [Number(v).toLocaleString(), "Activados"]}
              labelFormatter={(l) => l}
              cursor={{ stroke: "#E5E7EB", strokeWidth: 1 }}
            />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
              fill={`url(#rg-${region.id})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 my-2" />

      {/* Cajas + Rentabilidad — compact inline stats */}
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] text-gray-400 leading-none mb-0.5">Cajas SO</p>
          <p className="text-sm font-semibold text-gray-700 tabular-nums">
            {Math.round(cur.cajas).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-gray-400 leading-none mb-0.5">Rentabilidad</p>
          <p className="text-sm font-semibold text-gray-700 tabular-nums">
            ${Math.round(cur.rentabilidad).toLocaleString()}
          </p>
        </div>
      </div>

    </Link>
  );
}

// Palette optimized for stacked bar contrast (max perceptual distance between adjacent segments)
const REGION_COLORS: Record<string, string> = {
  Capital:           "#3B82F6", // blue
  Oriente:           "#F59E0B", // amber
  Centro:            "#10B981", // emerald
  "Centro Occidente":"#F43F5E", // rose
  Occidente:         "#8B5CF6", // purple
  Andes:             "#0891B2", // cyan-600
};

export default function DashboardPage() {
  // Available periods derived from data
  const availablePeriods = [
    ...new Set(monthlyEntries.map((e) => `${e.periodYear}-${String(e.periodMonth).padStart(2, "0")}`)),
  ].sort();

  const parsePeriod = (key: string): Period => {
    const [y, m] = key.split("-").map(Number);
    return { year: y, month: m };
  };

  const defaultLatest = availablePeriods[availablePeriods.length - 1] ?? "2026-02";
  const defaultPrev   = availablePeriods[availablePeriods.length - 2] ?? "2026-01";

  const [latestKey, setLatestKey] = useState(defaultLatest);
  const [prevKey,   setPrevKey]   = useState(defaultPrev);

  const LATEST = parsePeriod(latestKey);
  const PREV   = parsePeriod(prevKey);

  const kpis = getKpis(LATEST);
  const regionKpis = getRegionKpis(LATEST, PREV);
  const activeCount = distributors.filter((d) => d.status === "active").length;
  const pausedCount = distributors.filter((d) => d.status === "paused").length;
  const [activeRegions, setActiveRegions] = useState<Set<string>>(
    new Set(regions.map((r) => r.name))
  );

  const toggleRegion = (name: string) => {
    setActiveRegions((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (next.size > 1) next.delete(name); // keep at least one visible
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Build time-series by region
  const allPeriods = [
    ...new Set(
      monthlyEntries.map((e) => `${e.periodYear}-${String(e.periodMonth).padStart(2, "0")}`)
    ),
  ].sort();

  const regionLineData = allPeriods.map((period) => {
    const [y, m] = period.split("-").map(Number);
    const row: Record<string, number | string> = { periodo: formatPeriod(y, m) };
    regions.forEach((region) => {
      const dists = distributors.filter((d) => d.regionId === region.id && d.status === "active");
      row[region.name] = Math.round(
        dists.reduce((sum, d) => {
          const e = monthlyEntries.find(
            (me) => me.distributorId === d.id && me.periodYear === y && me.periodMonth === m
          );
          return sum + (e ? calcular(e).activadosBase : 0);
        }, 0)
      );
    });
    return row;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: title + info badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Vista Global</h1>
          <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-medium">
            {activeCount} activos
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full font-medium">
            {pausedCount} inactivos
          </span>
          <span className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2.5 py-1 rounded-full font-medium">
            Modo Demo
          </span>
        </div>

        {/* Right: period selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Período</span>
            <select
              value={latestKey}
              onChange={(e) => setLatestKey(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {availablePeriods.map((p) => {
                const { year, month } = parsePeriod(p);
                return <option key={p} value={p}>{formatPeriod(year, month)}</option>;
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
              {availablePeriods.map((p) => {
                const { year, month } = parsePeriod(p);
                return <option key={p} value={p}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Gauge cards — Métricas Globales */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-primary-600 uppercase tracking-widest px-0.5">Métricas Globales</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Activados",          base: kpis.activados, meta: kpis.activadosMeta },
            { label: "Clientes con Fritz", base: kpis.fritz,     meta: kpis.fritzMeta     },
            { label: "Número de SKUs",     base: kpis.skus,      meta: kpis.skusMeta      },
            { label: "Cajas Sell Out",     base: kpis.cajas,     meta: kpis.cajasMeta     },
          ].map((card) => {
            const progress = card.meta > 0 ? Math.min((card.base / card.meta) * 100, 100) : 0;
            const pctCls = progress >= 80 ? "text-green-600" : progress >= 50 ? "text-amber-500" : "text-red-500";
            return (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <p className="text-sm font-bold text-gray-800 leading-tight">{card.label}</p>
                </div>
                <div className="px-3 pt-2 pb-4 flex flex-col items-center gap-1 flex-1">
                  <GaugeChart progress={progress} />
                  <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
                    {Math.round(card.base).toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5 tabular-nums">
                    Meta: <span className="text-gray-600 font-medium">{Math.round(card.meta).toLocaleString()}</span>
                    {" "}<span className={cn("font-bold", pctCls)}>({progress.toFixed(0)}%)</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Region mini-cards — 3 per row × 2 rows */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest px-0.5">Desglose por Región</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {regionKpis.map(({ region, cur, prevActivados, spark }) => (
            <RegionMiniCard key={region.id} region={region} cur={cur} prevActivados={prevActivados} spark={spark} />
          ))}
        </div>
      </div>

      {/* Activados por Región (stacked) + SKUs */}
      <div className="flex gap-4 items-stretch">
        {/* Stacked bar 4/6 */}
        <div className="flex-[4] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Activados por Región</h2>
              <p className="text-xs text-gray-400 mt-0.5">Comparativo mensual acumulado</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-end pt-0.5">
              {regions.map((region) => {
                const color = REGION_COLORS[region.name] ?? "#94A3B8";
                const isOn = activeRegions.has(region.name);
                return (
                  <button key={region.id} onClick={() => toggleRegion(region.name)}
                    className={cn("flex items-center gap-1.5 text-xs transition-colors duration-150 cursor-pointer select-none",
                      isOn ? "text-gray-600" : "text-gray-300")}>
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-opacity"
                      style={{ backgroundColor: isOn ? color : "#E5E7EB" }} />
                    {region.name}
                  </button>
                );
              })}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={regionLineData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={44}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)", fontSize: 12 }}
                formatter={(value, name) => [Number(value).toLocaleString(), String(name)]}
                cursor={{ fill: "#F9FAFB" }}
              />
              {regions.map((region, i) => (
                <Bar key={region.id} dataKey={region.name} stackId="a"
                  fill={REGION_COLORS[region.name] ?? "#94A3B8"}
                  radius={i === regions.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  hide={!activeRegions.has(region.name)}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SKUs por Categoría 2/6 */}
        {(() => {
          const SKU_CATS = [
            { name: "Salsas y aderezos",  weight: 22 },
            { name: "BBQ",                weight: 13 },
            { name: "Salsas líquidas",    weight: 17 },
            { name: "Picantes y ajíes",   weight: 10 },
            { name: "Mayonesas",          weight: 16 },
            { name: "Mostazas",           weight: 12 },
          ];
          const CAT_COLORS = ["#0466C8","#f97316","#16a34a","#a855f7","#e11d48","#0891b2"];
          const totalWeight = SKU_CATS.reduce((s, c) => s + c.weight, 0);
          const totalSkus = kpis.skus;
          const pieData = SKU_CATS.map((c) => ({
            name: c.name,
            value: Math.round((c.weight / totalWeight) * totalSkus),
          }));
          return (
            <div className="flex-[2] bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col min-w-0">
              <h2 className="text-base font-semibold text-gray-900 leading-tight">SKUs por Categoría</h2>
              <p className="text-xs text-gray-400 mt-0.5 mb-2">{totalSkus} SKUs · {formatPeriod(LATEST.year, LATEST.month)}</p>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={100}
                      paddingAngle={2} dataKey="value" isAnimationActive={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 11 }}
                      formatter={(v, name) => [`${v} SKUs`, String(name)]} />
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

      {/* Distributor list preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Top Distribuidores</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatPeriod(LATEST.year, LATEST.month)}</p>
          </div>
          <Link
            href="/dashboard/distribuidores"
            className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors duration-150 flex items-center gap-1"
          >
            Ver todos
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-64">Distribuidor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Región</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cartera</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Activados</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">% Activ.</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cajas SO</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {distributors
                .filter((d) => d.status === "active")
                .slice(0, 10)
                .map((d, i) => {
                  const entry = monthlyEntries.find(
                    (m) => m.distributorId === d.id && m.periodYear === LATEST.year && m.periodMonth === LATEST.month
                  );
                  const region = regions.find((r) => r.id === d.regionId);
                  const calc = entry ? calcular(entry) : null;
                  const regionColor = REGION_COLORS[region?.name ?? ""] ?? "#94A3B8";
                  return (
                    <tr
                      key={d.id}
                      className={cn(
                        "group hover:bg-gray-50/70 transition-colors duration-100 cursor-pointer",
                        i !== 0 && "border-t border-gray-50"
                      )}
                    >
                      {/* Distribuidor + avatar */}
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/distribuidor/${d.slug}`} className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ backgroundColor: `${regionColor}18`, color: regionColor }}
                          >
                            {d.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors duration-150">
                            {d.name}
                          </span>
                        </Link>
                      </td>

                      {/* Región con dot */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: regionColor }}
                          />
                          <span className="text-gray-500 text-sm">{region?.name}</span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right text-gray-600 tabular-nums">
                        {entry?.totalCartera.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-gray-800 tabular-nums">
                        {calc ? Math.round(calc.activadosBase).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-4">
                        {entry ? <ActivationBar pct={entry.pctActivacion} /> : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-600 tabular-nums">
                        {entry?.cajasPromedio.toLocaleString() ?? "—"}
                      </td>

                      {/* Row link arrow */}
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/dashboard/distribuidor/${d.slug}`}
                          className="text-gray-300 group-hover:text-primary-500 transition-colors duration-150"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
