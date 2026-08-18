// Todo lo relacionado a acortar nombres de producto para la comanda de
// cocina (letra grande, poco lugar por linea). Separado de
// joker.ticketFormat.ts porque esta es la parte que mas cambia -- el
// cliente pide ajustes de abreviaciones puntuales seguido, y asi no hay
// que tocar el archivo grande de los tickets para eso.
import { TICKET_WIDTH } from "./joker.escpos";

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

export function abbreviateForKitchen(productName: string) {
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

export function wrapForKitchenPrinting(text: string) {
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
