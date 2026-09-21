import { useState } from "react";
import type { JokerPaymentAccount } from "../joker.types";

type PaymentAccountModalProps = {
  // Si viene un metodo existente, el modal edita ese registro; si no, crea
  // uno nuevo. Mismo componente para las dos acciones (pedido explicito:
  // "poder editar o eliminar metodos existentes").
  paymentAccount?: JokerPaymentAccount | null;
  onClose: () => void;
  onSave: (label: string, ownerName: string, accountInfo: string) => Promise<void>;
};

export function PaymentAccountModal({ paymentAccount, onClose, onSave }: PaymentAccountModalProps) {
  const isEditing = Boolean(paymentAccount);
  const [label, setLabel] = useState(paymentAccount?.label ?? "");
  const [ownerName, setOwnerName] = useState(paymentAccount?.ownerName ?? "");
  const [accountInfo, setAccountInfo] = useState(paymentAccount?.accountInfo ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedLabel = label.trim();
    const trimmedOwnerName = ownerName.trim();
    const trimmedAccountInfo = accountInfo.trim();
    if (!trimmedLabel || !trimmedOwnerName || !trimmedAccountInfo) {
      setError("Completa el banco, el propietario y el numero de cuenta.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmedLabel, trimmedOwnerName, trimmedAccountInfo);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el metodo de pago.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? "Editar metodo de pago" : "Agregar metodo de pago"}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{isEditing ? "Editar metodo de pago" : "Agregar metodo de pago"}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="joker-form-field">
            <span>Banco / billetera</span>
            <input
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Ej: Itau, Prex..."
              disabled={isSaving}
              autoFocus
            />
          </label>
          <label className="joker-form-field">
            <span>Propietario</span>
            <input
              type="text"
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
              placeholder="Ej: Juan Perez"
              disabled={isSaving}
            />
          </label>
          <label className="joker-form-field">
            <span>Numero de cuenta</span>
            <input
              type="text"
              value={accountInfo}
              onChange={(event) => setAccountInfo(event.target.value)}
              placeholder="Ej: 123456789"
              disabled={isSaving}
            />
          </label>

          {error ? <p className="joker-order-item__excluded">{error}</p> : null}

          <div className="joker-modal-card__actions">
            <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="joker-button joker-button--primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : isEditing ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
