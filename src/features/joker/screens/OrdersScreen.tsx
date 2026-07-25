import { useState } from "react";
import { toast } from "react-toastify";
import { CustomizeProductModal } from "../components/CustomizeProductModal";
import { OrderList } from "../components/OrderList";
import { ProductGrid } from "../components/ProductGrid";
import { useJokerOrder } from "../hooks/useJokerOrder";
import { printOrderTicket } from "../services/joker.print";
import type { JokerOrderItem, JokerProduct } from "../joker.types";

type OrdersScreenProps = {
  products: JokerProduct[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => void;
};

export function OrdersScreen({ products, isLoading, loadError, onReload }: OrdersScreenProps) {
  const [selectedProduct, setSelectedProduct] = useState<JokerProduct | null>(null);
  const [editingItem, setEditingItem] = useState<JokerOrderItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const { order, addItem, updateItem, removeItem, clearOrder } = useJokerOrder();

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

      <OrderList
        order={order}
        isPrinting={isPrinting}
        onEditItem={setEditingItem}
        onRemoveItem={removeItem}
        onPrint={handlePrint}
      />

      {selectedProduct ? (
        <CustomizeProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(address, detail, quantity) => addItem(selectedProduct, address, detail, quantity)}
        />
      ) : null}

      {editingItem ? (
        <CustomizeProductModal
          product={{ id: editingItem.productId, name: editingItem.productName, category: "", price: 0 }}
          initialAddress={editingItem.address}
          initialDetail={editingItem.detail}
          initialQuantity={editingItem.quantity}
          isEditing
          onClose={() => setEditingItem(null)}
          onConfirm={(address, detail, quantity) => updateItem(editingItem.lineId, address, detail, quantity)}
        />
      ) : null}
    </>
  );
}
