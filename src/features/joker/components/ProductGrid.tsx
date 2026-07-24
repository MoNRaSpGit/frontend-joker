import { useState } from "react";
import type { JokerProduct } from "../joker.types";

type ProductGridProps = {
  products: JokerProduct[];
  onSelectProduct: (product: JokerProduct) => void;
};

function formatPrice(price: number) {
  return price.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

const DIACRITIC_MARKS_PATTERN = /[̀-ͯ]/g;

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(DIACRITIC_MARKS_PATTERN, "")
    .toLowerCase()
    .trim();
}

function groupByCategory(products: JokerProduct[]) {
  const groups = new Map<string, JokerProduct[]>();

  for (const product of products) {
    const existing = groups.get(product.category) ?? [];
    existing.push(product);
    groups.set(product.category, existing);
  }

  return Array.from(groups.entries());
}

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const normalizedSearch = normalizeForSearch(search);

  const allCategories = Array.from(new Set(products.map((product) => product.category)));
  const matchingCategories =
    !categoryFilter && normalizedSearch
      ? allCategories.filter((category) => normalizeForSearch(category).includes(normalizedSearch))
      : [];

  const visibleProducts = categoryFilter
    ? products.filter((product) => product.category === categoryFilter)
    : normalizedSearch
      ? products.filter((product) => normalizeForSearch(product.name).includes(normalizedSearch))
      : [];

  const groups = groupByCategory(visibleProducts);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCategoryFilter(null);
  }

  function toggleCategoryFilter(category: string) {
    setCategoryFilter((current) => (current === category ? null : category));
  }

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Menu</p>
        <h2>Buscar producto</h2>
      </div>

      <input
        type="search"
        className="joker-search-input"
        placeholder="Buscar producto o categoria (ej: Hamburguesas)..."
        value={search}
        onChange={(event) => handleSearchChange(event.target.value)}
        autoFocus
      />

      {categoryFilter ? (
        <div className="joker-category-chips">
          <button type="button" className="joker-category-chip is-active" onClick={() => toggleCategoryFilter(categoryFilter)}>
            {categoryFilter} ✕
          </button>
        </div>
      ) : matchingCategories.length ? (
        <div className="joker-category-chips">
          {matchingCategories.map((category) => (
            <button type="button" key={category} className="joker-category-chip" onClick={() => toggleCategoryFilter(category)}>
              Todas: {category}
            </button>
          ))}
        </div>
      ) : null}

      {groups.length ? (
        groups.map(([category, categoryProducts]) => (
          <div key={category} className="joker-product-category">
            <h3 className="joker-product-category__title">{category}</h3>
            <div className="joker-product-grid">
              {categoryProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="joker-product-card"
                  onClick={() => onSelectProduct(product)}
                >
                  <strong>{product.name}</strong>
                  <span className="joker-product-card__price">{formatPrice(product.price)}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="joker-empty-state">
          {normalizedSearch || categoryFilter ? "No se encontraron productos." : "Busca un producto o una categoria para empezar."}
        </p>
      )}
    </section>
  );
}
