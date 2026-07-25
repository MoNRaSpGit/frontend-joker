import type { JokerOrderItem } from "../joker.types";

const TICKET_WIDTH = 48;
const STORE_NAME = "EL JOKER";
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
// (cada copia ya trae su propio corte de papel al final).
export function buildOrderTicketLines(order: JokerOrderItem[], orderAddress: string, copies: number) {
  const singleTicket = buildSingleTicketLines(order, orderAddress);
  const lines: string[] = [];

  for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
    lines.push(...singleTicket);
  }

  return lines;
}

function buildSingleTicketLines(order: JokerOrderItem[], orderAddress: string) {
  const lines: string[] = [];

  lines.push(ESC_INIT);

  // Cabecera centrada: la centra la propia impresora (ESC a 1), no
  // relleno manual con espacios (eso duplicaba el efecto y lo corria).
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${STORE_NAME}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  if (orderAddress.trim()) {
    lines.push(`Direccion: ${orderAddress.trim()}\n`);
  }
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);

  // Cuerpo del pedido: alineado a la izquierda, como una lista normal.
  lines.push(ALIGN_LEFT);
  lines.push(`${decorativeBorder()}\n`);

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
