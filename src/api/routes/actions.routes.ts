import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { validate, createPollSchema, notificationSchema } from '../../shared/middleware/validation.js';
import { postScheduleToChannel, cleanScheduleChannel } from '../../bot/utils/schedule-poster.js';
import { sendRemindersToUsersWithoutEntry } from '../../bot/interactions/reminder.js';
import { createQuickPoll } from '../../bot/interactions/polls.js';
import { client } from '../../bot/client.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { formatDateToDDMMYYYY, getTodayFormatted } from '../../shared/utils/dateFormatter.js';
import { TextChannel } from 'discord.js';
import { sendOk, sendError, sendServerError, sendNotFound } from '../../shared/utils/apiResponse.js';

const router = Router();

/**
 * Convert date from frontend format (YYYY-MM-DD or DD.MM.YYYY) to bot format (DD.MM.YYYY)
 * Returns today's date if no date is provided
 */
function convertToDD_MM_YYYY(dateStr: string | undefined): string {
  if (!dateStr) return getTodayFormatted();
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return dateStr;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? dateStr : formatDateToDDMMYYYY(date);
}

// Post schedule manually
router.post('/schedule', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    const convertedDate = convertToDD_MM_YYYY(date);
    await postScheduleToChannel(convertedDate);

    logger.success('Manual schedule post', `Date: ${convertedDate || 'today'} by ${req.user?.username}`);
    return sendOk(res, { message: 'Schedule posted successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Post schedule');
  }
});

// Send reminders manually
router.post('/remind', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    const convertedDate = convertToDD_MM_YYYY(date);
    await sendRemindersToUsersWithoutEntry(client, convertedDate);

    logger.success('Manual reminder sent', `Date: ${convertedDate || 'today'} by ${req.user?.username}`);
    return sendOk(res, { message: 'Reminders sent successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Send reminders');
  }
});

// Create poll
router.post('/poll', verifyToken, requireAdmin, validate(createPollSchema), async (req: AuthRequest, res) => {
  try {
    const { question, options, duration } = req.body;

    await createQuickPoll(question, options, req.user?.username || 'admin', duration || 1);

    logger.success('Poll created', `By ${req.user?.username}`);
    return sendOk(res, { message: 'Poll created successfully' });
  } catch (error) {
    return sendServerError(res, error, 'Create poll');
  }
});

// Send notification
router.post('/notify', verifyToken, requireAdmin, validate(notificationSchema), async (req: AuthRequest, res) => {
  try {
    const { type, target, title, message, specificUserId } = req.body;

    const { NOTIFICATION_TYPE_CONFIG } = await import('../../bot/embeds/embed.js');
    const notifConfig = NOTIFICATION_TYPE_CONFIG[type];
    if (!notifConfig) {
      return sendError(res, 'Invalid notification type');
    }

    let recipients: string[] = [];
    let recipientNames: string[] = [];

    // If specific user is provided, only send to them
    if (specificUserId) {
      const { getUserMapping } = await import('../../repositories/user-mapping.repository.js');
      const userMapping = await getUserMapping(specificUserId);
      if (!userMapping) {
        return sendNotFound(res, 'User');
      }
      recipients.push(specificUserId);
      recipientNames.push(userMapping.discordUsername);
    } else {
      // Get all user mappings and filter by target
      const { getUserMappings } = await import('../../repositories/user-mapping.repository.js');
      const allMappings = await getUserMappings();

      const filteredMappings = allMappings.filter(mapping => {
        if (target === 'all') return true;
        return mapping.role === target;
      });

      if (filteredMappings.length === 0) {
        return sendNotFound(res, `Users for target: ${target}`);
      }

      recipients = filteredMappings.map(m => m.discordId);
      recipientNames = filteredMappings.map(m => m.discordUsername);
    }

    // Create notification embed
    const { EmbedBuilder } = await import('discord.js');
    const notificationEmbed = new EmbedBuilder()
      .setColor(notifConfig.color)
      .setTitle(`${notifConfig.emoji} ${title}`)
      .setDescription(message)
      .setFooter({ text: `Sent by ${req.user?.username || 'Admin'}` })
      .setTimestamp();

    // Send to all recipients
    let successCount = 0;
    let failedUsers: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      try {
        const user = await client.users.fetch(recipients[i]);
        await user.send({ embeds: [notificationEmbed] });
        successCount++;
      } catch (error) {
        logger.error(`Failed to send notification to ${recipientNames[i]}`, getErrorMessage(error));
        failedUsers.push(recipientNames[i]);
      }
    }

    logger.success('Notification sent', `${successCount}/${recipients.length} users, Type: ${type}, Target: ${target} by ${req.user?.username}`);

    return sendOk(res, {
      message: `Notification sent to ${successCount}/${recipients.length} user(s)`,
      successCount,
      totalCount: recipients.length,
      failedUsers
    });
  } catch (error) {
    return sendServerError(res, error, 'Send notification');
  }
});

// Clear channel (delete all messages except pinned)
router.post('/clear-channel', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { includePinned } = req.body;
    const { loadSettings } = await import('../../shared/utils/settingsManager.js');
    const settings = loadSettings();

    const channel = await client.channels.fetch(settings.discord.channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      return sendNotFound(res, 'Channel');
    }

    const totalDeleted = await cleanScheduleChannel(channel, !!includePinned);

    const pinnedInfo = includePinned ? 'including pinned' : 'kept pinned';
    logger.success('Channel cleared', `Deleted ${totalDeleted} messages (${pinnedInfo}) by ${req.user?.username}`);
    return sendOk(res, {
      message: `Channel cleared successfully. Deleted ${totalDeleted} message(s)${includePinned ? ' (including pinned)' : ', kept pinned messages'}.`,
      deletedCount: totalDeleted
    });
  } catch (error) {
    return sendServerError(res, error, 'Clear channel');
  }
});

// Send training start poll
router.post('/training-poll', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    const convertedDate = convertToDD_MM_YYYY(date);

    const { getAnalyzedSchedule } = await import('../../shared/utils/scheduleDetails.js');

    const result = await getAnalyzedSchedule(convertedDate);
    if (!result) {
      return sendNotFound(res, `Schedule data for ${convertedDate}`);
    }

    if (!result.canProceed || !result.commonTimeRange) {
      return sendError(res, `Cannot create training poll: ${result.statusMessage}`);
    }

    const { createTrainingStartPoll } = await import('../../bot/interactions/trainingStartPoll.js');
    await createTrainingStartPoll(result, convertedDate);

    logger.success('Training poll created', `Date: ${convertedDate} by ${req.user?.username}`);
    return sendOk(res, { message: `Training start poll created for ${convertedDate}` });
  } catch (error) {
    return sendServerError(res, error, 'Create training poll');
  }
});

// Pin message to channel
router.post('/pin-message', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return sendError(res, 'Message is required');
    }

    const { loadSettings } = await import('../../shared/utils/settingsManager.js');
    const settings = loadSettings();

    const channel = await client.channels.fetch(settings.discord.channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      return sendNotFound(res, 'Channel');
    }

    // Send message
    const sentMessage = await channel.send(message);

    // Pin the message
    await sentMessage.pin();

    logger.success('Message pinned', `By ${req.user?.username}`);
    return sendOk(res, {
      message: 'Message sent and pinned successfully',
      messageId: sentMessage.id
    });
  } catch (error) {
    return sendServerError(res, error, 'Pin message');
  }
});

export default router;
