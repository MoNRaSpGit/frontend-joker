const STORAGE_KEY = "joker.ticketCounter";

// Numero de pedido local (solo de este dispositivo/navegador, no es el id
// real del pedido en el backend): sirve para que la comanda y el archivo de
// un mismo pedido salgan con el mismo numero, y sea facil relacionarlos.
export function getNextTicketNumber(): number {
  if (typeof window === "undefined") {
    return 1;
  }

  const current = Number(window.localStorage.getItem(STORAGE_KEY)) || 0;
  const next = current + 1;
  window.localStorage.setItem(STORAGE_KEY, String(next));
  return next;
}
