import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AccountPaymentModal } from "../components/AccountPaymentModal";
import { AddClientModal } from "../components/AddClientModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { getAccountPayments, getAccountSettlements } from "../joker.api";
import { getStoreDateLabel } from "../joker.storeDate";
import { printAccountPaymentTicket, printAccountStatementTicket } from "../services/joker.print";
import type { JokerAccountEntry, JokerAccountPayment, JokerAccountSettlement, JokerClient } from "../joker.types";

type CuentaCorrienteScreenProps = {
  clients: JokerClient[];
  isLoadingClients: boolean;
  clientsLoadError: string | null;
  onReloadClients: () => void;
  accountEntries: JokerAccountEntry[];
  accountPayments: JokerAccountPayment[];
  onAddClient: (name: string, phone?: string, address?: string) => Promise<void>;
  onDeleteClient: (clientId: number) => Promise<void>;
  onCreateAccountPayment: (clientId: number, amount: number) => Promise<JokerAccountPayment>;
};

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

// Si el pedido que genero este movimiento tiene una fecha editada a mano
// (orderDate), esa es la que se muestra. Si no, se usa el dia comercial
// (arranca a las 5am) de cuando se creo, no el dia de calendario crudo --
// ver joker.storeDate.ts. La hora siempre sale de created_at tal cual.
function formatDateTime(isoDate: string, orderDate?: string | null) {
  const date = new Date(isoDate);
  const dateLabelSource = orderDate ?? getStoreDateLabel(isoDate);
  const dateLabel = new Date(`${dateLabelSource}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

// unitPrice puede faltar en consumos viejos, guardados antes de que el
// ticket empezara a mostrar precio por producto: en esos casos se omite el
// precio en vez de mostrar $0 (los consumos nuevos si lo traen).
function formatEntryItems(entry: JokerAccountEntry) {
  return entry.items.map((item) =>
    item.unitPrice != null
      ? `${item.quantity}x ${item.productName} — ${formatPrice(item.unitPrice * item.quantity)}`
      : `${item.quantity}x ${item.productName}`
  );
}

export function CuentaCorrienteScreen({
  clients,
  isLoadingClients,
  clientsLoadError,
  onReloadClients,
  accountEntries,
  accountPayments,
  onAddClient,
  onDeleteClient,
  onCreateAccountPayment
}: CuentaCorrienteScreenProps) {
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [pendingDeleteClient, setPendingDeleteClient] = useState<JokerClient | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [isPayingAccount, setIsPayingAccount] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSettlements, setShowSettlements] = useState(false);
  const [settlements, setSettlements] = useState<JokerAccountSettlement[]>([]);
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
  const [settlementsError, setSettlementsError] = useState<string | null>(null);
  const [payments, setPayments] = useState<JokerAccountPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Al cambiar de cliente se cierra/limpia el historial de pagos anteriores
  // (es bajo demanda, no se precarga para cada cliente de la lista), y se
  // recarga el historial de pagos de cuenta corriente (ese si siempre
  // visible, no bajo demanda: es la parte "prolijita" que pidio el cliente).
  useEffect(() => {
    setShowSettlements(false);
    setSettlements([]);
    setSettlementsError(null);
    setPayments([]);

    if (selectedClientId === null) return;

    let cancelled = false;
    setIsLoadingPayments(true);
    getAccountPayments(selectedClientId)
      .then((result) => {
        if (!cancelled) setPayments(result.items);
      })
      .catch(() => {
        // Silencioso: se reintenta solo la proxima vez que se seleccione
        // el cliente.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPayments(false);
      });

    return () => {
      cancelled = true;
    };
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

  // El saldo nunca se guarda como un numero suelto: siempre es la suma de
  // boletas abiertas menos la suma de pagos abiertos de ese cliente. Asi
  // nunca puede desincronizarse -- si sumas a mano lo que se ve en
  // pantalla, siempre da lo mismo que calcula esto.
  function debtFor(clientId: number) {
    const totalEntries = accountEntries.filter((entry) => entry.clientId === clientId).reduce((sum, entry) => sum + entry.total, 0);
    const totalPaid = accountPayments.filter((payment) => payment.clientId === clientId).reduce((sum, payment) => sum + payment.amount, 0);
    return Math.max(Math.round((totalEntries - totalPaid) * 100) / 100, 0);
  }

  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  // Mas vieja primero, igual orden que el comprobante impreso (ver
  // buildAccountCycleMovements) -- asi se pueden comparar pantalla y
  // ticket de un vistazo. Usa la fecha atrasada (orderDate) cuando existe,
  // no createdAt (cuando se cargo), mismo criterio que ya se aplico ahi.
  const selectedClientEntries = selectedClient
    ? accountEntries
        .filter((entry) => entry.clientId === selectedClient.id)
        .sort((a, b) =>
          (a.orderDate ?? getStoreDateLabel(a.createdAt)).localeCompare(b.orderDate ?? getStoreDateLabel(b.createdAt))
        )
    : [];
  const selectedClientDebt = selectedClient ? debtFor(selectedClient.id) : 0;
  // Pagos abiertos del cliente seleccionado (ciclo actual) -- para armar
  // el historial de compras+pagos de los comprobantes. payments ya trae
  // TODOS los pagos del cliente (abiertos y cerrados), aca se filtran los
  // abiertos.
  const selectedClientOpenPayments = payments.filter((payment) => payment.settledAt === null);

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

  // Solo imprime, no toca el historial del cliente. Muestra el historial
  // completo del ciclo actual (compras + pagos) y el saldo real de hoy --
  // no la suma bruta de boletas sin restar lo ya pagado.
  async function handlePrintOnly() {
    if (!selectedClient) return;

    setIsPrinting(true);
    try {
      await printAccountStatementTicket(selectedClient, selectedClientEntries, selectedClientOpenPayments);
      toast.success("Comprobante impreso.");
    } catch (printError) {
      toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el comprobante.");
    } finally {
      setIsPrinting(false);
    }
  }

  // Pago (parcial o total, segun el monto que se ingrese en el modal): se
  // registra primero, y el comprobante muestra el mismo historial de
  // compras+pagos del ciclo, hasta este pago inclusive -- si el monto
  // cubrio todo, el backend ya archivo las boletas solo (no hace falta un
  // flujo aparte para "pago total", es el mismo con el monto igual al
  // saldo completo).
  async function handleConfirmPayment(amount: number, shouldPrint: boolean) {
    if (!selectedClient) return;

    setIsSubmittingPayment(true);
    try {
      const entriesBeforePayment = selectedClientEntries;
      const openPaymentsBeforePayment = selectedClientOpenPayments;
      const payment = await onCreateAccountPayment(selectedClient.id, amount);
      const balanceRemaining = Math.max(Math.round((selectedClientDebt - amount) * 100) / 100, 0);
      setIsPayingAccount(false);
      toast.success(balanceRemaining > 0 ? "Pago parcial registrado." : "Pago total registrado.");

      if (shouldPrint) {
        try {
          await printAccountPaymentTicket(selectedClient, entriesBeforePayment, [...openPaymentsBeforePayment, payment]);
        } catch (printError) {
          toast.error(
            printError instanceof Error ? `El pago se guardo pero no se pudo imprimir: ${printError.message}` : "El pago se guardo pero no se pudo imprimir."
          );
        }
      }

      // Refresca el historial de pagos de este cliente (el nuevo pago que
      // se acaba de hacer, y si cerro el ciclo, que las boletas de la
      // izquierda tambien se hayan actualizado ya llega solo por props).
      const refreshed = await getAccountPayments(selectedClient.id);
      setPayments(refreshed.items);
    } finally {
      setIsSubmittingPayment(false);
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
                onClick={() => setIsPayingAccount(true)}
                disabled={isPrinting || selectedClientDebt <= 0}
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

            <div className="joker-panel__heading top-gap">
              <p className="joker-eyebrow">Pagos</p>
            </div>

            {isLoadingPayments ? (
              <p className="joker-empty-state">Cargando pagos...</p>
            ) : payments.length ? (
              <ul className="joker-cc-history">
                {payments.map((payment) => (
                  <li key={payment.id} className="joker-cc-history-row">
                    <div className="joker-cc-history-row__head">
                      <strong className="joker-amount-plus">-{formatPrice(payment.amount)}</strong>
                      <span className="joker-order-item__excluded">{formatDateTime(payment.createdAt)}</span>
                    </div>
                    {payment.coveredEntries.length ? (
                      <ul className="joker-cc-history-row__items">
                        {payment.coveredEntries.map((covered, index) => (
                          <li key={index}>
                            Boleta del {formatDateTime(selectedClientEntries.find((entry) => entry.id === covered.entryId)?.createdAt ?? payment.createdAt)}
                            {": "}
                            {formatPrice(covered.amountApplied)} de {formatPrice(covered.entryTotal)}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="joker-empty-state">Este cliente todavia no hizo pagos.</p>
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
                          <li key={index}>
                            {item.unitPrice != null
                              ? `${item.quantity}x ${item.productName} — ${formatPrice(item.unitPrice * item.quantity)}`
                              : `${item.quantity}x ${item.productName}`}
                          </li>
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

      {isPayingAccount && selectedClient ? (
        <AccountPaymentModal
          client={selectedClient}
          balance={selectedClientDebt}
          isSubmitting={isSubmittingPayment}
          onClose={() => setIsPayingAccount(false)}
          onConfirm={handleConfirmPayment}
        />
      ) : null}
    </div>
  );
}
