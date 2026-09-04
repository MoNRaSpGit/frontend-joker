// Dia comercial de El Joker: arranca a las 5am hora Montevideo, no a
// medianoche. Un pedido cargado a las 2am del calendario todavia
// "pertenece" al dia anterior para el negocio -- el backend ya usa este
// mismo criterio para agrupar pedidos por dia (ver
// backend/src/modules/joker/joker.dateUtils.ts#getStoreDateLabel), pero
// las pantallas que muestran/ordenan fechas (Cuenta corriente, el
// comprobante impreso) todavia usaban el dia de calendario crudo cuando
// el pedido no tenia una fecha atrasada puesta a mano -- por eso un
// pedido de la 1am ya mostraba "el dia siguiente" en vez del dia
// comercial correcto. Misma formula que el backend, para no divergir.
const STORE_DAY_START_HOUR = 5;

export function getStoreDateLabel(isoDate: string): string {
  const shifted = new Date(new Date(isoDate).getTime() - STORE_DAY_START_HOUR * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(shifted);
}

// Fecha "correcta" de un pedido/entrada de cuenta corriente para mostrar u
// ordenar: la fecha atrasada puesta a mano si existe, si no el dia
// comercial (no el de calendario) del momento en que se creo.
export function getDisplayOrderDate(createdAt: string, orderDate?: string | null): string {
  return orderDate ?? getStoreDateLabel(createdAt);
}
