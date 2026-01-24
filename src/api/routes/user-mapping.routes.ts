import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, addUserMappingSchema } from '../../shared/middleware/validation.js';
import { getUserMappings, addUserMapping, updateUserMapping, removeUserMapping } from '../../repositories/user-mapping.repository.js';
import { syncUserMappingsToSchedules } from '../../repositories/schedule.repository.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Get user mappings
router.get('/', async (req, res) => {
  try {
    const mappings = await getUserMappings();
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Error fetching user mappings:', error);
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
    console.error('Error adding user mapping:', error);
    logger.error('Failed to add user mapping', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to add user mapping' });
  }
});

// Update user mapping
router.put('/:discordId', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const oldDiscordId = req.params.discordId as string;
    const { discordId, discordUsername, displayName, role, sortOrder } = req.body;
    
    if (!displayName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
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
    console.error('Error updating user mapping:', error);
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
    console.error('Error removing user mapping:', error);
    logger.error('Failed to remove user mapping', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to remove user mapping' });
  }
});

export default router;
