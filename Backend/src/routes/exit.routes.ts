import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import {
  Role,
  ExitStatus,
  ClearanceStatus,
  ClearanceDepartment,
} from "@prisma/client";

const router = Router();

// ====================================================================
// ADMIN: Get Dashboard Summary Cards
// ====================================================================
/**
 * @route   GET /api/exit/dashboard-stats
 * @desc    Get all summary card statistics for the exit dashboard.
 * @access  Private (Admin)
 */
router.get("/dashboard-stats", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    // 1. Card 1: Active Exit Cases
    const activeCases = await prisma.exitCase.count({
      where: { tenantId, status: { not: "COMPLETED" } },
    });

    // 2. Card 2: Avg Notice Period (Simplified)
    // In a real app, you'd calculate this based on (lastDay - resignationDate)
    const avgNotice = 48; // Using static for now

    // 3. Card 3: Pending Clearances
    const pendingClearances = await prisma.clearanceTask.count({
      where: { tenantId, status: ClearanceStatus.PENDING },
    });

    // 4. Card 4: F&F Automation (Static)
    // This would be a complex calculation based on payroll runs
    const fnfAutomation = 88; // Static %

    res.status(200).json({
      activeExitCases: activeCases.toString(),
      avgNoticePeriod: avgNotice.toString(),
      pendingClearances: pendingClearances.toString(),
      fnfAutomation: `${fnfAutomation}%`,
    });
  } catch (error) {
    console.error("Failed to fetch exit dashboard stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Get Active Exit Cases (Main Table)
// ====================================================================
/**
 * @route   GET /api/exit
 * @desc    Get all active exit cases and their clearance progress.
 * @access  Private (Admin)
 */
router.get("/", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const cases = await prisma.exitCase.findMany({
      where: {
        tenantId,
        status: { not: "COMPLETED" }, // Get all non-completed cases
      },
      include: {
        user: { select: { employeeProfile: true } },
        clearanceTasks: { select: { status: true } }, // Get tasks to calculate progress
      },
      orderBy: { resignationDate: "desc" },
    });

    // Format data and calculate progress
    const formattedCases = cases.map((c) => {
      const totalTasks = c.clearanceTasks.length || 1; // Avoid divide by zero
      const completedTasks = c.clearanceTasks.filter(
        (t) => t.status === ClearanceStatus.APPROVED
      ).length;
      const progress = Math.round((completedTasks / totalTasks) * 100);

      const notice =
        (new Date(c.lastDay).getTime() -
          new Date(c.resignationDate).getTime()) /
        (1000 * 60 * 60 * 24);

      return {
        id: c.id,
        employee: `${c.user.employeeProfile?.firstName || ""} ${
          c.user.employeeProfile?.lastName || ""
        }`.trim(),
        department: c.user.employeeProfile?.designation || "N/A",
        resignationDate: c.resignationDate.toISOString().split("T")[0],
        lastDay: c.lastDay.toISOString().split("T")[0],
        noticePeriod: Math.round(notice),
        status: c.status,
        clearanceProgress: progress,
      };
    });

    res.status(200).json(formattedCases);
  } catch (error) {
    console.error("Failed to fetch exit cases:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Get No-Dues Clearance Status (Side Card)
// ====================================================================
/**
 * @route   GET /api/exit/clearance-status
 * @desc    Get the count of pending tasks grouped by department.
 * @access  Private (Admin)
 */
router.get("/clearance-status", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const pendingTasks = await prisma.clearanceTask.groupBy({
      by: ["department"],
      where: {
        tenantId,
        status: ClearanceStatus.PENDING,
      },
      _count: {
        id: true,
      },
    });

    // Format for the side card
    const status = {
      IT: pendingTasks.find((t) => t.department === "IT")?._count.id || 0,
      FINANCE:
        pendingTasks.find((t) => t.department === "FINANCE")?._count.id || 0,
      HR: pendingTasks.find((t) => t.department === "HR")?._count.id || 0,
      MANAGER:
        pendingTasks.find((t) => t.department === "MANAGER")?._count.id || 0,
    };

    res.status(200).json(status);
  } catch (error) {
    console.error("Failed to fetch clearance status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Log a New Resignation
// ====================================================================
/**
 * @route   POST /api/exit
 * @desc    Log a new employee resignation and create all clearance tasks.
 * @access  Private (Admin)
 * @body    { userId (employee), resignationDate, lastDay, reason }
 */
router.post("/", protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { userId, resignationDate, lastDay, reason } = req.body;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  if (!userId || !resignationDate || !lastDay) {
    return res
      .status(400)
      .json({
        message: "Employee, resignation date, and last day are required.",
      });
  }

  try {
    // Use a transaction to create the case AND all its tasks
    const newExitCase = await prisma.$transaction(async (tx) => {
      // 1. Create the ExitCase
      const exitCase = await tx.exitCase.create({
        data: {
          tenantId: tenantId!,
          userId: userId,
          status: ExitStatus.ACTIVE,
          resignationDate: new Date(resignationDate),
          lastDay: new Date(lastDay),
          initiatedById: adminUserId!,
          reasonForLeaving: reason,
        },
      });

      // 2. Auto-create the default clearance tasks for this case
      const departments: ClearanceDepartment[] = [
        "IT",
        "FINANCE",
        "HR",
        "MANAGER",
      ];
      await tx.clearanceTask.createMany({
        data: departments.map((dept) => ({
          exitCaseId: exitCase.id,
          tenantId: tenantId!,
          department: dept,
          status: ClearanceStatus.PENDING,
        })),
      });

      return exitCase;
    });

    res.status(201).json(newExitCase);
  } catch (error) {
    console.error("Failed to log resignation:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Approve a Clearance Task
// ====================================================================
/**
 * @route   POST /api/exit/clearance/:taskId/approve
 * @desc    Mark a specific clearance task (IT, Finance, etc.) as APPROVED.
 * @access  Private (Admin)
 */
router.post("/clearance/:taskId/approve", protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { taskId } = req.params;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const updatedTask = await prisma.clearanceTask.updateMany({
      where: {
        id: taskId,
        tenantId: tenantId,
        status: ClearanceStatus.PENDING,
      },
      data: {
        status: ClearanceStatus.APPROVED,
        approvedById: adminUserId,
      },
    });

    if (updatedTask.count === 0) {
      return res
        .status(404)
        .json({ message: "Task not found or is not pending." });
    }

    // Check if this was the last pending task for the case
    const task = await prisma.clearanceTask.findUnique({
      where: { id: taskId },
    });
    const exitCaseId = task!.exitCaseId;

    const pendingTasks = await prisma.clearanceTask.count({
      where: {
        exitCaseId: exitCaseId,
        status: ClearanceStatus.PENDING,
      },
    });

    // If all tasks are done, update the main ExitCase status
    if (pendingTasks === 0) {
      await prisma.exitCase.update({
        where: { id: exitCaseId },
        data: { status: ExitStatus.PENDING_FNF }, // Ready for Full & Final
      });
    }

    res.status(200).json({ message: "Clearance task approved." });
  } catch (error) {
    console.error("Failed to approve clearance task:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
