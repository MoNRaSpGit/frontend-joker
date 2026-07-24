import type { JokerOrderItem } from "../joker.types";

type OrderListProps = {
  order: JokerOrderItem[];
  isPrinting: boolean;
  onRemoveItem: (lineId: string) => void;
  onPrint: () => void;
};

export function OrderList({ order, isPrinting, onRemoveItem, onPrint }: OrderListProps) {
  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Pedido</p>
        <h2>Ticket a imprimir</h2>
      </div>

      {order.length ? (
        <ul className="joker-order-list">
          {order.map((item) => (
            <li key={item.lineId} className="joker-order-item">
              <div>
                <strong>{item.productName}</strong>
                {item.detail ? (
                  <p className="joker-order-item__excluded">{item.detail}</p>
                ) : (
                  <p className="joker-order-item__excluded joker-order-item__excluded--full">Sin detalle</p>
                )}
              </div>
              <button
                type="button"
                className="joker-order-item__remove"
                onClick={() => onRemoveItem(item.lineId)}
                aria-label={`Quitar ${item.productName} del pedido`}
              >
                x
              </button>
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
