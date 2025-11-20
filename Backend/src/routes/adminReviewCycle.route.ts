import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { Role, CycleStatus, TaskStatus } from "@prisma/client";

const router = Router();

// ====================================================================
// ADMIN: Get All Review Cycles (Powers the management list)
// ====================================================================
/**
 * @route   GET /api/admin/reviews/cycles
 * @desc    Get all review cycles for the tenant (for the management list page).
 * @access  Private (Admin)
 */
router.get("/cycles", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const cycles = await prisma.reviewCycle.findMany({
      where: { tenantId },
      orderBy: { startDate: "desc" },
    });
    res.status(200).json(cycles);
  } catch (error) {
    console.error("Failed to fetch review cycles:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Create a New Review Cycle (The form you asked for)
// ====================================================================
/**
 * @route   POST /api/admin/reviews/cycle
 * @desc    Create a new review cycle (in DRAFT status).
 * @access  Private (Admin)
 * @body    { name: string, startDate: string, endDate: string }
 */
router.post("/cycle", protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  const { name, startDate, endDate } = req.body;

  if (!name || !startDate || !endDate) {
    return res
      .status(400)
      .json({ message: "Name, start date, and end date are required." });
  }

  try {
    const newCycle = await prisma.reviewCycle.create({
      data: {
        tenantId: tenantId!,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: CycleStatus.DRAFT, // Starts as a draft
      },
    });

    // Log this action
    await prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        action: "REVIEW_CYCLE_CREATED",
        description: `Created new review cycle: ${name}`,
        performedById: adminUserId!,
      },
    });

    res.status(201).json(newCycle);
  } catch (error) {
    console.error("Failed to create review cycle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Launch a Review Cycle (Auto-creates tasks)
// ====================================================================
/**
 * @route   POST /api/admin/reviews/cycle/:cycleId/launch
 * @desc    Activates a DRAFT cycle and auto-creates tasks for all employees.
 * @access  Private (Admin)
 */
router.post("/cycle/:cycleId/launch", protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { cycleId } = req.params;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    const cycle = await prisma.reviewCycle.findFirst({
      where: { id: cycleId, tenantId, status: CycleStatus.DRAFT },
    });

    if (!cycle) {
      return res
        .status(404)
        .json({ message: "Draft cycle not found or is already active." });
    }

    // Find all active employees in the tenant
    const employees = await prisma.user.findMany({
      where: { tenantId, role: Role.EMPLOYEE }, // Or filter by "isActive"
    });

    await prisma.$transaction(async (tx) => {
      // 1. Set the cycle to ACTIVE
      await tx.reviewCycle.update({
        where: { id: cycleId },
        data: { status: CycleStatus.ACTIVE },
      });

      // 2. Create a SelfAssessment task for EVERY single employee
      const selfAssessmentTasks = employees.map((emp) => ({
        cycleId: cycleId,
        userId: emp.id,
        tenantId: tenantId!,
        status: TaskStatus.PENDING,
      }));

      await tx.selfAssessment.createMany({
        data: selfAssessmentTasks,
      });

      // 3. TODO: Add logic to create PeerFeedback tasks here
      // (e.g., auto-create manager feedback)

      // 4. Log this action
      await tx.activityLog.create({
        data: {
          tenantId: tenantId!,
          action: "REVIEW_CYCLE_LAUNCHED",
          description: `Launched review cycle: ${cycle.name} for ${employees.length} employees.`,
          performedById: adminUserId!,
        },
      });
    });

    res.status(200).json({ message: "Review cycle launched successfully." });
  } catch (error) {
    console.error("Failed to launch review cycle:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Get Individual Review Cycle Details (for the Dashboard)
// ====================================================================
/**
 * @route   GET /api/admin/reviews/cycle/:cycleId
 * @desc    Get all data for one specific review cycle.
 * @access  Private (Admin)
 */
router.get("/cycle/:cycleId", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { cycleId } = req.params;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  try {
    // 1. Get the cycle itself
    const cycle = await prisma.reviewCycle.findFirst({
      where: { id: cycleId, tenantId },
    });

    if (!cycle) {
      return res.status(404).json({ message: "Review cycle not found." });
    }

    // 2. Get all Self-Assessments for this cycle
    const selfAssessments = await prisma.selfAssessment.findMany({
      where: { cycleId },
      include: {
        user: {
          select: {
            name: true,
            employeeProfile: { select: { designation: true } },
          },
        },
      },
    });

    // 3. Get all Peer Feedback for this cycle
    const peerFeedbacks = await prisma.peerFeedback.findMany({
      where: { cycleId },
      include: {
        giver: { select: { name: true } },
        receiver: { select: { name: true } },
      },
    });

    // 4. Bundle and send all data for the dashboard
    res.status(200).json({
      cycle,
      selfAssessments,
      peerFeedbacks,
    });
  } catch (error) {
    console.error("Failed to fetch review cycle details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// apperisal routes

// ====================================================================
// NEW: ADMIN: Get Appraisal Dashboard Stats (for *this* component)
// ====================================================================
/**
 * @route   GET /api/admin/reviews/dashboard-stats
 * @desc    Get all the summary statistics for the Appraisal Dashboard.
 * @access  Private (Admin)
 * @query   ?cycleId=...
 */
router.get("/dashboard-stats", protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { cycleId } = req.query;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden." });
  }

  if (!cycleId) {
    return res
      .status(400)
      .json({ message: "A cycleId query parameter is required." });
  }

  try {
    // 1. Get stats for Self-Assessments
    const selfAssessments = await prisma.selfAssessment.findMany({
      where: { cycleId: cycleId as string, tenantId },
      select: { status: true },
    });

    // 2. Get stats for Peer Feedback
    const peerFeedbacks = await prisma.peerFeedback.findMany({
      where: { cycleId: cycleId as string, tenantId },
      select: { status: true, rating: true },
    });

    // --- Calculate Stage Progress ---
    const saTotal = selfAssessments.length;
    const saCompleted = selfAssessments.filter(
      (s) => s.status === TaskStatus.COMPLETED
    ).length;

    const pfTotal = peerFeedbacks.length;
    const pfCompleted = peerFeedbacks.filter(
      (p) => p.status === TaskStatus.COMPLETED
    ).length;

    // (This is a simplified version; a real one would have more stages)
    const stageProgressData = [
      {
        stage: "Self-Assessment",
        completionRate:
          saTotal > 0 ? Math.round((saCompleted / saTotal) * 100) : 0,
        pendingCount: saTotal - saCompleted,
      },
      {
        stage: "Peer/360 Feedback",
        completionRate:
          pfTotal > 0 ? Math.round((pfCompleted / pfTotal) * 100) : 0,
        pendingCount: pfTotal - pfCompleted,
      },
      // You would add more stages here as your system grows
      { stage: "Manager Review", completionRate: 0, pendingCount: saTotal },
      { stage: "Final Sign-off", completionRate: 0, pendingCount: saTotal },
    ];

    // --- Calculate Summary Cards ---
    const overallCompletion =
      ((saCompleted + pfCompleted) / (saTotal + pfTotal || 1)) * 100;

    const completedFeedbacks = peerFeedbacks.filter(
      (p) => p.status === TaskStatus.COMPLETED && p.rating != null
    );
    const averageScore =
      completedFeedbacks.reduce((sum, p) => sum + p.rating!, 0) /
      (completedFeedbacks.length || 1);

    const summaryCards = {
      overallCompletion: Math.round(overallCompletion),
      assessmentsCompleted: `${saCompleted} / ${saTotal}`,
      feedbackReceived: `${pfCompleted} / ${pfTotal}`,
      averageScore: averageScore.toFixed(1),
    };

    // 3. TODO: Get Automation Settings (For now, static)
    const automationSettings = [
      {
        name: "Auto-Launch Review",
        description: "Automatically start the self-assessment phase...",
        isEnabled: true,
        action: "Enabled",
      },
      {
        name: "Auto-Nudge Reminders",
        description: "Send automated email and in-app reminders...",
        isEnabled: true,
        action: "Configured",
      },
      {
        name: "Automatic Rating Calibration",
        description: "Use the calibration algorithm to flag outliers...",
        isEnabled: false,
        action: "Disabled",
      },
    ];

    // 4. TODO: Get Merit Budget (For now, static)
    const meritBudget = {
      totalPool: 25000000, // 2.5 Cr
      allocated: 16000000, // 1.6 Cr
      remaining: 9000000, // 90 Lac
    };

    // 5. Bundle and send all data
    res.status(200).json({
      stageProgressData,
      summaryCards,
      automationSettings,
      meritBudget,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
