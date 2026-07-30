import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderItem, JokerPaymentMethod } from "../joker.types";

const TICKET_WIDTH = 48;
const STORE_NAME = "EL JOKER";
const STORE_ADDRESS = "Elias Abdo 115";
const STORE_PHONE = "Tel: 099 238 454";
const INTERNAL_USE_NOTE = "Uso interno";
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

// Abreviaciones de nombres de producto, solo para la comanda de cocina (en
// letra grande ocupan mas lugar, asi entran mas comodas). Agregar aca
// cuando haga falta otra.
const KITCHEN_NAME_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bhamburguesas?\b/gi, "Hamb."],
  [/\bmilanesas?\b/gi, "Mila."]
];

function abbreviateForKitchen(productName: string) {
  return KITCHEN_NAME_ABBREVIATIONS.reduce(
    (name, [pattern, replacement]) => name.replace(pattern, replacement),
    productName
  );
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
// (cada copia ya trae su propio corte de papel al final). Con 3 copias
// salen 2 tickets de mostrador iguales, mas la comanda de cocina, mas una
// copia identica a la comanda pero titulada "ARCHIVO" (para que quede en
// el local). Con 1 copia sale directo la comanda (es el caso de uso mas
// comun: solo hace falta que la vea cocina).
export function buildOrderTicketLines(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod,
  customerName: string
) {
  const lines: string[] = [];

  if (copies === 1) {
    return buildCompactTicketLines(order, orderAddress, paymentMethod, customerName, "COMANDA");
  }

  const singleTicket = buildSingleTicketLines(order, orderAddress, paymentMethod, customerName);
  const customerCopies = copies === 3 ? 2 : copies;

  for (let copyIndex = 0; copyIndex < customerCopies; copyIndex += 1) {
    lines.push(...singleTicket);
  }

  if (copies === 3) {
    lines.push(...buildCompactTicketLines(order, orderAddress, paymentMethod, customerName, "COMANDA"));
    lines.push(...buildCompactTicketLines(order, orderAddress, paymentMethod, customerName, "ARCHIVO"));
  }

  return lines;
}

// Encabezado del ticket. En el mostrador va completo: nombre, direccion,
// telefono, fecha/hora y forma de pago. En la comanda (includeStoreDetails
// = false) solo va el titulo y la fecha/hora. "Uso interno" va siempre en
// los dos tipos de ticket.
function pushHeader(
  lines: string[],
  heading: string,
  paymentMethod: JokerPaymentMethod,
  includeStoreDetails: boolean
) {
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${heading}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  if (includeStoreDetails) {
    lines.push(`${STORE_ADDRESS}\n`);
    lines.push(`${STORE_PHONE}\n`);
  }
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);
  if (includeStoreDetails) {
    lines.push(`Pago: ${JOKER_PAYMENT_METHOD_LABELS[paymentMethod]}\n`);
  }
  lines.push(`${INTERNAL_USE_NOTE}\n`);
}

// Seccion "Cliente" comun a los dos tipos de ticket: siempre se muestra,
// incluso sin nombre ni direccion (retiro en el local, sin nombre cargado).
// En la comanda/archivo el nombre y la direccion van en letra grande
// (emphasize), en el ticket de mostrador se quedan en tamano normal.
function pushCustomerSection(
  lines: string[],
  orderAddress: string,
  customerName: string,
  emphasize: boolean
) {
  lines.push(ALIGN_LEFT);
  lines.push(`${decorativeBorder()}\n`);
  if (emphasize) lines.push(DOUBLE_SIZE_ON);
  lines.push(`Cliente: ${customerName.trim() || "-"}\n`);
  lines.push(orderAddress.trim() ? `Direccion: ${orderAddress.trim()}\n` : "Retira en local\n");
  if (emphasize) lines.push(DOUBLE_SIZE_OFF);
  lines.push(`${decorativeBorder()}\n`);
}

function buildSingleTicketLines(
  order: JokerOrderItem[],
  orderAddress: string,
  paymentMethod: JokerPaymentMethod,
  customerName: string
) {
  const lines: string[] = [];

  lines.push(ESC_INIT);
  pushHeader(lines, STORE_NAME, paymentMethod, true);
  pushCustomerSection(lines, orderAddress, customerName, false);

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
  lines.push(`${FOOTER_MESSAGE}\n`);
  lines.push(BOLD_OFF);

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
// como pasaba en el ticket normal).
function buildCompactTicketLines(
  order: JokerOrderItem[],
  orderAddress: string,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  heading: string
) {
  const lines: string[] = [];

  lines.push(ESC_INIT);
  pushHeader(lines, heading, paymentMethod, false);
  pushCustomerSection(lines, orderAddress, customerName, true);

  order.forEach((item, index) => {
    const itemNumber = index + 1;

    lines.push(BOLD_ON, DOUBLE_SIZE_ON);
    lines.push(`${itemNumber}) ${item.quantity}x ${abbreviateForKitchen(item.productName)}\n`);
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
