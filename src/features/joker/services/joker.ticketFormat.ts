import type { JokerOrderItem } from "../joker.types";

const TICKET_WIDTH = 48;
const STORE_NAME = "JOKER";
const SUBTITLE = "Pedido para cocina";
const FOOTER_MESSAGE = "Muito obrigado.";
const DECORATIVE_CHAR = "=";
const DIVIDER_CHAR = "-";

function centerLine(text: string, width = TICKET_WIDTH) {
  const trimmed = text.slice(0, width);
  const totalPadding = Math.max(0, width - trimmed.length);
  const left = Math.floor(totalPadding / 2);
  return `${" ".repeat(left)}${trimmed}`;
}

function decorativeBorder() {
  return DECORATIVE_CHAR.repeat(TICKET_WIDTH);
}

function divider() {
  return DIVIDER_CHAR.repeat(TICKET_WIDTH);
}

const ESC_INIT = "\x1B\x40";
const ALIGN_CENTER = "\x1B\x61\x01";
const ALIGN_LEFT = "\x1B\x61\x00";
const BOLD_ON = "\x1B\x45\x01";
const BOLD_OFF = "\x1B\x45\x00";
const DOUBLE_SIZE_ON = "\x1D\x21\x11";
const DOUBLE_SIZE_OFF = "\x1D\x21\x00";
const CUT_PAPER = "\x1D\x56\x41\x00";

export function buildOrderTicketLines(order: JokerOrderItem[]) {
  const lines: string[] = [];

  lines.push(ESC_INIT);
  lines.push(ALIGN_CENTER);

  // Titulo grande y en negrita: el nombre del local es lo primero que se ve.
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${STORE_NAME}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);

  lines.push(`${SUBTITLE}\n`);
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);

  lines.push(`${decorativeBorder()}\n`);

  order.forEach((item, index) => {
    const itemNumber = index + 1;

    lines.push(BOLD_ON);
    lines.push(`${centerLine(`${itemNumber}) ${item.productName}`)}\n`);
    lines.push(BOLD_OFF);

    lines.push(
      item.excludedIngredients.length
        ? `${centerLine(`Sin: ${item.excludedIngredients.join(", ")}`)}\n`
        : `${centerLine("Con todo")}\n`
    );

    if (index < order.length - 1) {
      lines.push(`${divider()}\n`);
    }
  });

  lines.push(`${decorativeBorder()}\n`);
  lines.push("\n");

  lines.push(BOLD_ON);
  lines.push(`${centerLine(`*** ${FOOTER_MESSAGE} ***`)}\n`);
  lines.push(BOLD_OFF);

  lines.push("\n\n\n");
  lines.push(ALIGN_LEFT);
  lines.push(CUT_PAPER);

  return lines;
}
