import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerAccountEntry, JokerClient, JokerOrderItem, JokerPaymentMethod } from "../joker.types";

export type JokerCashRegisterSummary = {
  paymentTotals: Record<JokerPaymentMethod, number>;
  totalVendido: number;
  ganancia: number;
  ranking: Array<{ productName: string; quantity: number }>;
};

const TICKET_WIDTH = 48;
const STORE_NAME = "EL JOKER";
const STORE_ADDRESS = "Elias Abdo 115";
const STORE_PHONE = "Tel: 099 238 454";
const INTERNAL_USE_NOTE = "Uso interno";
const FOOTER_MESSAGE = "Muito obrigado!!";
const DECORATIVE_CHAR = "=";
const DIVIDER_CHAR = "-";

function decorativeBorder() {
  return DECORATIVE_CHAR.repeat(TICKET_WIDTH);
}

function divider() {
  return DIVIDER_CHAR.repeat(TICKET_WIDTH);
}

// Redondea a centesimos y solo muestra decimales cuando realmente los hay
// (un precio editado a mano puede quedar fraccionado, ej. 58,35).
function formatMoney(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  const value = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(".", ",");
  return `$ ${value}`;
}

// Nombres puntuales que se abrevian completos, no palabra por palabra --
// van antes que KITCHEN_NAME_ABBREVIATIONS y la reemplazan del todo (nunca
// pasan por las reglas genericas de abajo). Hace falta esto en vez de
// agregar mas reglas genericas porque, por ejemplo, "doble" ya se abrevia
// a "Dob." en general, y estos nombres puntuales lo quieren tal cual
// ("doble"), asi que si pasaran por la reduce generica se pisarian.
// Coincide con el nombre completo del producto (^...$), asi que solo
// aplica a esos productos exactos, no a substrings de otros nombres.
const KITCHEN_FULL_NAME_OVERRIDES: Array<[RegExp, string]> = [
  [/^hamburguesa especial doble carne$/i, "Esp. doble"],
  [/^hamburguesa americana bbq 2\.0$/i, "BBQ 2.0"],
  [/^hamburguesa americana bbq$/i, "BBQ"]
];

// Abreviaciones de nombres de producto, solo para la comanda de cocina (en
// letra grande ocupan mas lugar, asi entran mas comodas). Agregar aca
// cuando haga falta otra.
const KITCHEN_NAME_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\bhamburguesas?\b/gi, "Hamb."],
  [/\bmilanesas?\b/gi, "Mila."],
  [/\bmuzzarella\b/gi, "Muzza."],
  [/\bdoble\b/gi, "Dob."],
  [/\bpara (\d+) personas?\b/gi, "Para $1"]
];

function abbreviateForKitchen(productName: string) {
  const trimmed = productName.trim();
  const override = KITCHEN_FULL_NAME_OVERRIDES.find(([pattern]) => pattern.test(trimmed));
  if (override) {
    return override[1];
  }

  return KITCHEN_NAME_ABBREVIATIONS.reduce(
    (name, [pattern, replacement]) => name.replace(pattern, replacement),
    productName
  );
}

// A TRIPLE_SIZE_ON (ancho x3) la impresora entra solo TICKET_WIDTH / 3
// caracteres por linea fisica -- si el texto se manda tal cual, la
// impresora lo corta sola donde le toca, a veces a mitad de palabra (ej.
// "Hamburguesa" partido en "Hambur" + "guesa"). Esta funcion arma las
// lineas de antemano, cortando solo entre palabras, para que cada producto
// se lea entero de un vistazo aunque ocupe mas de un renglon impreso.
const KITCHEN_LINE_WIDTH = Math.floor(TICKET_WIDTH / 3);

function wrapForKitchenPrinting(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > KITCHEN_LINE_WIDTH && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines.length ? lines : [text];
}

// El costo de envio es opcional (no todos los pedidos son delivery): si
// esta vacio o no es un numero valido, no se muestra en el ticket.
function parseDeliveryCost(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
// Triple tamano (ancho x3, alto x3): para el nombre/detalle de producto en
// la comanda, un escalon mas grande que DOUBLE_SIZE_ON.
const TRIPLE_SIZE_ON = "\x1D\x21\x22";
// Tamaño intermedio (solo mas alto, ancho normal): la impresora solo soporta
// tamaños fijos por multiplos, no puntos intermedios, asi que este es el
// unico paso entre el tamaño normal y el doble (DOUBLE_SIZE_ON).
const TALL_SIZE_ON = "\x1D\x21\x01";
const CUT_PAPER = "\x1D\x56\x41\x00";

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
// telefono, fecha/hora y "Uso interno". En la comanda (includeStoreDetails
// = false) solo va el titulo, la fecha/hora y "Uso interno". La forma de
// pago no va aca: se muestra junto con Cliente/Direccion en
// pushCustomerSection, para dejar el encabezado mas limpio.
function pushHeader(lines: string[], heading: string, includeStoreDetails: boolean) {
  lines.push(ALIGN_CENTER);
  lines.push(BOLD_ON, DOUBLE_SIZE_ON);
  lines.push(`${heading}\n`);
  lines.push(DOUBLE_SIZE_OFF, BOLD_OFF);
  if (includeStoreDetails) {
    lines.push(`${STORE_ADDRESS}\n`);
    lines.push(`${STORE_PHONE}\n`);
  }
  lines.push(`${new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" })}\n`);
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
  lines.push(`Cliente: ${customerName.trim() || "-"}\n`);
  lines.push(orderAddress.trim() ? `Direccion: ${orderAddress.trim()}\n` : "Retira en local\n");
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
  pushHeader(lines, STORE_NAME, true);
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
  lines.push(BOLD_ON, TALL_SIZE_ON);
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
  // La comanda (no el archivo) va sin numero de linea -- el cocinero solo
  // necesita el "*" y la cantidad, el numero de posicion en la lista es lo
  // que lo confundia con la cantidad. Tambien separa cada producto con una
  // raya doble (decorativeBorder, "="), mas marcada que el guion simple que
  // usan el resto de los tickets, para que no se le pase de un producto a
  // otro de un vistazo.
  const isKitchenCopy = heading === "COMANDA";
  const noteSize = isKitchenCopy ? TRIPLE_SIZE_ON : TALL_SIZE_ON;

  lines.push(ESC_INIT);
  pushHeader(lines, heading, false);
  lines.push(`Pedido #${ticketNumber}\n`);
  pushCustomerSection(lines, orderAddress, customerName, undefined, note, noteSize);

  order.forEach((item, index) => {
    const itemNumber = index + 1;

    const itemText = isKitchenCopy
      ? `* ${item.quantity}x ${abbreviateForKitchen(item.productName)}`
      : `${itemNumber}) ${item.quantity}x ${abbreviateForKitchen(item.productName)}`;

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
