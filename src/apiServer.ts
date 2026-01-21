import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { verifyToken, requireAdmin, generateToken, optionalAuth, AuthRequest } from './middleware/auth.js';
import { loginLimiter, apiLimiter, strictApiLimiter } from './middleware/rateLimiter.js';
import { 
  validate, 
  updateCellSchema, 
  addUserMappingSchema, 
  addScrimSchema, 
  updateScrimSchema,
  createPollSchema,
  notificationSchema,
  settingsSchema,
  sanitizeString 
} from './middleware/validation.js';
import { verifyPassword } from './middleware/passwordManager.js';
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
import { preloadCache, getScheduleDetails, getScheduleDetailsBatch, getCacheStats } from './scheduleCache.js';

const app = express();
const PORT = 3001;

// Trust proxy - required for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security: Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// Preload schedule cache on startup
setTimeout(() => {
  preloadCache().catch(err => console.error('[Server] Cache preload failed:', err));
}, 2000); // Wait 2 seconds after server start

// Cache for Discord members to avoid rate limiting
let membersCache: Array<{
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
}> | null = null;
let membersCacheTime = 0;
const MEMBERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Security: CORS with whitelist
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.DASHBOARD_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

// Security: Rate limiting for all API routes
app.use('/api', apiLimiter);

// Admin authentication with JWT
app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    // Get hashed password from env
    const storedPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    if (!storedPasswordHash) {
      logger.error('ADMIN_PASSWORD_HASH not configured');
      return res.status(500).json({ success: false, error: 'Server configuration error' });
    }
    
    // Verify credentials
    if (username === config.admin.username && await verifyPassword(password, storedPasswordHash)) {
      const token = generateToken(username, 'admin');
      
      logger.success('Admin login successful', `User: ${username}`);
      
      res.json({ 
        success: true, 
        token,
        expiresIn: '24h',
        user: {
          username,
          role: 'admin',
        },
      });
    } else {
      logger.warn('Admin login failed', `Invalid credentials for: ${username}`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during admin login:', error);
    logger.error('Login error', error instanceof Error ? error.message : String(error));
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

// Get Discord channels (protected)
app.get('/api/discord/channels', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
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

// Get Discord roles (protected)
app.get('/api/discord/roles', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
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

// Get sheet columns (public for login dropdown)
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

// Get sheet data range (protected)
app.get('/api/sheet-data', verifyToken, async (req: AuthRequest, res) => {
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

// Update sheet cell (protected with validation)
app.post('/api/sheet-data/update', verifyToken, validate(updateCellSchema), async (req: AuthRequest, res) => {
  try {
    const { row, column, value } = req.body;
    
    // Sanitize value
    const sanitizedValue = sanitizeString(value);
    
    await updateSheetCell(row, column, sanitizedValue);
    logger.success('Sheet cell updated', `${column}${row} = ${value}`);
    res.json({ success: true, message: 'Cell updated successfully' });
  } catch (error) {
    console.error('Error updating sheet cell:', error);
    logger.error('Failed to update sheet cell', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Failed to update sheet cell' });
  }
});

// Get Discord server members (protected)
app.get('/api/discord/members', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
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

// Get schedule details with status and player lists (single date, cached, optional auth)
app.get('/api/schedule-details', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    const details = await getScheduleDetails(date);
    
    if (!details) {
      return res.status(404).json({ error: 'Schedule details not found' });
    }
    
    res.json(details);
  } catch (error) {
    console.error('Error fetching schedule details:', error);
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// Get schedule details for multiple dates at once (batch, cached, optional auth)
app.get('/api/schedule-details-batch', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const datesParam = req.query.dates as string;
    if (!datesParam) {
      return res.status(400).json({ error: 'Dates parameter required' });
    }

    const dates = datesParam.split(',').map(d => d.trim());
    const details = await getScheduleDetailsBatch(dates);
    
    res.json(details);
  } catch (error) {
    console.error('Error fetching schedule details batch:', error);
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// Get cache statistics (for debugging)
app.get('/api/cache-stats', (req, res) => {
  const stats = getCacheStats();
  res.json(stats);
});

// Get bot logs (protected)
app.get('/api/logs', verifyToken, requireAdmin, (req: AuthRequest, res) => {
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

// Get settings (public read, protected write)
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

// Update settings (protected with validation)
app.post('/api/settings', verifyToken, requireAdmin, strictApiLimiter, validate(settingsSchema), async (req: AuthRequest, res) => {
  try {
    const newSettings = req.body;
    
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

// Reload configuration (protected)
app.post('/api/reload-config', verifyToken, requireAdmin, strictApiLimiter, async (req: AuthRequest, res) => {
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

// Get all user mappings (public for login dropdown, but admin required for modifications)
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

// Add new user mapping (protected with validation)
app.post('/api/user-mappings', verifyToken, requireAdmin, validate(addUserMappingSchema), async (req: AuthRequest, res) => {
  try {
    const { discordId, discordUsername, sheetColumnName, role } = req.body;
    
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

// Remove user mapping (protected)
app.delete('/api/user-mappings/:discordId', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const discordId = req.params.discordId as string;
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

// Initialize user mapping sheet (protected)
app.post('/api/user-mappings/init', verifyToken, requireAdmin, strictApiLimiter, async (req: AuthRequest, res) => {
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

// Post schedule (protected)
app.post('/api/actions/schedule', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
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

// Send reminders (protected)
app.post('/api/actions/remind', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
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

// Create poll (protected with validation)
app.post('/api/actions/poll', verifyToken, requireAdmin, validate(createPollSchema), async (req: AuthRequest, res) => {
  try {
    const { question, options, duration } = req.body;
    
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

// Send notification (protected with validation)
app.post('/api/actions/notify', verifyToken, requireAdmin, validate(notificationSchema), async (req: AuthRequest, res) => {
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

// Scrim Management Endpoints

// Get all scrims (optional auth)
app.get('/api/scrims', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { getAllScrims } = await import('./scrims.js');
    const scrims = await getAllScrims();
    res.json({ success: true, scrims });
  } catch (error) {
    console.error('Error fetching scrims:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scrims' });
  }
});

// Get scrim by ID (optional auth)
app.get('/api/scrims/:id', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { getScrimById } = await import('./scrims.js');
    const scrim = await getScrimById(req.params.id as string);
    
    if (!scrim) {
      return res.status(404).json({ success: false, error: 'Scrim not found' });
    }
    
    res.json({ success: true, scrim });
  } catch (error) {
    console.error('Error fetching scrim:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scrim' });
  }
});

// Add new scrim (protected with validation)
app.post('/api/scrims', verifyToken, requireAdmin, validate(addScrimSchema), async (req: AuthRequest, res) => {
  try {
    const { addScrim, ensureScrimSheetExists } = await import('./scrims.js');
    const { date, opponent, result, scoreUs, scoreThem, map, matchType, ourAgents, theirAgents, vodUrl, notes } = req.body;
    
    // Ensure sheet exists before adding
    await ensureScrimSheetExists();
    
    const newScrim = await addScrim({
      date,
      opponent,
      result,
      scoreUs: scoreUs || 0,
      scoreThem: scoreThem || 0,
      map: map || '',
      matchType: matchType || 'Scrim',
      ourAgents: ourAgents || [],
      theirAgents: theirAgents || [],
      vodUrl: vodUrl || '',
      notes: notes || '',
    });
    
    logger.success('Scrim added', `${opponent} on ${date}`);
    res.json({ success: true, scrim: newScrim });
  } catch (error) {
    console.error('Error adding scrim:', error);
    res.status(500).json({ success: false, error: 'Failed to add scrim' });
  }
});

// Update scrim (protected with validation)
app.put('/api/scrims/:id', verifyToken, requireAdmin, validate(updateScrimSchema), async (req: AuthRequest, res) => {
  try {
    const { updateScrim } = await import('./scrims.js');
    const { date, opponent, result, scoreUs, scoreThem, map, matchType, ourAgents, theirAgents, vodUrl, notes } = req.body;
    
    const updates: any = {};
    if (date !== undefined) updates.date = date;
    if (opponent !== undefined) updates.opponent = opponent;
    if (result !== undefined) updates.result = result;
    if (scoreUs !== undefined) updates.scoreUs = scoreUs;
    if (scoreThem !== undefined) updates.scoreThem = scoreThem;
    if (map !== undefined) updates.map = map;
    if (matchType !== undefined) updates.matchType = matchType;
    if (ourAgents !== undefined) updates.ourAgents = ourAgents;
    if (theirAgents !== undefined) updates.theirAgents = theirAgents;
    if (vodUrl !== undefined) updates.vodUrl = vodUrl;
    if (notes !== undefined) updates.notes = notes;
    
    const updatedScrim = await updateScrim(req.params.id as string, updates);
    
    if (!updatedScrim) {
      return res.status(404).json({ success: false, error: 'Scrim not found' });
    }
    
    logger.success('Scrim updated', `ID: ${req.params.id}`);
    res.json({ success: true, scrim: updatedScrim });
  } catch (error) {
    console.error('Error updating scrim:', error);
    res.status(500).json({ success: false, error: 'Failed to update scrim' });
  }
});

// Delete scrim (protected)
app.delete('/api/scrims/:id', verifyToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { deleteScrim } = await import('./scrims.js');
    const success = await deleteScrim(req.params.id as string);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Scrim not found' });
    }
    
    logger.success('Scrim deleted', `ID: ${req.params.id}`);
    res.json({ success: true, message: 'Scrim deleted' });
  } catch (error) {
    console.error('Error deleting scrim:', error);
    res.status(500).json({ success: false, error: 'Failed to delete scrim' });
  }
});

// Get scrim statistics (optional auth)
app.get('/api/scrims/stats/summary', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { getScrimStats } = await import('./scrims.js');
    const stats = await getScrimStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching scrim stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scrim stats' });
  }
});

// Get scrims by date range (optional auth)
app.get('/api/scrims/range/:startDate/:endDate', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { getScrimsByDateRange } = await import('./scrims.js');
    const startDate = req.params.startDate as string;
    const endDate = req.params.endDate as string;
    const scrims = await getScrimsByDateRange(startDate, endDate);
    res.json({ success: true, scrims });
  } catch (error) {
    console.error('Error fetching scrims by range:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch scrims' });
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
