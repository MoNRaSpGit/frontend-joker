import { useState } from "react";
import type { JokerOrderItem, JokerProduct } from "../joker.types";

export function useJokerOrder() {
  const [order, setOrder] = useState<JokerOrderItem[]>([]);

  function addItem(product: JokerProduct, excludedIngredients: string[]) {
    const lineId = `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setOrder((current) => [
      ...current,
      {
        lineId,
        productId: product.id,
        productName: product.name,
        ingredients: product.ingredients,
        excludedIngredients
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
