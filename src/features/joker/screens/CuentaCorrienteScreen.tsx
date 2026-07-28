import { useState } from "react";
import type { JokerAccountEntry, JokerClient } from "../joker.types";

type CuentaCorrienteScreenProps = {
  clients: JokerClient[];
  accountEntries: JokerAccountEntry[];
  onAddClient: (name: string) => void;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedClientEntries = selectedClient
    ? accountEntries.filter((entry) => entry.clientId === selectedClient.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  const selectedClientDebt = selectedClientEntries.reduce((sum, entry) => sum + entry.total, 0);

  function handleAddClient() {
    const trimmed = newClientName.trim();
    if (!trimmed) return;
    onAddClient(trimmed);
    setNewClientName("");
  }

  return (
    <div className="joker-columns-3">
      <section className="joker-panel">
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
        <button type="button" className="joker-button joker-button--primary joker-button--auto" onClick={handleAddClient}>
          Agregar cliente
        </button>
      </section>

      <section className="joker-panel">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Listado</p>
          <h2>Clientes</h2>
        </div>

        <input
          type="search"
          className="joker-search-input"
          placeholder="Buscar cliente..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />

        {filteredClients.length ? (
          <ul className="joker-order-list top-gap">
            {filteredClients.map((client) => (
              <li key={client.id}>
                <button
                  type="button"
                  className={`joker-order-item joker-order-item--flat joker-order-item--clickable${
                    selectedClientId === client.id ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <strong>{client.name}</strong>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state">No hay clientes que coincidan.</p>
        )}
      </section>

      <section className="joker-panel">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Detalle</p>
          <h2>{selectedClient ? selectedClient.name : "Estado del cliente"}</h2>
        </div>

        {selectedClient ? (
          <>
            <div className="joker-stat-grid">
              <div className="joker-stat-tile">
                <span className="joker-stat-tile__label">Debe</span>
                <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(selectedClientDebt)}</strong>
              </div>
            </div>

            <div className="joker-panel__heading top-gap">
              <p className="joker-eyebrow">Historial</p>
            </div>

            {selectedClientEntries.length ? (
              <ul className="joker-order-list">
                {selectedClientEntries.map((entry) => (
                  <li key={entry.id} className="joker-order-item joker-order-item--stacked">
                    <div className="joker-order-item joker-order-item--flat">
                      <strong>{formatDateTime(entry.createdAt)}</strong>
                      <strong className="joker-amount-plus">+{formatPrice(entry.total)}</strong>
                    </div>
                    <p className="joker-order-item__excluded">{formatEntryItems(entry)}</p>
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
