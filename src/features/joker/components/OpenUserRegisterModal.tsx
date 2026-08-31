import { useState } from "react";

type OpenUserRegisterModalProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (initialCash: number) => Promise<void>;
};

// Pide el monto con el que arranca la caja del Usuario (efectivo real en
// el cajon). Arranca vacio a proposito, mismo criterio que el resto de los
// montos iniciales de la app -- no precargar nada para no confirmar sin
// mirar.
export function OpenUserRegisterModal({ isSubmitting, onClose, onConfirm }: OpenUserRegisterModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");

  const parsedAmount = Number(amountInput.replace(",", "."));
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount >= 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidAmount) {
      setError("Ingresa un monto valido.");
      return;
    }

    setError("");
    try {
      await onConfirm(Math.round(parsedAmount * 100) / 100);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "No se pudo abrir la caja.");
    }
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Abrir caja">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Abrir caja</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="joker-login-card__hint">Con cuanto efectivo arranca el cajon.</p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className="joker-form-field">
            <span>Monto inicial</span>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="Ej: 2000"
              disabled={isSubmitting}
            />
          </label>

          {error ? <p className="joker-order-item__excluded">{error}</p> : null}

          <div className="joker-modal-card__actions">
            <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="joker-button joker-button--primary" disabled={isSubmitting || !isValidAmount}>
              {isSubmitting ? "Abriendo..." : "Abrir caja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
