import { useState } from "react";
import { toast } from "react-toastify";
import { CustomizeProductModal } from "../components/CustomizeProductModal";
import { OrderList } from "../components/OrderList";
import { ProductGrid } from "../components/ProductGrid";
import { useJokerOrder } from "../hooks/useJokerOrder";
import { printOrderTicket } from "../services/joker.print";
import type { JokerProduct } from "../joker.types";

type OrdersScreenProps = {
  products: JokerProduct[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => void;
};

export function OrdersScreen({ products, isLoading, loadError, onReload }: OrdersScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState<JokerProduct | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const { order, addItem, removeItem, clearOrder } = useJokerOrder();

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
    <>
      {isLoading ? (
        <p className="joker-empty-state">Cargando menu...</p>
      ) : loadError ? (
        <div className="joker-panel">
          <p className="joker-order-item__excluded">No se pudo cargar el menu: {loadError}</p>
          <button type="button" className="joker-button joker-button--ghost" onClick={onReload}>
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
    </>
  );
}
