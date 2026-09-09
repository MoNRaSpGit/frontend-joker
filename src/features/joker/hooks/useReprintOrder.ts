import { useState } from "react";
import { toast } from "react-toastify";
import { printOrderTicket } from "../services/joker.print";
import { isPersistedComboComponentLine } from "../joker.types";
import type { JokerOrderItem, JokerOrderRecord } from "../joker.types";

// Reimprimir un pedido ya confirmado, tal cual esta guardado AHORA -- si se
// edito (se le agrego una coca, se le saco algo), sale con esos cambios,
// no con lo que se imprimio la primera vez. Compartido entre Panel e
// Historial de ventas (los dos muestran pedidos ya confirmados con la
// opcion de editar).
export function useReprintOrder() {
  const [reprintOrder, setReprintOrder] = useState<JokerOrderRecord | null>(null);
  const [isReprinting, setIsReprinting] = useState(false);

  async function confirmReprint(copies: 0 | 1 | 3) {
    if (!reprintOrder) return;

    // "0 tick": se arrepintio, cierra el modal sin mandar nada a la
    // impresora -- mismo criterio que al cargar un pedido nuevo.
    if (copies === 0) {
      setReprintOrder(null);
      return;
    }

    if (reprintOrder.displayNumber === null) {
      toast.error("Este pedido no tiene numero de ticket para reimprimir.");
      return;
    }

    setIsReprinting(true);
    try {
      // Se saca lo "Incluido en <combo>" (la hamburguesa/bebida elegida
      // dentro de un combo, guardada a $0 solo para que el backend
      // descuente el stock correcto) -- si no, la reimpresion muestra el
      // combo desglosado de mas, cosa que el ticket original (impreso al
      // toque de cargarlo) no hace. JokerOrderRecord.items tampoco trae
      // lineId (eso solo existe mientras se arma el pedido en el Scanner/
      // OrdersScreen, no se persiste) -- se genera uno por indice, total
      // da lo mismo para imprimir.
      const printableItems: JokerOrderItem[] = reprintOrder.items
        .filter((item) => !isPersistedComboComponentLine(item))
        .map((item, index) => ({
          lineId: String(index),
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          detail: item.detail ?? ""
        }));

      await printOrderTicket(
        printableItems,
        reprintOrder.address,
        copies,
        reprintOrder.paymentMethod,
        reprintOrder.customerName ?? "",
        reprintOrder.deliveryCost !== null ? String(reprintOrder.deliveryCost) : "",
        reprintOrder.displayNumber,
        reprintOrder.note ?? "",
        reprintOrder.orderDate ?? undefined
      );
      toast.success("Ticket reimpreso.");
      setReprintOrder(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo reimprimir el ticket.");
    } finally {
      setIsReprinting(false);
    }
  }

  return { reprintOrder, setReprintOrder, isReprinting, confirmReprint };
}
