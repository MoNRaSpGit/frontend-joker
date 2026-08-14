import { useState } from "react";
import type { JokerStockItem } from "../joker.types";
import { clampDisplayQuantity, resolveCategoryIcon, resolveFoodIcon } from "../stock.utils";

type StockSearchProps = {
  items: JokerStockItem[];
  onEditItem: (item: JokerStockItem) => void;
  showIcons: boolean;
};

function resolveIcon(item: JokerStockItem): string {
  return item.category === "comida" ? resolveFoodIcon(item.name) : resolveCategoryIcon(item.category);
}

export function StockSearch({ items, onEditItem, showIcons }: StockSearchProps) {
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const results = trimmedQuery ? items.filter((item) => item.name.toLowerCase().includes(trimmedQuery)) : [];

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Buscar</p>
        <h2>Insumos</h2>
      </div>

      <input
        type="search"
        className="joker-search-input"
        placeholder="Buscar insumo por nombre..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {trimmedQuery ? (
        results.length ? (
          <ul className="joker-order-list top-gap">
            {results.map((item) => (
              <li key={item.id} className="joker-order-item joker-order-item--flat">
                <span>
                  {showIcons ? `${resolveIcon(item)} ` : ""}
                  {item.name}{" "}
                  <span className="joker-order-item__excluded">
                    ({clampDisplayQuantity(item.quantity)} {item.unit})
                  </span>
                </span>
                <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={() => onEditItem(item)}>
                  Editar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state top-gap">No se encontraron insumos con ese nombre.</p>
        )
      ) : null}
    </section>
  );
}
