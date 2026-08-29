import { API_BASE_URL, readJson } from "./shared";
import type { JokerProduct, JokerProductRecipeLine } from "../joker.types";

type ProductListResponse = {
  items: JokerProduct[];
};

type ProductResponse = {
  item: JokerProduct;
};

export type JokerProductInput = {
  name: string;
  category: string;
  price: number;
  // Solo se usa al crear un producto autonomo (ver ProductFormModal): el
  // backend le crea de una un insumo propio con esta cantidad. updateProduct
  // lo ignora si viene, el DTO de edicion no lo contempla.
  initialStock?: number;
};

export async function listProducts(): Promise<ProductListResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products`, { cache: "no-store" });
  return readJson<ProductListResponse>(response);
}

export async function createProduct(input: JokerProductInput): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<ProductResponse>(response);
}

export async function updateProduct(productId: number, input: JokerProductInput): Promise<ProductResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return readJson<ProductResponse>(response);
}

export async function deleteProduct(productId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}`, { method: "DELETE" });
  await readJson<{ ok: true }>(response);
}

type ProductRecipeResponse = {
  items: JokerProductRecipeLine[];
};

export async function getProductRecipe(productId: number): Promise<ProductRecipeResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}/recipe`, { cache: "no-store" });
  return readJson<ProductRecipeResponse>(response);
}

export async function setProductRecipe(
  productId: number,
  items: Array<{ stockItemId: number; quantityPerUnit: number }>
): Promise<ProductRecipeResponse> {
  const response = await fetch(`${API_BASE_URL}/joker/products/${productId}/recipe`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  return readJson<ProductRecipeResponse>(response);
}

export async function bulkApplyRecipe(
  category: string,
  items: Array<{ stockItemId: number; quantityPerUnit: number }>
): Promise<{ affectedProducts: number }> {
  const response = await fetch(`${API_BASE_URL}/joker/recipes/bulk-apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, items })
  });
  return readJson<{ affectedProducts: number }>(response);
}
