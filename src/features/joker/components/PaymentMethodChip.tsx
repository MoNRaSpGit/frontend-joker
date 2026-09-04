import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderRecord, JokerPaymentMethod } from "../joker.types";

const EDITABLE_PAYMENT_METHODS: JokerPaymentMethod[] = ["efectivo", "tarjeta", "transferencia", "cuenta"];

type PaymentMethodChipProps = {
  order: JokerOrderRecord;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onSelectMethod: (method: JokerPaymentMethod) => void;
  onCancel: () => void;
};

// Chip clickeable para corregir el metodo de pago de un pedido ya cargado
// -- compartido entre PanelScreen y UserPanelScreen (los dos roles pueden
// corregirlo igual). Un pedido ya "a cuenta" no se corrige aca (hay que
// eliminarlo/rehacerlo): pasar A cuenta si se puede, salir de cuenta no.
export function PaymentMethodChip({ order, isEditing, isSaving, onStartEdit, onSelectMethod, onCancel }: PaymentMethodChipProps) {
  if (!isEditing) {
    return (
      <button
        type="button"
        className="joker-order-meta-chip joker-order-meta-chip--clickable"
        disabled={order.paymentMethod === "cuenta"}
        title={order.paymentMethod === "cuenta" ? "Un pedido a cuenta no se corrige aca" : "Corregir metodo de pago"}
        onClick={onStartEdit}
      >
        {JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
      </button>
    );
  }

  return (
    <span className="joker-delivery-assign">
      {EDITABLE_PAYMENT_METHODS.map((method) => (
        <button
          key={method}
          type="button"
          className={`joker-category-chip${method === order.paymentMethod ? " is-active" : ""}`}
          disabled={isSaving}
          onClick={() => onSelectMethod(method)}
        >
          {JOKER_PAYMENT_METHOD_LABELS[method]}
        </button>
      ))}
      <button type="button" className="joker-mini-button" disabled={isSaving} onClick={onCancel}>
        Cancelar
      </button>
    </span>
  );
}
