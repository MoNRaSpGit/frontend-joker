import { API_BASE_URL, readJson } from "./shared";
import type { JokerOrderItem, JokerOrderRecord, JokerPaymentMethod } from "../joker.types";

type OrderListResponse = {
  items: JokerOrderRecord[];
};

type OrderResponse = {
  item: JokerOrderRecord;
};

export async function createOrder(
  order: JokerOrderItem[],
  address: string,
  paymentMethod: JokerPaymentMethod,
  customerName?: string,
  orderDate?: string,
  courierId?: number,
  deliveryCost?: number,
  clientId?: number,
  pending?: boolean
): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address,
      paymentMethod,
      customerName,
      clientId,
      orderDate: orderDate || undefined,
      courierId,
      deliveryCost,
      pending,
      items: order.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        detail: item.detail
      }))
    })
  });
  return readJson<OrderResponse>(response);
}

export type UpdateOrderItemInput = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  detail?: string;
};

// Recalcula el total solo, nunca se manda a mano; el backend ajusta el
// stock automaticamente por la diferencia entre lo viejo y lo nuevo.
// paymentMethod puede pasar a "cuenta" (correccion rapida desde el Panel),
// pero solo junto con clientId -- el backend lo rechaza si falta.
export async function updateOrder(
  orderId: number,
  items: UpdateOrderItemInput[],
  orderDate?: string,
  courierId?: number,
  deliveryCost?: number,
  paymentMethod?: "efectivo" | "tarjeta" | "transferencia" | "cuenta",
  clientId?: number,
  customerName?: string,
  // Saca el repartidor asignado en vez de dejarlo como estaba (que es lo
  // que hace no mandar courierId) -- lo usa PanelScreen#handleAssignCounter
  // para pasar a "Mostrador" un pedido que ya tenia delivery asignado.
  clearCourier?: boolean
): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, orderDate, courierId, deliveryCost, paymentMethod, clientId, customerName, clearCourier })
  });
  return readJson<OrderResponse>(response);
}

// Pedidos del periodo de caja actual (desde el ultimo cierre): lo usa el
// Panel para que el resumen arranque de nuevo despues de cada cierre, y
// Delivery (con courierId) para que la asignacion de pedidos por
// repartidor tambien arranque de nuevo con cada cierre.
export async function listCurrentPeriodOrders(courierId?: number): Promise<OrderListResponse> {
  const params = courierId ? `?courierId=${courierId}` : "";
  const response = await fetch(`${API_BASE_URL}/joker/orders/current-period${params}`, { cache: "no-store" });
  return readJson<OrderListResponse>(response);
}

// Igual que arriba, pero para el Panel del Usuario: pedidos del turno de
// SU caja (desde que la abrio), solo los que el origino (origin_role =
// 'usuario') -- ver JokerOrdersService#listCurrentPeriodOrdersForUser.
export async function listCurrentPeriodOrdersForUser(): Promise<OrderListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/user-register/orders/current-period`, { cache: "no-store" });
  return readJson<OrderListResponse>(response);
}

// Todos los pedidos confirmados de un dia comercial puntual (5am a 5am),
// sin importar de que caja/rol salieron -- es la "foto" que usa Historial
// de ventas. Distinto de listCurrentPeriodOrders (que es el turno de caja
// actual): aca se puede pedir cualquier fecha pasada.
export async function listOrdersByDate(date: string): Promise<OrderListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/orders?date=${date}`, { cache: "no-store" });
  return readJson<OrderListResponse>(response);
}

// Pedidos de mostrador (rol Usuario) en espera de que el Administrador los
// acepte o rechace.
export async function listPendingOrders(): Promise<OrderListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/orders/pending`, { cache: "no-store" });
  return readJson<OrderListResponse>(response);
}

export async function acceptOrder(orderId: number): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/orders/${orderId}/accept`, { method: "POST" });
  return readJson<OrderResponse>(response);
}

export async function rejectOrder(orderId: number): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/orders/${orderId}/reject`, { method: "POST" });
  return readJson<OrderResponse>(response);
}

export async function resetOrders(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/orders`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}
