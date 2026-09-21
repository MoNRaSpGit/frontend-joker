import { API_BASE_URL, readJson } from "./shared";
import type { JokerPaymentAccount } from "../joker.types";

type PaymentAccountListResponse = {
  items: JokerPaymentAccount[];
};

type PaymentAccountResponse = {
  item: JokerPaymentAccount;
};

export type JokerPaymentAccountInput = {
  label: string;
  ownerName: string;
  accountInfo: string;
};

export async function listPaymentAccounts(): Promise<PaymentAccountListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/payment-methods`, { cache: "no-store" });
  return readJson<PaymentAccountListResponse>(response);
}

export async function createPaymentAccount(input: JokerPaymentAccountInput): Promise<PaymentAccountResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/payment-methods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<PaymentAccountResponse>(response);
}

export async function updatePaymentAccount(id: number, input: JokerPaymentAccountInput): Promise<PaymentAccountResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/payment-methods/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<PaymentAccountResponse>(response);
}

export async function deletePaymentAccount(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/payment-methods/${id}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}
