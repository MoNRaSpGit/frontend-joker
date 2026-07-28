import { useState } from "react";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerPaymentMethod } from "../joker.types";

const PAYMENT_METHODS: JokerPaymentMethod[] = ["efectivo", "tarjeta", "cuenta"];

type PaymentMethodModalProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: JokerPaymentMethod) => void;
};

export function PaymentMethodModal({ isSubmitting, onClose, onConfirm }: PaymentMethodModalProps) {
  const [selected, setSelected] = useState<JokerPaymentMethod>("efectivo");

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Metodo de pago">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Metodo de pago</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">Como paga este pedido?</p>

        <div className="joker-category-chips">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              className={`joker-category-chip${selected === method ? " is-active" : ""}`}
              onClick={() => setSelected(method)}
            >
              {JOKER_PAYMENT_METHOD_LABELS[method]}
            </button>
          ))}
        </div>

        <div className="joker-modal-card__actions joker-modal-card__actions--top-gap">
          <button
            type="button"
            className="joker-button joker-button--primary"
            onClick={() => onConfirm(selected)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Imprimiendo..." : "Imprimir"}
          </button>
        </div>
      </div>
    </div>
  );
}
