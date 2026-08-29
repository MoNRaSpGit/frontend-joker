import { API_BASE_URL, readJson } from "./shared";
import type { JokerStockItem } from "../joker.types";

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
