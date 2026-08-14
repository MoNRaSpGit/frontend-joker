import { Menu, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import {
  createClient,
  deleteClient,
  listAccountEntries,
  listClients,
  listProducts,
  settleAccount
} from "./joker.api";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import type { JokerAccountEntry, JokerClient, JokerProduct } from "./joker.types";
import { CuentaCorrienteScreen } from "./screens/CuentaCorrienteScreen";
import { OrdersScreen } from "./screens/OrdersScreen";
import { PanelScreen } from "./screens/PanelScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { StockScreen } from "./screens/StockScreen";

type JokerTab = "pedidos" | "productos" | "panel" | "cuenta" | "stock";
type CustomizeMode = "cliente" | "dev";

const CUSTOMIZE_MODE_STORAGE_KEY = "joker.customizeMode";

const TAB_TITLES: Record<JokerTab, string> = {
  pedidos: "Armar pedido",
  productos: "Productos",
  panel: "Panel",
  cuenta: "Cuenta corriente",
  stock: "Stock"
};


export function JokerHomePage() {
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

  // La cuenta corriente se recalcula en el backend apenas se edita un
  // pedido (ver joker.service.ts#syncAccountEntryForOrder), pero esta
  // pantalla la tiene en un estado propio que no se entera solo -- por eso
  // se refresca cada 15s en silencio, ademas del refresh inmediato despues
  // de crear/editar un pedido a cuenta (ver onAccountEntryRegistered).
  useEffect(() => {
    void loadProducts();
    void loadClients();
    void loadAccountEntries();

    const intervalId = window.setInterval(() => void loadAccountEntries(), 15000);
    return () => window.clearInterval(intervalId);
  }, []);

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

  function goToTab(tab: JokerTab) {
    setActiveTab(tab);
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

  return (
    <div className="joker-app">
      <header className="joker-topbar">
        <div className="joker-topbar__inner">
          <div className="joker-brand">
            <img className="joker-brand__mark" src={`${import.meta.env.BASE_URL}icons/logo-joker-mark.png`} alt="El Joker" />
            <div>
              <p className="joker-brand__kicker">El Joker</p>
              <h1 className="joker-brand__title">{TAB_TITLES[activeTab]}</h1>
            </div>
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
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="joker-shell">
        {activeTab === "pedidos" ? (
          <OrdersScreen
            products={products}
            isLoading={isLoadingProducts}
            loadError={loadError}
            onReload={loadProducts}
            clients={clients}
            onAccountEntryRegistered={loadAccountEntries}
            customizeMode={customizeMode}
          />
        ) : activeTab === "productos" ? (
          <ProductsScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
        ) : activeTab === "panel" ? (
          <PanelScreen products={products} onAccountEntryRegistered={loadAccountEntries} />
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
        ) : null}
      </main>

      {isPrinterModalOpen ? (
        <PrinterSettingsModal
          currentPrinterName={preferredPrinterName}
          onClose={() => setIsPrinterModalOpen(false)}
          onPrinterChange={setPreferredPrinterNameState}
        />
      ) : null}
    </div>
  );
}
