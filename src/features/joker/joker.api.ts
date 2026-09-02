// Reexporta todo lo de ./api/*.ts, separado por dominio (productos,
// pedidos, repartidores, clientes, cuenta corriente, stock, caja, panel,
// login) -- para que el resto de la app siga importando desde
// "../joker.api" / "./joker.api" sin tener que tocar nada.
export * from "./api/products.api";
export * from "./api/orders.api";
export * from "./api/couriers.api";
export * from "./api/clients.api";
export * from "./api/account.api";
export * from "./api/stock.api";
export * from "./api/register.api";
export * from "./api/panel.api";
export * from "./api/auth.api";
export * from "./api/chat.api";
