import {
  ALIGN_CENTER,
  ALIGN_LEFT,
  BOLD_OFF,
  BOLD_ON,
  CUT_PAPER,
  DOUBLE_SIZE_OFF,
  DOUBLE_SIZE_ON,
  ESC_INIT,
  TALL_SIZE_ON,
  TRIPLE_SIZE_ON,
  decorativeBorder,
  divider,
  formatMoney,
  parseDeliveryCost,
  rightAlignedLine
} from "./joker.escpos";
import { abbreviateForKitchen, wrapForKitchenPrinting } from "./joker.kitchenAbbreviations";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type {
  JokerAccountEntry,
  JokerClient,
  JokerCourier,
  JokerCourierCashSummary,
  JokerOrderItem,
  JokerOrderRecord,
  JokerPaymentMethod
} from "../joker.types";

export type JokerCashRegisterSummary = {
  paymentTotals: Record<JokerPaymentMethod, number>;
  totalVendido: number;
  ganancia: number;
  ranking: Array<{ productName: string; quantity: number }>;
};

const STORE_NAME = "EL JOKER";
const STORE_ADDRESS = "Elias Abdo 115";
const STORE_PHONE = "Tel: 099 238 454";
const INTERNAL_USE_NOTE = "Uso interno";
const FOOTER_MESSAGE = "Muito obrigado!!";

// copies: cuantas veces se repite el ticket completo en el mismo trabajo
// (cada copia ya trae su propio corte de papel al final). Con 3 copias
// salen 3 tickets fisicos en total: 1 de mostrador, la comanda de cocina, y
// una copia identica a la comanda pero titulada "ARCHIVO" (para que quede
// en el local). Con 1 copia sale solo el ticket de mostrador. ticketNumber es
// el id real del pedido que asigna el backend al guardarlo, asi que sale
// igual en las 3 versiones del ticket.
export function buildOrderTicketLines(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  deliveryCost: string,
  ticketNumber: number,
  note: string
) {
  const lines: string[] = [];

  lines.push(
    ...buildSingleTicketLines(order, orderAddress, paymentMethod, customerName, deliveryCost, ticketNumber, note)
  );

  if (copies === 1) {
    return lines;
  }

  if (copies === 3) {
    lines.push(...buildCompactTicketLines(order, orderAddress, customerName, "COMANDA", ticketNumber, note));
    lines.push(...buildCompactTicketLines(order, orderAddress, customerName, "ARCHIVO", ticketNumber, note));
  }

  return lines;
}

// Encabezado del ticket. En el mostrador va completo: nombre, direccion,
// telefono, fecha y "Uso interno". En la comanda (includeStoreDetails =
// false) solo va el titulo, la fecha y "Uso interno". La forma de pago no
// va aca: se muestra junto con Cliente/Direccion en pushCustomerSection,
// para dejar el encabezado mas limpio. La hora solo se imprime en el
// Archivo (includeTime) -- en Joker y Comanda solo interesa la fecha.
function pushHeader(lines: string[], heading: string, includeStoreDetails: boolean, includeTime: boolean) {
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${heading}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  if (includeStoreDetails) {
    lines.push(`${STORE_ADDRESS}\n`);
    lines.push(`${STORE_PHONE}\n`);
  }
  const now = new Date();
  const dateLabel = includeTime
    ? now.toLocaleString("es-UY", { timeZone: "America/Montevideo" })
    : now.toLocaleDateString("es-UY", { timeZone: "America/Montevideo" });
  lines.push(`${dateLabel}\n`);
  lines.push(`${INTERNAL_USE_NOTE}\n`);
}

// Seccion "Cliente" comun a los tres tipos de ticket: siempre se muestra,
// incluso sin nombre ni direccion (retiro en el local, sin nombre cargado).
// El nombre y la direccion van en letra grande en los tres tipos de ticket.
// paymentMethod solo se pasa (y se muestra) en el ticket de mostrador, no
// en la comanda/archivo (no le sirve a cocina ni al archivo). note, en
// cambio, se muestra en los tres -- el cliente pidio verla siempre, mas
// grande en la comanda (noteSize) para que no se pierda entre el resto del
// texto. note es distinto de "Detalle" (que es por producto, ej "sin
// lechuga"): es una nota general del pedido, ej "Pedido para las 9:30" o
// "Casa gris pegada al almacen".
function pushCustomerSection(
  lines: string[],
  orderAddress: string,
  customerName: string,
  paymentMethod?: JokerPaymentMethod,
  note?: string,
  noteSize: string = TALL_SIZE_ON
) {
  lines.push(ALIGN_LEFT);
  lines.push(`${decorativeBorder()}\n`);
  lines.push(DOUBLE_SIZE_ON);
  // Los pedidos de mostrador (Usuario) siempre vienen con el nombre
  // marcado "... MOSTRADOR" (ver OrdersScreen#submitPendingOrder) y sin
  // direccion -- en el ticket no interesa repetir "MOSTRADOR" pegado al
  // nombre del cliente, asi que se saca de la linea "Cliente" y queda
  // solo, reemplazando a la direccion (en vez del generico "Retira en
  // local" de un pedido por WhatsApp que se retira en el local).
  const trimmedCustomerName = customerName.trim();
  const isCounterOrder = trimmedCustomerName.toUpperCase().includes("MOSTRADOR");
  const displayCustomerName = isCounterOrder
    ? trimmedCustomerName.replace(/\s*MOSTRADOR\s*$/i, "").trim()
    : trimmedCustomerName;
  lines.push(`Cliente: ${displayCustomerName || "-"}\n`);
  lines.push(
    orderAddress.trim() ? `Direccion: ${orderAddress.trim()}\n` : isCounterOrder ? "MOSTRADOR\n" : "Retira en local\n"
  );
  lines.push(DOUBLE_SIZE_OFF);
  if (paymentMethod) {
    lines.push(BOLD_ON, TALL_SIZE_ON);
    // El cliente pidio que en el ticket impreso diga "A cuenta" en vez de
    // "Cuenta" para ese metodo de pago (el resto de las pantallas siguen
    // usando JOKER_PAYMENT_METHOD_LABELS tal cual).
    const ticketLabel = paymentMethod === "cuenta" ? "A cuenta" : JOKER_PAYMENT_METHOD_LABELS[paymentMethod];
    lines.push(`Pago: ${ticketLabel}\n`);
    lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  }
  if (note && note.trim()) {
    lines.push(BOLD_ON, noteSize);
    lines.push(`Nota: ${note.trim()}\n`);
    lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  }
  lines.push(`${decorativeBorder()}\n`);
}

function buildSingleTicketLines(
  order: JokerOrderItem[],
  orderAddress: string,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  deliveryCost: string,
  ticketNumber: number,
  note: string
) {
  const lines: string[] = [];

  lines.push(ESC_INIT);
  pushHeader(lines, STORE_NAME, true, false);
  lines.push(`Pedido #${ticketNumber}\n`);
  pushCustomerSection(lines, orderAddress, customerName, paymentMethod, note);

  let total = 0;
  const parsedDeliveryCost = parseDeliveryCost(deliveryCost);

  order.forEach((item, index) => {
    const itemNumber = index + 1;
    const lineTotal = item.unitPrice * item.quantity;
    total += lineTotal;

    lines.push(BOLD_ON);
    lines.push(`${rightAlignedLine(`${itemNumber}) ${item.quantity}x ${item.productName} `, formatMoney(lineTotal))}\n`);
    lines.push(BOLD_OFF);

    const detailLines = item.detail ? item.detail.split("\n").filter((line) => line.trim().length > 0) : [];
    if (detailLines.length) {
      detailLines.forEach((detailLine, detailIndex) =>
        lines.push(`   ${detailIndex === 0 ? "Detalle: " : ""}${detailLine}\n`)
      );
    } else {
      lines.push("   Detalle: sin detalle\n");
    }

    if (index < order.length - 1 || parsedDeliveryCost !== null) {
      lines.push(`${divider()}\n`);
    }
  });

  if (parsedDeliveryCost !== null) {
    total += parsedDeliveryCost;
    lines.push(BOLD_ON);
    lines.push(`${rightAlignedLine("Costo de envio ", formatMoney(parsedDeliveryCost))}\n`);
    lines.push(BOLD_OFF);
  }

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${rightAlignedLine("Total ", formatMoney(total))}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push("\n");

  // Pie centrado, otra vez dejando que lo centre la impresora sola.
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push(`${FOOTER_MESSAGE}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}

// Formato "compacto": lo usan la comanda de cocina y el archivo, mismo
// encabezado y seccion de cliente que el ticket normal pero con el heading
// que se le pase ("COMANDA" o "ARCHIVO") en vez de "EL JOKER", y sin
// precios (no le sirven ni a cocina ni al archivo). El nombre del producto
// y el detalle van en letra grande (doble ancho y alto: aca no comparte
// linea con ningun precio, asi que no hay riesgo de que quede apretado
// como pasaba en el ticket normal). La nota sale mas grande en la comanda
// (TRIPLE_SIZE_ON, igual que el nombre del producto) que en el archivo
// (TALL_SIZE_ON, igual que el mostrador) porque el cocinero la necesita
// mas legible de un vistazo.
function buildCompactTicketLines(
  order: JokerOrderItem[],
  orderAddress: string,
  customerName: string,
  heading: string,
  ticketNumber: number,
  note: string
) {
  const lines: string[] = [];
  // Ni comanda ni archivo van con numero de linea -- solo el "*" y la
  // cantidad, para que las dos copias salgan identicas en el listado de
  // items (el numero de posicion en la lista es lo que confundia al
  // cocinero con la cantidad). Tambien separan cada producto con una raya
  // doble (decorativeBorder, "="), mas marcada que el guion simple que usan
  // el resto de los tickets, para que no se le pase de un producto a otro
  // de un vistazo.
  const isKitchenCopy = heading === "COMANDA";
  const noteSize = isKitchenCopy ? TRIPLE_SIZE_ON : TALL_SIZE_ON;

  lines.push(ESC_INIT);
  pushHeader(lines, heading, false, heading === "ARCHIVO");
  lines.push(`Pedido #${ticketNumber}\n`);
  pushCustomerSection(lines, orderAddress, customerName, undefined, note, noteSize);

  order.forEach((item, index) => {
    const itemText = `* ${item.quantity}x ${abbreviateForKitchen(item.productName)}`;

    lines.push(BOLD_ON, TRIPLE_SIZE_ON);
    // Se corta a mano (por palabra) en vez de dejar que la impresora corte
    // sola: a este tamano entran pocos caracteres por linea fisica, y sin
    // esto un nombre largo podia partirse a mitad de palabra. Aplica a las
    // dos copias que comparten esta funcion (comanda y archivo), porque
    // las dos imprimen a TRIPLE_SIZE_ON.
    wrapForKitchenPrinting(itemText).forEach((line) => lines.push(`${line}\n`));
    lines.push(BOLD_OFF);

    const detailLines = item.detail ? item.detail.split("\n").filter((line) => line.trim().length > 0) : [];
    if (detailLines.length) {
      detailLines.forEach((detailLine, detailIndex) =>
        lines.push(`${detailIndex === 0 ? "Detalle: " : ""}${detailLine}\n`)
      );
    } else {
      lines.push("Sin detalle\n");
    }
    lines.push(DOUBLE_SIZE_OFF);

    if (index < order.length - 1) {
      lines.push(`${isKitchenCopy ? decorativeBorder() : divider()}\n`);
    }
  });

  lines.push(`${decorativeBorder()}\n`);
  lines.push("\n");

  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push(`${FOOTER_MESSAGE}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}

// Comprobante de pago de cuenta corriente: se usa desde "Pago" e
// "Imprimir" en el detalle del cliente. Muestra el listado de consumos
// pendientes y el total. No usa forma de pago (no aplica aca: esto es lo
// que se esta saldando, no un pedido nuevo).
export function buildAccountStatementTicketLines(client: JokerClient, entries: JokerAccountEntry[]) {
  const lines: string[] = [];
  const total = entries.reduce((sum, entry) => sum + entry.total, 0);

  lines.push(ESC_INIT);
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${STORE_NAME}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push(`${STORE_ADDRESS}\n`);
  lines.push(`${STORE_PHONE}\n`);
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);
  lines.push(`${INTERNAL_USE_NOTE}\n`);

  lines.push(ALIGN_LEFT);
  lines.push(`${decorativeBorder()}\n`);
  lines.push(DOUBLE_SIZE_ON);
  lines.push(`Cliente: ${client.name}\n`);
  lines.push(client.address?.trim() ? `Direccion: ${client.address.trim()}\n` : "-\n");
  lines.push(DOUBLE_SIZE_OFF);
  lines.push(`${decorativeBorder()}\n`);

  lines.push(BOLD_ON);
  lines.push("Comprobante de cuenta corriente\n");
  lines.push(BOLD_OFF);
  lines.push(`${divider()}\n`);

  if (entries.length) {
    entries.forEach((entry, index) => {
      const dateSource = entry.orderDate ? new Date(`${entry.orderDate}T00:00:00`) : new Date(entry.createdAt);
      const dateLabel = dateSource.toLocaleDateString("es-UY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      lines.push(BOLD_ON);
      lines.push(`${dateLabel}\n`);
      lines.push(BOLD_OFF);

      // unitPrice puede faltar en consumos viejos, guardados antes de que el
      // ticket empezara a mostrar precio por producto: en ese caso se listan
      // los productos sin precio (como antes) y se muestra solo el total del
      // consumo, en vez de inventar un precio en $0 por linea.
      const hasPrices = entry.items.every((item) => item.unitPrice != null);
      entry.items.forEach((item) => {
        if (hasPrices) {
          lines.push(`${rightAlignedLine(`  ${item.quantity}x ${item.productName} `, formatMoney(item.unitPrice * item.quantity))}\n`);
        } else {
          lines.push(`  ${item.quantity}x ${item.productName}\n`);
        }
      });
      if (!hasPrices || entry.items.length > 1) {
        lines.push(BOLD_ON);
        lines.push(`${rightAlignedLine(hasPrices ? "Subtotal " : "", formatMoney(entry.total))}\n`);
        lines.push(BOLD_OFF);
      }

      if (index < entries.length - 1) {
        lines.push(`${divider()}\n`);
      }
    });
  } else {
    lines.push("Sin consumos pendientes.\n");
  }

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push(`${rightAlignedLine("Total ", formatMoney(total))}\n`);
  lines.push(BOLD_OFF);
  lines.push("\n");

  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push(`${FOOTER_MESSAGE}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}

// Resumen del turno de un repartidor: caja inicial, pedidos entregados
// (con costo de envio si tienen), gastos y entregas de dinero al
// mostrador. Se imprime desde Delivery con el turno todavia activo (antes
// de liquidar) -- no incluye horas/tarifa ni el total a pagar, eso se
// termina de definir recien al liquidar.
export function buildCourierSummaryTicketLines(
  courier: JokerCourier,
  summary: JokerCourierCashSummary,
  orders: JokerOrderRecord[]
) {
  const lines: string[] = [];
  const expenseMovements = summary.movements.filter((movement) => movement.type === "gasto");
  const handoverMovements = summary.movements.filter((movement) => movement.type === "entrega");

  lines.push(ESC_INIT);
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${STORE_NAME}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push("RESUMEN DE REPARTIDOR\n");
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);
  lines.push(`${INTERNAL_USE_NOTE}\n`);

  lines.push(ALIGN_LEFT);
  lines.push(`${decorativeBorder()}\n`);
  lines.push(DOUBLE_SIZE_ON);
  lines.push(`${courier.name}\n`);
  lines.push(DOUBLE_SIZE_OFF);
  if (courier.activeSince) {
    lines.push(
      `Turno desde: ${new Date(courier.activeSince).toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`
    );
  }
  lines.push(`${decorativeBorder()}\n`);

  lines.push(BOLD_ON);
  lines.push(`${rightAlignedLine("Caja inicial ", formatMoney(summary.initialCash))}\n`);
  lines.push(BOLD_OFF);
  lines.push(`${divider()}\n`);

  lines.push(BOLD_ON);
  lines.push(`Pedidos entregados (${orders.length})\n`);
  lines.push(BOLD_OFF);
  if (orders.length) {
    orders.forEach((order) => {
      lines.push(`${rightAlignedLine(`Pedido #${order.displayNumber} `, formatMoney(order.total))}\n`);
      if (order.deliveryCost) {
        lines.push(`${rightAlignedLine("  Envio ", formatMoney(order.deliveryCost))}\n`);
      }
    });
  } else {
    lines.push("Sin pedidos entregados todavia.\n");
  }

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push("Gastos\n");
  lines.push(BOLD_OFF);
  if (expenseMovements.length) {
    expenseMovements.forEach((movement) => {
      lines.push(`${rightAlignedLine(`  ${movement.description?.trim() || "Gasto"} `, formatMoney(movement.amount))}\n`);
    });
  } else {
    lines.push("  Sin gastos registrados.\n");
  }
  lines.push(BOLD_ON);
  lines.push(`${rightAlignedLine("Total gastos ", formatMoney(summary.expensesTotal))}\n`);
  lines.push(BOLD_OFF);

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push("Entregas al mostrador\n");
  lines.push(BOLD_OFF);
  if (handoverMovements.length) {
    handoverMovements.forEach((movement) => {
      lines.push(`${rightAlignedLine("  Entrega ", formatMoney(movement.amount))}\n`);
    });
  } else {
    lines.push("  Sin entregas registradas.\n");
  }
  lines.push(BOLD_ON);
  lines.push(`${rightAlignedLine("Total entregado ", formatMoney(summary.handoversTotal))}\n`);
  lines.push(BOLD_OFF);

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push(`${rightAlignedLine("Caja actual ", formatMoney(summary.cashOnHand))}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push("\n");

  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push(`${FOOTER_MESSAGE}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}

// Ticket de cierre de caja: ventas por forma de pago, total vendido,
// ganancia estimada y el top 3 de productos mas vendidos del dia.
export function buildCashRegisterCloseTicketLines(summary: JokerCashRegisterSummary) {
  const lines: string[] = [];

  lines.push(ESC_INIT);
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${STORE_NAME}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push("CIERRE DE CAJA\n");
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);
  lines.push(`${INTERNAL_USE_NOTE}\n`);

  lines.push(ALIGN_LEFT);
  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push("Ventas por forma de pago\n");
  lines.push(BOLD_OFF);
  lines.push(`${divider()}\n`);

  (Object.keys(JOKER_PAYMENT_METHOD_LABELS) as JokerPaymentMethod[]).forEach((method) => {
    lines.push(`${rightAlignedLine(`${JOKER_PAYMENT_METHOD_LABELS[method]} `, formatMoney(summary.paymentTotals[method] ?? 0))}\n`);
  });

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push(`${rightAlignedLine("Total vendido ", formatMoney(summary.totalVendido))}\n`);
  lines.push(`${rightAlignedLine("Ganancia ", formatMoney(summary.ganancia))}\n`);
  lines.push(BOLD_OFF);
  lines.push("\n");

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push("Top 3 productos\n");
  lines.push(BOLD_OFF);
  lines.push(`${divider()}\n`);

  if (summary.ranking.length) {
    summary.ranking.slice(0, 3).forEach((entry, index) => {
      lines.push(`${index + 1}) ${entry.quantity}x ${entry.productName}\n`);
    });
  } else {
    lines.push("Sin ventas registradas.\n");
  }

  lines.push(`${decorativeBorder()}\n`);
  lines.push("\n");

  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, TALL_SIZE_ON);
  lines.push(`${FOOTER_MESSAGE}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}
