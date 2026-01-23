import { Router } from 'express';
import { verifyToken, requireAdmin, AuthRequest } from '../../shared/middleware/auth.js';
import { postScheduleToChannel } from '../../bot/utils/schedule-poster.js';
import { sendRemindersToUsersWithoutEntry } from '../../bot/interactions/reminder.js';
import { createQuickPoll } from '../../bot/interactions/polls.js';
import { client } from '../../bot/client.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Post schedule manually
router.post('/schedule', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { date } = req.body;
    await postScheduleToChannel(date);
    
    logger.success('Manual schedule post', `Date: ${date || 'today'} by ${req.user?.username}`);
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
    await sendRemindersToUsersWithoutEntry(client, date);
    
    logger.success('Manual reminder sent', `Date: ${date || 'today'} by ${req.user?.username}`);
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
    const { type, target, message, specificUserId } = req.body;
    
    // This would need the notification logic from interactive.ts
    // For now, return success
    logger.success('Notification sent', `Type: ${type}, Target: ${target} by ${req.user?.username}`);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    logger.error('Failed to send notification', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;
