import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { ProfitRateModal } from "../components/ProfitRateModal";
import { closeRegister, getRegisterState, listOrders, openRegister } from "../joker.api";
import { printCashRegisterCloseTicket } from "../services/joker.print";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderRecord, JokerPaymentMethod, JokerRegisterState } from "../joker.types";

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

function formatDateTime(isoDate: string) {
  const date = new Date(isoDate);
  const dateLabel = date.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

// El "dia" del panel arranca a las 5am hora local (no a medianoche), para
// que quede sincronizado con el corte que usa el backend al filtrar pedidos.
const STORE_DAY_START_HOUR = 5;

function getTodayLabel() {
  const shifted = new Date(Date.now() - STORE_DAY_START_HOUR * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(shifted);
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

export function PanelScreen() {
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

  function handleSaveProfitRate(percent: number) {
    setProfitRatePercent(percent);
    window.localStorage.setItem(PROFIT_RATE_STORAGE_KEY, String(percent));
  }

  useEffect(() => {
    void loadOrders();
    void loadRegisterState();
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
      toast.success("Caja abierta.");
      setConfirmRegisterAction(null);
    } catch (openError) {
      toast.error(openError instanceof Error ? openError.message : "No se pudo abrir la caja.");
    } finally {
      setIsClosingRegister(false);
    }
  }

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
        <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={loadOrders}>
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
                  className="joker-order-item joker-order-item--flat joker-order-item--clickable"
                  onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                >
                  <strong>Pedido #{order.displayNumber}</strong>
                  <strong className="joker-amount-plus">+{formatPrice(order.total)}</strong>
                </button>

                {expandedOrderId === order.id ? (
                  <ul className="joker-order-detail-list">
                    <li className="joker-order-detail-list__meta">
                      <span className="joker-order-item__excluded">
                        {formatDateTime(order.createdAt)} · {JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
                      </span>
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
