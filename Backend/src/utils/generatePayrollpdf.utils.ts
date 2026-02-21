import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { EmployeeProfile, Offer, PayrollRunItem, User } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_W = 595.28;   // A4 width  (points)
const MARGIN = 40;
const COL_W = (PAGE_W - MARGIN * 2 - 10) / 2; // half-page column width
const L = MARGIN;                           // left  column X
const R = MARGIN + COL_W + 10;              // right column X
const RIGHT_W = PAGE_W - MARGIN;                  // right edge

const BRAND = '#1E3A5F';  // deep navy  – header bg
const ACCENT = '#2563EB';  // blue       – sub-headers
const LIGHT = '#F1F5F9';  // light grey – zebra rows
const GREEN = '#15803D';  // net-salary green
const TEXT = '#1E293B';  // dark text
const MUTED = '#64748B';  // muted text

function curr(n: number) {
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE for Single Payslip PDF
// ─────────────────────────────────────────────────────────────────────────────
export type SinglePayslipData = PayrollRunItem & {
  user: User & { employeeProfile: EmployeeProfile | null };
  run: { month: number; year: number };
  offer: Offer | null;
  tenant: { name: string };
};

// ─────────────────────────────────────────────────────────────────────────────
// generatePayslipPdfBuffer – same layout but returns Promise<Buffer> for email
// ─────────────────────────────────────────────────────────────────────────────
export function generatePayslipPdfBuffer(payslip: SinglePayslipData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    drawPayslip(doc, payslip);
    doc.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// generateSinglePayslipPdf  – streams to HTTP Response
// ─────────────────────────────────────────────────────────────────────────────
export function generateSinglePayslipPdf(payslip: SinglePayslipData, res: Response) {
  const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
  doc.pipe(res);
  drawPayslip(doc, payslip);
  doc.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// drawPayslip – the actual drawing logic (shared by stream + buffer)
// ─────────────────────────────────────────────────────────────────────────────
function drawPayslip(doc: PDFKit.PDFDocument, payslip: SinglePayslipData) {
  const profile = payslip.user.employeeProfile;
  const monthName = new Date(payslip.run.year, payslip.run.month - 1)
    .toLocaleString('default', { month: 'long' });
  // IMPORTANT: otherDeductions = pfDeduction + tax (pre-summed at payroll run time, see payroll.utils.ts)
  // Correct total = otherDeductions + lwpDeduction  (do NOT add pf+tax again)
  const totalDeductions = (payslip.otherDeductions ?? 0) + payslip.lwpDeduction;

  // ── 1. NAVY HEADER BAR ────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_W, 90).fill(BRAND);

  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
    .text(payslip.tenant.name, MARGIN, 18, { width: PAGE_W - MARGIN * 2, align: 'left' });

  doc.fontSize(10).font('Helvetica')
    .text('SALARY SLIP', MARGIN, 50, { width: PAGE_W - MARGIN * 2, align: 'left' });

  doc.fontSize(12).font('Helvetica-Bold')
    .text(`${monthName.toUpperCase()} ${payslip.run.year}`, 0, 28,
      { width: PAGE_W - MARGIN, align: 'right' });

  doc.fontSize(8).font('Helvetica')
    .text('CONFIDENTIAL', 0, 52, { width: PAGE_W - MARGIN, align: 'right' });

  // ── 2. ACCENT STRIPE ──────────────────────────────────────────────────────
  doc.rect(0, 90, PAGE_W, 4).fill(ACCENT);

  // ── 3. EMPLOYEE DETAILS GRID ─────────────────────────────────────────────
  let y = 108;

  sectionHeader(doc, 'EMPLOYEE DETAILS', y);
  y += 22;

  const details: [string, string][] = [
    ['Employee Name', `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'N/A'],
    ['Employee ID', profile?.employeeId || 'N/A'],
    ['Designation', profile?.designation || 'N/A'],
    ['Department', (profile as any)?.department || 'N/A'],
    ['Date of Joining', profile?.joiningDate
      ? new Date(profile.joiningDate).toLocaleDateString('en-IN') : 'N/A'],
    ['Pay Period', `${monthName} ${payslip.run.year}`],
  ];

  for (let i = 0; i < details.length; i += 2) {
    const rowBg = (i / 2) % 2 === 0 ? '#FFFFFF' : LIGHT;
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 20).fill(rowBg);
    infoCell(doc, details[i][0], details[i][1], L, y);
    if (details[i + 1]) infoCell(doc, details[i + 1][0], details[i + 1][1], R, y);
    y += 20;
  }

  y += 14;

  // ── 4. EARNINGS & DEDUCTIONS TABLE ───────────────────────────────────────
  sectionHeader(doc, 'EARNINGS', y, L, COL_W);
  sectionHeader(doc, 'DEDUCTIONS', y, R, COL_W);
  y += 22;

  const earningsRows: [string, number][] = [
    ['Basic Salary', payslip.basicSalary],
    ['House Rent Allowance (HRA)', payslip.hra],
    ['Special Allowance', payslip.allowances],
  ];
  const deductionsRows: [string, number][] = [
    ['Provident Fund (PF)', payslip.pfDeduction],
    ['Income Tax (TDS)', payslip.taxDeduction],
    ['Leave Without Pay', payslip.lwpDeduction],
  ];

  tableColHeader(doc, 'Component', 'Amount', L, y, COL_W);
  tableColHeader(doc, 'Component', 'Amount', R, y, COL_W);
  y += 18;

  const maxRows = Math.max(earningsRows.length, deductionsRows.length);
  for (let i = 0; i < maxRows; i++) {
    const bg = i % 2 === 0 ? '#FFFFFF' : LIGHT;
    doc.rect(L, y, COL_W, 18).fill(bg);
    doc.rect(R, y, COL_W, 18).fill(bg);
    if (earningsRows[i]) tableRow(doc, earningsRows[i][0], earningsRows[i][1], L, y, COL_W);
    if (deductionsRows[i]) tableRowNegative(doc, deductionsRows[i][0], deductionsRows[i][1], R, y, COL_W);
    y += 18;
  }

  const totalsY = y;
  doc.rect(L, totalsY, COL_W, 22).fill('#E2E8F0');
  doc.rect(R, totalsY, COL_W, 22).fill('#E2E8F0');
  doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(10);
  doc.text('Gross Earnings', L + 6, totalsY + 6, { width: COL_W * 0.55 });
  doc.text(curr(payslip.grossSalary), L + 6, totalsY + 6, { width: COL_W - 12, align: 'right' });
  doc.text('Total Deductions', R + 6, totalsY + 6, { width: COL_W * 0.55 });
  doc.text(curr(totalDeductions), R + 6, totalsY + 6, { width: COL_W - 12, align: 'right' });

  y = totalsY + 22 + 14;

  // ── 5. NET SALARY BOX ────────────────────────────────────────────────────
  const netBoxH = 52;
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, netBoxH).fill(GREEN);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(13)
    .text('NET SALARY PAYABLE (Take-Home)', MARGIN + 12, y + 10,
      { width: (PAGE_W - MARGIN * 2) * 0.55 });
  doc.fontSize(20)
    .text(curr(payslip.netSalary), MARGIN + 12, y + 8,
      { width: PAGE_W - MARGIN * 2 - 24, align: 'right' });
  doc.fillColor(LIGHT).font('Helvetica').fontSize(8)
    .text(
      `Gross: ${curr(payslip.grossSalary)}   –   Deductions: ${curr(totalDeductions)}`,
      MARGIN + 12, y + 33, { width: PAGE_W - MARGIN * 2 - 24, align: 'left' }
    );

  y += netBoxH + 20;

  // ── 6. NOTES & SIGNATURE ─────────────────────────────────────────────────
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 1).fill('#CBD5E1');
  y += 10;
  doc.fillColor(MUTED).font('Helvetica').fontSize(8)
    .text(
      'This is a system-generated salary slip and does not require a physical signature. ' +
      'For any discrepancies, please contact your HR department.',
      MARGIN, y, { width: PAGE_W - MARGIN * 2, align: 'left' }
    );
  y += 22;

  const sigY = y + 14;
  doc.fillColor(TEXT).font('Helvetica').fontSize(9);
  doc.text('_________________________', MARGIN, sigY);
  doc.text('Employee Signature', MARGIN, sigY + 12, { width: 200 });
  doc.text('_________________________', PAGE_W - MARGIN - 180, sigY, { width: 180 });
  doc.text('Authorised Signatory', PAGE_W - MARGIN - 180, sigY + 12, { width: 180 });

  // ── 7. FOOTER ─────────────────────────────────────────────────────────────
  doc.rect(0, 810, PAGE_W, 32).fill(BRAND);
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
    .text(
      `Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}   |   ${payslip.tenant.name}   |   Confidential`,
      0, 820, { width: PAGE_W, align: 'center' }
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helper functions
// ─────────────────────────────────────────────────────────────────────────────

/** Blue section header bar */
function sectionHeader(
  doc: PDFKit.PDFDocument,
  label: string,
  y: number,
  x: number = MARGIN,
  width: number = PAGE_W - MARGIN * 2
) {
  doc.rect(x, y, width, 18).fill(ACCENT);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
    .text(label, x + 8, y + 4, { width: width - 16 });
}

/** Column sub-header (Component | Amount) inside a table */
function tableColHeader(
  doc: PDFKit.PDFDocument,
  left: string,
  right: string,
  x: number,
  y: number,
  w: number
) {
  doc.rect(x, y, w, 18).fill('#CBD5E1');
  doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(8.5);
  doc.text(left, x + 6, y + 4, { width: w * 0.6 });
  doc.text(right, x + 6, y + 4, { width: w - 12, align: 'right' });
}

/** Normal earnings row */
function tableRow(
  doc: PDFKit.PDFDocument,
  label: string,
  value: number,
  x: number,
  y: number,
  w: number
) {
  doc.fillColor(TEXT).font('Helvetica').fontSize(9);
  doc.text(label, x + 6, y + 4, { width: w * 0.6 });
  doc.font('Helvetica-Bold')
    .text(curr(value), x + 6, y + 4, { width: w - 12, align: 'right' });
}

/** Deduction row – value in muted red */
function tableRowNegative(
  doc: PDFKit.PDFDocument,
  label: string,
  value: number,
  x: number,
  y: number,
  w: number
) {
  doc.fillColor(TEXT).font('Helvetica').fontSize(9);
  doc.text(label, x + 6, y + 4, { width: w * 0.6 });
  doc.fillColor('#B91C1C').font('Helvetica-Bold')
    .text(curr(value), x + 6, y + 4, { width: w - 12, align: 'right' });
}

/** Key-value info cell */
function infoCell(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number
) {
  const labelW = COL_W * 0.40;
  const valueW = COL_W * 0.58;

  doc.fillColor(MUTED).font('Helvetica').fontSize(8.5)
    .text(label, x + 6, y + 5, { width: labelW });

  doc.fillColor(TEXT).font('Helvetica-Bold').fontSize(8.5)
    .text(value, x + 6 + labelW, y + 5, { width: valueW });
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPE for Bulk Payroll PDF (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export type PayrollDataForPdf = {
  id: string;
  month: number;
  year: number;
  totalEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  processedAt: Date;
  tenant: { name: string };
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
 * Generates a bulk payroll summary PDF (admin report) and streams it.
 */
export function generatePayrollPdf(payrollRun: PayrollDataForPdf, res: Response) {
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, bufferPages: true });
  doc.pipe(res);

  const LW = 841.89; // landscape width
  const LH = 595.28;
  const monthName = new Date(payrollRun.year, payrollRun.month - 1)
    .toLocaleString('default', { month: 'long' });

  // Header
  doc.rect(0, 0, LW, 70).fill(BRAND);
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20)
    .text(payrollRun.tenant.name, 40, 14, { width: LW - 80 });
  doc.font('Helvetica').fontSize(11)
    .text(`Payroll Report — ${monthName} ${payrollRun.year}`, 40, 40, { width: LW - 80 });
  doc.fontSize(9).text(
    `Processed: ${payrollRun.processedAt.toLocaleDateString('en-IN')}   |   Employees: ${payrollRun.totalEmployees}`,
    0, 50, { width: LW - 40, align: 'right' }
  );
  doc.rect(0, 70, LW, 4).fill(ACCENT);

  // Summary strip
  let y = 84;
  doc.rect(40, y, LW - 80, 28).fill(LIGHT);
  doc.fillColor(TEXT).font('Helvetica').fontSize(9).text(
    `Total Gross: ${curr(payrollRun.totalGross)}    Total Deductions: ${curr(payrollRun.totalDeductions)}    Total Net Payable: ${curr(payrollRun.totalNet)}`,
    46, y + 9, { width: LW - 92 }
  );
  y += 40;

  // Table columns: Emp ID | Name | Gross | LWP | Other Ded | Total Ded | Net
  const cols = [40, 120, 380, 480, 560, 640, 720, 800];
  const headers = ['Emp ID', 'Employee Name', 'Gross Salary', 'LWP', 'Other Ded.', 'Total Ded.', 'Net Salary'];

  // Header row
  doc.rect(40, y, LW - 80, 20).fill(ACCENT);
  doc.fillColor('#FFF').font('Helvetica-Bold').fontSize(8.5);
  headers.forEach((h, i) => {
    doc.text(h, cols[i], y + 5, { width: cols[i + 1] - cols[i] - 4, align: i > 1 ? 'right' : 'left' });
  });
  y += 20;

  // Data rows
  doc.font('Helvetica').fontSize(8.5);
  for (let idx = 0; idx < payrollRun.items.length; idx++) {
    const item = payrollRun.items[idx];
    const bg = idx % 2 === 0 ? '#FFFFFF' : LIGHT;
    doc.rect(40, y, LW - 80, 18).fill(bg);

    const name = `${item.user.employeeProfile?.firstName || ''} ${item.user.employeeProfile?.lastName || ''}`.trim() || 'N/A';
    const totalDed = item.lwpDeduction + item.otherDeductions;

    const cells = [
      item.user.employeeProfile?.employeeId || 'N/A',
      name,
      curr(item.grossSalary),
      curr(item.lwpDeduction),
      curr(item.otherDeductions),
      curr(totalDed),
      curr(item.netSalary),
    ];

    doc.fillColor(TEXT);
    cells.forEach((cell, i) => {
      doc.text(cell, cols[i], y + 4, {
        width: cols[i + 1] - cols[i] - 4,
        align: i > 1 ? 'right' : 'left',
      });
    });
    y += 18;

    if (y > LH - 60) {
      doc.addPage({ layout: 'landscape' });
      y = 40;
    }
  }

  // Footer
  doc.rect(0, LH - 28, LW, 28).fill(BRAND);
  doc.fillColor('#94A3B8').font('Helvetica').fontSize(8)
    .text(
      `Generated ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}   |   ${payrollRun.tenant.name}   |   Confidential`,
      0, LH - 18, { width: LW, align: 'center' }
    );

  doc.end();
}
