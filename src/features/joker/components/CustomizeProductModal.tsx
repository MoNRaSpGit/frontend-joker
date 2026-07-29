import { useState } from "react";
import { splitVariantLabel } from "../joker.variants";
import type { JokerProduct } from "../joker.types";

type CustomizeProductModalProps = {
  variants: JokerProduct[];
  initialAddress?: string;
  initialDetail?: string;
  initialQuantity?: number;
  isEditing?: boolean;
  onClose: () => void;
  onConfirm: (variant: JokerProduct, address: string, detail: string, quantity: number) => void;
};

function formatPrice(price: number) {
  return price.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

export function CustomizeProductModal({
  variants,
  initialAddress = "",
  initialDetail = "",
  initialQuantity = 1,
  isEditing = false,
  onClose,
  onConfirm
}: CustomizeProductModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [address, setAddress] = useState(initialAddress);
  const [detail, setDetail] = useState(initialDetail);
  const [quantity, setQuantity] = useState(initialQuantity);

  const selectedVariant = variants[selectedIndex];
  const { baseName } = splitVariantLabel(selectedVariant.name);
  const hasVariants = variants.length > 1;

  function handleConfirm() {
    onConfirm(selectedVariant, address.trim(), detail.trim(), quantity);
    onClose();
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(99, current + 1));
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={`Personalizar ${baseName}`}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{baseName}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {hasVariants ? (
          <>
            <p className="joker-modal-card__hint">Elegí una opción</p>
            <div className="joker-category-chips">
              {variants.map((variant, index) => {
                const { variantLabel } = splitVariantLabel(variant.name);
                return (
                  <button
                    key={variant.id}
                    type="button"
                    className={`joker-category-chip${index === selectedIndex ? " is-active" : ""}`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    {variantLabel ?? variant.name}
                  </button>
                );
              })}
            </div>
            <p className="joker-product-card__price">{formatPrice(selectedVariant.price)}</p>
          </>
        ) : null}

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

        <label className="joker-form-field">
          <span>Direccion del pedido (si es delivery)</span>
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Ej: Av. 18 de Julio 1234"
            autoFocus={!hasVariants}
          />
        </label>

        <p className="joker-modal-card__hint">Detalle del pedido (ej: Sin lechuga, con doble queso).</p>

        <textarea
          className="joker-detail-input"
          rows={4}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder="Escribi aca el detalle..."
        />

        <div className="joker-modal-card__actions">
          <button type="button" className="joker-button joker-button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="joker-button joker-button--primary" onClick={handleConfirm}>
            {isEditing ? "Guardar cambios" : "Agregar al pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
