import { useState } from "react";
import { toast } from "react-toastify";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { CustomizeProductModal } from "../components/CustomizeProductModal";
import { OrderList } from "../components/OrderList";
import { PaymentMethodModal } from "../components/PaymentMethodModal";
import { ProductGrid } from "../components/ProductGrid";
import { useJokerOrder } from "../hooks/useJokerOrder";
import { createAccountEntry, createOrder, getRegisterState, openRegister } from "../joker.api";
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
  const [ticketCopies, setTicketCopies] = useState<0 | 1 | 3>(3);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [pendingSale, setPendingSale] = useState<{
    paymentMethod: JokerPaymentMethod;
    clientId?: number;
    customerName?: string;
  } | null>(null);
  const [isOpeningRegister, setIsOpeningRegister] = useState(false);
  const {
    order,
    orderAddress,
    setOrderAddress,
    orderCustomerName,
    setOrderCustomerName,
    orderDeliveryCost,
    setOrderDeliveryCost,
    orderNote,
    setOrderNote,
    addItem,
    updateItem,
    removeItem,
    clearOrder
  } = useJokerOrder();

  // Los productos en borrador (sin precio confirmado) y los extras (que
  // se muestran dentro de la personalizacion de su producto base, no
  // como resultado propio) no aparecen en el buscador de pedidos.
  const orderableProducts = products.filter((product) => product.status !== "draft" && product.productType !== "extra");

  async function handleConfirmPayment(paymentMethod: JokerPaymentMethod, clientId?: number, customerName?: string) {
    if (!order.length || isPrinting) return;

    setIsPrinting(true);
    let registerState;
    try {
      registerState = await getRegisterState();
    } catch (stateError) {
      toast.error(
        stateError instanceof Error ? `No se pudo verificar la caja: ${stateError.message}` : "No se pudo verificar la caja."
      );
      setIsPrinting(false);
      return;
    }

    // Si la caja esta cerrada, se frena aca y se le pregunta al operario si
    // quiere abrirla; el pedido se retoma solo si confirma (ver
    // handleConfirmOpenRegisterAndSale).
    if (!registerState.isOpen) {
      setIsPrinting(false);
      setPendingSale({ paymentMethod, clientId, customerName });
      return;
    }

    await proceedWithSale(paymentMethod, clientId, customerName);
  }

  async function handleConfirmOpenRegisterAndSale() {
    if (!pendingSale) return;

    setIsOpeningRegister(true);
    try {
      await openRegister();
    } catch (openError) {
      toast.error(openError instanceof Error ? `No se pudo abrir la caja: ${openError.message}` : "No se pudo abrir la caja.");
      setIsOpeningRegister(false);
      return;
    }
    setIsOpeningRegister(false);

    const sale = pendingSale;
    setPendingSale(null);
    await proceedWithSale(sale.paymentMethod, sale.clientId, sale.customerName);
  }

  async function proceedWithSale(paymentMethod: JokerPaymentMethod, clientId?: number, customerName?: string) {
    setIsPrinting(true);

    // El numero de pedido lo asigna el backend (arranca de 1 en cada
    // cierre de caja), asi que primero hay que guardar el pedido y recien
    // con ese numero armar e imprimir el ticket.
    let displayNumber: number;
    let orderId: number;
    try {
      const saved = await createOrder(order, orderAddress, paymentMethod, customerName);
      displayNumber = saved.item.displayNumber;
      orderId = saved.item.id;
    } catch (saveError) {
      toast.error(saveError instanceof Error ? `No se pudo guardar el pedido: ${saveError.message}` : "No se pudo guardar el pedido.");
      setIsPrinting(false);
      return;
    }

    // "0 tick": el pedido queda guardado como cualquier otro (descuenta
    // stock, entra al panel), pero no se manda nada a la impresora. Es para
    // ventas internas que no necesitan comprobante.
    if (ticketCopies === 0) {
      toast.success("Pedido guardado (sin ticket).");
      clearOrder();
    } else {
      try {
        await printOrderTicket(
          order,
          orderAddress,
          ticketCopies,
          paymentMethod,
          orderCustomerName,
          orderDeliveryCost,
          displayNumber,
          orderNote
        );
        toast.success("Pedido impreso.");
        clearOrder();
      } catch (printError) {
        toast.error(
          printError instanceof Error
            ? `El pedido #${displayNumber} se guardo pero no se pudo imprimir: ${printError.message}`
            : `El pedido #${displayNumber} se guardo pero no se pudo imprimir.`
        );
        setIsPrinting(false);
        return;
      }
    }
    setIsPrinting(false);
    setIsPaymentModalOpen(false);

    if (paymentMethod === "cuenta" && clientId) {
      try {
        await createAccountEntry(
          clientId,
          order.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
          order.map((item) => ({ productName: item.productName, quantity: item.quantity })),
          orderId
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
        orderNote={orderNote}
        onNoteChange={setOrderNote}
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

      {pendingSale ? (
        <ConfirmDeleteModal
          title="Caja cerrada"
          message="La caja esta cerrada. Deseas abrirla y continuar con este pedido?"
          confirmLabel="Abrir caja y continuar"
          confirmLabelBusy="Abriendo..."
          variant="primary"
          isDeleting={isOpeningRegister}
          onCancel={() => setPendingSale(null)}
          onConfirm={handleConfirmOpenRegisterAndSale}
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
