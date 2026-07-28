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

export type JokerOrderRecord = {
  id: number;
  total: number;
  address: string;
  items: Array<{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    detail?: string;
  }>;
  createdAt: string;
};
