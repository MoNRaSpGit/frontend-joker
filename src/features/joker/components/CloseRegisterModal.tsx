import { useState } from "react";

type CloseRegisterModalProps = {
  message: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (shouldPrint: boolean) => Promise<void>;
};

// Mismo patron que AccountPaymentModal (Cancelar / Guardar / Guardar e
// imprimir): antes cerrar caja imprimia el resumen siempre, sin poder
// evitarlo -- ahora "Cerrar caja" cierra sin sacar el ticket, y "Cerrar e
// imprimir" hace lo de siempre. pendingAction distingue cual de los dos
// botones esta en curso para mostrar el label correcto mientras carga.
export function CloseRegisterModal({ message, isSubmitting, onCancel, onConfirm }: CloseRegisterModalProps) {
  const [pendingAction, setPendingAction] = useState<"close" | "print" | null>(null);

  async function handleClick(shouldPrint: boolean) {
    setPendingAction(shouldPrint ? "print" : "close");
    try {
      await onConfirm(shouldPrint);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Cerrar caja">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Cerrar caja</h2>
          <button type="button" className="joker-modal-close" onClick={onCancel} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="joker-modal-card__hint">{message}</p>

        <div className="joker-modal-card__actions">
          <button type="button" className="joker-button joker-button--ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="joker-button joker-button--ghost"
            onClick={() => void handleClick(false)}
            disabled={isSubmitting}
          >
            {pendingAction === "close" ? "Cerrando..." : "Cerrar caja"}
          </button>
          <button
            type="button"
            className="joker-button joker-button--primary"
            onClick={() => void handleClick(true)}
            disabled={isSubmitting}
          >
            {pendingAction === "print" ? "Cerrando..." : "Cerrar e imprimir"}
          </button>
        </div>
      </div>
    </div>
  );
}
