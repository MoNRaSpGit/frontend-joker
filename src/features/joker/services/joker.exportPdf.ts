// Exportar a PDF -- pedido explicito (17/09/2026, cuenta corriente):
// "poner un boton PDF... me deja un archivito PDF con la cuenta del
// cliente, el clasico que hacemos siempre". Pedido explicito
// (18/09/2026, pedidos): "pone lo del PDF en las compras tambien...
// seria 3 tick y pdf o 3 tick y no pdf" -- el PDF de un pedido es
// independiente de cuantos tickets fisicos se impriman (0, 1 o 3), se
// puede combinar con cualquiera de las tres opciones.
//
// Los dos exports reusan la MISMA logica de datos que ya usan los
// tickets impresos (buildAccountCycleMovements para cuenta corriente,
// los mismos campos que buildOrderTicketLines para un pedido) para que
// el PDF cuente exactamente la misma historia que el papel, solo en
// otro formato.
//
// Import dinamico de jspdf/jspdf-autotable (mismo criterio que
// frontend-agro/agro.exportPdf.ts): pesan y el boton se usa de vez en
// cuando, no tiene sentido sumarlas a la carga inicial de toda la app.
import { formatMoney, parseDeliveryCost } from "./joker.escpos";
import { buildAccountCycleMovements, FOOTER_MESSAGE, STORE_ADDRESS, STORE_NAME, STORE_PHONE } from "./joker.ticketFormat";
import { JOKER_PAYMENT_METHOD_LABELS } from "../joker.types";
import type { JokerAccountEntry, JokerAccountPayment, JokerClient, JokerOrderItem, JokerPaymentMethod } from "../joker.types";

// OJO: jspdf exporta el constructor como named export ("jsPDF"), no como
// default -- el default de este paquete no es una funcion (confirmado
// corriendo el import real, no es solo un detalle de tipos).
// jspdf-autotable si expone un default usable.
async function loadPdfLibs() {
  const [{ jsPDF: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  return { JsPDF, autoTable };
}

function getAutoTableFinalY(doc: unknown) {
  return (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function pushStoreHeader(doc: InstanceType<Awaited<ReturnType<typeof loadPdfLibs>>["JsPDF"]>) {
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(STORE_NAME, 40, 44);

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`${STORE_ADDRESS} · ${STORE_PHONE}`, 40, 60);
  doc.text(new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" }), 40, 74);
}

function formatMovementDate(date: string) {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00` : date;
  return new Date(isoDate).toLocaleDateString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Montevideo"
  });
}

export async function exportAccountStatementPdf(
  client: JokerClient,
  entries: JokerAccountEntry[],
  openPayments: JokerAccountPayment[]
) {
  const { JsPDF, autoTable } = await loadPdfLibs();

  const movements = buildAccountCycleMovements(entries, openPayments);
  const currentBalance = Math.max(movements.length ? movements[movements.length - 1].balanceAfter : 0, 0);

  const rows = movements.length
    ? movements.map((movement, index) => {
        const detalle =
          movement.type === "compra"
            ? [index === 0 ? "DEUDA INICIAL" : "COMPRA", ...movement.items.map((item) => `${item.quantity}x ${item.productName}`)].join("\n")
            : "Pago";
        const monto = movement.type === "compra" ? formatMoney(movement.amount) : `-${formatMoney(movement.amount)}`;
        return [formatMovementDate(movement.date), detalle, monto, formatMoney(movement.balanceAfter)];
      })
    : [["-", "Sin movimientos pendientes.", "-", "-"]];

  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pushStoreHeader(doc);

  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(`Cliente: ${client.name}`, 40, 98);
  if (client.address?.trim()) {
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Direccion: ${client.address.trim()}`, 40, 114);
  }

  autoTable(doc, {
    startY: client.address?.trim() ? 130 : 116,
    head: [["Fecha", "Detalle", "Monto", "Saldo"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
    columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    headStyles: { fillColor: [30, 30, 32], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 244, 236] },
    margin: { left: 40, right: 40 }
  });

  const finalY = getAutoTableFinalY(doc);

  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(`Saldo actual: ${formatMoney(currentBalance)}`, 40, finalY + 28);

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(FOOTER_MESSAGE, 40, finalY + 46);

  const safeClientName = client.name.trim().replace(/[^a-zA-Z0-9]+/g, "-");
  doc.save(`cuenta-corriente-${safeClientName || client.id}.pdf`);
}

// PDF de un pedido -- mismo contenido que la copia "cliente" del ticket
// impreso (buildSingleTicketLines en joker.ticketFormat.ts): encabezado
// del local, numero de pedido, cliente/direccion/forma de pago/nota,
// items con detalle y precio, costo de envio si tiene, y total. No
// replica las copias COMANDA/ARCHIVO (son internas, para cocina/archivo
// en papel, no tiene sentido mandarlas como PDF al cliente).
export async function exportOrderPdf(
  order: JokerOrderItem[],
  orderAddress: string,
  paymentMethod: JokerPaymentMethod,
  customerName: string,
  deliveryCost: string,
  ticketNumber: number,
  note: string
) {
  const { JsPDF, autoTable } = await loadPdfLibs();

  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  pushStoreHeader(doc);

  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(`Pedido #${ticketNumber}`, 40, 98);

  const trimmedCustomerName = customerName.trim();
  const isCounterOrder = trimmedCustomerName.toUpperCase().includes("MOSTRADOR");
  const displayCustomerName = isCounterOrder ? trimmedCustomerName.replace(/\s*MOSTRADOR\s*$/i, "").trim() : trimmedCustomerName;
  const addressLine = orderAddress.trim() ? orderAddress.trim() : isCounterOrder ? "MOSTRADOR" : "Retira en local";
  const ticketPaymentLabel = paymentMethod === "cuenta" ? "A cuenta" : JOKER_PAYMENT_METHOD_LABELS[paymentMethod];

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Cliente: ${displayCustomerName || "-"}`, 40, 114);
  doc.text(addressLine, 40, 128);
  doc.text(`Pago: ${ticketPaymentLabel}`, 40, 142);
  let headerBottomY = 142;
  if (note.trim()) {
    doc.text(`Nota: ${note.trim()}`, 40, 156);
    headerBottomY = 156;
  }

  let total = 0;
  const rows = order.map((item, index) => {
    const lineTotal = item.unitPrice * item.quantity;
    total += lineTotal;
    const detail = item.detail?.trim() ? item.detail.trim() : "sin detalle";
    return [`${index + 1}) ${item.quantity}x ${item.productName}`, detail, formatMoney(lineTotal)];
  });

  const parsedDeliveryCost = parseDeliveryCost(deliveryCost);
  if (parsedDeliveryCost !== null) {
    total += parsedDeliveryCost;
    rows.push(["Costo de envio", "-", formatMoney(parsedDeliveryCost)]);
  }

  autoTable(doc, {
    startY: headerBottomY + 16,
    head: [["Producto", "Detalle", "Monto"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
    columnStyles: { 2: { halign: "right" } },
    headStyles: { fillColor: [30, 30, 32], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 244, 236] },
    margin: { left: 40, right: 40 }
  });

  const finalY = getAutoTableFinalY(doc);

  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(`Total: ${formatMoney(total)}`, 40, finalY + 28);

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(FOOTER_MESSAGE, 40, finalY + 46);

  doc.save(`pedido-${ticketNumber}.pdf`);
}
