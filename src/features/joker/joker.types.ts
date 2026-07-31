export type JokerProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  status?: "draft" | "published";
  productType?: "simple" | "extra";
  ingredients?: string | null;
  observations?: string | null;
};

export type JokerOrderItem = {
  lineId: string;
  productId: number;
  productName: string;
  unitPrice: number;
  detail: string;
  quantity: number;
};

export type JokerPaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "cuenta";

export const JOKER_PAYMENT_METHOD_LABELS: Record<JokerPaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "POS",
  transferencia: "Transferencia",
  cuenta: "Cuenta"
};

export type JokerOrderRecord = {
  id: number;
  total: number;
  address: string;
  paymentMethod: JokerPaymentMethod;
  items: Array<{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    detail?: string;
  }>;
  createdAt: string;
};

export type JokerClient = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
};

export type JokerAccountEntry = {
  id: number;
  clientId: number;
  createdAt: string;
  total: number;
  items: Array<{ productName: string; quantity: number }>;
};
