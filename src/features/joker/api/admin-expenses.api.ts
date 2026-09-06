import { API_BASE_URL, readJson } from "./shared";
import type { JokerAdminExpense } from "../joker.types";

type AdminExpenseListResponse = {
  items: JokerAdminExpense[];
};

type AdminExpenseResponse = {
  item: JokerAdminExpense;
};

// Sin fecha: gastos del turno actual (desde el ultimo cierre), lo usa el
// Panel en vivo. Con fecha: gastos de ESE dia comercial, lo usa Historial
// de ventas -- ver ListJokerAdminExpensesDto en el backend.
export async function listAdminExpenses(date?: string): Promise<AdminExpenseListResponse> {
  const url = date ? `${API_BASE_URL}/joker/admin-expenses?date=${date}` : `${API_BASE_URL}/joker/admin-expenses`;
  const response = await fetch(url, { cache: "no-store" });
  return readJson<AdminExpenseListResponse>(response);
}

export async function addAdminExpense(description: string, amount: number): Promise<JokerAdminExpense> {
  const response = await fetch(`${API_BASE_URL}/joker/admin-expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description, amount })
  });
  const result = await readJson<AdminExpenseResponse>(response);
  return result.item;
}

export async function deleteAdminExpense(expenseId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/admin-expenses/${expenseId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}
