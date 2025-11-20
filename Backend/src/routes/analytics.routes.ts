import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role, AttendanceStatus } from '@prisma/client';
import { calculatePayrollPreview } from '../utils/payroll.utils';
import { generateDynamicPdfReport } from '../utils/pdf.utils';

const router = Router();

// ====================================================================
// ADMIN: Get Dashboard Summary Cards (KPIs)
// ====================================================================
/**
 * @route   GET /api/analytics/summary
 * @desc    Get all 4 summary cards (KPIs) for the dashboard.
 * @access  Private (Admin)
 */
router.get('/summary', protect, async (req, res) => {
  // ... (This route is correct)
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);

    // --- 1. Attrition Rate (Simplified) ---
    const [exitCount, totalEmployees] = await Promise.all([
      prisma.exitCase.count({
        where: { tenantId, resignationDate: { gte: startOfYear } },
      }),
      prisma.employeeProfile.count({ where: { tenantId } })
    ]);
    const attritionRate = totalEmployees > 0 ? (exitCount / totalEmployees) * 100 : 0;

    // --- 2. Avg Performance Score ---
    const performanceAgg = await prisma.performanceReview.aggregate({
      where: { tenantId, reviewDate: { gte: startOfQuarter } },
      _avg: { rating: true },
    });
    
    // --- 3. Total Monthly Payroll ---
    const lastPayroll = await prisma.payrollRun.findFirst({
      where: { tenantId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    
    // --- 4. Avg Absence Rate ---
    const absenceCount = await prisma.attendanceRecord.count({
      where: {
        tenantId,
        status: AttendanceStatus.ABSENT,
        date: { gte: startOfMonth },
      },
    });
    const totalWorkDays = totalEmployees * 22; // Approximation
    const absenceRate = totalWorkDays > 0 ? (absenceCount / totalWorkDays) * 100 : 0;

    // --- Format and Send ---
    res.status(200).json({
      attritionRate: {
        value: `${attritionRate.toFixed(1)}%`,
        trend: '↓ 0.5% vs last year', // Static trend for demo
        trendType: 'positive',
      },
      avgPerformanceScore: {
        value: `${performanceAgg._avg.rating?.toFixed(1) || 'N/A'} / 10`,
        trend: '↑ 0.1 points (QoQ)', // Static trend for demo
        trendType: 'positive',
      },
      totalMonthlyPayroll: {
        value: `₹${(lastPayroll?.totalNet || 0).toLocaleString('en-IN')}`,
        trend: '— Stable (MoM)', // Static trend for demo
        trendType: 'neutral',
      },
      avgAbsenceRate: {
        value: `${absenceRate.toFixed(1)}%`,
        trend: '↑ 0.3% vs last month', // Static trend for demo
        trendType: 'negative',
      },
    });

  } catch (error) {
    console.error('Failed to fetch analytics summary:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ====================================================================
// ADMIN: Get Dashboard Chart Data
// ====================================================================
/**
 * @route   GET /api/analytics/charts
 * @desc    Get all 3 charts for the dashboard.
 * @access  Private (Admin)
 */
router.get('/charts', protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    // --- 1. Headcount Growth (Static Demo) ---
    // NOTE: True headcount growth requires historical snapshotting,
    // which is complex. We'll return static data for this chart.
    const headcountData = [
      { month: 'Mar \'24', Headcount: 480 },
      { month: 'May \'24', Headcount: 505 },
      { month: 'Jul \'24', Headcount: 520 },
      { month: 'Sep \'24', Headcount: 550 },
      { month: 'Nov \'24', Headcount: 575 },
      { month: 'Jan \'25', Headcount: 600 },
      { month: 'Mar \'25', Headcount: 615 },
    ];

    // --- 2. Payroll Cost Distribution (FIXED) ---
    // FIX: The 'Offer' table doesn't have 'department'. We must get it from 'EmployeeProfile'.
    
    // Step A: Get all profiles with their department and userId
    const profiles = await prisma.employeeProfile.findMany({
      where: { tenantId },
      select: { userId: true, designation: true }
    });
    
    // Step B: Get all offers with their grossSalary and userId
    const offers = await prisma.offer.findMany({
      where: { tenantId },
      select: { userId: true, grossSalary: true }
    });
    
    // Step C: Create a map for quick lookup (userId -> grossSalary)
    const offerMap = new Map<string, number>();
    offers.forEach(offer => {
      offerMap.set(offer.userId, offer.grossSalary);
    });
    
    // Step D: Aggregate costs by department in code
    const costByDept = new Map<string, number>();
    profiles.forEach(profile => {
      const salary = offerMap.get(profile.userId) || 0;
      const dept = profile.designation || 'N/A';
      const currentCost = costByDept.get(dept) || 0;
      costByDept.set(dept, currentCost + salary);
    });

    // Step E: Format for the chart
    const payrollData = Array.from(costByDept.entries()).map(([dept, cost]) => ({
      department: dept,
      cost: (cost * 12) / 10000000, // In Crores (Annualized)
      color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color
    }));


    // --- 3. Performance Distribution ---
    const performanceRatings = await prisma.performanceReview.findMany({
      where: { tenantId, reviewDate: { gte: new Date(new Date().getFullYear(), 0, 1) } },
      select: { rating: true }
    });
    
    const performanceData = [
      { name: 'Needs Improvement', value: 0, color: '#f56565' },
      { name: 'Meets Expectations', value: 0, color: '#48bb78' },
      { name: 'Exceeds Expectations', value: 0, color: '#4299e1' },
    ];
    
    performanceRatings.forEach(review => {
      if (review.rating <= 3) performanceData[0].value++;
      else if (review.rating <= 4) performanceData[1].value++;
      else performanceData[2].value++;
    });

    res.status(200).json({
      headcountData,
      payrollData,
      performanceData,
    });
  } catch (error) {
    console.error('Failed to fetch analytics charts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ====================================================================
// ADMIN: Get & Create Saved Reports
// ====================================================================
/**
 * @route   GET /api/analytics/saved-reports
 * @desc    Get all saved custom reports for the tenant.
 * @access  Private (Admin)
 */
router.get('/saved-reports', protect, async (req, res) => {
  // ... (This route is correct)
  const { tenantId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    const reports = await prisma.customReport.findMany({
      where: { tenantId },
      include: {
        owner: { select: { name: true } },
      },
      orderBy: { lastRun: 'desc' },
    });
    
    const formattedReports = reports.map(r => ({
      id: r.id,
      name: r.name,
      owner: r.owner.name,
      frequency: r.frequency,
      lastRun: r.lastRun.toISOString().split('T')[0],
      exportOptions: r.exportOptions.join(', '),
    }));

    res.status(200).json(formattedReports);
  } catch (error) {
    console.error('Failed to fetch saved reports:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/analytics/saved-reports
 * @desc    Create a new saved report configuration.
 * @access  Private (Admin)
 */
router.post('/saved-reports', protect, async (req, res) => {
  // ... (This route is correct)
  const { tenantId, userId, role } = req.user!;
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const { name, dataDomain, frequency, exportOptions } = req.body;

  if (!name || !dataDomain || !frequency || !exportOptions) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const newReport = await prisma.customReport.create({
      data: {
        tenantId: tenantId!,
        ownerId: userId!,
        name,
        dataDomain,
        frequency,
        exportOptions,
        lastRun: new Date(), // Set last run to now
      },
    });
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Failed to save report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ADMIN: Download a Saved Report
// ====================================================================
/**
 * @route   GET /api/analytics/saved-reports/:id/download
 * @desc    Downloads a saved report as a PDF.
 * @access  Private (Admin)
 */
router.get('/saved-reports/:id/download', protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { id } = req.params;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    const report = await prisma.customReport.findFirst({
      where: { id, tenantId },
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // --- This is where you would build a giant switch statement ---
    // --- to fetch data based on `report.dataDomain` ---
    
    // (Simplified Example: Just fetch payroll data for demo)
    // FIX: Imported calculatePayrollPreview to make this work
    const data = await calculatePayrollPreview(tenantId!, new Date().getMonth() + 1, new Date().getFullYear());

    // 1. Set PDF headers
    const filename = `${report.name.replace(/ /g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // 2. Define headers and rows for the PDF utility
    const headers = ['Employee', 'Department', 'Gross Salary', 'LWP Days', 'Net Salary'];
    const rows = data.map((e: any) => [
      e.name,
      e.department,
      `Rs. ${e.grossSalary.toLocaleString()}`,
      e.lwpDays.toString(),
      `Rs. ${e.netSalary.toLocaleString()}`,
    ]);

    // 3. Generate the PDF
    generateDynamicPdfReport(report.name, headers, rows, res);
    
  } catch (error) {
    console.error('Failed to download report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


export default router;