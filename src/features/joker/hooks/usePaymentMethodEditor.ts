import { useState } from "react";
import { toast } from "react-toastify";
import { updateOrder } from "../joker.api";
import type { JokerOrderRecord } from "../joker.types";

// Corregir el metodo de pago de un pedido ya cargado (ej: se cargo
// "efectivo" pero era "transferencia") -- compartido entre PanelScreen
// (Administrador) y UserPanelScreen (Usuario), los dos pueden corregirlo
// igual. Pasar a "cuenta" es aparte (cuentaPickerOrder + confirmCuenta):
// crea un movimiento de cuenta corriente de verdad, asi que primero hay
// que elegir el cliente (ver SelectClientModal en cada pantalla).
export function usePaymentMethodEditor(
  setOrders: React.Dispatch<React.SetStateAction<JokerOrderRecord[]>>,
  onAccountEntryRegistered: () => void
) {
  const [editingPaymentOrderId, setEditingPaymentOrderId] = useState<number | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [cuentaPickerOrder, setCuentaPickerOrder] = useState<JokerOrderRecord | null>(null);

  async function changePaymentMethod(order: JokerOrderRecord, paymentMethod: "efectivo" | "tarjeta" | "transferencia") {
    setIsSavingPayment(true);
    try {
      const response = await updateOrder(order.id, order.items, order.orderDate ?? undefined, undefined, undefined, paymentMethod);
      setOrders((current) => current.map((item) => (item.id === order.id ? response.item : item)));
      setEditingPaymentOrderId(null);
      toast.success("Metodo de pago actualizado.");
      if (order.paymentMethod === "cuenta") {
        // Si el pedido era "a cuenta", el backend borra el movimiento de
        // cuenta corriente asociado -- hay que refrescar esa pantalla.
        onAccountEntryRegistered();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el metodo de pago.");
    } finally {
      setIsSavingPayment(false);
    }
  }

  async function confirmCuenta(clientId: number) {
    if (!cuentaPickerOrder) return;
    setIsSavingPayment(true);
    try {
      const response = await updateOrder(
        cuentaPickerOrder.id,
        cuentaPickerOrder.items,
        cuentaPickerOrder.orderDate ?? undefined,
        undefined,
        undefined,
        "cuenta",
        clientId
      );
      setOrders((current) => current.map((item) => (item.id === cuentaPickerOrder.id ? response.item : item)));
      setEditingPaymentOrderId(null);
      setCuentaPickerOrder(null);
      toast.success("Metodo de pago actualizado.");
      onAccountEntryRegistered();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo pasar el pedido a cuenta corriente.");
    } finally {
      setIsSavingPayment(false);
    }
  }

  return {
    editingPaymentOrderId,
    setEditingPaymentOrderId,
    isSavingPayment,
    cuentaPickerOrder,
    setCuentaPickerOrder,
    changePaymentMethod,
    confirmCuenta
  };
}
