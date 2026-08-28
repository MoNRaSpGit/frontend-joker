import { useState } from "react";
import type { JokerClient } from "../joker.types";

type SelectClientModalProps = {
  title: string;
  hint?: string;
  clients: JokerClient[];
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (clientId: number) => void;
};

// Modal chico y generico para elegir un cliente y confirmar -- usado para
// operaciones delicadas (ej: pasar un pedido a cuenta corriente desde el
// Panel) donde no queremos que el cambio se dispare con un solo click sin
// elegir a quien corresponde.
export function SelectClientModal({ title, hint, clients, isSubmitting, onClose, onConfirm }: SelectClientModalProps) {
  const [clientId, setClientId] = useState("");

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{title}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        {hint ? <p className="joker-modal-card__hint">{hint}</p> : null}

        <label className="joker-form-field joker-modal-card__actions--top-gap">
          <span>Cliente</span>
          <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Elegir cliente...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>

        <div className="joker-modal-card__actions joker-modal-card__actions--top-gap">
          <button
            type="button"
            className="joker-button joker-button--primary"
            onClick={() => onConfirm(Number(clientId))}
            disabled={isSubmitting || clientId === ""}
          >
            {isSubmitting ? "Guardando..." : "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}
