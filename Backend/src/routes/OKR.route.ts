import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { Role, OkrStatus } from "@prisma/client";

const router = Router();

function mapStatusToUI(status: OkrStatus) {
  switch (status) {
    case "ON_TRACK":
      return "On Track";
    case "AT_RISK":
      return "At Risk";
    case "COMPLETED":
      return "Completed";
    default:
      return "Planned";
  }
}

// ====================================================================
// ADMIN: Get OKR Dashboard
// ====================================================================
/**
 * @route   GET /api/okr
 * @desc    Get all Objectives for a tenant for a given quarter.
 * @access  Private (Admin)
 * @query   ?quarter=1&year=2025
 */
router.get("/getOKR", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: Access restricted to admins." });
  }

  const { quarter, year } = req.query;

  if (!quarter || !year) {
    return res.status(400).json({ message: "Quarter and year are required." });
  }

  try {
    const objectives = await prisma.objective.findMany({
      where: {
        tenantId: tenantId,
        quarter: parseInt(quarter as string),
        year: parseInt(year as string),
      },
      include: {
        // Include all the Key Results for each Objective
        keyResults: {
          include: {
            // Include the employee who owns the Key Result
            owner: {
              select: {
                name: true,
                employeeProfile: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    });

    // Format the data to match your frontend component
    const formattedObjectives = objectives.map((obj) => ({
      id: obj.id,
      objective: obj.title,
      keyResults: obj.keyResults.map((kr) => ({
        id: kr.id,
        keyResult: kr.title,
        owner: kr.owner.employeeProfile
          ? `${kr.owner.employeeProfile.firstName} ${kr.owner.employeeProfile.lastName}`
          : kr.owner.name,
        progress: kr.progress,
        status: mapStatusToUI(kr.status), // <-- FIX
      })),
    }));

    res.status(200).json(formattedObjectives);
  } catch (error) {
    console.error("Failed to fetch objectives:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Create New Objective
// ====================================================================
/**
 * @route   POST /api/okr/objective
 * @desc    Create a new objective.
 * @access  Private (Admin)
 * @body    { title: string, quarter: number, year: number, ownerId: string }
 */
router.post("/objective", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: Access restricted to admins." });
  }

  const { title, quarter, year, ownerId } = req.body;

  if (!title || !quarter || !year || !ownerId) {
    return res
      .status(400)
      .json({ message: "Title, quarter, year, and ownerId are required." });
  }

  try {
    const newObjective = await prisma.objective.create({
      data: {
        tenantId: tenantId!,
        title,
        quarter: parseInt(quarter),
        year: parseInt(year),
        ownerId,
      },
    });
    res.status(201).json(newObjective);
  } catch (error) {
    console.error("Failed to create objective:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// ADMIN: Add Key Result to Objective
// ====================================================================
/**
 * @route   POST /api/okr/keyresult
 * @desc    Add a new key result to an objective.
 * @access  Private (Admin)
 * @body    { title: string, ownerId: string, objectiveId: string }
 */
router.post("/keyresult", protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: "Forbidden: Access restricted to admins." });
  }

  const { title, ownerId, objectiveId } = req.body;

  if (!title || !ownerId || !objectiveId) {
    return res
      .status(400)
      .json({ message: "Title, ownerId, and objectiveId are required." });
  }

  try {
    const newKeyResult = await prisma.keyResult.create({
      data: {
        tenantId: tenantId!,
        title,
        ownerId,
        objectiveId,
        status: OkrStatus.PLANNED,
        progress: 0,
      },
    });
    res.status(201).json(newKeyResult);
  } catch (error) {
    console.error("Failed to create key result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ====================================================================
// EMPLOYEE/ADMIN: Update Key Result Progress
// ====================================================================
/**
 * @route   PUT /api/okr/keyresult/:krId
 * @desc    Update a key result's progress and status.
 * @access  Private (Admin or Owner)
 * @body    { progress: number, status: OkrStatus }
 */
router.put("/keyresult/:krId", protect, async (req, res) => {
  const { tenantId, role, userId } = req.user!;
  const { krId } = req.params;
  const { progress, status } = req.body;

  if (progress === undefined || !status) {
    return res
      .status(400)
      .json({ message: "Progress and status are required." });
  }

  try {
    const keyResult = await prisma.keyResult.findFirst({
      where: {
        id: krId,
        tenantId: tenantId,
      },
    });

    if (!keyResult) {
      return res.status(404).json({ message: "Key result not found." });
    }

    // Security Check: Only an ADMIN or the *owner* of the KR can update it.
    if (role !== Role.ADMIN && keyResult.ownerId !== userId) {
      return res
        .status(403)
        .json({
          message: "Forbidden: You are not the owner of this key result.",
        });
    }

    const updatedKeyResult = await prisma.keyResult.update({
      where: { id: krId },
      data: {
        progress: parseInt(progress),
        status: status as OkrStatus,
      },
    });

    res.status(200).json(updatedKeyResult);
  } catch (error) {
    console.error("Failed to update key result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get('/available-periods', protect, async (req, res) => {
  const { role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: "Forbidden: Admin only" });
  }

  try {
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1];

    const periods = years.flatMap((year) =>
      [1, 2, 3, 4].map((q) => ({ quarter: q, year }))
    );

    // Sort latest first
    periods.sort((a, b) =>
      a.year === b.year ? b.quarter - a.quarter : b.year - a.year
    );

    res.status(200).json(periods);
  } catch (err) {
    console.error("Failed to fetch periods:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});



export default router;
