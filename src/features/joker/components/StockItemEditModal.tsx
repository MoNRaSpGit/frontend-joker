import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getStockItemConsumption } from "../joker.api";
import type { JokerStockItem } from "../joker.types";

type StockItemEditModalProps = {
  item: JokerStockItem;
  isSaving: boolean;
  onClose: () => void;
  onSave: (quantity: number) => Promise<void>;
};

export function StockItemEditModal({ item, isSaving, onClose, onSave }: StockItemEditModalProps) {
  const [quantityInput, setQuantityInput] = useState(String(item.quantity));
  const [consumption, setConsumption] = useState<Array<{ productName: string; quantity: number }> | null>(null);
  const [isLoadingConsumption, setIsLoadingConsumption] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingConsumption(true);
    getStockItemConsumption(item.id)
      .then((result) => {
        if (!cancelled) setConsumption(result.items);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "No se pudo cargar el consumo.");
      })
      .finally(() => {
        if (!cancelled) setIsLoadingConsumption(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.id]);

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

        <p className="joker-modal-card__hint">Consumido desde el ultimo cierre de caja</p>

        {isLoadingConsumption ? (
          <p className="joker-empty-state">Cargando...</p>
        ) : consumption && consumption.length ? (
          <ul className="joker-order-list">
            {consumption.map((line) => (
              <li key={line.productName} className="joker-order-item joker-order-item--flat">
                <span>{line.productName}</span>
                <span className="joker-qty-badge">x{line.quantity}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state">Todavia no se vendio nada que use este insumo en este periodo.</p>
        )}

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
