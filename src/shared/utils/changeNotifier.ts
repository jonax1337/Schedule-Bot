import { EmbedBuilder } from 'discord.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';
import { loadSettings } from './settingsManager.js';

interface CachedStatus {
  [date: string]: {
    status: string;
    timestamp: number;
  };
}

const statusCache: CachedStatus = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if schedule status improved and send Discord notification
 * @param date Date to check (format: DD.MM.YYYY)
 * @param client Discord client instance
 */
export async function checkAndNotifyStatusChange(date: string, client: any): Promise<void> {
  try {
    const settings = loadSettings();
    
    // Check if notifications are enabled
    if (!settings.scheduling.changeNotificationsEnabled) {
      return;
    }

    const sheetData = await getScheduleForDate(date);
    if (!sheetData) return;
    
    const schedule = parseSchedule(sheetData);
    const result = analyzeSchedule(schedule);
    const currentStatus = { status: result.status };
    
    // Check cache
    const cached = statusCache[date];
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      // Within cache window, check if status improved
      if (hasStatusImproved(cached.status, currentStatus.status)) {
        await sendStatusChangeNotification(date, cached.status, currentStatus, client, settings);
      }
    }
    
    // Update cache
    statusCache[date] = {
      status: currentStatus.status,
      timestamp: now
    };
    
    // Clean old cache entries
    cleanOldCacheEntries();
    
  } catch (error) {
    console.error('[ChangeNotifier] Error checking status change:', error);
  }
}

/**
 * Determine if new status is an improvement over old status
 */
function hasStatusImproved(oldStatus: string, newStatus: string): boolean {
  const statusHierarchy = {
    'Able to play': 4,
    'Almost there': 3,
    'More players needed': 2,
    'Insufficient players': 1,
    'Unknown': 0
  };
  
  const oldRank = statusHierarchy[oldStatus as keyof typeof statusHierarchy] || 0;
  const newRank = statusHierarchy[newStatus as keyof typeof statusHierarchy] || 0;
  
  return newRank > oldRank;
}

/**
 * Send Discord notification about status improvement
 */
async function sendStatusChangeNotification(
  date: string,
  oldStatus: string,
  currentStatus: any,
  client: any,
  settings: any
): Promise<void> {
  try {
    const channel = await client.channels.fetch(settings.scheduleChannelId);
    if (!channel || !channel.isTextBased()) {
      console.error('[ChangeNotifier] Channel not found or not text-based');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📈 Schedule Update: ${date}`)
      .setDescription(`Good news! The training schedule has improved.`)
      .setColor(getStatusColor(currentStatus.status))
      .addFields(
        { name: 'Previous Status', value: oldStatus, inline: true },
        { name: 'Current Status', value: currentStatus.status, inline: true }
      )
      .setTimestamp();

    // Add time window if training is possible
    if (currentStatus.status === 'Able to play' && currentStatus.startTime && currentStatus.endTime) {
      embed.addFields({
        name: '⏰ Available Time Window',
        value: `${currentStatus.startTime} - ${currentStatus.endTime}`,
        inline: false
      });
    }

    // Add player lists
    if (currentStatus.availablePlayers && currentStatus.availablePlayers.length > 0) {
      embed.addFields({
        name: '✅ Available Players',
        value: currentStatus.availablePlayers.join(', '),
        inline: false
      });
    }

    if (currentStatus.unavailablePlayers && currentStatus.unavailablePlayers.length > 0) {
      embed.addFields({
        name: '❌ Unavailable Players',
        value: currentStatus.unavailablePlayers.join(', '),
        inline: false
      });
    }

    if (currentStatus.noResponsePlayers && currentStatus.noResponsePlayers.length > 0) {
      embed.addFields({
        name: '⏳ No Response',
        value: currentStatus.noResponsePlayers.join(', '),
        inline: false
      });
    }

    await channel.send({ embeds: [embed] });
    console.log(`[ChangeNotifier] Sent status improvement notification for ${date}`);
    
  } catch (error) {
    console.error('[ChangeNotifier] Error sending notification:', error);
  }
}

/**
 * Get color based on status
 */
function getStatusColor(status: string): number {
  const colors = {
    'Able to play': 0x00ff00,    // Green
    'Almost there': 0xffff00,         // Yellow
    'More players needed': 0xffa500,  // Orange
    'Insufficient players': 0xff0000, // Red
    'Unknown': 0x808080               // Gray
  };
  
  return colors[status as keyof typeof colors] || 0x808080;
}

/**
 * Clean cache entries older than 1 hour
 */
function cleanOldCacheEntries(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  
  Object.keys(statusCache).forEach(date => {
    if (now - statusCache[date].timestamp > maxAge) {
      delete statusCache[date];
    }
  });
}
