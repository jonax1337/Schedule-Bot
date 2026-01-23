import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { postScheduleToChannel } from '../../bot/utils/schedule-poster.js';
import { sendRemindersToUsersWithoutEntry } from '../../bot/interactions/reminder.js';
import { createQuickPoll } from '../../bot/interactions/polls.js';
import { client } from '../../bot/client.js';
import { logger } from '../../shared/utils/logger.js';
import { formatDateToDDMMYYYY, getTodayFormatted } from '../../shared/utils/dateFormatter.js';

const router = Router();

/**
 * Convert date from frontend format (YYYY-MM-DD or DD.MM.YYYY) to bot format (DD.MM.YYYY)
 * Returns today's date if no date is provided
 */
function convertToDD_MM_YYYY(dateStr: string | undefined): string {
  if (!dateStr) return getTodayFormatted();
  
  // Check if already in DD.MM.YYYY format
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convert from YYYY-MM-DD to DD.MM.YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  }
  
  // Try to parse as Date object
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return formatDateToDDMMYYYY(date);
    }
  } catch (e) {
    // Ignore parse errors
  }
  
  return dateStr;
}

// Post schedule manually
router.post('/schedule', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    const convertedDate = convertToDD_MM_YYYY(date);
    await postScheduleToChannel(convertedDate);
    
    logger.success('Manual schedule post', `Date: ${convertedDate || 'today'} by ${req.user?.username}`);
    res.json({ success: true, message: 'Schedule posted successfully' });
  } catch (error) {
    console.error('Error posting schedule:', error);
    logger.error('Failed to post schedule', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to post schedule' });
  }
});

// Send reminders manually
router.post('/remind', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    const convertedDate = convertToDD_MM_YYYY(date);
    await sendRemindersToUsersWithoutEntry(client, convertedDate);
    
    logger.success('Manual reminder sent', `Date: ${convertedDate || 'today'} by ${req.user?.username}`);
    res.json({ success: true, message: 'Reminders sent successfully' });
  } catch (error) {
    console.error('Error sending reminders:', error);
    logger.error('Failed to send reminders', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// Create poll
router.post('/poll', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { question, options, duration } = req.body;
    
    if (!question || !options || !Array.isArray(options)) {
      return res.status(400).json({ error: 'Question and options array required' });
    }
    
    await createQuickPoll(question, options, req.user?.username || 'admin', duration || 1);
    
    logger.success('Poll created', `By ${req.user?.username}`);
    res.json({ success: true, message: 'Poll created successfully' });
  } catch (error) {
    console.error('Error creating poll:', error);
    logger.error('Failed to create poll', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Send notification
router.post('/notify', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { type, target, title, message, specificUserId } = req.body;
    
    if (!type || !target || !title || !message) {
      return res.status(400).json({ error: 'Type, target, title, and message are required' });
    }
    
    // Get color and emoji based on type
    const typeConfig = {
      info: { color: 0x3498db, emoji: '📢' },
      success: { color: 0x2ecc71, emoji: '✅' },
      warning: { color: 0xf39c12, emoji: '⚠️' },
      error: { color: 0xe74c3c, emoji: '❌' },
    };
    
    const config = typeConfig[type as keyof typeof typeConfig];
    if (!config) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }
    
    let recipients: string[] = [];
    let recipientNames: string[] = [];
    
    // If specific user is provided, only send to them
    if (specificUserId) {
      const { getUserMapping } = await import('../../repositories/user-mapping.repository.js');
      const userMapping = await getUserMapping(specificUserId);
      if (!userMapping) {
        return res.status(404).json({ error: 'User not found in system' });
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
        return res.status(404).json({ error: `No users found for target: ${target}` });
      }
      
      recipients = filteredMappings.map(m => m.discordId);
      recipientNames = filteredMappings.map(m => m.discordUsername);
    }
    
    // Create notification embed
    const { EmbedBuilder } = await import('discord.js');
    const notificationEmbed = new EmbedBuilder()
      .setColor(config.color)
      .setTitle(`${config.emoji} ${title}`)
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
        console.error(`Failed to send notification to ${recipientNames[i]}:`, error);
        failedUsers.push(recipientNames[i]);
      }
    }
    
    logger.success('Notification sent', `${successCount}/${recipients.length} users, Type: ${type}, Target: ${target} by ${req.user?.username}`);
    
    res.json({ 
      success: true, 
      message: `Notification sent to ${successCount}/${recipients.length} user(s)`,
      successCount,
      totalCount: recipients.length,
      failedUsers
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    logger.error('Failed to send notification', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;
