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

  const clientesPorVendedor = entry.numVendedores > 0 ? activadosBase / entry.numVendedores : 0;
  const cajasPorCliente     = activadosBase > 0        ? cajasBase / activadosBase            : 0;
  const cajasPorVendedor    = entry.numVendedores > 0  ? cajasBase / entry.numVendedores      : 0;

  const rentabilidad = cajasMeta * entry.margenGanancia * 1000; // approx
  const rebateTotal = cajasMeta * entry.rebate * 1000;

  return {
    activadosBase,
    activadosMeta,
    pctActivacionMeta: entry.totalCartera > 0 ? activadosMeta / entry.totalCartera : 0,
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
