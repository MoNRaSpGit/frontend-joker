import { useState } from "react";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerClient, JokerPaymentMethod } from "../joker.types";

const PAYMENT_METHODS: JokerPaymentMethod[] = ["efectivo", "tarjeta", "transferencia", "cuenta"];

type PaymentMethodModalProps = {
  clients: JokerClient[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (paymentMethod: JokerPaymentMethod, clientId?: number) => void;
};

export function PaymentMethodModal({ clients, isSubmitting, onClose, onConfirm }: PaymentMethodModalProps) {
  const [selected, setSelected] = useState<JokerPaymentMethod>("efectivo");
  const [clientId, setClientId] = useState("");

  const needsClient = selected === "cuenta";
  const canConfirm = !needsClient || clientId !== "";

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
              className={`joker-category-chip joker-category-chip--${method}${selected === method ? " is-active" : ""}`}
              onClick={() => setSelected(method)}
            >
              {JOKER_PAYMENT_METHOD_LABELS[method]}
            </button>
          ))}
        </div>

        {needsClient ? (
          <label className="joker-form-field joker-modal-card__actions--top-gap">
            <span>Cliente</span>
            <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
              <option value="">Elegir cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="joker-modal-card__actions joker-modal-card__actions--top-gap">
          <button
            type="button"
            className="joker-button joker-button--primary"
            onClick={() => onConfirm(selected, needsClient ? Number(clientId) : undefined)}
            disabled={isSubmitting || !canConfirm}
          >
            {isSubmitting ? "Imprimiendo..." : "Imprimir"}
          </button>
        </div>
      </div>
    </div>
  );
}
