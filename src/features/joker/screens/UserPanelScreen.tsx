import { useEffect, useState } from "react";
import { getCourierCashSummary, listCurrentPeriodOrders } from "../joker.api";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerCourier, JokerCourierCashSummary, JokerOrderRecord } from "../joker.types";
import {
  MEDALS,
  MEDAL_CLASSES,
  MOVEMENTS_PREVIEW_COUNT,
  PAYMENT_METHODS,
  buildPaymentTotals,
  buildRanking,
  formatDateTime,
  formatPrice,
  getDisplayCustomerName,
  getStoredProfitRatePercent
} from "./panelHelpers";

type UserPanelScreenProps = {
  couriers: JokerCourier[];
};

// Version del Panel para el rol Usuario: mismo resumen del turno (vendido,
// ganancia, tipos de pago, movimientos, ranking) que el del Administrador,
// pero puramente informativa -- sin poder asignar repartidor/mostrador,
// editar el metodo de pago ni borrar pedidos. La caja de "Mostrador" ya
// no la maneja el Usuario (antes la abria/cerraba el mismo con su propio
// monto inicial) -- ahora es una tarjeta mas en Delivery que solo el
// Administrador habilita/liquida (ver DeliveryScreen, courier con
// isCounter=true); esta pantalla solo lee esos numeros, no los toca.
export function UserPanelScreen({ couriers }: UserPanelScreenProps) {
  const mostrador = couriers.find((courier) => courier.isCounter) ?? null;
  const isMostradorHabilitado = mostrador?.status === "activo";

  const [orders, setOrders] = useState<JokerOrderRecord[]>([]);
  const [cashSummary, setCashSummary] = useState<JokerCourierCashSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [profitRatePercent] = useState(getStoredProfitRatePercent);

  // Refresco silencioso cada 1s (igual que el Panel del Administrador)
  // para reflejar pedidos aceptados y designaciones de mostrador/delivery
  // desde otra pantalla practicamente al toque, sin recargar.
  useEffect(() => {
    void loadData();

    const intervalId = window.setInterval(() => {
      void loadData(true);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [mostrador?.id]);

  async function loadData(silent = false) {
    if (!mostrador) {
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const [ordersResult, summary] = await Promise.all([
        listCurrentPeriodOrders(mostrador.id),
        getCourierCashSummary(mostrador.id)
      ]);
      setOrders(ordersResult.items);
      setCashSummary(summary);
    } catch (fetchError) {
      if (!silent) {
        setLoadError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el panel.");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  const totalVendido = orders.reduce((sum, order) => sum + order.total, 0);
  const ganancia = totalVendido * (profitRatePercent / 100);
  const ranking = buildRanking(orders);
  const paymentTotals = buildPaymentTotals(orders);
  const visibleOrders = showAllMovements ? orders : orders.slice(0, MOVEMENTS_PREVIEW_COUNT);
  const hasHiddenMovements = orders.length > MOVEMENTS_PREVIEW_COUNT;

  if (isLoading) {
    return <p className="joker-empty-state">Cargando panel...</p>;
  }

  if (loadError) {
    return (
      <div className="joker-panel">
        <p className="joker-order-item__excluded">No se pudo cargar el panel: {loadError}</p>
        <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={() => loadData()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="joker-panel">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Mostrador</p>
          <h2>Resumen del turno</h2>
        </div>

        {!isMostradorHabilitado ? (
          <p className="joker-empty-state">
            El mostrador no esta habilitado. Pedile al administrador que lo habilite desde Delivery.
          </p>
        ) : (
          <div className="joker-stat-grid">
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Monto inicial</span>
              <strong className="joker-stat-tile__value">{formatPrice(cashSummary?.initialCash ?? 0)}</strong>
            </div>
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Caja actual</span>
              <strong className="joker-stat-tile__value">{formatPrice(cashSummary?.cashOnHand ?? 0)}</strong>
            </div>
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Vendido</span>
              <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(totalVendido)}</strong>
            </div>
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Ganancia ({profitRatePercent}%)</span>
              <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(ganancia)}</strong>
            </div>
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Pedidos</span>
              <strong className="joker-stat-tile__value">{orders.length}</strong>
            </div>
          </div>
        )}
      </section>

      {isMostradorHabilitado ? (
        <>
          <section className="joker-panel">
            <div className="joker-panel__heading">
              <p className="joker-eyebrow">Mostrador</p>
              <h2>Tipo de pagos</h2>
            </div>

            <div className="joker-stat-grid">
              {PAYMENT_METHODS.map((method) => (
                <div key={method} className={`joker-stat-tile joker-stat-tile--${method}`}>
                  <span className="joker-stat-tile__label">{JOKER_PAYMENT_METHOD_LABELS[method]}</span>
                  <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(paymentTotals[method])}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="joker-panel">
            <div className="joker-panel__heading joker-panel__heading--row">
              <p className="joker-eyebrow">Movimientos</p>
              {hasHiddenMovements ? (
                <button type="button" className="joker-mini-button" onClick={() => setShowAllMovements((current) => !current)}>
                  {showAllMovements ? "Ver menos" : "Ver todos"}
                </button>
              ) : null}
            </div>

            {orders.length ? (
              <ul className="joker-order-list">
                {visibleOrders.map((order) => (
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
                        <strong>Pedido #{order.displayNumber}</strong>
                        <span className="joker-order-item__excluded">
                          {order.items.length} producto{order.items.length === 1 ? "" : "s"}
                          {order.customerName?.trim() ? ` · ${order.customerName.trim()}` : ""}
                        </span>
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
                            <div className="joker-order-meta-customer">
                              <span>
                                <strong>Nombre:</strong> {getDisplayCustomerName(order) || "-"}
                              </span>
                              <span>
                                <strong>Direccion:</strong> {order.address?.trim() || "-"}
                              </span>
                            </div>
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
              <p className="joker-empty-state">Todavia no hiciste ventas en este turno.</p>
            )}
          </section>

          <section className="joker-panel">
            <div className="joker-panel__heading">
              <p className="joker-eyebrow">Mostrador</p>
              <h2>Productos mas vendidos</h2>
            </div>

            {ranking.length ? (
              <ul className="joker-order-list">
                {ranking.map((entry, index) => (
                  <li key={entry.productName} className="joker-order-item">
                    <div className="joker-order-item__info">
                      <span className={`joker-qty-badge ${MEDAL_CLASSES[index] ?? ""}`}>{MEDALS[index] ?? `#${index + 1}`}</span>
                      <strong>{entry.productName}</strong>
                    </div>
                    <span className="joker-qty-badge">{entry.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="joker-empty-state">Todavia no hiciste ventas en este turno.</p>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
