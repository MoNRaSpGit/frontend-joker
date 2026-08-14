import type { JokerStockItem } from "./joker.types";

// Para mostrar en pantalla nunca se ve negativo (el numero real puede irse
// a negativo si se vendio de mas sin reponer, pero mostrar "-8" confunde
// mas de lo que ayuda): se limita a 0 como piso solo para lo que se ve, el
// valor real en la base no cambia.
export function clampDisplayQuantity(quantity: number): number {
  return Math.max(0, quantity);
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
