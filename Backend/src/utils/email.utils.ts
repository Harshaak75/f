import { EmployeeProfile, Offer, PayrollRunItem, User } from '@prisma/client';
import prisma from '../prisma/client'; // Import prisma client
import nodemailer from 'nodemailer';

// A type combining the data needed for a payslip
type PayslipData = PayrollRunItem & {
  user: User & {
    employeeProfile: EmployeeProfile | null;
  };
  run: {
    month: number;
    year: number;
  };
  offer: Offer | null; // We need the offer for the salary breakdown
};

/**
 * Formats payslip data into a clean HTML string for an email.
 */
export function formatPayslipHtml(payslip: PayslipData): string {
  const monthName = new Date(
    payslip.run.year,
    payslip.run.month - 1
  ).toLocaleString('default', { month: 'long' });
  const year = payslip.run.year;
  const profile = payslip.user.employeeProfile;
  const offer = payslip.offer;

  // Helper for formatting currency
  const curr = (val: number) => `Rs. ${val.toLocaleString()}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
      <h1 style="text-align: center; color: #333;">Salary Slip</h1>
      <p style="text-align: center; color: #555; margin-top: -10px;">For ${monthName} ${year}</p>
      
      <h2 style="font-size: 1.2em; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Employee Details</h2>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 5px 0;"><strong>Employee Name:</strong></td>
          <td style="padding: 5px 0;">${profile?.firstName || ''} ${profile?.lastName || ''
    }</td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Employee ID:</strong></td>
          <td style="padding: 5px 0;">${profile?.employeeId || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0;"><strong>Designation:</strong></td>
          <td style="padding: 5px 0;">${profile?.designation || 'N/A'}</td>
        </tr>
      </table>

      <div style="display: flex; justify-content: space-between; margin-top: 20px;">
        <div style="width: 48%;">
          <h2 style="font-size: 1.2em; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Earnings</h2>
          <table style="width: 100%;">
            <tr><td style="padding: 5px 0;">Basic Salary</td><td style="text-align: right; padding: 5px 0;">${curr(
      payslip.basicSalary
    )}</td></tr>
            <tr><td style="padding: 5px 0;">HRA</td><td style="text-align: right; padding: 5px 0;">${curr(
      payslip.hra
    )}</td></tr>
            <tr><td style="padding: 5px 0;">Allowances</td><td style="text-align: right; padding: 5px 0;">${curr(
      payslip.allowances
    )}</td></tr>
            <tr style="font-weight: bold; border-top: 1px solid #ddd;">
              <td style="padding: 8px 0;">Gross Salary</td>
              <td style="text-align: right; padding: 8px 0;">${curr(
      payslip.grossSalary
    )}</td>
            </tr>
          </table>
        </div>

        <div style="width: 48%;">
          <h2 style="font-size: 1.2em; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px;">Deductions</h2>
          <table style="width: 100%;">
            <tr><td style="padding: 5px 0;">PF Contribution</td><td style="text-align: right; padding: 5px 0;">${curr(
      payslip.pfDeduction
    )}</td></tr>
            <tr><td style="padding: 5px 0;">Income Tax (TDS)</td><td style="text-align: right; padding: 5px 0;">${curr(
      payslip.taxDeduction
    )}</td></tr>
            <tr><td style="padding: 5px 0;">Leave Without Pay (LWP)</td><td style="text-align: right; padding: 5px 0;">${curr(
      payslip.lwpDeduction
    )}</td></tr>
            <tr style="font-weight: bold; border-top: 1px solid #ddd;">
              <td style="padding: 8px 0;">Total Deductions</td>
              <td style="text-align: right; padding: 8px 0;">${curr(
      payslip.otherDeductions + payslip.lwpDeduction
    )}</td>
            </tr>
          </table>
        </div>
      </div>

      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
        <h3 style="margin: 0; font-size: 1.1em;">Net Salary</h3>
        <p style="font-size: 2em; font-weight: bold; color: #28a745; margin: 5px 0;">${curr(
      payslip.netSalary
    )}</p>
      </div>
    </div>
  `;
}

/**
 * DUMMY Email Sending Service
 * In a real app, this would use Nodemailer or an API like SendGrid.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    console.log('==================================================');
    console.log('--- DUMMY EMAIL SENDER ---');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log('BODY (HTML):');
    console.log(html.substring(0, 300) + '...');
    console.log('--- EMAIL "SENT" ---');
    console.log('==================================================');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,          // mail.dotspeaks.com
    port: Number(process.env.SMTP_PORT),  // 465
    secure: false,                        // MUST be true for 465
    auth: {
      user: process.env.SMTP_USER,        // no-reply@dotspeaks.com
      pass: process.env.SMTP_PASS,
    }
  });

  // ✅ Verify connection
  await transporter.verify();
  console.log("✅ SMTP verified");

  const info = await transporter.sendMail({
    from: `${process.env.SMTP_USER}`, // ⭐ IMPORTANT
    to,
    subject,
    html,
  });

  console.log("📧 Message ID:", info.messageId);
  console.log("📬 Accepted:", info.accepted);
  console.log("🚫 Rejected:", info.rejected);
}



/**
 * Fetches all data for a single payslip and formats it for email/PDF.
 */
export async function getFormattedPayslip(
  payslipId: string,
  tenantId: string
): Promise<PayslipData | null> {
  const payslip = await prisma.payrollRunItem.findFirst({
    where: {
      id: payslipId,
      tenantId: tenantId,
    },
    include: {
      user: {
        include: {
          employeeProfile: true,
        },
      },
      run: {
        select: { month: true, year: true },
      },
      // --- THIS BLOCK WAS REMOVED AS IT WAS INCORRECT ---
      // offer: {
      //   where: {
      //     tenantId: tenantId,
      //   },
      // },
      // --- END REMOVED BLOCK ---
    },
  });

  if (!payslip) {
    return null;
  }

  // This is the correct workaround: Fetch the offer separately
  // using the userId from the payslip we just found.
  const offer = await prisma.offer.findUnique({
    where: { userId: payslip.userId }
  });

  // Combine the payslip data with the manually fetched offer data
  return { ...payslip, offer: offer } as PayslipData;
}

