import { useState } from "react";
import { toast } from "react-toastify";
import { CustomizeProductModal } from "../components/CustomizeProductModal";
import { OrderList } from "../components/OrderList";
import { ProductGrid } from "../components/ProductGrid";
import { useJokerOrder } from "../hooks/useJokerOrder";
import { createOrder } from "../joker.api";
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
  const [ticketCopies, setTicketCopies] = useState<1 | 3>(3);
  const { order, orderAddress, setOrderAddress, addItem, updateItem, removeItem, clearOrder } = useJokerOrder();

  async function handlePrint() {
    if (!order.length || isPrinting) return;

    setIsPrinting(true);
    try {
      await printOrderTicket(order, orderAddress, ticketCopies);
      toast.success("Pedido impreso.");
      clearOrder();
    } catch (printError) {
      toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el pedido.");
      setIsPrinting(false);
      return;
    }
    setIsPrinting(false);

    // El ticket ya salio de la impresora en este punto: si guardar el
    // pedido para el panel falla, se avisa pero no se revierte nada.
    try {
      await createOrder(order, orderAddress);
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? `El pedido se imprimio pero no se guardo en el panel: ${saveError.message}`
          : "El pedido se imprimio pero no se guardo en el panel."
      );
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
        orderAddress={orderAddress}
        isPrinting={isPrinting}
        ticketCopies={ticketCopies}
        onTicketCopiesChange={setTicketCopies}
        onEditItem={setEditingItem}
        onRemoveItem={removeItem}
        onPrint={handlePrint}
      />

      {selectedProduct ? (
        <CustomizeProductModal
          product={selectedProduct}
          initialAddress={orderAddress}
          onClose={() => setSelectedProduct(null)}
          onConfirm={(address, detail, quantity) => {
            setOrderAddress(address);
            addItem(selectedProduct, detail, quantity);
          }}
        />
      ) : null}

      {editingItem ? (
        <CustomizeProductModal
          product={{ id: editingItem.productId, name: editingItem.productName, category: "", price: editingItem.unitPrice }}
          initialAddress={orderAddress}
          initialDetail={editingItem.detail}
          initialQuantity={editingItem.quantity}
          isEditing
          onClose={() => setEditingItem(null)}
          onConfirm={(address, detail, quantity) => {
            setOrderAddress(address);
            updateItem(editingItem.lineId, detail, quantity);
          }}
        />
      ) : null}
    </>
  );
}
