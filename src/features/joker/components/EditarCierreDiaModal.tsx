import { useState } from "react";

type EditarCierreDiaModalProps = {
  fecha: string;
  totalActual: number;
  onCancelar: () => void;
  onGuardar: (total: number) => Promise<void>;
};

export function EditarCierreDiaModal({ fecha, totalActual, onCancelar, onGuardar }: EditarCierreDiaModalProps) {
  const [total, setTotal] = useState(String(totalActual));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = Number(total);
    if (Number.isNaN(parsed) || parsed < 0) {
      setError("Ingresa un valor valido.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onGuardar(parsed);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar.");
      setIsSaving(false);
    }
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Corregir cierre">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Corregir cierre</h2>
          <button type="button" className="joker-modal-close" onClick={onCancelar} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">{fecha.split("-").reverse().join("/")}</p>

        <form onSubmit={handleSubmit}>
          <label className="joker-form-field">
            <span>Total del dia</span>
            <input
              type="number"
              min="0"
              step="1"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </label>

          {error ? <p className="joker-order-item__excluded">{error}</p> : null}

          <div className="joker-modal-card__actions">
            <button type="button" className="joker-button joker-button--ghost" onClick={onCancelar} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="joker-button joker-button--primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
