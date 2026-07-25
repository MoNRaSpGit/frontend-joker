import { useState } from "react";
import type { JokerOrderItem, JokerProduct } from "../joker.types";

export function useJokerOrder() {
  const [order, setOrder] = useState<JokerOrderItem[]>([]);

  function addItem(product: JokerProduct, address: string, detail: string, quantity: number) {
    const lineId = `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setOrder((current) => [
      ...current,
      {
        lineId,
        productId: product.id,
        productName: product.name,
        address,
        detail,
        quantity
      }
    ]);
  }

  function updateItem(lineId: string, address: string, detail: string, quantity: number) {
    setOrder((current) => current.map((item) => (item.lineId === lineId ? { ...item, address, detail, quantity } : item)));
  }

  function removeItem(lineId: string) {
    setOrder((current) => current.filter((item) => item.lineId !== lineId));
  }

  function clearOrder() {
    setOrder([]);
  }

  return { order, addItem, updateItem, removeItem, clearOrder };
}
