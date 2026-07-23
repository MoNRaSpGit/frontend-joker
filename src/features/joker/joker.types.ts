export type JokerProduct = {
  id: string;
  name: string;
  ingredients: string[];
};

export type JokerOrderItem = {
  lineId: string;
  productId: string;
  productName: string;
  ingredients: string[];
  excludedIngredients: string[];
};
