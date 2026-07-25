import { API_BASE_URL } from "../../shared/config/api";
import type { JokerProduct } from "./joker.types";

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
};

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const fallbackText = await response.text().catch(() => "");
    let parsedMessage: string | undefined;
    try {
      const parsed = JSON.parse(fallbackText) as { message?: string | string[] };
      parsedMessage = Array.isArray(parsed.message) ? parsed.message[0] : parsed.message;
    } catch {
      // El cuerpo no era JSON, se usa el texto crudo como fallback.
    }
    throw new Error(parsedMessage || fallbackText || `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

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
