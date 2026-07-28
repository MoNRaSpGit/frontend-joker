import { useEffect, useState } from "react";
import { listOrders } from "../joker.api";
import type { JokerOrderRecord } from "../joker.types";

const PROFIT_RATE = 0.3;

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
}

function getTodayLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function buildRanking(orders: JokerOrderRecord[]) {
  const countByProduct = new Map<string, number>();

  for (const order of orders) {
    for (const item of order.items) {
      countByProduct.set(item.productName, (countByProduct.get(item.productName) ?? 0) + item.quantity);
    }
  }

  return Array.from(countByProduct.entries())
    .map(([productName, quantity]) => ({ productName, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
}

export function PanelScreen() {
  const [orders, setOrders] = useState<JokerOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    void loadOrders();
  }, []);

  async function loadOrders() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await listOrders(getTodayLabel());
      setOrders(result.items);
    } catch (fetchError) {
      setLoadError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el panel.");
    } finally {
      setIsLoading(false);
    }
  }

  const totalVendido = orders.reduce((sum, order) => sum + order.total, 0);
  const ganancia = totalVendido * PROFIT_RATE;
  const ranking = buildRanking(orders);

  if (isLoading) {
    return <p className="joker-empty-state">Cargando panel...</p>;
  }

  if (loadError) {
    return (
      <div className="joker-panel">
        <p className="joker-order-item__excluded">No se pudo cargar el panel: {loadError}</p>
        <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={loadOrders}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="joker-panel">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Hoy</p>
          <h2>Resumen del dia</h2>
        </div>

        <div className="joker-stat-grid">
          <div className="joker-stat-tile">
            <span className="joker-stat-tile__label">Vendido</span>
            <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(totalVendido)}</strong>
          </div>
          <div className="joker-stat-tile">
            <span className="joker-stat-tile__label">Ganancia (30%)</span>
            <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(ganancia)}</strong>
          </div>
          <div className="joker-stat-tile">
            <span className="joker-stat-tile__label">Pedidos</span>
            <strong className="joker-stat-tile__value">{orders.length}</strong>
          </div>
        </div>
      </section>

      <section className="joker-panel">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Ranking</p>
          <h2>Productos mas vendidos</h2>
        </div>

        {ranking.length ? (
          <ul className="joker-order-list">
            {ranking.map((entry, index) => (
              <li key={entry.productName} className="joker-order-item">
                <div className="joker-order-item__info">
                  <span className="joker-qty-badge">#{index + 1}</span>
                  <strong>{entry.productName}</strong>
                </div>
                <span className="joker-qty-badge">{entry.quantity}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state">Todavia no hay pedidos impresos hoy.</p>
        )}
      </section>

      <section className="joker-panel">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Movimientos</p>
          <h2>Pedidos de hoy</h2>
        </div>

        {orders.length ? (
          <ul className="joker-order-list">
            {orders.map((order) => (
              <li key={order.id} className="joker-order-item joker-order-item--stacked">
                <div className="joker-order-item joker-order-item--flat">
                  <div className="joker-order-item__info">
                    <strong>Pedido #{order.id}</strong>
                    <span className="joker-order-item__excluded">{formatTime(order.createdAt)}</span>
                  </div>
                  <div className="joker-product-row-actions">
                    <strong className="joker-amount-plus">+{formatPrice(order.total)}</strong>
                    <button
                      type="button"
                      className="joker-button joker-button--ghost joker-button--auto"
                      onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                    >
                      {expandedOrderId === order.id ? "Ocultar" : "Detalle"}
                    </button>
                  </div>
                </div>

                {expandedOrderId === order.id ? (
                  <ul className="joker-order-detail-list">
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
          <p className="joker-empty-state">Todavia no hay pedidos impresos hoy.</p>
        )}
      </section>
    </>
  );
}
