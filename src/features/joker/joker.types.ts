export type JokerProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
};

export type JokerOrderItem = {
  lineId: string;
  productId: number;
  productName: string;
  unitPrice: number;
  detail: string;
  quantity: number;
};

export type JokerPaymentMethod = "efectivo" | "tarjeta" | "cuenta";

export const JOKER_PAYMENT_METHOD_LABELS: Record<JokerPaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
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
