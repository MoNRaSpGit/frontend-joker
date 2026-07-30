import { printOrderTicketByQz } from "./joker.qzPrint";
import { printOrderTicketByWebUsb } from "./joker.webusbPrint";
import type { JokerOrderItem, JokerPaymentMethod } from "../joker.types";

// Orden: WebUSB primero (impresora por USB sin ningun software de por
// medio), QZ Tray como respaldo (PC de escritorio).
export async function printOrderTicket(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod,
  customerName: string
) {
  try {
    await printOrderTicketByWebUsb(order, orderAddress, copies, paymentMethod, customerName);
    return { method: "webusb" as const };
  } catch (webUsbError) {
    console.warn("[joker-print] WebUSB fallo, probando QZ.", webUsbError);
  }

  await printOrderTicketByQz(order, orderAddress, copies, paymentMethod, customerName);
  return { method: "qz" as const };
}
