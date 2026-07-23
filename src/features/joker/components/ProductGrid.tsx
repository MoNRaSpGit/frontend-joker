import type { JokerProduct } from "../joker.types";

type ProductGridProps = {
  products: JokerProduct[];
  onSelectProduct: (product: JokerProduct) => void;
};

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  return (
    <section className="joker-panel">
      <div className="joker-panel__heading">
        <p className="joker-eyebrow">Menu</p>
        <h2>Elegi un producto</h2>
      </div>

      <div className="joker-product-grid">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            className="joker-product-card"
            onClick={() => onSelectProduct(product)}
          >
            <strong>{product.name}</strong>
            <span>{product.ingredients.length} ingredientes</span>
          </button>
        ))}
      </div>
    </section>
  );
}
