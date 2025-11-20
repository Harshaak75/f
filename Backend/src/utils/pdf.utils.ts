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


// ====================================================================
// Generic PDF Report Generator
// ====================================================================
/**
 * Generates a dynamic PDF report from a set of headers and rows.
 * @param title The title of the report.
 * @param headers An array of strings for the table headers (e.g., ['Name', 'Email'])
 * @param rows An array of string arrays for the data (e.g., [['John', 'j@a.com'], ['Jane', 'j@b.com']])
 * @param res The Express response object to stream the PDF to.
 */
export function generateDynamicPdfReport(
  title: string,
  headers: string[],
  rows: string[][],
  res: Response
) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin: 40,
  });

  doc.pipe(res);

  // --- Header ---
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'left' });
  doc.fontSize(10).font('Helvetica').text(`Report Generated: ${new Date().toLocaleDateString('en-IN')}`);
  doc.moveDown(2);

  // --- Table ---
  const tableTop = doc.y;
  const colCount = headers.length;
  const colWidth = (doc.page.width - 80) / colCount; // 80 = 40 margin left + 40 margin right
  
  // Draw Header
  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((header, i) => {
    doc.text(header, 40 + (i * colWidth), tableTop, {
      width: colWidth - 10, // 10 padding
      align: 'left',
    });
  });
  // Draw header line
  doc.moveTo(40, doc.y + 5).lineTo(doc.page.width - 40, doc.y + 5).strokeColor('#333333').stroke();
  
  // Draw Rows
  doc.font('Helvetica').fontSize(8);
  let rowY = doc.y + 10;
  
  rows.forEach(row => {
    // Check for page break
    if (rowY > (doc.page.height - 50)) { // 50 as bottom margin
      doc.addPage();
      rowY = 40; // Reset to top margin
      // Redraw header on new page
      doc.font('Helvetica-Bold').fontSize(9);
      headers.forEach((header, i) => {
        doc.text(header, 40 + (i * colWidth), rowY, {
          width: colWidth - 10,
          align: 'left',
        });
      });
      doc.moveTo(40, doc.y + 5).lineTo(doc.page.width - 40, doc.y + 5).strokeColor('#333333').stroke();
      doc.font('Helvetica').fontSize(8);
      rowY = doc.y + 10;
    }
    
    // Draw cells for the current row
    row.forEach((cell, i) => {
      doc.text(cell, 40 + (i * colWidth), rowY, {
        width: colWidth - 10,
        align: 'left',
      });
    });
    
    rowY += 20; // Move to the next row position
  });

  doc.end();
}


// ====================================================================
// Bulk Payroll PDF Generator (Uses the generic function)
// ====================================================================
export function generatePayrollPdf(payrollRun: PayrollDataForPdf, res: Response) {
  // 1. Format the data for the generic function
  const title = `Payroll Processed Report - ${new Date(payrollRun.year, payrollRun.month - 1).toLocaleString('default', { month: 'long' })} ${payrollRun.year}`;
  
  const headers = [
    'Emp ID',
    'Employee Name',
    'Gross Salary',
    'LWP Deduction',
    'Other Deductions',
    'Total Deductions',
    'Net Salary',
  ];
  
  const rows = payrollRun.items.map(item => {
    const totalDeductions = item.lwpDeduction + item.otherDeductions;
    const name = `${item.user.employeeProfile?.firstName || ''} ${item.user.employeeProfile?.lastName || ''}`.trim() || 'N/A';
    return [
      item.user.employeeProfile?.employeeId || 'N/A',
      name,
      `Rs. ${item.grossSalary.toLocaleString('en-IN')}`,
      `Rs. ${item.lwpDeduction.toLocaleString('en-IN')}`,
      `Rs. ${item.otherDeductions.toLocaleString('en-IN')}`,
      `Rs. ${totalDeductions.toLocaleString('en-IN')}`,
      `Rs. ${item.netSalary.toLocaleString('en-IN')}`,
    ];
  });
  
  // 2. Call the generic function
  generateDynamicPdfReport(title, headers, rows, res);
}

// ====================================================================
// Single Payslip PDF Generator (Highly custom, does not use generic fn)
// ====================================================================
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
  doc.font('Helvetica').text(`Employee ID:`, 50, detailTop, { continued: true }).font('Helvetica-Bold').text(` ${profile?.employeeId || 'N/A'}`, { align: 'right' });

  doc.text(`Designation:`, { continued: true }).font('Helvetica-Bold').text(` ${profile?.designation || 'N/A'}`);
  doc.font('Helvetica').text(`Department:`, 50, doc.y - 15, { continued: true }).font('Helvetica-Bold').text(` ${profile?.designation || 'N/A'}`, { align: 'right' });

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
    doc.text(`Rs. ${value.toLocaleString('en-IN')}`, 200, earningsY, { width: 100, align: 'right' });
    earningsY += 20;
  });

  deductions.forEach(([label, value]) => {
    doc.text(label as string, 300, deductionsY, { width: 150 });
    doc.text(`Rs. ${value.toLocaleString('en-IN')}`, 450, deductionsY, { width: 100, align: 'right' });
    deductionsY += 20;
  });
  
  const bottomY = Math.max(earningsY, deductionsY);
  doc.moveTo(50, bottomY + 5).lineTo(280, bottomY + 5).stroke();
  doc.moveTo(300, bottomY + 5).lineTo(540, bottomY + 5).stroke();
  doc.moveDown(1);

  // --- Totals ---
  doc.font('Helvetica-Bold');
  doc.text('Gross Salary', 50, bottomY + 15, { width: 150 });
  doc.text(`Rs. ${payslip.grossSalary.toLocaleString('en-IN')}`, 200, bottomY + 15, { width: 100, align: 'right' });
  
  const totalDeductions = payslip.otherDeductions + payslip.lwpDeduction;
  doc.text('Total Deductions', 300, bottomY + 15, { width: 150 });
  doc.text(`Rs. ${totalDeductions.toLocaleString('en-IN')}`, 450, bottomY + 15, { width: 100, align: 'right' });
  
  doc.moveDown(2);
  
  // --- Net Salary ---
  doc.rect(50, doc.y, 500, 50).fillOpacity(0.1).fillAndStroke('#aaaaaa', '#aaaaaa');
  doc.fillOpacity(1).font('Helvetica-Bold').fontSize(14);
  doc.text('Net Salary', 60, doc.y + 18);
  doc.text(`Rs. ${payslip.netSalary.toLocaleString('en-IN')}`, 300, doc.y - 15, { align: 'right' });

  // Finalize
  doc.end();
}