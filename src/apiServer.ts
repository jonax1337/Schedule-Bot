import express from 'express';
import cors from 'cors';
import { postScheduleToChannel, client } from './bot.js';
import { sendRemindersToUsersWithoutEntry } from './reminder.js';
import { createQuickPoll } from './polls.js';
import { ChannelType, EmbedBuilder } from 'discord.js';
import { config, reloadConfig } from './config.js';
import { logger } from './logger.js';
import { restartScheduler } from './scheduler.js';
import { getUserMappings, addUserMapping, removeUserMapping, initializeUserMappingSheet, getUserMapping } from './userMapping.js';
import { getSheetColumns, getSheetDataRange, updateSheetCell } from './sheets.js';
import { loadSettingsAsync, saveSettings } from './settingsManager.js';
import { initiateDiscordAuth, handleDiscordCallback, getUserFromSession, logout } from './auth.js';

const app = express();
const PORT = 3001;

// Cache for Discord members to avoid rate limiting
let membersCache: Array<{
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
}> | null = null;
let membersCacheTime = 0;
const MEMBERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

app.use(cors());
app.use(express.json());

// Admin authentication
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Admin credentials come from .env via config
    if (username === config.admin.username && password === config.admin.password) {
      logger.success('Admin login successful', `User: ${username}`);
      res.json({ success: true, message: 'Login successful' });
    } else {
      logger.warn('Admin login failed', `Invalid credentials for: ${username}`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'running',
    botReady: client.isReady(),
    uptime: process.uptime()
  });
});

// Get Discord channels
app.get('/api/discord/channels', async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot not ready' });
    }

    const guild = await client.guilds.fetch(config.discord.guildId);
    const channels = await guild.channels.fetch();
    
    const textChannels = channels
      .filter(channel => channel?.type === ChannelType.GuildText)
      .map(channel => ({
        id: channel!.id,
        name: channel!.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(textChannels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get Discord roles
app.get('/api/discord/roles', async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot not ready' });
    }

    const guild = await client.guilds.fetch(config.discord.guildId);
    const roles = await guild.roles.fetch();
    
    const roleList = roles
      .filter(role => role.name !== '@everyone')
      .map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(roleList);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get sheet columns
app.get('/api/sheet-columns', async (req, res) => {
  try {
    const columns = await getSheetColumns();
    res.json({ columns });
  } catch (error) {
    console.error('Error fetching sheet columns:', error);
    logger.error('Failed to fetch sheet columns', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch sheet columns' });
  }
});

// Get sheet data range
app.get('/api/sheet-data', async (req, res) => {
  try {
    const startRow = parseInt(req.query.startRow as string) || 1;
    const endRow = parseInt(req.query.endRow as string) || 50;
    const data = await getSheetDataRange(startRow, endRow);
    res.json({ data });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    logger.error('Failed to fetch sheet data', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to fetch sheet data' });
  }
});

// Update sheet cell
app.post('/api/sheet-data/update', async (req, res) => {
  try {
    const { row, column, value } = req.body;
    
    if (!row || !column || value === undefined) {
      return res.status(400).json({ error: 'Missing required fields: row, column, value' });
    }
    
    await updateSheetCell(row, column, value);
    logger.success('Sheet cell updated', `${column}${row} = ${value}`);
    res.json({ success: true, message: 'Cell updated successfully' });
  } catch (error) {
    console.error('Error updating sheet cell:', error);
    logger.error('Failed to update sheet cell', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update sheet cell' });
  }
});

// Get Discord server members
app.get('/api/discord/members', async (req, res) => {
  try {
    if (!client.isReady()) {
      return res.status(503).json({ error: 'Bot not ready' });
    }

    // Check if cache is still valid
    const now = Date.now();
    if (membersCache && (now - membersCacheTime) < MEMBERS_CACHE_TTL) {
      return res.json({ members: membersCache, cached: true });
    }

    const guild = await client.guilds.fetch(config.discord.guildId);
    const members = await guild.members.fetch();
    
    const memberList = members
      .filter(member => !member.user.bot)
      .map(member => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.displayName,
        avatar: member.user.avatar,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Update cache
    membersCache = memberList;
    membersCacheTime = now;

    res.json({ members: memberList, cached: false });
  } catch (error) {
    console.error('Error fetching members:', error);
    
    // If we have cached data, return it even if expired
    if (membersCache) {
      logger.warn('Using expired members cache due to error');
      return res.json({ members: membersCache, cached: true, expired: true });
    }
    
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Get bot logs
app.get('/api/logs', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const level = req.query.level as 'info' | 'warn' | 'error' | 'success' | undefined;
    
    const logs = logger.getLogs(limit, level);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await loadSettingsAsync();
    res.json(settings);
  } catch (error) {
    console.error('Error loading settings:', error);
    logger.error('Failed to load settings', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

// Update settings
app.post('/api/settings', async (req, res) => {
  try {
    const newSettings = req.body;
    
    // Validate settings structure (only discord and scheduling, admin is in .env)
    if (!newSettings || !newSettings.discord || !newSettings.scheduling) {
      return res.status(400).json({ error: 'Invalid settings structure' });
    }
    
    // Save settings to Google Sheets (only discord and scheduling)
    await saveSettings(newSettings);
    
    logger.success('Settings saved', 'Configuration updated successfully in Google Sheets');
    
    // Reload config and restart scheduler
    await reloadConfig();
    restartScheduler();
    
    res.json({ success: true, message: 'Settings saved and applied' });
  } catch (error) {
    console.error('Error saving settings:', error);
    logger.error('Failed to save settings', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Reload configuration
app.post('/api/reload-config', async (req, res) => {
  try {
    logger.info('Reloading configuration...');
    await reloadConfig();
    
    // Restart scheduler with new times
    logger.info('Restarting scheduler with new settings...');
    restartScheduler();
    
    logger.success('Configuration reloaded and applied', 'All settings updated');
    res.json({ 
      success: true, 
      message: 'Configuration reloaded and scheduler restarted successfully' 
    });
  } catch (error) {
    console.error('Error reloading config:', error);
    logger.error('Failed to reload configuration', error instanceof Error ? error.message : String(error));
    res.status(500).json({ 
      success: false, 
      error: 'Failed to reload configuration' 
    });
  }
});

// Get all user mappings
app.get('/api/user-mappings', async (req, res) => {
  try {
    const mappings = await getUserMappings();
    res.json({ success: true, mappings });
  } catch (error) {
    console.error('Error fetching user mappings:', error);
    logger.error('Failed to fetch user mappings', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to fetch user mappings' });
  }
});

// Add new user mapping
app.post('/api/user-mappings', async (req, res) => {
  try {
    const { discordId, discordUsername, sheetColumnName, role } = req.body;
    
    if (!discordId || !discordUsername || !sheetColumnName || !role) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    await addUserMapping({
      discordId,
      discordUsername,
      sheetColumnName,
      role,
    });
    
    logger.success('User mapping added', `${discordUsername} → ${sheetColumnName}`);
    res.json({ success: true, message: 'User mapping added successfully' });
  } catch (error) {
    console.error('Error adding user mapping:', error);
    logger.error('Failed to add user mapping', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to add user mapping' });
  }
});

// Remove user mapping
app.delete('/api/user-mappings/:discordId', async (req, res) => {
  try {
    const { discordId } = req.params;
    const success = await removeUserMapping(discordId);
    
    if (success) {
      logger.success('User mapping removed', `Discord ID: ${discordId}`);
      res.json({ success: true, message: 'User mapping removed successfully' });
    } else {
      res.status(404).json({ success: false, error: 'User mapping not found' });
    }
  } catch (error) {
    console.error('Error removing user mapping:', error);
    logger.error('Failed to remove user mapping', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to remove user mapping' });
  }
});

// Initialize user mapping sheet
app.post('/api/user-mappings/init', async (req, res) => {
  try {
    await initializeUserMappingSheet();
    logger.success('User mapping sheet initialized');
    res.json({ success: true, message: 'User mapping sheet initialized' });
  } catch (error) {
    console.error('Error initializing user mapping sheet:', error);
    logger.error('Failed to initialize user mapping sheet', error instanceof Error ? error.message : String(error));
    res.status(500).json({ success: false, error: 'Failed to initialize sheet' });
  }
});

// Post schedule
app.post('/api/actions/schedule', async (req, res) => {
  try {
    const { date } = req.body;
    await postScheduleToChannel(date || undefined);
    res.json({ 
      success: true, 
      message: `Schedule posted for ${date || 'today'}` 
    });
  } catch (error) {
    console.error('Error posting schedule:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to post schedule' 
    });
  }
});

// Send reminders
app.post('/api/actions/remind', async (req, res) => {
  try {
    const { date } = req.body;
    await sendRemindersToUsersWithoutEntry(client, date || undefined);
    res.json({ 
      success: true, 
      message: `Reminders sent for ${date || 'today'}` 
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send reminders' 
    });
  }
});

// Create poll
app.post('/api/actions/poll', async (req, res) => {
  try {
    const { question, options, duration } = req.body;
    
    if (!question || !options || options.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid poll data' 
      });
    }
    
    await createQuickPoll(question, options, 'dashboard', duration || 1);
    res.json({ 
      success: true, 
      message: `Poll created: ${question}` 
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create poll' 
    });
  }
});

// Send notification
app.post('/api/actions/notify', async (req, res) => {
  try {
    const { type, target, specificUserId, title, message } = req.body;

    if (!client.isReady()) {
      return res.status(503).json({ 
        success: false, 
        error: 'Bot not ready' 
      });
    }

    // Get color and emoji based on type
    const typeConfig: Record<string, { color: number; emoji: string }> = {
      info: { color: 0x3498db, emoji: '📢' },
      success: { color: 0x2ecc71, emoji: '✅' },
      warning: { color: 0xf39c12, emoji: '⚠️' },
      error: { color: 0xe74c3c, emoji: '❌' },
    };

    const typeSettings = typeConfig[type] || typeConfig.info;

    let recipients: string[] = [];
    let recipientNames: string[] = [];

    // If specific user is provided, only send to them
    if (specificUserId && specificUserId !== 'none') {
      const userMapping = await getUserMapping(specificUserId);
      if (!userMapping) {
        return res.status(400).json({
          success: false,
          error: 'User is not registered in the system.'
        });
      }
      recipients.push(specificUserId);
      recipientNames.push(userMapping.discordUsername);
    } else {
      // Get all user mappings and filter by target
      const allMappings = await getUserMappings();

      const filteredMappings = allMappings.filter(mapping => {
        if (target === 'all') return true;
        return mapping.role === target;
      });

      if (filteredMappings.length === 0) {
        return res.status(400).json({
          success: false,
          error: `No users found for target: ${target}`
        });
      }

      recipients = filteredMappings.map(m => m.discordId);
      recipientNames = filteredMappings.map(m => m.discordUsername);
    }

    // Create notification embed
    const notificationEmbed = new EmbedBuilder()
      .setColor(typeSettings.color)
      .setTitle(`${typeSettings.emoji} ${title}`)
      .setDescription(message)
      .setFooter({ text: 'Sent from Dashboard' })
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

    // Log the action
    const targetDesc = specificUserId && specificUserId !== 'none' 
      ? recipientNames[0] 
      : `${target} (${successCount} users)`;
    logger.info('Notification sent', `Type: ${type}, Target: ${targetDesc}, Title: ${title}`);

    // Send response
    let responseMessage = `Notification sent to ${successCount}/${recipients.length} user(s)`;
    if (failedUsers.length > 0) {
      responseMessage += `. Failed: ${failedUsers.join(', ')}`;
    }

    res.json({ 
      success: true, 
      message: responseMessage,
      stats: {
        total: recipients.length,
        success: successCount,
        failed: failedUsers.length
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send notification' 
    });
  }
});

// Discord OAuth routes
app.get('/api/auth/discord', initiateDiscordAuth);
app.get('/api/auth/discord/callback', handleDiscordCallback);
app.get('/api/auth/user', getUserFromSession);
app.post('/api/auth/logout', logout);

export function startApiServer(): void {
  app.listen(PORT, () => {
    console.log(`API Server listening on port ${PORT}`);
    logger.success('API Server started', `Listening on port ${PORT}`);
  });
}

export { app };
