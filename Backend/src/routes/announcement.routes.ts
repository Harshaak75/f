import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role, AnnouncementStatus } from '@prisma/client';

const router = Router();

// ====================================================================
// ADMIN: Create a New Announcement
// ====================================================================
/**
 * @route   POST /api/announcements
 * @desc    Create a new announcement (as draft or publish immediately).
 * @access  Private (Admin)
 */
router.post('/', protect, async (req, res) => {
  const { tenantId, role, userId: adminUserId } = req.user!;

  if (role !== Role.ADMIN) {
    return res.status(403).json({ message: 'Forbidden: Only admins can create announcements.' });
  }

  const {
    title,
    content,
    category,
    status, // DRAFT, PUBLISHED, SCHEDULED
    publishAt, // Optional: ISO string for scheduled date
  } = req.body;

  if (!title || !category || !status) {
    return res.status(400).json({ message: 'Title, category, and status are required.' });
  }

  try {
    const newAnnouncement = await prisma.announcement.create({
      data: {
        tenantId: tenantId!,
        authorId: adminUserId!,
        title,
        content,
        category,
        status: status as AnnouncementStatus,
        publishAt: publishAt ? new Date(publishAt) : null,
      },
    });

    res.status(201).json(newAnnouncement);
  } catch (error) {
    console.error('Failed to create announcement:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// ADMIN / EMPLOYEE: Get Announcements (Smart Route)
// ====================================================================
/**
 * @route   GET /api/announcements
 * @desc    Get announcements. Admins get all. Employees get published only.
 * @access  Private (All)
 */
router.get('/', protect, async (req, res) => {
  const { tenantId, role, userId } = req.user!;

  try {
    const whereClause: any = {
      tenantId: tenantId!,
    };

    // Employees ONLY see PUBLISHED posts
    if (role === Role.EMPLOYEE) {
      whereClause.status = AnnouncementStatus.PUBLISHED;
      whereClause.OR = [
        { publishAt: null },
        { publishAt: { lte: new Date() } }, // and published in the past
      ];
    }
    
    // Admins see everything (DRAFT, SCHEDULED, PUBLISHED)
    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      include: {
        author: {
          select: { name: true }
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20, // Paginate later
    });

    // Get the "read" status for this user
    const readStatuses = await prisma.announcementRead.findMany({
      where: {
        userId: userId,
        announcementId: { in: announcements.map(a => a.id) }
      },
      select: { announcementId: true }
    });
    
    const readSet = new Set(readStatuses.map(r => r.announcementId));

    // Format the data to match your frontend
    const formattedAnnouncements = announcements.map(ann => ({
      id: ann.id,
      title: ann.title,
      category: ann.category,
      snippet: ann.content ? ann.content.substring(0, 100) + '...' : 'No snippet available.',
      date: ann.createdAt.toISOString().split('T')[0],
      isRead: readSet.has(ann.id),
      engagement: 0, // TODO: You'd need a separate way to calculate this
      status: ann.status, // For admin dashboard
    }));
    
    // Admin dashboard needs drafts, scheduled, etc.
    if (role === Role.ADMIN) {
      const drafts = formattedAnnouncements.filter(a => a.status === 'DRAFT').length;
      const scheduled = formattedAnnouncements.filter(a => a.status === 'SCHEDULED').length;
      
      // We don't have engagement stats yet, so we'll fake the cards
      const summaryCards = {
        unread: formattedAnnouncements.filter(a => !a.isRead).length, // This is user-specific
        upcomingEvents: 0, // TODO: Need to query events
        engagementRate: "N/A",
        drafts: drafts,
      };
      
      return res.status(200).json({
        announcements: formattedAnnouncements,
        summaryCards: summaryCards
      });
    }

    // Employee response is simpler
    res.status(200).json(formattedAnnouncements);

  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ====================================================================
// EMPLOYEE: Mark an Announcement as Read
// ====================================================================
/**
 * @route   POST /api/announcements/:id/read
 * @desc    Marks an announcement as read for the logged-in user.
 * @access  Private (Employee)
 */
router.post('/:id/read', protect, async (req, res) => {
  const { tenantId, userId, role } = req.user!;
  const { id: announcementId } = req.params;

  if (role !== Role.EMPLOYEE) {
    return res.status(403).json({ message: 'Forbidden.' });
  }

  try {
    // Use `upsert` to create the read receipt.
    // This is "idempotent" - if they've already read it, nothing happens.
    const readReceipt = await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId: announcementId,
          userId: userId!,
        }
      },
      create: {
        announcementId: announcementId,
        userId: userId!,
        tenantId: tenantId!,
      },
      update: {}, // Nothing to update if it already exists
    });

    res.status(201).json({ message: 'Marked as read.' });
  } catch (error: any) {
    // Handle case where announcement doesn't exist
    if (error.code === 'P2003') { 
      return res.status(404).json({ message: 'Announcement not found.' });
    }
    console.error('Failed to mark as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


export default router;