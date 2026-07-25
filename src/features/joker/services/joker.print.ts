import { printOrderTicketByQz } from "./joker.qzPrint";
import { printOrderTicketByWebUsb } from "./joker.webusbPrint";
import type { JokerOrderItem, JokerSettings } from "../joker.types";

// Orden: WebUSB primero (impresora por USB sin ningun software de por
// medio), QZ Tray como respaldo (PC de escritorio).
export async function printOrderTicket(order: JokerOrderItem[], settings: JokerSettings) {
  try {
    await printOrderTicketByWebUsb(order, settings);
    return { method: "webusb" as const };
  } catch (webUsbError) {
    console.warn("[joker-print] WebUSB fallo, probando QZ.", webUsbError);
  }

  await printOrderTicketByQz(order, settings);
  return { method: "qz" as const };
}
