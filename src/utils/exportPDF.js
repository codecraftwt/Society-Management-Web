
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToPDF = ({
  title = "Report",
  columns = [],
  rows = [],
  fileName = "Report",
}) => {
  const doc = new jsPDF();

  const marginLeft = 14;
  let currentY = 15;

  // Title
  doc.setFontSize(16);
  doc.text(title, marginLeft, currentY);

  // Date (DD-MM-YYYY)
  currentY += 7;
  doc.setFontSize(10);

  const formattedDate = new Date()
    .toLocaleDateString("en-GB")
    .replace(/\//g, "-");

  doc.text(`Generated on: ${formattedDate}`, marginLeft, currentY);

  // Table
  autoTable(doc, {
    startY: currentY + 6,
    head: [columns],   // ✅ FIXED
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },   // ✅ FIXED
    alternateRowStyles: { fillColor: [245, 247, 250] },

    didDrawPage: () => {
      doc.text(
        `Page ${doc.internal.getNumberOfPages()}`,
        marginLeft,
        doc.internal.pageSize.height - 8
      );
    },
  });

  doc.save(`${fileName}.pdf`);
};