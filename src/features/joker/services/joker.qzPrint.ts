import qz from "qz-tray";
import { buildOrderTicketLines } from "./joker.ticketFormat";
import type { JokerOrderItem, JokerPaymentMethod } from "../joker.types";

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

// Envia lineas ya armadas (por buildOrderTicketLines o cualquier otro
// formato de ticket) directo a la impresora via QZ Tray. Reusable por
// cualquier tipo de ticket, no solo pedidos.
export async function printRawLinesByQz(lines: string[]) {
  await ensureQzConnected();

  if (!cachedPrinterName) {
    throw new Error("Todavia no elegiste una impresora. Toca \"Impresora\" para elegirla.");
  }

  const config = qz.configs.create(cachedPrinterName, { encoding: "CP437" });

  try {
    await qz.print(config, lines);
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

export async function printOrderTicketByQz(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  deliveryCost: string,
  ticketNumber: number
) {
  const data = buildOrderTicketLines(order, orderAddress, copies, paymentMethod, customerName, deliveryCost, ticketNumber);
  return printRawLinesByQz(data);
}
