import { useState } from "react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
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

export function EditOrderModal({ order, isSaving, onClose, onSave }: EditOrderModalProps) {
  const [lines, setLines] = useState<EditableLine[]>(() => order.items.map((item) => ({ ...item })));
  const [confirmingCancelAll, setConfirmingCancelAll] = useState(false);

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

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
        <div className="joker-modal-card">
          <div className="joker-modal-card__header">
            <h2>Editar pedido #{order.displayNumber}</h2>
            <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSaving}>
              Cerrar
            </button>
          </div>

          {lines.length ? (
            <ul className="joker-order-list top-gap">
              {lines.map((line) => (
                <li key={line.productId} className="joker-order-item">
                  <div className="joker-order-item__info">
                    <div>
                      <strong>{line.productName}</strong>
                      <p className="joker-order-item__excluded">{formatPrice(line.unitPrice)} c/u · {formatPrice(line.unitPrice * line.quantity)}</p>
                    </div>
                  </div>
                  <div className="joker-product-row-actions">
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
                    <button
                      type="button"
                      className="joker-order-item__remove"
                      onClick={() => removeLine(line.productId)}
                      aria-label={`Sacar ${line.productName} del pedido`}
                    >
                      x
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="joker-empty-state top-gap">Sacaste todos los productos. Si guardás así, se cancela el pedido entero.</p>
          )}

          <p className="joker-order-item__excluded joker-order-item__excluded--full top-gap">
            <strong>Total: {formatPrice(total)}</strong>
          </p>

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
