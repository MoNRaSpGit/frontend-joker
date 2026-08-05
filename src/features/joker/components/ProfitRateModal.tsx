import { useState } from "react";

type ProfitRateModalProps = {
  currentPercent: number;
  onClose: () => void;
  onSave: (percent: number) => void;
};

export function ProfitRateModal({ currentPercent, onClose, onSave }: ProfitRateModalProps) {
  const [value, setValue] = useState(String(currentPercent));
  const [error, setError] = useState("");

  function handleSave() {
    const parsed = Number(value.trim().replace(",", "."));
    if (!value.trim() || Number.isNaN(parsed) || parsed < 0) {
      setError("Ingresa un porcentaje valido.");
      return;
    }

    onSave(parsed);
    onClose();
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Porcentaje de ganancia">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Porcentaje de ganancia</h2>
          <button type="button" className="joker-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <label className="joker-form-field">
          <span>Porcentaje (%)</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
            autoFocus
          />
        </label>

        {error ? <p className="joker-order-item__excluded">{error}</p> : null}

        <div className="joker-modal-card__actions joker-modal-card__actions--top-gap">
          <button type="button" className="joker-button joker-button--primary" onClick={handleSave}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
