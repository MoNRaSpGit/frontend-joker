import { API_BASE_URL, readJson } from "./shared";
import type { JokerRegisterCloseSummary, JokerRegisterState, JokerUserRegisterState } from "../joker.types";

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

// Caja propia del Usuario -- misma forma que la de arriba, pero endpoints
// separados (/joker/user-register/...) porque es una caja aparte con su
// propio monto inicial.
export async function getUserRegisterState(): Promise<JokerUserRegisterState> {
  const response = await fetch(`${API_BASE_URL}/joker/user-register/state`, { cache: "no-store" });
  return readJson<JokerUserRegisterState>(response);
}

export async function openUserRegister(initialCash: number): Promise<JokerUserRegisterState> {
  const response = await fetch(`${API_BASE_URL}/joker/user-register/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initialCash })
  });
  return readJson<JokerUserRegisterState>(response);
}

export async function closeUserRegister(summary: JokerRegisterCloseSummary): Promise<JokerUserRegisterState> {
  const response = await fetch(`${API_BASE_URL}/joker/user-register/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(summary)
  });
  return readJson<JokerUserRegisterState>(response);
}
