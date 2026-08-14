import { useState } from "react";
import type { ComboComponentSelection, JokerOrderItem, JokerProduct } from "../joker.types";

export function useJokerOrder() {
  const [order, setOrder] = useState<JokerOrderItem[]>([]);
  const [orderAddress, setOrderAddress] = useState("");
  const [orderCustomerName, setOrderCustomerName] = useState("");
  const [orderDeliveryCost, setOrderDeliveryCost] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [orderCourierId, setOrderCourierId] = useState("");

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

  function updateItem(lineId: string, detail: string, quantity: number, unitPrice: number) {
    setOrder((current) =>
      current.map((item) => (item.lineId === lineId ? { ...item, detail, quantity, unitPrice } : item))
    );
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
    setOrderCourierId("");
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
    orderCourierId,
    setOrderCourierId,
    addItem,
    updateItem,
    removeItem,
    clearOrder
  };
}
