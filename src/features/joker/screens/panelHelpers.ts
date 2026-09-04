import { getStoreDateLabel } from "../joker.storeDate";
import type { JokerOrderRecord, JokerPaymentMethod } from "../joker.types";

// Compartido entre PanelScreen (Administrador) y UserPanelScreen (Usuario)
// -- las dos pantallas muestran el mismo tipo de resumen (vendido,
// ganancia, tipo de pagos, ranking) sobre listas de pedidos distintas, asi
// que toda la logica de formato/calculo vive aca una sola vez.

export const PROFIT_RATE_STORAGE_KEY = "joker.profitRatePercent";
export const DEFAULT_PROFIT_RATE_PERCENT = 30;
export const PAYMENT_METHODS: JokerPaymentMethod[] = ["efectivo", "tarjeta", "transferencia", "cuenta"];
export const MOVEMENTS_PREVIEW_COUNT = 3;
export const MEDALS = ["🥇", "🥈", "🥉"];
export const MEDAL_CLASSES = ["joker-qty-badge--gold", "joker-qty-badge--silver", "joker-qty-badge--bronze"];

export function getStoredProfitRatePercent() {
  if (typeof window === "undefined") return DEFAULT_PROFIT_RATE_PERCENT;
  const raw = window.localStorage.getItem(PROFIT_RATE_STORAGE_KEY);
  if (raw === null) return DEFAULT_PROFIT_RATE_PERCENT;
  const stored = Number(raw);
  return Number.isFinite(stored) && stored >= 0 ? stored : DEFAULT_PROFIT_RATE_PERCENT;
}

export function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

// Nombre para mostrar en Movimientos, sacandole el sufijo " MOSTRADOR"
// (que es una marca interna, no el nombre real que escribio nadie -- ver
// PanelScreen#handleAssignCounter). Si no queda nada (el pedido nunca
// tuvo nombre, o solo tenia la marca), devuelve "" para que el que llama
// pueda mostrar el guion por defecto.
export function getDisplayCustomerName(order: JokerOrderRecord) {
  return (order.customerName?.trim() ?? "").replace(/\s*MOSTRADOR\s*$/i, "").trim();
}

// Si el pedido tiene una fecha editada a mano (orderDate), esa es la que se
// muestra. Si no, se usa el DIA COMERCIAL de cuando se creo (arranca a las
// 5am, no a medianoche) -- no el dia de calendario crudo, que hacia que un
// pedido cargado a la 1am mostrara "el dia siguiente" (ver joker.storeDate.ts).
// La hora siempre sale de created_at tal cual (no se edita).
export function formatDateTime(isoDate: string, orderDate?: string | null) {
  const date = new Date(isoDate);
  const dateLabelSource = orderDate ?? getStoreDateLabel(isoDate);
  const dateLabel = new Date(`${dateLabelSource}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

export function buildPaymentTotals(orders: JokerOrderRecord[]) {
  const totals: Record<JokerPaymentMethod, number> = { efectivo: 0, tarjeta: 0, transferencia: 0, cuenta: 0 };

  for (const order of orders) {
    totals[order.paymentMethod] += order.total;
  }

  return totals;
}

export function buildRanking(orders: JokerOrderRecord[]) {
  const countByProduct = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items) {
      countByProduct.set(item.productName, (countByProduct.get(item.productName) ?? 0) + item.quantity);
    }
  }

  return Array.from(countByProduct.entries())
    .map(([productName, quantity]) => ({ productName, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
}
