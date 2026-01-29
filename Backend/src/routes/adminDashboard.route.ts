import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import dayjs from "dayjs";
import prisma from "../prisma/client";

const router = Router();

// ===============================
// 1) TOTAL HEADCOUNT
// ===============================
router.get("/headcount", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const total = await prisma.employeeProfile.count({
      where: { tenantId, isActive: true },
    });

    const active = await prisma.user.count({
      where: { tenantId, role: "EMPLOYEE", isActive: true },
    });

    res.json({ total, active });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 2) ATTENDANCE TODAY
// ===============================
router.get("/attendance-today", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const today = dayjs().startOf("day").toISOString();

    const present = await prisma.attendanceRecord.count({
      where: { tenantId, date: today, status: "PRESENT" },
    });

    const absent = await prisma.attendanceRecord.count({
      where: { tenantId, date: today, status: "ABSENT" },
    });

    const onLeave = await prisma.attendanceRecord.count({
      where: { tenantId, date: today, status: "LEAVE" },
    });

    const presentPercentage =
      present + absent + onLeave === 0
        ? 0
        : Math.round((present / (present + absent + onLeave)) * 100);

    res.json({
      present,
      absent,
      onLeave,
      presentPercentage,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 3) ATTRITION (12 MONTHS)
// ===============================
router.get("/attrition", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const lastYear = dayjs().subtract(12, "month").toISOString();

    const exits = await prisma.exitCase.count({
      where: {
        tenantId,
        lastDay: { gte: lastYear },
      },
    });

    const total = await prisma.employeeProfile.count({ where: { tenantId } });

    const attritionRate =
      total === 0 ? 0 : Number(((exits / total) * 100).toFixed(2));

    res.json({ attritionRate });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 4) OPEN POSITIONS
// ===============================
router.get("/open-positions", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const count = await prisma.jobOpening.count({
      where: { tenantId, status: "OPEN" },
    });

    const critical = await prisma.jobOpening.count({
      where: { tenantId, status: "OPEN", isCritical: true },
    });

    res.json({ count, critical });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 5) PAYROLL RUN (NEXT)
// ===============================
router.get("/payroll-run", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const nextRun = await prisma.payrollRun.findFirst({
      where: { tenantId },
      orderBy: { processedAt: "desc" },
    });

    if (!nextRun) return res.json({ nextRunDate: null, daysRemaining: null });

    const diff = dayjs(nextRun.processedAt).diff(dayjs(), "day");

    res.json({
      nextRunDate: nextRun.processedAt,
      daysRemaining: diff,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 6) HEADCOUNT TREND (Last 6 months)
// ===============================
router.get("/headcount-trend", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const result: any[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthStart = dayjs().subtract(i, "month").startOf("month");
      const monthName = monthStart.format("MMM");

      const headcount = await prisma.employeeProfile.count({
        where: {
          tenantId,
          joiningDate: { lte: monthStart.endOf("month").toISOString() },
        },
      });

      result.push({ month: monthName, count: headcount });
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 7) DEPARTMENT DISTRIBUTION
// ===============================
router.get("/departments", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const employees: any = await prisma.employeeProfile.findMany({
      where: { tenantId },
      select: { designation: true },
    });

    const map: any = {};

    employees.forEach((emp: any) => {
      if (!emp.designation) return;
      map[emp.designation] = (map[emp.designation] || 0) + 1;
    });

    const result = Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 8) ALERTS & TO-DOS
// ===============================
router.get("/alerts", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const pendingOffers = await prisma.offer.count({
      where: { tenantId, isSigned: false },
    });

    const pendingClearances = await prisma.exitCase.count({
      where: { tenantId, status: "ACTIVE" },
    });

    const upcomingAnniversaries = await prisma.employeeProfile.count({
      where: {
        tenantId,
        joiningDate: {
          lte: dayjs().add(7, "day").toISOString(),
          gte: dayjs().toISOString(),
        },
      },
    });

    res.json({
      pendingOffers,
      pendingClearances,
      upcomingAnniversaries,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ===============================
// 9) RECENT HIRES
// ===============================
router.get("/recent-hires", protect, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    const employees = await prisma.employeeProfile.findMany({
      where: { tenantId },
      orderBy: { joiningDate: "desc" },
      take: 3,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        user: { select: { email: true } },
      },
    });

    res.json(employees);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
