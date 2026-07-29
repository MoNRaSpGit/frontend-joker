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

  const normalizedSearch = normalizeForSearch(search);
  const visibleProducts = normalizedSearch
    ? products.filter(
        (product) =>
          normalizeForSearch(product.name).includes(normalizedSearch) ||
          normalizeForSearch(product.category).includes(normalizedSearch)
      )
    : [];

  // Prioriza la categoria cuyo nombre coincide con lo buscado (ej. buscar
  // "hamb" muestra primero "Hamburguesas" y despues otras categorias que
  // solo matchean por el nombre de un producto suelto, como "Carnes y
  // Anexos" por "Hamburguesas Centenario").
  const groups = groupByCategory(visibleProducts).sort(([categoryA], [categoryB]) => {
    const aMatches = normalizeForSearch(categoryA).includes(normalizedSearch);
    const bMatches = normalizeForSearch(categoryB).includes(normalizedSearch);
    if (aMatches !== bMatches) return aMatches ? -1 : 1;
    return categoryA.localeCompare(categoryB, "es");
  });

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
        onChange={(event) => setSearch(event.target.value)}
        autoFocus
      />

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
          {normalizedSearch ? "No se encontraron productos." : "Busca un producto o una categoria para empezar."}
        </p>
      )}
    </section>
  );
}
