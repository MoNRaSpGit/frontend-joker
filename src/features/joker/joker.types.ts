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
