import { useEffect, useState } from "react";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import { listProducts } from "./joker.api";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import { primeUsbPrinterConnection } from "./services/joker.webusbPrint";
import type { JokerProduct } from "./joker.types";
import { OrdersScreen } from "./screens/OrdersScreen";
import { PanelScreen } from "./screens/PanelScreen";
import { ProductsScreen } from "./screens/ProductsScreen";

type JokerTab = "pedidos" | "productos" | "panel";

export function JokerHomePage() {
  const [activeTab, setActiveTab] = useState<JokerTab>("pedidos");
  const [products, setProducts] = useState<JokerProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [preferredPrinterName, setPreferredPrinterNameState] = useState<string | null>(() => getPreferredPrinterName());

  // Reconecta en silencio la impresora USB ya autorizada en una sesion
  // anterior (no pide permiso de nuevo, solo la vuelve a encontrar).
  useEffect(() => {
    void primeUsbPrinterConnection().catch(() => {});
  }, []);

  useEffect(() => {
    void loadProducts();
  }, []);

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

  return (
    <div className="joker-app">
      <header className="joker-topbar">
        <div className="joker-topbar__inner">
          <div className="joker-brand">
            <span className="joker-brand__mark">🃏</span>
            <div>
              <p className="joker-brand__kicker">El Joker</p>
              <h1 className="joker-brand__title">
                {activeTab === "pedidos" ? "Armar pedido" : activeTab === "productos" ? "Productos" : "Panel"}
              </h1>
            </div>
          </div>

          <div className="joker-topbar__actions">
            <nav className="joker-tabs">
              <button
                type="button"
                className={`joker-tab${activeTab === "pedidos" ? " is-active" : ""}`}
                onClick={() => setActiveTab("pedidos")}
              >
                Pedidos
              </button>
              <button
                type="button"
                className={`joker-tab${activeTab === "productos" ? " is-active" : ""}`}
                onClick={() => setActiveTab("productos")}
              >
                Productos
              </button>
              <button
                type="button"
                className={`joker-tab${activeTab === "panel" ? " is-active" : ""}`}
                onClick={() => setActiveTab("panel")}
              >
                Panel
              </button>
            </nav>

            <button type="button" className="joker-printer-btn" onClick={() => setIsPrinterModalOpen(true)}>
              🖨️ {preferredPrinterName || "Elegir impresora"}
            </button>
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
