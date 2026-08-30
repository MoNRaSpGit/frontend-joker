import { useState } from "react";
import type { JokerClient } from "../joker.types";

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

type AccountPaymentModalProps = {
  client: JokerClient;
  balance: number;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (amount: number, shouldPrint: boolean) => Promise<void>;
};

// Pide el monto a pagar. Arranca vacio a proposito (antes venia precargado
// con el saldo completo): con el campo ya lleno, un Enter apurado podia
// registrar un pago total sin querer cuando en realidad era parcial.
export function AccountPaymentModal({ client, balance, isSubmitting, onClose, onConfirm }: AccountPaymentModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<"save" | "print" | null>(null);

  const parsedAmount = Number(amountInput.replace(",", "."));
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= balance;
  const isFullPayment = isValidAmount && Math.abs(parsedAmount - balance) < 0.01;

  // "Guardar" registra el pago (con sus calculos de saldo/ciclo) sin sacar
  // el comprobante -- para cuando el cliente no lo necesita o se va a
  // imprimir despues. "Imprimir" hace lo mismo y ademas saca el ticket,
  // como era el unico comportamiento antes.
  async function submitPayment(shouldPrint: boolean) {
    if (!isValidAmount) {
      setError(parsedAmount > balance ? "No podes pagar mas de lo que debe." : "Ingresa un monto valido.");
      return;
    }

    setError("");
    setPendingAction(shouldPrint ? "print" : "save");
    try {
      await onConfirm(Math.round(parsedAmount * 100) / 100, shouldPrint);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "No se pudo registrar el pago.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await submitPayment(true);
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label="Registrar pago">
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>Pago de {client.name}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSubmitting}>
            Cerrar
          </button>
        </div>

        <p className="joker-login-card__hint">Debe {formatPrice(balance)}</p>

        <form onSubmit={(event) => void handleSubmit(event)}>
          <label className="joker-form-field">
            <span>Monto a pagar</span>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={`Ej: ${balance}`}
              disabled={isSubmitting}
            />
          </label>

          {isValidAmount && !isFullPayment ? (
            <p className="joker-order-item__excluded">Pago parcial: queda debiendo {formatPrice(balance - parsedAmount)}.</p>
          ) : null}

          {error ? <p className="joker-order-item__excluded">{error}</p> : null}

          <div className="joker-modal-card__actions">
            <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button
              type="button"
              className="joker-button joker-button--ghost"
              onClick={() => void submitPayment(false)}
              disabled={isSubmitting || !isValidAmount}
            >
              {pendingAction === "save" ? "Guardando..." : "Guardar"}
            </button>
            <button type="submit" className="joker-button joker-button--primary" disabled={isSubmitting || !isValidAmount}>
              {pendingAction === "print" ? "Imprimiendo..." : isFullPayment ? "Pagar todo e imprimir" : "Pagar e imprimir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
