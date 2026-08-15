import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AddClientModal } from "../components/AddClientModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { getAccountSettlements } from "../joker.api";
import { printAccountStatementTicket } from "../services/joker.print";
import type { JokerAccountEntry, JokerAccountSettlement, JokerClient } from "../joker.types";

type CuentaCorrienteScreenProps = {
  clients: JokerClient[];
  isLoadingClients: boolean;
  clientsLoadError: string | null;
  onReloadClients: () => void;
  accountEntries: JokerAccountEntry[];
  onAddClient: (name: string, phone?: string, address?: string) => Promise<void>;
  onDeleteClient: (clientId: number) => Promise<void>;
  onSettleAccount: (clientId: number) => Promise<void>;
};

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

// Si el pedido que genero este movimiento tiene una fecha editada a mano
// (orderDate), esa es la que se muestra; la hora siempre sale de created_at.
function formatDateTime(isoDate: string, orderDate?: string | null) {
  const date = new Date(isoDate);
  const dateSource = orderDate ? new Date(`${orderDate}T00:00:00`) : date;
  const dateLabel = dateSource.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

function formatEntryItems(entry: JokerAccountEntry) {
  return entry.items.map((item) => `${item.quantity}x ${item.productName}`);
}

export function CuentaCorrienteScreen({
  clients,
  isLoadingClients,
  clientsLoadError,
  onReloadClients,
  accountEntries,
  onAddClient,
  onDeleteClient,
  onSettleAccount
}: CuentaCorrienteScreenProps) {
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [pendingDeleteClient, setPendingDeleteClient] = useState<JokerClient | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [isConfirmingPago, setIsConfirmingPago] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSettlements, setShowSettlements] = useState(false);
  const [settlements, setSettlements] = useState<JokerAccountSettlement[]>([]);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
  const [settlementsError, setSettlementsError] = useState<string | null>(null);

  // Al cambiar de cliente se cierra/limpia el historial de pagos anteriores
  // (es bajo demanda, no se precarga para cada cliente de la lista).
  useEffect(() => {
    setShowSettlements(false);
    setSettlements([]);
    setSettlementsError(null);
  }, [selectedClientId]);

  async function handleToggleSettlements() {
    if (!selectedClient) return;

    if (showSettlements) {
      setShowSettlements(false);
      return;
    }

    setShowSettlements(true);
    setIsLoadingSettlements(true);
    setSettlementsError(null);
    try {
      const result = await getAccountSettlements(selectedClient.id);
      setSettlements(result.items);
    } catch (loadError) {
      setSettlementsError(loadError instanceof Error ? loadError.message : "No se pudo cargar el historial de pagos.");
    } finally {
      setIsLoadingSettlements(false);
    }
  }

  function debtFor(clientId: number) {
    return accountEntries.filter((entry) => entry.clientId === clientId).reduce((sum, entry) => sum + entry.total, 0);
  }

  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedClientEntries = selectedClient
    ? accountEntries.filter((entry) => entry.clientId === selectedClient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const selectedClientDebt = selectedClient ? debtFor(selectedClient.id) : 0;

  async function handleAddClient(name: string, phone?: string, address?: string) {
    await onAddClient(name, phone, address);
    toast.success("Cliente agregado.");
  }

  async function handleConfirmDeleteClient() {
    if (!pendingDeleteClient) return;

    setIsDeletingClient(true);
    try {
      await onDeleteClient(pendingDeleteClient.id);
      if (selectedClientId === pendingDeleteClient.id) {
        setSelectedClientId(null);
      }
      toast.success("Cliente eliminado.");
      setPendingDeleteClient(null);
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el cliente.");
    } finally {
      setIsDeletingClient(false);
    }
  }

  // Solo imprime, no toca el historial del cliente.
  async function handlePrintOnly() {
    if (!selectedClient) return;

    setIsPrinting(true);
    try {
      await printAccountStatementTicket(selectedClient, selectedClientEntries);
      toast.success("Comprobante impreso.");
    } catch (printError) {
      toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el comprobante.");
    } finally {
      setIsPrinting(false);
    }
  }

  // "Pago": imprime el comprobante y, si sale bien, salda la cuenta
  // (se borra el historial de consumos que ya se cobro).
  async function handleConfirmPago() {
    if (!selectedClient) return;

    setIsPrinting(true);
    try {
      await printAccountStatementTicket(selectedClient, selectedClientEntries);
      await onSettleAccount(selectedClient.id);
      toast.success("Pago confirmado.");
      setIsConfirmingPago(false);
    } catch (printError) {
      toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el comprobante.");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div className="joker-cc-layout">
      <section className="joker-panel joker-cc-card">
        <div className="joker-panel__heading joker-panel__heading--row">
          <div>
            <p className="joker-eyebrow">Listado</p>
            <h2>Clientes</h2>
          </div>
          <span className="joker-cc-badge">{clients.length}</span>
        </div>

        <button
          type="button"
          className="joker-button joker-button--primary joker-button--auto"
          onClick={() => setIsAddClientModalOpen(true)}
        >
          + Agregar cliente
        </button>

        <input
          type="search"
          className="joker-search-input"
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        {isLoadingClients ? (
          <p className="joker-empty-state top-gap">Cargando clientes...</p>
        ) : clientsLoadError ? (
          <div className="top-gap">
            <p className="joker-order-item__excluded">No se pudieron cargar los clientes: {clientsLoadError}</p>
            <button type="button" className="joker-button joker-button--ghost" onClick={onReloadClients}>
              Reintentar
            </button>
          </div>
        ) : filteredClients.length ? (
          <ul className="joker-cc-list top-gap">
            {filteredClients.map((client) => (
              <li key={client.id} className="joker-cc-list-row">
                <button
                  type="button"
                  className={`joker-cc-list-item${selectedClientId === client.id ? " is-active" : ""}`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <span className="joker-cc-list-item__name">{client.name}</span>
                  <span className="joker-cc-list-item__meta">
                    {client.phone ? `${client.phone} · ` : ""}Debe {formatPrice(debtFor(client.id))}
                  </span>
                </button>
                <button
                  type="button"
                  className="joker-cc-list-item__delete"
                  onClick={() => setPendingDeleteClient(client)}
                  aria-label={`Eliminar ${client.name}`}
                  title="Eliminar cliente"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state top-gap">No hay clientes que coincidan.</p>
        )}
      </section>

      <section className="joker-panel joker-cc-card">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Detalle</p>
          <h2>{selectedClient ? selectedClient.name : "Estado del cliente"}</h2>
        </div>

        {selectedClient ? (
          <>
            <div className="joker-cc-detail-actions">
              <button
                type="button"
                className="joker-button joker-button--ghost"
                onClick={handlePrintOnly}
                disabled={isPrinting}
              >
                Imprimir
              </button>
              <button
                type="button"
                className="joker-button joker-button--primary"
                onClick={() => setIsConfirmingPago(true)}
                disabled={isPrinting || selectedClientEntries.length === 0}
              >
                Pago
              </button>
            </div>

            <div className="joker-cc-hero top-gap">
              <div>
                <span className="joker-cc-hero__label">Saldo actual</span>
                <strong className="joker-cc-hero__name">{selectedClient.name}</strong>
                {selectedClient.phone ? <span className="joker-cc-hero__phone">{selectedClient.phone}</span> : null}
                {selectedClient.address ? <span className="joker-cc-hero__phone">{selectedClient.address}</span> : null}
              </div>
              <strong className="joker-cc-hero__debt">{formatPrice(selectedClientDebt)}</strong>
            </div>

            <div className="joker-panel__heading top-gap">
              <p className="joker-eyebrow">Historial</p>
            </div>

            {selectedClientEntries.length ? (
              <ul className="joker-cc-history">
                {selectedClientEntries.map((entry) => (
                  <li key={entry.id} className="joker-cc-history-row">
                    <div className="joker-cc-history-row__head">
                      <strong className="joker-amount-plus">+{formatPrice(entry.total)}</strong>
                      <span className="joker-order-item__excluded">{formatDateTime(entry.createdAt, entry.orderDate)}</span>
                    </div>
                    <ul className="joker-cc-history-row__items">
                      {formatEntryItems(entry).map((line, index) => (
                        <li key={index}>{line}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="joker-empty-state">Este cliente todavia no tiene consumos en cuenta.</p>
            )}

            <div className="joker-panel__heading joker-panel__heading--row top-gap">
              <p className="joker-eyebrow">Respaldo</p>
              <button type="button" className="joker-mini-button" onClick={handleToggleSettlements}>
                {showSettlements ? "Ocultar pagos anteriores" : "Ver pagos anteriores"}
              </button>
            </div>

            {showSettlements ? (
              isLoadingSettlements ? (
                <p className="joker-empty-state">Cargando historial...</p>
              ) : settlementsError ? (
                <p className="joker-order-item__excluded">{settlementsError}</p>
              ) : settlements.length ? (
                <ul className="joker-cc-history">
                  {settlements.map((settlement) => (
                    <li key={settlement.id} className="joker-cc-history-row">
                      <div className="joker-cc-history-row__head">
                        <strong>{formatPrice(settlement.total)}</strong>
                        <span className="joker-order-item__excluded">
                          {settlement.reason === "pago"
                            ? "Pagado"
                            : settlement.reason === "correccion_manual"
                              ? "Corregido"
                              : "Cliente eliminado"}{" "}
                          · {formatDateTime(settlement.settledAt)}
                        </span>
                      </div>
                      <ul className="joker-cc-history-row__items">
                        {settlement.items.map((item, index) => (
                          <li key={index}>{`${item.quantity}x ${item.productName}`}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="joker-empty-state">Este cliente todavia no tiene pagos anteriores.</p>
              )
            ) : null}
          </>
        ) : (
          <p className="joker-empty-state">Selecciona un cliente para ver su saldo.</p>
        )}
      </section>

      {isAddClientModalOpen ? (
        <AddClientModal onClose={() => setIsAddClientModalOpen(false)} onSave={handleAddClient} />
      ) : null}

      {pendingDeleteClient ? (
        <ConfirmDeleteModal
          title="Eliminar cliente"
          message={`Queres eliminar a "${pendingDeleteClient.name}"? Se borra tambien su historial de cuenta corriente.`}
          isDeleting={isDeletingClient}
          onCancel={() => setPendingDeleteClient(null)}
          onConfirm={handleConfirmDeleteClient}
        />
      ) : null}

      {isConfirmingPago && selectedClient ? (
        <ConfirmDeleteModal
          title="Confirmar pago"
          message={`Confirmar el pago de "${selectedClient.name}" por ${formatPrice(selectedClientDebt)}? Se imprime el comprobante y se borra su historial de cuenta corriente.`}
          confirmLabel="Confirmar pago"
          confirmLabelBusy="Imprimiendo..."
          variant="primary"
          isDeleting={isPrinting}
          onCancel={() => setIsConfirmingPago(false)}
          onConfirm={handleConfirmPago}
        />
      ) : null}
    </div>
  );
}
