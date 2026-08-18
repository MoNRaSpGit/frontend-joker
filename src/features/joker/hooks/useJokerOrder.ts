import { useState } from "react";
import { addOrderItem, removeOrderItem, updateOrderItem } from "./joker.orderLogic";
import type { ComboComponentSelection, JokerOrderItem, JokerProduct } from "../joker.types";

export function useJokerOrder() {
  const [order, setOrder] = useState<JokerOrderItem[]>([]);
  const [orderAddress, setOrderAddress] = useState("");
  const [orderCustomerName, setOrderCustomerName] = useState("");
  const [orderDeliveryCost, setOrderDeliveryCost] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [orderDate, setOrderDate] = useState("");

  function addItem(product: JokerProduct, detail: string, quantity: number, comboComponents: ComboComponentSelection[] = []) {
    setOrder((current) => addOrderItem(current, product, detail, quantity, comboComponents));
  }

  function updateItem(
    lineId: string,
    detail: string,
    quantity: number,
    unitPrice: number,
    comboComponents?: ComboComponentSelection[]
  ) {
    setOrder((current) => updateOrderItem(current, lineId, detail, quantity, unitPrice, comboComponents));
  }

  function removeItem(lineId: string) {
    setOrder((current) => removeOrderItem(current, lineId));
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
