import { EmbedBuilder } from 'discord.js';
import { getOverlapDuration } from '../../shared/utils/analyzer.js';
import { config } from '../../shared/config/config.js';
import type { ScheduleResult, PlayerAvailability } from '../../shared/types/types.js';

const COLORS = {
  SUCCESS: 0x2ecc71,
  WARNING: 0xf39c12,
  ERROR: 0xe74c3c,
  OFF_DAY: 0x9b59b6,
};

const THUMBNAIL_URL = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png';

function formatPlayer(player: PlayerAvailability): string {
  if (player.available && player.timeRange) {
    return `✅ ${player.displayName} \`${player.timeRange.start} - ${player.timeRange.end}\``;
  }
  return `❌ ~~${player.displayName}~~`;
}

function convertTimeToUnixTimestamp(date: string, time: string, timezone: string): number {
  const [day, month, year] = date.split('.').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  const localDate = new Date(dateStr);
  const timezoneOffset = getTimezoneOffset(localDate, timezone);
  const utcTimestamp = localDate.getTime() - (timezoneOffset * 60 * 1000);
  
  return Math.floor(utcTimestamp / 1000);
}

function getTimezoneOffset(date: Date, timezone: string): number {
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  return (tzDate.getTime() - utcDate.getTime()) / (60 * 1000);
}

export function buildScheduleEmbed(result: ScheduleResult): EmbedBuilder {
  const { schedule, status, commonTimeRange, canProceed } = result;

  // Off-Day
  if (status === 'OFF_DAY') {
    return new EmbedBuilder()
      .setTitle(schedule.dateFormatted)
      .setDescription('**Off-Day** — No practice today.')
      .setColor(COLORS.OFF_DAY)
      .setThumbnail(THUMBNAIL_URL)
      .setTimestamp();
  }

  const embed = new EmbedBuilder()
    .setColor(canProceed ? (status === 'FULL_ROSTER' ? COLORS.SUCCESS : COLORS.WARNING) : COLORS.ERROR)
    .setTitle(schedule.dateFormatted)
    .setThumbnail(THUMBNAIL_URL)
    .setTimestamp();

  // Reason & Focus
  if (schedule.reason || schedule.focus) {
    let desc = '';
    if (schedule.reason) desc += `**Reason:** ${schedule.reason}`;
    if (schedule.focus) desc += `\n**Focus:** ${schedule.focus}`;
    embed.setDescription(desc);
  }

  // Main Roster
  const mainPlayers = schedule.players.filter(p => p.role === 'MAIN');
  if (mainPlayers.length > 0) {
    const mainLines = mainPlayers.map(formatPlayer).join('\n');
    embed.addFields({ name: 'Main Roster', value: mainLines, inline: false });
  }

  // Subs - only show subs that have a time or are marked unavailable
  const subs = schedule.players.filter(p => p.role === 'SUB');
  const visibleSubs = subs.filter(p => p.timeRange !== null || p.rawValue.toLowerCase() === 'x');

  if (visibleSubs.length > 0) {
    const subLines = visibleSubs.map(p => {
      const line = formatPlayer(p);
      const isRequired = result.requiredSubs.some(rs => rs.userId === p.userId);
      return isRequired ? line + ' 🔄' : line;
    }).join('\n');
    embed.addFields({ name: 'Subs', value: subLines || '—', inline: false });
  }

  // Coaches - only show coaches that have a time or are marked unavailable
  const coaches = schedule.players.filter(p => p.role === 'COACH');
  const visibleCoaches = coaches.filter(p => p.timeRange !== null || p.rawValue.toLowerCase() === 'x');

  if (visibleCoaches.length > 0) {
    const coachLines = visibleCoaches.map(formatPlayer).join('\n');
    embed.addFields({ name: 'Coaches', value: coachLines, inline: false });
  }

  // Status
  let statusText = '';
  if (status === 'FULL_ROSTER') {
    statusText = '✅ Full roster available';
  } else if (status === 'WITH_SUBS') {
    statusText = '⚠️ With subs';
  } else {
    statusText = '❌ Not enough players';
  }

  // Common time range
  if (commonTimeRange) {
    const duration = getOverlapDuration(commonTimeRange);
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const startTimestamp = convertTimeToUnixTimestamp(schedule.date, commonTimeRange.start, config.scheduling.timezone);
    const endTimestamp = convertTimeToUnixTimestamp(schedule.date, commonTimeRange.end, config.scheduling.timezone);

    statusText += `\n⏰ <t:${startTimestamp}:t> - <t:${endTimestamp}:t> (${durationStr})`;
  }

  embed.addFields({ name: 'Status', value: statusText, inline: false });

  return embed;
}

export function buildReminderEmbed(date: string, dateFormatted: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle('⏰ Reminder: Update Your Availability')
    .setDescription(
      `Please update your availability for **${dateFormatted}**.\n\n` +
      `Use \`/availability\` or visit the dashboard to set your times.`
    )
    .setThumbnail(THUMBNAIL_URL)
    .setTimestamp();
}

export function buildPollEmbed(question: string, options: string[]): EmbedBuilder {
  const optionsList = options.map((opt, i) => `${i + 1}️⃣ ${opt}`).join('\n');

  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('📊 ' + question)
    .setDescription(optionsList)
    .setThumbnail(THUMBNAIL_URL)
    .setTimestamp();
}

export function buildNotificationEmbed(
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string
): EmbedBuilder {
  const colorMap = {
    info: 0x3498db,
    success: COLORS.SUCCESS,
    warning: COLORS.WARNING,
    error: COLORS.ERROR,
  };

  const emojiMap = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  };

  return new EmbedBuilder()
    .setColor(colorMap[type])
    .setTitle(`${emojiMap[type]} ${title}`)
    .setDescription(message)
    .setTimestamp();
}
