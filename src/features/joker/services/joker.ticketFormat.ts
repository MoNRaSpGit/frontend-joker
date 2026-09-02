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
  TICKET_WIDTH,
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
  JokerAccountPayment,
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
  // DOUBLE_SIZE_ON duplica tambien el ancho: a este tamano entran la mitad
  // de columnas por renglon fisico, asi que el padding se calcula para
  // TICKET_WIDTH / 2 (si no, la linea calculada para 48 columnas no entraba
  // en las 24 reales y el valor se iba a un renglon aparte).
  lines.push(`${rightAlignedLine("Total ", formatMoney(total), TICKET_WIDTH / 2)}\n`);
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

// Un movimiento del ciclo actual de cuenta corriente (desde la ultima vez
// que el cliente quedo en $0): una compra suma al saldo, un pago resta.
// balanceAfter es el saldo que quedaba justo despues de ese movimiento --
// asi el ticket cuenta la historia completa de por que el saldo es el que
// es, en vez de mostrar solo el numero final.
type JokerAccountCycleMovement =
  | { type: "compra"; date: string; amount: number; items: JokerAccountEntry["items"]; balanceAfter: number }
  | { type: "pago"; date: string; amount: number; coveredEntries: JokerAccountPayment["coveredEntries"]; balanceAfter: number };

// Junta compras (boletas abiertas) y pagos (solo los abiertos, del ciclo
// actual) en una sola linea de tiempo ordenada por fecha, con el saldo
// corriente despues de cada uno. No hace falta filtrar por "ciclo": las
// boletas abiertas y los pagos abiertos SON el ciclo actual (un pago total
// archiva las boletas y cierra los pagos, asi que ya no aparecen aca).
function buildAccountCycleMovements(entries: JokerAccountEntry[], openPayments: JokerAccountPayment[]): JokerAccountCycleMovement[] {
  const compras: JokerAccountCycleMovement[] = entries.map((entry) => ({
    type: "compra",
    date: entry.createdAt,
    amount: entry.total,
    items: entry.items,
    balanceAfter: 0
  }));
  const pagos: JokerAccountCycleMovement[] = openPayments.map((payment) => ({
    type: "pago",
    date: payment.createdAt,
    amount: payment.amount,
    coveredEntries: payment.coveredEntries,
    balanceAfter: 0
  }));

  const merged = [...compras, ...pagos].sort((a, b) => a.date.localeCompare(b.date));

  let balance = 0;
  return merged.map((movement) => {
    balance = Math.round((balance + (movement.type === "compra" ? movement.amount : -movement.amount)) * 100) / 100;
    return { ...movement, balanceAfter: balance };
  });
}

// Encabezado + linea de tiempo de movimientos + saldo final, compartido
// entre el comprobante de cuenta corriente ("Imprimir") y el de un pago
// puntual ("Pago") -- las dos situaciones cuentan la misma historia
// (compras y pagos del ciclo actual), solo cambia el titulo.
function buildAccountCycleTicketLines(client: JokerClient, title: string, movements: JokerAccountCycleMovement[]) {
  const lines: string[] = [];
  const currentBalance = movements.length ? movements[movements.length - 1].balanceAfter : 0;

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
  lines.push(`${title}\n`);
  lines.push(BOLD_OFF);
  lines.push(`${divider()}\n`);

  if (movements.length) {
    movements.forEach((movement, index) => {
      const dateLabel = new Date(movement.date).toLocaleDateString("es-UY", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      // Toda compra se destaca con un titulo grande para que resalte
      // entre el resto del historial -- la primera del ciclo (que
      // siempre arranca de $0) se marca distinto porque es la deuda con
      // la que empezo esta cuenta, no una compra mas.
      if (movement.type === "compra") {
        lines.push(BOLD_ON, TALL_SIZE_ON);
        lines.push(index === 0 ? "DEUDA INICIAL\n" : "COMPRA\n");
        lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
      }

      lines.push(BOLD_ON);
      lines.push(`${dateLabel}\n`);
      lines.push(BOLD_OFF);

      if (movement.type === "compra") {
        // unitPrice puede faltar en consumos viejos, guardados antes de
        // que el ticket empezara a mostrar precio por producto.
        const hasPrices = movement.items.every((item) => item.unitPrice != null);
        movement.items.forEach((item) => {
          if (hasPrices) {
            lines.push(`${rightAlignedLine(`  ${item.quantity}x ${item.productName} `, formatMoney(item.unitPrice * item.quantity))}\n`);
          } else {
            lines.push(`  ${item.quantity}x ${item.productName}\n`);
          }
        });
      } else {
        lines.push(`${rightAlignedLine("  Pago ", formatMoney(movement.amount))}\n`);
      }

      lines.push(`${rightAlignedLine("  Saldo ", formatMoney(movement.balanceAfter))}\n`);

      if (index < movements.length - 1) {
        lines.push(`${divider()}\n`);
      }
    });
  } else {
    lines.push("Sin movimientos pendientes.\n");
  }

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push(`${rightAlignedLine("Saldo actual ", formatMoney(Math.max(currentBalance, 0)))}\n`);
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

// Comprobante de cuenta corriente ("Imprimir" en el detalle del cliente):
// no toca nada, solo muestra el historial completo del ciclo actual
// (compras y pagos) y el saldo real de hoy -- antes mostraba la suma
// bruta de las boletas, sin restar los pagos ya hechos.
export function buildAccountStatementTicketLines(client: JokerClient, entries: JokerAccountEntry[], openPayments: JokerAccountPayment[]) {
  const movements = buildAccountCycleMovements(entries, openPayments);
  return buildAccountCycleTicketLines(client, "Comprobante de cuenta corriente", movements);
}

// Comprobante de un pago (parcial o total) de cuenta corriente: mismo
// historial que el de arriba (compras + pagos del ciclo, hasta este pago
// inclusive), asi queda claro de donde sale el saldo actual.
export function buildAccountPaymentTicketLines(
  client: JokerClient,
  entriesBeforePayment: JokerAccountEntry[],
  openPaymentsIncludingNew: JokerAccountPayment[]
) {
  const movements = buildAccountCycleMovements(entriesBeforePayment, openPaymentsIncludingNew);
  const isFullPayment = !movements.length || movements[movements.length - 1].balanceAfter <= 0;
  return buildAccountCycleTicketLines(client, isFullPayment ? "Pago total de cuenta corriente" : "Pago parcial de cuenta corriente", movements);
}

// Resumen del turno de un repartidor (o de Mostrador, ver courier.isCounter):
// caja inicial, pedidos (con costo de envio si tienen, y metodo de pago +
// nombre de quien hizo el pedido), gastos y entregas de dinero al local.
// Se imprime desde Delivery con el turno todavia activo (antes de
// liquidar) -- no incluye horas/tarifa ni el total a pagar, eso se
// termina de definir recien al liquidar (y no aplica a Mostrador de
// entrada, no es una persona a la que se le paga por hora).
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
  lines.push(courier.isCounter ? "RESUMEN DE MOSTRADOR\n" : "RESUMEN DE REPARTIDOR\n");
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
  lines.push(courier.isCounter ? `Pedidos (${orders.length})\n` : `Pedidos entregados (${orders.length})\n`);
  lines.push(BOLD_OFF);
  if (orders.length) {
    orders.forEach((order) => {
      // El nombre (si hay) se muestra siempre -- en pantalla ya se ve
      // (Panel/Delivery), pero en el ticket impreso no salia, y es
      // justo lo que hace falta para saber DE QUIEN es un pedido a
      // cuenta/fiado sin tener que volver a la pantalla. Se le saca el
      // sufijo " MOSTRADOR" (marca interna, no es un nombre real, ver
      // PanelScreen#handleAssignCounter).
      const displayName = order.customerName?.trim().replace(/\s*MOSTRADOR\s*$/i, "").trim() || "";
      // El metodo de pago sale SIEMPRE, sea Mostrador o repartidor real
      // -- antes solo salia para Mostrador, y en Delivery el ticket no
      // decia si el pedido era efectivo, POS, transferencia o cuenta.
      const label = `Pedido #${order.displayNumber} (${JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}${displayName ? `, ${displayName}` : ""}) `;
      lines.push(`${rightAlignedLine(label, formatMoney(order.total))}\n`);
      if (order.deliveryCost) {
        lines.push(`${rightAlignedLine("  Envio ", formatMoney(order.deliveryCost))}\n`);
      }
    });
  } else {
    lines.push(courier.isCounter ? "Sin pedidos todavia.\n" : "Sin pedidos entregados todavia.\n");
  }

  // Desglose por tipo de pago: solo tiene sentido para Mostrador, que
  // mezcla efectivo/POS/transferencia/cuenta -- un repartidor real
  // siempre cobra en efectivo, ya tiene su propia "Cobrado" arriba.
  if (courier.isCounter) {
    const paymentTotals: Record<JokerPaymentMethod, number> = { efectivo: 0, tarjeta: 0, transferencia: 0, cuenta: 0 };
    orders.forEach((order) => {
      paymentTotals[order.paymentMethod] += order.total;
    });

    lines.push(`${decorativeBorder()}\n`);
    lines.push(BOLD_ON);
    lines.push("Tipo de pagos\n");
    lines.push(BOLD_OFF);
    (Object.keys(JOKER_PAYMENT_METHOD_LABELS) as JokerPaymentMethod[]).forEach((method) => {
      lines.push(`${rightAlignedLine(`${JOKER_PAYMENT_METHOD_LABELS[method]} `, formatMoney(paymentTotals[method]))}\n`);
    });
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
  // "Entregas al mostrador" tiene sentido para un repartidor (le
  // entrega plata al mostrador/local) -- pero si este ticket YA es el
  // de Mostrador, decir eso de si mismo no tiene sentido.
  lines.push(courier.isCounter ? "Entregas al administrador\n" : "Entregas al mostrador\n");
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
