import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { EmployeeProfile, Offer, PayrollRunItem, User } from '@prisma/client';

// --- TYPE for Bulk Payroll PDF ---
export type PayrollDataForPdf = {
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
    size: 'A4',
    layout: 'landscape', // Use landscape for wider tables
    margin: 40,
  });

  // Pipe the PDF stream directly to the user's browser
  doc.pipe(res);

  // --- PDF Header ---
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(payrollRun.tenant.name, { align: 'left' });
  doc.fontSize(14).font('Helvetica').text('Payroll Processed Report');

  const monthName = new Date(
    payrollRun.year,
    payrollRun.month - 1
  ).toLocaleString('default', { month: 'long' });
  doc
    .fontSize(12)
    .text(`${monthName} ${payrollRun.year}`, { align: 'left' });

  doc.moveDown(1);

  // --- Summary ---
  doc.fontSize(10).font('Helvetica');
  doc.text(`Processed On: ${payrollRun.processedAt.toLocaleDateString('en-IN')}`);
  doc.text(`Total Employees: ${payrollRun.totalEmployees}`);
  doc.text(`Total Gross Salary: Rs. ${payrollRun.totalGross.toLocaleString()}`);
  doc.text(
    `Total Deductions: Rs. ${payrollRun.totalDeductions.toLocaleString()}`
  );
  doc
    .font('Helvetica-Bold')
    .text(`Total Net Payable: Rs. ${payrollRun.totalNet.toLocaleString()}`);

  doc.moveDown(2);

  // --- Table Header ---
  const tableTopY = doc.y;
  doc.font('Helvetica-Bold');
  drawTableRow(
    doc,
    tableTopY,
    [
      'Emp ID',
      'Employee Name',
      'Gross Salary',
      'LWP Deduction',
      'Other Deductions',
      'Total Deductions',
      'Net Salary',
    ],
    true
  );
  doc.font('Helvetica');

  // --- Table Rows ---
  let rowY = tableTopY + 20; // Start first row below the header
  for (const item of payrollRun.items) {
    const totalDeductions = item.lwpDeduction + item.otherDeductions;
    const name =
      `${item.user.employeeProfile?.firstName || ''} ${
        item.user.employeeProfile?.lastName || ''
      }`.trim() || 'N/A';
    
    drawTableRow(doc, rowY, [
      item.user.employeeProfile?.employeeId || 'N/A',
      name,
      `Rs. ${item.grossSalary.toLocaleString()}`,
      `Rs. ${item.lwpDeduction.toLocaleString()}`,
      `Rs. ${item.otherDeductions.toLocaleString()}`,
      `Rs. ${totalDeductions.toLocaleString()}`,
      `Rs. ${item.netSalary.toLocaleString()}`,
    ]);
    
    rowY += 20; // Move to the next row
    
    // Auto-add new page if we're at the bottom
    if (rowY > 500) { // 500 is a safe bottom margin
      doc.addPage();
      // Redraw header on new page
      drawTableRow(doc, 40, ['Emp ID', 'Employee Name', 'Gross', 'LWP Ded.', 'Other Ded.', 'Total Ded.', 'Net Salary'], true);
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
  
  doc.fontSize(isHeader ? 9 : 8).font(isHeader ? 'Helvetica-Bold' : 'Helvetica');

  texts.forEach((text, i) => {
    doc.text(text, xPositions[i], y, {
      width: xPositions[i+1] ? (xPositions[i+1] - xPositions[i] - 10) : 100,
      align: 'left'
    });
  });
  
  // Draw a line under the row
  doc.moveTo(40, y + 15)
     .lineTo(760, y + 15) // Approx width of landscape A4 with margins
     .strokeColor(isHeader ? '#333333' : '#cccccc')
     .stroke();
}


// --- TYPE for Single Payslip PDF ---
export type SinglePayslipData = PayrollRunItem & {
  user: User & {
    employeeProfile: EmployeeProfile | null;
  };
  run: {
    month: number;
    year: number;
  };
  offer: Offer | null;
  tenant: { name: string };
};

/**
 * Generates a PDF for a single payslip.
 * @param payslip The payslip data from the database.
 * @param res The Express response object.
 */
export function generateSinglePayslipPdf(
  payslip: SinglePayslipData,
  res: Response
) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  doc.pipe(res);

  const profile = payslip.user.employeeProfile;
  const monthName = new Date(
    payslip.run.year,
    payslip.run.month - 1
  ).toLocaleString('default', { month: 'long' });

  // --- Header ---
  doc.fontSize(20).font('Helvetica-Bold').text(payslip.tenant.name, { align: 'center' });
  doc.fontSize(14).font('Helvetica').text(`Salary Slip - ${monthName} ${payslip.run.year}`, { align: 'center' });
  doc.moveDown(2);

  // --- Employee Details ---
  doc.fontSize(12).font('Helvetica-Bold').text('Employee Details', { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica');
  
  const detailTop = doc.y;
  doc.text(`Employee Name:`, { continued: true }).font('Helvetica-Bold').text(` ${profile?.firstName || ''} ${profile?.lastName || ''}`);
  doc.font('Helvetica').text(`Employee ID:`, detailTop, undefined, { continued: true }).font('Helvetica-Bold').text(` ${profile?.employeeId || 'N/A'}`, { align: 'right' });

  doc.text(`Designation:`, { continued: true }).font('Helvetica-Bold').text(` ${profile?.designation || 'N/A'}`);
  doc.font('Helvetica').text(`Department:`, undefined, doc.y - 15, { continued: true }).font('Helvetica-Bold').text(` ${profile?.designation || 'N/A'}`, { align: 'right' });

  doc.moveDown(2);

  // --- Earnings & Deductions ---
  const tableTop = doc.y;
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Earnings', { width: 250, underline: true });
  doc.text('Deductions', 300, tableTop, { width: 250, underline: true });
  doc.moveDown(0.5);

  const earnings = [
    ['Basic Salary', payslip.basicSalary],
    ['HRA', payslip.hra],
    ['Allowances', payslip.allowances],
  ];
  
  const deductions = [
    ['PF Contribution', payslip.pfDeduction],
    ['Income Tax (TDS)', payslip.taxDeduction],
    ['Leave Without Pay (LWP)', payslip.lwpDeduction],
  ];

  doc.fontSize(10).font('Helvetica');
  let earningsY = doc.y;
  let deductionsY = doc.y;

  earnings.forEach(([label, value]) => {
    doc.text(label as string, 50, earningsY, { width: 150 });
    doc.text(`Rs. ${value.toLocaleString()}`, 200, earningsY, { width: 100, align: 'right' });
    earningsY += 20;
  });

  deductions.forEach(([label, value]) => {
    doc.text(label as string, 300, deductionsY, { width: 150 });
    doc.text(`Rs. ${value.toLocaleString()}`, 450, deductionsY, { width: 100, align: 'right' });
    deductionsY += 20;
  });
  
  const bottomY = Math.max(earningsY, deductionsY);
  doc.moveTo(50, bottomY + 5).lineTo(280, bottomY + 5).stroke();
  doc.moveTo(300, bottomY + 5).lineTo(540, bottomY + 5).stroke();
  doc.moveDown(1);

  // --- Totals ---
  doc.font('Helvetica-Bold');
  doc.text('Gross Salary', 50, bottomY + 15, { width: 150 });
  doc.text(`Rs. ${payslip.grossSalary.toLocaleString()}`, 200, bottomY + 15, { width: 100, align: 'right' });
  
  const totalDeductions = payslip.otherDeductions + payslip.lwpDeduction;
  doc.text('Total Deductions', 300, bottomY + 15, { width: 150 });
  doc.text(`Rs. ${totalDeductions.toLocaleString()}`, 450, bottomY + 15, { width: 100, align: 'right' });
  
  doc.moveDown(2);
  
  // --- Net Salary ---
  doc.rect(50, doc.y, 500, 50).fillOpacity(0.1).fillAndStroke('#aaaaaa', '#aaaaaa');
  doc.fillOpacity(1).font('Helvetica-Bold').fontSize(14);
  doc.text('Net Salary', 60, doc.y + 18);
  doc.text(`Rs. ${payslip.netSalary.toLocaleString()}`, 300, doc.y - 15, { align: 'right' });

  // Finalize
  doc.end();
}

