import type { JokerClient } from "./joker.types";

// Clientes de cuenta corriente precargados. Se editan a mano por ahora
// (no hay backend para esto todavia, se agrega mas adelante si hace falta).
export const DEMO_CLIENTS: JokerClient[] = [
  { id: "c1", name: "Juan Perez", phone: "099 111 222" },
  { id: "c2", name: "Maria Rodriguez", phone: "099 333 444" },
  { id: "c3", name: "Carlos Fernandez", phone: "099 555 666" }
];
