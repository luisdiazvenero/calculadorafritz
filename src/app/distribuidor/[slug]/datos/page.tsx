"use client";
import { use, useState, useEffect, useMemo } from "react";
import { calcular, formatPeriod } from "@/lib/mock-data";
import type { Distributor, MonthlyEntry } from "@/lib/mock-data";
import { getDistributorBySlug, getEntriesByDistributor } from "@/lib/db";
import { cn } from "@/utils/cn";
import Link from "next/link";
import {
  RiAddLine, RiSearchLine,
  RiArrowUpSLine, RiArrowDownSLine,
  RiArrowLeftSLine, RiArrowRightSLine,
  RiFileChartLine, RiCalendarLine, RiUserLine, RiBox3Line,
  RiShareBoxLine,
} from "@remixicon/react";

type SortKey = "period" | "cartera" | "activados" | "pctActivacion" | "cajas" | "skus" | "vendedores" | "rentabilidad";
type SortDir = "asc" | "desc";

export default function ReportesMensualesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);

  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]             = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "3m" | "6m" | "1y">("all");
  const [sortKey, setSortKey]           = useState<SortKey>("period");
  const [sortDir, setSortDir]           = useState<SortDir>("desc");
  const [page, setPage]                 = useState(1);
  const [pageSize, setPageSize]         = useState(10);

  const PERIOD_OPTIONS = [
    { value: "all", label: "Todos los períodos" },
    { value: "3m",  label: "Últimos 3 meses" },
    { value: "6m",  label: "Últimos 6 meses" },
    { value: "1y",  label: "Último año" },
  ] as const;

  useEffect(() => {
    getDistributorBySlug(slug).then((d) => {
      setDistributor(d);
      if (!d) { setLoading(false); return; }
      getEntriesByDistributor(d.id).then((e) => {
        setEntries(e);
        setLoading(false);
      });
    });
  }, [slug]);

  // All hooks must come before any conditional return
  const allEntries = useMemo(
    () => entries.map((e) => ({ entry: e, calc: calcular(e) })),
    [entries]
  );

  const totalEntries = allEntries.length;
  const latestEntry  = allEntries[0]; // entries are newest-first from DB
  const avgActivados = totalEntries > 0
    ? Math.round(allEntries.reduce((s, r) => s + r.calc.activadosBase, 0) / totalEntries)
    : 0;
  const avgCajas = totalEntries > 0
    ? Math.round(allEntries.reduce((s, r) => s + r.calc.cajasBase, 0) / totalEntries)
    : 0;

  const rows = useMemo(() => allEntries.map(({ entry: e, calc: c }) => {
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
  }), [allEntries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const cutoffMap = { "3m": "2025-12", "6m": "2025-09", "1y": "2025-03", all: "0000-00" };
    const cutoff = cutoffMap[periodFilter];
    return rows.filter((r) =>
      (!q || r.periodLabel.toLowerCase().includes(q)) &&
      r.periodKey >= cutoff
    );
  }, [rows, search, periodFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: number | string, vb: number | string;
      switch (sortKey) {
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
      if (va < vb) return sortDir === "asc" ? -1 :  1;
      if (va > vb) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | "...")[] = [];
    let last = 0;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safePage - delta && i <= safePage + delta)) {
        if (last && i - last > 1) range.push("...");
        range.push(i);
        last = i;
      }
    }
    return range;
  }, [totalPages, safePage]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return (
        <span className="inline-flex flex-col ml-1.5">
          <RiArrowUpSLine className="w-3.5 h-3.5 -mb-0.5" style={{ color: "#a3a3a3" }} />
          <RiArrowDownSLine className="w-3.5 h-3.5" style={{ color: "#a3a3a3" }} />
        </span>
      );
    return sortDir === "asc"
      ? <RiArrowUpSLine className="w-4 h-4 text-gray-900 ml-1.5" />
      : <RiArrowDownSLine className="w-4 h-4 text-gray-900 ml-1.5" />;
  }

  const fmtRent = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000   ? `$${(v / 1_000).toFixed(1)}k`
    : `$${v.toLocaleString()}`;

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="h-8 w-64 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!distributor) {
    return <div className="p-6 text-gray-500">Distribuidor no encontrado.</div>;
  }

  return (
    <div className="p-8 space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes Mensuales</h1>
          <p className="text-sm text-gray-400 mt-1">Historial de reportes cargados por período</p>
        </div>
        <Link
          href={`/distribuidor/${slug}/datos/nueva`}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm whitespace-nowrap"
        >
          <RiAddLine className="w-4 h-4" />
          Cargar Reporte
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-gray-100 border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden">
        {[
          { label: "Total registros",    value: totalEntries.toString(),                                                                        sub: "meses cargados", icon: RiFileChartLine, color: "text-primary-600",  bg: "bg-primary-50"  },
          { label: "Último período",     value: latestEntry ? formatPeriod(latestEntry.entry.periodYear, latestEntry.entry.periodMonth) : "—",  sub: latestEntry ? `${latestEntry.entry.periodYear}` : "Sin datos", icon: RiCalendarLine, color: "text-violet-600", bg: "bg-violet-50"  },
          { label: "Promedio activados", value: avgActivados.toLocaleString(),                                                                  sub: "por período",    icon: RiUserLine,      color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Promedio cajas SO",  value: avgCajas.toLocaleString(),                                                                      sub: "por período",    icon: RiBox3Line,      color: "text-amber-600",   bg: "bg-amber-50"   },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="px-6 py-5 flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", stat.bg)}>
                <Icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-0.5">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-3.5 flex items-center gap-3 border-b border-gray-100 flex-wrap">
          <div className="relative w-60">
            <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar período..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>

          <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300 transition-colors">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as typeof periodFilter)}
              style={{ appearance: "none" }}
              className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-5"
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <RiArrowDownSLine className="w-4 h-4 text-gray-400 pointer-events-none absolute right-2" />
          </div>

          {filtered.length > 0 && (() => {
            const keys = filtered.map((r) => r.periodKey).sort();
            const from = keys[0].replace("-", "/");
            const to   = keys[keys.length - 1].replace("-", "/");
            return (
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white">
                <RiCalendarLine className="w-4 h-4 text-gray-400" />
                <span>{from === to ? from : `${from} — ${to}`}</span>
              </div>
            );
          })()}

          <span className="ml-auto text-sm text-gray-400">{sorted.length} registros</span>

          <button className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white hover:border-gray-300 hover:text-gray-900 transition-colors">
            <RiShareBoxLine className="w-4 h-4" />
            Exportar
          </button>
        </div>

        {/* Table */}
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }}>
            <tr className="border-b border-gray-200">
              <th onClick={() => toggleSort("period")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                <span className="inline-flex items-center">Período<SortIcon col="period" /></span>
              </th>
              <th style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize whitespace-nowrap text-left">
                Publicado
              </th>
              <th onClick={() => toggleSort("cartera")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                <span className="inline-flex items-center">Cartera<SortIcon col="cartera" /></span>
              </th>
              <th onClick={() => toggleSort("pctActivacion")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                <span className="inline-flex items-center">% Activ.<SortIcon col="pctActivacion" /></span>
              </th>
              <th onClick={() => toggleSort("activados")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                <span className="inline-flex items-center">Activados<SortIcon col="activados" /></span>
              </th>
              <th onClick={() => toggleSort("cajas")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                <span className="inline-flex items-center">Cajas SO<SortIcon col="cajas" /></span>
              </th>
              <th onClick={() => toggleSort("skus")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                <span className="inline-flex items-center">SKUs Fritz<SortIcon col="skus" /></span>
              </th>
              <th onClick={() => toggleSort("vendedores")} style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left">
                <span className="inline-flex items-center">Vendedores<SortIcon col="vendedores" /></span>
              </th>
              <th style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }} className="px-6 py-3 text-xs font-normal capitalize text-left">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-sm text-gray-400">
                  No hay registros.{" "}
                  <Link href={`/distribuidor/${slug}/datos/nueva`} className="text-primary-600 hover:underline font-medium">
                    Cargar el primero
                  </Link>
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.periodKey} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-5 font-medium whitespace-nowrap" style={{ color: "#171717" }}>{row.periodLabel}</td>
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
                  <td className="px-6 py-5">
                    <Link
                      href={`/distribuidor/${slug}/datos/nueva?period=${row.periodKey}`}
                      className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline cursor-pointer"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-10 flex items-center gap-3 text-sm text-gray-500">
        <span className="whitespace-nowrap">Página {safePage} de {totalPages}</span>

        <div className="flex-1 flex items-center justify-center gap-1">
          <button onClick={() => setPage(1)} disabled={safePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <span className="text-xs font-bold">«</span>
          </button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <RiArrowLeftSLine className="w-4 h-4" />
          </button>
          {paginationRange.map((n, i) =>
            n === "..." ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
            ) : (
              <button
                key={n}
                onClick={() => setPage(n as number)}
                className={cn(
                  "min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors",
                  safePage === n
                    ? "bg-gray-100 text-gray-900 font-semibold"
                    : "hover:bg-gray-50 text-gray-500"
                )}
              >
                {n}
              </button>
            )
          )}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <RiArrowRightSLine className="w-4 h-4" />
          </button>
          <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <span className="text-xs font-bold">»</span>
          </button>
        </div>

        <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 transition-colors">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ appearance: "none" }}
            className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-5"
          >
            {[5, 10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} / pág.</option>
            ))}
          </select>
          <RiArrowDownSLine className="w-4 h-4 text-gray-400 pointer-events-none absolute right-2" />
        </div>
      </div>
    </div>
  );
}
