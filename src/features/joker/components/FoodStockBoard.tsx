import type { JokerStockItem } from "../joker.types";

type FoodStockBoardProps = {
  items: JokerStockItem[];
};

// Icono por palabra clave del nombre del insumo. El orden importa: "pancho"
// contiene "pan", asi que hay que revisar los mas especificos primero.
function resolveFoodIcon(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("papas")) return "🍟";
  if (lower.includes("pancho") || lower.includes("chorizo")) return "🌭";
  if (lower.includes("churrasco")) return "🥩";
  if (lower.includes("burger")) return "🍔";
  if (lower.includes("pan")) return "🍞";
  return "📦";
}

export function FoodStockBoard({ items }: FoodStockBoardProps) {
  const foodItems = items.filter((item) => item.category === "comida").sort((a, b) => a.name.localeCompare(b.name));

  if (!foodItems.length) {
    return null;
  }

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">En vivo</p>
        <h2>Stock de comidas</h2>
      </div>

      <div className="joker-food-stock-grid">
        {foodItems.map((item) => {
          const isOut = item.quantity <= 0;
          return (
            <div key={item.id} className={`joker-food-stock-card${isOut ? " joker-food-stock-card--out" : ""}`}>
              <span className="joker-food-stock-card__icon">{resolveFoodIcon(item.name)}</span>
              <span className="joker-food-stock-card__name">{item.name}</span>
              <span className="joker-food-stock-card__qty">
                {item.quantity} <small>{item.unit}</small>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
