// Logica pura de armado del pedido (agregar/editar/quitar lineas,
// incluidos los componentes de combo). Separada de useJokerOrder.ts para
// poder testearla sin necesitar React -- son solo funciones
// (order) => nuevo order, faciles de probar con casos concretos. Esto fue
// justamente el foco de 2 bugs reales esta sesion (duplicado de
// componentes al editar un combo, hijas huerfanas al borrarlo), asi que es
// donde mas vale la pena tener tests.
import { isComboComponentOf } from "../joker.types";
import type { ComboComponentSelection, JokerOrderItem, JokerProduct } from "../joker.types";

function defaultLineIdSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildComponentLines(
  parentLineId: string,
  parentProductName: string,
  parentQuantity: number,
  comboComponents: ComboComponentSelection[]
): JokerOrderItem[] {
  return comboComponents.map((component, index) => ({
    lineId: `${parentLineId}-combo-${index}`,
    productId: component.product.id,
    productName: component.product.name,
    unitPrice: 0,
    detail: `Incluido en ${parentProductName}`,
    quantity: component.quantity * parentQuantity,
    parentLineId
  }));
}

// Los componentes de combo (ej: la hamburguesa y el refresco elegidos
// dentro de un Combo Nº2) se agregan como lineas propias a $0: no suman al
// total (ya esta incluido en el precio del combo) pero cada una tiene su
// propio productId, asi el backend descuenta el stock de lo que realmente
// se eligio en vez de una receta fija del combo.
export function addOrderItem(
  order: JokerOrderItem[],
  product: JokerProduct,
  detail: string,
  quantity: number,
  comboComponents: ComboComponentSelection[] = [],
  lineIdSuffix: () => string = defaultLineIdSuffix
): JokerOrderItem[] {
  const lineId = `${product.id}-${lineIdSuffix()}`;

  const mainLine: JokerOrderItem = {
    lineId,
    productId: product.id,
    productName: product.name,
    unitPrice: product.price,
    detail,
    quantity
  };

  return [...order, mainLine, ...buildComponentLines(lineId, product.name, quantity, comboComponents)];
}

// comboComponents (si se pasa) reemplaza del todo las lineas hijas de este
// item -- antes, editar un combo ya agregado no tenia forma de recambiar
// una eleccion (ej: pasar de la hamburguesa por defecto a "4 quesos"), asi
// que quedaba la eleccion vieja pegada a $0 en el pedido junto a la nueva.
// Si no se pasa comboComponents (item sin combo), no se tocan las demas
// lineas.
export function updateOrderItem(
  order: JokerOrderItem[],
  lineId: string,
  detail: string,
  quantity: number,
  unitPrice: number,
  comboComponents?: ComboComponentSelection[]
): JokerOrderItem[] {
  const withoutOldComboChildren = comboComponents ? order.filter((item) => !isComboComponentOf(item, lineId)) : order;

  const updated = withoutOldComboChildren.map((item) => (item.lineId === lineId ? { ...item, detail, quantity, unitPrice } : item));

  if (!comboComponents || !comboComponents.length) {
    return updated;
  }

  const mainIndex = updated.findIndex((item) => item.lineId === lineId);
  const mainItem = updated[mainIndex];
  const newComponentLines = buildComponentLines(lineId, mainItem?.productName ?? "", quantity, comboComponents);

  return [...updated.slice(0, mainIndex + 1), ...newComponentLines, ...updated.slice(mainIndex + 1)];
}

// Al borrar la linea de un combo, sus hijas tienen que borrarse con ella --
// si no, quedan huerfanas en el pedido (a $0, sin el combo que las trajo).
export function removeOrderItem(order: JokerOrderItem[], lineId: string): JokerOrderItem[] {
  return order.filter((item) => item.lineId !== lineId && !isComboComponentOf(item, lineId));
}
