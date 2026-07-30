import { useState } from "react";
import type { JokerOrderItem, JokerProduct } from "../joker.types";

export function useJokerOrder() {
  const [order, setOrder] = useState<JokerOrderItem[]>([]);
  const [orderAddress, setOrderAddress] = useState("");
  const [orderCustomerName, setOrderCustomerName] = useState("");

  function addItem(product: JokerProduct, detail: string, quantity: number) {
    const lineId = `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setOrder((current) => [
      ...current,
      {
        lineId,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        detail,
        quantity
      }
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
  }

  return {
    order,
    orderAddress,
    setOrderAddress,
    orderCustomerName,
    setOrderCustomerName,
    addItem,
    updateItem,
    removeItem,
    clearOrder
  };
}
