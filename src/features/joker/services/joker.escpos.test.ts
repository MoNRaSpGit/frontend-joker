import { describe, expect, it } from "vitest";
import { formatMoney, parseDeliveryCost, rightAlignedLine, TICKET_WIDTH } from "./joker.escpos";

describe("formatMoney", () => {
  it("no muestra decimales para montos enteros", () => {
    expect(formatMoney(500)).toBe("$ 500");
  });

  it("muestra decimales con coma cuando el monto viene fraccionado", () => {
    expect(formatMoney(58.35)).toBe("$ 58,35");
  });

  it("redondea a centesimos", () => {
    expect(formatMoney(58.356)).toBe("$ 58,36");
  });
});

describe("parseDeliveryCost", () => {
  it("acepta coma o punto decimal", () => {
    expect(parseDeliveryCost("150,50")).toBe(150.5);
    expect(parseDeliveryCost("150.50")).toBe(150.5);
  });

  it("devuelve null si esta vacio, no es numero, o es 0/negativo", () => {
    expect(parseDeliveryCost("")).toBeNull();
    expect(parseDeliveryCost("  ")).toBeNull();
    expect(parseDeliveryCost("abc")).toBeNull();
    expect(parseDeliveryCost("0")).toBeNull();
    expect(parseDeliveryCost("-10")).toBeNull();
  });
});

describe("rightAlignedLine", () => {
  it("rellena con espacios hasta el ancho del ticket", () => {
    const line = rightAlignedLine("Total ", "$ 500");
    expect(line.length).toBe(TICKET_WIDTH);
    expect(line.startsWith("Total ")).toBe(true);
    expect(line.endsWith("$ 500")).toBe(true);
  });

  it("nunca deja un gap negativo si el label+valor superan el ancho", () => {
    const longLabel = "x".repeat(TICKET_WIDTH + 10);
    const line = rightAlignedLine(longLabel, "$ 1");
    expect(line).toBe(`${longLabel} $ 1`);
  });
});
