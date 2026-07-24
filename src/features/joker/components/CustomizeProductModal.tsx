import { useState } from "react";
import type { JokerProduct } from "../joker.types";

type CustomizeProductModalProps = {
  product: JokerProduct;
  onClose: () => void;
  onConfirm: (detail: string, quantity: number) => void;
};

export function CustomizeProductModal({ product, onClose, onConfirm }: CustomizeProductModalProps) {
  const [detail, setDetail] = useState("");
  const [quantity, setQuantity] = useState(1);

  function handleConfirm() {
    onConfirm(detail.trim(), quantity);
    onClose();
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(99, current + 1));
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={`Personalizar ${product.name}`}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{product.name}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">Cantidad</p>

        <div className="joker-quantity-stepper">
          <button type="button" className="joker-quantity-stepper__btn" onClick={decreaseQuantity} disabled={quantity <= 1}>
            -
          </button>
          <span className="joker-quantity-stepper__value">{quantity}</span>
          <button type="button" className="joker-quantity-stepper__btn" onClick={increaseQuantity} disabled={quantity >= 99}>
            +
          </button>
        </div>

        <p className="joker-modal-card__hint">Detalle del pedido (ej: Sin lechuga, con doble queso).</p>

        <textarea
          className="joker-detail-input"
          rows={4}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="Escribi aca el detalle..."
          autoFocus
        />

        <div className="joker-modal-card__actions">
          <button type="button" className="joker-button joker-button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="joker-button joker-button--primary" onClick={handleConfirm}>
            Agregar al pedido
          </button>
        </div>
      </div>
    </div>
  );
}
