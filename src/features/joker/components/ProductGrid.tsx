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
  const filteredProducts = normalizedSearch
    ? products.filter((product) => normalizeForSearch(product.name).includes(normalizedSearch))
    : products;

  const groups = groupByCategory(filteredProducts);

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Menu</p>
        <h2>Elegi un producto</h2>
      </div>

      <input
        type="search"
        className="joker-search-input"
        placeholder="Buscar producto..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
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
          {normalizedSearch ? "No se encontraron productos." : "Todavia no hay productos cargados."}
        </p>
      )}
    </section>
  );
}
