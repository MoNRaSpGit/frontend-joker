import type { JokerProduct } from "../joker.types";

type ProductGridProps = {
  products: JokerProduct[];
  onSelectProduct: (product: JokerProduct) => void;
};

function formatPrice(price: number) {
  return price.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
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
  const groups = groupByCategory(products);

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Menu</p>
        <h2>Elegi un producto</h2>
      </div>

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
                  <span>{formatPrice(product.price)}</span>
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="joker-empty-state">Todavia no hay productos cargados.</p>
      )}
    </section>
  );
}
