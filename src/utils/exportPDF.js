
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = ({
  title = "Report",
  subtitle = "",
  columns = [],
  rows = [],
  fileName = "Report",
  orientation,
}) => {
  // Auto landscape if more than 4 columns or explicitly requested
  const isLandscape = orientation ? orientation === "landscape" : columns.length >= 5;
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 14;
  let currentY = 16;

  // Header Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, marginLeft, currentY);

  if (subtitle) {
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(subtitle, marginLeft, currentY);
  }

  // Generation timestamp & metadata
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);

  const formattedDate = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  doc.text(`Generated on: ${formattedDate} · Total Records: ${rows.length}`, marginLeft, currentY);

  // Divider line
  currentY += 3;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(marginLeft, currentY, pageWidth - marginLeft, currentY);

  // Table
  autoTable(doc, {
    startY: currentY + 4,
    margin: { left: marginLeft, right: marginLeft },
    head: [columns],
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: "linebreak",
      font: "helvetica",
    },
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    didDrawPage: (data) => {
      // Footer page number
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184); // slate-400
      const pageStr = `Page ${doc.internal.getNumberOfPages()}`;
      doc.text(pageStr, pageWidth - marginLeft - doc.getTextWidth(pageStr), pageHeight - 8);
      doc.text("Official Society Financial Report — Confidential", marginLeft, pageHeight - 8);
    },
  });

  doc.save(`${fileName}.pdf`);
};