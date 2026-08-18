import { describe, expect, it } from "vitest";
import { buildOrderTicketLines } from "./joker.ticketFormat";
import type { JokerOrderItem } from "../joker.types";

const order: JokerOrderItem[] = [
  { lineId: "1", productId: 1, productName: "Hamburguesa Especial Doble Carne", unitPrice: 260, detail: "", quantity: 2 },
  { lineId: "2", productId: 2, productName: "Coca-Cola (600 ml)", unitPrice: 140, detail: "sin hielo", quantity: 1 }
];

function fullText(lines: string[]) {
  return lines.join("");
}

describe("buildOrderTicketLines", () => {
  it("con 1 copia, solo arma el ticket de mostrador", () => {
    const text = fullText(buildOrderTicketLines(order, "", 1, "efectivo", "Fede", "", 482, ""));
    expect(text).toContain("EL JOKER");
    expect(text).not.toContain("COMANDA");
    expect(text).not.toContain("ARCHIVO");
  });

  it("con 3 copias, arma mostrador + comanda + archivo, en ese orden", () => {
    const text = fullText(buildOrderTicketLines(order, "", 3, "efectivo", "Fede", "", 482, ""));
    const mostradorIndex = text.indexOf("EL JOKER");
    const comandaIndex = text.indexOf("COMANDA");
    const archivoIndex = text.indexOf("ARCHIVO");

    expect(mostradorIndex).toBeGreaterThanOrEqual(0);
    expect(comandaIndex).toBeGreaterThan(mostradorIndex);
    expect(archivoIndex).toBeGreaterThan(comandaIndex);
  });

  it("el asterisco de separacion solo sale en la comanda, no en mostrador ni archivo", () => {
    const lines = buildOrderTicketLines(order, "", 3, "efectivo", "Fede", "", 482, "");
    const text = fullText(lines);
    const comandaStart = text.indexOf("COMANDA");
    const archivoStart = text.indexOf("ARCHIVO");

    const comandaSection = text.slice(comandaStart, archivoStart);
    const archivoSection = text.slice(archivoStart);
    const mostradorSection = text.slice(0, comandaStart);

    expect(comandaSection).toContain("* 2x");
    expect(archivoSection).not.toContain("* 2x");
    expect(mostradorSection).not.toContain("* 2x");
  });

  it("la nota del pedido sale en las 3 copias cuando se pasa", () => {
    const text = fullText(buildOrderTicketLines(order, "", 3, "efectivo", "Fede", "", 482, "Para las 12"));
    expect(text.match(/Nota: Para las 12/g)).toHaveLength(3);
  });

  it("no imprime la nota si viene vacia", () => {
    const text = fullText(buildOrderTicketLines(order, "", 3, "efectivo", "Fede", "", 482, "   "));
    expect(text).not.toContain("Nota:");
  });

  it("suma el total del mostrador incluyendo el costo de envio", () => {
    const text = fullText(buildOrderTicketLines(order, "", 1, "efectivo", "Fede", "150", 482, ""));
    // 2x260 + 1x140 = 660, + 150 envio = 810
    expect(text).toContain("Costo de envio");
    expect(text).toContain("$ 810");
  });
});
