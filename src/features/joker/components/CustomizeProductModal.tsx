import { useState } from "react";
import type { JokerProduct } from "../joker.types";

type CustomizeProductModalProps = {
  product: JokerProduct;
  onClose: () => void;
  onConfirm: (excludedIngredients: string[]) => void;
};

export function CustomizeProductModal({ product, onClose, onConfirm }: CustomizeProductModalProps) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  function toggleIngredient(ingredient: string) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(ingredient)) {
        next.delete(ingredient);
      } else {
        next.add(ingredient);
      }
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(excluded));
    onClose();
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

        <p className="joker-modal-card__hint">Arranca con todo. Destilda lo que el cliente no quiere.</p>

        <ul className="joker-ingredient-list">
          {product.ingredients.map((ingredient, index) => {
            const inputId = `ingredient-${product.id}-${index}`;
            const isExcluded = excluded.has(ingredient);

            return (
              <li key={`${ingredient}-${index}`} className={isExcluded ? "is-excluded" : ""}>
                <label htmlFor={inputId}>
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={!isExcluded}
                    onChange={() => toggleIngredient(ingredient)}
                  />
                  <span>{ingredient}</span>
                </label>
              </li>
            );
          })}
        </ul>

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
