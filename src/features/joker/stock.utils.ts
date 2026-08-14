import type { JokerStockItem } from "./joker.types";

// Icono especifico por tipo de corte/pan, no uno solo para todos los
// churrascos o todos los panes: asi se distingue de un vistazo cual es cual.
export function resolveFoodIcon(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("papas")) return "🍟";
  if (lower.includes("pancho") && !lower.includes("pan de")) return "🌭";
  if (lower.includes("chorizo")) return "🥓";
  if (lower.includes("burger")) return "🍔";

  if (lower.startsWith("churrasco")) {
    if (lower.includes("milanesa")) return "🍖";
    if (lower.includes("pollo")) return "🍗";
    if (lower.includes("chivito")) return "🥩";
    if (lower.includes("hamburguesa")) return "🍔";
    return "🥩";
  }

  if (lower.startsWith("pan")) {
    if (lower.includes("queso")) return "🧀";
    if (lower.includes("tortuga")) return "🍞";
    if (lower.includes("pancho")) return "🥖";
    if (lower.includes("chivito")) return "🥙";
    if (lower.includes("sandwich")) return "🫓";
    if (lower.includes("jambi")) return "🥐";
    return "🍞";
  }

  return "📦";
}

// Icono generico por categoria, para insumos que no son comida (bebidas,
// otros) donde no vale la pena distinguir uno por uno.
export function resolveCategoryIcon(category: JokerStockItem["category"]): string {
  if (category === "bebida") return "🥤";
  if (category === "comida") return "🍽️";
  return "📦";
}

export type StockSeverity = "red" | "yellow" | null;

// Umbrales de "queda poco": distintos segun la unidad, porque no es lo
// mismo "quedan 3 cocas" que "quedan 3 gramos de papas". Para insumos
// pesados (gramos/kg) se usa una referencia razonable para una bolsa
// tipica; para el resto (unidad) un umbral chico fijo.
export function getStockSeverity(item: Pick<JokerStockItem, "quantity" | "unit">): StockSeverity {
  const redThreshold = item.unit === "kg" ? 0.5 : item.unit === "gramos" ? 500 : 3;
  const yellowThreshold = item.unit === "kg" ? 1.5 : item.unit === "gramos" ? 1500 : 5;

  if (item.quantity <= redThreshold) return "red";
  if (item.quantity <= yellowThreshold) return "yellow";
  return null;
}
