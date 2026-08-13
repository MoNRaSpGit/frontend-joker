import type { JokerStockItem } from "../joker.types";

type FoodStockBoardProps = {
  items: JokerStockItem[];
  onEditItem: (item: JokerStockItem) => void;
};

const GROUP_CARNES = 0;
const GROUP_PANES = 1;
const GROUP_OTROS = 2;

const GROUP_LABELS: Record<number, string> = {
  [GROUP_CARNES]: "Carnes",
  [GROUP_PANES]: "Panes",
  [GROUP_OTROS]: "Otros"
};

function resolveFoodGroup(name: string): number {
  const lower = name.toLowerCase();
  if (lower.startsWith("churrasco") || lower.includes("burger") || lower.includes("chorizo")) return GROUP_CARNES;
  if (lower.includes("pancho") && !lower.includes("pan de")) return GROUP_CARNES;
  if (lower.startsWith("pan")) return GROUP_PANES;
  return GROUP_OTROS;
}

// Icono especifico por tipo de corte/pan, no uno solo para todos los
// churrascos o todos los panes: asi se distingue de un vistazo cual es cual.
function resolveFoodIcon(name: string): string {
  const lower = name.toLowerCase();

  if (lower.includes("papas")) return "🍟";
  if (lower.includes("pancho") && !lower.includes("pan de")) return "🌭";
  if (lower.includes("chorizo")) return "🥓";
  if (lower.includes("burger")) return "🍔";

  if (lower.startsWith("churrasco")) {
    if (lower.includes("milanesa")) return "🍖";
    if (lower.includes("pollo")) return "🍗";
    if (lower.includes("chivito")) return "🥩";
    if (lower.includes("hamburguesa")) return "🍔";
    return "🥩";
  }

  if (lower.startsWith("pan")) {
    if (lower.includes("queso")) return "🧀";
    if (lower.includes("tortuga")) return "🍞";
    if (lower.includes("pancho")) return "🥖";
    if (lower.includes("chivito")) return "🥙";
    if (lower.includes("sandwich")) return "🫓";
    if (lower.includes("jambi")) return "🥐";
    return "🍞";
  }

  return "📦";
}

export function FoodStockBoard({ items, onEditItem }: FoodStockBoardProps) {
  const foodItems = items
    .filter((item) => item.category === "comida")
    .sort((a, b) => resolveFoodGroup(a.name) - resolveFoodGroup(b.name) || a.name.localeCompare(b.name));

  if (!foodItems.length) {
    return null;
  }

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">En vivo</p>
        <h2>Stock de comidas</h2>
      </div>

      {[GROUP_CARNES, GROUP_PANES, GROUP_OTROS].map((group) => {
        const groupItems = foodItems.filter((item) => resolveFoodGroup(item.name) === group);
        if (!groupItems.length) return null;

        return (
          <div key={group}>
            <p className="joker-food-stock-group-label">{GROUP_LABELS[group]}</p>
            <div className="joker-food-stock-grid">
              {groupItems.map((item) => {
                const isOut = item.quantity <= 0;
                return (
                  <div key={item.id} className={`joker-food-stock-card${isOut ? " joker-food-stock-card--out" : ""}`}>
                    <span className="joker-food-stock-card__icon">{resolveFoodIcon(item.name)}</span>
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
        );
      })}
    </section>
  );
}
