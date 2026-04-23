"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getRegionBySlug, getDistributorsByRegion, getAllEntries } from "@/lib/db";
import { calcular, formatPeriod } from "@/lib/mock-data";
import type { Region, Distributor, MonthlyEntry } from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { RiArrowLeftLine } from "@remixicon/react";
import SkuTable from "@/components/SkuTable";

const REGION_COLORS: Record<string, string> = {
  Capital:           "#3B82F6",
  Oriente:           "#F59E0B",
  Centro:            "#10B981",
  "Centro Occidente":"#F43F5E",
  Occidente:         "#8B5CF6",
  Andes:             "#0891B2",
};

function generatePeriodKeys(): string[] {
  const keys: string[] = [];
  const now = new Date();
  let y = 2025, m = 9;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth() + 1)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return keys;
}
const ALL_PERIOD_KEYS = generatePeriodKeys();

function defaultPeriodKey() {
  const now = new Date();
  const m = now.getMonth() === 0 ? 12 : now.getMonth();
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return `${y}-${String(m).padStart(2, "0")}`;
}
function defaultPrevKey() {
  const now = new Date();
  const m2 = now.getMonth() <= 1 ? 10 + now.getMonth() : now.getMonth() - 1;
  const y2 = now.getMonth() <= 1 ? now.getFullYear() - 1 : now.getFullYear();
  return `${y2}-${String(m2).padStart(2, "0")}`;
}

type Period = { year: number; month: number };

function ActivationBar({ pct }: { pct: number }) {
  const pctNum = pct * 100;
  const barColor = pctNum >= 70 ? "#16a34a" : pctNum >= 50 ? "#f97316" : "#dc2626";
  const textColor = pctNum >= 70 ? "text-green-600" : pctNum >= 50 ? "text-orange-500" : "text-red-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pctNum, 100)}%`, backgroundColor: barColor }} />
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", textColor)}>{pctNum.toFixed(0)}%</span>
    </div>
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
      <path d={arcPath} fill="none" stroke={gaugeColor} strokeWidth={13} strokeLinecap="round"
        pathLength="100" strokeDasharray={`${p} 100`} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#374151" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4.5} fill="#374151" />
    </svg>
  );
}

export default function RegionPage() {
  const { slug } = useParams<{ slug: string }>();

  const [region,    setRegion]    = useState<Region | null>(null);
  const [dists,     setDists]     = useState<Distributor[]>([]);
  const [entries,   setEntries]   = useState<MonthlyEntry[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [latestKey, setLatestKey] = useState(defaultPeriodKey());
  const [prevKey,   setPrevKey]   = useState(defaultPrevKey());

  useEffect(() => {
    getRegionBySlug(slug).then((r) => {
      setRegion(r);
      if (!r) { setLoading(false); return; }
      Promise.all([
        getDistributorsByRegion(r.id),
        getAllEntries(),
      ]).then(([d, e]) => {
        setDists(d);
        setEntries(e);
        setLoading(false);
      });
    });
  }, [slug]);

  const parsePeriod = (key: string): Period => {
    const [y, m] = key.split("-").map(Number);
    return { year: y, month: m };
  };

  const LATEST = parsePeriod(latestKey);
  const PREV   = parsePeriod(prevKey);

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!region) {
    return (
      <div className="p-6 text-gray-500">Región no encontrada.{" "}
        <Link href="/dashboard" className="text-primary-600 underline">Volver</Link>
      </div>
    );
  }

  const regionColor  = REGION_COLORS[region.name] ?? "#94A3B8";
  const activeDists  = dists.filter((d) => d.status === "active");
  const pausedDists  = dists.filter((d) => d.status === "paused");
  const regionDists  = dists.filter((d) => d.status !== "inactive");

  const sumPeriod = (year: number, month: number) =>
    activeDists.reduce((acc, d) => {
      const e = entries.find(
        (m) => m.distributorId === d.id && m.periodYear === year && m.periodMonth === month
      );
      const c = e ? calcular(e) : null;
      return {
        cartera:       acc.cartera       + (e?.totalCartera    ?? 0),
        activados:     acc.activados     + (c?.activadosBase   ?? 0),
        activadosMeta: acc.activadosMeta + (c?.activadosMeta   ?? 0),
        fritz:         acc.fritz         + (c?.fritzeBase      ?? 0),
        fritzMeta:     acc.fritzMeta     + (c?.fritzMeta       ?? 0),
        skus:          acc.skus          + (e?.totalSkusFritz  ?? 0),
        skusMeta:      acc.skusMeta      + (c?.skusMeta        ?? 0),
        cajas:         acc.cajas         + (c?.cajasBase       ?? 0),
        cajasMeta:     acc.cajasMeta     + (c?.cajasMeta       ?? 0),
        rentabilidad:  acc.rentabilidad  + (c?.rentabilidad    ?? 0),
        rebate:        acc.rebate        + (c?.rebateTotal     ?? 0),
      };
    }, { cartera: 0, activados: 0, activadosMeta: 0, fritz: 0, fritzMeta: 0, skus: 0, skusMeta: 0, cajas: 0, cajasMeta: 0, rentabilidad: 0, rebate: 0 });

  const cur  = sumPeriod(LATEST.year, LATEST.month);

  const trendData = ALL_PERIOD_KEYS.map((p) => {
    const [y, m] = p.split("-").map(Number);
    const s = sumPeriod(y, m);
    const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return {
      label: `${monthNames[m - 1]} ${String(y).slice(-2)}`,
      cartera:   Math.round(s.cartera),
      activados: Math.round(s.activados),
      fritz:     Math.round(s.fritz),
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <RiArrowLeftLine className="w-4 h-4" />
            Vista Global
          </Link>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: regionColor }} />
            <h1 className="text-2xl font-bold text-gray-900">{region.name}</h1>
          </div>
          <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-medium">
            {activeDists.length} activos
          </span>
          {pausedDists.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full font-medium">
              {pausedDists.length} inactivos
            </span>
          )}
        </div>

        {/* Period selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">Período</span>
            <select value={latestKey} onChange={(e) => setLatestKey(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer">
              {[...ALL_PERIOD_KEYS].reverse().map((p) => {
                const { year, month } = parsePeriod(p);
                return <option key={p} value={p}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>
          <span className="text-xs text-gray-400">vs</span>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-400 font-medium">Comparar con</span>
            <select value={prevKey} onChange={(e) => setPrevKey(e.target.value)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer">
              {[...ALL_PERIOD_KEYS].reverse().map((p) => {
                const { year, month } = parsePeriod(p);
                return <option key={p} value={p}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Gauge cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Activados",          base: cur.activados, meta: cur.activadosMeta, fmt: "number"  as const },
          { label: "Clientes con Fritz", base: cur.fritz,     meta: cur.fritzMeta,     fmt: "number"  as const },
          { label: "Número de SKUs",     base: cur.skus,      meta: cur.skusMeta,      fmt: "number"  as const },
          { label: "Cajas Sell Out",     base: cur.cajas,     meta: cur.cajasMeta,     fmt: "number"  as const },
        ].map((card) => {
          const fmtVal = (v: number) => Math.round(v).toLocaleString();
          const progress = card.meta > 0 ? Math.min((card.base / card.meta) * 100, 100) : 0;
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
                <span className="text-2xl font-bold text-gray-900 tabular-nums leading-none">{fmtVal(card.base)}</span>
                <span className={cn("px-3 py-1 rounded-full text-sm font-bold tabular-nums", pillCls)}>
                  {progress.toFixed(0)}%
                </span>
                <span className="text-xs text-gray-400 tabular-nums">
                  Meta: <span className="font-semibold text-gray-600">{fmtVal(card.meta)}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend chart + SKU pie */}
      <div className="flex gap-4 items-stretch">
        {/* Area 4/6 */}
        <div className="flex-[4] bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-w-0">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Evolución de Cartera y Activaciones</h2>
            <p className="text-xs text-gray-400 mt-0.5">Histórico mensual — {region.name}</p>
          </div>
          <div className="flex items-center gap-4 mb-4">
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
            <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={regionColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={regionColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFritz" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f97316" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={44}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(v, name) => {
                  const n = Number(v);
                  if (name === "cartera")   return [n.toLocaleString(), "Total Cartera"];
                  if (name === "activados") return [n.toLocaleString(), "Activados"];
                  if (name === "fritz")     return [n.toLocaleString(), "Clientes con Fritz"];
                  return [v, name];
                }}
              />
              <Area type="monotone" dataKey="cartera"   stroke="#94A3B8"    strokeWidth={1.5} fill="none"          dot={false} isAnimationActive={false} strokeDasharray="4 2" />
              <Area type="monotone" dataKey="activados" stroke={regionColor} strokeWidth={2}   fill="url(#gAct)"   dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="fritz"     stroke="#f97316"    strokeWidth={2}    fill="url(#gFritz)" dot={false} isAnimationActive={false} />
            </AreaChart>
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
          const totalSkus = cur.skus;
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

      {/* Distributors table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Distribuidores — {region.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{formatPeriod(LATEST.year, LATEST.month)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Distribuidor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cartera</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Activados</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">% Activ.</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Cajas SO</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Rentabilidad</th>
                <th className="w-8 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {regionDists.map((d, i) => {
                const entry = entries.find(
                  (m) => m.distributorId === d.id && m.periodYear === LATEST.year && m.periodMonth === LATEST.month
                );
                const calc = entry ? calcular(entry) : null;
                return (
                  <tr key={d.id} className={cn(
                    "group hover:bg-gray-50/70 transition-colors cursor-pointer",
                    i !== 0 && "border-t border-gray-50",
                    d.status === "paused" && "opacity-60"
                  )}>
                    <td className="px-6 py-3.5">
                      <Link href={`/dashboard/distribuidor/${d.slug}`} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: `${regionColor}18`, color: regionColor }}>
                          {d.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                          {d.name}
                        </span>
                        {d.status === "paused" && (
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactivo</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums">
                      {entry?.totalCartera.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-gray-800 tabular-nums">
                      {calc ? Math.round(calc.activadosBase).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {entry ? <ActivationBar pct={entry.pctActivacion} /> : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                      {calc ? Math.round(calc.cajasBase).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums">
                      {calc ? `$${Math.round(calc.rentabilidad).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/dashboard/distribuidor/${d.slug}`}
                        className="text-gray-300 group-hover:text-primary-500 transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SkuTable />
    </div>
  );
}
