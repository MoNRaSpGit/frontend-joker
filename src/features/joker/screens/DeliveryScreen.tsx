import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { addCourierCashMovement, getCourierCashSummary, listCurrentPeriodOrders } from "../joker.api";
import type { JokerCourier, JokerCourierCashSummary, JokerOrderRecord } from "../joker.types";

type DeliveryScreenProps = {
  couriers: JokerCourier[];
  onRenameCourier: (courierId: number, name: string) => Promise<void>;
};

const DEFAULT_HOURLY_RATE = "120";
const DEFAULT_HOURS_WORKED = "5";

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function CourierCash({ courier }: { courier: JokerCourier }) {
  const [summary, setSummary] = useState<JokerCourierCashSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialCashInput, setInitialCashInput] = useState("");
  const [expenseAmountInput, setExpenseAmountInput] = useState("");
  const [expenseDescriptionInput, setExpenseDescriptionInput] = useState("");
  const [handoverAmountInput, setHandoverAmountInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getCourierCashSummary(courier.id)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "No se pudo cargar la caja.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courier.id]);

  async function handleAddMovement(type: "inicial" | "gasto" | "entrega", amountInput: string, description?: string) {
    const parsedAmount = Number(amountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Ingresa un monto valido mayor a 0.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await addCourierCashMovement(courier.id, type, parsedAmount, description);
      setSummary(result);
      if (type === "inicial") setInitialCashInput("");
      if (type === "gasto") {
        setExpenseAmountInput("");
        setExpenseDescriptionInput("");
      }
      if (type === "entrega") setHandoverAmountInput("");
      toast.success(type === "inicial" ? "Caja inicial cargada." : type === "gasto" ? "Gasto registrado." : "Entrega registrada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el movimiento.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="joker-empty-state">Cargando caja...</p>;
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="joker-delivery-cash">
      <div className="joker-delivery-summary joker-delivery-summary--cash">
        <div className="joker-delivery-summary__row">
          <span>Caja inicial</span>
          <strong>{formatPrice(summary.initialCash)}</strong>
        </div>
        <div className="joker-delivery-summary__row">
          <span>Efectivo cobrado ({summary.ordersCashCount} pedidos)</span>
          <strong>{formatPrice(summary.ordersCashTotal)}</strong>
        </div>
        <div className="joker-delivery-summary__row">
          <span>Gastos</span>
          <strong>-{formatPrice(summary.expensesTotal)}</strong>
        </div>
        <div className="joker-delivery-summary__row">
          <span>Entregas al local</span>
          <strong>-{formatPrice(summary.handoversTotal)}</strong>
        </div>
        <div className="joker-delivery-summary__row joker-delivery-summary__row--cash-total">
          <span>Caja actual</span>
          <strong>{formatPrice(summary.cashOnHand)}</strong>
        </div>
      </div>

      <div className="joker-delivery-cash-forms">
        <div className="joker-delivery-cash-form">
          <label className="joker-form-field">
            <span>Caja inicial</span>
            <input type="number" min="0" step="1" value={initialCashInput} onChange={(event) => setInitialCashInput(event.target.value)} placeholder="Ej: 1000" />
          </label>
          <button
            type="button"
            className="joker-button joker-button--ghost joker-button--auto"
            disabled={isSaving}
            onClick={() => void handleAddMovement("inicial", initialCashInput)}
          >
            Agregar
          </button>
        </div>

        <div className="joker-delivery-cash-form">
          <label className="joker-form-field">
            <span>Gasto (compra para el local)</span>
            <input type="number" min="0" step="1" value={expenseAmountInput} onChange={(event) => setExpenseAmountInput(event.target.value)} placeholder="Ej: 500" />
          </label>
          <label className="joker-form-field">
            <span>Detalle (opcional)</span>
            <input type="text" value={expenseDescriptionInput} onChange={(event) => setExpenseDescriptionInput(event.target.value)} placeholder="Ej: Muzzarella" />
          </label>
          <button
            type="button"
            className="joker-button joker-button--ghost joker-button--auto"
            disabled={isSaving}
            onClick={() => void handleAddMovement("gasto", expenseAmountInput, expenseDescriptionInput.trim() || undefined)}
          >
            Registrar gasto
          </button>
        </div>

        <div className="joker-delivery-cash-form">
          <label className="joker-form-field">
            <span>Entrega al local</span>
            <input type="number" min="0" step="1" value={handoverAmountInput} onChange={(event) => setHandoverAmountInput(event.target.value)} placeholder="Ej: 2000" />
          </label>
          <button
            type="button"
            className="joker-button joker-button--primary joker-button--auto"
            disabled={isSaving}
            onClick={() => void handleAddMovement("entrega", handoverAmountInput)}
          >
            Registrar entrega
          </button>
        </div>
      </div>

      {summary.movements.length ? (
        <ul className="joker-order-list">
          {summary.movements.map((movement) => (
            <li key={movement.id} className="joker-order-item joker-order-item--flat">
              <span>
                {movement.type === "gasto" ? "🧾 Gasto" : "📦 Entrega"}
                {movement.description ? ` · ${movement.description}` : ""}
              </span>
              <span className="joker-order-item__excluded">{formatPrice(movement.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
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
      <p className="joker-delivery-section-title">Caja</p>
      <CourierCash courier={courier} />

      <p className="joker-delivery-section-title">Liquidacion</p>

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
                    <>
                      <button
                        type="button"
                        className="joker-button joker-button--ghost joker-button--auto"
                        disabled={isSavingName}
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingCourierId(null);
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="joker-button joker-button--primary joker-button--auto"
                        disabled={isSavingName}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleSaveName(courier.id);
                        }}
                      >
                        {isSavingName ? "..." : "Guardar"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="joker-button joker-button--ghost joker-button--auto"
                      onClick={(event) => handleStartEdit(courier, event)}
                    >
                      Editar
                    </button>
                  )}
                  {!isEditingName ? (
                    <span className={`joker-delivery-card__chevron${expanded ? " joker-delivery-card__chevron--open" : ""}`}>›</span>
                  ) : null}
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
