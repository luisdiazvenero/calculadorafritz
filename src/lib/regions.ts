// Colores por región. Estaba duplicado en 6 pantallas, así que al dividir
// Oriente en Norte y Sur había que tocar las 6. Vive acá una sola vez.

export const REGION_COLORS: Record<string, string> = {
  Capital:            "#3B82F6",
  "Oriente Norte":    "#F59E0B",
  "Oriente Sur":      "#D97706",
  Centro:             "#10B981",
  "Centro Occidente": "#F43F5E",
  Occidente:          "#8B5CF6",
  Andes:              "#0891B2",
};

export const REGION_COLOR_FALLBACK = "#94A3B8";

export function regionColor(name: string): string {
  return REGION_COLORS[name] ?? REGION_COLOR_FALLBACK;
}
