import { useState } from "react";
import { toast } from "react-toastify";
import { CustomizeProductModal } from "../components/CustomizeProductModal";
import { OrderList } from "../components/OrderList";
import { PaymentMethodModal } from "../components/PaymentMethodModal";
import { ProductGrid } from "../components/ProductGrid";
import { useJokerOrder } from "../hooks/useJokerOrder";
import { createAccountEntry, createOrder } from "../joker.api";
import { printOrderTicket } from "../services/joker.print";
import type { JokerClient, JokerOrderItem, JokerPaymentMethod, JokerProduct } from "../joker.types";

type OrdersScreenProps = {
  products: JokerProduct[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => void;
  clients: JokerClient[];
  onAccountEntryRegistered: () => void;
  customizeMode: "cliente" | "dev";
};

export function OrdersScreen({
  products,
  isLoading,
  loadError,
  onReload,
  clients,
  onAccountEntryRegistered,
  customizeMode
}: OrdersScreenProps) {
  const [selectedVariants, setSelectedVariants] = useState<JokerProduct[] | null>(null);
  const [editingItem, setEditingItem] = useState<JokerOrderItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [ticketCopies, setTicketCopies] = useState<1 | 3>(3);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const {
    order,
    orderAddress,
    setOrderAddress,
    orderCustomerName,
    setOrderCustomerName,
    orderDeliveryCost,
    setOrderDeliveryCost,
    addItem,
    updateItem,
    removeItem,
    clearOrder
  } = useJokerOrder();

  // Los productos en borrador (sin precio confirmado) y los extras (que
  // se muestran dentro de la personalizacion de su producto base, no
  // como resultado propio) no aparecen en el buscador de pedidos.
  const orderableProducts = products.filter((product) => product.status !== "draft" && product.productType !== "extra");

  async function handleConfirmPayment(paymentMethod: JokerPaymentMethod, clientId?: number) {
    if (!order.length || isPrinting) return;

    setIsPrinting(true);

    // El numero de pedido lo asigna el backend (id real, secuencial), asi
    // que primero hay que guardar el pedido y recien con ese numero armar
    // e imprimir el ticket.
    let savedOrderId: number;
    try {
      const saved = await createOrder(order, orderAddress, paymentMethod);
      savedOrderId = saved.item.id;
    } catch (saveError) {
      toast.error(saveError instanceof Error ? `No se pudo guardar el pedido: ${saveError.message}` : "No se pudo guardar el pedido.");
      setIsPrinting(false);
      return;
    }

    try {
      await printOrderTicket(order, orderAddress, ticketCopies, paymentMethod, orderCustomerName, orderDeliveryCost, savedOrderId);
      toast.success("Pedido impreso.");
      clearOrder();
    } catch (printError) {
      toast.error(
        printError instanceof Error
          ? `El pedido #${savedOrderId} se guardo pero no se pudo imprimir: ${printError.message}`
          : `El pedido #${savedOrderId} se guardo pero no se pudo imprimir.`
      );
      setIsPrinting(false);
      return;
    }
    setIsPrinting(false);
    setIsPaymentModalOpen(false);

    if (paymentMethod === "cuenta" && clientId) {
      try {
        await createAccountEntry(
          clientId,
          order.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
          order.map((item) => ({ productName: item.productName, quantity: item.quantity }))
        );
        onAccountEntryRegistered();
      } catch (accountError) {
        toast.error(
          accountError instanceof Error
            ? `El pedido se imprimio pero no se guardo en la cuenta corriente: ${accountError.message}`
            : "El pedido se imprimio pero no se guardo en la cuenta corriente."
        );
      }
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
        orderCustomerName={orderCustomerName}
        onCustomerNameChange={setOrderCustomerName}
        orderDeliveryCost={orderDeliveryCost}
        onDeliveryCostChange={setOrderDeliveryCost}
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
          allProducts={products}
          mode={customizeMode}
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
          onConfirm={(variant, detail, quantity) => {
            updateItem(editingItem.lineId, detail, quantity, variant.price);
          }}
        />
      ) : null}
    </>
  );
}
