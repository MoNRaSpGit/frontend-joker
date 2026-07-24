import { useEffect, useState } from "react";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import { listProducts } from "./joker.api";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import { primeUsbPrinterConnection } from "./services/joker.webusbPrint";
import type { JokerProduct } from "./joker.types";
import { OrdersScreen } from "./screens/OrdersScreen";
import { ProductsScreen } from "./screens/ProductsScreen";

type JokerTab = "pedidos" | "productos";

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
    <main className="joker-shell">
      <header className="joker-header">
        <div className="joker-header__row">
          <div>
            <p className="joker-kicker">Joker</p>
            <h1>{activeTab === "pedidos" ? "Armar pedido" : "Productos"}</h1>
          </div>
          <button type="button" className="joker-printer-btn" onClick={() => setIsPrinterModalOpen(true)}>
            Impresora{preferredPrinterName ? `: ${preferredPrinterName}` : ""}
          </button>
        </div>

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
        </nav>
      </header>

      {activeTab === "pedidos" ? (
        <OrdersScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
      ) : (
        <ProductsScreen products={products} isLoading={isLoadingProducts} loadError={loadError} onReload={loadProducts} />
      )}

      {isPrinterModalOpen ? (
        <PrinterSettingsModal
          currentPrinterName={preferredPrinterName}
          onClose={() => setIsPrinterModalOpen(false)}
          onPrinterChange={setPreferredPrinterNameState}
        />
      ) : null}
    </main>
  );
}
