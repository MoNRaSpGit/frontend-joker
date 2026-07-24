import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CustomizeProductModal } from "./components/CustomizeProductModal";
import { OrderList } from "./components/OrderList";
import { PrinterSettingsModal } from "./components/PrinterSettingsModal";
import { ProductGrid } from "./components/ProductGrid";
import { useJokerOrder } from "./hooks/useJokerOrder";
import { listProducts } from "./joker.api";
import { printOrderTicket } from "./services/joker.print";
import { getPreferredPrinterName } from "./services/joker.qzPrint";
import { primeUsbPrinterConnection } from "./services/joker.webusbPrint";
import type { JokerProduct } from "./joker.types";

export function JokerHomePage() {
  const [products, setProducts] = useState<JokerProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<JokerProduct | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isPrinterModalOpen, setIsPrinterModalOpen] = useState(false);
  const [preferredPrinterName, setPreferredPrinterNameState] = useState<string | null>(() => getPreferredPrinterName());
  const { order, addItem, removeItem, clearOrder } = useJokerOrder();

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

  async function handlePrint() {
    if (!order.length || isPrinting) return;

    setIsPrinting(true);
    try {
      await printOrderTicket(order);
      toast.success("Pedido impreso.");
      clearOrder();
    } catch (printError) {
      toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el pedido.");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <main className="joker-shell">
      <header className="joker-header">
        <div className="joker-header__row">
          <div>
            <p className="joker-kicker">Joker</p>
            <h1>Armar pedido</h1>
          </div>
          <button type="button" className="joker-printer-btn" onClick={() => setIsPrinterModalOpen(true)}>
            Impresora{preferredPrinterName ? `: ${preferredPrinterName}` : ""}
          </button>
        </div>
      </header>

      {isLoadingProducts ? (
        <p className="joker-empty-state">Cargando menu...</p>
      ) : loadError ? (
        <div className="joker-panel">
          <p className="joker-order-item__excluded">No se pudo cargar el menu: {loadError}</p>
          <button type="button" className="joker-button joker-button--ghost" onClick={() => void loadProducts()}>
            Reintentar
          </button>
        </div>
      ) : (
        <ProductGrid products={products} onSelectProduct={setSelectedProduct} />
      )}

      <OrderList order={order} isPrinting={isPrinting} onRemoveItem={removeItem} onPrint={handlePrint} />

      {selectedProduct ? (
        <CustomizeProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(detail) => addItem(selectedProduct, detail)}
        />
      ) : null}

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
