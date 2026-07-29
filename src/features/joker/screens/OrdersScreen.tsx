import { useState } from "react";
import { toast } from "react-toastify";
import { CustomizeProductModal } from "../components/CustomizeProductModal";
import { OrderList } from "../components/OrderList";
import { PaymentMethodModal } from "../components/PaymentMethodModal";
import { ProductGrid } from "../components/ProductGrid";
import { useJokerOrder } from "../hooks/useJokerOrder";
import { createOrder } from "../joker.api";
import { printOrderTicket } from "../services/joker.print";
import type { JokerAccountEntry, JokerClient, JokerOrderItem, JokerPaymentMethod, JokerProduct } from "../joker.types";

type OrdersScreenProps = {
  products: JokerProduct[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => void;
  clients: JokerClient[];
  onRegisterAccountEntry: (entry: JokerAccountEntry) => void;
};

export function OrdersScreen({ products, isLoading, loadError, onReload, clients, onRegisterAccountEntry }: OrdersScreenProps) {
  const [selectedVariants, setSelectedVariants] = useState<JokerProduct[] | null>(null);
  const [editingItem, setEditingItem] = useState<JokerOrderItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [ticketCopies, setTicketCopies] = useState<1 | 3>(3);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const { order, orderAddress, setOrderAddress, addItem, updateItem, removeItem, clearOrder } = useJokerOrder();

  // Los productos en borrador (sin precio confirmado) y los extras (que
  // se muestran dentro de la personalizacion de su producto base, no
  // como resultado propio) no aparecen en el buscador de pedidos.
  const orderableProducts = products.filter((product) => product.status !== "draft" && product.productType !== "extra");

  async function handleConfirmPayment(paymentMethod: JokerPaymentMethod, clientId?: string) {
    if (!order.length || isPrinting) return;

    setIsPrinting(true);
    try {
      await printOrderTicket(order, orderAddress, ticketCopies, paymentMethod);
      toast.success("Pedido impreso.");
      clearOrder();
    } catch (printError) {
      toast.error(printError instanceof Error ? `No se pudo imprimir: ${printError.message}` : "No se pudo imprimir el pedido.");
      setIsPrinting(false);
      return;
    }
    setIsPrinting(false);
    setIsPaymentModalOpen(false);

    if (paymentMethod === "cuenta" && clientId) {
      onRegisterAccountEntry({
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        clientId,
        createdAt: new Date().toISOString(),
        total: order.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
        items: order.map((item) => ({ productName: item.productName, quantity: item.quantity }))
      });
    }

    // El ticket ya salio de la impresora en este punto: si guardar el
    // pedido para el panel falla, se avisa pero no se revierte nada.
    try {
      await createOrder(order, orderAddress, paymentMethod);
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
        <ProductGrid products={orderableProducts} onSelectProduct={setSelectedVariants} />
      )}

      <OrderList
        order={order}
        orderAddress={orderAddress}
        onAddressChange={setOrderAddress}
        isPrinting={isPrinting}
        ticketCopies={ticketCopies}
        onTicketCopiesChange={setTicketCopies}
        onEditItem={setEditingItem}
        onRemoveItem={removeItem}
        onPrint={() => setIsPaymentModalOpen(true)}
      />

      {isPaymentModalOpen ? (
        <PaymentMethodModal
          clients={clients}
          isSubmitting={isPrinting}
          onClose={() => setIsPaymentModalOpen(false)}
          onConfirm={handleConfirmPayment}
        />
      ) : null}

      {selectedVariants ? (
        <CustomizeProductModal
          variants={selectedVariants}
          onClose={() => setSelectedVariants(null)}
          onConfirm={(variant, detail, quantity) => {
            addItem(variant, detail, quantity);
          }}
        />
      ) : null}

      {editingItem ? (
        <CustomizeProductModal
          variants={[
            { id: editingItem.productId, name: editingItem.productName, category: "", price: editingItem.unitPrice }
          ]}
          initialDetail={editingItem.detail}
          initialQuantity={editingItem.quantity}
          isEditing
          onClose={() => setEditingItem(null)}
          onConfirm={(_variant, detail, quantity) => {
            updateItem(editingItem.lineId, detail, quantity);
          }}
        />
      ) : null}
    </>
  );
}
