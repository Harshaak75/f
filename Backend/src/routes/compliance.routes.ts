import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role, GrievanceStatus } from '@prisma/client';

const router = Router();

// ====================================================================
// ADMIN: Get Dashboard Summary Cards
// ====================================================================
/**
 * @route   GET /api/compliance/dashboard
 * @desc    Get all summary card statistics for the compliance dashboard.
 * @access  Private (Admin)
 */
router.get('/dashboard', protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    // 1. Get total number of employees in the company
    const totalEmployees = await prisma.user.count({
      where: { tenantId, role: Role.EMPLOYEE },
    });
    
    // 2. Card 1: Total Policies
    const totalPolicies = await prisma.policy.count({
      where: { tenantId },
    });

    // 3. Card 2: Avg Acknowledgment Rate
    const allPolicies = await prisma.policy.findMany({
      where: { tenantId },
      include: { _count: { select: { acknowledgments: true } } },
    });
    
    let totalRate = 0;
    if (allPolicies.length > 0) {
      const sumOfRates = allPolicies.reduce((sum, policy) => {
        const rate = (policy._count.acknowledgments / (totalEmployees || 1)) * 100;
        return sum + rate;
      }, 0);
      totalRate = sumOfRates / allPolicies.length;
    }
    
    // 4. Card 3: Open Grievances
    const openGrievances = await prisma.grievanceCase.count({
      where: { tenantId, status: GrievanceStatus.OPEN },
    });
    
    // 5. Card 4: Training Completion (e.g., for POSH)
    const poshModule = await prisma.trainingModule.findFirst({
      where: { tenantId, name: { contains: 'POSH' } }, // Find the POSH module
      include: { _count: { select: { completions: true } } },
    });
    
    const trainingCompletion = poshModule
      ? (poshModule._count.completions / (totalEmployees || 1)) * 100
      : 0; // 0% if module doesn't exist

    // 6. Send all 4 card stats
    res.status(200).json({
      totalPolicies: totalPolicies,
      avgAcknowledgmentRate: `${totalRate.toFixed(0)}%`,
      openGrievances: openGrievances.toString(),
      trainingCompletion: `${trainingCompletion.toFixed(0)}%`,
    });

  } catch (error) {
    console.error('Failed to fetch compliance dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ====================================================================
// ADMIN: Get Policy List (for the main table)
// ====================================================================
/**
 * @route   GET /api/compliance/policies
 * @desc    Get all policies and their individual acknowledgment rates.
 * @access  Private (Admin)
 */
router.get('/policies', protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  
  try {
    const totalEmployees = await prisma.user.count({
      where: { tenantId, role: Role.EMPLOYEE },
    });
    
    const policies = await prisma.policy.findMany({
      where: { tenantId },
      include: {
        _count: { select: { acknowledgments: true } }
      },
      orderBy: { lastUpdated: 'desc' }
    });
    
    // Calculate rate for each policy
    const formattedPolicies = policies.map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      category: p.category,
      lastUpdated: p.lastUpdated.toISOString().split('T')[0],
      acknowledgmentRate: (p._count.acknowledgments / (totalEmployees || 1)) * 100,
    }));
    
    res.status(200).json(formattedPolicies);

  } catch (error) {
    console.error('Failed to fetch policies:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ====================================================================
// ADMIN: Get Grievance Log (for the side card)
// ====================================================================
/**
 * @route   GET /api/compliance/grievances
 * @desc    Get all grievance cases.
 * @access  Private (Admin)
 */
router.get('/grievances', protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  
  try {
    const cases = await prisma.grievanceCase.findMany({
      where: { tenantId },
      orderBy: { dateFiled: 'desc' },
      take: 5, // Just get the 5 most recent for the dashboard
    });
    
    // Format to match frontend
    const formattedCases = cases.map(c => ({
      id: c.id,
      type: c.type,
      status: c.status,
      dateFiled: c.dateFiled.toISOString().split('T')[0],
    }));
    
    res.status(200).json(formattedCases);

  } catch (error) {
    console.error('Failed to fetch grievances:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// TODO: Add employee-side routes:
// GET /api/compliance/me/policies - (Employee gets policies they need to sign)
// POST /api/compliance/policy/:id/acknowledge - (Employee signs a policy)

export default router;