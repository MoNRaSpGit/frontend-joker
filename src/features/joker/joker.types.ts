// Rol de acceso, sin contraseña ni backend: "usuario" solo arma pedidos,
// "administrador" ve todo. Se elige en un login clasico al abrir la app y
// se guarda en el navegador (localStorage), no es seguridad real, es para
// mostrarle al cliente la idea de roles diferenciados.
export type JokerRole = "administrador" | "usuario";

// Slot de eleccion dentro de un combo (ej: "Hamburguesa" o "Refresco"): el
// operario elige uno de optionProductIds al cargar el combo, y ese producto
// (con su receta propia) se descuenta del stock ademas del combo en si.
export type JokerComboSlot = {
  label: string;
  quantity: number;
  optionProductIds: number[];
};

export type JokerProduct = {
  id: number;
  name: string;
  category: string;
  price: number;
  status?: "draft" | "published";
  productType?: "simple" | "extra";
  ingredients?: string | null;
  observations?: string | null;
  comboSlots?: JokerComboSlot[];
};

// Componente de combo elegido al cargar el pedido (ej: la hamburguesa y el
// refresco que efectivamente eligio el operario dentro de un combo).
export type ComboComponentSelection = {
  product: JokerProduct;
  quantity: number;
};

export type JokerOrderItem = {
  lineId: string;
  productId: number;
  productName: string;
  unitPrice: number;
  detail: string;
  quantity: number;
  // Si esta linea es un componente de combo (ej: la hamburguesa o la bebida
  // elegidas dentro de "Combo 4", agregadas a $0 solo para que el backend
  // descuente el stock correcto), esto apunta al lineId de la linea
  // principal del combo. Sin esto habia que adivinar la relacion parseando
  // el propio lineId (".includes('-combo-')" en unos lugares,
  // ".startsWith(...)" en otros) -- fragil y quedo desincronizado mas de
  // una vez.
  parentLineId?: string;
};

// Helpers unicos para leer la relacion combo/componente -- se usan en vez
// de comparar item.parentLineId a mano en cada lugar, para que un dia de
// manana (ej: combos anidados) solo haga falta cambiar esto una vez.
export function isComboComponentLine(item: JokerOrderItem): boolean {
  return Boolean(item.parentLineId);
}

export function isComboComponentOf(item: JokerOrderItem, parentLineId: string): boolean {
  return item.parentLineId === parentLineId;
}

// Producto de prueba (precio $0) para probar la impresora. Se filtra del
// panel (movimientos, ganancia, ranking, etc.) para que no ensucie los
// resultados reales de venta.
export const JOKER_TEST_PRODUCT_NAME = "ImprimirPrueba";

export type JokerPaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "cuenta";

export const JOKER_PAYMENT_METHOD_LABELS: Record<JokerPaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta: "POS",
  transferencia: "Transferencia",
  cuenta: "Cuenta"
};

export type JokerOrderStatus = "confirmado" | "pendiente" | "rechazado";

export type JokerOrderRecord = {
  id: number;
  displayNumber: number | null;
  status: JokerOrderStatus;
  total: number;
  address: string;
  paymentMethod: JokerPaymentMethod;
  customerName: string | null;
  clientId: number | null;
  items: Array<{
    productId: number;
    productName: string;
    unitPrice: number;
    quantity: number;
    detail?: string;
  }>;
  createdAt: string;
  orderDate: string | null;
  courierId: number | null;
  deliveryCost: number | null;
};

export type JokerCourierStatus = "inactivo" | "activo";

export type JokerCourier = {
  id: number;
  name: string;
  status: JokerCourierStatus;
  activeSince: string | null;
};

export type JokerCourierCashMovementType = "inicial" | "gasto" | "entrega";

export type JokerCourierCashMovement = {
  id: number;
  type: JokerCourierCashMovementType;
  amount: number;
  description: string | null;
  createdAt: string;
};

export type JokerCourierCashSummary = {
  initialCash: number;
  ordersCashTotal: number;
  ordersCashCount: number;
  expensesTotal: number;
  handoversTotal: number;
  cashOnHand: number;
  movements: JokerCourierCashMovement[];
};

export type JokerCourierSettlement = {
  id: number;
  courierId: number;
  courierName: string;
  initialCash: number;
  ordersCashTotal: number;
  ordersCashCount: number;
  expensesTotal: number;
  handoversTotal: number;
  cashOnHand: number;
  movements: JokerCourierCashMovement[];
  hourlyRate: number;
  hoursWorked: number;
  hoursTotal: number;
  deliveryCostTotal: number;
  payoutTotal: number;
  activeSince: string | null;
  settledAt: string;
};

export type JokerRegisterState = {
  isOpen: boolean;
  lastClosedAt: string | null;
};

export type JokerRegisterCloseSummary = {
  totalVendido: number;
  ganancia: number;
  paymentTotals: Record<JokerPaymentMethod, number>;
  ranking: Array<{ productName: string; quantity: number }>;
};

export type JokerClient = {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
};

export type JokerAccountEntry = {
  id: number;
  clientId: number;
  createdAt: string;
  orderDate: string | null;
  total: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
};

// Copia permanente de un consumo ya pagado (o de un cliente eliminado con
// consumos pendientes), para poder reclamar/verificar despues.
export type JokerAccountSettlement = {
  id: number;
  clientId: number;
  clientName: string;
  entryId: number;
  total: number;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  entryCreatedAt: string;
  reason: "pago" | "cliente_eliminado" | "correccion_manual";
  settledAt: string;
};

export type JokerStockItemCategory = "comida" | "bebida" | "otro";

export type JokerStockItem = {
  id: number;
  name: string;
  unit: string;
  category: JokerStockItemCategory;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type JokerProductRecipeLine = {
  stockItemId: number;
  stockItemName: string;
  unit: string;
  quantityPerUnit: number;
};

// ---------- Mes (dia comercial: 5am a 5am) ----------

export type JokerCierreDia = {
  fecha: string;
  total: number;
  editadoManualmente: boolean;
};

export type JokerMonthDay = {
  fecha: string;
  diaSemana: string;
  total: number;
  cerrado: boolean;
};

export type JokerMonthWeek = {
  numero: number;
  dias: JokerMonthDay[];
  total: number;
};

export type JokerMonthSummary = {
  anio: number;
  mes: number;
  total: number;
  semanas: JokerMonthWeek[];
};

export type JokerMonthHistoryItem = {
  anio: number;
  mes: number;
  total: number;
};
