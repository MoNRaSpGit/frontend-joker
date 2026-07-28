import { useState } from "react";
import type { JokerAccountEntry, JokerClient } from "../joker.types";

type CuentaCorrienteScreenProps = {
  clients: JokerClient[];
  accountEntries: JokerAccountEntry[];
  onAddClient: (name: string, phone?: string) => void;
};

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function formatDateTime(isoDate: string) {
  const date = new Date(isoDate);
  const dateLabel = date.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

function formatEntryItems(entry: JokerAccountEntry) {
  return entry.items.map((item) => `${item.quantity}x ${item.productName}`).join(", ");
}

export function CuentaCorrienteScreen({ clients, accountEntries, onAddClient }: CuentaCorrienteScreenProps) {
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  function debtFor(clientId: string) {
    return accountEntries.filter((entry) => entry.clientId === clientId).reduce((sum, entry) => sum + entry.total, 0);
  }

  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedClientEntries = selectedClient
    ? accountEntries.filter((entry) => entry.clientId === selectedClient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const selectedClientDebt = selectedClient ? debtFor(selectedClient.id) : 0;

  function handleAddClient() {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    onAddClient(trimmed, newClientPhone);
    setNewClientName("");
    setNewClientPhone("");
  }

  return (
    <div className="joker-columns-3">
      <section className="joker-panel joker-cc-card">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Cuenta corriente</p>
          <h2>Alta rapida</h2>
        </div>

        <label className="joker-form-field">
          <span>Nombre</span>
          <input
            type="text"
            value={newClientName}
            onChange={(event) => setNewClientName(event.target.value)}
            placeholder="Ej: Juan Perez"
          />
        </label>
        <label className="joker-form-field">
          <span>Telefono</span>
          <input
            type="tel"
            value={newClientPhone}
            onChange={(event) => setNewClientPhone(event.target.value)}
            placeholder="099 000 000"
          />
        </label>
        <button type="button" className="joker-button joker-button--primary joker-button--auto" onClick={handleAddClient}>
          Agregar cliente
        </button>
      </section>

      <section className="joker-panel joker-cc-card">
        <div className="joker-panel__heading joker-panel__heading--row">
          <div>
            <p className="joker-eyebrow">Listado</p>
            <h2>Clientes</h2>
          </div>
          <span className="joker-cc-badge">{clients.length}</span>
        </div>

        <input
          type="search"
          className="joker-search-input"
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        {filteredClients.length ? (
          <ul className="joker-cc-list top-gap">
            {filteredClients.map((client) => (
              <li key={client.id}>
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state">No hay clientes que coincidan.</p>
        )}
      </section>

      <section className="joker-panel joker-cc-card">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Detalle</p>
          <h2>{selectedClient ? selectedClient.name : "Estado del cliente"}</h2>
        </div>

        {selectedClient ? (
          <>
            <div className="joker-cc-hero">
              <div>
                <span className="joker-cc-hero__label">Saldo actual</span>
                <strong className="joker-cc-hero__name">{selectedClient.name}</strong>
                {selectedClient.phone ? <span className="joker-cc-hero__phone">{selectedClient.phone}</span> : null}
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
                      <span className="joker-order-item__excluded">{formatDateTime(entry.createdAt)}</span>
                    </div>
                    <p className="joker-cc-history-row__items">{formatEntryItems(entry)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="joker-empty-state">Este cliente todavia no tiene consumos en cuenta.</p>
            )}
          </>
        ) : (
          <p className="joker-empty-state">Selecciona un cliente para ver su saldo.</p>
        )}
      </section>
    </div>
  );
}
