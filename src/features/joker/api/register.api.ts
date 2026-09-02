import { API_BASE_URL, readJson } from "./shared";
import type { JokerRegisterCloseSummary, JokerRegisterState } from "../joker.types";

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

// La caja propia del Usuario (endpoints /joker/user-register/...) ya no
// existe -- "Mostrador" pasa a ser una tarjeta mas en Delivery, que solo
// el Administrador habilita/liquida (ver JokerCourierService/DeliveryScreen,
// courier con isCounter=true).
