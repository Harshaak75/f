import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { Role } from "@prisma/client";
import {
  getFormattedPayslip,
  formatPayslipHtml,
  sendEmail,
} from "../utils/email.utils";
import { generateSinglePayslipPdf } from "../utils/generatePayrollpdf.utils";

const router = Router();

// ====================================================================
// ADMIN: Get All Payslips for a Given Month
// ====================================================================
/**
 * @route   GET /api/payslips
 * @desc    Get all processed payslip items for a given month.
 * @access  Private (Admin)
 * @query   ?month=1&year=2025
 */
router.get("/payslips", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: You do not have permission." });
  }

  // --- Get and Validate Month/Year ---
  const { month: monthStr, year: yearStr } = req.query;
  const currentMonth = new Date().getMonth() + 1; // 1-indexed (1-12)
  const currentYear = new Date().getFullYear();

  const month = monthStr ? parseInt(monthStr as string) : currentMonth;
  const year = yearStr ? parseInt(yearStr as string) : currentYear;

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return res.status(400).json({ message: "Invalid month or year provided." });
  }

  try {
    // 1. Find the processed payroll run for that month
    const processedRun = await prisma.payrollRun.findUnique({
      where: {
        tenantId_month_year: {
          tenantId: tenantId!,
          month: month,
          year: year,
        },
      },
      include: {
        // 2. Get all the individual payslip items from that run
        items: {
          include: {
            user: {
              select: {
                employeeProfile: {
                  select: {
                    employeeId: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!processedRun) {
      // No payroll was processed for this month, return an empty list
      return res.status(200).json([]);
    }

    // 3. Format the data to match the frontend component
    const monthName = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
    });

    const payslips = processedRun.items.map((item) => ({
      id: item.id, // This is the PayrollRunItem ID
      employeeId: item.user.employeeProfile?.employeeId || "N/A",
      employeeName:
        `${item.user.employeeProfile?.firstName || ""} ${
          item.user.employeeProfile?.lastName || ""
        }`.trim() || "N/A",
      month: monthName,
      year: year,
      basicSalary: item.basicSalary,
      hra: item.hra,
      allowances: item.allowances,
      grossSalary: item.grossSalary,
      pf: item.pfDeduction,
      tax: item.taxDeduction,
      totalDeductions: item.otherDeductions + item.lwpDeduction,
      netSalary: item.netSalary,
      status: processedRun.status, // e.g., "PROCESSED"
    }));

    res.status(200).json(payslips);
  } catch (error: any) {
    console.error("Failed to fetch payslips:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Download a Single Payslip as PDF
// ====================================================================
/**
 * @route   GET /api/payslips/:payslipId/download
 * @desc    Generates and downloads a PDF for a single payslip.
 * @access  Private (Admin)
 */
router.get("/:payslipId/download", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { payslipId } = req.params;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    // 1. Get all the payslip data (this helper function is in email.utils.ts)
    const payslipData = await getFormattedPayslip(payslipId, tenantId!);

    if (!payslipData) {
      return res.status(404).json({ message: "Payslip not found." });
    }

    // We need the tenant name for the PDF header
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // 2. Set headers for PDF download
    const profile = payslipData.user.employeeProfile;
    const filename = `Payslip-${payslipData.run.year}-${
      payslipData.run.month
    }-${profile?.employeeId || profile?.lastName}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // 3. Generate the PDF and stream it to the response
    // This function is in `pdf.utils.ts`
    generateSinglePayslipPdf({ ...payslipData, tenant: tenant! }, res);
  } catch (error: any) {
    console.error("Failed to generate single payslip PDF:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Email a Single Payslip
// ====================================================================
/**
 * @route   POST /api/payslips/:payslipId/send
 * @desc    Emails a single payslip to an employee.
 * @access  Private (Admin)
 */
router.post("/:payslipId/send", protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { payslipId } = req.params;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    // 1. Get all the payslip data
    const payslipData = await getFormattedPayslip(payslipId, tenantId!);

    if (!payslipData) {
      return res.status(404).json({ message: "Payslip not found." });
    }

    // 2. Format the email content
    const htmlBody = formatPayslipHtml(payslipData);
    const monthName = new Date(
      payslipData.run.year,
      payslipData.run.month - 1
    ).toLocaleString("default", { month: "long" });
    const subject = `Your Salary Slip for ${monthName} ${payslipData.run.year}`;

    // 3. "Send" the email (using the dummy service)
    await sendEmail(payslipData.user.email, subject, htmlBody);

    // 4. Log this action
    await prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        action: "PAYSLIP_SENT",
        description: `Sent payslip for ${monthName} ${payslipData.run.year} to ${payslipData.user.email}`,
        performedById: adminUserId!,
        targetUserId: payslipData.userId,
      },
    });

    res.status(200).json({ message: "Payslip sent successfully." });
  } catch (error: any) {
    console.error("Failed to send payslip:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Send ALL Payslips for a Month
// ====================================================================
/**
 * @route   POST /api/payslips/send-all
 * @desc    Sends all payslips for a given month to all employees.
 * @access  Private (Admin)
 * @body    { month: number, year: number }
 */
router.post("/send-all", protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { month, year } = req.body;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  if (!month || !year) {
    return res.status(400).json({ message: "Month and year are required." });
  }

  try {
    // 1. Find the processed run
    const processedRun = await prisma.payrollRun.findUnique({
      where: {
        tenantId_month_year: {
          tenantId: tenantId!,
          month,
          year,
        },
      },
      include: {
        items: true, // Get all payslip items
      },
    });

    if (!processedRun) {
      return res
        .status(404)
        .json({ message: "Payroll run not found for that month." });
    }

    const monthName = new Date(year, month - 1).toLocaleString("default", {
      month: "long",
    });
    const subject = `Your Salary Slip for ${monthName} ${year}`;

    // 2. Loop through all payslip items and send emails one by one
    // In a real-world app, you would add this to a "job queue" (like BullMQ)
    // so it doesn't block the server. For now, we do it directly.

    let successCount = 0;
    let failCount = 0;

    for (const item of processedRun.items) {
      try {
        const payslipData = await getFormattedPayslip(item.id, tenantId!);
        if (payslipData) {
          const htmlBody = formatPayslipHtml(payslipData);
          await sendEmail(payslipData.user.email, subject, htmlBody);
          successCount++;
        } else {
          failCount++;
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${item.userId}:`, emailError);
        failCount++;
      }
    }

    // 3. Log this bulk action
    await prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        action: "PAYSLIP_SENT_ALL",
        description: `Sent ${successCount} payslips for ${monthName} ${year}. ${failCount} failed.`,
        performedById: adminUserId!,
      },
    });

    res.status(200).json({
      message: `Successfully sent ${successCount} payslips. ${failCount} failed.`,
    });
  } catch (error: any) {
    console.error("Failed to send all payslips:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Ge the Payslip and download it as PDF
// ====================================================================
/**
 * @route   POST /api/payslips/send-all
 * @desc    Sends all payslips for a given month to all employees.
 * @access  Private (Admin)
 * @body    { month: number, year: number }
 */

// Route to get the latest payslip and download as PDF
router.get("/GetmyPayslip", protect, async (req, res) => {
  try {
    const { userId, tenantId } = req.user!;

    // Fetch the latest payslip for the employee
    const payslipData: any = await prisma.payrollRun.findFirst({
      where: {
        tenantId: tenantId,
        items: {
          some: {
            userId: userId,
          },
        },
      },
      orderBy: {
        processedAt: "desc",
      },
      include: {
        items: {
          where: {
            userId: userId,
          },
          select: {
            id: true,
            basicSalary: true,
            hra: true,
            allowances: true,
            grossSalary: true,
            pfDeduction: true,
            taxDeduction: true,
            netSalary: true,
          },
        },
      },
    });

    if (!payslipData || payslipData.items.length === 0) {
      return res
        .status(404)
        .json({ message: "Payslip not found for this user." });
    }

    // Get the profile data
    const profile: any = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        employeeProfile: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!profile || !profile.employeeProfile) {
      return res.status(404).json({ message: "Employee profile not found." });
    }

    // Set up the filename for PDF download
    const filename = `Payslip-${payslipData.year}-${payslipData.month}-${
      profile.employeeProfile.employeeId || profile.employeeProfile.lastName
    }.pdf`;

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Generate the PDF and stream it to the response
    generateSinglePayslipPdf({ ...payslipData, user: profile.user }, res);
  } catch (error) {
    console.error("Error fetching or generating payslip:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
