// Comandos ESC/POS crudos (control de la impresora termica) + helpers de
// formato genericos para armar tickets -- nada de esto sabe nada sobre
// pedidos, comandas ni combos, es solo el "lenguaje" con el que se arma
// cualquier ticket. Separado de joker.ticketFormat.ts para que tocar el
// formato de UN tipo de ticket no obligue a leer/tocar esto tambien.

export const TICKET_WIDTH = 48;

const DECORATIVE_CHAR = "=";
const DIVIDER_CHAR = "-";

export function decorativeBorder() {
  return DECORATIVE_CHAR.repeat(TICKET_WIDTH);
}

export function divider() {
  return DIVIDER_CHAR.repeat(TICKET_WIDTH);
}

// Redondea a centesimos y solo muestra decimales cuando realmente los hay
// (un precio editado a mano puede quedar fraccionado, ej. 58,35).
export function formatMoney(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  const value = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2).replace(".", ",");
  return `$ ${value}`;
}

// El costo de envio es opcional (no todos los pedidos son delivery): si
// esta vacio o no es un numero valido, no se muestra en el ticket.
export function parseDeliveryCost(value: string) {
  const parsed = Number(value.trim().replace(",", "."));
  return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// Arma una linea con el label a la izquierda y el valor pegado a la derecha,
// rellenando el medio con espacios. width es la cantidad de caracteres que
// entran por linea fisica -- normal es TICKET_WIDTH, pero con DOUBLE_SIZE_ON
// (o cualquier tamano que duplique el ancho) entran la mitad: sin pasar un
// width mas chico ahi, la linea calculada para 48 columnas no entraba en las
// 24 reales y la impresora la cortaba a la mitad, mandando el valor a un
// renglon aparte.
export function rightAlignedLine(label: string, value: string, width: number = TICKET_WIDTH) {
  const gap = Math.max(1, width - label.length - value.length);
  return `${label}${" ".repeat(gap)}${value}`;
}

export const ESC_INIT = "\x1B\x40";
export const ALIGN_CENTER = "\x1B\x61\x01";
export const ALIGN_LEFT = "\x1B\x61\x00";
export const BOLD_ON = "\x1B\x45\x01";
export const BOLD_OFF = "\x1B\x45\x00";
export const DOUBLE_SIZE_ON = "\x1D\x21\x11";
export const DOUBLE_SIZE_OFF = "\x1D\x21\x00";
// Triple tamano (ancho x3, alto x3): para el nombre/detalle de producto en
// la comanda, un escalon mas grande que DOUBLE_SIZE_ON.
export const TRIPLE_SIZE_ON = "\x1D\x21\x22";
// Tamaño intermedio (solo mas alto, ancho normal): la impresora solo soporta
// tamaños fijos por multiplos, no puntos intermedios, asi que este es el
// unico paso entre el tamaño normal y el doble (DOUBLE_SIZE_ON).
export const TALL_SIZE_ON = "\x1D\x21\x01";
export const CUT_PAPER = "\x1D\x56\x41\x00";
