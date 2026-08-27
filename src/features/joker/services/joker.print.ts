import { printOrderTicketByQz, printRawLinesByQz } from "./joker.qzPrint";
import { buildAccountStatementTicketLines, buildCashRegisterCloseTicketLines, buildCourierSummaryTicketLines } from "./joker.ticketFormat";
import type { JokerCashRegisterSummary } from "./joker.ticketFormat";
import type {
  JokerAccountEntry,
  JokerClient,
  JokerCourier,
  JokerCourierCashSummary,
  JokerOrderItem,
  JokerOrderRecord,
  JokerPaymentMethod
} from "../joker.types";

export async function printOrderTicket(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  deliveryCost: string,
  ticketNumber: number,
  note: string
) {
  await printOrderTicketByQz(order, orderAddress, copies, paymentMethod, customerName, deliveryCost, ticketNumber, note);
  return { method: "qz" as const };
}

export async function printAccountStatementTicket(client: JokerClient, entries: JokerAccountEntry[]) {
  const lines = buildAccountStatementTicketLines(client, entries);
  await printRawLinesByQz(lines);
  return { method: "qz" as const };
}

export async function printCashRegisterCloseTicket(summary: JokerCashRegisterSummary) {
  const lines = buildCashRegisterCloseTicketLines(summary);
  await printRawLinesByQz(lines);
  return { method: "qz" as const };
}

export async function printCourierSummaryTicket(
  courier: JokerCourier,
  summary: JokerCourierCashSummary,
  orders: JokerOrderRecord[]
) {
  const lines = buildCourierSummaryTicketLines(courier, summary, orders);
  await printRawLinesByQz(lines);
  return { method: "qz" as const };
}
