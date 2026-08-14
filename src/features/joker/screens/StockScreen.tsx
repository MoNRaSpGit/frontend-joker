import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { FoodStockBoard } from "../components/FoodStockBoard";
import { LowStockBoard } from "../components/LowStockBoard";
import { StockItemEditModal } from "../components/StockItemEditModal";
import { StockSearch } from "../components/StockSearch";
import {
  bulkApplyRecipe,
  createStockItem,
  deleteStockItem,
  getProductRecipe,
  listStockItems,
  restockItem,
  setProductRecipe,
  updateStockItemQuantity
} from "../joker.api";
import type { JokerProduct, JokerStockItem, JokerStockItemCategory } from "../joker.types";

const STOCK_REFRESH_INTERVAL_MS = 15000;

// Por ahora solo se muestra el tablero de comidas (En vivo). El resto
// (alta de insumos, lista completa, editor de recetas) queda armado pero
// oculto hasta que se decida si hace falta mostrarlo.
const SHOW_STOCK_ADMIN_TOOLS = false;

type StockScreenProps = {
  products: JokerProduct[];
};

type DraftRecipeLine = {
  stockItemId: string;
  quantityPerUnit: string;
};

function emptyDraftLine(): DraftRecipeLine {
  return { stockItemId: "", quantityPerUnit: "1" };
}

export function StockScreen({ products }: StockScreenProps) {
  const [stockItems, setStockItems] = useState<JokerStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newItemName, setNewItemName] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("unidad");
  const [newItemCategory, setNewItemCategory] = useState<JokerStockItemCategory>("comida");
  const [newItemQuantity, setNewItemQuantity] = useState("0");
  const [isSavingItem, setIsSavingItem] = useState(false);

  const [restockDrafts, setRestockDrafts] = useState<Record<number, string>>({});
  const [restockingId, setRestockingId] = useState<number | null>(null);

  const [editingItem, setEditingItem] = useState<JokerStockItem | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [comidaViewMode, setComidaViewMode] = useState<"todo" | "bajo">("todo");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [recipeLines, setRecipeLines] = useState<DraftRecipeLine[]>([]);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  const productOptions = useMemo(() => [...products].sort((a, b) => a.name.localeCompare(b.name)), [products]);
  const selectedProduct = productOptions.find((product) => String(product.id) === selectedProductId) ?? null;

  useEffect(() => {
    void loadStockItems();

    // Refresco silencioso: el tablero de comidas se usa para mirar en vivo
    // como baja el stock a medida que entran pedidos desde otra pantalla.
    const intervalId = window.setInterval(() => void loadStockItems(true), STOCK_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      setRecipeLines([]);
      return;
    }
    void loadRecipe(Number(selectedProductId));
  }, [selectedProductId]);

  async function loadStockItems(silent = false) {
    if (!silent) {
      setIsLoading(true);
      setLoadError(null);
    }
    try {
      const result = await listStockItems();
      setStockItems(result.items);
    } catch (error) {
      if (!silent) {
        setLoadError(error instanceof Error ? error.message : "No se pudo cargar el stock.");
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }

  async function loadRecipe(productId: number) {
    setIsLoadingRecipe(true);
    try {
      const result = await getProductRecipe(productId);
      setRecipeLines(
        result.items.length
          ? result.items.map((line) => ({ stockItemId: String(line.stockItemId), quantityPerUnit: String(line.quantityPerUnit) }))
          : [emptyDraftLine()]
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar la receta.");
    } finally {
      setIsLoadingRecipe(false);
    }
  }

  async function handleCreateStockItem() {
    const trimmedName = newItemName.trim();
    if (!trimmedName) {
      toast.error("Ponele un nombre al insumo.");
      return;
    }

    setIsSavingItem(true);
    try {
      await createStockItem(trimmedName, newItemUnit.trim() || "unidad", Number(newItemQuantity) || 0, newItemCategory);
      setNewItemName("");
      setNewItemQuantity("0");
      toast.success("Insumo agregado.");
      await loadStockItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo agregar el insumo.");
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleSaveEdit(quantity: number) {
    if (!editingItem) return;

    setIsSavingEdit(true);
    try {
      await updateStockItemQuantity(editingItem.id, quantity);
      toast.success("Stock actualizado.");
      setEditingItem(null);
      await loadStockItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el stock.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleRestock(stockItem: JokerStockItem) {
    const rawValue = restockDrafts[stockItem.id];
    const parsed = Number(rawValue);
    if (!rawValue || !Number.isFinite(parsed) || parsed === 0) {
      toast.error("Ingresa una cantidad valida.");
      return;
    }

    setRestockingId(stockItem.id);
    try {
      await restockItem(stockItem.id, parsed);
      setRestockDrafts((current) => ({ ...current, [stockItem.id]: "" }));
      toast.success("Stock actualizado.");
      await loadStockItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el stock.");
    } finally {
      setRestockingId(null);
    }
  }

  async function handleDeleteStockItem(stockItem: JokerStockItem) {
    try {
      await deleteStockItem(stockItem.id);
      toast.success("Insumo eliminado.");
      await loadStockItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo eliminar el insumo.");
    }
  }

  function updateRecipeLine(index: number, patch: Partial<DraftRecipeLine>) {
    setRecipeLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addRecipeLine() {
    setRecipeLines((current) => [...current, emptyDraftLine()]);
  }

  function removeRecipeLine(index: number) {
    setRecipeLines((current) => current.filter((_, i) => i !== index));
  }

  function buildRecipePayload(): Array<{ stockItemId: number; quantityPerUnit: number }> | null {
    const payload: Array<{ stockItemId: number; quantityPerUnit: number }> = [];
    for (const line of recipeLines) {
      if (!line.stockItemId) continue;
      const quantity = Number(line.quantityPerUnit);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        toast.error("Las cantidades de la receta tienen que ser mayores a 0.");
        return null;
      }
      payload.push({ stockItemId: Number(line.stockItemId), quantityPerUnit: quantity });
    }
    return payload;
  }

  async function handleSaveRecipe() {
    if (!selectedProduct) return;

    const payload = buildRecipePayload();
    if (!payload) return;

    setIsSavingRecipe(true);
    try {
      await setProductRecipe(selectedProduct.id, payload);
      toast.success("Receta guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la receta.");
    } finally {
      setIsSavingRecipe(false);
    }
  }

  async function handleApplyToCategory() {
    if (!selectedProduct) return;

    const payload = buildRecipePayload();
    if (!payload || !payload.length) {
      toast.error("Cargá al menos un insumo antes de aplicar a toda la categoria.");
      return;
    }

    setIsSavingRecipe(true);
    try {
      const result = await bulkApplyRecipe(selectedProduct.category, payload);
      toast.success(`Receta aplicada a ${result.affectedProducts} productos de "${selectedProduct.category}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo aplicar la receta a la categoria.");
    } finally {
      setIsSavingRecipe(false);
    }
  }

  return (
    <>
      <StockSearch items={stockItems} onEditItem={setEditingItem} />

      {!isLoading && !loadError ? (
        <section className="joker-panel top-gap">
          <div className="joker-panel__heading">
            <p className="joker-eyebrow">En vivo</p>
            <h2>Stock de comidas</h2>
          </div>
          <div className="joker-category-chips">
            <button
              type="button"
              className={`joker-category-chip${comidaViewMode === "todo" ? " is-active" : ""}`}
              onClick={() => setComidaViewMode("todo")}
            >
              Mostrar todo
            </button>
            <button
              type="button"
              className={`joker-category-chip${comidaViewMode === "bajo" ? " is-active" : ""}`}
              onClick={() => setComidaViewMode("bajo")}
            >
              Solo stock bajo
            </button>
          </div>
        </section>
      ) : null}

      {!isLoading && !loadError && comidaViewMode === "todo" ? <FoodStockBoard items={stockItems} onEditItem={setEditingItem} /> : null}

      {!isLoading && !loadError ? (
        <LowStockBoard
          items={comidaViewMode === "bajo" ? stockItems : stockItems.filter((item) => item.category !== "comida")}
          onEditItem={setEditingItem}
        />
      ) : null}

      {SHOW_STOCK_ADMIN_TOOLS ? (
        <>
      <section className="joker-panel top-gap">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Insumos</p>
          <h2>Stock</h2>
        </div>

        <div className="joker-form" style={{ gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1fr auto" }}>
          <label className="joker-form-field">
            <span>Nuevo insumo</span>
            <input type="text" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder="Ej: Pan de hamburguesa" />
          </label>
          <label className="joker-form-field">
            <span>Unidad</span>
            <input type="text" value={newItemUnit} onChange={(event) => setNewItemUnit(event.target.value)} placeholder="unidad" />
          </label>
          <label className="joker-form-field">
            <span>Tipo</span>
            <select value={newItemCategory} onChange={(event) => setNewItemCategory(event.target.value as JokerStockItemCategory)}>
              <option value="comida">Comida</option>
              <option value="bebida">Bebida</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="joker-form-field">
            <span>Cantidad inicial</span>
            <input type="number" value={newItemQuantity} onChange={(event) => setNewItemQuantity(event.target.value)} />
          </label>
          <button type="button" className="joker-button joker-button--primary joker-button--auto" onClick={handleCreateStockItem} disabled={isSavingItem}>
            {isSavingItem ? "Agregando..." : "+ Agregar"}
          </button>
        </div>

        {isLoading ? (
          <p className="joker-empty-state top-gap">Cargando stock...</p>
        ) : loadError ? (
          <div className="top-gap">
            <p className="joker-order-item__excluded">{loadError}</p>
            <button type="button" className="joker-button joker-button--ghost" onClick={() => loadStockItems()}>
              Reintentar
            </button>
          </div>
        ) : stockItems.length ? (
          <ul className="joker-order-list top-gap">
            {stockItems.map((item) => (
              <li key={item.id} className="joker-order-item">
                <div className="joker-order-item__info">
                  <div>
                    <strong>{item.name}</strong>
                    <p className={`joker-order-item__excluded ${item.quantity <= 0 ? "joker-order-item__excluded" : ""}`} style={item.quantity <= 0 ? { color: "#dc2626", fontWeight: 700 } : undefined}>
                      {item.quantity} {item.unit}
                    </p>
                  </div>
                </div>
                <div className="joker-product-row-actions">
                  <input
                    type="number"
                    style={{ width: 80, minHeight: 38, borderRadius: 10, border: "1px solid #dbe4ee", padding: "0 8px" }}
                    placeholder="+cant"
                    value={restockDrafts[item.id] ?? ""}
                    onChange={(event) => setRestockDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="joker-button joker-button--ghost joker-button--auto"
                    onClick={() => handleRestock(item)}
                    disabled={restockingId === item.id}
                  >
                    {restockingId === item.id ? "..." : "Sumar"}
                  </button>
                  <button
                    type="button"
                    className="joker-order-item__remove"
                    onClick={() => handleDeleteStockItem(item)}
                    aria-label={`Eliminar ${item.name}`}
                  >
                    x
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="joker-empty-state top-gap">Todavia no cargaste ningun insumo.</p>
        )}
      </section>

      <section className="joker-panel top-gap">
        <div className="joker-panel__heading">
          <p className="joker-eyebrow">Recetas</p>
          <h2>Que descuenta cada producto</h2>
        </div>

        <label className="joker-form-field">
          <span>Producto</span>
          <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
            <option value="">Elegir producto</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.category})
              </option>
            ))}
          </select>
        </label>

        {selectedProduct ? (
          isLoadingRecipe ? (
            <p className="joker-empty-state top-gap">Cargando receta...</p>
          ) : (
            <div className="top-gap">
              {recipeLines.map((line, index) => (
                <div key={index} className="joker-form" style={{ gridTemplateColumns: "1.4fr 0.8fr auto", marginBottom: 8 }}>
                  <label className="joker-form-field">
                    <span>Insumo</span>
                    <select value={line.stockItemId} onChange={(event) => updateRecipeLine(index, { stockItemId: event.target.value })}>
                      <option value="">Elegir insumo</option>
                      {stockItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="joker-form-field">
                    <span>Cantidad</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantityPerUnit}
                      onChange={(event) => updateRecipeLine(index, { quantityPerUnit: event.target.value })}
                    />
                  </label>
                  <button type="button" className="joker-order-item__remove" onClick={() => removeRecipeLine(index)} aria-label="Quitar linea">
                    x
                  </button>
                </div>
              ))}

              <button type="button" className="joker-button joker-button--ghost joker-button--auto" onClick={addRecipeLine}>
                + Agregar insumo
              </button>

              <div className="joker-cc-detail-actions top-gap">
                <button type="button" className="joker-button joker-button--primary" onClick={handleSaveRecipe} disabled={isSavingRecipe}>
                  {isSavingRecipe ? "Guardando..." : "Guardar receta de este producto"}
                </button>
                <button type="button" className="joker-button joker-button--ghost" onClick={handleApplyToCategory} disabled={isSavingRecipe}>
                  Aplicar a toda "{selectedProduct.category}"
                </button>
              </div>
            </div>
          )
        ) : (
          <p className="joker-empty-state top-gap">Elegí un producto para ver o editar su receta.</p>
        )}
      </section>
        </>
      ) : null}

      {editingItem ? (
        <StockItemEditModal item={editingItem} isSaving={isSavingEdit} onClose={() => setEditingItem(null)} onSave={handleSaveEdit} />
      ) : null}
    </>
  );
}
