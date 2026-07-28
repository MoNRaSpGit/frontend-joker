import { Menu, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import { listProducts } from "./joker.api";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import { primeUsbPrinterConnection } from "./services/joker.webusbPrint";
import type { JokerProduct } from "./joker.types";
import { OrdersScreen } from "./screens/OrdersScreen";
import { PanelScreen } from "./screens/PanelScreen";
import { ProductsScreen } from "./screens/ProductsScreen";

type JokerTab = "pedidos" | "productos" | "panel";

const TAB_TITLES: Record<JokerTab, string> = {
  pedidos: "Armar pedido",
  productos: "Productos",
  panel: "Panel"
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
                <div className="joker-user-dropdown-divider" />
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
          <OrdersScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
        ) : activeTab === "productos" ? (
          <ProductsScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
        ) : (
          <PanelScreen />
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
