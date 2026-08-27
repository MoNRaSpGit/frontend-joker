import { Menu, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { JokerRoleLoginScreen } from "./components/JokerRoleLoginScreen";
import { PendingOrderModal } from "./components/PendingOrderModal";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import {
  acceptOrder,
  createAccountEntry,
  createClient,
  deleteClient,
  enableCourier,
  listAccountEntries,
  listClients,
  listCouriers,
  listPendingOrders,
  listProducts,
  rejectOrder,
  settleAccount,
  settleCourier,
  updateCourier
} from "./joker.api";
import { printOrderTicket } from "./services/joker.print";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import type { JokerAccountEntry, JokerClient, JokerCourier, JokerOrderItem, JokerOrderRecord, JokerProduct, JokerRole } from "./joker.types";
import { CuentaCorrienteScreen } from "./screens/CuentaCorrienteScreen";
import { DeliveryScreen } from "./screens/DeliveryScreen";
import { MesScreen } from "./screens/MesScreen";
import { OrdersScreen } from "./screens/OrdersScreen";
import { PanelScreen } from "./screens/PanelScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { StockScreen } from "./screens/StockScreen";

type JokerTab = "pedidos" | "productos" | "panel" | "cuenta" | "stock" | "delivery" | "mes";
type CustomizeMode = "cliente" | "dev";

const CUSTOMIZE_MODE_STORAGE_KEY = "joker.customizeMode";
const ROLE_STORAGE_KEY = "joker.role";

// Tabs que puede ver un "usuario" -- solo armar pedidos. El resto de la
// app queda reservado para "administrador". Sin contraseña ni backend, es
// solo para mostrarle al cliente la idea de roles diferenciados.
const USER_ROLE_ALLOWED_TABS: JokerTab[] = ["pedidos"];

const TAB_TITLES: Record<JokerTab, string> = {
  pedidos: "Armar pedido",
  productos: "Productos",
  panel: "Panel",
  cuenta: "Cuenta corriente",
  stock: "Stock",
  delivery: "Delivery",
  mes: "Mes"
};


export function JokerHomePage() {
  const [role, setRole] = useState<JokerRole | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
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

  // Alterna entre la version "Cliente" (detalle en texto libre, lo que
  // pidio el cliente) y "Dev" (checklist de ingredientes/extras/salsa,
  // para mostrarle las dos opciones en vivo). Se guarda en el navegador,
  // no afecta a otros dispositivos ni al backend.
  const [customizeMode, setCustomizeMode] = useState<CustomizeMode>(() => {
    if (typeof window === "undefined") return "cliente";
    return window.localStorage.getItem(CUSTOMIZE_MODE_STORAGE_KEY) === "dev" ? "dev" : "cliente";
  });

  const [clients, setClients] = useState<JokerClient[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clientsLoadError, setClientsLoadError] = useState<string | null>(null);
  const [accountEntries, setAccountEntries] = useState<JokerAccountEntry[]>([]);
  const [couriers, setCouriers] = useState<JokerCourier[]>([]);
  const [pendingOrders, setPendingOrders] = useState<JokerOrderRecord[]>([]);

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

  // La cuenta corriente se recalcula en el backend apenas se edita un
  // pedido (ver joker.service.ts#syncAccountEntryForOrder), pero esta
  // pantalla la tiene en un estado propio que no se entera solo -- por eso
  // se refresca cada 15s en silencio, ademas del refresh inmediato despues
  // de crear/editar un pedido a cuenta (ver onAccountEntryRegistered).
  useEffect(() => {
    void loadProducts();
    void loadClients();
    void loadAccountEntries();
    void loadCouriers();

    const intervalId = window.setInterval(() => void loadAccountEntries(), 15000);
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

  async function handleSettleCourier(courierId: number, hourlyRate?: number, hoursWorked?: number) {
    const response = await settleCourier(courierId, hourlyRate, hoursWorked);
    setCouriers((current) => current.map((courier) => (courier.id === courierId ? response.item : courier)));
  }

  function goToTab(tab: JokerTab) {
    setActiveTab(tab);
    setIsMenuOpen(false);
  }

  function handleSelectRole(nextRole: JokerRole) {
    window.localStorage.setItem(ROLE_STORAGE_KEY, nextRole);
    setRole(nextRole);
    setActiveTab("pedidos");
  }

  function handleLogout() {
    window.localStorage.removeItem(ROLE_STORAGE_KEY);
    setRole(null);
    setIsMenuOpen(false);
  }

  function toggleCustomizeMode() {
    setCustomizeMode((current) => {
      const next = current === "cliente" ? "dev" : "cliente";
      window.localStorage.setItem(CUSTOMIZE_MODE_STORAGE_KEY, next);
      return next;
    });
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
    await Promise.all([loadClients(), loadAccountEntries()]);
  }

  // "Pago": salda la cuenta del cliente, pero a diferencia de eliminar el
  // cliente, el cliente en si se queda (solo se borra su historial de
  // consumos, que ya se cobro).
  async function handleSettleAccount(clientId: number) {
    await settleAccount(clientId);
    await loadAccountEntries();
  }

  // Acepta un pedido pendiente de mostrador: recien aca se le asigna el
  // numero real de cocina y se descuenta el stock (ver
  // JokerOrdersService#acceptOrder), asi que imprime el ticket igual que
  // un pedido normal recien creado. Si se pago "a cuenta", genera el
  // movimiento de cuenta corriente ahora (no se genero al mandarlo, para
  // no cargarle nada al cliente si el pedido terminaba rechazado).
  async function handleAcceptPendingOrder(order: JokerOrderRecord) {
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

    const printableItems: JokerOrderItem[] = accepted.items.map((item, index) => ({
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
        3,
        accepted.paymentMethod,
        accepted.customerName ?? "",
        accepted.deliveryCost ? String(accepted.deliveryCost) : "",
        accepted.displayNumber,
        ""
      );
      toast.success(`Pedido #${accepted.displayNumber} aceptado e impreso.`);
    } catch (printError) {
      toast.error(
        printError instanceof Error
          ? `El pedido #${accepted.displayNumber} se acepto pero no se pudo imprimir: ${printError.message}`
          : `El pedido #${accepted.displayNumber} se acepto pero no se pudo imprimir.`
      );
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
    <div className="joker-app">
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
                  className={`joker-user-dropdown-item${activeTab === "pedidos" ? " is-active" : ""}`}
                  onClick={() => goToTab("pedidos")}
                >
                  Pedidos
                </button>
                {role === "administrador" ? (
                  <>
                    <button
                      type="button"
                      className={`joker-user-dropdown-item${activeTab === "productos" ? " is-active" : ""}`}
                      onClick={() => goToTab("productos")}
                    >
                      Productos
                    </button>
                    <button
                      type="button"
                      className={`joker-user-dropdown-item${activeTab === "panel" ? " is-active" : ""}`}
                      onClick={() => goToTab("panel")}
                    >
                      Panel
                    </button>
                    <button
                      type="button"
                      className={`joker-user-dropdown-item${activeTab === "cuenta" ? " is-active" : ""}`}
                      onClick={() => goToTab("cuenta")}
                    >
                      Cuenta corriente
                    </button>
                    <button
                      type="button"
                      className={`joker-user-dropdown-item${activeTab === "stock" ? " is-active" : ""}`}
                      onClick={() => goToTab("stock")}
                    >
                      Stock
                    </button>
                    <button
                      type="button"
                      className={`joker-user-dropdown-item${activeTab === "delivery" ? " is-active" : ""}`}
                      onClick={() => goToTab("delivery")}
                    >
                      Delivery
                    </button>
                    <button
                      type="button"
                      className={`joker-user-dropdown-item${activeTab === "mes" ? " is-active" : ""}`}
                      onClick={() => goToTab("mes")}
                    >
                      Mes
                    </button>
                  </>
                ) : null}
                <div className="joker-user-dropdown-divider" />
                <button type="button" className="joker-user-dropdown-item" onClick={toggleCustomizeMode}>
                  ⚙️ Modo: {customizeMode === "dev" ? "Dev" : "Cliente"}
                </button>
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

      <main className={`joker-shell${activeTab === "cuenta" || activeTab === "mes" ? " joker-shell--wide" : ""}`}>
        {activeTab === "pedidos" ? (
          <OrdersScreen
            products={products}
            isLoading={isLoadingProducts}
            loadError={loadError}
            onReload={loadProducts}
            clients={clients}
            onAccountEntryRegistered={loadAccountEntries}
            customizeMode={customizeMode}
            role={role}
          />
        ) : activeTab === "productos" ? (
          <ProductsScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
        ) : activeTab === "panel" ? (
          <PanelScreen
            products={products}
            couriers={couriers}
            onAccountEntryRegistered={loadAccountEntries}
            onGoToDelivery={() => goToTab("delivery")}
          />
        ) : activeTab === "cuenta" ? (
          <CuentaCorrienteScreen
            clients={clients}
            isLoadingClients={isLoadingClients}
            clientsLoadError={clientsLoadError}
            onReloadClients={loadClients}
            accountEntries={accountEntries}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
            onSettleAccount={handleSettleAccount}
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
        ) : null}
      </main>

      {isPrinterModalOpen ? (
        <PrinterSettingsModal
          currentPrinterName={preferredPrinterName}
          onClose={() => setIsPrinterModalOpen(false)}
          onPrinterChange={setPreferredPrinterNameState}
        />
      ) : null}

      {role === "administrador" && pendingOrders.length ? (
        <PendingOrderModal
          order={pendingOrders[0]}
          queueCount={pendingOrders.length}
          onAccept={handleAcceptPendingOrder}
          onReject={handleRejectPendingOrder}
        />
      ) : null}
    </div>
  );
}
