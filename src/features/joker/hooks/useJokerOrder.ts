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

  function removeItem(lineId: string) {
    setOrder((current) => current.filter((item) => item.lineId !== lineId));
  }

  function clearOrder() {
    setOrder([]);
  }

  return { order, addItem, removeItem, clearOrder };
}
