import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role, LeaveStatus } from '@prisma/client';

const router = Router();

// ====================================================================
// ADMIN: Get All Leave Requests for Tenant
// ====================================================================
/**
 * @route   GET /api/admin/leave
 * @desc    Get all leave requests for the admin's tenant.
 * @access  Private (Admin)
 * @query   ?status=PENDING,APPROVED,REJECTED,CANCELLED
 */
router.get('/', protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: 'Forbidden: You do not have permission.' });
  }

  const { status } = req.query;

  // Build the filter
  const whereClause: any = {
    tenantId: tenantId,
  };

  if (status && Object.values(LeaveStatus).includes(status as LeaveStatus)) {
    whereClause.status = status as LeaveStatus;
  }

  try {
    // 1. Fetch all requests matching the filter
    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        // Include the employee's profile info
        user: {
          select: {
            employeeProfile: {
              select: { firstName: true, lastName: true, employeeId: true },
            },
          },
        },
        // Include the policy name
        policy: {
          select: { name: true },
        },
      },
      orderBy: {
        appliedDate: 'desc', // Show newest requests first
      },
    });

    // 2. Fetch balance data for each request (this is the critical part)
    const requestsWithBalance = await Promise.all(
      requests.map(async (request) => {
        const year = new Date(request.startDate).getFullYear();

        const balance = await prisma.leaveBalance.findUnique({
          where: {
            tenantId_userId_policyId_year: {
              tenantId: tenantId,
              userId: request.userId,
              policyId: request.policyId,
              year: year,
            },
          },
          select: { daysAllotted: true, daysUsed: true },
        });

        // 3. Format the data just like your frontend component
        return {
          id: request.id,
          employeeId: request.user.employeeProfile?.employeeId || 'N/A',
          employeeName: `${request.user.employeeProfile?.firstName || ''} ${
            request.user.employeeProfile?.lastName || ''
          }`.trim(),
          department: "N/A", // TODO: Add department to EmployeeProfile
          leaveType: request.policy.name,
          startDate: request.startDate.toISOString().split('T')[0],
          endDate: request.endDate.toISOString().split('T')[0],
          days: request.days,
          reason: request.reason,
          status: request.status,
          appliedDate: request.appliedDate.toISOString().split('T')[0],
          // This is the extra data you asked for:
          balanceInfo: {
            daysAllotted: balance?.daysAllotted || 0,
            daysUsed: balance?.daysUsed || 0,
            daysRemaining: balance
              ? balance.daysAllotted - balance.daysUsed
              : 0,
          },
        };
      })
    );

    res.status(200).json(requestsWithBalance);
  } catch (error) {
    console.error('Failed to fetch leave requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ADMIN: Approve a Leave Request
// ====================================================================
/**
 * @route   POST /api/admin/leave/:requestId/approve
 * @desc    Approve a pending leave request.
 * @access  Private (Admin)
 */
router.post('/:requestId/approve', protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { requestId } = req.params;
  const { adminNotes } = req.body; // Optional notes from the admin

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Find the request to make sure it's PENDING and belongs to this tenant
      const request = await tx.leaveRequest.findFirst({
        where: {
          id: requestId,
          tenantId: tenantId,
          status: LeaveStatus.PENDING,
        },
      });

      if (!request) {
        throw new Error('Leave request not found or is not pending.');
      }

      // 2. Update the LeaveRequest status
      const approvedRequest = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: LeaveStatus.APPROVED,
          approvedById: adminUserId,
          adminNotes: adminNotes,
        },
      });

      // 3. Update the employee's LeaveBalance (deduct the days)
      const year = new Date(request.startDate).getFullYear();
      await tx.leaveBalance.update({
        where: {
          tenantId_userId_policyId_year: {
            tenantId: tenantId,
            userId: request.userId,
            policyId: request.policyId,
            year: year,
          },
        },
        data: {
          daysUsed: {
            increment: request.days, // Add the approved days to 'daysUsed'
          },
        },
      });

      // 4. Log this action
      await tx.activityLog.create({
        data: {
          tenantId,
          action: 'LEAVE_APPROVED',
          description: `Approved ${request.days} day(s) of leave for user ${request.userId}`,
          performedById: adminUserId,
          targetUserId: request.userId,
        },
      });

      return approvedRequest;
    });

    res.status(200).json(updatedRequest);
  } catch (error: any) {
    console.error('Failed to approve leave:', error);
    res.status(400).json({ message: error.message || 'Approval failed.' });
  }
});

// ====================================================================
// ADMIN: Reject a Leave Request
// ====================================================================
/**
 * @route   POST /api/admin/leave/:requestId/reject
 * @desc    Reject a pending leave request.
 * @access  Private (Admin)
 */
router.post('/:requestId/reject', protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;
  const { requestId } = req.params;
  const { adminNotes } = req.body; // Reason for rejection

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  if (!adminNotes) {
    return res.status(400).json({ message: 'Rejection reason is required.' });
  }

  try {
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Find the request
      const request = await tx.leaveRequest.findFirst({
        where: {
          id: requestId,
          tenantId: tenantId,
          status: LeaveStatus.PENDING,
        },
      });

      if (!request) {
        throw new Error('Leave request not found or is not pending.');
      }

      // 2. Update the status to REJECTED
      const rejectedRequest = await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: LeaveStatus.REJECTED,
          approvedById: adminUserId,
          adminNotes: adminNotes,
        },
      });

      // 3. Log this action
      await tx.activityLog.create({
        data: {
          tenantId,
          action: 'LEAVE_REJECTED',
          description: `Rejected ${request.days} day(s) of leave for user ${request.userId}`,
          performedById: adminUserId,
          targetUserId: request.userId,
        },
      });
      
      // *** NOTE: We DO NOT update the LeaveBalance on rejection ***

      return rejectedRequest;
    });

    res.status(200).json(updatedRequest);
  } catch (error: any) {
    console.error('Failed to reject leave:', error);
    res.status(400).json({ message: error.message || 'Rejection failed.' });
  }
});

export default router;