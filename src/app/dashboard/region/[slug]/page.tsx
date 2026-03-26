"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  distributors, regions, monthlyEntries, calcular, formatPeriod, delta,
} from "@/lib/mock-data";
import { cn } from "@/utils/cn";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  RiArrowUpLine, RiArrowDownLine, RiArrowLeftLine,
  RiGroupLine, RiBox3Line, RiMoneyDollarCircleLine, RiStore2Line,
} from "@remixicon/react";

const REGION_COLORS: Record<string, string> = {
  Capital:           "#0466C8",
  Oriente:           "#BE3054",
  Centro:            "#424656",
  "Centro Occidente":"#FB6A85",
  Occidente:         "#A7AABD",
  Andes:             "#1A2D5A",
};

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

function KpiCard({
  label, value, prev, prevPeriod, format = "number",
  icon: Icon, color,
}: {
  label: string; value: number; prev: number; prevPeriod: Period;
  format?: "number" | "currency";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const d = delta(value, prev);
  const positive = d >= 0;
  const fmt = (v: number) =>
    format === "currency" ? `$${Math.round(v).toLocaleString()}` : Math.round(v).toLocaleString();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}><Icon className="w-5 h-5" /></span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 mb-1 truncate">{label}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[1.5rem] font-bold text-gray-900 tabular-nums tracking-tight leading-none">
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
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs text-gray-400">vs {formatPeriod(prevPeriod.year, prevPeriod.month)}</span>
            <span className="text-xs font-semibold text-gray-700 tabular-nums">{fmt(prev)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegionPage() {
  const { slug } = useParams<{ slug: string }>();
  const region = regions.find((r) => r.slug === slug);

  const availablePeriods = [
    ...new Set(monthlyEntries.map((e) => `${e.periodYear}-${String(e.periodMonth).padStart(2, "0")}`)),
  ].sort();

  const parsePeriod = (key: string): Period => {
    const [y, m] = key.split("-").map(Number);
    return { year: y, month: m };
  };

  const [latestKey, setLatestKey] = useState(availablePeriods[availablePeriods.length - 1] ?? "2026-02");
  const [prevKey,   setPrevKey]   = useState(availablePeriods[availablePeriods.length - 2] ?? "2026-01");

  const LATEST = parsePeriod(latestKey);
  const PREV   = parsePeriod(prevKey);

  if (!region) {
    return (
      <div className="p-6 text-gray-500">Región no encontrada.{" "}
        <Link href="/dashboard" className="text-primary-600 underline">Volver</Link>
      </div>
    );
  }

  const regionColor = REGION_COLORS[region.name] ?? "#94A3B8";
  const regionDists = distributors.filter((d) => d.regionId === region.id && d.status !== "inactive");
  const activeDists  = regionDists.filter((d) => d.status === "active");
  const pausedDists  = regionDists.filter((d) => d.status === "paused");

  const sumPeriod = (year: number, month: number) =>
    activeDists.reduce((acc, d) => {
      const e = monthlyEntries.find(
        (m) => m.distributorId === d.id && m.periodYear === year && m.periodMonth === month
      );
      const c = e ? calcular(e) : null;
      return {
        activados:    acc.activados    + (c?.activadosBase  ?? 0),
        cajas:        acc.cajas        + (c?.cajasBase      ?? 0),
        rentabilidad: acc.rentabilidad + (c?.rentabilidad   ?? 0),
        rebate:       acc.rebate       + (c?.rebateTotal    ?? 0),
      };
    }, { activados: 0, cajas: 0, rentabilidad: 0, rebate: 0 });

  const cur  = sumPeriod(LATEST.year, LATEST.month);
  const prv  = sumPeriod(PREV.year,   PREV.month);

  // Time-series for trend chart
  const trendData = availablePeriods.map((p) => {
    const [y, m] = p.split("-").map(Number);
    const s = sumPeriod(y, m);
    const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return {
      label: `${monthNames[m - 1]} ${String(y).slice(-2)}`,
      activados:    Math.round(s.activados),
      cajas:        Math.round(s.cajas),
      rentabilidad: Math.round(s.rentabilidad),
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Breadcrumb */}
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
              {availablePeriods.map((p) => {
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
              {availablePeriods.map((p) => {
                const { year, month } = parsePeriod(p);
                return <option key={p} value={p}>{formatPeriod(year, month)}</option>;
              })}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Clientes Activados" value={cur.activados} prev={prv.activados} prevPeriod={PREV} icon={RiGroupLine} color={regionColor} />
        <KpiCard label="Cajas Sell Out" value={cur.cajas} prev={prv.cajas} prevPeriod={PREV} icon={RiBox3Line} color={regionColor} />
        <KpiCard label="Rentabilidad" value={cur.rentabilidad} prev={prv.rentabilidad} prevPeriod={PREV} format="currency" icon={RiMoneyDollarCircleLine} color={regionColor} />
        <KpiCard label="Rebate Total" value={cur.rebate} prev={prv.rebate} prevPeriod={PREV} format="currency" icon={RiStore2Line} color={regionColor} />
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Evolución de Activados y Cajas SO</h2>
          <p className="text-xs text-gray-400 mt-0.5">Histórico mensual — {region.name}</p>
        </div>
        <div className="flex items-center gap-4 mb-4">
          {[
            { label: "Activados",    color: regionColor, dash: false },
            { label: "Cajas SO",     color: "#94A3B8",   dash: true  },
            { label: "Rentabilidad", color: "#818CF8",   dash: true  },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={regionColor} stopOpacity={0.15} />
                <stop offset="95%" stopColor={regionColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} width={44}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#818CF8" }} axisLine={false} tickLine={false} width={52}
              tickFormatter={(v) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "1px solid #E5E7EB", fontSize: 12 }}
              formatter={(v, name) => {
                const n = Number(v);
                if (name === "activados")    return [n.toLocaleString(), "Activados"];
                if (name === "cajas")        return [n.toLocaleString(), "Cajas SO"];
                if (name === "rentabilidad") return [`$${n.toLocaleString()}`, "Rentabilidad"];
                return [v, name];
              }}
            />
            <Area yAxisId="left"  type="monotone" dataKey="activados" stroke={regionColor} strokeWidth={2}
              fill="url(#gAct)" dot={false} isAnimationActive={false} />
            <Area yAxisId="left"  type="monotone" dataKey="cajas" stroke="#94A3B8" strokeWidth={1.5}
              fill="none" dot={false} isAnimationActive={false} strokeDasharray="4 2" />
            <Area yAxisId="right" type="monotone" dataKey="rentabilidad" stroke="#818CF8" strokeWidth={1.5}
              fill="none" dot={false} isAnimationActive={false} strokeDasharray="2 3" />
          </AreaChart>
        </ResponsiveContainer>
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
                const entry = monthlyEntries.find(
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

    </div>
  );
}
