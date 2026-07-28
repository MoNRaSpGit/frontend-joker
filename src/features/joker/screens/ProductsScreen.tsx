import { useState } from "react";
import { toast } from "react-toastify";
import { ProductFormModal } from "../components/ProductFormModal";
import { createProduct, deleteProduct, updateProduct, type JokerProductInput } from "../joker.api";
import type { JokerProduct } from "../joker.types";

type ProductsScreenProps = {
  products: JokerProduct[];
  isLoading: boolean;
  loadError: string | null;
  onReload: () => void;
};

function formatPrice(price: number) {
  return price.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

export function ProductsScreen({ products, isLoading, loadError, onReload }: ProductsScreenProps) {
  const [editingProduct, setEditingProduct] = useState<JokerProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categories = Array.from(new Set(products.map((product) => product.category))).sort();
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = normalizedQuery
    ? products.filter(
        (product) =>
          product.name.toLowerCase().includes(normalizedQuery) || product.category.toLowerCase().includes(normalizedQuery)
      )
    : [];

  function openNewProductForm() {
    setEditingProduct(null);
    setIsFormOpen(true);
  }

  function openEditProductForm(product: JokerProduct) {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  async function handleSave(input: JokerProductInput) {
    if (editingProduct) {
      await updateProduct(editingProduct.id, input);
      toast.success("Producto actualizado.");
    } else {
      await createProduct(input);
      toast.success("Producto agregado.");
    }
    onReload();
  }

  async function handleDelete(product: JokerProduct) {
    if (!window.confirm(`Eliminar "${product.name}" del menu?`)) {
      return;
    }

    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      toast.success("Producto eliminado.");
      onReload();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el producto.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="joker-panel">
      <div className="joker-panel__heading joker-panel__heading--row">
        <div>
          <p className="joker-eyebrow">Menu</p>
          <h2>Productos</h2>
        </div>
        <button type="button" className="joker-button joker-button--primary joker-button--auto" onClick={openNewProductForm}>
          + Nuevo producto
        </button>
      </div>

      {isLoading ? (
        <p className="joker-empty-state">Cargando productos...</p>
      ) : loadError ? (
        <div>
          <p className="joker-order-item__excluded">No se pudo cargar el menu: {loadError}</p>
          <button type="button" className="joker-button joker-button--ghost" onClick={onReload}>
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            className="joker-search-input"
            placeholder="Buscar producto o categoria..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          {filteredProducts.length ? (
            <ul className="joker-order-list top-gap">
              {filteredProducts.map((product) => (
                <li key={product.id} className="joker-order-item">
                  <button type="button" className="joker-product-list-name" onClick={() => openEditProductForm(product)}>
                    <strong>{product.name}</strong>
                    <p className="joker-order-item__excluded joker-order-item__excluded--full">
                      {product.category} · {formatPrice(product.price)}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="joker-order-item__remove"
                    onClick={() => handleDelete(product)}
                    disabled={deletingId === product.id}
                    aria-label={`Eliminar ${product.name}`}
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="joker-empty-state top-gap">
              {normalizedQuery ? "No se encontraron productos." : "Busca un producto para editarlo."}
            </p>
          )}
        </>
      )}

      {isFormOpen ? (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      ) : null}
    </section>
  );
}
