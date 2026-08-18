import { describe, expect, it } from "vitest";
import { addOrderItem, removeOrderItem, updateOrderItem } from "./joker.orderLogic";
import type { JokerOrderItem, JokerProduct } from "../joker.types";

const combo4: JokerProduct = { id: 74, name: "Combo 4", category: "Menú Combos", price: 500 };
const hamburguesa4Q: JokerProduct = { id: 25, name: "Hamburguesa 4Q", category: "Hamburguesas", price: 0 };
const hamburguesaEspecial: JokerProduct = { id: 27, name: "Hamburguesa Especial Doble Carne", category: "Hamburguesas", price: 0 };
const cocaCola: JokerProduct = { id: 249, name: "Coca-Cola (600 ml)", category: "Refrescos Chicos", price: 0 };
const papasFritas: JokerProduct = { id: 56, name: "Papas Fritas Clásicas (Grande)", category: "Papas Fritas", price: 200 };

const suffix = (value: string) => () => value;

describe("addOrderItem", () => {
  it("agrega un producto simple como una sola linea, sin hijas", () => {
    const order = addOrderItem([], papasFritas, "", 1, [], suffix("a"));
    expect(order).toEqual<JokerOrderItem[]>([
      { lineId: "56-a", productId: 56, productName: papasFritas.name, unitPrice: 200, detail: "", quantity: 1 }
    ]);
  });

  it("agrega un combo como linea principal + una linea hija a $0 por componente", () => {
    const order = addOrderItem(
      [],
      combo4,
      "Hamburguesa: 4Q · Bebida: Coca-Cola",
      1,
      [
        { product: hamburguesa4Q, quantity: 1 },
        { product: cocaCola, quantity: 1 }
      ],
      suffix("x")
    );

    expect(order).toHaveLength(3);
    expect(order[0]).toMatchObject({ lineId: "74-x", productId: 74, unitPrice: 500 });
    expect(order[1]).toMatchObject({ lineId: "74-x-combo-0", productId: 25, unitPrice: 0, parentLineId: "74-x" });
    expect(order[2]).toMatchObject({ lineId: "74-x-combo-1", productId: 249, unitPrice: 0, parentLineId: "74-x" });
  });

  it("multiplica la cantidad del componente por la cantidad del combo", () => {
    const order = addOrderItem([], combo4, "", 3, [{ product: hamburguesa4Q, quantity: 1 }], suffix("x"));
    expect(order[1].quantity).toBe(3);
  });
});

describe("updateOrderItem", () => {
  it("recambia las hijas de un combo en vez de sumarlas a las viejas (bug: quedaba la eleccion vieja + la nueva)", () => {
    const original = addOrderItem(
      [],
      combo4,
      "Hamburguesa: 4Q · Bebida: Coca-Cola",
      1,
      [
        { product: hamburguesa4Q, quantity: 1 },
        { product: cocaCola, quantity: 1 }
      ],
      suffix("x")
    );

    const updated = updateOrderItem(original, "74-x", "Hamburguesa: Especial Doble Carne · Bebida: Coca-Cola", 1, 500, [
      { product: hamburguesaEspecial, quantity: 1 },
      { product: cocaCola, quantity: 1 }
    ]);

    expect(updated).toHaveLength(3);
    const componentProductIds = updated.filter((item) => item.parentLineId === "74-x").map((item) => item.productId);
    expect(componentProductIds).toEqual([27, 249]);
    expect(componentProductIds).not.toContain(25); // la 4Q vieja no debe quedar pegada
  });

  it("no toca otras lineas del pedido al editar una", () => {
    const order = [
      ...addOrderItem([], papasFritas, "", 1, [], suffix("a")),
      ...addOrderItem([], cocaCola, "", 2, [], suffix("b"))
    ];

    const updated = updateOrderItem(order, "56-a", "sin sal", 2, 200);

    expect(updated.find((item) => item.lineId === "56-a")).toMatchObject({ detail: "sin sal", quantity: 2 });
    expect(updated.find((item) => item.lineId === "249-b")).toMatchObject({ quantity: 2 });
  });

  it("si no se pasa comboComponents, no toca las hijas existentes", () => {
    const order = addOrderItem([], combo4, "", 1, [{ product: hamburguesa4Q, quantity: 1 }], suffix("x"));
    const updated = updateOrderItem(order, "74-x", "nueva nota", 1, 500);

    expect(updated).toHaveLength(2);
    expect(updated[1]).toMatchObject({ productId: 25, parentLineId: "74-x" });
  });
});

describe("removeOrderItem", () => {
  it("borra la linea principal de un combo junto con sus hijas (bug: quedaban huerfanas)", () => {
    const order = addOrderItem(
      [],
      combo4,
      "",
      1,
      [
        { product: hamburguesa4Q, quantity: 1 },
        { product: cocaCola, quantity: 1 }
      ],
      suffix("x")
    );

    const afterRemove = removeOrderItem(order, "74-x");

    expect(afterRemove).toEqual([]);
  });

  it("borrar un producto simple no afecta al resto del pedido", () => {
    const order = [
      ...addOrderItem([], papasFritas, "", 1, [], suffix("a")),
      ...addOrderItem([], cocaCola, "", 1, [], suffix("b"))
    ];

    const afterRemove = removeOrderItem(order, "56-a");

    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0].lineId).toBe("249-b");
  });
});
