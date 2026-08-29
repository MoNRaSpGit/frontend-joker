import { API_BASE_URL, readJson } from "./shared";
import type { JokerAccountEntry, JokerAccountPayment, JokerAccountSettlement } from "../joker.types";

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

type AccountPaymentListResponse = {
  items: JokerAccountPayment[];
};

type AccountPaymentResponse = {
  item: JokerAccountPayment;
};

// Pago parcial o total de cuenta corriente -- no borra boletas (a
// diferencia de settleAccount), el backend reparte el monto contra las
// boletas mas viejas y recien archiva/cierra todo si el pago cubre el
// saldo completo.
export async function createAccountPayment(clientId: number, amount: number): Promise<AccountPaymentResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/account-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, amount })
  });
  return readJson<AccountPaymentResponse>(response);
}

// Pagos abiertos de todos los clientes -- para calcular "Debe $X" en el
// listado (boletas abiertas menos pagos abiertos), igual que
// listAccountEntries.
export async function listOpenAccountPayments(): Promise<AccountPaymentListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/account-payments`, { cache: "no-store" });
  return readJson<AccountPaymentListResponse>(response);
}

// Historial completo (abiertos + ya cerrados) de pagos de un cliente
// puntual, para mostrar en su detalle.
export async function getAccountPayments(clientId: number): Promise<AccountPaymentListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/account-payments/client/${clientId}`, { cache: "no-store" });
  return readJson<AccountPaymentListResponse>(response);
}
