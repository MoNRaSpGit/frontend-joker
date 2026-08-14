import type { JokerStockItem, JokerStockItemCategory } from "../joker.types";
import { getStockSeverity, resolveCategoryIcon, resolveFoodIcon } from "../stock.utils";

type LowStockBoardProps = {
  items: JokerStockItem[];
  onEditItem: (item: JokerStockItem) => void;
};

const CATEGORY_ORDER: JokerStockItemCategory[] = ["comida", "bebida", "otro"];

const CATEGORY_LABELS: Record<JokerStockItemCategory, string> = {
  comida: "Comidas",
  bebida: "Bebidas",
  otro: "Otros"
};

function resolveIcon(item: JokerStockItem): string {
  return item.category === "comida" ? resolveFoodIcon(item.name) : resolveCategoryIcon(item.category);
}

// Tarjetas que solo aparecen cuando a un insumo le queda poco (amarillo) o
// muy poco (rojo). A diferencia de FoodStockBoard, aca no se muestra nada
// si el stock esta comodo -- es un panel de alertas, no un inventario
// completo.
export function LowStockBoard({ items, onEditItem }: LowStockBoardProps) {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items
      .filter((item) => item.category === category && getStockSeverity(item) !== null)
      .sort((a, b) => a.name.localeCompare(b.name))
  })).filter((group) => group.items.length);

  if (!grouped.length) {
    return null;
  }

  return (
    <section className="joker-panel top-gap">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Alertas</p>
        <h2>Stock bajo</h2>
      </div>

      {grouped.map(({ category, items: groupItems }) => (
        <div key={category}>
          <p className="joker-food-stock-group-label">{CATEGORY_LABELS[category]}</p>
          <div className="joker-food-stock-grid">
            {groupItems.map((item) => {
              const severity = getStockSeverity(item);
              return (
                <div key={item.id} className={`joker-food-stock-card joker-food-stock-card--${severity}`}>
                  <span className="joker-food-stock-card__icon">{resolveIcon(item)}</span>
                  <span className="joker-food-stock-card__name">{item.name}</span>
                  <span className="joker-food-stock-card__qty">
                    {item.quantity} <small>{item.unit}</small>
                  </span>
                  <button
                    type="button"
                    className="joker-button joker-button--ghost joker-food-stock-card__edit"
                    onClick={() => onEditItem(item)}
                  >
                    Editar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
