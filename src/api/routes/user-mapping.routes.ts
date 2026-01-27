import { Router } from 'express';
import { verifyToken, requireAdmin, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, addUserMappingSchema, updateUserMappingSchema } from '../../shared/middleware/validation.js';
import { getUserMappings, addUserMapping, updateUserMapping, removeUserMapping } from '../../repositories/user-mapping.repository.js';
import { syncUserMappingsToSchedules } from '../../repositories/schedule.repository.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Get user mappings
// Authenticated users get full data (incl. discordId), unauthenticated only get display names
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const mappings = await getUserMappings();
    const isAuthenticated = !!req.user;

    if (isAuthenticated) {
      // Authenticated users get full mapping data
      res.json({ success: true, mappings });
    } else {
      // Unauthenticated: only expose what's needed for login dropdown
      const safeMappings = mappings.map(m => ({
        displayName: m.displayName,
        role: m.role,
        sortOrder: m.sortOrder,
      }));
      res.json({ success: true, mappings: safeMappings });
    }
  } catch (error) {
    logger.error('Failed to fetch user mappings', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch user mappings' });
  }
});

// Add user mapping
router.post('/', verifyToken, requireAdmin, validate(addUserMappingSchema), async (req: AuthRequest, res) => {
  try {
    const mapping = req.body;

    await addUserMapping(mapping);
    await syncUserMappingsToSchedules();

    logger.success('User mapping added', `${mapping.displayName} by ${req.user?.username}`);
    res.json({ success: true, message: 'User mapping added successfully' });
  } catch (error) {
    logger.error('Failed to add user mapping', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to add user mapping' });
  }
});

// Update user mapping
router.put('/:discordId', verifyToken, requireAdmin, validate(updateUserMappingSchema), async (req: AuthRequest, res) => {
  try {
    const oldDiscordId = req.params.discordId as string;
    const { discordId, discordUsername, displayName, role, sortOrder } = req.body;

    await updateUserMapping(oldDiscordId, {
      discordId,
      discordUsername,
      displayName,
      role,
      sortOrder,
    });

    await syncUserMappingsToSchedules();

    logger.success('User mapping updated', `${discordUsername} → ${displayName} by ${req.user?.username}`);
    res.json({ success: true, message: 'User mapping updated successfully' });
  } catch (error) {
    logger.error('Failed to update user mapping', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update user mapping' });
  }
});

// Delete user mapping
router.delete('/:discordId', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const discordId = req.params.discordId as string;

    const success = await removeUserMapping(discordId);

    if (success) {
      await syncUserMappingsToSchedules();
      logger.success('User mapping removed', `${discordId} by ${req.user?.username}`);
      res.json({ success: true, message: 'User mapping removed successfully' });
    } else {
      res.status(404).json({ error: 'User mapping not found' });
    }
  } catch (error) {
    logger.error('Failed to remove user mapping', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to remove user mapping' });
  }
});

export default router;
