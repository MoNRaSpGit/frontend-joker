import { useState } from "react";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import type { JokerProductInput } from "../joker.api";
import type { JokerProduct } from "../joker.types";

type ProductFormModalProps = {
  product: JokerProduct | null;
  categories: string[];
  onClose: () => void;
  onSave: (input: JokerProductInput) => Promise<void>;
  onDelete?: (product: JokerProduct) => Promise<boolean>;
};

export function ProductFormModal({ product, categories, onClose, onSave, onDelete }: ProductFormModalProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(product);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedCategory = category.trim() || "Otros";
    const parsedPrice = Number(price);

    if (!trimmedName) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setError("El precio tiene que ser un numero valido.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({ name: trimmedName, category: trimmedCategory, price: parsedPrice });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el producto.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!product || !onDelete) return;

    setIsDeleting(true);
    const success = await onDelete(product);
    setIsDeleting(false);

    // Si fallo, el aviso ya salio por toast (mismo camino que el borrado
    // desde la lista): se deja el modal de confirmacion abierto por si
    // quiere reintentar.
    if (success) {
      onClose();
    }
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? "Editar producto" : "Nuevo producto"}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{isEditing ? "Editar producto" : "Nuevo producto"}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="joker-form-field">
            <span>Nombre</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </label>

          <label className="joker-form-field">
            <span>Categoria</span>
            <input
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              disabled={isSaving}
              list="joker-category-options"
              placeholder="Ej: Hamburguesas"
            />
            <datalist id="joker-category-options">
              {categories.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption} />
              ))}
            </datalist>
          </label>

          <label className="joker-form-field">
            <span>Precio</span>
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={isSaving}
            />
          </label>

          {error ? <p className="joker-order-item__excluded">{error}</p> : null}

          <div className="joker-modal-card__actions">
            {isEditing && onDelete ? (
              <button
                type="button"
                className="joker-button joker-button--danger"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isSaving}
              >
                Eliminar
              </button>
            ) : null}
            <button type="button" className="joker-button joker-button--ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </button>
            <button type="submit" className="joker-button joker-button--primary" disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>

      {isConfirmingDelete && product ? (
        <ConfirmDeleteModal
          title="Eliminar producto"
          message={`Queres eliminar "${product.name}"?`}
          isDeleting={isDeleting}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </div>
  );
}
