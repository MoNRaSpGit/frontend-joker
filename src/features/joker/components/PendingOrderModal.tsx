import { useState } from "react";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderRecord } from "../joker.types";

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

type PendingOrderModalProps = {
  order: JokerOrderRecord;
  queueCount: number;
  onAccept: (order: JokerOrderRecord) => Promise<void>;
  onReject: (order: JokerOrderRecord) => Promise<void>;
  onDismiss: () => void;
};

// Pop-up que ve el Administrador cuando el Usuario (mostrador) manda un
// pedido: queda "pendiente" hasta que aca se lo acepta (recien ahi entra a
// cocina con numero real) o se lo rechaza. Se abre solo al hacer click en
// el cartelito (PendingOrderBadge) -- no aparece solo tapando la pantalla,
// para no interrumpir lo que este haciendo el admin.
export function PendingOrderModal({ order, queueCount, onAccept, onReject, onDismiss }: PendingOrderModalProps) {
  const [isBusy, setIsBusy] = useState<"accept" | "reject" | null>(null);

  async function handleAccept() {
    setIsBusy("accept");
    try {
      await onAccept(order);
    } finally {
      setIsBusy(null);
    }
  }

  async function handleReject() {
    setIsBusy("reject");
    try {
      await onReject(order);
    } finally {
      setIsBusy(null);
    }
  }

  return (
    <div
      className="joker-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Pedido pendiente"
      onClick={() => {
        if (isBusy === null) onDismiss();
      }}
    >
      <div className="joker-modal-card joker-pending-order-modal" onClick={(event) => event.stopPropagation()}>
        <p className="joker-eyebrow">Mostrador</p>
        <h2>Pedido pendiente{queueCount > 1 ? ` (1 de ${queueCount})` : ""}</h2>

        <ul className="joker-order-detail-list">
          {order.items.map((item, index) => (
            <li key={index}>
              <span className="joker-qty-badge">{item.quantity}</span>
              <div>
                <strong>{item.productName}</strong>
                {item.detail ? <p className="joker-order-item__excluded">{item.detail}</p> : null}
              </div>
            </li>
          ))}
        </ul>

        <div className="joker-order-meta-row">
          <span className="joker-order-meta-chip">{JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
          {order.customerName ? <span className="joker-order-meta-chip">{order.customerName}</span> : null}
        </div>

        <p className="joker-pending-order-modal__total">Total: {formatPrice(order.total)}</p>

        <div className="joker-pending-order-modal__actions">
          <button
            type="button"
            className="joker-button joker-button--danger joker-button--auto"
            disabled={isBusy !== null}
            onClick={handleReject}
          >
            {isBusy === "reject" ? "Cancelando..." : "Cancelar"}
          </button>
          <button
            type="button"
            className="joker-button joker-button--primary joker-button--auto"
            disabled={isBusy !== null}
            onClick={handleAccept}
          >
            {isBusy === "accept" ? "Aceptando..." : "Aceptar"}
          </button>
        </div>

        <button type="button" className="joker-pending-order-modal__dismiss" disabled={isBusy !== null} onClick={onDismiss}>
          Ahora no, decido despues
        </button>
      </div>
    </div>
  );
}
