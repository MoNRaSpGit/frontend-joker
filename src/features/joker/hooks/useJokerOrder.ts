import { useState } from "react";
import type { ComboComponentSelection, JokerOrderItem, JokerProduct } from "../joker.types";

export function useJokerOrder() {
  const [order, setOrder] = useState<JokerOrderItem[]>([]);
  const [orderAddress, setOrderAddress] = useState("");
  const [orderCustomerName, setOrderCustomerName] = useState("");
  const [orderDeliveryCost, setOrderDeliveryCost] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [orderDate, setOrderDate] = useState("");

  // Los componentes de combo (ej: la hamburguesa y el refresco elegidos
  // dentro de un Combo Nº2) se agregan como lineas propias a $0: no suman
  // al total (ya esta incluido en el precio del combo) pero cada una tiene
  // su propio productId, asi el backend descuenta el stock de lo que
  // realmente se eligio en vez de una receta fija del combo.
  function addItem(product: JokerProduct, detail: string, quantity: number, comboComponents: ComboComponentSelection[] = []) {
    const lineId = `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const componentLines: JokerOrderItem[] = comboComponents.map((component, index) => ({
      lineId: `${lineId}-combo-${index}`,
      productId: component.product.id,
      productName: component.product.name,
      unitPrice: 0,
      detail: `Incluido en ${product.name}`,
      quantity: component.quantity * quantity
    }));

    setOrder((current) => [
      ...current,
      {
        lineId,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        detail,
        quantity
      },
      ...componentLines
    ]);
  }

  // comboComponents (si se pasa) reemplaza del todo las lineas hijas
  // "-combo-N" de este item -- antes, editar un combo ya agregado no tenia
  // forma de recambiar una eleccion (ej: pasar de la hamburguesa por
  // defecto a "4 quesos"), asi que quedaba la eleccion vieja pegada a $0
  // en el pedido junto a la nueva. Si no se pasa comboComponents (item sin
  // combo), no se tocan las demas lineas.
  function updateItem(
    lineId: string,
    detail: string,
    quantity: number,
    unitPrice: number,
    comboComponents?: ComboComponentSelection[]
  ) {
    setOrder((current) => {
      const withoutOldComboChildren = comboComponents
        ? current.filter((item) => !item.lineId.startsWith(`${lineId}-combo-`))
        : current;

      const updated = withoutOldComboChildren.map((item) =>
        item.lineId === lineId ? { ...item, detail, quantity, unitPrice } : item
      );

      if (!comboComponents || !comboComponents.length) {
        return updated;
      }

      const mainIndex = updated.findIndex((item) => item.lineId === lineId);
      const mainItem = updated[mainIndex];

      const newComponentLines: JokerOrderItem[] = comboComponents.map((component, index) => ({
        lineId: `${lineId}-combo-${index}`,
        productId: component.product.id,
        productName: component.product.name,
        unitPrice: 0,
        detail: `Incluido en ${mainItem?.productName ?? ""}`,
        quantity: component.quantity * quantity
      }));

      return [...updated.slice(0, mainIndex + 1), ...newComponentLines, ...updated.slice(mainIndex + 1)];
    });
  }

  function removeItem(lineId: string) {
    setOrder((current) => current.filter((item) => item.lineId !== lineId));
  }

  function clearOrder() {
    setOrder([]);
    setOrderAddress("");
    setOrderCustomerName("");
    setOrderDeliveryCost("");
    setOrderNote("");
    setOrderDate("");
  }

  return {
    order,
    orderAddress,
    setOrderAddress,
    orderCustomerName,
    setOrderCustomerName,
    orderDeliveryCost,
    setOrderDeliveryCost,
    orderNote,
    setOrderNote,
    orderDate,
    setOrderDate,
    addItem,
    updateItem,
    removeItem,
    clearOrder
  };
}
