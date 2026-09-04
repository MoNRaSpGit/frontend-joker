import { Menu, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { ChatWidget } from "./components/ChatWidget";
import { JokerRoleLoginScreen } from "./components/JokerRoleLoginScreen";
import { JokerSidebar } from "./components/JokerSidebar";
import { PendingOrderBadge } from "./components/PendingOrderBadge";
import { PendingOrderModal } from "./components/PendingOrderModal";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import {
  acceptOrder,
  createAccountEntry,
  createAccountPayment,
  createClient,
  deleteClient,
  enableCourier,
  listAccountEntries,
  listClients,
  listCouriers,
  listOpenAccountPayments,
  listPendingOrders,
  listProducts,
  rejectOrder,
  settleCourier,
  updateCourier
} from "./joker.api";
import { printOrderTicket } from "./services/joker.print";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import type {
  JokerAccountEntry,
  JokerAccountPayment,
  JokerClient,
  JokerCourier,
  JokerOrderItem,
  JokerOrderRecord,
  JokerProduct,
  JokerRole
} from "./joker.types";
import { CuentaCorrienteScreen } from "./screens/CuentaCorrienteScreen";
import { DeliveryScreen } from "./screens/DeliveryScreen";
import { MesScreen } from "./screens/MesScreen";
import { OrdersScreen } from "./screens/OrdersScreen";
import { PanelScreen } from "./screens/PanelScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SalesHistoryScreen } from "./screens/SalesHistoryScreen";
import { StockScreen } from "./screens/StockScreen";
import { UserPanelScreen } from "./screens/UserPanelScreen";

type JokerTab = "pedidos" | "productos" | "panel" | "cuenta" | "stock" | "delivery" | "mes" | "historial";
type CustomizeMode = "cliente" | "dev";

const ROLE_STORAGE_KEY = "joker.role";

// Tabs que puede ver un "usuario": armar pedidos, su propio Panel (con su
// propia caja, separada de la del Administrador -- ver UserPanelScreen) e
// Historial de ventas (foto de un dia, solo lectura, la ven los dos roles
// igual). El resto de la app (Productos, Cuenta corriente, Stock,
// Delivery, Mes) queda reservado para "administrador".
const USER_ROLE_ALLOWED_TABS: JokerTab[] = ["pedidos", "panel", "historial"];

const TAB_TITLES: Record<JokerTab, string> = {
  pedidos: "Armar pedido",
  productos: "Productos",
  panel: "Panel",
  cuenta: "Cuenta corriente",
  stock: "Stock",
  delivery: "Delivery",
  mes: "Mes",
  historial: "Historial de ventas"
};


export function JokerHomePage() {
  const [role, setRole] = useState<JokerRole | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.sessionStorage.getItem(ROLE_STORAGE_KEY);
    return stored === "administrador" || stored === "usuario" ? stored : null;
  });
  const [activeTab, setActiveTab] = useState<JokerTab>("pedidos");
  const [products, setProducts] = useState<JokerProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [preferredPrinterName, setPreferredPrinterNameState] = useState<string | null>(() => getPreferredPrinterName());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Antes alternaba entre "Cliente" (detalle en texto libre) y "Dev"
  // (checklist de ingredientes/extras/salsa) para mostrarle las dos
  // opciones en vivo a un cliente potencial. Ya no hace falta el toggle:
  // queda fijo en "Dev".
  const customizeMode: CustomizeMode = "dev";

  const [clients, setClients] = useState<JokerClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsLoadError, setClientsLoadError] = useState<string | null>(null);
  const [accountEntries, setAccountEntries] = useState<JokerAccountEntry[]>([]);
  // Solo los pagos abiertos (no los ya cerrados por un pago total viejo):
  // es lo que hace falta, junto con accountEntries, para calcular "Debe
  // $X" de cada cliente en el listado.
  const [accountPayments, setAccountPayments] = useState<JokerAccountPayment[]>([]);
  const [couriers, setCouriers] = useState<JokerCourier[]>([]);
  const [pendingOrders, setPendingOrders] = useState<JokerOrderRecord[]>([]);
  // El pop-up de un pedido pendiente no se abre solo -- cada pedido tiene
  // su propio cartelito fijo (PendingOrderBadge) que avisa sin tapar la
  // pantalla, y esto se pone en el id del pedido recien cuando el admin le
  // hace click a su cartelito.
  const [activePendingOrderId, setActivePendingOrderId] = useState<number | null>(null);
  const activePendingOrderIndex = pendingOrders.findIndex((order) => order.id === activePendingOrderId);
  const activePendingOrder = activePendingOrderIndex >= 0 ? pendingOrders[activePendingOrderIndex] : null;

  // Solo el Administrador ve el pop-up de pedidos pendientes de mostrador
  // (el rol Usuario es quien los manda, no tendria sentido que se
  // autoaprobara). Sin websockets: se chequea cada 8s.
  useEffect(() => {
    if (role !== "administrador") return;

    let cancelled = false;
    async function poll() {
      try {
        const result = await listPendingOrders();
        if (!cancelled) setPendingOrders(result.items);
      } catch {
        // Silencioso: un pedido pendiente no es urgente al punto de tapar
        // la pantalla con un error de red pasajero, se reintenta solo en
        // 8s.
      }
    }

    void poll();
    const intervalId = window.setInterval(() => void poll(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [role]);

  // Si el pedido que estaba abierto en el modal ya no esta en la lista
  // (se acepto o rechazo, desde este cartelito o desde otro lado), el
  // modal se cierra solo. La proxima vez que llegue uno nuevo arranca de
  // nuevo como cartelito, no se abre solo tapando la pantalla.
  useEffect(() => {
    if (activePendingOrderId !== null && !pendingOrders.some((order) => order.id === activePendingOrderId)) {
      setActivePendingOrderId(null);
    }
  }, [pendingOrders, activePendingOrderId]);

  // La cuenta corriente se recalcula en el backend apenas se edita un
  // pedido (ver joker.service.ts#syncAccountEntryForOrder), pero esta
  // pantalla la tiene en un estado propio que no se entera solo -- por eso
  // se refresca cada 15s en silencio, ademas del refresh inmediato despues
  // de crear/editar un pedido a cuenta (ver onAccountEntryRegistered).
  useEffect(() => {
    void loadProducts();
    void loadClients();
    void loadAccountEntries();
    void loadAccountPayments();
    void loadCouriers();

    const intervalId = window.setInterval(() => {
      void loadAccountEntries();
      void loadAccountPayments();
    }, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Si el rol es "usuario" y por algun motivo activeTab quedo en una
  // pestana que no le corresponde (ej: cambio de rol en caliente sin
  // recargar), lo vuelve a Pedidos.
  useEffect(() => {
    if (role === "usuario" && !USER_ROLE_ALLOWED_TABS.includes(activeTab)) {
      setActiveTab("pedidos");
    }
  }, [role, activeTab]);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  async function loadProducts() {
    setIsLoadingProducts(true);
    setLoadError(null);
    try {
      const result = await listProducts();
      setProducts(result.items);
    } catch (fetchError) {
      setLoadError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el menu.");
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function loadClients() {
    setIsLoadingClients(true);
    setClientsLoadError(null);
    try {
      const result = await listClients();
      setClients(result.items);
    } catch (fetchError) {
      setClientsLoadError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los clientes.");
    } finally {
      setIsLoadingClients(false);
    }
  }

  async function loadAccountEntries() {
    try {
      const result = await listAccountEntries();
      setAccountEntries(result.items);
    } catch {
      // El desglose de "Debe" se recalcula solo la proxima vez que ande
      // bien la conexion; no hace falta un estado de error propio aca.
    }
  }

  async function loadAccountPayments() {
    try {
      const result = await listOpenAccountPayments();
      setAccountPayments(result.items);
    } catch {
      // Mismo criterio que loadAccountEntries: se reintenta solo.
    }
  }

  async function loadCouriers() {
    try {
      const result = await listCouriers();
      setCouriers(result.items);
    } catch {
      // Si falla, el select de repartidor en el pedido queda vacio; se
      // reintenta solo la proxima vez que cargue bien.
    }
  }

  async function handleRenameCourier(courierId: number, name: string) {
    const response = await updateCourier(courierId, name);
    setCouriers((current) => current.map((courier) => (courier.id === courierId ? response.item : courier)));
  }

  async function handleEnableCourier(courierId: number) {
    const response = await enableCourier(courierId);
    setCouriers((current) => current.map((courier) => (courier.id === courierId ? response.item : courier)));
  }

  // Se manda 0/0 de tarifa/horas: ya no se le pide esos datos al admin (ver
  // DeliveryScreen), asi que el "total a pagar" archivado en el historial
  // de liquidaciones queda como el costo de envios solo, sin inventar un
  // valor de horas que nadie cargo.
  async function handleSettleCourier(courierId: number) {
    const response = await settleCourier(courierId, 0, 0);
    setCouriers((current) => current.map((courier) => (courier.id === courierId ? response.item : courier)));
  }

  function goToTab(tab: JokerTab) {
    setActiveTab(tab);
    setIsMenuOpen(false);
  }

  function handleSelectRole(nextRole: JokerRole) {
    window.sessionStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    setRole(nextRole);
    setActiveTab("pedidos");
  }

  function handleLogout() {
    window.sessionStorage.removeItem(ROLE_STORAGE_KEY);
    setRole(null);
    setIsMenuOpen(false);
  }

  async function handleAddClient(name: string, phone?: string, address?: string) {
    await createClient({ name, phone: phone?.trim() || undefined, address: address?.trim() || undefined });
    await loadClients();
  }

  // Borrar el cliente tambien borra su historial de consumos (FK en
  // cascada del lado del backend), asi que hay que refrescar los dos.
  async function handleDeleteClient(clientId: number) {
    await deleteClient(clientId);
    await Promise.all([loadClients(), loadAccountEntries(), loadAccountPayments()]);
  }

  // Pago parcial (o total, si el monto cubre todo el saldo) de cuenta
  // corriente -- no borra boletas, ver JokerAccountService#createAccountPayment.
  // Si el pago cubrio todo, el backend ya archivo las boletas solo, por
  // eso se refresca tambien accountEntries.
  async function handleCreateAccountPayment(clientId: number, amount: number) {
    const response = await createAccountPayment(clientId, amount);
    await Promise.all([loadAccountEntries(), loadAccountPayments()]);
    return response.item;
  }

  // Acepta un pedido pendiente de mostrador: recien aca se le asigna el
  // numero real de cocina y se descuenta el stock (ver
  // JokerOrdersService#acceptOrder), asi que imprime el ticket igual que
  // un pedido normal recien creado. Si se pago "a cuenta", genera el
  // movimiento de cuenta corriente ahora (no se genero al mandarlo, para
  // no cargarle nada al cliente si el pedido terminaba rechazado).
  async function handleAcceptPendingOrder(order: JokerOrderRecord, ticketCopies: 0 | 1 | 3) {
    let accepted: JokerOrderRecord;
    try {
      const result = await acceptOrder(order.id);
      accepted = result.item;
    } catch (error) {
      toast.error(error instanceof Error ? `No se pudo aceptar el pedido: ${error.message}` : "No se pudo aceptar el pedido.");
      return;
    }

    setPendingOrders((current) => current.filter((item) => item.id !== order.id));

    if (accepted.displayNumber === null) {
      toast.error("El pedido se acepto pero no se pudo obtener su numero para imprimir.");
      return;
    }

    if (ticketCopies === 0) {
      toast.success(`Pedido #${accepted.displayNumber} aceptado (sin ticket).`);
    } else {
      // Las lineas hijas de un combo (a $0) vienen guardadas en el pedido
      // solo para que el backend descuente el stock de lo que realmente se
      // eligio -- no van en el ticket impreso (la linea del combo ya trae
      // el detalle completo: "Hamburguesa: 4Q · Bebida: Coca-Cola"). Los
      // items que vuelven del backend no tienen parentLineId, asi que se
      // reconocen por el detalle que les pone buildComponentLines. Mismo
      // criterio que OrdersScreen#printableOrder para el flujo normal.
      const printableItems: JokerOrderItem[] = accepted.items
        .filter((item) => !(item.detail ?? "").startsWith("Incluido en "))
        .map((item, index) => ({
          lineId: `pending-${accepted.id}-${index}`,
          productId: item.productId,
          productName: item.productName,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          detail: item.detail ?? ""
        }));

      try {
        await printOrderTicket(
          printableItems,
          accepted.address,
          ticketCopies,
          accepted.paymentMethod,
          accepted.customerName ?? "",
          accepted.deliveryCost ? String(accepted.deliveryCost) : "",
          accepted.displayNumber,
          accepted.note ?? "",
          accepted.orderDate ?? undefined
        );
        toast.success(`Pedido #${accepted.displayNumber} aceptado e impreso.`);
      } catch (printError) {
        toast.error(
          printError instanceof Error
            ? `El pedido #${accepted.displayNumber} se acepto pero no se pudo imprimir: ${printError.message}`
            : `El pedido #${accepted.displayNumber} se acepto pero no se pudo imprimir.`
        );
      }
    }

    if (accepted.paymentMethod === "cuenta" && accepted.clientId) {
      try {
        await createAccountEntry(
          accepted.clientId,
          accepted.total,
          accepted.items.map((item) => ({ productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice })),
          accepted.id
        );
        await loadAccountEntries();
      } catch (accountError) {
        toast.error(
          accountError instanceof Error
            ? `El pedido se acepto pero no se guardo en la cuenta corriente: ${accountError.message}`
            : "El pedido se acepto pero no se guardo en la cuenta corriente."
        );
      }
    }

    await loadProducts();
  }

  async function handleRejectPendingOrder(order: JokerOrderRecord) {
    try {
      await rejectOrder(order.id);
      setPendingOrders((current) => current.filter((item) => item.id !== order.id));
      toast.info("Pedido cancelado.");
    } catch (error) {
      toast.error(error instanceof Error ? `No se pudo cancelar el pedido: ${error.message}` : "No se pudo cancelar el pedido.");
    }
  }

  if (!role) {
    return <JokerRoleLoginScreen onSelectRole={handleSelectRole} />;
  }

  return (
    <div className={`joker-app${role ? " joker-app--with-sidebar" : ""}`}>
      <header className="joker-topbar">
        <div className="joker-topbar__inner">
          <div className="joker-brand">
            <img className="joker-brand__mark" src={`${import.meta.env.BASE_URL}icons/logo-joker-mark.png`} alt="El Joker" />
            <h1 className="joker-brand__title">{TAB_TITLES[activeTab]}</h1>
          </div>

          <div className="joker-user-menu" ref={menuRef}>
            <button
              type="button"
              className="joker-user-menu-btn"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-expanded={isMenuOpen}
              aria-label="Abrir menu"
            >
              <UserRound size={16} />
              <Menu size={16} />
            </button>

            {isMenuOpen ? (
              <div className="joker-user-dropdown">
                <button
                  type="button"
                  className="joker-user-dropdown-item"
                  onClick={() => {
                    setIsPrinterModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                >
                  🖨️ {preferredPrinterName || "Elegir impresora"}
                </button>
                <div className="joker-user-dropdown-divider" />
                <button type="button" className="joker-user-dropdown-item" onClick={handleLogout}>
                  🚪 Cerrar sesion ({role === "administrador" ? "Admin" : "Usuario"})
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className={`joker-shell${activeTab === "cuenta" || activeTab === "mes" || activeTab === "historial" ? " joker-shell--wide" : ""}`}>
        {activeTab === "pedidos" ? (
          <OrdersScreen
            products={products}
            isLoading={isLoadingProducts}
            loadError={loadError}
            onReload={loadProducts}
            clients={clients}
            couriers={couriers}
            onAccountEntryRegistered={loadAccountEntries}
            customizeMode={customizeMode}
            role={role}
          />
        ) : activeTab === "productos" ? (
          <ProductsScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
        ) : activeTab === "panel" ? (
          role === "administrador" ? (
            <PanelScreen
              products={products}
              couriers={couriers}
              clients={clients}
              onAccountEntryRegistered={loadAccountEntries}
              onGoToDelivery={() => goToTab("delivery")}
            />
          ) : (
            <UserPanelScreen couriers={couriers} />
          )
        ) : activeTab === "cuenta" ? (
          <CuentaCorrienteScreen
            clients={clients}
            isLoadingClients={isLoadingClients}
            clientsLoadError={clientsLoadError}
            onReloadClients={loadClients}
            accountEntries={accountEntries}
            accountPayments={accountPayments}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
            onCreateAccountPayment={handleCreateAccountPayment}
          />
        ) : activeTab === "stock" ? (
          <StockScreen products={products} />
        ) : activeTab === "delivery" ? (
          <DeliveryScreen
            couriers={couriers}
            onRenameCourier={handleRenameCourier}
            onEnableCourier={handleEnableCourier}
            onSettleCourier={handleSettleCourier}
          />
        ) : activeTab === "mes" ? (
          <MesScreen />
        ) : activeTab === "historial" ? (
          <SalesHistoryScreen couriers={couriers} clients={clients} products={products} role={role} />
        ) : null}
      </main>

      {role ? <JokerSidebar activeTab={activeTab} isAdmin={role === "administrador"} onNavigate={goToTab} /> : null}

      {role ? <ChatWidget role={role} /> : null}

      {isPrinterModalOpen ? (
        <PrinterSettingsModal
          currentPrinterName={preferredPrinterName}
          onClose={() => setIsPrinterModalOpen(false)}
          onPrinterChange={setPreferredPrinterNameState}
        />
      ) : null}

      {role === "administrador"
        ? pendingOrders.map((order, index) => (
            // Un cartelito por pedido, escalonados: el mas viejo (index 0)
            // arriba, los mas nuevos van apilandose mas abajo.
            <PendingOrderBadge
              key={order.id}
              arrivalNumber={index + 1}
              bottomOffset={16 + (pendingOrders.length - 1 - index) * 56}
              onClick={() => setActivePendingOrderId(order.id)}
            />
          ))
        : null}

      {role === "administrador" && activePendingOrder ? (
        <PendingOrderModal
          key={activePendingOrder.id}
          order={activePendingOrder}
          arrivalNumber={activePendingOrderIndex + 1}
          queueCount={pendingOrders.length}
          onAccept={handleAcceptPendingOrder}
          onReject={handleRejectPendingOrder}
          onDismiss={() => setActivePendingOrderId(null)}
        />
      ) : null}
    </div>
  );
}
