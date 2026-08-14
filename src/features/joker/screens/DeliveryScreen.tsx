import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listOrders } from "../joker.api";
import type { JokerCourier, JokerOrderRecord } from "../joker.types";

type DeliveryScreenProps = {
  couriers: JokerCourier[];
};

const DEFAULT_HOURLY_RATE = "120";
const DEFAULT_HOURS_WORKED = "5";

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-CA");
}

function CourierSettlement({ courier }: { courier: JokerCourier }) {
  const [dateLabel, setDateLabel] = useState(getTodayLabel);
  const [orders, setOrders] = useState<JokerOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState(DEFAULT_HOURLY_RATE);
  const [hoursWorked, setHoursWorked] = useState(DEFAULT_HOURS_WORKED);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    listOrders(dateLabel, courier.id)
      .then((result) => {
        if (!cancelled) setOrders(result.items);
      })
      .catch((error) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "No se pudieron cargar los pedidos.";
          setLoadError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courier.id, dateLabel]);

  const deliveryCostTotal = orders.reduce((sum, order) => sum + (order.deliveryCost || 0), 0);
  const parsedRate = Number(hourlyRate) || 0;
  const parsedHours = Number(hoursWorked) || 0;
  const hoursTotal = parsedRate * parsedHours;
  const grandTotal = hoursTotal + deliveryCostTotal;

  return (
    <div className="joker-delivery-settlement">
      <div className="joker-form-row">
        <label className="joker-form-field">
          <span>Fecha</span>
          <input type="date" value={dateLabel} onChange={(event) => setDateLabel(event.target.value)} />
        </label>
        <label className="joker-form-field">
          <span>Tarifa por hora</span>
          <input type="number" min="0" step="1" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
        </label>
      </div>

      <label className="joker-form-field">
        <span>Horas trabajadas (estandar 19 a 00 hs = 5 hs)</span>
        <input type="number" min="0" step="0.5" value={hoursWorked} onChange={(event) => setHoursWorked(event.target.value)} />
      </label>

      {isLoading ? (
        <p className="joker-empty-state top-gap">Cargando pedidos...</p>
      ) : loadError ? (
        <p className="joker-order-item__excluded top-gap">{loadError}</p>
      ) : (
        <>
          <p className="joker-order-item__excluded top-gap">
            {courier.name} · {orders.length} {orders.length === 1 ? "pedido realizado" : "pedidos realizados"}
          </p>

          {orders.length ? (
            <ul className="joker-order-list">
              {orders.map((order) => (
                <li key={order.id} className="joker-order-item joker-order-item--flat">
                  <span>Pedido #{order.displayNumber}</span>
                  <span>{order.deliveryCost ? `Envio: ${formatPrice(order.deliveryCost)}` : "Sin costo de envio"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="joker-empty-state">No tiene pedidos asignados este dia.</p>
          )}

          <div className="joker-delivery-summary top-gap">
            <div className="joker-delivery-summary__row">
              <span>Horas ({parsedHours} hs x {formatPrice(parsedRate)})</span>
              <strong>{formatPrice(hoursTotal)}</strong>
            </div>
            <div className="joker-delivery-summary__row">
              <span>Costo de envio total ({orders.filter((order) => order.deliveryCost).length} pedidos)</span>
              <strong>{formatPrice(deliveryCostTotal)}</strong>
            </div>
            <div className="joker-delivery-summary__row joker-delivery-summary__row--total">
              <span>Total a pagar</span>
              <strong>{formatPrice(grandTotal)}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DeliveryScreen({ couriers }: DeliveryScreenProps) {
  const [expandedCourierId, setExpandedCourierId] = useState<number | null>(null);

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Delivery</p>
        <h2>Repartidores</h2>
      </div>

      {couriers.length === 0 ? <p className="joker-empty-state">Todavia no hay repartidores cargados.</p> : null}

      <div className="joker-delivery-grid">
        {couriers.map((courier) => {
          const expanded = expandedCourierId === courier.id;
          return (
            <article key={courier.id} className="joker-delivery-card">
              <button
                type="button"
                className="joker-delivery-card__header"
                onClick={() => setExpandedCourierId(expanded ? null : courier.id)}
              >
                <strong>{courier.name}</strong>
              </button>

              {expanded ? <CourierSettlement courier={courier} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
