import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { DEFAULT_FX_RATES, formatMoney, toUSD, fromUSD, type FxRates } from "@/lib/services/kpiService";
import type { BusinessDocument } from "@/lib/types";

export function exportDocumentPdf(document: BusinessDocument, rates: FxRates = DEFAULT_FX_RATES) {
  const pdf = new jsPDF();
  pdf.setFontSize(18);
  pdf.text(`Nexus Global - ${document.type === "contract" ? "Contrato" : "Cotizacion"}`, 14, 16);
  pdf.setFontSize(11);
  pdf.text(`Cliente: ${document.clientName}`, 14, 24);
  pdf.text(`Fecha: ${format(new Date(), "yyyy-MM-dd")}`, 14, 30);
  pdf.text(`Web: ${document.websiteUrl}`, 14, 36);

  const body = document.items.map((item) => {
    const lineUSD = toUSD(item.unitPrice * item.qty, item.currency, rates);
    const converted = fromUSD(lineUSD, document.currency, rates);
    return [
      item.serviceName,
      String(item.qty),
      formatMoney(item.unitPrice, item.currency),
      formatMoney(converted, document.currency),
    ];
  });

  autoTable(pdf, {
    startY: 44,
    head: [["Servicio", "Cantidad", "Unitario", `Subtotal (${document.currency})`]],
    body,
  });

  const yPos = (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 60;
  pdf.text(`Total: ${formatMoney(document.total, document.currency)}`, 14, yPos + 10);
  pdf.text("Condiciones: pago unico al aprobar contrato/cotizacion.", 14, yPos + 18);
  if (document.notes) pdf.text(`Notas: ${document.notes}`, 14, yPos + 26);
  pdf.save(`${document.type}-${document.id}.pdf`);
}
