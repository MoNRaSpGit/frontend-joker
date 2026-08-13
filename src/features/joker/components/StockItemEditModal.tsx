import { useState } from "react";
import { toast } from "react-toastify";
import type { JokerStockItem } from "../joker.types";

type StockItemEditModalProps = {
  item: JokerStockItem;
  isSaving: boolean;
  onClose: () => void;
  onSave: (quantity: number) => Promise<void>;
};

export function StockItemEditModal({ item, isSaving, onClose, onSave }: StockItemEditModalProps) {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));

  function handleSaveClick() {
    const parsed = Number(quantityInput);
    if (!quantityInput.trim() || Number.isNaN(parsed)) {
      toast.error("Ingresa una cantidad valida.");
      return;
    }
    void onSave(parsed);
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={`Editar ${item.name}`}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{item.name}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <label className="joker-form-field">
          <span>Stock actual</span>
          <input
            type="number"
            value={quantityInput}
            onChange={(event) => setQuantityInput(event.target.value)}
            placeholder={`Ej: 20 ${item.unit}`}
          />
        </label>

        <div className="joker-modal-card__actions">
          <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="button" className="joker-button joker-button--primary" onClick={handleSaveClick} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
