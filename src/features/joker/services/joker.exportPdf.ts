// Exportar el comprobante de cuenta corriente de un cliente a PDF --
// pedido explicito: "poner un boton PDF... me deja un archivito PDF con
// la cuenta del cliente, el clasico que hacemos siempre". Reusa
// buildAccountCycleMovements (la misma cuenta que ya usa el ticket
// impreso, ver joker.ticketFormat.ts) para que el PDF cuente exactamente
// la misma historia que el comprobante en papel, solo en otro formato.
//
// Import dinamico de jspdf/jspdf-autotable (mismo criterio que
// frontend-agro/agro.exportPdf.ts): pesan y el boton se usa de vez en
// cuando, no tiene sentido sumarlas a la carga inicial de toda la app.
import { formatMoney } from "./joker.escpos";
import { buildAccountCycleMovements, FOOTER_MESSAGE, STORE_ADDRESS, STORE_NAME, STORE_PHONE } from "./joker.ticketFormat";
import type { JokerAccountEntry, JokerAccountPayment, JokerClient } from "../joker.types";

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
  // OJO: jspdf exporta el constructor como named export ("jsPDF"), no
  // como default -- el default de este paquete no es una funcion
  // (confirmado corriendo el import real, no es solo un detalle de
  // tipos). jspdf-autotable si expone un default utilizable.
  const [{ jsPDF: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);

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

  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text(STORE_NAME, 40, 44);

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`${STORE_ADDRESS} · ${STORE_PHONE}`, 40, 60);
  doc.text(new Date().toLocaleString("es-UY", { timeZone: "America/Montevideo" }), 40, 74);

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

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(`Saldo actual: ${formatMoney(currentBalance)}`, 40, finalY + 28);

  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(FOOTER_MESSAGE, 40, finalY + 46);

  const safeClientName = client.name.trim().replace(/[^a-zA-Z0-9]+/g, "-");
  doc.save(`cuenta-corriente-${safeClientName || client.id}.pdf`);
}
