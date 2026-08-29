import { API_BASE_URL } from "../../shared/config/api";
import type {
  JokerAccountEntry,
  JokerAccountSettlement,
  JokerClient,
  JokerCourier,
  JokerCourierCashMovementType,
  JokerCourierCashSummary,
  JokerMonthHistoryItem,
  JokerMonthSummary,
  JokerOrderItem,
  JokerOrderRecord,
  JokerPaymentMethod,
  JokerProduct,
  JokerProductRecipeLine,
  JokerRegisterCloseSummary,
  JokerRegisterState,
  JokerStockItem
} from "./joker.types";

type ProductListResponse = {
  items: JokerProduct[];
};

type ProductResponse = {
  item: JokerProduct;
};

export type JokerProductInput = {
  name: string;
  category: string;
  price: number;
  // Solo se usa al crear un producto autonomo (ver ProductFormModal): el
  // backend le crea de una un insumo propio con esta cantidad. updateProduct
  // lo ignora si viene, el DTO de edicion no lo contempla.
  initialStock?: number;
};

type OrderListResponse = {
  items: JokerOrderRecord[];
};

type OrderResponse = {
  item: JokerOrderRecord;
};

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const fallbackText = await response.text().catch(() => "");
    let parsedMessage: string | undefined;
    try {
      const parsed = JSON.parse(fallbackText) as { message?: string | string[] };
      parsedMessage = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
    } catch {
      // El cuerpo no era JSON, se usa el texto crudo como fallback.
    }
    throw new Error(parsedMessage || fallbackText || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function listProducts(): Promise<ProductListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products`, { cache: "no-store" });
  return readJson<ProductListResponse>(response);
}

export async function createProduct(input: JokerProductInput): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<ProductResponse>(response);
}

export async function updateProduct(productId: number, input: JokerProductInput): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<ProductResponse>(response);
}

export async function deleteProduct(productId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

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
  clientId?: number
): Promise<OrderResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, orderDate, courierId, deliveryCost, paymentMethod, clientId })
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

type CourierListResponse = {
  items: JokerCourier[];
};

type CourierResponse = {
  item: JokerCourier;
};

export async function listCouriers(): Promise<CourierListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/couriers`, { cache: "no-store" });
  return readJson<CourierListResponse>(response);
}

export async function updateCourier(courierId: number, name: string): Promise<CourierResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/couriers/${courierId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  return readJson<CourierResponse>(response);
}

export async function enableCourier(courierId: number): Promise<CourierResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/couriers/${courierId}/habilitar`, { method: "POST" });
  return readJson<CourierResponse>(response);
}

export async function settleCourier(courierId: number, hourlyRate?: number, hoursWorked?: number): Promise<CourierResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/couriers/${courierId}/liquidar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hourlyRate, hoursWorked })
  });
  return readJson<CourierResponse>(response);
}

export async function getCourierCashSummary(courierId: number): Promise<JokerCourierCashSummary> {
  const response = await fetch(`${API_BASE_URL}/joker/couriers/${courierId}/cash-summary`, { cache: "no-store" });
  return readJson<JokerCourierCashSummary>(response);
}

export async function addCourierCashMovement(
  courierId: number,
  type: JokerCourierCashMovementType,
  amount: number,
  description?: string
): Promise<JokerCourierCashSummary> {
  const response = await fetch(`${API_BASE_URL}/joker/couriers/${courierId}/cash-movements`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, amount, description })
  });
  const result = await readJson<{ item: JokerCourierCashSummary }>(response);
  return result.item;
}

export async function resetOrders(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/orders`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

type ClientListResponse = {
  items: JokerClient[];
};

type ClientResponse = {
  item: JokerClient;
};

export type JokerClientInput = {
  name: string;
  phone?: string;
  address?: string;
};

export async function listClients(): Promise<ClientListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/clients`, { cache: "no-store" });
  return readJson<ClientListResponse>(response);
}

export async function createClient(input: JokerClientInput): Promise<ClientResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<ClientResponse>(response);
}

export async function deleteClient(clientId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/clients/${clientId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

type AccountEntryListResponse = {
  items: JokerAccountEntry[];
};

type AccountEntryResponse = {
  item: JokerAccountEntry;
};

export async function listAccountEntries(): Promise<AccountEntryListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/account-entries`, { cache: "no-store" });
  return readJson<AccountEntryListResponse>(response);
}

export async function createAccountEntry(
  clientId: number,
  total: number,
  items: Array<{ productName: string; quantity: number; unitPrice: number }>,
  orderId?: number
): Promise<AccountEntryResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/account-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, orderId, total, items })
  });
  return readJson<AccountEntryResponse>(response);
}

// Salda la cuenta de un cliente (borra su historial de consumos) sin
// eliminar al cliente.
export async function settleAccount(clientId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/account-entries/client/${clientId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

type AccountSettlementListResponse = {
  items: JokerAccountSettlement[];
};

// Respaldo permanente de consumos ya pagados (o de clientes eliminados con
// deuda pendiente), para reclamos ("el cliente dice que no debia eso").
export async function getAccountSettlements(clientId: number): Promise<AccountSettlementListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/account-settlements/client/${clientId}`, { cache: "no-store" });
  return readJson<AccountSettlementListResponse>(response);
}

type StockItemListResponse = {
  items: JokerStockItem[];
};

type StockItemResponse = {
  item: JokerStockItem;
};

export async function listStockItems(): Promise<StockItemListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/stock-items`, { cache: "no-store" });
  return readJson<StockItemListResponse>(response);
}

export async function createStockItem(
  name: string,
  unit: string,
  quantity: number,
  category?: "comida" | "bebida" | "otro"
): Promise<StockItemResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/stock-items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, unit, quantity, category })
  });
  return readJson<StockItemResponse>(response);
}

export async function restockItem(stockItemId: number, quantity: number): Promise<StockItemResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/stock-items/${stockItemId}/restock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity })
  });
  return readJson<StockItemResponse>(response);
}

// Fija el stock a un valor exacto (a diferencia de restock, que suma/resta).
export async function updateStockItemQuantity(stockItemId: number, quantity: number): Promise<StockItemResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/stock-items/${stockItemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity })
  });
  return readJson<StockItemResponse>(response);
}

export async function deleteStockItem(stockItemId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/stock-items/${stockItemId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

type ProductRecipeResponse = {
  items: JokerProductRecipeLine[];
};

export async function getProductRecipe(productId: number): Promise<ProductRecipeResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}/recipe`, { cache: "no-store" });
  return readJson<ProductRecipeResponse>(response);
}

export async function setProductRecipe(
  productId: number,
  items: Array<{ stockItemId: number; quantityPerUnit: number }>
): Promise<ProductRecipeResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}/recipe`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  return readJson<ProductRecipeResponse>(response);
}

export async function bulkApplyRecipe(
  category: string,
  items: Array<{ stockItemId: number; quantityPerUnit: number }>
): Promise<{ affectedProducts: number }> {
  const response = await fetch(`${API_BASE_URL}/joker/recipes/bulk-apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, items })
  });
  return readJson<{ affectedProducts: number }>(response);
}

export async function getRegisterState(): Promise<JokerRegisterState> {
  const response = await fetch(`${API_BASE_URL}/joker/register/state`, { cache: "no-store" });
  return readJson<JokerRegisterState>(response);
}

export async function openRegister(): Promise<JokerRegisterState> {
  const response = await fetch(`${API_BASE_URL}/joker/register/open`, { method: "POST" });
  return readJson<JokerRegisterState>(response);
}

export async function closeRegister(summary: JokerRegisterCloseSummary): Promise<JokerRegisterState> {
  const response = await fetch(`${API_BASE_URL}/joker/register/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(summary)
  });
  return readJson<JokerRegisterState>(response);
}

export async function getResumenMes(anio: number, mes: number): Promise<JokerMonthSummary> {
  const response = await fetch(`${API_BASE_URL}/joker/panel/mes/${anio}/${mes}`, { cache: "no-store" });
  return readJson<JokerMonthSummary>(response);
}

export async function getHistorialMeses(cantidad: number): Promise<{ items: JokerMonthHistoryItem[] }> {
  const response = await fetch(`${API_BASE_URL}/joker/panel/historial-meses?cantidad=${cantidad}`, { cache: "no-store" });
  return readJson<{ items: JokerMonthHistoryItem[] }>(response);
}

// Corrige el cierre de un dia comercial ya cerrado (ej: se cargo un pedido
// fuera del sistema y el cierre automatico quedo corto). Desde ahi ese
// valor queda como fuente de verdad, el cierre automatico de las 5am ya no
// lo vuelve a pisar.
export async function editarCierreDia(fecha: string, total: number): Promise<{ item: { fecha: string; total: number; editadoManualmente: boolean } }> {
  const response = await fetch(`${API_BASE_URL}/joker/cierres/${fecha}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ total })
  });
  return readJson<{ item: { fecha: string; total: number; editadoManualmente: boolean } }>(response);
}

// Login simple por rol (Administrador/Usuario): valida la contrasena
// contra el hash guardado en la base. Tira error (readJson) si no
// coincide -- readJson ya arma un mensaje legible a partir del 401.
export async function loginJoker(role: "administrador" | "usuario", password: string): Promise<{ ok: true }> {
  const response = await fetch(`${API_BASE_URL}/joker/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, password })
  });
  return readJson<{ ok: true }>(response);
}
