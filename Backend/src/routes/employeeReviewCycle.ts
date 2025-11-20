import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role, TaskStatus } from '@prisma/client';

const router = Router();

// ====================================================================
// EMPLOYEE: Get My Review Tasks (for "My Dashboard")
// ====================================================================
/**
 * @route   GET /api/reviews/me/tasks
 * @desc    Get all pending review tasks for the logged-in user.
 * @access  Private (Employee)
 */
router.get('/me/tasks', protect, async (req, res) => {
  const { userId, tenantId, role } = req.user!;

  if (role !== Role.EMPLOYEE) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    // 1. Find my pending Self-Assessment
    const selfAssessmentTasks = await prisma.selfAssessment.findMany({
      where: {
        userId: userId,
        tenantId: tenantId,
        status: TaskStatus.PENDING,
        cycle: { status: 'ACTIVE' }, // Only show tasks for active cycles
      },
      include: {
        cycle: { select: { name: true, endDate: true } },
      },
    });

    // 2. Find all Peer Feedback I need to *give*
    const peerFeedbackTasks = await prisma.peerFeedback.findMany({
      where: {
        giverId: userId,
        tenantId: tenantId,
        status: TaskStatus.PENDING,
        cycle: { status: 'ACTIVE' },
      },
      include: {
        receiver: { select: { name: true } }, // Who the feedback is for
        cycle: { select: { name: true, endDate: true } },
      },
    });

    res.status(200).json({
      selfAssessments: selfAssessmentTasks,
      peerFeedbacks: peerFeedbackTasks,
    });
  } catch (error) {
    console.error('Failed to fetch review tasks:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// EMPLOYEE: Get & Submit Self-Assessment Form
// ====================================================================
/**
 * @route   PUT /api/reviews/me/self-assessment/:assessmentId
 * @desc    Submit the self-assessment form.
 * @access  Private (Employee)
 * @body    { accomplishments: string, challenges: string, goals: string }
 */
router.put('/me/self-assessment/:assessmentId', protect, async (req, res) => {
  const { userId } = req.user!;
  const { assessmentId } = req.params;
  const { accomplishments, challenges, goals } = req.body;

  if (!accomplishments || !challenges || !goals) {
    return res.status(400).json({ message: 'All form fields are required.' });
  }

  try {
    // 1. Find the task and verify this user owns it
    const task = await prisma.selfAssessment.findFirst({
      where: {
        id: assessmentId,
        userId: userId,
        status: TaskStatus.PENDING,
      },
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or already completed.' });
    }

    // 2. Update the record with the answers
    const updatedTask = await prisma.selfAssessment.update({
      where: { id: assessmentId },
      data: {
        accomplishments,
        challenges,
        goals,
        status: TaskStatus.COMPLETED,
        submittedAt: new Date(),
      },
    });

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Failed to submit self-assessment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// EMPLOYEE: Get & Submit Peer Feedback Form
// ====================================================================
/**
 * @route   PUT /api/reviews/me/peer-feedback/:feedbackId
 * @desc    Submit the peer feedback form.
 * @access  Private (Employee)
 * @body    { rating: number, positive: string, negative: string }
 */
router.put('/me/peer-feedback/:feedbackId', protect, async (req, res) => {
  const { userId } = req.user!;
  const { feedbackId } = req.params;
  const { rating, positive, negative } = req.body;

  if (!rating || !positive || !negative) {
    return res.status(400).json({ message: 'All form fields are required.' });
  }

  try {
    // 1. Find the task and verify this user is the "giver"
    const task = await prisma.peerFeedback.findFirst({
      where: {
        id: feedbackId,
        giverId: userId,
        status: TaskStatus.PENDING,
      },
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found or already completed.' });
    }

    // 2. Update the record with the answers
    const updatedTask = await prisma.peerFeedback.update({
      where: { id: feedbackId },
      data: {
        rating: parseFloat(rating),
        positive,
        negative,
        status: TaskStatus.COMPLETED,
        submittedAt: new Date(),
      },
    });

    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Failed to submit peer feedback:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;