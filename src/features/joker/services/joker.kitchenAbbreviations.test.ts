import { describe, expect, it } from "vitest";
import { abbreviateForKitchen, wrapForKitchenPrinting } from "./joker.kitchenAbbreviations";

describe("abbreviateForKitchen", () => {
  it("usa el nombre completo puntual para las hamburguesas pedidas por el cliente", () => {
    expect(abbreviateForKitchen("Hamburguesa Especial Doble Carne")).toBe("Esp. doble");
    expect(abbreviateForKitchen("Hamburguesa Americana BBQ 2.0")).toBe("BBQ 2.0");
    expect(abbreviateForKitchen("Hamburguesa Americana BBQ")).toBe("BBQ");
  });

  it("no deja que la regla generica de 'doble' pise el nombre puntual (bug potencial de orden de reglas)", () => {
    // Si "Hamburguesa Especial Doble Carne" pasara por la reduce generica
    // despues del override, "doble" se volveria a abreviar a "Dob.".
    expect(abbreviateForKitchen("Hamburguesa Especial Doble Carne")).not.toContain("Dob.");
  });

  it("abrevia con las reglas genericas cuando no hay override puntual", () => {
    expect(abbreviateForKitchen("Hamburguesa 4Q")).toBe("Hamb. 4Q");
    expect(abbreviateForKitchen("Milanesa de Carne (Para 1)")).toBe("Mila. de Carne (Para 1)");
  });

  it("deja sin tocar un nombre que no matchea ninguna regla", () => {
    expect(abbreviateForKitchen("Papas Fritas Clásicas (Grande)")).toBe("Papas Fritas Clásicas (Grande)");
  });
});

describe("wrapForKitchenPrinting", () => {
  it("no corta ninguna palabra a la mitad", () => {
    const wrapped = wrapForKitchenPrinting("* 2x Hamburguesa Especial Doble Carne con panceta");
    for (const line of wrapped) {
      expect(line.split(" ").every((word) => word.length > 0)).toBe(true);
    }
    expect(wrapped.join(" ")).toBe("* 2x Hamburguesa Especial Doble Carne con panceta");
  });

  it("deja en una sola linea un texto que ya entra", () => {
    expect(wrapForKitchenPrinting("* 1x Pancho")).toEqual(["* 1x Pancho"]);
  });

  it("nunca devuelve una lista vacia", () => {
    expect(wrapForKitchenPrinting("")).toEqual([""]);
  });
});
