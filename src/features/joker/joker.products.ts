import type { JokerProduct } from "./joker.types";

// Productos hardcodeados para el v1 visual (sin backend todavia).
export const JOKER_PRODUCTS: JokerProduct[] = [
  {
    id: "hamburguesa-clasica",
    name: "Hamburguesa Clasica",
    ingredients: ["Pan", "Carne", "Lechuga", "Tomate", "Cebolla", "Queso", "Mayonesa", "Ketchup"]
  },
  {
    id: "hamburguesa-doble",
    name: "Hamburguesa Doble Cheddar",
    ingredients: ["Pan", "Carne", "Carne", "Cheddar", "Panceta", "Lechuga", "Tomate", "Cebolla morada", "Salsa Joker"]
  },
  {
    id: "pancho-especial",
    name: "Pancho Especial",
    ingredients: ["Pan", "Salchicha", "Mostaza", "Ketchup", "Mayonesa", "Chimichurri", "Papas pay"]
  },
  {
    id: "papas-cheddar-panceta",
    name: "Papas Cheddar y Panceta",
    ingredients: ["Papas fritas", "Cheddar", "Panceta", "Cebollin"]
  },
  {
    id: "wrap-pollo",
    name: "Wrap de Pollo",
    ingredients: ["Tortilla", "Pollo", "Lechuga", "Tomate", "Queso", "Salsa cesar"]
  },
  {
    id: "papas-fritas",
    name: "Papas Fritas",
    ingredients: ["Papas fritas", "Sal"]
  }
];
