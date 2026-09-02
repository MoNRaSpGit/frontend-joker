import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CloseRegisterModal } from "../components/CloseRegisterModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { EditOrderModal } from "../components/EditOrderModal";
import { PaymentBreakdownModal } from "../components/PaymentBreakdownModal";
import { ProfitRateModal } from "../components/ProfitRateModal";
import { SelectClientModal } from "../components/SelectClientModal";
import { closeRegister, getRegisterState, listCurrentPeriodOrders, openRegister, updateOrder } from "../joker.api";
import { printCashRegisterCloseTicket } from "../services/joker.print";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerClient, JokerCourier, JokerOrderRecord, JokerPaymentMethod, JokerProduct, JokerRegisterState } from "../joker.types";
import {
  MEDALS,
  MEDAL_CLASSES,
  MOVEMENTS_PREVIEW_COUNT,
  PAYMENT_METHODS,
  PROFIT_RATE_STORAGE_KEY,
  buildPaymentTotals,
  buildRanking,
  formatDateTime,
  formatPrice,
  getStoredProfitRatePercent
} from "./panelHelpers";

// Las 3 primeras se corrigen con un click directo. "Cuenta" tambien se
// puede elegir aca, pero abre el modal de elegir cliente en vez de
// guardar directo (ver handleSelectCuenta/handleConfirmCuenta) -- pasar a
// cuenta corriente sin elegir a quien no tiene sentido.
const EDITABLE_PAYMENT_METHODS: JokerPaymentMethod[] = ["efectivo", "tarjeta", "transferencia", "cuenta"];

// Un pedido es "de mostrador" (chip 🏪, y lo que hace que aparezca tambien
// en el Panel del rol Usuario) por dos caminos, sin importar quien lo haya
// cargado -- ver JokerOrdersService#listCurrentPeriodOrdersForUser en el
// backend, que usa exactamente el mismo criterio:
// 1) Nacio del lado Usuario (origin_role = 'usuario') y ya fue aceptado.
// 2) Lo cargo el Administrador y lo marco "Mostrador" a mano (nombre con
//    "MOSTRADOR", ver handleAssignCounter).
// En los dos casos, si tiene un repartidor asignado deja de contar como
// mostrador -- por eso el chequeo de courierId manda por encima de todo.
function isCounterOrder(order: JokerOrderRecord) {
  if (order.courierId) return false;
  return order.originRole === "usuario" || Boolean(order.customerName?.trim().toUpperCase().includes("MOSTRADOR"));
}

type PanelScreenProps = {
  products: JokerProduct[];
  couriers: JokerCourier[];
  clients: JokerClient[];
  onAccountEntryRegistered: () => void;
  onGoToDelivery: () => void;
};

export function PanelScreen({ products, couriers, clients, onAccountEntryRegistered, onGoToDelivery }: PanelScreenProps) {
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
  const [isSavingCourier, setIsSavingCourier] = useState(false);
  const [blockedCloseCourierNames, setBlockedCloseCourierNames] = useState<string[] | null>(null);
  const [editingPaymentOrderId, setEditingPaymentOrderId] = useState<number | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [cuentaPickerOrder, setCuentaPickerOrder] = useState<JokerOrderRecord | null>(null);
  const [pendingDeleteOrder, setPendingDeleteOrder] = useState<JokerOrderRecord | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  function handleSaveProfitRate(percent: number) {
    setProfitRatePercent(percent);
    window.localStorage.setItem(PROFIT_RATE_STORAGE_KEY, String(percent));
  }

  // Se refresca solo cada 5s (en silencio, sin tapar la pantalla con el
  // spinner) para que si otro dispositivo carga un pedido, cierra/abre la
  // caja, o designa un pedido como mostrador/delivery, se vea reflejado
  // aca casi al toque, sin tener que salir y volver a entrar a la pestana.
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
      const state = await getRegisterState();
      setRegisterState(state);
    } catch {
      // Si falla, el boton queda con la etiqueta por defecto (Cerrar caja);
      // el operario puede reintentar tocandolo de nuevo.
    }
  }

  // Antes de siquiera preguntar si imprimir o no, se chequea el bloqueo de
  // repartidores -- no tiene sentido ofrecer "cerrar caja" si total va a
  // terminar bloqueado.
  function handleRequestCloseRegister() {
    const activeCouriers = couriers.filter((courier) => courier.status === "activo");
    if (activeCouriers.length) {
      setBlockedCloseCourierNames(activeCouriers.map((courier) => courier.name));
      return;
    }

    setConfirmRegisterAction("close");
  }

  // shouldPrint = false: cierra la caja y marca de nuevo la numeracion de
  // pedidos, pero sin sacar el ticket de resumen -- antes se imprimia
  // siempre, sin poder evitarlo.
  async function handleConfirmCloseRegister(shouldPrint: boolean) {
    setIsClosingRegister(true);
    try {
      if (shouldPrint) {
        await printCashRegisterCloseTicket({ paymentTotals, totalVendido, ganancia, ranking });
      }
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
  }

  async function handleConfirmOpenRegister() {
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

  // Asigna (o cambia) el repartidor de un pedido ya cargado con un solo
  // click sobre el globito del repartidor -- sin paso intermedio de
  // "Guardar". Se manda el mismo array de items sin tocar, el backend
  // solo recalcula el total con lo que ya tenia (no cambia nada del
  // pedido salvo el repartidor).
  async function handleAssignCourier(order: JokerOrderRecord, courierId: number) {
    // Si el pedido venia marcado "Mostrador" (nombre con el sufijo), le
    // sacamos esa marca -- ya no hace falta para que deje de contar como
    // mostrador (courierId manda por encima de todo, ver isCounterOrder),
    // pero si la dejamos puesta el nombre queda con un "MOSTRADOR" colgado
    // que no tiene sentido en un pedido con delivery asignado.
    const trimmedName = order.customerName?.trim() || "";
    const nextCustomerName = trimmedName.replace(/\s*MOSTRADOR\s*$/i, "").trim();

    setIsSavingCourier(true);
    try {
      const response = await updateOrder(
        order.id,
        order.items,
        order.orderDate ?? undefined,
        courierId,
        undefined,
        undefined,
        undefined,
        nextCustomerName
      );
      setOrders((current) => current.map((item) => (item.id === order.id ? response.item : item)));
      setAssigningCourierOrderId(null);
      toast.success("Delivery asignado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo asignar el delivery.");
    } finally {
      setIsSavingCourier(false);
    }
  }

  // Marca un pedido como "Mostrador" (se retira en el local, no sale a
  // reparto) en vez de asignarle un repartidor. Reusa el mismo mecanismo
  // que ya usan los pedidos de mostrador del rol Usuario (nombre marcado
  // "... MOSTRADOR", ver OrdersScreen#submitPendingOrder): asi el ticket, el
  // chip 🏪 y el resto de la app lo reconocen igual sin tener que agregar un
  // campo nuevo. Si el pedido ya tenia un repartidor asignado (se esta
  // pasando de delivery a mostrador), hay que sacarselo -- si no, el chip
  // 🛵 sigue ganando (ver isCounterOrder) y queda como si no hubiera
  // cambiado nada.
  async function handleAssignCounter(order: JokerOrderRecord) {
    const trimmedName = order.customerName?.trim() || "";
    if (isCounterOrder(order)) {
      setAssigningCourierOrderId(null);
      return;
    }

    // Si ya es "mostrador" por venir del rol Usuario, no hace falta
    // pisarle el nombre con el sufijo -- ya cuenta igual (ver
    // isCounterOrder). El sufijo solo hace falta para que un pedido del
    // Administrador quede marcado.
    const nextCustomerName =
      order.originRole === "usuario" ? order.customerName ?? undefined : trimmedName.toUpperCase().includes("MOSTRADOR") ? trimmedName : trimmedName ? `${trimmedName} MOSTRADOR` : "MOSTRADOR";

    setIsSavingCourier(true);
    try {
      const response = await updateOrder(
        order.id,
        order.items,
        order.orderDate ?? undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        nextCustomerName,
        true
      );
      setOrders((current) => current.map((item) => (item.id === order.id ? response.item : item)));
      setAssigningCourierOrderId(null);
      toast.success("Pedido marcado como mostrador.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo marcar como mostrador.");
    } finally {
      setIsSavingCourier(false);
    }
  }

  // Corrige el metodo de pago de un pedido ya cargado con un click sobre
  // el globito (ej: se caragó "efectivo" pero era "transferencia"). Si el
  // pedido era "a cuenta", el backend borra el movimiento de cuenta
  // corriente asociado -- por eso se refresca esa pantalla igual que al
  // editar el pedido completo.
  async function handleChangePaymentMethod(order: JokerOrderRecord, paymentMethod: "efectivo" | "tarjeta" | "transferencia") {
    setIsSavingPayment(true);
    try {
      const response = await updateOrder(order.id, order.items, order.orderDate ?? undefined, undefined, undefined, paymentMethod);
      setOrders((current) => current.map((item) => (item.id === order.id ? response.item : item)));
      setEditingPaymentOrderId(null);
      toast.success("Metodo de pago actualizado.");
      if (order.paymentMethod === "cuenta") {
        onAccountEntryRegistered();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el metodo de pago.");
    } finally {
      setIsSavingPayment(false);
    }
  }

  // Pasar un pedido a "cuenta" es mas delicado (crea un movimiento de
  // cuenta corriente de verdad), asi que en vez de guardar directo como
  // los otros metodos, primero abre el modal a elegir el cliente.
  async function handleConfirmCuenta(clientId: number) {
    if (!cuentaPickerOrder) return;
    setIsSavingPayment(true);
    try {
      const response = await updateOrder(
        cuentaPickerOrder.id,
        cuentaPickerOrder.items,
        cuentaPickerOrder.orderDate ?? undefined,
        undefined,
        undefined,
        "cuenta",
        clientId
      );
      setOrders((current) => current.map((item) => (item.id === cuentaPickerOrder.id ? response.item : item)));
      setEditingPaymentOrderId(null);
      setCuentaPickerOrder(null);
      toast.success("Metodo de pago actualizado.");
      onAccountEntryRegistered();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo pasar el pedido a cuenta corriente.");
    } finally {
      setIsSavingPayment(false);
    }
  }

  // Elimina el pedido directo desde el panel (sin pasar por Editar pedido
  // sacando linea por linea): mismo mecanismo que "cancelar" con el
  // pedido vacio -- queda marcado "Eliminado", el stock descontado se
  // devuelve y, si era "a cuenta", el movimiento se borra.
  async function handleConfirmDeleteOrder() {
    if (!pendingDeleteOrder) return;
    setIsDeletingOrder(true);
    try {
      await updateOrder(pendingDeleteOrder.id, [], pendingDeleteOrder.orderDate ?? undefined);
      toast.success("Pedido eliminado.");
      setPendingDeleteOrder(null);
      await loadOrders();
      onAccountEntryRegistered();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el pedido.");
    } finally {
      setIsDeletingOrder(false);
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

  // "Movimientos" muestra TODOS los pedidos del periodo (los propios y los
  // que vinieron del Usuario, para poder verlos y designarles delivery/
  // mostrador) -- pero el resumen (vendido, ganancia, tipo de pagos,
  // ranking, cantidad de pedidos) es la caja del Administrador nomas.
  //
  // Ojo: NO es lo mismo que originRole === "administrador". Un pedido
  // "de mostrador" (isCounterOrder) ya suma en la caja del Usuario (ver
  // UserPanelScreen + listCurrentPeriodOrdersForUser en el backend),
  // sumarlo tambien aca lo contaria dos veces -- pero si ese mismo pedido
  // despues se reasigna a un repartidor (deja de ser mostrador, sin
  // importar de donde nacio originalmente), pasa a ser pura y
  // exclusivamente del Administrador y tiene que empezar a sumar aca. Por
  // eso el filtro correcto es "lo opuesto de mostrador ahora mismo", no
  // "de donde nacio".
  const adminOrders = orders.filter((order) => !isCounterOrder(order));
  const totalVendido = adminOrders.reduce((sum, order) => sum + order.total, 0);
  const ganancia = totalVendido * (profitRatePercent / 100);
  const ranking = buildRanking(adminOrders);
  const paymentTotals = buildPaymentTotals(adminOrders);
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
              onClick={() =>
                registerState?.isOpen === false ? setConfirmRegisterAction("open") : handleRequestCloseRegister()
              }
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
            <strong className="joker-stat-tile__value">{adminOrders.length}</strong>
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
                <div
                  role="button"
                  tabIndex={0}
                  className={`joker-order-item joker-order-item--flat joker-order-item--clickable joker-order-item--with-delete${!order.items.length ? " joker-order-item--cancelled" : ""}`}
                  onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                  onDoubleClick={() => setEditingOrder(order)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedOrderId((current) => (current === order.id ? null : order.id));
                    }
                  }}
                  title="Doble click para editar el pedido"
                >
                  <div className="joker-order-item__title-group">
                    <strong>
                      Pedido #{order.displayNumber}
                      {!order.items.length ? <span className="joker-cancelled-badge">Eliminado</span> : null}
                    </strong>
                    {order.items.length ? (
                      order.courierId ? (
                        <span className="joker-delivery-chip joker-delivery-chip--assigned joker-delivery-chip--mini">
                          🛵 {couriers.find((courier) => courier.id === order.courierId)?.name ?? "Repartidor"}
                        </span>
                      ) : isCounterOrder(order) ? (
                        <span className="joker-delivery-chip joker-delivery-chip--counter joker-delivery-chip--mini">
                          🏪 Mostrador
                        </span>
                      ) : (
                        <span className="joker-order-item__excluded">Sin designar</span>
                      )
                    ) : null}
                  </div>

                  {order.items.length ? (
                    <button
                      type="button"
                      className="joker-order-item__delete-mid"
                      onClick={(event) => {
                        event.stopPropagation();
                        setPendingDeleteOrder(order);
                      }}
                    >
                      Eliminar pedido
                    </button>
                  ) : (
                    <span />
                  )}

                  <strong className="joker-amount-plus">+{formatPrice(order.total)}</strong>
                </div>

                {expandedOrderId === order.id ? (
                  <ul className="joker-order-detail-list">
                    <li className="joker-order-detail-list__meta">
                      <div className="joker-order-meta-row">
                        <div className="joker-order-meta-section">
                          <span className="joker-order-meta-chip">{formatDateTime(order.createdAt, order.orderDate)}</span>

                          {editingPaymentOrderId === order.id ? (
                            <span className="joker-delivery-assign">
                              {EDITABLE_PAYMENT_METHODS.map((method) => (
                                <button
                                  key={method}
                                  type="button"
                                  className={`joker-category-chip${method === order.paymentMethod ? " is-active" : ""}`}
                                  disabled={isSavingPayment}
                                  onClick={() => {
                                    if (method === "cuenta") {
                                      setCuentaPickerOrder(order);
                                      return;
                                    }
                                    void handleChangePaymentMethod(order, method);
                                  }}
                                >
                                  {JOKER_PAYMENT_METHOD_LABELS[method]}
                                </button>
                              ))}
                              <button
                                type="button"
                                className="joker-mini-button"
                                disabled={isSavingPayment}
                                onClick={() => setEditingPaymentOrderId(null)}
                              >
                                Cancelar
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="joker-order-meta-chip joker-order-meta-chip--clickable"
                              disabled={order.paymentMethod === "cuenta"}
                              title={order.paymentMethod === "cuenta" ? "Un pedido a cuenta no se corrige aca" : "Corregir metodo de pago"}
                              onClick={() => setEditingPaymentOrderId(order.id)}
                            >
                              {JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
                            </button>
                          )}
                        </div>

                        {!order.customerName?.trim().toUpperCase().includes("MOSTRADOR") &&
                        (order.customerName?.trim() || order.address?.trim()) ? (
                          <div className="joker-order-meta-customer">
                            {order.customerName?.trim() ? <strong>{order.customerName}</strong> : null}
                            {order.address?.trim() ? <span>{order.address}</span> : null}
                          </div>
                        ) : null}

                        <div className="joker-order-meta-section">
                          {assigningCourierOrderId === order.id ? (
                            <span className="joker-delivery-assign">
                              {couriers
                                .filter((courier) => courier.status === "activo")
                                .map((courier) => (
                                  <button
                                    key={courier.id}
                                    type="button"
                                    className="joker-category-chip"
                                    disabled={isSavingCourier}
                                    onClick={() => void handleAssignCourier(order, courier.id)}
                                  >
                                    🛵 {courier.name}
                                  </button>
                                ))}
                              <button
                                type="button"
                                className="joker-category-chip joker-category-chip--counter"
                                disabled={isSavingCourier}
                                onClick={() => void handleAssignCounter(order)}
                              >
                                🏪 Mostrador
                              </button>
                              <button
                                type="button"
                                className="joker-mini-button"
                                disabled={isSavingCourier}
                                onClick={() => setAssigningCourierOrderId(null)}
                              >
                                Cancelar
                              </button>
                            </span>
                          ) : isCounterOrder(order) ? (
                            <span className="joker-delivery-chip joker-delivery-chip--counter">
                              🏪 Mostrador
                              <button
                                type="button"
                                className="joker-mini-button"
                                onClick={() => setAssigningCourierOrderId(order.id)}
                              >
                                Cambiar
                              </button>
                            </span>
                          ) : order.courierId ? (
                            <span className="joker-delivery-chip joker-delivery-chip--assigned">
                              🛵 {couriers.find((courier) => courier.id === order.courierId)?.name ?? "Repartidor"}
                              <button
                                type="button"
                                className="joker-mini-button"
                                onClick={() => setAssigningCourierOrderId(order.id)}
                              >
                                Cambiar
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="joker-delivery-chip joker-delivery-chip--unassigned"
                              onClick={() => setAssigningCourierOrderId(order.id)}
                            >
                              🛵 Asignar delivery o mostrador
                            </button>
                          )}
                        </div>
                      </div>
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

      {confirmRegisterAction === "close" ? (
        <CloseRegisterModal
          message="No se van a poder cargar mas pedidos hasta que la abras de nuevo. Elegi si queres sacar el ticket con el resumen o no."
          isSubmitting={isClosingRegister}
          onCancel={() => setConfirmRegisterAction(null)}
          onConfirm={handleConfirmCloseRegister}
        />
      ) : confirmRegisterAction === "open" ? (
        <ConfirmDeleteModal
          title="Abrir caja"
          message="Seguro que queres abrir la caja?"
          confirmLabel="Abrir caja"
          confirmLabelBusy="Abriendo..."
          variant="primary"
          isDeleting={isClosingRegister}
          onCancel={() => setConfirmRegisterAction(null)}
          onConfirm={handleConfirmOpenRegister}
        />
      ) : null}

      {pendingDeleteOrder ? (
        <ConfirmDeleteModal
          title="Eliminar pedido"
          message={`Seguro que queres eliminar el pedido #${pendingDeleteOrder.displayNumber}? El stock descontado se devuelve.`}
          confirmLabel="Eliminar pedido"
          confirmLabelBusy="Eliminando..."
          variant="danger"
          isDeleting={isDeletingOrder}
          onCancel={() => setPendingDeleteOrder(null)}
          onConfirm={handleConfirmDeleteOrder}
        />
      ) : null}

      {blockedCloseCourierNames ? (
        <ConfirmDeleteModal
          title="No se puede cerrar la caja"
          message={`Primero finaliza (liquida) a ${blockedCloseCourierNames.join(", ")} en Delivery.`}
          confirmLabel="Ir a Delivery"
          variant="primary"
          onCancel={() => setBlockedCloseCourierNames(null)}
          onConfirm={() => {
            setBlockedCloseCourierNames(null);
            onGoToDelivery();
          }}
        />
      ) : null}

      {cuentaPickerOrder ? (
        <SelectClientModal
          title="Pasar a cuenta corriente"
          hint={`Pedido #${cuentaPickerOrder.displayNumber} · ${formatPrice(cuentaPickerOrder.total)}`}
          clients={clients}
          isSubmitting={isSavingPayment}
          onClose={() => setCuentaPickerOrder(null)}
          onConfirm={(clientId) => void handleConfirmCuenta(clientId)}
        />
      ) : null}
    </>
  );
}
