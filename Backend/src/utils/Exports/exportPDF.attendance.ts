import PDFDocument from "pdfkit";

export function exportPDF(rows: any[], res: any) {
  const doc = new PDFDocument({ margin: 30, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=attendance.pdf"
  );

  doc.pipe(res);

  doc.fontSize(14).text("Attendance Report", { align: "center" });
  doc.moveDown();

  rows.forEach((r) => {
    doc
      .fontSize(10)
      .text(
        `${r.date} | ${r.employeeId} | ${r.name} | ${r.designation} | ${r.checkIn} - ${r.checkOut} | ${r.status}`
      );
    doc.moveDown(0.5);
  });

  doc.end();
}
