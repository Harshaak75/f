import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role } from '@prisma/client';

const router = Router();

// ====================================================================
// EMPLOYEE: Give Recognition (Shout-out)
// ====================================================================
/**
 * @route   POST /api/recognition
 * @desc    Give a recognition (shout-out) to another employee.
 * @access  Private (All Users)
 * @body    { receiverId: string, badgeId: string, message: string }
 */
router.post('/', protect, async (req, res) => {
  const { tenantId, userId: senderId } = req.user!;
  const { receiverId, badgeId, message } = req.body;

  if (!receiverId || !badgeId || !message) {
    return res.status(400).json({ message: 'Receiver, badge, and message are required.' });
  }

  if (receiverId === senderId) {
    return res.status(400).json({ message: 'You cannot give recognition to yourself.' });
  }

  try {
    // 1. Verify the badge and receiver belong to the same tenant
    const [badge, receiver] = await Promise.all([
      prisma.recognitionBadge.findFirst({ where: { id: badgeId, tenantId } }),
      prisma.user.findFirst({ where: { id: receiverId, tenantId } }),
    ]);

    if (!badge) {
      return res.status(404).json({ message: 'Badge not found.' });
    }
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found.' });
    }

    // 2. Create the recognition record
    const newRecognition = await prisma.recognition.create({
      data: {
        tenantId: tenantId!,
        badgeId: badgeId,
        senderId: senderId!,
        receiverId: receiverId,
        message: message,
      },
      include: {
        sender: { include: { employeeProfile: { select: { firstName: true, lastName: true } } } },
        receiver: { include: { employeeProfile: { select: { firstName: true, lastName: true } } } },
        badge: true,
      }
    });

    // 3. Log this as a company-wide activity
    await prisma.activityLog.create({
      data: {
        tenantId: tenantId!,
        action: 'RECOGNITION_GIVEN',
        description: `${newRecognition.sender.employeeProfile?.firstName || 'User'} recognized ${newRecognition.receiver.employeeProfile?.firstName || 'User'} with ${newRecognition.badge.name}`,
        performedById: senderId!,
        targetUserId: receiverId,
      }
    });

    res.status(201).json(newRecognition);
  } catch (error) {
    console.error('Failed to give recognition:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ALL USERS: Get Recognition Wall (the feed)
// ====================================================================
/**
 * @route   GET /api/recognition
 * @desc    Get the main feed for the Recognition Wall.
 * @access  Private (All Users)
 */
router.get('/', protect, async (req, res) => {
  const { tenantId } = req.user!;

  try {
    const recognitions = await prisma.recognition.findMany({
      where: { tenantId },
      include: {
        sender: { include: { employeeProfile: { select: { firstName: true, lastName: true } } } },
        receiver: { include: { employeeProfile: { select: { firstName: true, lastName: true } } } },
        badge: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Only get the 20 most recent
    });

    // Format to match your frontend component
    const formattedFeed = recognitions.map(rec => ({
      id: rec.id,
      sender: `${rec.sender.employeeProfile?.firstName || ''} ${rec.sender.employeeProfile?.lastName || ''}`.trim(),
      receiver: `${rec.receiver.employeeProfile?.firstName || ''} ${rec.receiver.employeeProfile?.lastName || ''}`.trim(),
      award: rec.badge.name,
      message: rec.message,
      date: rec.createdAt.toISOString(),
    }));

    res.status(200).json(formattedFeed);
  } catch (error) {
    console.error('Failed to fetch recognition feed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ALL USERS: Get Leaderboard
// ====================================================================
/**
 * @route   GET /api/recognition/leaderboard
 * @desc    Get the top point earners for the leaderboard.
 * @access  Private (All Users)
 */
router.get('/leaderboard', protect, async (req, res) => {
  const { tenantId } = req.user!;

  try {
    // 1) Get recognitions with badge points
    const recognitions = await prisma.recognition.findMany({
      where: { tenantId },
      select: {
        receiverId: true,
        badge: { select: { points: true } },
      },
    });

    // 2) Sum points per receiver
    const totals = new Map<string, number>();
    for (const r of recognitions) {
      const pts = r.badge?.points ?? 0;
      totals.set(r.receiverId, (totals.get(r.receiverId) ?? 0) + pts);
    }

    // 3) Sort + take top 10
    const top = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topUserIds = top.map(([id]) => id);

    // 4) Fetch user/profile data in one go
    const users = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      include: {
        employeeProfile: { select: { firstName: true, lastName: true, designation: true } },
      },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const leaderboard = top.map(([receiverId, points], idx) => {
      const u = userMap.get(receiverId);
      const first = u?.employeeProfile?.firstName ?? '';
      const last = u?.employeeProfile?.lastName ?? '';
      const name = `${first} ${last}`.trim() || (u?.name ?? 'Unknown');

      return {
        rank: idx + 1,
        name,
        department: u?.employeeProfile?.designation ?? 'N/A',
        points,
      };
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// ====================================================================
// ADMIN: Get & Manage Badges
// ====================================================================
/**
 * @route   GET /api/recognition/badges
 * @desc    Get all available badges for the tenant.
 * @access  Private (Admin)
 */
router.get('/badges', protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  
  // Only admins can see the *full list* to manage them
  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    const badges = await prisma.recognitionBadge.findMany({
      where: { tenantId },
    });
    res.status(200).json(badges);
  } catch (error) {
    console.error('Failed to fetch badges:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/recognition/badges
 * @desc    Create a new recognition badge.
 * @access  Private (Admin)
 */
router.post('/badges', protect, async (req, res) => {
  const { tenantId, role } = req.user!;
  const { name, icon, color, points } = req.body;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  if (!name || !icon || !color || points === undefined) {
    return res.status(400).json({ message: 'Name, icon, color, and points are required.' });
  }

  try {
    const newBadge = await prisma.recognitionBadge.create({
      data: {
        tenantId: tenantId!,
        name,
        icon,
        color,
        points: parseInt(points),
      }
    });
    res.status(201).json(newBadge);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A badge with this name already exists.' });
    }
    console.error('Failed to create badge:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;