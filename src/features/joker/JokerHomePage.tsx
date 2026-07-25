import { useEffect, useState } from "react";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import { getSettings, listProducts } from "./joker.api";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import { primeUsbPrinterConnection } from "./services/joker.webusbPrint";
import type { JokerProduct, JokerSettings } from "./joker.types";
import { OrdersScreen } from "./screens/OrdersScreen";
import { ProductsScreen } from "./screens/ProductsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

type JokerTab = "pedidos" | "productos" | "local";

const TAB_LABELS: Record<JokerTab, string> = {
  pedidos: "Armar pedido",
  productos: "Productos",
  local: "Datos del local"
};

const DEFAULT_SETTINGS: JokerSettings = { storeName: "EL JOKER", address: "", phone: "" };

export function JokerHomePage() {
  const [activeTab, setActiveTab] = useState<JokerTab>("pedidos");
  const [products, setProducts] = useState<JokerProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<JokerSettings>(DEFAULT_SETTINGS);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [preferredPrinterName, setPreferredPrinterNameState] = useState<string | null>(() => getPreferredPrinterName());

  // Reconecta en silencio la impresora USB ya autorizada en una sesion
  // anterior (no pide permiso de nuevo, solo la vuelve a encontrar).
  useEffect(() => {
    void primeUsbPrinterConnection().catch(() => {});
  }, []);

  useEffect(() => {
    void loadProducts();
    void loadSettings();
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

  async function loadSettings() {
    try {
      const result = await getSettings();
      setSettings(result.item);
    } catch {
      // Si falla, seguimos con los datos por defecto y el ticket igual sale.
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
              <h1 className="joker-brand__title">{TAB_LABELS[activeTab]}</h1>
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
                className={`joker-tab${activeTab === "local" ? " is-active" : ""}`}
                onClick={() => setActiveTab("local")}
              >
                Local
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
          <OrdersScreen
            products={products}
            isLoading={isLoadingProducts}
            loadError={loadError}
            onReload={loadProducts}
            settings={settings}
          />
        ) : activeTab === "productos" ? (
          <ProductsScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
        ) : (
          <SettingsScreen onSettingsSaved={setSettings} />
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
