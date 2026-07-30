import { useEffect, useState } from "react";
import { parseChoiceGroups, parseIngredientList, splitVariantLabel } from "../joker.variants";
import type { JokerProduct } from "../joker.types";

type CustomizeMode = "cliente" | "dev";

type CustomizeProductModalProps = {
  variants: JokerProduct[];
  allProducts?: JokerProduct[];
  mode?: CustomizeMode;
  initialDetail?: string;
  initialQuantity?: number;
  isEditing?: boolean;
  onClose: () => void;
  onConfirm: (variant: JokerProduct, detail: string, quantity: number) => void;
};

function formatPrice(price: number) {
  return price.toLocaleString("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: 0 });
}

// Acepta tanto coma como punto decimal (58,35 o 58.35): los precios
// editados a mano suelen quedar con fraccion, ej. despues de un descuento.
function parsePriceInput(value: string) {
  return Number(value.trim().replace(",", "."));
}

export function CustomizeProductModal({
  variants,
  allProducts = [],
  mode = "cliente",
  initialDetail = "",
  initialQuantity = 1,
  isEditing = false,
  onClose,
  onConfirm
}: CustomizeProductModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detail, setDetail] = useState(initialDetail);
  const [quantity, setQuantity] = useState(initialQuantity);
  const [excludedIngredients, setExcludedIngredients] = useState<Set<string>>(new Set());
  const [selectedExtraIds, setSelectedExtraIds] = useState<Set<number>>(new Set());
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string | null>>({});
  // Solo se usa (y se muestra) al editar un item ya agregado al pedido:
  // permite corregir el precio a mano, por ejemplo si se cargo mal o si
  // se pacto un precio distinto con el cliente.
  const [manualPrice, setManualPrice] = useState(() => String(variants[0]?.price ?? 0));
  const [priceError, setPriceError] = useState<string | null>(null);

  const selectedVariant = variants[selectedIndex];
  const { baseName } = splitVariantLabel(selectedVariant.name);
  const hasVariants = variants.length > 1;
  const isDev = mode === "dev";

  const ingredientList = isDev ? parseIngredientList(selectedVariant.ingredients) : [];
  const choiceGroups = isDev ? parseChoiceGroups(selectedVariant.observations) : [];
  const extrasForCategory = isDev
    ? allProducts.filter(
        (product) =>
          product.category === selectedVariant.category && product.productType === "extra" && product.status !== "draft"
      )
    : [];
  const selectedExtras = extrasForCategory.filter((extra) => selectedExtraIds.has(extra.id));
  const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
  const totalPrice = selectedVariant.price + extrasTotal;

  // Al cambiar de variante (ej. tamaño de pizza) las elecciones de
  // ingredientes/extras/salsa se reinician: puede que ni siquiera
  // apliquen a la nueva variante.
  useEffect(() => {
    setExcludedIngredients(new Set());
    setSelectedExtraIds(new Set());
    setSelectedChoices({});
  }, [selectedIndex]);

  function toggleIngredient(ingredient: string) {
    setExcludedIngredients((current) => {
      const next = new Set(current);
      if (next.has(ingredient)) {
        next.delete(ingredient);
      } else {
        next.add(ingredient);
      }
      return next;
    });
  }

  function toggleExtra(extraId: number) {
    setSelectedExtraIds((current) => {
      const next = new Set(current);
      if (next.has(extraId)) {
        next.delete(extraId);
      } else {
        next.add(extraId);
      }
      return next;
    });
  }

  function handleConfirm() {
    let finalPrice = isDev ? totalPrice : selectedVariant.price;

    if (isEditing) {
      const parsedPrice = parsePriceInput(manualPrice);
      if (!manualPrice.trim() || Number.isNaN(parsedPrice) || parsedPrice < 0) {
        setPriceError("El precio tiene que ser un numero valido.");
        return;
      }
      setPriceError(null);
      finalPrice = parsedPrice;
    }

    if (isDev) {
      const parts: string[] = [];
      if (excludedIngredients.size) {
        parts.push(Array.from(excludedIngredients).map((ingredient) => `Sin ${ingredient}`).join(", "));
      }
      if (selectedExtras.length) parts.push(`Con ${selectedExtras.map((extra) => extra.name).join(", ")}`);
      for (const group of choiceGroups) {
        const choice = selectedChoices[group.label];
        if (choice) parts.push(`${group.label}: ${choice}`);
      }
      if (detail.trim()) parts.push(detail.trim());

      onConfirm({ ...selectedVariant, price: finalPrice }, parts.join(" · "), quantity);
    } else {
      onConfirm({ ...selectedVariant, price: finalPrice }, detail.trim(), quantity);
    }
    onClose();
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(99, current + 1));
  }

  return (
    <div className="joker-modal-overlay" role="dialog" aria-modal="true" aria-label={`Personalizar ${baseName}`}>
      <div className="joker-modal-card">
        <div className="joker-modal-card__header">
          <h2>{baseName}</h2>
          <button type="button" className="joker-modal-close" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {hasVariants && isDev ? (
          <>
            <p className="joker-modal-card__hint">Elegí una opción</p>
            <div className="joker-category-chips">
              {variants.map((variant, index) => {
                const { variantLabel } = splitVariantLabel(variant.name);
                return (
                  <button
                    key={variant.id}
                    type="button"
                    className={`joker-category-chip${index === selectedIndex ? " is-active" : ""}`}
                    onClick={() => setSelectedIndex(index)}
                  >
                    {variantLabel ?? variant.name}
                  </button>
                );
              })}
            </div>
            <p className="joker-product-card__price">{formatPrice(selectedVariant.price)}</p>
          </>
        ) : null}

        {isDev && ingredientList.length ? (
          <>
            <p className="joker-modal-card__hint">Ingredientes (destildá lo que no va)</p>
            <div className="joker-checklist">
              {ingredientList.map((ingredient) => (
                <label key={ingredient} className="joker-checklist-item">
                  <input
                    type="checkbox"
                    checked={!excludedIngredients.has(ingredient)}
                    onChange={() => toggleIngredient(ingredient)}
                  />
                  <span>{ingredient}</span>
                </label>
              ))}
            </div>
          </>
        ) : null}

        {isDev && extrasForCategory.length ? (
          <>
            <p className="joker-modal-card__hint">Extras</p>
            <div className="joker-checklist">
              {extrasForCategory.map((extra) => (
                <label key={extra.id} className="joker-checklist-item">
                  <input type="checkbox" checked={selectedExtraIds.has(extra.id)} onChange={() => toggleExtra(extra.id)} />
                  <span>{extra.name}</span>
                  <span className="joker-amount-plus">+{formatPrice(extra.price)}</span>
                </label>
              ))}
            </div>
          </>
        ) : null}

        {isDev
          ? choiceGroups.map((group) => (
              <div key={group.label}>
                <p className="joker-modal-card__hint">{group.label}</p>
                <div className="joker-category-chips">
                  {group.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`joker-category-chip${selectedChoices[group.label] === option ? " is-active" : ""}`}
                      onClick={() =>
                        setSelectedChoices((current) => ({
                          ...current,
                          [group.label]: current[group.label] === option ? null : option
                        }))
                      }
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))
          : null}

        {isDev && extrasTotal > 0 ? <p className="joker-product-card__price">Total: {formatPrice(totalPrice)}</p> : null}

        {isEditing ? (
          <label className="joker-form-field">
            <span>Precio unitario</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ej: 58,35"
              value={manualPrice}
              onChange={(event) => {
                setManualPrice(event.target.value);
                setPriceError(null);
              }}
            />
          </label>
        ) : null}
        {priceError ? <p className="joker-order-item__excluded">{priceError}</p> : null}

        <p className="joker-modal-card__hint">Cantidad</p>

        <div className="joker-quantity-stepper">
          <button type="button" className="joker-quantity-stepper__btn" onClick={decreaseQuantity} disabled={quantity <= 1}>
            -
          </button>
          <span className="joker-quantity-stepper__value">{quantity}</span>
          <button type="button" className="joker-quantity-stepper__btn" onClick={increaseQuantity} disabled={quantity >= 99}>
            +
          </button>
        </div>

        {isEditing ? (
          <p className="joker-product-card__price">
            Total linea: {formatPrice((parsePriceInput(manualPrice) || 0) * quantity)}
          </p>
        ) : null}

        <p className="joker-modal-card__hint">
          {isDev ? "Notas adicionales (opcional)" : "Detalle del pedido (ej: Sin lechuga, con doble queso)."}
        </p>

        <textarea
          className="joker-detail-input"
          rows={isDev ? 2 : 4}
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          placeholder={isDev ? "Otra aclaracion si hace falta..." : "Escribi aca el detalle..."}
          autoFocus={!isDev || !hasVariants}
        />

        <div className="joker-modal-card__actions">
          <button type="button" className="joker-button joker-button--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="joker-button joker-button--primary" onClick={handleConfirm}>
            {isEditing ? "Guardar cambios" : "Agregar al pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
