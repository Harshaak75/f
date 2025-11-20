import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { Role, AttendanceStatus, ClearanceStatus } from "@prisma/client";

const router = Router();

/**
 * Helper to get the start of the current day
 */
const getStartOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// ====================================================================
// ADMIN: Get All KPI Card Data
// ====================================================================
/**
 * @route   GET /api/dashboard/kpis
 * @desc    Get all 5 KPI card values for the admin dashboard.
 * @access  Private (Admin)
 */
router.get("/kpis", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const today = getStartOfToday();
    const startOfLast12M = new Date(
      today.getFullYear() - 1,
      today.getMonth(),
      today.getDate()
    );

    const [
      totalHeadcount,
      activeToday,
      attritionCount,
      openPositions,
      lastPayroll,
    ] = await Promise.all([
      // 1. Total Headcount
      prisma.employeeProfile.count({ where: { tenantId } }),
      // 2. Active Today
      prisma.attendanceRecord.count({
        where: { tenantId, date: today, status: AttendanceStatus.PRESENT },
      }),
      // 3. Attrition (12m)
      prisma.exitCase.count({
        where: { tenantId, resignationDate: { gte: startOfLast12M } },
      }),
      // 4. Open Positions
      prisma.jobOpening.count({
        where: { tenantId, status: "OPEN" },
      }),
      // 5. Last Payroll Run
      prisma.payrollRun.findFirst({
        where: { tenantId },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
    ]);

    // --- Format KPI data ---
    const attritionRate =
      totalHeadcount > 0 ? (attritionCount / totalHeadcount) * 100 : 0;

    // Calculate next payroll date
    let nextPayrollDate = "N/A";
    let payrollInDays = "N/A";
    if (lastPayroll) {
      const nextRunDate = new Date(lastPayroll.year, lastPayroll.month, 1); // 1st of next month
      nextRunDate.setMonth(nextRunDate.getMonth() + 1);
      const daysDiff = Math.ceil(
        (nextRunDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      nextPayrollDate = nextRunDate.toLocaleDateString("en-IN", {
        month: "short",
        day: "2-digit",
      });
      payrollInDays = `In ${daysDiff} days`;
    }

    res.status(200).json({
      totalHeadcount: {
        value: totalHeadcount,
        change: "+8.2% from last month", // Static
      },
      activeToday: {
        value: activeToday,
        change: `${
          totalHeadcount > 0
            ? Math.round((activeToday / totalHeadcount) * 100)
            : 0
        }% attendance`,
      },
      attrition: {
        value: `${attritionRate.toFixed(1)}%`,
        change: "Industry avg: 12%", // Static
      },
      openPositions: {
        value: openPositions,
        change: "3 critical", // Static
      },
      payrollRun: {
        value: nextPayrollDate,
        change: payrollInDays,
      },
    });
  } catch (error) {
    console.error("Failed to fetch KPIs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Get All Chart Data
// ====================================================================
/**
 * @route   GET /api/dashboard/charts
 * @desc    Get data for headcount and department charts.
 * @access  Private (Admin)
 */
router.get("/charts", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    // --- 1. Headcount Trend (New Hires per Month) ---
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const hires = await prisma.employeeProfile.findMany({
      where: { tenantId, joiningDate: { gte: sixMonthsAgo } },
      select: { joiningDate: true },
    });

    // Group by month in JS
    const hiresByMonth = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(new Date().setMonth(new Date().getMonth() - i));
      const monthKey = d.toLocaleDateString("default", { month: "short" });
      hiresByMonth.set(monthKey, 0);
    }

    hires.forEach((emp) => {
      const monthKey = new Date(emp.joiningDate).toLocaleDateString("default", {
        month: "short",
      });
      hiresByMonth.set(monthKey, (hiresByMonth.get(monthKey) || 0) + 1);
    });

    const headcountTrend = Array.from(hiresByMonth.entries()).map(
      ([month, count]) => ({
        month,
        count,
      })
    );

    // --- 2. Department Distribution ---
    const deptData = await prisma.employeeProfile.groupBy({
      by: ["designation"],
      where: { tenantId },
      _count: { id: true },
    });

    const departmentDistribution = deptData.map((dept, index) => ({
      name: dept.designation || "N/A",
      value: dept._count.id,
      color: ["#0000CC", "#4040DD", "#6666EE", "#8888FF", "#AAAAFF"][index % 5],
    }));

    res.status(200).json({
      headcountTrend,
      departmentDistribution,
    });
  } catch (error) {
    console.error("Failed to fetch chart data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Get All Widget Data
// ====================================================================
/**
 * @route   GET /api/dashboard/widgets
 * @desc    Get data for all 3 dashboard widgets.
 * @access  Private (Admin)
 */
router.get("/widgets", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const today = getStartOfToday();

    // --- 1. Today's Attendance ---
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { tenantId, date: today },
      select: { status: true },
    });

    const attendanceStats = {
      present: attendanceRecords.filter(
        (r) => r.status === AttendanceStatus.PRESENT
      ).length,
      absent: attendanceRecords.filter(
        (r) => r.status === AttendanceStatus.ABSENT
      ).length,
      onLeave: attendanceRecords.filter(
        (r) => r.status === AttendanceStatus.LEAVE
      ).length,
    };

    // --- 2. Alerts & To-Dos ---
    const [pendingOffers, pendingClearance, allEmployees] = await Promise.all([
      prisma.offer.count({
        where: { tenantId, isSigned: false },
      }),
      prisma.clearanceTask.count({
        where: { tenantId, status: ClearanceStatus.PENDING },
      }),
      prisma.employeeProfile.findMany({
        where: { tenantId },
        select: { joiningDate: true },
      }),
    ]);

    // Calculate upcoming anniversaries (next 7 days)
    const next7Days = new Date(today);
    next7Days.setDate(today.getDate() + 7);
    let upcomingAnniversaries = 0;
    allEmployees.forEach((emp) => {
      const joinDate = new Date(emp.joiningDate);
      const years = today.getFullYear() - joinDate.getFullYear();
      if (years > 0) {
        const thisYearAnniv = new Date(
          today.getFullYear(),
          joinDate.getMonth(),
          joinDate.getDate()
        );
        if (thisYearAnniv >= today && thisYearAnniv <= next7Days) {
          upcomingAnniversaries++;
        }
      }
    });

    const alerts = {
      pendingOffers,
      pendingClearance,
      upcomingAnniversaries,
    };

    // --- 3. Recent Hires ---
    const recentHires = await prisma.employeeProfile.findMany({
      where: { tenantId },
      orderBy: { joiningDate: "desc" },
      take: 3,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
      },
    });

    res.status(200).json({
      attendanceStats,
      alerts,
      recentHires,
    });
  } catch (error) {
    console.error("Failed to fetch widget data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
