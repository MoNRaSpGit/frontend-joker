import { useState } from "react";
import { DateTextInput } from "../components/DateTextInput";
import { listOrdersByDate } from "../joker.api";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerClient, JokerCourier, JokerOrderRecord } from "../joker.types";
import { formatDateTime, formatPrice } from "./panelHelpers";

type SalesHistoryScreenProps = {
  couriers: JokerCourier[];
  clients: JokerClient[];
};

// Historial de ventas: el operario (Admin o Usuario, los dos ven lo mismo)
// escribe una fecha a mano y ve TODOS los pedidos confirmados de ese dia
// comercial (5am a 5am, tanto los que salieron de la caja del Administrador
// como los del Usuario), con el mismo detalle que Panel > Movimientos --
// pero es solo una foto de lo que paso: no se puede editar ni borrar nada
// desde aca.
export function SalesHistoryScreen({ couriers, clients }: SalesHistoryScreenProps) {
  const [selectedDate, setSelectedDate] = useState("");
  const [orders, setOrders] = useState<JokerOrderRecord[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  async function handleDateChange(iso: string) {
    setSelectedDate(iso);
    setExpandedOrderId(null);

    if (!iso) {
      setOrders(null);
      setLoadError(null);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listOrdersByDate(iso);
      setOrders(result.items);
    } catch (fetchError) {
      setOrders(null);
      setLoadError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el historial.");
    } finally {
      setIsLoading(false);
    }
  }

  const totalVendido = orders?.reduce((sum, order) => sum + order.total, 0) ?? 0;
  const dateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Foto de un dia</p>
        <h2>Historial de ventas</h2>
      </div>

      <label className="joker-form-field">
        <span>Fecha</span>
        <DateTextInput value={selectedDate} onChange={(iso) => void handleDateChange(iso)} />
      </label>

      {isLoading ? <p className="joker-empty-state">Cargando pedidos del {dateLabel}...</p> : null}

      {loadError ? <p className="joker-order-item__excluded">No se pudo cargar: {loadError}</p> : null}

      {!isLoading && !loadError && orders ? (
        <>
          <div className="joker-stat-grid">
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Vendido el {dateLabel}</span>
              <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(totalVendido)}</strong>
            </div>
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Pedidos</span>
              <strong className="joker-stat-tile__value">{orders.length}</strong>
            </div>
          </div>

          {orders.length ? (
            <ul className="joker-order-list">
              {orders.map((order) => (
                <li key={order.id} className="joker-order-item joker-order-item--stacked">
                  <div
                    role="button"
                    tabIndex={0}
                    className="joker-order-item joker-order-item--flat joker-order-item--clickable"
                    onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedOrderId((current) => (current === order.id ? null : order.id));
                      }
                    }}
                  >
                    <div className="joker-order-item__title-group">
                      <strong>Pedido #{order.displayNumber ?? "-"}</strong>
                      <span className="joker-order-meta-chip">
                        {order.originRole === "administrador" ? "Admin" : "Usuario"}
                      </span>
                      {order.courierId ? (
                        <span className="joker-delivery-chip joker-delivery-chip--assigned joker-delivery-chip--mini">
                          🛵 {couriers.find((courier) => courier.id === order.courierId)?.name ?? "Repartidor"}
                        </span>
                      ) : order.customerName?.trim().toUpperCase().includes("MOSTRADOR") ? (
                        <span className="joker-delivery-chip joker-delivery-chip--counter joker-delivery-chip--mini">
                          🏪 Mostrador
                        </span>
                      ) : null}
                    </div>

                    <strong className="joker-amount-plus">+{formatPrice(order.total)}</strong>
                  </div>

                  {expandedOrderId === order.id ? (
                    <ul className="joker-order-detail-list">
                      <li className="joker-order-detail-list__meta">
                        <div className="joker-order-meta-row">
                          <div className="joker-order-meta-section">
                            <span className="joker-order-meta-chip">{formatDateTime(order.createdAt, order.orderDate)}</span>
                            <span className="joker-order-meta-chip">{JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
                          </div>

                          {order.paymentMethod === "cuenta" && order.clientId ? (
                            <div className="joker-order-meta-customer">
                              <strong>{clients.find((client) => client.id === order.clientId)?.name ?? "Cliente"}</strong>
                            </div>
                          ) : !order.customerName?.trim().toUpperCase().includes("MOSTRADOR") &&
                            (order.customerName?.trim() || order.address?.trim()) ? (
                            <div className="joker-order-meta-customer">
                              {order.customerName?.trim() ? <strong>{order.customerName}</strong> : null}
                              {order.address?.trim() ? <span>{order.address}</span> : null}
                            </div>
                          ) : null}
                        </div>
                      </li>
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          <span className="joker-qty-badge">{item.quantity}</span>
                          <div>
                            <strong>{item.productName}</strong>
                            {item.detail ? <p className="joker-order-item__excluded">{item.detail}</p> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="joker-empty-state">No hubo pedidos ese dia.</p>
          )}
        </>
      ) : null}

      {!isLoading && !loadError && !orders ? (
        <p className="joker-empty-state">Escribi una fecha para ver los pedidos de ese dia.</p>
      ) : null}
    </section>
  );
}
