import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderItem, JokerPaymentMethod } from "../joker.types";

const TICKET_WIDTH = 48;
const STORE_NAME = "EL JOKER";
// Placeholder: falta la direccion real del local, se completa despues.
const STORE_ADDRESS = "Bvar. Artigas 2450";
const FOOTER_MESSAGE = "Muito obrigado.";
const DECORATIVE_CHAR = "=";
const DIVIDER_CHAR = "-";

function decorativeBorder() {
  return DECORATIVE_CHAR.repeat(TICKET_WIDTH);
}

function divider() {
  return DIVIDER_CHAR.repeat(TICKET_WIDTH);
}

function formatMoney(amount: number) {
  return `$ ${Math.round(amount)}`;
}

// Arma una linea con el label a la izquierda y el valor pegado a la derecha,
// rellenando el medio con espacios.
function rightAlignedLine(label: string, value: string) {
  const gap = Math.max(1, TICKET_WIDTH - label.length - value.length);
  return `${label}${" ".repeat(gap)}${value}`;
}

const ESC_INIT = "\x1B\x40";
const ALIGN_CENTER = "\x1B\x61\x01";
const ALIGN_LEFT = "\x1B\x61\x00";
const BOLD_ON = "\x1B\x45\x01";
const BOLD_OFF = "\x1B\x45\x00";
const DOUBLE_SIZE_ON = "\x1D\x21\x11";
const DOUBLE_SIZE_OFF = "\x1D\x21\x00";
const CUT_PAPER = "\x1D\x56\x41\x00";

// copies: cuantas veces se repite el ticket completo en el mismo trabajo
// (cada copia ya trae su propio corte de papel al final). Cuando son 3
// copias, las primeras 2 son iguales (mostrador) y la ultima se reemplaza
// por la comanda de cocina: mismo encabezado y seccion de cliente, pero sin
// precios, en letra bien grande, para que se lea facil en la cocina.
export function buildOrderTicketLines(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod
) {
  const singleTicket = buildSingleTicketLines(order, orderAddress, paymentMethod);
  const lines: string[] = [];
  const customerCopies = copies === 3 ? 2 : copies;

  for (let copyIndex = 0; copyIndex < customerCopies; copyIndex += 1) {
    lines.push(...singleTicket);
  }

  if (copies === 3) {
    lines.push(...buildKitchenTicketLines(order, orderAddress, paymentMethod));
  }

  return lines;
}

// Encabezado comun a los dos tipos de ticket: nombre (o "COMANDA"),
// direccion del local, fecha/hora y forma de pago.
function pushHeader(lines: string[], heading: string, paymentMethod: JokerPaymentMethod) {
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${heading}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  lines.push(`${STORE_ADDRESS}\n`);
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);
  lines.push(`Pago: ${JOKER_PAYMENT_METHOD_LABELS[paymentMethod]}\n`);
}

// Seccion "Cliente" comun a los dos tipos de ticket: siempre se muestra,
// incluso sin direccion (retiro en el local).
function pushCustomerSection(lines: string[], orderAddress: string) {
  lines.push(ALIGN_LEFT);
  lines.push(`${decorativeBorder()}\n`);
  lines.push("Cliente:\n");
  lines.push(`${orderAddress.trim() || "Retira en local"}\n`);
  lines.push(`${decorativeBorder()}\n`);
}

function buildSingleTicketLines(order: JokerOrderItem[], orderAddress: string, paymentMethod: JokerPaymentMethod) {
  const lines: string[] = [];

  lines.push(ESC_INIT);
  pushHeader(lines, STORE_NAME, paymentMethod);
  pushCustomerSection(lines, orderAddress);

  let total = 0;

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

    if (index < order.length - 1) {
      lines.push(`${divider()}\n`);
    }
  });

  lines.push(`${decorativeBorder()}\n`);
  lines.push(BOLD_ON);
  lines.push(`${rightAlignedLine("Total ", formatMoney(total))}\n`);
  lines.push(BOLD_OFF);
  lines.push("\n");

  // Pie centrado, otra vez dejando que lo centre la impresora sola.
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON);
  lines.push(`* ${FOOTER_MESSAGE} *\n`);
  lines.push(BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}

// Comanda de cocina: mismo encabezado y seccion de cliente que el ticket
// normal, pero dice "COMANDA" en vez de "EL JOKER" y no lleva precios (no
// le sirven a cocina). El nombre del producto y el detalle van en letra
// grande (doble ancho y alto: aca no comparte linea con ningun precio, asi
// que no hay riesgo de que quede apretado como pasaba en el ticket normal).
function buildKitchenTicketLines(order: JokerOrderItem[], orderAddress: string, paymentMethod: JokerPaymentMethod) {
  const lines: string[] = [];

  lines.push(ESC_INIT);
  pushHeader(lines, "COMANDA", paymentMethod);
  pushCustomerSection(lines, orderAddress);

  order.forEach((item, index) => {
    const itemNumber = index + 1;

    lines.push(BOLD_ON, DOUBLE_SIZE_ON);
    lines.push(`${itemNumber}) ${item.quantity}x ${item.productName}\n`);
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
      lines.push(`${divider()}\n`);
    }
  });

  lines.push(`${decorativeBorder()}\n`);
  lines.push("\n");

  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON);
  lines.push(`${FOOTER_MESSAGE}\n`);
  lines.push(BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}
