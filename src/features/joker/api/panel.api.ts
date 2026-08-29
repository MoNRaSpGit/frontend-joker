import { API_BASE_URL, readJson } from "./shared";
import type { JokerMonthHistoryItem, JokerMonthSummary } from "../joker.types";

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
