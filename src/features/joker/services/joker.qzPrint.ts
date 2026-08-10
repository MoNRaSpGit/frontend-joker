import qz from "qz-tray";
import { API_BASE_URL } from "../../../shared/config/api";
import { buildOrderTicketLines } from "./joker.ticketFormat";
import type { JokerOrderItem, JokerPaymentMethod } from "../joker.types";

const PREFERRED_PRINTER_STORAGE_KEY = "joker.qz.preferredPrinter";

// Firma cada conexion con el certificado del backend (ver
// joker.service.ts#getQzCertificate / signQzRequest) para que QZ Tray
// confie en el sitio automaticamente: sin esto, QZ muestra un cartel de
// "Signature (missing) / Validity (invalid)" en cada conexion y no deja
// marcar "Recordar esta accion" de forma permanente.
let qzSecurityConfigured = false;

function configureQzSecurity() {
  if (qzSecurityConfigured) return;
  qzSecurityConfigured = true;

  qz.security.setCertificatePromise((resolve, reject) => {
    fetch(`${API_BASE_URL}/joker/qz-certificate`)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error("No se pudo obtener el certificado."))))
      .then(resolve)
      .catch(reject);
  });

  qz.security.setSignatureAlgorithm("SHA512");
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    fetch(`${API_BASE_URL}/joker/qz-sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toSign })
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("No se pudo firmar la conexion."))))
      .then((data: { signature: string }) => resolve(data.signature))
      .catch(reject);
  });
}

function readPreferredPrinter(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PREFERRED_PRINTER_STORAGE_KEY);
}

let cachedPrinterName: string | null = readPreferredPrinter();

export function getPreferredPrinterName() {
  return cachedPrinterName;
}

export function setPreferredPrinterName(name: string) {
  cachedPrinterName = name;
  window.localStorage.setItem(PREFERRED_PRINTER_STORAGE_KEY, name);
}

export function clearPreferredPrinterName() {
  cachedPrinterName = null;
  window.localStorage.removeItem(PREFERRED_PRINTER_STORAGE_KEY);
}

async function ensureQzConnected() {
  configureQzSecurity();
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect();
  }
}

export async function listQzPrinters() {
  await ensureQzConnected();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [];
}

// Envia lineas ya armadas (por buildOrderTicketLines o cualquier otro
// formato de ticket) directo a la impresora via QZ Tray. Reusable por
// cualquier tipo de ticket, no solo pedidos.
export async function printRawLinesByQz(lines: string[]) {
  await ensureQzConnected();

  if (!cachedPrinterName) {
    throw new Error("Todavia no elegiste una impresora. Toca \"Impresora\" para elegirla.");
  }

  const config = qz.configs.create(cachedPrinterName, { encoding: "CP437" });

  try {
    await qz.print(config, lines);
  } catch (error) {
    // Si la impresora guardada ya no existe (se cambio de equipo), se
    // avisa claro en vez de reintentar con una elegida al azar.
    throw new Error(
      `No se pudo imprimir en "${cachedPrinterName}". ${
        error instanceof Error ? error.message : "Revisa que siga siendo la impresora correcta (boton Impresora)."
      }`
    );
  }

  return { printerName: cachedPrinterName };
}

export async function printOrderTicketByQz(
  order: JokerOrderItem[],
  orderAddress: string,
  copies: number,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  deliveryCost: string,
  ticketNumber: number,
  note: string
) {
  const data = buildOrderTicketLines(
    order,
    orderAddress,
    copies,
    paymentMethod,
    customerName,
    deliveryCost,
    ticketNumber,
    note
  );
  return printRawLinesByQz(data);
}
