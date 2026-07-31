import { printOrderTicketByQz, printRawLinesByQz } from "./joker.qzPrint";
import { printOrderTicketByWebUsb, printRawLinesByWebUsb } from "./joker.webusbPrint";
import { buildAccountStatementTicketLines } from "./joker.ticketFormat";
import type { JokerAccountEntry, JokerClient, JokerOrderItem, JokerPaymentMethod } from "../joker.types";

// Orden: WebUSB primero (impresora por USB sin ningun software de por
// medio), QZ Tray como respaldo (PC de escritorio).
export async function printOrderTicket(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  deliveryCost: string
) {
  try {
    await printOrderTicketByWebUsb(order, orderAddress, copies, paymentMethod, customerName, deliveryCost);
    return { method: "webusb" as const };
  } catch (webUsbError) {
    console.warn("[joker-print] WebUSB fallo, probando QZ.", webUsbError);
  }

  await printOrderTicketByQz(order, orderAddress, copies, paymentMethod, customerName, deliveryCost);
  return { method: "qz" as const };
}

export async function printAccountStatementTicket(client: JokerClient, entries: JokerAccountEntry[]) {
  const lines = buildAccountStatementTicketLines(client, entries);

  try {
    await printRawLinesByWebUsb(lines);
    return { method: "webusb" as const };
  } catch (webUsbError) {
    console.warn("[joker-print] WebUSB fallo, probando QZ.", webUsbError);
  }

  await printRawLinesByQz(lines);
  return { method: "qz" as const };
}
