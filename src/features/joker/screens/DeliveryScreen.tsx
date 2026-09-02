import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { addCourierCashMovement, getCourierCashSummary, listCurrentPeriodOrders } from "../joker.api";
import { printCourierSummaryTicket } from "../services/joker.print";
import type { JokerCourier, JokerCourierCashSummary, JokerOrderRecord } from "../joker.types";

type DeliveryScreenProps = {
  couriers: JokerCourier[];
  onRenameCourier: (courierId: number, name: string) => Promise<void>;
  onEnableCourier: (courierId: number) => Promise<void>;
  onSettleCourier: (courierId: number) => Promise<void>;
};

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

type CashMovementType = "inicial" | "gasto" | "entrega";

function CourierCash({ courier }: { courier: JokerCourier }) {
  const [summary, setSummary] = useState<JokerCourierCashSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialCashInput, setInitialCashInput] = useState("");
  const [expenseAmountInput, setExpenseAmountInput] = useState("");
  const [expenseDescriptionInput, setExpenseDescriptionInput] = useState("");
  const [handoverAmountInput, setHandoverAmountInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Cual de las 3 cajitas (Inicial/Gastos/Entregas) esta abierta para
  // cargar un monto -- "Cobrado" no tiene form, se carga solo por cada
  // pedido efectivo que se le asigna. Se abre/cierra clickeando la
  // cajita misma, sin un boton "Cargar" aparte.
  const [activeForm, setActiveForm] = useState<CashMovementType | null>(null);

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
  }, [courier.id, courier.status]);

  function toggleForm(type: CashMovementType) {
    if (courier.status !== "activo") return;
    setActiveForm((current) => (current === type ? null : type));
  }

  async function handleAddMovement(type: CashMovementType, amountInput: string, description?: string) {
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
      setActiveForm(null);
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
      <p className="joker-delivery-section-title">Caja</p>
      <div className="joker-delivery-summary joker-delivery-summary--cash joker-delivery-summary--compact">
        <div className="joker-delivery-summary__row joker-delivery-summary__row--cash-total">
          <span>Caja actual</span>
          <strong>{formatPrice(summary.cashOnHand)}</strong>
        </div>
      </div>

      <div className="joker-delivery-stat-grid">
        <button
          type="button"
          className={`joker-delivery-stat-card joker-delivery-stat-card--clickable${activeForm === "inicial" ? " is-active" : ""}`}
          disabled={courier.status !== "activo"}
          onClick={() => toggleForm("inicial")}
        >
          <span className="joker-delivery-stat-card__label">Inicial</span>
          <strong className="joker-delivery-stat-card__value">{formatPrice(summary.initialCash)}</strong>
        </button>
        <div className="joker-delivery-stat-card">
          <span className="joker-delivery-stat-card__label">Cobrado ({summary.ordersCashCount})</span>
          <strong className="joker-delivery-stat-card__value">{formatPrice(summary.ordersCashTotal)}</strong>
        </div>
        <button
          type="button"
          className={`joker-delivery-stat-card joker-delivery-stat-card--clickable${activeForm === "gasto" ? " is-active" : ""}`}
          disabled={courier.status !== "activo"}
          onClick={() => toggleForm("gasto")}
        >
          <span className="joker-delivery-stat-card__label">Gastos</span>
          <strong className="joker-delivery-stat-card__value">{formatPrice(summary.expensesTotal)}</strong>
        </button>
        <button
          type="button"
          className={`joker-delivery-stat-card joker-delivery-stat-card--clickable${activeForm === "entrega" ? " is-active" : ""}`}
          disabled={courier.status !== "activo"}
          onClick={() => toggleForm("entrega")}
        >
          <span className="joker-delivery-stat-card__label">Entregas</span>
          <strong className="joker-delivery-stat-card__value">{formatPrice(summary.handoversTotal)}</strong>
        </button>
      </div>

      {courier.status !== "activo" ? (
        <p className="joker-empty-state">Habilita al repartidor para cargar caja inicial, gastos o entregas.</p>
      ) : activeForm === "inicial" ? (
        <div className="joker-delivery-cash-form">
          <label className="joker-form-field">
            <span>Caja inicial</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="1"
              value={initialCashInput}
              onChange={(event) => setInitialCashInput(event.target.value)}
              placeholder="Ej: 1000"
            />
          </label>
          <button
            type="button"
            className="joker-button joker-button--dark joker-button--auto"
            disabled={isSaving}
            onClick={() => void handleAddMovement("inicial", initialCashInput)}
          >
            Agregar
          </button>
        </div>
      ) : activeForm === "gasto" ? (
        <div className="joker-delivery-cash-form">
          <label className="joker-form-field">
            <span>Gasto (compra para el local)</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="1"
              value={expenseAmountInput}
              onChange={(event) => setExpenseAmountInput(event.target.value)}
              placeholder="Ej: 500"
            />
          </label>
          <label className="joker-form-field">
            <span>Detalle (opcional)</span>
            <input type="text" value={expenseDescriptionInput} onChange={(event) => setExpenseDescriptionInput(event.target.value)} placeholder="Ej: Muzzarella" />
          </label>
          <button
            type="button"
            className="joker-button joker-button--dark joker-button--auto"
            disabled={isSaving}
            onClick={() => void handleAddMovement("gasto", expenseAmountInput, expenseDescriptionInput.trim() || undefined)}
          >
            Registrar gasto
          </button>
        </div>
      ) : activeForm === "entrega" ? (
        <div className="joker-delivery-cash-form">
          <label className="joker-form-field">
            <span>Entrega al local</span>
            <input
              autoFocus
              type="number"
              min="0"
              step="1"
              value={handoverAmountInput}
              onChange={(event) => setHandoverAmountInput(event.target.value)}
              placeholder="Ej: 2000"
            />
          </label>
          <button
            type="button"
            className="joker-button joker-button--dark joker-button--auto"
            disabled={isSaving}
            onClick={() => void handleAddMovement("entrega", handoverAmountInput)}
          >
            Registrar entrega
          </button>
        </div>
      ) : null}

      {summary.movements.length ? (
        <>
          <p className="joker-delivery-section-title">Historial</p>
          <ul className="joker-order-list">
            {summary.movements.map((movement) => (
              <li key={movement.id} className="joker-order-item joker-order-item--flat">
                <span>
                  {movement.type === "inicial" ? "💰 Caja inicial" : movement.type === "gasto" ? "🧾 Gasto" : "📦 Entrega"}
                  {movement.description ? ` · ${movement.description}` : ""}
                </span>
                <span className="joker-order-item__excluded">{formatPrice(movement.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function CourierSettlement({ courier }: { courier: JokerCourier }) {
  const [orders, setOrders] = useState<JokerOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);

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
  }, [courier.id, courier.status]);

  return (
    <div className="joker-delivery-settlement">
      <CourierCash courier={courier} />

      {isLoading ? (
        <p className="joker-empty-state">Cargando pedidos...</p>
      ) : loadError ? (
        <p className="joker-order-item__excluded">{loadError}</p>
      ) : (
        <div className="joker-delivery-toggle-row">
          <p className="joker-delivery-settlement__count">
            {orders.length} {orders.length === 1 ? "pedido realizado" : "pedidos realizados"} desde el ultimo cierre
          </p>
          {orders.length ? (
            <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={() => setShowOrders((current) => !current)}>
              {showOrders ? "Ocultar" : "Ver pedidos"}
            </button>
          ) : null}
        </div>
      )}

      {showOrders && orders.length ? (
        <ul className="joker-order-list">
          {orders.map((order) => (
            <li key={order.id} className="joker-order-item joker-order-item--flat">
              <span>
                Pedido #{order.displayNumber} · {formatPrice(order.total)}
              </span>
              <span className={order.deliveryCost ? "joker-delivery-cost-tag" : "joker-order-item__excluded"}>
                {order.deliveryCost ? `Envio ${formatPrice(order.deliveryCost)}` : "Sin costo de envio"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DeliveryScreen({ couriers, onRenameCourier, onEnableCourier, onSettleCourier }: DeliveryScreenProps) {
  const [expandedCourierId, setExpandedCourierId] = useState<number | null>(null);
  const [editingCourierId, setEditingCourierId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [togglingCourierId, setTogglingCourierId] = useState<number | null>(null);
  const [courierPendingSettlement, setCourierPendingSettlement] = useState<JokerCourier | null>(null);

  function handleToggleStatus(courier: JokerCourier, event: React.MouseEvent) {
    event.stopPropagation();

    if (courier.status === "activo") {
      setCourierPendingSettlement(courier);
      return;
    }

    setTogglingCourierId(courier.id);
    onEnableCourier(courier.id)
      .then(() => toast.success(`${courier.name}: habilitado.`))
      .catch((error) => toast.error(error instanceof Error ? error.message : "No se pudo habilitar."))
      .finally(() => setTogglingCourierId(null));
  }

  // Al liquidar se imprime el resumen del turno (caja inicial, pedidos
  // entregados con su costo de envio, gastos, entregas) y recien despues
  // se cierra: hay que juntar los datos frescos aca mismo, antes de
  // liquidar, porque liquidar archiva y resetea la caja del repartidor.
  // Si la impresora falla o no contesta (QZ Tray cerrado, sin red, etc.)
  // no se bloquea la liquidacion -- un problema de impresora no tiene por
  // que trabar el cierre del turno, asi que se le pone un limite de
  // espera en vez de esperar lo que tarde qz-tray en darse por vencido.
  async function handleConfirmSettlement() {
    if (!courierPendingSettlement) return;
    const courier = courierPendingSettlement;
    setTogglingCourierId(courier.id);
    try {
      const [summary, ordersResult] = await Promise.all([
        getCourierCashSummary(courier.id),
        listCurrentPeriodOrders(courier.id)
      ]);
      try {
        await Promise.race([
          printCourierSummaryTicket(courier, summary, ordersResult.items),
          new Promise((_resolve, reject) => {
            window.setTimeout(() => reject(new Error("La impresora no respondio a tiempo.")), 8000);
          })
        ]);
      } catch (printError) {
        toast.error(
          printError instanceof Error ? `No se pudo imprimir el resumen: ${printError.message}` : "No se pudo imprimir el resumen."
        );
      }

      await onSettleCourier(courier.id);
      toast.success(`${courier.name}: turno liquidado.`);
      setCourierPendingSettlement(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo liquidar.");
    } finally {
      setTogglingCourierId(null);
    }
  }

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
            <article
              key={courier.id}
              className={`joker-delivery-card${expanded ? " joker-delivery-card--expanded" : ""}${courier.isCounter ? " joker-delivery-card--counter" : ""}`}
            >
              <div
                role="button"
                tabIndex={0}
                className="joker-delivery-card__header"
                onClick={() => setExpandedCourierId(expanded ? null : courier.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedCourierId(expanded ? null : courier.id);
                  }
                }}
              >
                <span className="joker-delivery-card__icon">{courier.isCounter ? "🏪" : "🛵"}</span>

                <span className="joker-delivery-card__name-group">
                  <strong className="joker-delivery-card__name">{courier.name}</strong>
                  <span className={`joker-delivery-status-badge${courier.status === "activo" ? " joker-delivery-status-badge--active" : ""}`}>
                    {courier.status === "activo" ? "Habilitado" : "Inactivo"}
                  </span>
                </span>

                <span className="joker-delivery-card__actions">
                  <button
                    type="button"
                    className={`joker-button joker-button--auto ${courier.status === "activo" ? "joker-button--danger" : "joker-button--primary"}`}
                    disabled={togglingCourierId === courier.id}
                    onClick={(event) => void handleToggleStatus(courier, event)}
                  >
                    {togglingCourierId === courier.id ? "..." : courier.status === "activo" ? "Liquidar" : "Habilitar"}
                  </button>
                  <span className={`joker-delivery-card__chevron${expanded ? " joker-delivery-card__chevron--open" : ""}`}>›</span>
                </span>
              </div>

              {expanded ? (
                <div className="joker-delivery-edit-name-row">
                  {isEditingName ? (
                    <>
                      <input
                        autoFocus
                        className="joker-delivery-card__name-input"
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleSaveName(courier.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="joker-button joker-button--ghost joker-button--auto joker-button--small"
                        disabled={isSavingName}
                        onClick={() => setEditingCourierId(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="joker-button joker-button--primary joker-button--auto joker-button--small"
                        disabled={isSavingName}
                        onClick={() => void handleSaveName(courier.id)}
                      >
                        {isSavingName ? "..." : "Guardar"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="joker-delivery-edit-name-link"
                      onClick={(event) => handleStartEdit(courier, event)}
                    >
                      Editar nombre
                    </button>
                  )}
                </div>
              ) : null}

              {expanded ? <CourierSettlement courier={courier} /> : null}
            </article>
          );
        })}
      </div>

      {courierPendingSettlement ? (
        <ConfirmDeleteModal
          title={courierPendingSettlement.isCounter ? "Liquidar Mostrador" : "Liquidar repartidor"}
          message={`Se va a imprimir el resumen del turno de ${courierPendingSettlement.name} y su caja queda archivada, arrancando de nuevo en 0 la proxima vez que lo habilites. Seguro?`}
          confirmLabel="Liquidar"
          confirmLabelBusy="Liquidando..."
          variant="danger"
          isDeleting={togglingCourierId === courierPendingSettlement.id}
          onCancel={() => setCourierPendingSettlement(null)}
          onConfirm={() => void handleConfirmSettlement()}
        />
      ) : null}
    </section>
  );
}
