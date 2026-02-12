import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import prisma from "../prisma/client";
import { Role } from "@prisma/client";

const router = Router();

// ---------------------------------------------
// ADMIN: Create a Leave Policy
// ---------------------------------------------
router.post("/policies", protect, async (req, res) => {
  const { role, tenantId } = req.user!;
  if (role !== Role.ADMIN)
    return res.status(403).json({ message: "Only admin can create leave policies" });

  const { name, defaultDays } = req.body;

  try {
    const policy = await prisma.leavePolicy.create({
      data: {
        tenantId,
        name,
        defaultDays: parseFloat(defaultDays),
      },
    });

    res.status(201).json(policy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create leave policy" });
  }
});

// ---------------------------------------------
// ADMIN: Get All Leave Policies
// ---------------------------------------------
router.get("/policies", protect, async (req, res) => {
  const { role, tenantId } = req.user!;
  if (role !== Role.ADMIN)
    return res.status(403).json({ message: "Forbidden" });

  try {
    const list = await prisma.leavePolicy.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    });

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leave policies" });
  }
});

// ---------------------------------------------
// ADMIN: Update Policy
// ---------------------------------------------
router.put("/policies/:id", protect, async (req, res) => {
  const { role, tenantId } = req.user!;
  if (role !== Role.ADMIN)
    return res.status(403).json({ message: "Forbidden" });

  const { name, defaultDays } = req.body;

  try {
    // Use a transaction to update both the policy and all related balances
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the leave policy
      const updated = await tx.leavePolicy.update({
        where: { id: req.params.id },
        data: { name, defaultDays },
      });

      // 2. Update all existing leave balances for this policy
      // This ensures employees see the updated balance immediately
      await tx.leaveBalance.updateMany({
        where: {
          policyId: req.params.id,
          tenantId: tenantId,
        },
        data: {
          daysAllotted: defaultDays,
        },
      });

      return updated;
    });

    res.json(result);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Failed to update leave policy" });
  }
});

// ---------------------------------------------
// ADMIN: Delete Policy
// ---------------------------------------------
router.delete("/policies/:id", protect, async (req, res) => {
  const { role } = req.user!;
  if (role !== Role.ADMIN)
    return res.status(403).json({ message: "Forbidden" });

  try {
    await prisma.leavePolicy.delete({ where: { id: req.params.id } });
    res.json({ message: "Policy deleted" });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Failed to delete leave policy" });
  }
});

export default router;
