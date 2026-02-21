import { EmployeeProfile, Offer, PayrollRunItem, User } from '@prisma/client';
import prisma from '../prisma/client';
import nodemailer from 'nodemailer';
import { generatePayslipPdfBuffer, SinglePayslipData } from './generatePayrollpdf.utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PayslipData = PayrollRunItem & {
  user: User & { employeeProfile: EmployeeProfile | null };
  run: { month: number; year: number };
  offer: Offer | null;
  tenant?: { name: string } | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Currency helper
// ─────────────────────────────────────────────────────────────────────────────
function curr(n: number) {
  return `Rs. ${Math.round(n).toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// formatPayslipHtml  – industry-standard HTML email body
// ─────────────────────────────────────────────────────────────────────────────
export function formatPayslipHtml(payslip: PayslipData): string {
  const profile = payslip.user.employeeProfile;
  const monthName = new Date(payslip.run.year, payslip.run.month - 1)
    .toLocaleString('default', { month: 'long' });
  const year = payslip.run.year;
  const empName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Employee';
  // IMPORTANT: otherDeductions = pfDeduction + tax (pre-summed at payroll run time)
  // Correct total = otherDeductions + lwpDeduction. Do NOT add pf+tax again.
  const totalDed = (payslip.otherDeductions ?? 0) + payslip.lwpDeduction;
  const companyName = (payslip as any).tenant?.name || 'Your Company';

  const tableRow = (label: string, value: string, valueColor = '#1E293B') =>
    `<tr>
       <td style="padding:9px 16px;border-bottom:1px solid #F1F5F9;color:#475569;font-size:13px;">${label}</td>
       <td style="padding:9px 16px;border-bottom:1px solid #F1F5F9;text-align:right;font-weight:600;font-size:13px;color:${valueColor};">${value}</td>
     </tr>`;

  const infoRow = (label: string, value: string) =>
    `<tr>
       <td style="padding:7px 0;color:#64748B;font-size:12px;width:45%;">${label}</td>
       <td style="padding:7px 0;color:#1E293B;font-weight:600;font-size:12px;">${value}</td>
     </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Salary Slip – ${monthName} ${year}</title>
</head>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 0;">
    <tr><td align="center">

      <!-- Email card -->
      <table width="620" cellpadding="0" cellspacing="0"
             style="background:#FFFFFF;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:620px;width:100%;">

        <!-- ══ HEADER ══════════════════════════════════════════════════════ -->
        <tr>
          <td style="background:#1E3A5F;padding:32px 36px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                    ${companyName}
                  </p>
                  <p style="margin:6px 0 0;color:#93C5FD;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">
                    Salary Slip
                  </p>
                </td>
                <td align="right" valign="top">
                  <span style="display:inline-block;background:#2563EB;color:#FFFFFF;
                               border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;">
                    ${monthName.toUpperCase()} ${year}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Blue accent stripe -->
        <tr><td style="background:#2563EB;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- ══ GREETING ════════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:28px 36px 0;">
            <p style="margin:0;font-size:15px;color:#1E293B;line-height:1.6;">
              Dear <strong>${empName}</strong>,
            </p>
            <p style="margin:10px 0 0;font-size:14px;color:#475569;line-height:1.6;">
              Please find your salary slip for <strong>${monthName} ${year}</strong> below.
              A PDF copy is also attached to this email for your records.
            </p>
          </td>
        </tr>

        <!-- ══ EMPLOYEE DETAILS ════════════════════════════════════════════ -->
        <tr>
          <td style="padding:24px 36px 0;">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:1.5px;
                      text-transform:uppercase;color:#2563EB;border-bottom:2px solid #DBEAFE;
                      padding-bottom:8px;">
              Employee Details
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${infoRow('Employee Name', empName)}
              ${infoRow('Employee ID', profile?.employeeId || 'N/A')}
              ${infoRow('Designation', profile?.designation || 'N/A')}
              ${infoRow('Pay Period', `${monthName} ${year}`)}
            </table>
          </td>
        </tr>

        <!-- ══ EARNINGS & DEDUCTIONS side-by-side ═════════════════════════ -->
        <tr>
          <td style="padding:24px 36px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr valign="top">

                <!-- EARNINGS column -->
                <td width="48%" style="padding-right:8px;">
                  <p style="margin:0 0 0;font-size:11px;font-weight:700;letter-spacing:1.5px;
                            text-transform:uppercase;color:#2563EB;border-bottom:2px solid #DBEAFE;
                            padding-bottom:8px;">
                    Earnings
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
                    ${tableRow('Basic Salary', curr(payslip.basicSalary))}
                    ${tableRow('House Rent Allowance', curr(payslip.hra))}
                    ${tableRow('Special Allowance', curr(payslip.allowances))}
                    <!-- Gross total row -->
                    <tr style="background:#EFF6FF;">
                      <td style="padding:10px 16px;color:#1E3A5F;font-size:13px;font-weight:700;">
                        Gross Salary
                      </td>
                      <td style="padding:10px 16px;text-align:right;color:#1E3A5F;font-size:13px;font-weight:700;">
                        ${curr(payslip.grossSalary)}
                      </td>
                    </tr>
                  </table>
                </td>

                <!-- Spacer -->
                <td width="4%"></td>

                <!-- DEDUCTIONS column -->
                <td width="48%" style="padding-left:8px;">
                  <p style="margin:0 0 0;font-size:11px;font-weight:700;letter-spacing:1.5px;
                            text-transform:uppercase;color:#DC2626;border-bottom:2px solid #FEE2E2;
                            padding-bottom:8px;">
                    Deductions
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:4px;">
                    ${tableRow('Provident Fund (PF)', curr(payslip.pfDeduction), '#B91C1C')}
                    ${tableRow('Income Tax (TDS)', curr(payslip.taxDeduction), '#B91C1C')}
                    ${tableRow('Leave Without Pay', curr(payslip.lwpDeduction), '#B91C1C')}
                    <!-- Total deductions row -->
                    <tr style="background:#FEF2F2;">
                      <td style="padding:10px 16px;color:#991B1B;font-size:13px;font-weight:700;">
                        Total Deductions
                      </td>
                      <td style="padding:10px 16px;text-align:right;color:#991B1B;font-size:13px;font-weight:700;">
                        ${curr(totalDed)}
                      </td>
                    </tr>
                  </table>
                </td>

              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ NET SALARY ══════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:20px 36px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:linear-gradient(135deg,#15803D,#16A34A);
                          border-radius:10px;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0;font-size:12px;font-weight:600;letter-spacing:1.5px;
                            text-transform:uppercase;color:#BBF7D0;">
                    Net Salary Payable (Take-Home)
                  </p>
                  <p style="margin:6px 0 0;font-size:30px;font-weight:800;color:#FFFFFF;letter-spacing:-1px;">
                    ${curr(payslip.netSalary)}
                  </p>
                </td>
                <td align="right" style="padding:20px 24px;">
                  <p style="margin:0;font-size:11px;color:#D1FAE5;line-height:1.7;">
                    Gross: ${curr(payslip.grossSalary)}<br/>
                    Deductions: – ${curr(totalDed)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ DOWNLOAD NOTE ═══════════════════════════════════════════════ -->
        <tr>
          <td style="padding:20px 36px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;">
              <tr>
                <td style="padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#1E40AF;line-height:1.6;">
                    📎 <strong>A PDF copy of your salary slip is attached</strong> to this email.
                    You can download and save it for your records.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ══ FOOTER ══════════════════════════════════════════════════════ -->
        <tr>
          <td style="padding:28px 36px 32px;border-top:1px solid #F1F5F9;margin-top:20px;">
            <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
              This is a system-generated email. Please do not reply to this message.<br/>
              For any salary queries, please contact your HR department.
            </p>
            <p style="margin:16px 0 0;font-size:11px;color:#CBD5E1;">
              © ${new Date().getFullYear()} ${companyName}. All rights reserved. &nbsp;|&nbsp; CONFIDENTIAL
            </p>
          </td>
        </tr>

      </table>
      <!-- / Email card -->

    </td></tr>
  </table>
  <!-- / Outer wrapper -->

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// sendEmail  – plain HTML only (used for non-payslip emails)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: nodemailer.SendMailOptions['attachments']
): Promise<void> {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.log('==================================================');
    console.log('--- DUMMY EMAIL SENDER ---');
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`ATTACHMENTS: ${attachments?.length ?? 0} file(s)`);
    console.log('BODY (first 300 chars):');
    console.log(html.substring(0, 300) + '...');
    console.log('--- EMAIL "SENT" ---');
    console.log('==================================================');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.verify();
  console.log('✅ SMTP verified');

  const info = await transporter.sendMail({
    from: `"${process.env.SMTP_FROM_NAME || 'HRM System'}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    attachments,
  });

  console.log('📧 Message ID:', info.messageId);
  console.log('📬 Accepted:', info.accepted);
  console.log('🚫 Rejected:', info.rejected);
}

// ─────────────────────────────────────────────────────────────────────────────
// sendPayslipEmail  – generates PDF + sends rich HTML email with attachment
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPayslipEmail(
  payslipData: PayslipData,
  tenantName: string
): Promise<void> {
  const profile = payslipData.user.employeeProfile;
  const monthName = new Date(payslipData.run.year, payslipData.run.month - 1)
    .toLocaleString('default', { month: 'long' });

  const subject = `Your Salary Slip for ${monthName} ${payslipData.run.year} – ${tenantName}`;
  const htmlBody = formatPayslipHtml({ ...payslipData, tenant: { name: tenantName } });

  // Generate the PDF buffer for the attachment
  let pdfBuffer: Buffer | undefined;
  try {
    const dataWithTenant: SinglePayslipData = {
      ...payslipData,
      tenant: { name: tenantName },
    };
    pdfBuffer = await generatePayslipPdfBuffer(dataWithTenant);
  } catch (err) {
    console.error('⚠️  PDF generation failed, sending email without attachment:', err);
  }

  const empName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Employee';
  const filename = `Salary-Slip-${monthName}-${payslipData.run.year}-${profile?.employeeId || empName}.pdf`;

  const attachments: nodemailer.SendMailOptions['attachments'] = pdfBuffer
    ? [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]
    : [];

  // Prefer personal email, fall back to login/work email
  const recipientEmail =
    profile?.personalEmail?.trim() || payslipData.user.email;

  await sendEmail(recipientEmail, subject, htmlBody, attachments);
}

// ─────────────────────────────────────────────────────────────────────────────
// getFormattedPayslip  – fetch payslip + offer from DB
// ─────────────────────────────────────────────────────────────────────────────
export async function getFormattedPayslip(
  payslipId: string,
  tenantId: string
): Promise<PayslipData | null> {
  const payslip = await prisma.payrollRunItem.findFirst({
    where: { id: payslipId, tenantId },
    include: {
      user: { include: { employeeProfile: true } },
      run: { select: { month: true, year: true } },
    },
  });

  if (!payslip) return null;

  const offer = await prisma.offer.findUnique({ where: { userId: payslip.userId } });
  return { ...payslip, offer } as PayslipData;
}
