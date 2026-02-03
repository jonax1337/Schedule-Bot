import { Router } from 'express';
import { verifyToken, requireAdmin, optionalAuth, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, addUserMappingSchema, updateUserMappingSchema, reorderUserMappingsSchema } from '../../shared/middleware/validation.js';
import { getUserMappings, addUserMapping, updateUserMapping, removeUserMapping, reorderUserMappingsBatch } from '../../repositories/user-mapping.repository.js';
import { syncUserMappingsToSchedules } from '../../repositories/schedule.repository.js';
import { logger } from '../../shared/utils/logger.js';
import { client } from '../../bot/client.js';
import { config } from '../../shared/config/config.js';
import { sendOk, sendServerError, sendNotFound } from '../../shared/utils/apiResponse.js';

const router = Router();

// Get user mappings
// Authenticated users get full data (incl. discordId), unauthenticated only get display names
router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const mappings = await getUserMappings();
    const isAuthenticated = !!req.user;

    if (isAuthenticated) {
      // Enrich mappings with Discord avatar URLs
      let enrichedMappings = mappings;
      try {
        if (client.isReady()) {
          const guild = await client.guilds.fetch(config.discord.guildId);
          const members = await guild.members.fetch({ user: mappings.map(m => m.discordId) });
          enrichedMappings = mappings.map(m => {
            const member = members.get(m.discordId);
            const avatar = member?.user.avatar;
            const avatarUrl = avatar
              ? `https://cdn.discordapp.com/avatars/${m.discordId}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
              : null;
            return { ...m, avatarUrl };
          });
        }
      } catch {
        // If avatar enrichment fails, return mappings without avatars
      }
      return sendOk(res, { mappings: enrichedMappings });
    } else {
      // Unauthenticated: only expose what's needed for login dropdown
      const safeMappings = mappings.map(m => ({
        displayName: m.displayName,
        role: m.role,
        sortOrder: m.sortOrder,
      }));
      return sendOk(res, { mappings: safeMappings });
    }
  } catch (error) {
    return sendServerError(res, error, 'Fetch user mappings');
  }
});

// Add user mapping
router.post('/', verifyToken, requireAdmin, validate(addUserMappingSchema), async (req: AuthRequest, res) => {
  try {
    const mapping = req.body;

    await addUserMapping(mapping);
    await syncUserMappingsToSchedules();

    logger.success('User mapping added', `${mapping.displayName} by ${req.user?.username}`);
    return sendOk(res, { message: 'User mapping added successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Add user mapping');
  }
});

// Reorder user mappings (drag-and-drop)
router.put('/reorder', verifyToken, requireAdmin, validate(reorderUserMappingsSchema), async (req: AuthRequest, res) => {
  try {
    const { orderings } = req.body;

    await reorderUserMappingsBatch(orderings);
    await syncUserMappingsToSchedules();

    logger.success('User mappings reordered', `${orderings.length} mappings by ${req.user?.username}`);
    return sendOk(res, { message: 'User mappings reordered successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Reorder user mappings');
  }
});

// Update user mapping
router.put('/:discordId', verifyToken, requireAdmin, validate(updateUserMappingSchema), async (req: AuthRequest, res) => {
  try {
    const oldDiscordId = req.params.discordId as string;
    const { discordId, discordUsername, displayName, role, sortOrder, timezone, isAdmin } = req.body;

    await updateUserMapping(oldDiscordId, {
      discordId,
      discordUsername,
      displayName,
      role,
      sortOrder,
      timezone: timezone || null,
      isAdmin,
    });

    await syncUserMappingsToSchedules();

    logger.success('User mapping updated', `${discordUsername} → ${displayName} by ${req.user?.username}`);
    return sendOk(res, { message: 'User mapping updated successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Update user mapping');
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
      return sendOk(res, { message: 'User mapping removed successfully' });
    } else {
      return sendNotFound(res, 'User mapping');
    }
  } catch (error) {
    return sendServerError(res, error, 'Remove user mapping');
  }
});

export default router;
