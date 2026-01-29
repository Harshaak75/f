import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role, SurveyStatus } from '@prisma/client';

const router = Router();

// ====================================================================
// ADMIN: Get All Surveys (for the main dashboard)
// ====================================================================
/**
 * @route   GET /api/surveys
 * @desc    Get all surveys for the admin's tenant.
 * @access  Private (Admin)
 */
router.get('/', protect, async (req, res) => {
  const { tenantId, role } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    // 1. Fetch all surveys
    const surveys: any = await prisma.survey.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: { responses: true }, // Get the count of responses
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    const expectedCount = async (survey: any) => {
  if (survey.targetType === 'ALL') {
    return prisma.user.count({
      where: {
        tenantId,
        role: Role.EMPLOYEE,
      },
    });
  }

  if (survey.targetType === 'DESIGNATION') {
    return prisma.employeeProfile.count({
      where: {
        tenantId,
        designation: { in: survey.targetValues },
      },
    });
  }

  return 0;
};


    // 2. Get total number of employees for calculating expected count
    // (A simpler way is to store `expectedCount` on the survey itself)
    const totalEmployees = await prisma.user.count({
      where: { tenantId, role: Role.EMPLOYEE },
    });

    // 3. Format data to match your frontend
    const formattedSurveys = surveys.map(async (survey: any) => ({
      id: survey.id,
      name: survey.title,
      type: survey.type,
      targetAudience: survey.targetAudience,
      responseCount: survey._count.responses,
      expectedCount: await expectedCount(survey), // This is a simplification
      status: survey.status,
      dueDate: survey.dueDate?.toISOString().split('T')[0] || 'N/A',
    }));

    // TODO: Calculate summary cards
    const totalResponses = surveys.reduce(
      (sum:any, s: any) => sum + s._count.responses,
      0
    );

    const activeSurveys = surveys.filter(
      (s: any) => s.status === SurveyStatus.ACTIVE
    ).length;

    const upcomingDeadlines = surveys.filter(
      (s: any) => s.dueDate && s.dueDate > new Date()
    ).length;

    const avgResponseRate =
      totalEmployees === 0 || surveys.length === 0
        ? 0
        : Math.round((totalResponses / (totalEmployees * surveys.length)) * 100);

    const summaryCards = {
      activeSurveys,
      avgResponseRate,
      totalResponses,
      upcomingDeadlines,
    };

    res.status(200).json({
      surveys: formattedSurveys,
      summaryCards: summaryCards
    });

  } catch (error) {
    console.error('Failed to fetch surveys:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ADMIN: Create a New Survey
// ====================================================================
/**
 * @route   POST /api/surveys
 * @desc    Create a new survey (and its questions).
 * @access  Private (Admin)
 * @body    { title, type, status, dueDate, questions: [...] }
 */
router.post('/', protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  const { title, type, status, dueDate, questions } = req.body;

  if (!title || !type || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ message: 'Title, type, and questions array are required.' });
  }

  try {
    // Create the survey and its questions in a transaction
    const newSurvey = await prisma.survey.create({
      data: {
        tenantId: tenantId!,
        authorId: adminUserId!,
        title,
        type,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        // Create all the questions at the same time
        questions: {
          create: questions.map((q: any, index: number) => ({
            tenantId: tenantId!,
            text: q.text,
            type: q.type,
            options: q.options || [],
            order: index + 1,
          })),
        },
      },
    });

    res.status(201).json(newSurvey);
  } catch (error) {
    console.error('Failed to create survey:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// EMPLOYEE: Get Pending Surveys (for employee dashboard)
// ====================================================================
/**
 * @route   GET /api/surveys/me
 * @desc    Get all active surveys the employee has not yet completed.
 * @access  Private (Employee)
 */
router.get('/me', protect, async (req, res) => {
  const { tenantId, userId, role } = req.user!;
  if (role !== Role.EMPLOYEE) return res.sendStatus(403);

  const profile = await prisma.employeeProfile.findUnique({
    where: { userId },
  });

  const respondedSurveyIds = await prisma.surveyResponse.findMany({
    where: { userId },
    select: { surveyId: true },
  }).then(r => r.map(x => x.surveyId));

  const surveys: any = await prisma.survey.findMany({
    where: {
      tenantId,
      status: SurveyStatus.ACTIVE,
      dueDate: { gte: new Date() },
      id: { notIn: respondedSurveyIds },
      OR: [
        { targetType: 'ALL' },
        {
          targetType: 'DESIGNATION',
          targetValues: { has: profile?.designation },
        },
      ],
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  res.json(surveys);
});


// ====================================================================
// EMPLOYEE: Submit Survey Responses
// ====================================================================
/**
 * @route   POST /api/surveys/:id/respond
 * @desc    Submit answers for a survey.
 * @access  Private (Employee)
 * @body    { answers: [{ questionId, textAnswer, numberAnswer, arrayAnswer }] }
 */
router.post('/:id/respond', protect, async (req, res) => {
  const { tenantId, userId, role } = req.user!;
  const { id: surveyId } = req.params;
  const { answers } = req.body; // e.g., [{ questionId: 'q1', textAnswer: '...' }]

  if (role !== Role.EMPLOYEE) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: 'Answers array is required.' });
  }

  try {
    // Use a transaction to create the response and all answers
    const newResponse = await prisma.$transaction(async (tx) => {
      // 1. Create the main "Response" wrapper
      const response = await tx.surveyResponse.create({
        data: {
          surveyId,
          userId: userId!,
          tenantId: tenantId!,
        }
      });

      // 2. Create all the individual answers
      await tx.surveyAnswer.createMany({
        data: answers.map((a: any) => ({
          responseId: response.id,
          questionId: a.questionId,
          userId: userId!,
          tenantId: tenantId!,
          textAnswer: a.textAnswer,
          numberAnswer: a.numberAnswer,
          arrayAnswer: a.arrayAnswer,
        }))
      });

      return response;
    });

    res.status(201).json({ message: 'Survey submitted successfully.', responseId: newResponse.id });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'You have already submitted this survey.' });
    }
    console.error('Failed to submit survey:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// ====================================================================
// ADMIN: Get Survey Analysis
// ====================================================================
/**
 * @route   GET /api/surveys/:id/analysis
 * @desc    Get all responses for a survey to analyze.
 * @access  Private (Admin)
 */
router.get('/:id/analysis', protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { id: surveyId } = req.params;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    // 1. Get the survey and its questions
    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, tenantId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!survey) {
      return res.status(404).json({ message: 'Survey not found.' });
    }

    // 2. Get all answers for all questions in this survey
    const answers = await prisma.surveyAnswer.findMany({
      where: {
        tenantId,
        questionId: { in: survey.questions.map(q => q.id) },
      },
    });

    // 3. Aggregate results (this is a simple example)
    const analysis = survey.questions.map(q => {
      const questionAnswers = answers.filter(a => a.questionId === q.id);
      return {
        questionId: q.id,
        questionText: q.text,
        questionType: q.type,
        responseCount: questionAnswers.length,
        // In a real app, you'd aggregate text/ratings here
        // e.g., for RATING_5, calculate the average
        averageRating: (q.type === 'RATING_5')
          ? questionAnswers.reduce((sum, a) => sum + (a.numberAnswer || 0), 0) / (questionAnswers.length || 1)
          : null,
        // e.g., for TEXT, just return all text answers
        textResponses: (q.type === 'TEXT')
          ? questionAnswers.map(a => a.textAnswer)
          : [],
      };
    });

    res.status(200).json({
      surveyTitle: survey.title,
      totalResponses: await prisma.surveyResponse.count({ where: { surveyId } }),
      analysis: analysis,
    });

  } catch (error) {
    console.error('Failed to analyze survey:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;