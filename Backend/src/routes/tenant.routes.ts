import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { protect } from '../middleware/auth.middleware';
import prisma from '../prisma/client';
import { Role } from '@prisma/client';

const router = Router();

// ====================================================================
// CREATE A NEW API KEY FOR THE TENANT
// ====================================================================
/**
 * @route   POST /api/tenant/create-api-key
 * @desc    Creates a new, secure API key for the admin's tenant.
 * @access  Private (Admin only)
 */
router.post('/create-api-key', protect, async (req, res) => {
  // 1. Check Authorization
  const { tenantId, role, userId } = req.user!;
  if (role !== Role.ADMIN) {
    return res
      .status(403)
      .json({ message: 'Forbidden: Only admins can create API keys.' });
  }

  // --- Best Practice: In a real app, you'd limit this ---
  // const keyCount = await prisma.tenantApiKey.count({ where: { tenantId } });
  // if (keyCount >= 1) {
  //   return res.status(400).json({ 
  //     message: "API key already exists. Delete the old key to generate a new one." 
  //   });
  // }
  // --- For now, we allow multiple keys ---

  try {
    // 2. Generate a new, secure, random API key
    //    e.g., "sk_live_f1a2b3c4d5e6f7a8b9c0"
    const prefix = 'sk_live_'; // "sk_live_" for "secret key, live"
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const newApiKey = `${prefix}${randomBytes}`;

    // 3. Hash the key for secure storage in the database
    //    We only store the hash, just like a password.
    const salt = await bcrypt.genSalt(10);
    const hashedKey = await bcrypt.hash(newApiKey, salt);

    // 4. Store the hash and the non-secret prefix
    await prisma.tenant_api_table.create({
      data: {
        tenantId: tenantId!,
        apiKey: prefix,
        hashedKey: hashedKey,
        createdByUserId: userId!,
      },
    });

    // 5. Send the *plaintext* key back to the user ONE TIME.
    //    This is the only time they will ever see it.
    res.status(201).json({
      message:
        'API Key created. Copy this key and store it securely. You will not be able to see it again.',
      apiKey: newApiKey,
    });
  } catch (error) {
    console.error('Failed to create API key:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;

