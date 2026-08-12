import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderRecord, JokerPaymentMethod } from "../joker.types";

type PaymentBreakdownModalProps = {
  method: JokerPaymentMethod;
  orders: JokerOrderRecord[];
  onClose: () => void;
};

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

export function PaymentBreakdownModal({ method, orders, onClose }: PaymentBreakdownModalProps) {
  const matching = orders.filter((order) => order.paymentMethod === method && order.items.length);

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={`Pagos por ${JOKER_PAYMENT_METHOD_LABELS[method]}`}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{JOKER_PAYMENT_METHOD_LABELS[method]}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">Quien pago por este medio, en que pedido.</p>

        {matching.length ? (
          <ul className="joker-order-list top-gap">
            {matching.map((order) => (
              <li key={order.id} className="joker-order-item">
                <div className="joker-order-item__info">
                  <div>
                    <strong>{order.customerName?.trim() || "Sin nombre"}</strong>
                    <p className="joker-order-item__excluded">Pedido #{order.displayNumber}</p>
                  </div>
                </div>
                <strong className="joker-amount-plus">+{formatPrice(order.total)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state top-gap">Todavia no hay pagos por {JOKER_PAYMENT_METHOD_LABELS[method].toLowerCase()} hoy.</p>
        )}
      </div>
    </div>
  );
}
