import { useMemo, useState } from "react";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerOrderRecord, JokerProduct } from "../joker.types";

type EditableLine = {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  detail?: string;
};

type EditOrderModalProps = {
  order: JokerOrderRecord;
  products: JokerProduct[];
  isSaving: boolean;
  onClose: () => void;
  onSave: (items: EditableLine[], orderDate: string) => Promise<void>;
};

const SEARCH_RESULTS_LIMIT = 8;

function formatPrice(amount: number) {
  return amount.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

function formatDateTime(isoDate: string) {
  const date = new Date(isoDate);
  const dateLabel = date.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" });
  const timeLabel = date.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}`;
}

export function EditOrderModal({ order, products, isSaving, onClose, onSave }: EditOrderModalProps) {
  const [lines, setLines] = useState<EditableLine[]>(() => order.items.map((item) => ({ ...item })));
  const [productSearch, setProductSearch] = useState("");
  const [orderDate, setOrderDate] = useState(() => order.orderDate ?? order.createdAt.slice(0, 10));

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const originalTotal = order.total;

  const searchResults = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return [];
    return products
      .filter((product) => product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query))
      .slice(0, SEARCH_RESULTS_LIMIT);
  }, [productSearch, products]);

  function adjustQuantity(productId: number, delta: number) {
    setLines((current) =>
      current
        .map((line) => (line.productId === productId ? { ...line, quantity: line.quantity + delta } : line))
        .filter((line) => line.quantity > 0)
    );
  }

  function removeLine(productId: number) {
    setLines((current) => current.filter((line) => line.productId !== productId));
  }

  function addProduct(product: JokerProduct) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      if (existing) {
        return current.map((line) => (line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...current, { productId: product.id, productName: product.name, unitPrice: product.price, quantity: 1 }];
    });
    setProductSearch("");
  }

  function handleSaveClick() {
    if (!lines.length) return;
    void onSave(lines, orderDate);
  }

  return (
    <>
      <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={`Editar pedido #${order.displayNumber}`}>
        <div className="joker-modal-card joker-modal-card--wide">
          <div className="joker-edit-order__header">
            <div>
              <p className="joker-eyebrow">Editar pedido</p>
              <h2 className="joker-edit-order__title">Pedido #{order.displayNumber}</h2>
              <p className="joker-order-item__excluded">
                {formatDateTime(order.createdAt)} · {JOKER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
              </p>
            </div>
            <button type="button" className="joker-modal-close" onClick={onClose} disabled={isSaving}>
              Cerrar
            </button>
          </div>

          <label className="joker-form-field">
            <span>Fecha del pedido</span>
            <input type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
          </label>

          <div className="joker-edit-order__add">
            <input
              type="search"
              className="joker-search-input"
              placeholder="Buscar producto para agregar al pedido..."
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
            />

            {productSearch.trim() ? (
              searchResults.length ? (
                <ul className="joker-edit-order__search-results">
                  {searchResults.map((product) => (
                    <li key={product.id}>
                      <button type="button" className="joker-edit-order__search-result" onClick={() => addProduct(product)}>
                        <span>
                          <strong>{product.name}</strong>
                          <span className="joker-order-item__excluded"> · {product.category}</span>
                        </span>
                        <span>{formatPrice(product.price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="joker-empty-state">No se encontraron productos.</p>
              )
            ) : null}
          </div>

          <div className="joker-edit-order__lines">
            {lines.length ? (
              lines.map((line) => (
                <div key={line.productId} className="joker-edit-order__row">
                  <div className="joker-edit-order__row-info">
                    <strong>{line.productName}</strong>
                    <span className="joker-order-item__excluded">{formatPrice(line.unitPrice)} c/u</span>
                    {line.detail ? <span className="joker-order-item__excluded">{line.detail}</span> : null}
                  </div>

                  <div className="joker-edit-order__row-controls">
                    <div className="joker-quantity-stepper">
                      <button
                        type="button"
                        className="joker-quantity-stepper__btn"
                        onClick={() => adjustQuantity(line.productId, -1)}
                        aria-label={`Restar ${line.productName}`}
                      >
                        -
                      </button>
                      <span className="joker-quantity-stepper__value">{line.quantity}</span>
                      <button
                        type="button"
                        className="joker-quantity-stepper__btn"
                        onClick={() => adjustQuantity(line.productId, 1)}
                        aria-label={`Sumar ${line.productName}`}
                      >
                        +
                      </button>
                    </div>

                    <strong className="joker-edit-order__row-total">{formatPrice(line.unitPrice * line.quantity)}</strong>

                    <button
                      type="button"
                      className="joker-order-item__remove"
                      onClick={() => removeLine(line.productId)}
                      aria-label={`Sacar ${line.productName} del pedido`}
                    >
                      x
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="joker-empty-state">
                Sacaste todos los productos. Para eliminar el pedido completo, cerrá esta edición y usá "Eliminar pedido"
                en el panel.
              </p>
            )}
          </div>

          <div className="joker-edit-order__footer">
            <div className="joker-edit-order__totals">
              {total !== originalTotal ? (
                <span className="joker-order-item__excluded joker-edit-order__totals-before">Antes: {formatPrice(originalTotal)}</span>
              ) : null}
              <strong className="joker-edit-order__totals-now">Total: {formatPrice(total)}</strong>
            </div>

            <div className="joker-modal-card__actions">
              <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSaving}>
                Cancelar edición
              </button>
              <button
                type="button"
                className="joker-button joker-button--primary"
                onClick={handleSaveClick}
                disabled={isSaving || !lines.length}
              >
                {isSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
