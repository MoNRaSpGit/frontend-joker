import qz from "qz-tray";
import { buildOrderTicketLines } from "./joker.ticketFormat";
import type { JokerOrderItem } from "../joker.types";

const FALLBACK_PREFERRED_PRINTER = "ImpRamon";

let cachedPrinterName = FALLBACK_PREFERRED_PRINTER;

function pickPrinterName(printers: string[] = []) {
  const list = Array.isArray(printers) ? printers : [];
  const physical = list.filter((name) => !/pdf|xps|onenote|fax|microsoft print to pdf/i.test(String(name || "")));
  if (!physical.length) {
    return "";
  }

  const preferred = physical.find((name) => /xprinter|xp-|pos|thermal|receipt/i.test(String(name || "")));
  return preferred || physical[0];
}

async function ensureQzConnected() {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

export async function printOrderTicketByQz(order: JokerOrderItem[]) {
  await ensureQzConnected();
  const data = buildOrderTicketLines(order);

  const attemptPrinter = async (printerName: string) => {
    const config = qz.configs.create(printerName, { encoding: "CP437" });
    await qz.print(config, data);
    cachedPrinterName = printerName;
    return { printerName };
  };

  if (cachedPrinterName) {
    try {
      return await attemptPrinter(cachedPrinterName);
    } catch {
      // Si falla, intentar descubrimiento una sola vez.
    }
  }

  const printers = await qz.printers.find();
  const printerName = pickPrinterName(printers);
  if (!printerName) {
    const detected = Array.isArray(printers) && printers.length ? printers.join(", ") : "ninguna";
    throw new Error(`QZ no encontro una impresora termica (Xprinter/POS). Detectadas: ${detected}`);
  }

  return attemptPrinter(printerName);
}
