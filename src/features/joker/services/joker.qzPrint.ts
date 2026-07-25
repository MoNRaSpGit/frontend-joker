import qz from "qz-tray";
import { buildOrderTicketLines } from "./joker.ticketFormat";
import type { JokerOrderItem } from "../joker.types";

const PREFERRED_PRINTER_STORAGE_KEY = "joker.qz.preferredPrinter";

function readPreferredPrinter(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PREFERRED_PRINTER_STORAGE_KEY);
}

let cachedPrinterName: string | null = readPreferredPrinter();

export function getPreferredPrinterName() {
  return cachedPrinterName;
}

export function setPreferredPrinterName(name: string) {
  cachedPrinterName = name;
  window.localStorage.setItem(PREFERRED_PRINTER_STORAGE_KEY, name);
}

export function clearPreferredPrinterName() {
  cachedPrinterName = null;
  window.localStorage.removeItem(PREFERRED_PRINTER_STORAGE_KEY);
}

async function ensureQzConnected() {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

export async function listQzPrinters() {
  await ensureQzConnected();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [];
}

export async function printOrderTicketByQz(order: JokerOrderItem[], orderAddress: string, copies: number) {
  await ensureQzConnected();

  if (!cachedPrinterName) {
    throw new Error("Todavia no elegiste una impresora. Toca \"Impresora\" para elegirla.");
  }

  const data = buildOrderTicketLines(order, orderAddress, copies);
  const config = qz.configs.create(cachedPrinterName, { encoding: "CP437" });

  try {
    await qz.print(config, data);
  } catch (error) {
    // Si la impresora guardada ya no existe (se cambio de equipo), se
    // avisa claro en vez de reintentar con una elegida al azar.
    throw new Error(
      `No se pudo imprimir en "${cachedPrinterName}". ${
        error instanceof Error ? error.message : "Revisa que siga siendo la impresora correcta (boton Impresora)."
      }`
    );
  }

  return { printerName: cachedPrinterName };
}
