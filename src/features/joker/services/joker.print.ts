import { printOrderTicketByQz } from "./joker.qzPrint";
import { printOrderTicketByWebUsb } from "./joker.webusbPrint";
import type { JokerOrderItem } from "../joker.types";

// Orden: WebUSB primero (impresora por USB sin ningun software de por
// medio), QZ Tray como respaldo (PC de escritorio).
export async function printOrderTicket(order: JokerOrderItem[]) {
  try {
    await printOrderTicketByWebUsb(order);
    return { method: "webusb" as const };
  } catch (webUsbError) {
    console.warn("[joker-print] WebUSB fallo, probando QZ.", webUsbError);
  }

  await printOrderTicketByQz(order);
  return { method: "qz" as const };
}
