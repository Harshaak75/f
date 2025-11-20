import PDFDocument from "pdfkit";
import { Response } from "express";

// Define a precise type for the data we expect from the database
// This matches the Prisma query in your payroll route
type PayrollDataForPdf = {
  id: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  processedAt: Date;
  tenant: {
    name: string;
  };
  items: Array<{
    user: {
      employeeProfile: {
        employeeId: string;
        firstName: string;
        lastName: string;
      } | null;
    };
    grossSalary: number;
    lwpDeduction: number;
    otherDeductions: number;
    netSalary: number;
  }>;
};

/**
 * Generates a PDF payroll report and streams it to the Express response.
 * @param payrollRun The processed payroll data from the database.
 * @param res The Express response object.
 */
export function generatePayrollPdf(
  payrollRun: PayrollDataForPdf,
  res: Response
) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape", // Use landscape for wider tables
    margin: 40,
  });

  // Pipe the PDF stream directly to the user's browser
  doc.pipe(res);

  // --- PDF Header ---
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text(payrollRun.tenant.name, { align: "left" });
  doc.fontSize(14).font("Helvetica").text("Payroll Processed Report");

  const monthName = new Date(
    payrollRun.year,
    payrollRun.month - 1
  ).toLocaleString("default", { month: "long" });
  doc.fontSize(12).text(`${monthName} ${payrollRun.year}`, { align: "left" });

  doc.moveDown(1);

  // --- Summary ---
  doc.fontSize(10).font("Helvetica");
  doc.text(
    `Processed On: ${payrollRun.processedAt.toLocaleDateString("en-IN")}`
  );
  doc.text(`Total Employees: ${payrollRun.totalEmployees}`);
  doc.text(`Total Gross Salary: Rs. ${payrollRun.totalGross.toLocaleString()}`);
  doc.text(
    `Total Deductions: Rs. ${payrollRun.totalDeductions.toLocaleString()}`
  );
  doc
    .font("Helvetica-Bold")
    .text(`Total Net Payable: Rs. ${payrollRun.totalNet.toLocaleString()}`);

  doc.moveDown(2);

  // --- Table Header ---
  const tableTopY = doc.y;
  doc.font("Helvetica-Bold");
  drawTableRow(
    doc,
    tableTopY,
    [
      "Emp ID",
      "Employee Name",
      "Gross Salary",
      "LWP Deduction",
      "Other Deductions",
      "Total Deductions",
      "Net Salary",
    ],
    true
  );
  doc.font("Helvetica");

  // --- Table Rows ---
  let rowY = tableTopY + 20; // Start first row below the header
  for (const item of payrollRun.items) {
    const totalDeductions = item.lwpDeduction + item.otherDeductions;
    const name =
      `${item.user.employeeProfile?.firstName || ""} ${
        item.user.employeeProfile?.lastName || ""
      }`.trim() || "N/A";

    drawTableRow(doc, rowY, [
      item.user.employeeProfile?.employeeId || "N/A",
      name,
      `Rs. ${item.grossSalary.toLocaleString()}`,
      `Rs. ${item.lwpDeduction.toLocaleString()}`,
      `Rs. ${item.otherDeductions.toLocaleString()}`,
      `Rs. ${totalDeductions.toLocaleString()}`,
      `Rs. ${item.netSalary.toLocaleString()}`,
    ]);

    rowY += 20; // Move to the next row

    // Auto-add new page if we're at the bottom
    if (rowY > 500) {
      // 500 is a safe bottom margin
      doc.addPage();
      // Redraw header on new page
      drawTableRow(
        doc,
        40,
        [
          "Emp ID",
          "Employee Name",
          "Gross",
          "LWP Ded.",
          "Other Ded.",
          "Total Ded.",
          "Net Salary",
        ],
        true
      );
      rowY = 60; // Reset Y position
    }
  }

  // Finalize the PDF
  doc.end();
}

/**
 * Helper function to draw a single row in the PDF table.
 * pdfkit doesn't have built-in tables, so we do it manually.
 */
function drawTableRow(
  doc: PDFKit.PDFDocument,
  y: number,
  texts: string[],
  isHeader: boolean = false
) {
  // Define the X positions for each column
  const xPositions = [40, 120, 300, 400, 500, 600, 700];

  doc
    .fontSize(isHeader ? 9 : 8)
    .font(isHeader ? "Helvetica-Bold" : "Helvetica");

  texts.forEach((text, i) => {
    doc.text(text, xPositions[i], y, {
      width: xPositions[i + 1] ? xPositions[i + 1] - xPositions[i] - 10 : 100,
      align: "left",
    });
  });

  // Draw a line under the row
  doc
    .moveTo(40, y + 15)
    .lineTo(760, y + 15) // Approx width of landscape A4 with margins
    .strokeColor(isHeader ? "#333333" : "#cccccc")
    .stroke();
}
