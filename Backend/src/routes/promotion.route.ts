import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role, PromotionStatus } from '@prisma/client';

const router = Router();

// ====================================================================
// ADMIN: Get All Promotion Requests (for the dashboard)
// ====================================================================
/**
 * @route   GET /api/promotions
 * @desc    Get all promotion requests for the tenant.
 * @access  Private (Admin)
 * @query   ?cycleId=...
 */
router.get('/getPromotion', protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { cycleId } = req.query;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  
  if (!cycleId) {
    return res.status(400).json({ message: 'A cycleId query is required.' });
  }

  try {
    const requests = await prisma.promotionRequest.findMany({
      where: {
        tenantId: tenantId,
        cycleId: cycleId as string,
      },
      include: {
        user: { // The employee receiving the promotion
          select: { employeeProfile: { select: { firstName: true, lastName: true } } }
        },
      },
      orderBy: { id: 'desc' }
    });

    // Format data to match your frontend component
    const formattedRequests = requests.map((req: any) => ({
      id: req.id,
      employeeName: `${req.user.employeeProfile?.firstName || ''} ${req.user.employeeProfile?.lastName || ''}`.trim(),
      currentRole: req.currentDesignation,
      proposedRole: req.proposedDesignation,
      incrementPercentage: req.proposedIncrementPercent,
      budgetImpact: `₹${req.budgetImpact.toLocaleString('en-IN')}`,
      status: req.status,
      lastUpdated: req.id, // Placeholder, you'd use updatedAt in a real schema
    }));

    res.status(200).json(formattedRequests);
  } catch (error) {
    console.error('Failed to fetch promotion requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ADMIN/MANAGER: Submit a New Promotion Request
// ====================================================================
/**
 * @route   POST /api/promotions
 * @desc    Create a new promotion request.
 * @access  Private (Admin)
 * @body    { userId, cycleId, proposedDesignation, proposedAnnualCTC, managerNotes }
 */
router.post('/createPromotion', protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;

  // In a real app, a MANAGER could also do this. We'll keep it ADMIN-only for now.
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const { userId, cycleId, proposedDesignation, proposedAnnualCTC, managerNotes } = req.body;

  if (!userId || !cycleId || !proposedDesignation || !proposedAnnualCTC) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    // 1. Get the employee's current profile and offer
    const employee = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { 
        employeeProfile: true,
        offer: true 
      },
    });

    if (!employee || !employee.employeeProfile || !employee.offer) {
      return res.status(404).json({ message: 'Employee profile or offer not found.' });
    }

    // 2. This is the "Calculation"
    const currentCTC = employee.offer.annualCTC;
    const newCTC = parseFloat(proposedAnnualCTC);
    const budgetImpact = newCTC - currentCTC;
    const incrementPercent = ((newCTC - currentCTC) / currentCTC) * 100;

    // 3. Create the new request
    const newRequest = await prisma.promotionRequest.create({
      data: {
        tenantId: tenantId!,
        userId: userId,
        cycleId: cycleId,
        submittedById: adminUserId!,
        
        currentDesignation: employee.employeeProfile.designation,
        currentAnnualCTC: currentCTC,
        
        proposedDesignation: proposedDesignation,
        proposedAnnualCTC: newCTC,
        proposedIncrementPercent: parseFloat(incrementPercent.toFixed(2)),
        budgetImpact: parseFloat(budgetImpact.toFixed(2)),
        
        managerNotes: managerNotes,
        status: PromotionStatus.PENDING_HR, // Since HR submitted, skip manager step
      },
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Failed to create promotion request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ADMIN: Approve a Promotion Request
// ====================================================================
/**
 * @route   POST /api/promotions/:requestId/approve
 * @desc    Approves a request and updates the employee's profile & offer.
 * @access  Private (Admin)
 */
router.post('/:requestId/approve', protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { requestId } = req.params;
  const { hrNotes } = req.body;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    // Use a transaction to ensure this is all-or-nothing
    const approvedRequest = await prisma.$transaction(async (tx) => {
      // 1. Find the request
      const request = await tx.promotionRequest.findFirst({
        where: {
          id: requestId,
          tenantId: tenantId,
          status: PromotionStatus.PENDING_HR, // Can only approve if pending HR
        },
      });

      if (!request) {
        throw new Error('Request not found or not in PENDING_HR status.');
      }

      // 2. Mark the request as APPROVED
      const updatedRequest = await tx.promotionRequest.update({
        where: { id: requestId },
        data: {
          status: PromotionStatus.APPROVED,
          approvedById: adminUserId,
          hrNotes: hrNotes,
        },
      });

      // 3. CRITICAL: Update the employee's actual EmployeeProfile
      await tx.employeeProfile.update({
        where: { userId: request.userId },
        data: {
          designation: request.proposedDesignation,
        },
      });

      // 4. CRITICAL: Update the employee's actual Offer
      // This is simplified. A real app would also recalculate
      // basic, HRA, etc., based on the new CTC.
      await tx.offer.update({
        where: { userId: request.userId },
        data: {
          annualCTC: request.proposedAnnualCTC,
          roleTitle: request.proposedDesignation,
          // TODO: Add logic here to recalculate other salary components
          // For now, we just update the main ones.
          grossSalary: request.proposedAnnualCTC / 12, // Simplification
          netSalary: (request.proposedAnnualCTC / 12) * 0.8, // Simplification
        },
      });

      // 5. Log this major action
      await tx.activityLog.create({
        data: {
          tenantId: tenantId!,
          action: 'PROMOTION_APPROVED',
          description: `Approved promotion for user ${request.userId} to ${request.proposedDesignation}.`,
          performedById: adminUserId!,
          targetUserId: request.userId,
        },
      });

      return updatedRequest;
    });

    res.status(200).json(approvedRequest);
  } catch (error: any) {
    console.error('Failed to approve promotion:', error);
    res.status(400).json({ message: error.message || 'Approval failed.' });
  }
});


// ====================================================================
// ADMIN: Reject a Promotion Request
// ====================================================================
/**
 * @route   POST /api/promotions/:requestId/reject
 * @desc    Rejects a request.
 * @access  Private (Admin)
 */
router.post('/:requestId/reject', protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { requestId } = req.params;
  const { hrNotes } = req.body;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  
  if (!hrNotes) {
    return res.status(400).json({ message: 'Rejection notes are required.' });
  }

  try {
    const rejectedRequest = await prisma.promotionRequest.updateMany({
      where: {
        id: requestId,
        tenantId: tenantId,
        status: PromotionStatus.PENDING_HR,
      },
      data: {
        status: PromotionStatus.REJECTED,
        approvedById: adminUserId,
        hrNotes: hrNotes,
      },
    });

    if (rejectedRequest.count === 0) {
      throw new Error('Request not found or not in PENDING_HR status.');
    }
    
    // Log this action
    await prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        action: 'PROMOTION_REJECTED',
        description: `Rejected promotion for request ${requestId}.`,
        performedById: adminUserId!,
      },
    });

    res.status(200).json({ message: 'Request rejected.'});
  } catch (error: any) {
    console.error('Failed to reject promotion:', error);
    res.status(400).json({ message: error.message || 'Rejection failed.' });
  }
});

export default router;