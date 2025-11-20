import prisma from "../prisma/client";
import { LeaveStatus } from "@prisma/client";

/**
 * Calculates the payroll preview for all active employees for a given month.
 * This is the core logic used by both the "preview" and "run" routes.
 */
export async function calculatePayrollPreview(
  tenantId: string,
  month: number, // 1-indexed (1-12)
  year: number
) {
  // 1. Get all employees who have an offer (i.e., are set up for payroll)
  const employeesWithOffers = await prisma.employeeProfile.findMany({
    where: {
      tenantId: tenantId,
      // Ensure the employee has a salary structure
      user: {
        offer: {
          isNot: null,
        },
      },
    },
    include: {
      // We need the user to link to other tables
      user: {
        select: {
          id: true,
          // We need the offer data for salary calculation
          offer: true,
        },
      },
    },
  });

  // 2. Define the date range for the payroll month
  const startDate = new Date(year, month - 1, 1); // First day of the month
  const endDate = new Date(year, month, 0); // Last day of the month

  // 3. Calculate the payroll for each employee
  const payrollData = await Promise.all(
    employeesWithOffers.map(async (profile) => {
      const user = profile.user;
      const offer = user.offer!; // We know this exists from the query

      // --- A. Calculate LWP (Leave Without Pay) Deductions ---

      // Find all approved leave requests that *started* in this month
      // AND have unpaid days (daysLWP).
      const lwpRequests = await prisma.leaveRequest.findMany({
        where: {
          userId: user.id,
          tenantId: tenantId,
          status: LeaveStatus.APPROVED,
          daysLWP: {
            gt: 0, // Only find requests that have unpaid days
          },
          // Find requests that *start* within the payroll month
          startDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Sum up all unpaid days from those requests
      const totalLwpDays = lwpRequests.reduce(
        (sum, req) => sum + req.daysLWP,
        0
      );

      // --- B. Calculate Salary ---

      // Calculate salary per day
      // Note: A real-world app might use a fixed 30 days, 26 days, or actual days in month.
      // We'll use 30 for simplicity as it's common in India.
      const perDaySalary = offer.grossSalary / 30;

      // Calculate LWP deduction amount
      const lwpDeduction = perDaySalary * totalLwpDays;

      // Calculate final deductions
      const totalDeductions = offer.pfDeduction + offer.tax + lwpDeduction;

      // Calculate final net salary
      const netSalary = offer.grossSalary - totalDeductions;

      // --- C. Format the Output ---
      return {
        // Employee Info
        userId: user.id,
        employeeId: profile.employeeId,
        name: `${profile.firstName} ${profile.lastName}`,
        department: profile.designation || "N/A",

        // Salary Info (from Offer)
        basicSalary: offer.basic,
        hra: offer.hra,
        allowances: offer.specialAllowance + offer.da, // Combine allowances
        grossSalary: offer.grossSalary,

        // LWP Info
        lwpDays: totalLwpDays,
        lwpDeduction: parseFloat(lwpDeduction.toFixed(2)),

        // Final Deductions
        pfDeduction: offer.pfDeduction,
        taxDeduction: offer.tax,
        otherDeductions: offer.pfDeduction + offer.tax, // Deductions *before* LWP
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),

        // Final Pay
        netSalary: parseFloat(netSalary.toFixed(2)),
      };
    })
  );

  return payrollData;
}
