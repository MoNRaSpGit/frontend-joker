import type { JokerOrderItem } from "../joker.types";

const TICKET_WIDTH = 48;
const STORE_NAME = "JOKER";
const FOOTER_MESSAGE = "Muito obrigado.";

function centerLine(text: string, width = TICKET_WIDTH) {
  const trimmed = text.slice(0, width);
  const totalPadding = Math.max(0, width - trimmed.length);
  const left = Math.floor(totalPadding / 2);
  return `${" ".repeat(left)}${trimmed}`;
}

function divider() {
  return "-".repeat(TICKET_WIDTH);
}

export function buildOrderTicketLines(order: JokerOrderItem[]) {
  const lines: string[] = [];

  lines.push("\x1B\x40");
  lines.push("\x1B\x61\x01");
  lines.push("\x1B\x45\x01");
  lines.push(`${centerLine(STORE_NAME)}\n`);
  lines.push("\x1B\x45\x00");
  lines.push(`${centerLine(new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" }))}\n`);
  lines.push("\x1B\x61\x00");
  lines.push(`${divider()}\n`);

  order.forEach((item, index) => {
    lines.push("\x1B\x45\x01");
    lines.push(`${item.productName}\n`);
    lines.push("\x1B\x45\x00");

    if (item.excludedIngredients.length) {
      lines.push(`  Sin: ${item.excludedIngredients.join(", ")}\n`);
    }

    if (index < order.length - 1) {
      lines.push(`${divider()}\n`);
    }
  });

  lines.push(`${divider()}\n`);
  lines.push("\n");
  lines.push("\x1B\x61\x01");
  lines.push(`${centerLine(FOOTER_MESSAGE)}\n`);
  lines.push("\n\n\n");
  lines.push("\x1D\x56\x41\x00");

  return lines;
}
