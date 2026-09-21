import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { PaymentAccountModal } from "../components/PaymentAccountModal";
import { createPaymentAccount, deletePaymentAccount, listPaymentAccounts, updatePaymentAccount } from "../joker.api";
import type { JokerPaymentAccount } from "../joker.types";

// Metodos de pago (20/09/2026, pedido explicito): pantalla chica para
// responder rapido por WhatsApp "a que cuenta te hago la transferencia".
// Lista corta editable, con un boton "Copiar" al lado de cada metodo (para
// mandar solo ese, cuando el cliente ya sabe cual quiere usar) y otro
// "Mostrar todo" para cuando prefiere pasarle el listado completo.
function buildEntryText(item: JokerPaymentAccount): string {
  return `🏦 *${item.label}*\n👤 Cuenta: ${item.ownerName}\n🔢 Numero: ${item.accountInfo}`;
}

// Pedido explicito (20/09/2026): frase corta con simbolo de tarjeta en vez
// del saludo largo, y al final la misma despedida que ya usan los tickets
// (ver FOOTER_MESSAGE en joker.ticketFormat.ts).
const HEADING = "💳 Metodos de pago";
const FAREWELL = "Muito obrigado!!";

function buildSingleClipboardText(item: JokerPaymentAccount): string {
  return `${HEADING}\n\n${buildEntryText(item)}\n\n${FAREWELL}`;
}

function buildAllClipboardText(items: JokerPaymentAccount[]): string {
  return `${HEADING}\n\n${items.map(buildEntryText).join("\n\n")}\n\n${FAREWELL}`;
}

export function PaymentMethodsScreen() {
  const [items, setItems] = useState<JokerPaymentAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JokerPaymentAccount | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JokerPaymentAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadPaymentAccounts() {
    setIsLoading(true);
    setLoadError(null);
    return listPaymentAccounts()
      .then((result) => setItems(result.items))
      .catch((error) => {
        const message = error instanceof Error ? error.message : "No se pudieron cargar los metodos de pago.";
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    void loadPaymentAccounts();
  }, []);

  async function handleSave(label: string, ownerName: string, accountInfo: string) {
    if (editingItem) {
      const result = await updatePaymentAccount(editingItem.id, { label, ownerName, accountInfo });
      setItems((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
      toast.success("Metodo de pago actualizado.");
    } else {
      const result = await createPaymentAccount({ label, ownerName, accountInfo });
      setItems((current) => [...current, result.item]);
      toast.success("Metodo de pago agregado.");
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deletePaymentAccount(pendingDelete.id);
      setItems((current) => current.filter((item) => item.id !== pendingDelete.id));
      toast.success("Metodo de pago eliminado.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function copyToClipboard(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch {
      toast.error("No se pudo copiar. Copialo manualmente.");
    }
  }

  function handleCopyOne(item: JokerPaymentAccount) {
    void copyToClipboard(buildSingleClipboardText(item), `${item.label} copiado`);
  }

  function handleCopyAll() {
    if (!items.length) {
      toast.error("Todavia no hay metodos de pago cargados.");
      return;
    }
    void copyToClipboard(buildAllClipboardText(items), "Metodos de pago copiados");
  }

  return (
    <section className="joker-panel joker-pm-card">
      <div className="joker-panel__heading joker-panel__heading--row">
        <div>
          <p className="joker-eyebrow">WhatsApp</p>
          <h2>Metodos de pago</h2>
        </div>
        <span className="joker-cc-badge">{items.length}</span>
      </div>

      <button type="button" className="joker-button joker-button--primary joker-button--auto joker-pm-copy-btn" onClick={handleCopyAll}>
        📋 Mostrar todo
      </button>

      <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
        + Agregar metodo de pago
      </button>

      {isLoading ? (
        <p className="joker-empty-state top-gap">Cargando metodos de pago...</p>
      ) : loadError ? (
        <div className="top-gap">
          <p className="joker-order-item__excluded">No se pudieron cargar: {loadError}</p>
          <button type="button" className="joker-button joker-button--ghost" onClick={loadPaymentAccounts}>
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="joker-empty-state top-gap">Todavia no hay metodos de pago cargados.</p>
      ) : (
        <ul className="joker-pm-list top-gap">
          {items.map((item) => (
            <li key={item.id} className="joker-pm-row">
              <span className="joker-pm-row__info">
                <strong>{item.label}</strong>
                <span className="joker-pm-row__account">{item.ownerName} · {item.accountInfo}</span>
              </span>
              <span className="joker-pm-row__actions">
                <button type="button" className="joker-button joker-button--ghost joker-button--small joker-button--auto" onClick={() => handleCopyOne(item)}>
                  Copiar
                </button>
                <button
                  type="button"
                  className="joker-pm-row__edit"
                  aria-label={`Editar ${item.label}`}
                  onClick={() => {
                    setEditingItem(item);
                    setIsModalOpen(true);
                  }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="joker-cc-list-item__delete"
                  aria-label={`Eliminar ${item.label}`}
                  onClick={() => setPendingDelete(item)}
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {isModalOpen ? (
        <PaymentAccountModal
          paymentAccount={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDeleteModal
          title="Eliminar metodo de pago"
          message={`Se va a eliminar "${pendingDelete.label}". Seguro?`}
          isDeleting={isDeleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      ) : null}
    </section>
  );
}
