import type { JokerOrderItem } from "../joker.types";

type OrderListProps = {
  order: JokerOrderItem[];
  isPrinting: boolean;
  onEditItem: (item: JokerOrderItem) => void;
  onRemoveItem: (lineId: string) => void;
  onPrint: () => void;
};

export function OrderList({ order, isPrinting, onEditItem, onRemoveItem, onPrint }: OrderListProps) {
  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Pedido</p>
        <h2>Ticket a imprimir{order.length ? ` (${order.length})` : ""}</h2>
      </div>

      {order.length ? (
        <ul className="joker-order-list">
          {order.map((item) => (
            <li key={item.lineId} className="joker-order-item">
              <div className="joker-order-item__info">
                <span className="joker-qty-badge">{item.quantity}x</span>
                <div>
                  <strong>{item.productName}</strong>
                  {item.address ? <p className="joker-order-item__excluded">Direccion: {item.address}</p> : null}
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

      <button
        type="button"
        className="joker-print-btn"
        onClick={onPrint}
        disabled={!order.length || isPrinting}
      >
        {isPrinting ? "Imprimiendo..." : "Imprimir pedido"}
      </button>
    </section>
  );
}
