import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { listCurrentPeriodOrders } from "../joker.api";
import type { JokerCourier, JokerOrderRecord } from "../joker.types";

type DeliveryScreenProps = {
  couriers: JokerCourier[];
  onRenameCourier: (courierId: number, name: string) => Promise<void>;
};

const DEFAULT_HOURLY_RATE = "120";
const DEFAULT_HOURS_WORKED = "5";

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function CourierSettlement({ courier }: { courier: JokerCourier }) {
  const [orders, setOrders] = useState<JokerOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState(DEFAULT_HOURLY_RATE);
  const [hoursWorked, setHoursWorked] = useState(DEFAULT_HOURS_WORKED);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    listCurrentPeriodOrders(courier.id)
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
  }, [courier.id]);

  const deliveryCostTotal = orders.reduce((sum, order) => sum + (order.deliveryCost || 0), 0);
  const ordersWithDeliveryCost = orders.filter((order) => order.deliveryCost);
  const parsedRate = Number(hourlyRate) || 0;
  const parsedHours = Number(hoursWorked) || 0;
  const hoursTotal = parsedRate * parsedHours;
  const grandTotal = hoursTotal + deliveryCostTotal;

  return (
    <div className="joker-delivery-settlement">
      {isLoading ? (
        <p className="joker-empty-state">Cargando pedidos...</p>
      ) : loadError ? (
        <p className="joker-order-item__excluded">{loadError}</p>
      ) : (
        <>
          <p className="joker-delivery-settlement__count">
            {orders.length} {orders.length === 1 ? "pedido realizado" : "pedidos realizados"} desde el ultimo cierre de caja
          </p>

          {orders.length ? (
            <ul className="joker-order-list">
              {orders.map((order) => (
                <li key={order.id} className="joker-order-item joker-order-item--flat">
                  <span>Pedido #{order.displayNumber}</span>
                  <span className={order.deliveryCost ? "joker-delivery-cost-tag" : "joker-order-item__excluded"}>
                    {order.deliveryCost ? `Envio ${formatPrice(order.deliveryCost)}` : "Sin costo de envio"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="joker-empty-state">Todavia no tiene pedidos asignados en este turno.</p>
          )}

          <div className="joker-form-row">
            <label className="joker-form-field">
              <span>Tarifa por hora</span>
              <input type="number" min="0" step="1" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
            </label>
            <label className="joker-form-field">
              <span>Horas trabajadas</span>
              <input type="number" min="0" step="0.5" value={hoursWorked} onChange={(event) => setHoursWorked(event.target.value)} />
            </label>
          </div>
          <p className="joker-order-item__excluded" style={{ marginTop: -6 }}>
            Estandar del turno 19 a 00 hs = 5 horas.
          </p>

          <div className="joker-delivery-summary">
            <div className="joker-delivery-summary__row">
              <span>
                Horas ({parsedHours} hs x {formatPrice(parsedRate)})
              </span>
              <strong>{formatPrice(hoursTotal)}</strong>
            </div>
            <div className="joker-delivery-summary__row">
              <span>Costo de envio total ({ordersWithDeliveryCost.length} pedidos)</span>
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

export function DeliveryScreen({ couriers, onRenameCourier }: DeliveryScreenProps) {
  const [expandedCourierId, setExpandedCourierId] = useState<number | null>(null);
  const [editingCourierId, setEditingCourierId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  function handleStartEdit(courier: JokerCourier, event: React.MouseEvent) {
    event.stopPropagation();
    setEditingCourierId(courier.id);
    setEditingName(courier.name);
  }

  async function handleSaveName(courierId: number) {
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error("Ponele un nombre al repartidor.");
      return;
    }

    setIsSavingName(true);
    try {
      await onRenameCourier(courierId, trimmed);
      setEditingCourierId(null);
      toast.success("Nombre actualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el nombre.");
    } finally {
      setIsSavingName(false);
    }
  }

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
          const isEditingName = editingCourierId === courier.id;

          return (
            <article key={courier.id} className={`joker-delivery-card${expanded ? " joker-delivery-card--expanded" : ""}`}>
              <button
                type="button"
                className="joker-delivery-card__header"
                onClick={() => setExpandedCourierId(expanded ? null : courier.id)}
              >
                <span className="joker-delivery-card__icon">🛵</span>

                {isEditingName ? (
                  <input
                    autoFocus
                    className="joker-delivery-card__name-input"
                    value={editingName}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setEditingName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSaveName(courier.id);
                      }
                    }}
                  />
                ) : (
                  <strong className="joker-delivery-card__name">{courier.name}</strong>
                )}

                <span className="joker-delivery-card__actions">
                  {isEditingName ? (
                    <button
                      type="button"
                      className="joker-button joker-button--ghost joker-button--auto"
                      disabled={isSavingName}
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleSaveName(courier.id);
                      }}
                    >
                      {isSavingName ? "..." : "Guardar"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="joker-delivery-card__edit"
                      onClick={(event) => handleStartEdit(courier, event)}
                      aria-label={`Editar nombre de ${courier.name}`}
                    >
                      ✎
                    </button>
                  )}
                  <span className={`joker-delivery-card__chevron${expanded ? " joker-delivery-card__chevron--open" : ""}`}>›</span>
                </span>
              </button>

              {expanded ? <CourierSettlement courier={courier} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
