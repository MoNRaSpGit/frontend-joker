import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { EditOrderModal } from "../components/EditOrderModal";
import { PaymentBreakdownModal } from "../components/PaymentBreakdownModal";
import { ProfitRateModal } from "../components/ProfitRateModal";
import { closeRegister, getRegisterState, listCurrentPeriodOrders, openRegister, updateOrder } from "../joker.api";
import { printCashRegisterCloseTicket } from "../services/joker.print";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerCourier, JokerOrderRecord, JokerPaymentMethod, JokerProduct, JokerRegisterState } from "../joker.types";

const PROFIT_RATE_STORAGE_KEY = "joker.profitRatePercent";
const DEFAULT_PROFIT_RATE_PERCENT = 30;
const PAYMENT_METHODS: JokerPaymentMethod[] = ["efectivo", "tarjeta", "transferencia", "cuenta"];
const MOVEMENTS_PREVIEW_COUNT = 3;

function getStoredProfitRatePercent() {
  if (typeof window === "undefined") return DEFAULT_PROFIT_RATE_PERCENT;
  const raw = window.localStorage.getItem(PROFIT_RATE_STORAGE_KEY);
  if (raw === null) return DEFAULT_PROFIT_RATE_PERCENT;
  const stored = Number(raw);
  return Number.isFinite(stored) && stored >= 0 ? stored : DEFAULT_PROFIT_RATE_PERCENT;
}

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

// Si el pedido tiene una fecha editada a mano (orderDate), esa es la que se
// muestra; la hora siempre sale de created_at (no se edita).
function formatDateTime(isoDate: string, orderDate?: string | null) {
  const date = new Date(isoDate);
  const dateSource = orderDate ? new Date(`${orderDate}T00:00:00`) : date;
  const dateLabel = dateSource.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

function buildPaymentTotals(orders: JokerOrderRecord[]) {
  const totals: Record<JokerPaymentMethod, number> = { efectivo: 0, tarjeta: 0, transferencia: 0, cuenta: 0 };

  for (const order of orders) {
    totals[order.paymentMethod] += order.total;
  }

  return totals;
}

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_CLASSES = ["joker-qty-badge--gold", "joker-qty-badge--silver", "joker-qty-badge--bronze"];

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

type PanelScreenProps = {
  products: JokerProduct[];
  couriers: JokerCourier[];
  onAccountEntryRegistered: () => void;
};

export function PanelScreen({ products, couriers, onAccountEntryRegistered }: PanelScreenProps) {
  const [orders, setOrders] = useState<JokerOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [isClosingRegister, setIsClosingRegister] = useState(false);
  const [profitRatePercent, setProfitRatePercent] = useState(getStoredProfitRatePercent);
  const [isEditingProfitRate, setIsEditingProfitRate] = useState(false);
  const [registerState, setRegisterState] = useState<JokerRegisterState | null>(null);
  const [confirmRegisterAction, setConfirmRegisterAction] = useState<"close" | "open" | null>(null);
  const [editingOrder, setEditingOrder] = useState<JokerOrderRecord | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [breakdownMethod, setBreakdownMethod] = useState<JokerPaymentMethod | null>(null);
  const [assigningCourierOrderId, setAssigningCourierOrderId] = useState<number | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [isSavingCourier, setIsSavingCourier] = useState(false);

  function handleSaveProfitRate(percent: number) {
    setProfitRatePercent(percent);
    window.localStorage.setItem(PROFIT_RATE_STORAGE_KEY, String(percent));
  }

  // Se refresca solo cada 15s (en silencio, sin tapar la pantalla con el
  // spinner) para que si otro dispositivo carga un pedido o cierra/abre la
  // caja, se vea reflejado aca sin tener que salir y volver a entrar a la
  // pestana.
  useEffect(() => {
    void loadOrders();
    void loadRegisterState();

    const intervalId = window.setInterval(() => {
      void loadOrders(true);
      void loadRegisterState();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function loadRegisterState() {
    try {
      const state = await getRegisterState();
      setRegisterState(state);
    } catch {
      // Si falla, el boton queda con la etiqueta por defecto (Cerrar caja);
      // el operario puede reintentar tocandolo de nuevo.
    }
  }

  // Cerrar imprime el resumen y marca la caja como cerrada de verdad (el
  // proximo pedido vuelve a arrancar la numeracion en 1). Abrir solo
  // levanta el bloqueo, sin imprimir nada.
  async function handleConfirmRegisterAction() {
    if (confirmRegisterAction === "close") {
      setIsClosingRegister(true);
      try {
        await printCashRegisterCloseTicket({ paymentTotals, totalVendido, ganancia, ranking });
        const state = await closeRegister({ totalVendido, ganancia, paymentTotals, ranking });
        setRegisterState(state);
        await loadOrders();
        toast.success("Caja cerrada.");
        setConfirmRegisterAction(null);
      } catch (closeError) {
        toast.error(closeError instanceof Error ? closeError.message : "No se pudo cerrar la caja.");
      } finally {
        setIsClosingRegister(false);
      }
      return;
    }

    setIsClosingRegister(true);
    try {
      const state = await openRegister();
      setRegisterState(state);
      await loadOrders();
      toast.success("Caja abierta.");
      setConfirmRegisterAction(null);
    } catch (openError) {
      toast.error(openError instanceof Error ? openError.message : "No se pudo abrir la caja.");
    } finally {
      setIsClosingRegister(false);
    }
  }

  async function handleSaveOrderEdit(items: JokerOrderRecord["items"], orderDate: string) {
    if (!editingOrder) return;

    setIsSavingOrder(true);
    try {
      await updateOrder(editingOrder.id, items, orderDate);
      toast.success(items.length ? "Pedido actualizado." : "Pedido cancelado.");
      setEditingOrder(null);
      await loadOrders();
      // Si el pedido era "a cuenta", el backend ya resincronizo el
      // movimiento de cuenta corriente; esto solo refresca la pantalla de
      // Cuenta corriente (que tiene su propio estado) para que se vea.
      onAccountEntryRegistered();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el pedido.");
    } finally {
      setIsSavingOrder(false);
    }
  }

  // Asigna (o cambia) el repartidor de un pedido ya cargado. Se manda el
  // mismo array de items sin tocar, el backend solo recalcula el total con
  // lo que ya tenia (no cambia nada del pedido salvo el repartidor).
  async function handleSaveCourierAssignment(order: JokerOrderRecord) {
    if (!selectedCourierId) {
      toast.error("Elegi un repartidor.");
      return;
    }

    setIsSavingCourier(true);
    try {
      const response = await updateOrder(order.id, order.items, order.orderDate ?? undefined, Number(selectedCourierId));
      setOrders((current) => current.map((item) => (item.id === order.id ? response.item : item)));
      setAssigningCourierOrderId(null);
      setSelectedCourierId("");
      toast.success("Delivery asignado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo asignar el delivery.");
    } finally {
      setIsSavingCourier(false);
    }
  }

  // silent = true en las actualizaciones automaticas de fondo: no muestra
  // el spinner de pantalla completa ni un cartel de error por un problema
  // de red pasajero, solo actualiza los datos si la llamada sale bien.
  async function loadOrders(silent = false) {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const result = await listCurrentPeriodOrders();
      setOrders(result.items);
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
        <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={() => loadOrders()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <section className="joker-panel">
        <div className="joker-panel__heading joker-panel__heading--row">
          <div>
            <p className="joker-eyebrow">Hoy</p>
            <h2>Resumen del dia</h2>
          </div>
          <div className="joker-panel__heading-actions">
            <button
              type="button"
              className={`joker-button joker-button--auto ${registerState?.isOpen === false ? "joker-button--primary" : "joker-button--ghost"}`}
              onClick={() => setConfirmRegisterAction(registerState?.isOpen === false ? "open" : "close")}
              disabled={isClosingRegister}
            >
              {registerState?.isOpen === false ? "Abrir caja" : "Cerrar caja"}
            </button>
          </div>
        </div>

        <div className="joker-stat-grid">
          <div className="joker-stat-tile">
            <span className="joker-stat-tile__label">Vendido</span>
            <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(totalVendido)}</strong>
          </div>
          <button
            type="button"
            className="joker-stat-tile joker-stat-tile--clickable"
            onClick={() => setIsEditingProfitRate(true)}
          >
            <span className="joker-stat-tile__label">Ganancia ({profitRatePercent}%)</span>
            <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(ganancia)}</strong>
          </button>
          <div className="joker-stat-tile">
            <span className="joker-stat-tile__label">Pedidos</span>
            <strong className="joker-stat-tile__value">{orders.length}</strong>
          </div>
        </div>
      </section>

      <section className="joker-panel">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Hoy</p>
          <h2>Tipo de pagos</h2>
        </div>

        <div className="joker-stat-grid">
          {PAYMENT_METHODS.map((method) => {
            const isTrackable = method === "cuenta" || method === "transferencia";
            const content = (
              <>
                <span className="joker-stat-tile__label">{JOKER_PAYMENT_METHOD_LABELS[method]}</span>
                <strong className="joker-stat-tile__value joker-amount-plus">+{formatPrice(paymentTotals[method])}</strong>
              </>
            );

            return isTrackable ? (
              <button
                key={method}
                type="button"
                className={`joker-stat-tile joker-stat-tile--${method} joker-stat-tile--clickable`}
                onClick={() => setBreakdownMethod(method)}
              >
                {content}
              </button>
            ) : (
              <div key={method} className={`joker-stat-tile joker-stat-tile--${method}`}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="joker-panel">
        <div className="joker-panel__heading joker-panel__heading--row">
          <p className="joker-eyebrow">Movimientos</p>
          {hasHiddenMovements ? (
            <button
              type="button"
              className="joker-mini-button"
              onClick={() => setShowAllMovements((current) => !current)}
            >
              {showAllMovements ? "Ver menos" : "Ver todos"}
            </button>
          ) : null}
        </div>

        {orders.length ? (
          <ul className="joker-order-list">
            {visibleOrders.map((order) => (
              <li key={order.id} className="joker-order-item joker-order-item--stacked">
                <button
                  type="button"
                  className={`joker-order-item joker-order-item--flat joker-order-item--clickable${!order.items.length ? " joker-order-item--cancelled" : ""}`}
                  onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                  onDoubleClick={() => setEditingOrder(order)}
                  title="Doble click para editar el pedido"
                >
                  <strong>
                    Pedido #{order.displayNumber}
                    {!order.items.length ? <span className="joker-cancelled-badge">Eliminado</span> : null}
                  </strong>
                  <strong className="joker-amount-plus">+{formatPrice(order.total)}</strong>
                </button>

                {expandedOrderId === order.id ? (
                  <ul className="joker-order-detail-list">
                    <li className="joker-order-detail-list__meta">
                      <span className="joker-order-item__excluded">
                        {formatDateTime(order.createdAt, order.orderDate)} · {JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
                      </span>
                    </li>
                    <li className="joker-order-detail-list__meta">
                      {assigningCourierOrderId === order.id ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <select value={selectedCourierId} onChange={(event) => setSelectedCourierId(event.target.value)}>
                            <option value="">Elegir repartidor</option>
                            {couriers.map((courier) => (
                              <option key={courier.id} value={courier.id}>
                                {courier.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="joker-button joker-button--ghost joker-button--auto"
                            disabled={isSavingCourier}
                            onClick={() => {
                              setAssigningCourierOrderId(null);
                              setSelectedCourierId("");
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className="joker-button joker-button--primary joker-button--auto"
                            disabled={isSavingCourier}
                            onClick={() => void handleSaveCourierAssignment(order)}
                          >
                            {isSavingCourier ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      ) : order.courierId ? (
                        <span className="joker-order-item__excluded">
                          🛵 {couriers.find((courier) => courier.id === order.courierId)?.name ?? "Repartidor"}{" "}
                          <button
                            type="button"
                            className="joker-mini-button"
                            onClick={() => {
                              setAssigningCourierOrderId(order.id);
                              setSelectedCourierId(String(order.courierId));
                            }}
                          >
                            Cambiar
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="joker-button joker-button--ghost joker-button--auto"
                          onClick={() => {
                            setAssigningCourierOrderId(order.id);
                            setSelectedCourierId("");
                          }}
                        >
                          Asignar delivery
                        </button>
                      )}
                    </li>
                    {order.items.length ? (
                      order.items.map((item, index) => (
                        <li key={`${order.id}-${index}`}>
                          <span className="joker-qty-badge">{item.quantity}</span>
                          <div>
                            <strong>{item.productName}</strong>
                            {item.detail ? <p className="joker-order-item__excluded">{item.detail}</p> : null}
                          </div>
                        </li>
                      ))
                    ) : (
                      <li>
                        <p className="joker-order-item__excluded">Pedido eliminado, sin efecto. No suma nada.</p>
                      </li>
                    )}
                    <li>
                      <button
                        type="button"
                        className="joker-button joker-button--ghost joker-button--auto"
                        onClick={() => setEditingOrder(order)}
                      >
                        Editar pedido
                      </button>
                    </li>
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state">Todavia no hay pedidos impresos hoy.</p>
        )}
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
                  <span className={`joker-qty-badge ${MEDAL_CLASSES[index] ?? ""}`}>
                    {MEDALS[index] ?? `#${index + 1}`}
                  </span>
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

      {breakdownMethod ? (
        <PaymentBreakdownModal method={breakdownMethod} orders={orders} onClose={() => setBreakdownMethod(null)} />
      ) : null}

      {editingOrder ? (
        <EditOrderModal
          order={editingOrder}
          products={products}
          isSaving={isSavingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveOrderEdit}
        />
      ) : null}

      {isEditingProfitRate ? (
        <ProfitRateModal
          currentPercent={profitRatePercent}
          onClose={() => setIsEditingProfitRate(false)}
          onSave={handleSaveProfitRate}
        />
      ) : null}

      {confirmRegisterAction ? (
        <ConfirmDeleteModal
          title={confirmRegisterAction === "close" ? "Cerrar caja" : "Abrir caja"}
          message={
            confirmRegisterAction === "close"
              ? "Seguro que queres cerrar caja? Se va a imprimir el resumen y no se van a poder cargar mas pedidos hasta que la abras de nuevo."
              : "Seguro que queres abrir la caja?"
          }
          confirmLabel={confirmRegisterAction === "close" ? "Cerrar caja" : "Abrir caja"}
          confirmLabelBusy={confirmRegisterAction === "close" ? "Cerrando..." : "Abriendo..."}
          variant="primary"
          isDeleting={isClosingRegister}
          onCancel={() => setConfirmRegisterAction(null)}
          onConfirm={handleConfirmRegisterAction}
        />
      ) : null}
    </>
  );
}
