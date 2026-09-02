import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CloseRegisterModal } from "../components/CloseRegisterModal";
import { OpenUserRegisterModal } from "../components/OpenUserRegisterModal";
import { closeUserRegister, getUserRegisterState, listCurrentPeriodOrdersForUser, openUserRegister } from "../joker.api";
import { printUserRegisterCloseTicket } from "../services/joker.print";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderRecord, JokerUserRegisterState } from "../joker.types";
import {
  MEDALS,
  MEDAL_CLASSES,
  MOVEMENTS_PREVIEW_COUNT,
  PAYMENT_METHODS,
  buildPaymentTotals,
  buildRanking,
  formatDateTime,
  formatPrice,
  getStoredProfitRatePercent
} from "./panelHelpers";

// Version del Panel para el rol Usuario: mismo resumen del turno (vendido,
// ganancia, tipos de pago, movimientos, ranking) que el del Administrador,
// pero puramente informativa -- sin poder asignar repartidor/mostrador,
// editar el metodo de pago ni borrar pedidos. Ademas maneja su propia caja
// (saas_joker_user_register_state), separada de la caja global del
// Administrador, con un monto inicial que el Panel del Administrador no
// tiene.
export function UserPanelScreen() {
  const [orders, setOrders] = useState<JokerOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [profitRatePercent] = useState(getStoredProfitRatePercent);
  const [registerState, setRegisterState] = useState<JokerUserRegisterState | null>(null);
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [isSubmittingOpen, setIsSubmittingOpen] = useState(false);
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);
  const [isClosingRegister, setIsClosingRegister] = useState(false);

  // Igual que el Panel del Administrador: refresco silencioso cada 5s
  // para reflejar pedidos aceptados (y designaciones de mostrador/
  // delivery) desde otra pantalla sin recargar.
  useEffect(() => {
    void loadOrders();
    void loadRegisterState();

    const intervalId = window.setInterval(() => {
      void loadOrders(true);
      void loadRegisterState();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, []);

  async function loadRegisterState() {
    try {
      const state = await getUserRegisterState();
      setRegisterState(state);
    } catch {
      // Si falla, el boton queda con la etiqueta por defecto; se puede
      // reintentar tocandolo de nuevo.
    }
  }

  async function loadOrders(silent = false) {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const result = await listCurrentPeriodOrdersForUser();
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

  async function handleOpenRegister(initialCash: number) {
    setIsSubmittingOpen(true);
    try {
      const state = await openUserRegister(initialCash);
      setRegisterState(state);
      await loadOrders();
      setIsOpeningModalOpen(false);
      toast.success("Caja abierta.");
    } finally {
      setIsSubmittingOpen(false);
    }
  }

  // shouldPrint = false: cierra sin sacar el ticket -- antes se imprimia
  // siempre, sin poder evitarlo. Igual que el cierre del Administrador:
  // cuando se imprime, es primero, y recien despues se avisa al backend,
  // para no perder el ticket si el cierre en si falla por algun motivo.
  async function handleConfirmClose(shouldPrint: boolean) {
    setIsClosingRegister(true);
    try {
      if (shouldPrint) {
        await printUserRegisterCloseTicket({ paymentTotals, totalVendido, ganancia, ranking, initialCash: registerState?.initialCash ?? 0 });
      }
      const state = await closeUserRegister({ totalVendido, ganancia, paymentTotals, ranking });
      setRegisterState(state);
      await loadOrders();
      toast.success("Caja cerrada.");
      setIsConfirmingClose(false);
    } catch (closeError) {
      toast.error(closeError instanceof Error ? closeError.message : "No se pudo cerrar la caja.");
    } finally {
      setIsClosingRegister(false);
    }
  }

  const totalVendido = orders.reduce((sum, order) => sum + order.total, 0);
  const ganancia = totalVendido * (profitRatePercent / 100);
  const ranking = buildRanking(orders);
  const paymentTotals = buildPaymentTotals(orders);
  const visibleOrders = showAllMovements ? orders : orders.slice(0, MOVEMENTS_PREVIEW_COUNT);
  const hasHiddenMovements = orders.length > MOVEMENTS_PREVIEW_COUNT;
  const isRegisterOpen = registerState?.isOpen === true;
  // Lo que deberia haber en el cajon fisico ahora mismo: monto inicial +
  // lo vendido en efectivo (tarjeta/transferencia/cuenta no pasan por el
  // cajon). Mismo calculo que "Total en caja" en el ticket de cierre.
  const cajaActual = (registerState?.initialCash ?? 0) + paymentTotals.efectivo;

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
            <p className="joker-eyebrow">Mi caja</p>
            <h2>Resumen del turno</h2>
          </div>
          <div className="joker-panel__heading-actions">
            <button
              type="button"
              className={`joker-button joker-button--auto ${isRegisterOpen ? "joker-button--ghost" : "joker-button--primary"}`}
              onClick={() => (isRegisterOpen ? setIsConfirmingClose(true) : setIsOpeningModalOpen(true))}
            >
              {isRegisterOpen ? "Cerrar caja" : "Abrir caja"}
            </button>
          </div>
        </div>

        {!isRegisterOpen ? (
          <p className="joker-empty-state">Tu caja esta cerrada. Abrila con el monto inicial para empezar a vender.</p>
        ) : (
          <div className="joker-stat-grid">
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Monto inicial</span>
              <strong className="joker-stat-tile__value">{formatPrice(registerState?.initialCash ?? 0)}</strong>
            </div>
            <div className="joker-stat-tile">
              <span className="joker-stat-tile__label">Caja actual</span>
              <strong className="joker-stat-tile__value">{formatPrice(cajaActual)}</strong>
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

      {isRegisterOpen ? (
        <>
          <section className="joker-panel">
            <div className="joker-panel__heading">
              <p className="joker-eyebrow">Mi caja</p>
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
                            {order.customerName?.trim() || order.address?.trim() ? (
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
              <p className="joker-empty-state">Todavia no hiciste ventas en este turno.</p>
            )}
          </section>

          <section className="joker-panel">
            <div className="joker-panel__heading">
              <p className="joker-eyebrow">Mi caja</p>
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

      {isOpeningModalOpen ? (
        <OpenUserRegisterModal
          isSubmitting={isSubmittingOpen}
          onClose={() => setIsOpeningModalOpen(false)}
          onConfirm={handleOpenRegister}
        />
      ) : null}

      {isConfirmingClose ? (
        <CloseRegisterModal
          message="No se va a poder seguir sumando ventas hasta que la abras de nuevo. Elegi si queres sacar el ticket con el resumen del turno o no."
          isSubmitting={isClosingRegister}
          onCancel={() => setIsConfirmingClose(false)}
          onConfirm={handleConfirmClose}
        />
      ) : null}
    </>
  );
}
