export type Region = {
  id: string;
  name: string;
  slug: string;
};

export type Distributor = {
  id: string;
  regionId: string;
  name: string;
  slug: string;
  status: "active" | "paused" | "inactive";
  email: string;
};

export type MonthlyEntry = {
  id: string;
  distributorId: string;
  periodYear: number;
  periodMonth: number;
  // Inputs
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
  // Targets (set by manager)
  metaActivacion?: number;
  metaFritz?: number;
  metaSkus?: number;
  metaCajas?: number;
};

export const regions: Region[] = [
  { id: "1", name: "Capital", slug: "capital" },
  { id: "2", name: "Oriente", slug: "oriente" },
  { id: "3", name: "Centro", slug: "centro" },
  { id: "4", name: "Centro Occidente", slug: "centrooccidente" },
  { id: "5", name: "Occidente", slug: "occidente" },
  { id: "6", name: "Andes", slug: "andes" },
];

export const distributors: Distributor[] = [
  // Capital
  { id: "d1", regionId: "1", name: "DIFRITZ", slug: "difritz", status: "active", email: "difritz@example.com" },
  { id: "d2", regionId: "1", name: "Costa Norte", slug: "costa-norte", status: "active", email: "costanorte@example.com" },
  { id: "d3", regionId: "1", name: "Gran Atlántico", slug: "gran-atlantico", status: "active", email: "granatlantico@example.com" },
  { id: "d4", regionId: "1", name: "Arocha", slug: "arocha", status: "active", email: "arocha@example.com" },
  // Oriente
  { id: "d5", regionId: "2", name: "Grupo Sonreír", slug: "grupo-sonreir", status: "active", email: "gruposonreir@example.com" },
  { id: "d6", regionId: "2", name: "Di Santino", slug: "di-santino", status: "active", email: "disantino@example.com" },
  { id: "d7", regionId: "2", name: "El Novillo", slug: "el-novillo", status: "active", email: "elnovillo@example.com" },
  { id: "d8", regionId: "2", name: "MAYAM", slug: "mayam", status: "paused", email: "mayam@example.com" },
  { id: "d9", regionId: "2", name: "NRJ", slug: "nrj", status: "active", email: "nrj@example.com" },
  { id: "d10", regionId: "2", name: "MAXITORQUE", slug: "maxitorque", status: "active", email: "maxitorque@example.com" },
  { id: "d11", regionId: "2", name: "ZOZO", slug: "zozo", status: "active", email: "zozo@example.com" },
  { id: "d12", regionId: "2", name: "F&S Distribución", slug: "fys-distribucion", status: "active", email: "fysdistribucion@example.com" },
  { id: "d13", regionId: "2", name: "F&S Oriente", slug: "fys-oriente", status: "active", email: "fysoriente@example.com" },
  { id: "d14", regionId: "2", name: "DISTRIMAX", slug: "distrimax", status: "active", email: "distrimax@example.com" },
  { id: "d15", regionId: "2", name: "JJM", slug: "jjm", status: "active", email: "jjm@example.com" },
  { id: "d16", regionId: "2", name: "Todo Sur", slug: "todo-sur", status: "active", email: "todosur@example.com" },
  { id: "d17", regionId: "2", name: "Los Samanes", slug: "los-samanes", status: "active", email: "lossamanes@example.com" },
  { id: "d18", regionId: "2", name: "Excelencia OLA", slug: "excelencia-ola", status: "paused", email: "excelenciaola@example.com" },
  { id: "d19", regionId: "2", name: "Distribuidora JM", slug: "distribuidora-jm", status: "active", email: "distribuidorajm@example.com" },
  // Centro
  { id: "d20", regionId: "3", name: "DIMONCA", slug: "dimonca", status: "active", email: "dimonca@example.com" },
  { id: "d21", regionId: "3", name: "ROMAR R&B", slug: "romar-rb", status: "active", email: "romarrb@example.com" },
  { id: "d22", regionId: "3", name: "AGROD Don Manuel", slug: "agrod-don-manuel", status: "active", email: "agroddonmanuel@example.com" },
  { id: "d23", regionId: "3", name: "MARIMAR", slug: "marimar", status: "active", email: "marimar@example.com" },
  { id: "d24", regionId: "3", name: "DELILUSO", slug: "deliluso", status: "active", email: "deliluso@example.com" },
  { id: "d25", regionId: "3", name: "TRALODI", slug: "tralodi", status: "active", email: "tralodi@example.com" },
  // Centro Occidente
  { id: "d26", regionId: "4", name: "La Campirana", slug: "la-campirana", status: "active", email: "lacampirana@example.com" },
  { id: "d27", regionId: "4", name: "VIVELAC", slug: "vivelac", status: "active", email: "vivelac@example.com" },
  { id: "d28", regionId: "4", name: "LOARI", slug: "loari", status: "active", email: "loari@example.com" },
  { id: "d29", regionId: "4", name: "Koach", slug: "koach", status: "active", email: "koach@example.com" },
  { id: "d30", regionId: "4", name: "Uno Plus Distribuciones", slug: "uno-plus", status: "active", email: "unoplus@example.com" },
  { id: "d31", regionId: "4", name: "Distribuidora Yonlui", slug: "yonlui", status: "active", email: "yonlui@example.com" },
  { id: "d32", regionId: "4", name: "Comercializadora Cianfar", slug: "cianfar", status: "active", email: "cianfar@example.com" },
  // Occidente
  { id: "d33", regionId: "5", name: "Hechos Distribuciones", slug: "hechos-distribuciones", status: "active", email: "hechos@example.com" },
  { id: "d34", regionId: "5", name: "RIVEGA Falcón", slug: "rivega-falcon", status: "active", email: "rivega@example.com" },
  { id: "d35", regionId: "5", name: "Corp. Alimentos El Mene", slug: "el-mene", status: "active", email: "elmene@example.com" },
  { id: "d36", regionId: "5", name: "Alimentos Luna", slug: "alimentos-luna", status: "active", email: "alimentosluna@example.com" },
  { id: "d37", regionId: "5", name: "Inversiones Doña Dila", slug: "dona-dila", status: "active", email: "donadila@example.com" },
  { id: "d38", regionId: "5", name: "COROCCIDENTAL", slug: "coroccidental", status: "active", email: "coroccidental@example.com" },
  { id: "d39", regionId: "5", name: "Maxi Distribuciones Paraguaná", slug: "maxi-paraguana", status: "paused", email: "maxiparaguana@example.com" },
  // Andes
  { id: "d40", regionId: "6", name: "Distribuidora Doña Teresita", slug: "dona-teresita", status: "active", email: "donateresita@example.com" },
  { id: "d41", regionId: "6", name: "DALANMAR", slug: "dalanmar", status: "active", email: "dalanmar@example.com" },
  { id: "d42", regionId: "6", name: "ANDASEB", slug: "andaseb", status: "active", email: "andaseb@example.com" },
  { id: "d43", regionId: "6", name: "Distribuidora Andalucía", slug: "andalucia", status: "active", email: "andalucia@example.com" },
  { id: "d44", regionId: "6", name: "ARASIMPORT", slug: "arasimport", status: "active", email: "arasimport@example.com" },
  { id: "d45", regionId: "6", name: "TATOOS EXPRESS", slug: "tatoos-express", status: "active", email: "tatoosexpress@example.com" },
  { id: "d46", regionId: "6", name: "DISERMAT", slug: "disermat", status: "active", email: "disermat@example.com" },
];

// Seeded PRNG (mulberry32) — deterministic on server & client
function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
  };
}

function hashStr(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function generateEntry(distributorId: string, year: number, month: number): MonthlyEntry {
  const rand = createRng(hashStr(`${distributorId}-${year}-${month}`));
  const randBetween = (min: number, max: number) =>
    Math.round((rand() * (max - min) + min) * 100) / 100;
  const totalCartera = Math.round(randBetween(400, 2500));
  const pctActivacion = randBetween(0.45, 0.9);
  const pctClientesFritz = randBetween(0.4, 1.0);
  return {
    id: `${distributorId}-${year}-${month}`,
    distributorId,
    periodYear: year,
    periodMonth: month,
    totalCartera,
    pctActivacion,
    pctClientesFritz,
    pctIncrementoActivos: randBetween(0.1, 0.35),
    pctIncrementoFritz: randBetween(0.1, 0.5),
    totalSkusFritz: Math.round(randBetween(15, 55)),
    pctIncrementoSkus: randBetween(0.5, 1.5),
    cajasPromedio: Math.round(randBetween(1000, 25000)),
    pctIncrementoSellOut: randBetween(0.15, 0.5),
    numVendedores: Math.round(randBetween(5, 15)),
    pctIncrementoVendedores: randBetween(0.1, 0.4),
    margenGanancia: randBetween(0.1, 0.2),
    rebate: 0.01,
    comentarios: "",
    metaActivacion: pctActivacion + 0.15,
    metaFritz: pctClientesFritz + 0.1,
  };
}

// Generate entries for Sep, Oct, Nov 2025, Jan, Feb 2026
const periods = [
  { year: 2025, month: 9 },
  { year: 2025, month: 10 },
  { year: 2025, month: 11 },
  { year: 2026, month: 1 },
  { year: 2026, month: 2 },
];

export const monthlyEntries: MonthlyEntry[] = distributors.flatMap((d) =>
  periods.map((p) => generateEntry(d.id, p.year, p.month))
);

export function getEntries(distributorId: string) {
  return monthlyEntries.filter((e) => e.distributorId === distributorId);
}

export function getLatestEntry(distributorId: string) {
  const entries = getEntries(distributorId).sort(
    (a, b) => b.periodYear * 100 + b.periodMonth - (a.periodYear * 100 + a.periodMonth)
  );
  return entries[0] ?? null;
}

export function getPreviousEntry(distributorId: string, year: number, month: number) {
  const entries = getEntries(distributorId).sort(
    (a, b) => b.periodYear * 100 + b.periodMonth - (a.periodYear * 100 + a.periodMonth)
  );
  const idx = entries.findIndex((e) => e.periodYear === year && e.periodMonth === month);
  return entries[idx + 1] ?? null;
}

// Calculator functions (mirror Excel logic)
export function calcular(entry: MonthlyEntry) {
  const activadosBase = entry.totalCartera * entry.pctActivacion;
  const activadosMeta = activadosBase * (1 + entry.pctIncrementoActivos);

  const fritzeBase = activadosBase * entry.pctClientesFritz;
  const fritzMeta = activadosMeta * (entry.metaFritz ?? entry.pctClientesFritz + 0.1);

  const skusBase = entry.totalSkusFritz;
  const skusMeta = skusBase * (1 + entry.pctIncrementoSkus);

  const cajasBase = entry.cajasPromedio;
  const cajasMeta = cajasBase * (1 + entry.pctIncrementoSellOut);

  const vendedoresMeta = entry.numVendedores * (1 + entry.pctIncrementoVendedores);

  const clientesPorVendedor = activadosBase / entry.numVendedores;
  const cajasPorCliente = cajasBase / activadosBase;
  const cajasPorVendedor = cajasBase / entry.numVendedores;

  const rentabilidad = cajasMeta * entry.margenGanancia * 1000; // approx
  const rebateTotal = cajasMeta * entry.rebate * 1000;

  return {
    activadosBase,
    activadosMeta,
    pctActivacionMeta: activadosMeta / entry.totalCartera,
    fritzeBase,
    fritzMeta,
    skusBase,
    skusMeta,
    cajasBase,
    cajasMeta,
    vendedoresMeta,
    clientesPorVendedor,
    cajasPorCliente,
    cajasPorVendedor,
    rentabilidad,
    rebateTotal,
  };
}

export function formatPeriod(year: number, month: number) {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[month - 1]} ${year}`;
}

export function delta(current: number, previous: number) {
  if (!previous) return 0;
  return (current - previous) / previous;
}
