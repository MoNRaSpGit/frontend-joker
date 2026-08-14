import type { JokerStockItem } from "../joker.types";
import { clampDisplayQuantity, getStockSeverity } from "../stock.utils";

type LowStockBoardProps = {
  items: JokerStockItem[];
  onEditItem: (item: JokerStockItem) => void;
  maxItems?: number;
};

// Tarjetas que solo aparecen cuando a un insumo le queda poco (amarillo) o
// muy poco (rojo) -- panel de alertas, no un inventario completo.
export function LowStockBoard({ items, onEditItem, maxItems }: LowStockBoardProps) {
  const lowStockItems = items
    .filter((item) => getStockSeverity(item) !== null)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, maxItems);

  if (!lowStockItems.length) {
    return null;
  }

  return (
    <section className="joker-panel top-gap">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Alertas</p>
        <h2>Stock bajo</h2>
      </div>

      <div className="joker-food-stock-grid joker-food-stock-grid--large">
        {lowStockItems.map((item) => {
          const severity = getStockSeverity(item);
          return (
            <div key={item.id} className={`joker-food-stock-card joker-food-stock-card--large joker-food-stock-card--${severity}`}>
              <span className="joker-food-stock-card__name">{item.name}</span>
              <span className="joker-food-stock-card__qty">
                {clampDisplayQuantity(item.quantity)} <small>{item.unit}</small>
              </span>
              <button type="button" className="joker-button joker-button--ghost joker-food-stock-card__edit" onClick={() => onEditItem(item)}>
                Editar
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
