import { API_BASE_URL, readJson } from "./shared";
import type { JokerCourier, JokerCourierCashMovementType, JokerCourierCashSummary } from "../joker.types";

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
