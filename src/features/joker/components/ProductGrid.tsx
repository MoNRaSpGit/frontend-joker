import { useState } from "react";
import { splitVariantLabel } from "../joker.variants";
import type { JokerProduct } from "../joker.types";

type ProductGridProps = {
  products: JokerProduct[];
  onSelectProduct: (variants: JokerProduct[]) => void;
};

type ProductGroup = {
  baseName: string;
  variants: JokerProduct[];
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

// Agrupa por categoria y, dentro de cada categoria, por el nombre base
// del producto (sin la variante) — asi "Pizza con Muzzarella (Metro)",
// "(Medio metro)", etc. quedan como una sola tarjeta con sus opciones
// adentro, en vez de una tarjeta por cada tamaño.
function groupByCategory(products: JokerProduct[]) {
  const categories = new Map<string, Map<string, ProductGroup>>();

  for (const product of products) {
    const { baseName } = splitVariantLabel(product.name);
    const groups = categories.get(product.category) ?? new Map<string, ProductGroup>();
    const group = groups.get(baseName) ?? { baseName, variants: [] };
    group.variants.push(product);
    groups.set(baseName, group);
    categories.set(product.category, groups);
  }

  return Array.from(categories.entries()).map(
    ([category, groups]) => [category, Array.from(groups.values())] as [string, ProductGroup[]]
  );
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
        groups.map(([category, categoryGroups]) => (
          <div key={category} className="joker-product-category">
            <h3 className="joker-product-category__title">{category}</h3>
            <div className="joker-product-grid">
              {categoryGroups.map((group) => {
                const hasVariants = group.variants.length > 1;
                const prices = group.variants.map((variant) => variant.price);
                const minPrice = Math.min(...prices);

                return (
                  <button
                    key={group.baseName}
                    type="button"
                    className="joker-product-card"
                    onClick={() => onSelectProduct(group.variants)}
                  >
                    <strong>{group.baseName}</strong>
                    <span className="joker-product-card__price">
                      {hasVariants ? `Desde ${formatPrice(minPrice)}` : formatPrice(group.variants[0].price)}
                    </span>
                  </button>
                );
              })}
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
