import type { JokerOrderItem } from "../joker.types";

type OrderListProps = {
  order: JokerOrderItem[];
  orderAddress: string;
  onAddressChange: (address: string) => void;
  orderCustomerName: string;
  onCustomerNameChange: (customerName: string) => void;
  orderDeliveryCost: string;
  onDeliveryCostChange: (deliveryCost: string) => void;
  orderNote: string;
  onNoteChange: (note: string) => void;
  orderDate: string;
  onOrderDateChange: (orderDate: string) => void;
  isPrinting: boolean;
  ticketCopies: 0 | 1 | 3;
  onTicketCopiesChange: (copies: 0 | 1 | 3) => void;
  onEditItem: (item: JokerOrderItem) => void;
  onRemoveItem: (lineId: string) => void;
  onPrint: () => void;
};

function formatPrice(price: number) {
  return price.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

export function OrderList({
  order,
  orderAddress,
  onAddressChange,
  orderCustomerName,
  onCustomerNameChange,
  orderDeliveryCost,
  onDeliveryCostChange,
  orderNote,
  onNoteChange,
  orderDate,
  onOrderDateChange,
  isPrinting,
  ticketCopies,
  onTicketCopiesChange,
  onEditItem,
  onRemoveItem,
  onPrint
}: OrderListProps) {
  const total = order.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Pedido</p>
        <h2>Ticket a imprimir{order.length ? ` (${order.length})` : ""}</h2>
      </div>

      <div className="joker-form-row">
        <label className="joker-form-field">
          <span>Nombre del cliente</span>
          <input
            type="text"
            value={orderCustomerName}
            onChange={(event) => onCustomerNameChange(event.target.value)}
            placeholder="Ej: Juan Perez"
          />
        </label>

        <label className="joker-form-field">
          <span>Direccion del pedido (si es delivery)</span>
          <input
            type="text"
            value={orderAddress}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="Ej: Av. 18 de Julio 1234"
          />
        </label>
      </div>

      <div className="joker-form-row">
        <label className="joker-form-field">
          <span>Costo de envio (si corresponde)</span>
          <input
            type="text"
            inputMode="decimal"
            value={orderDeliveryCost}
            onChange={(event) => onDeliveryCostChange(event.target.value)}
            placeholder="Ej: 150"
          />
        </label>

        <label className="joker-form-field">
          <span>Fecha del pedido (solo si es de otro dia)</span>
          <input type="date" value={orderDate} onChange={(event) => onOrderDateChange(event.target.value)} />
        </label>
      </div>

      <label className="joker-form-field">
        <span>Nota (solo sale en el ticket de mostrador)</span>
        <input
          type="text"
          value={orderNote}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Ej: Pedido para las 9:30"
        />
      </label>

      {order.length ? (
        <ul className="joker-order-list">
          {order.map((item) => (
            <li key={item.lineId} className="joker-order-item">
              <div className="joker-order-item__info">
                <span className="joker-qty-badge">{item.quantity}x</span>
                <div>
                  <strong>
                    {item.productName} <span className="joker-product-card__price">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </strong>
                  {item.detail ? (
                    <p className="joker-order-item__excluded">Detalle: {item.detail}</p>
                  ) : (
                    <p className="joker-order-item__excluded joker-order-item__excluded--full">Sin detalle</p>
                  )}
                </div>
              </div>
              <div className="joker-product-row-actions">
                <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={() => onEditItem(item)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="joker-order-item__remove"
                  onClick={() => onRemoveItem(item.lineId)}
                  aria-label={`Quitar ${item.productName} del pedido`}
                >
                  x
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="joker-empty-state">Todavia no agregaste nada al pedido.</p>
      )}

      {order.length ? (
        <p className="joker-order-item__excluded joker-order-item__excluded--full">Total a pagar: {formatPrice(total)}</p>
      ) : null}

      <div className="joker-category-chips">
        <button
          type="button"
          className={`joker-category-chip${ticketCopies === 1 ? " is-active" : ""}`}
          onClick={() => onTicketCopiesChange(1)}
        >
          1 tick
        </button>
        <button
          type="button"
          className={`joker-category-chip${ticketCopies === 3 ? " is-active" : ""}`}
          onClick={() => onTicketCopiesChange(3)}
        >
          3 tick
        </button>
        <button
          type="button"
          className={`joker-category-chip${ticketCopies === 0 ? " is-active" : ""}`}
          onClick={() => onTicketCopiesChange(0)}
          style={{ marginLeft: 8 }}
          title="Registra el pedido pero no imprime nada (venta interna)"
        >
          0 tick
        </button>
      </div>

      <button
        type="button"
        className="joker-print-btn"
        onClick={onPrint}
        disabled={!order.length || isPrinting}
      >
        {isPrinting ? "Guardando..." : ticketCopies === 0 ? "Guardar pedido (sin ticket)" : "Imprimir pedido"}
      </button>
    </section>
  );
}
