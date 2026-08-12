import { useState } from "react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderRecord } from "../joker.types";

type EditableLine = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  detail?: string;
};

type EditOrderModalProps = {
  order: JokerOrderRecord;
  isSaving: boolean;
  onClose: () => void;
  onSave: (items: EditableLine[]) => Promise<void>;
};

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function formatDateTime(isoDate: string) {
  const date = new Date(isoDate);
  const dateLabel = date.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

export function EditOrderModal({ order, isSaving, onClose, onSave }: EditOrderModalProps) {
  const [lines, setLines] = useState<EditableLine[]>(() => order.items.map((item) => ({ ...item })));
  const [confirmingCancelAll, setConfirmingCancelAll] = useState(false);

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const originalTotal = order.total;

  function adjustQuantity(productId: number, delta: number) {
    setLines((current) =>
      current
        .map((line) => (line.productId === productId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  function removeLine(productId: number) {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }

  function handleSaveClick() {
    if (!lines.length) {
      setConfirmingCancelAll(true);
      return;
    }
    void onSave(lines);
  }

  async function handleConfirmCancelAll() {
    await onSave([]);
    setConfirmingCancelAll(false);
  }

  return (
    <>
      <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={`Editar pedido #${order.displayNumber}`}>
        <div className="joker-modal-card joker-modal-card--wide">
          <div className="joker-edit-order__header">
            <div>
              <p className="joker-eyebrow">Editar pedido</p>
              <h2 className="joker-edit-order__title">Pedido #{order.displayNumber}</h2>
              <p className="joker-order-item__excluded">
                {formatDateTime(order.createdAt)} · {JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
              </p>
            </div>
            <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSaving}>
              Cerrar
            </button>
          </div>

          <div className="joker-edit-order__lines">
            {lines.length ? (
              lines.map((line) => (
                <div key={line.productId} className="joker-edit-order__row">
                  <div className="joker-edit-order__row-info">
                    <strong>{line.productName}</strong>
                    <span className="joker-order-item__excluded">{formatPrice(line.unitPrice)} c/u</span>
                    {line.detail ? <span className="joker-order-item__excluded">{line.detail}</span> : null}
                  </div>

                  <div className="joker-edit-order__row-controls">
                    <div className="joker-quantity-stepper">
                      <button
                        type="button"
                        className="joker-quantity-stepper__btn"
                        onClick={() => adjustQuantity(line.productId, -1)}
                        aria-label={`Restar ${line.productName}`}
                      >
                        -
                      </button>
                      <span className="joker-quantity-stepper__value">{line.quantity}</span>
                      <button
                        type="button"
                        className="joker-quantity-stepper__btn"
                        onClick={() => adjustQuantity(line.productId, 1)}
                        aria-label={`Sumar ${line.productName}`}
                      >
                        +
                      </button>
                    </div>

                    <strong className="joker-edit-order__row-total">{formatPrice(line.unitPrice * line.quantity)}</strong>

                    <button
                      type="button"
                      className="joker-order-item__remove"
                      onClick={() => removeLine(line.productId)}
                      aria-label={`Sacar ${line.productName} del pedido`}
                    >
                      x
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="joker-empty-state">Sacaste todos los productos. Si guardás así, se cancela el pedido entero.</p>
            )}
          </div>

          <div className="joker-edit-order__footer">
            <div className="joker-edit-order__totals">
              {total !== originalTotal ? (
                <span className="joker-order-item__excluded joker-edit-order__totals-before">Antes: {formatPrice(originalTotal)}</span>
              ) : null}
              <strong className="joker-edit-order__totals-now">Total: {formatPrice(total)}</strong>
            </div>

            <div className="joker-modal-card__actions">
              <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSaving}>
                Cancelar edición
              </button>
              <button type="button" className="joker-button joker-button--primary" onClick={handleSaveClick} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmingCancelAll ? (
        <ConfirmDeleteModal
          title="Cancelar pedido"
          message={`Sacaste todos los productos del pedido #${order.displayNumber}. ¿Seguro que querés cancelarlo entero? El stock descontado se devuelve.`}
          confirmLabel="Cancelar pedido"
          confirmLabelBusy="Cancelando..."
          variant="danger"
          isDeleting={isSaving}
          onCancel={() => setConfirmingCancelAll(false)}
          onConfirm={handleConfirmCancelAll}
        />
      ) : null}
    </>
  );
}
