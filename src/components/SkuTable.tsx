"use client";
import { useState } from "react";
import { cn } from "@/utils/cn";
import {
  RiSearchLine, RiShareBoxLine,
  RiArrowDownSLine, RiArrowRightSLine, RiArrowUpSLine, RiArrowLeftLine,
} from "@remixicon/react";

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

type SortKey = "sku" | "categoria" | "presentacion" | "tamano";

export default function SkuTable() {
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("all");
  const [presFilter, setPresFilter] = useState("all");
  const [tamFilter,  setTamFilter]  = useState("all");
  const [page,       setPage]       = useState(1);
  const [sortKey,    setSortKey]    = useState<SortKey>("sku");
  const [sortDir,    setSortDir]    = useState<"asc" | "desc">("asc");
  const [pageSize,   setPageSize]   = useState(12);
  const [open,       setOpen]       = useState(true);

  const tamanoMatch = (g: number, f: string) => {
    if (f === "individual") return g <= 300;
    if (f === "estandar")  return g > 300 && g < 1000;
    if (f === "grande")    return g >= 1000;
    return true;
  };

  const filtered = SKU_DATA.filter((r) => {
    const q = search.toLowerCase();
    return (
      (!q || r.sku.toLowerCase().includes(q)) &&
      (catFilter  === "all" || r.categoria    === catFilter)  &&
      (presFilter === "all" || r.presentacion === presFilter) &&
      (tamFilter  === "all" || tamanoMatch(r.tamanoG, tamFilter))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (va < vb) return sortDir === "asc" ? -1 :  1;
    if (va > vb) return sortDir === "asc" ?  1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const paginated  = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const pageRange: (number | "...")[] = [];
  let last = 0;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= safePage - 1 && i <= safePage + 1)) {
      if (last && i - last > 1) pageRange.push("...");
      pageRange.push(i);
      last = i;
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
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

  function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
      <div className="relative flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300 transition-colors">
        <select
          value={value}
          onChange={(e) => { onChange(e.target.value); setPage(1); }}
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
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors cursor-pointer select-none">
          {open ? "Colapsar" : "Expandir"}
          {open ? <RiArrowDownSLine className="w-4 h-4" /> : <RiArrowRightSLine className="w-4 h-4" />}
        </button>
      </div>

      {open && <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden", totalPages <= 1 && "mb-14")}>
        <div className="px-6 py-3.5 flex items-center gap-3 border-b border-gray-100 flex-wrap">
          <div className="relative w-60">
            <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar SKU..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          <Select value={catFilter} onChange={setCatFilter}>
            <option value="all">Categoría</option>
            {Object.keys(CAT_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select value={presFilter} onChange={setPresFilter}>
            <option value="all">Presentación</option>
            {PRESENTACIONES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={tamFilter} onChange={setTamFilter}>
            <option value="all">Tamaño</option>
            {TAMANO_RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <span className="ml-auto text-sm text-gray-400">{sorted.length} registros</span>
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
                  onClick={() => toggleSort(col)}
                  style={{ backgroundColor: "#f7f7f7", color: "#5c5c5c" }}
                  className="px-6 py-3 text-xs font-normal capitalize cursor-pointer hover:text-gray-900 select-none transition-colors whitespace-nowrap text-left"
                >
                  <span className="inline-flex items-center">
                    {{ sku: "SKU", categoria: "Categoría", presentacion: "Presentación", tamano: "Tamaño" }[col]}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-sm text-gray-400">No hay SKUs con esos filtros.</td>
              </tr>
            ) : paginated.map((row, i) => (
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

      {open && totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm text-gray-500 mb-14 pl-6">
          <span className="whitespace-nowrap">Página {safePage} de {totalPages}</span>
          <div className="flex-1 flex items-center justify-center gap-1">
            <button onClick={() => setPage(1)} disabled={safePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <span className="text-xs font-bold">«</span>
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <RiArrowLeftLine className="w-4 h-4" />
            </button>
            {pageRange.map((n, idx) =>
              n === "..." ? (
                <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
              ) : (
                <button key={n} onClick={() => setPage(n as number)}
                  className={cn("min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors",
                    safePage === n ? "bg-gray-100 text-gray-900 font-semibold" : "hover:bg-gray-50 text-gray-500")}>
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
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              style={{ appearance: "none" }} className="text-sm text-gray-700 bg-transparent focus:outline-none cursor-pointer pr-5">
              {[10, 12, 25, 50].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
            </select>
            <RiArrowDownSLine className="w-4 h-4 text-gray-400 pointer-events-none absolute right-2" />
          </div>
        </div>
      )}
    </>
  );
}
