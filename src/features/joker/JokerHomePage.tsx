import { Menu, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import { DEMO_CLIENTS } from "./joker.clients";
import { listProducts } from "./joker.api";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import { primeUsbPrinterConnection } from "./services/joker.webusbPrint";
import type { JokerAccountEntry, JokerClient, JokerProduct } from "./joker.types";
import { CuentaCorrienteScreen } from "./screens/CuentaCorrienteScreen";
import { OrdersScreen } from "./screens/OrdersScreen";
import { PanelScreen } from "./screens/PanelScreen";
import { ProductsScreen } from "./screens/ProductsScreen";

type JokerTab = "pedidos" | "productos" | "panel" | "cuenta";
type CustomizeMode = "cliente" | "dev";

const CUSTOMIZE_MODE_STORAGE_KEY = "joker.customizeMode";

const TAB_TITLES: Record<JokerTab, string> = {
  pedidos: "Armar pedido",
  productos: "Productos",
  panel: "Panel",
  cuenta: "Cuenta corriente"
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

  // Cuenta corriente: solo en memoria por ahora (sin backend), se
  // pierde al refrescar la pagina. Los clientes arrancan precargados.
  const [clients, setClients] = useState<JokerClient[]>(DEMO_CLIENTS);
  const [accountEntries, setAccountEntries] = useState<JokerAccountEntry[]>([]);

  // Reconecta en silencio la impresora USB ya autorizada en una sesion
  // anterior (no pide permiso de nuevo, solo la vuelve a encontrar).
  useEffect(() => {
    void primeUsbPrinterConnection().catch(() => {});
  }, []);

  useEffect(() => {
    void loadProducts();
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

  function handleAddClient(name: string, phone?: string) {
    setClients((current) => [
      ...current,
      { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, phone: phone?.trim() || undefined }
    ]);
  }

  function handleRegisterAccountEntry(entry: JokerAccountEntry) {
    setAccountEntries((current) => [...current, entry]);
  }

  return (
    <div className="joker-app">
      <header className="joker-topbar">
        <div className="joker-topbar__inner">
          <div className="joker-brand">
            <span className="joker-brand__mark">🃏</span>
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
            onRegisterAccountEntry={handleRegisterAccountEntry}
            customizeMode={customizeMode}
          />
        ) : activeTab === "productos" ? (
          <ProductsScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
        ) : activeTab === "panel" ? (
          <PanelScreen />
        ) : (
          <CuentaCorrienteScreen clients={clients} accountEntries={accountEntries} onAddClient={handleAddClient} />
        )}
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
