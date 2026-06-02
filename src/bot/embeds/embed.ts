import { EmbedBuilder } from 'discord.js';
import { getOverlapDuration } from '../../shared/utils/analyzer.js';
import { config } from '../../shared/config/config.js';
import type { ScheduleResult, PlayerAvailability } from '../../shared/types/types.js';

export const COLORS = {
  SUCCESS: 0x2ecc71,
  WARNING: 0xf39c12,
  ERROR: 0xe74c3c,
  OFF_DAY: 0x9b59b6,
  INFO: 0x3498db,
  DISCORD_BLURPLE: 0x5865F2,
};

const THUMBNAIL_URL = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png';

function formatPlayer(player: PlayerAvailability, date?: string): string {
  if (player.available && player.timeRanges && player.timeRanges.length > 0) {
    if (date) {
      const rangeStr = player.timeRanges.map(r => {
        const startTs = convertTimeToUnixTimestamp(date, r.start, config.scheduling.timezone);
        const endTs = convertTimeToUnixTimestamp(date, r.end, config.scheduling.timezone);
        return `<t:${startTs}:t>-<t:${endTs}:t>`;
      }).join(', ');
      return `✅ ${player.displayName} ${rangeStr}`;
    }
    const rangeStr = player.timeRanges.map(r => `\`${r.start}-${r.end}\``).join(', ');
    return `✅ ${player.displayName} ${rangeStr}`;
  }
  if (player.isAbsent) {
    return `✈️ ~~${player.displayName}~~`;
  }
  if (!player.rawValue || player.rawValue.trim() === '') {
    return `❓ ${player.displayName}`;
  }
  return `❌ ~~${player.displayName}~~`;
}

/**
 * Convert a DD.MM.YYYY date to a Unix timestamp anchored at noon in the bot timezone.
 * Noon is safe across all viewer timezones: even the most westward zone (UTC-12) stays
 * within the same calendar day when Discord renders the timestamp with the `:D` / `:F`
 * formats, so every viewer sees the correct date.
 */
export function dateToUnixTimestamp(date: string, timezone: string): number {
  return convertTimeToUnixTimestamp(date, '12:00', timezone);
}

export function convertTimeToUnixTimestamp(date: string, time: string, timezone: string): number {
  const [day, month, year] = date.split('.').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  // Create a reference Date with the desired time
  const refDate = new Date(year, month - 1, day, hours, minutes, 0);

  // Format in the given timezone to see what time it thinks this is
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(refDate);
  const gotHour = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
  const gotMinute = Number(parts.find(p => p.type === 'minute')?.value ?? 0);

  // Adjust so that formatting in the given timezone shows our desired time
  const wantedMinutes = hours * 60 + minutes;
  const gotMinutes = gotHour * 60 + gotMinute;
  const diffMinutes = wantedMinutes - gotMinutes;
  const adjusted = new Date(refDate.getTime() + diffMinutes * 60 * 1000);

  return Math.floor(adjusted.getTime() / 1000);
}

export function buildScheduleEmbed(result: ScheduleResult): EmbedBuilder {
  const { schedule, status, commonTimeRange, canProceed } = result;

  const dateTs = dateToUnixTimestamp(schedule.date, config.scheduling.timezone);

  // Off-Day
  if (status === 'OFF_DAY') {
    return new EmbedBuilder()
      .setTitle('📅 Schedule')
      .setDescription(`<t:${dateTs}:D>\n\n**Off-Day** — No practice today.`)
      .setColor(COLORS.OFF_DAY)
      .setThumbnail(THUMBNAIL_URL)
      .setTimestamp();
  }

  const embed = new EmbedBuilder()
    .setColor(canProceed ? (status === 'FULL_ROSTER' ? COLORS.SUCCESS : COLORS.WARNING) : COLORS.ERROR)
    .setTitle('📅 Schedule')
    .setThumbnail(THUMBNAIL_URL)
    .setTimestamp();

  // Header: localized date + optional reason / focus
  let desc = `<t:${dateTs}:D>`;
  if (schedule.reason) desc += `\n\n**Reason:** ${schedule.reason}`;
  if (schedule.focus) desc += `\n**Focus:** ${schedule.focus}`;
  embed.setDescription(desc);

  // Main Roster
  const mainPlayers = schedule.players.filter(p => p.role === 'MAIN');
  if (mainPlayers.length > 0) {
    const mainLines = mainPlayers.map(p => formatPlayer(p, schedule.date)).join('\n');
    embed.addFields({ name: 'Main Roster', value: mainLines, inline: false });
  }

  // Subs - only show subs that have a time, are marked unavailable, or are absent
  const subs = schedule.players.filter(p => p.role === 'SUB');
  const visibleSubs = subs.filter(p => (p.timeRanges !== null && p.timeRanges.length > 0) || p.rawValue.toLowerCase() === 'x' || p.isAbsent);

  if (visibleSubs.length > 0) {
    const subLines = visibleSubs.map(p => {
      const line = formatPlayer(p, schedule.date);
      const isRequired = result.requiredSubs.some(rs => rs.userId === p.userId);
      return isRequired ? line + ' 🔄' : line;
    }).join('\n');
    embed.addFields({ name: 'Subs', value: subLines || '—', inline: false });
  }

  // Coaches - only show coaches that have a time, are marked unavailable, or are absent
  const coaches = schedule.players.filter(p => p.role === 'COACH');
  const visibleCoaches = coaches.filter(p => (p.timeRanges !== null && p.timeRanges.length > 0) || p.rawValue.toLowerCase() === 'x' || p.isAbsent);

  if (visibleCoaches.length > 0) {
    const coachLines = visibleCoaches.map(p => formatPlayer(p, schedule.date)).join('\n');
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

export const NOTIFICATION_TYPE_CONFIG: Record<string, { color: number; emoji: string }> = {
  info: { color: COLORS.INFO, emoji: '📢' },
  success: { color: COLORS.SUCCESS, emoji: '✅' },
  warning: { color: COLORS.WARNING, emoji: '⚠️' },
  error: { color: COLORS.ERROR, emoji: '❌' },
};

export function buildNotificationEmbed(
  type: 'info' | 'success' | 'warning' | 'error',
  title: string,
  message: string
): EmbedBuilder {
  const typeConfig = NOTIFICATION_TYPE_CONFIG[type];

  return new EmbedBuilder()
    .setColor(typeConfig.color)
    .setTitle(`${typeConfig.emoji} ${title}`)
    .setDescription(message)
    .setTimestamp();
}
