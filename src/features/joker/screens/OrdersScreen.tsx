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
import { isComboComponentLine } from "../joker.types";
import type { JokerClient, JokerCourier, JokerOrderItem, JokerPaymentMethod, JokerProduct, JokerRole } from "../joker.types";

type OrdersScreenProps = {
  products: JokerProduct[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => void;
  clients: JokerClient[];
  couriers: JokerCourier[];
  onAccountEntryRegistered: () => void;
  customizeMode: "cliente" | "dev";
  role: JokerRole;
};

export function OrdersScreen({
  products,
  isLoading,
  loadError,
  onReload,
  clients,
  couriers,
  onAccountEntryRegistered,
  customizeMode,
  role
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
    orderDate,
    setOrderDate,
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

    // El rol "Usuario" arma el pedido igual que siempre, pero no lo
    // confirma solo: queda pendiente hasta que el Administrador lo acepte
    // o lo rechace (ver PendingOrderModal en JokerHomePage). No pasa por
    // ticket ni cuenta corriente todavia -- eso pasa recien al aceptar.
    // Dos cajas se respetan aca, en este orden:
    // 1) La caja GENERAL del Administrador -- representa si el local esta
    //    operando o no ese dia. Si esta cerrada, no se puede mandar ningun
    //    pedido (ni del Usuario ni del propio Administrador).
    // 2) "Mostrador" (la tarjeta del Usuario en Delivery, courier con
    //    isCounter=true) -- si no esta habilitada, no se puede mandar
    //    nada: a diferencia de antes, el Usuario ya no la puede abrir el
    //    mismo (eso ahora es cosa del Administrador, con el monto
    //    inicial), asi que solo se le avisa que espere.
    if (role === "usuario") {
      setIsPrinting(true);
      try {
        const generalRegisterState = await getRegisterState();
        if (!generalRegisterState.isOpen) {
          toast.error("El local esta cerrado (caja general cerrada). No se pueden mandar pedidos.");
          setIsPrinting(false);
          return;
        }

        const mostrador = couriers.find((courier) => courier.isCounter);
        if (mostrador?.status !== "activo") {
          toast.error("El mostrador no esta habilitado. Pedile al administrador que lo habilite desde Delivery.");
          setIsPrinting(false);
          return;
        }
      } catch (stateError) {
        toast.error(
          stateError instanceof Error ? `No se pudo verificar la caja: ${stateError.message}` : "No se pudo verificar la caja."
        );
        setIsPrinting(false);
        return;
      }

      await submitPendingOrder(paymentMethod, clientId, customerName);
      return;
    }

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

  async function submitPendingOrder(paymentMethod: JokerPaymentMethod, clientId?: number, customerName?: string) {
    setIsPrinting(true);
    try {
      // El nombre puede venir de dos lados, igual que en proceedWithSale:
      // del modal de Metodo de pago (customerName -- solo lo llena para
      // "transferencia", con quien transfirio, o "cuenta", con el cliente
      // elegido) o del campo "Nombre del cliente" del Pedido
      // (orderCustomerName, ver OrderList). Si vino del modal, gana ese
      // (es mas especifico); si no, se usa lo que se escribio en el
      // Pedido. Antes se usaba SOLO el del Pedido -- un pedido "a cuenta"
      // guardaba el clientId bien (la cuenta corriente quedaba
      // correcta), pero el nombre quedaba vacio si el Usuario no habia
      // tipeado nada aparte en el Pedido, aunque el cliente ya estuviera
      // elegido en el modal.
      const finalCustomerName = customerName ?? (orderCustomerName.trim() || undefined);

      await createOrder(
        order,
        orderAddress,
        paymentMethod,
        finalCustomerName,
        undefined,
        undefined,
        undefined,
        clientId,
        true
      );
      toast.success("Pedido enviado. Queda esperando que el administrador lo acepte.");
      clearOrder();
      setIsPaymentModalOpen(false);
    } catch (saveError) {
      toast.error(saveError instanceof Error ? `No se pudo enviar el pedido: ${saveError.message}` : "No se pudo enviar el pedido.");
    } finally {
      setIsPrinting(false);
    }
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
    // El nombre puede venir de dos lados: del campo "Nombre del cliente"
    // del Pedido (orderCustomerName) o del modal de Metodo de pago
    // (customerName -- solo lo llena para "transferencia", con quien
    // transfirio, o "cuenta", con el cliente elegido). Si vino de ahi,
    // gana ese (es mas especifico); si no, se usa lo que se escribio en
    // el Pedido. Antes se usaba SOLO el del modal, que para efectivo/
    // tarjeta nunca se llena -- el nombre tipeado en el Pedido se perdia
    // en silencio.
    const finalCustomerName = customerName ?? (orderCustomerName.trim() || undefined);

    let displayNumber: number;
    let orderId: number;
    try {
      const parsedDeliveryCost = orderDeliveryCost.trim() ? Number(orderDeliveryCost) : undefined;
      const saved = await createOrder(
        order,
        orderAddress,
        paymentMethod,
        finalCustomerName,
        orderDate,
        undefined,
        Number.isFinite(parsedDeliveryCost) ? parsedDeliveryCost : undefined
      );
      // Este flujo nunca crea un pedido "pending" (eso lo maneja
      // PendingOrderForm para el rol Usuario), asi que siempre viene con
      // numero real -- el guard es solo para que TypeScript sepa que no es
      // null en este punto.
      if (saved.item.displayNumber === null) {
        toast.error("El pedido se guardo pero no se pudo obtener su numero.");
        setIsPrinting(false);
        return;
      }
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
      // Las lineas hijas de un combo (a $0) son para que el backend
      // descuente el stock de lo que realmente se eligio -- no aportan
      // nada al ticket impreso, porque la linea del combo ya muestra el
      // detalle completo ("Hamburguesa: 4Q · Bebida: Coca-Cola"). Sin este
      // filtro salian duplicadas: una vez como parte del detalle del
      // combo, y otra vez como renglon propio a $0.
      const printableOrder = order.filter((item) => !isComboComponentLine(item));
      try {
        await printOrderTicket(
          printableOrder,
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
          order.map((item) => ({ productName: item.productName, quantity: item.quantity, unitPrice: item.unitPrice })),
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

  // Producto real del catalogo para el item en edicion (si todavia existe):
  // se necesita para traer sus comboSlots, que el objeto minimo armado a
  // mano (solo con lo guardado en la linea del pedido) nunca tenia. Sin
  // esto, editar un combo ya agregado no mostraba los selects para
  // recambiar hamburguesa/bebida, y la unica forma de corregir una eleccion
  // mal hecha era borrar la linea entera y volver a agregarla -- lo que
  // dejaba la eleccion vieja (a $0, "Incluido en...") pegada en el pedido
  // si alguien se olvidaba de borrarla primero.
  const editingProduct = editingItem ? products.find((product) => product.id === editingItem.productId) : undefined;

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
        orderDate={orderDate}
        onOrderDateChange={setOrderDate}
        isPrinting={isPrinting}
        ticketCopies={ticketCopies}
        onTicketCopiesChange={setTicketCopies}
        onEditItem={setEditingItem}
        onRemoveItem={removeItem}
        onPrint={() => setIsPaymentModalOpen(true)}
        role={role}
      />

      {isPaymentModalOpen ? (
        <PaymentMethodModal
          clients={clients}
          isSubmitting={isPrinting}
          onClose={() => setIsPaymentModalOpen(false)}
          onConfirm={handleConfirmPayment}
          confirmLabel={role === "usuario" ? "Enviar pedido" : undefined}
          confirmBusyLabel={role === "usuario" ? "Enviando..." : undefined}
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
          onConfirm={(variant, detail, quantity, comboComponents) => {
            addItem(variant, detail, quantity, comboComponents);
          }}
        />
      ) : null}

      {editingItem ? (
        <CustomizeProductModal
          variants={[
            {
              ...editingProduct,
              id: editingItem.productId,
              name: editingItem.productName,
              category: editingProduct?.category ?? "",
              price: editingItem.unitPrice
            } as JokerProduct
          ]}
          allProducts={products}
          initialDetail={editingItem.detail}
          initialQuantity={editingItem.quantity}
          isEditing
          onClose={() => setEditingItem(null)}
          onConfirm={(variant, detail, quantity, comboComponents) => {
            updateItem(editingItem.lineId, detail, quantity, variant.price, comboComponents);
          }}
        />
      ) : null}
    </>
  );
}
