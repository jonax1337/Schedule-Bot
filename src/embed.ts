import { EmbedBuilder } from 'discord.js';
import { getOverlapDuration } from './analyzer.js';
import { config } from './config.js';
import type { ScheduleResult, PlayerAvailability } from './types.js';

const COLORS = {
  SUCCESS: 0x2ecc71,
  WARNING: 0xf39c12,
  ERROR: 0xe74c3c,
  OFF_DAY: 0x9b59b6,
};

const THUMBNAIL_URL = 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${config.googleSheets.sheetId}/edit?usp=sharing`;

function formatPlayer(player: PlayerAvailability): string {
  if (player.available && player.timeRange) {
    return `✅ ${player.name} \`${player.timeRange.start} - ${player.timeRange.end}\``;
  }
  return `❌ ~~${player.name}~~`;
}

function convertTimeToUnixTimestamp(date: string, time: string, timezone: string): number {
  // date format: "DD.MM.YYYY"
  // time format: "HH:MM"
  // timezone: IANA timezone string (e.g., "Europe/London", "Europe/Berlin", "America/New_York")
  
  const [day, month, year] = date.split('.').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  // Create a date string in ISO format for the given timezone
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  // Use Intl API to get the timezone offset for the specific date/time
  // This automatically handles DST (Daylight Saving Time) for any timezone
  const localDate = new Date(dateStr);
  
  // Get the offset in minutes for the configured timezone at this specific date/time
  const timezoneOffset = getTimezoneOffset(localDate, timezone);
  
  // Convert to UTC by subtracting the timezone offset
  const utcTimestamp = localDate.getTime() - (timezoneOffset * 60 * 1000);
  
  return Math.floor(utcTimestamp / 1000);
}

function getTimezoneOffset(date: Date, timezone: string): number {
  // Get the time in the specified timezone
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  // Get the time in UTC
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  
  // Calculate offset in minutes
  return (tzDate.getTime() - utcDate.getTime()) / (60 * 1000);
}

export function buildScheduleEmbed(result: ScheduleResult): EmbedBuilder {
  const { schedule, status, commonTimeRange, canProceed } = result;

  // Off-Day
  if (status === 'OFF_DAY') {
    return new EmbedBuilder()
      .setTitle(schedule.dateFormatted)
      .setURL(SHEET_URL)
      .setDescription('**Off-Day** — No practice today.')
      .setColor(COLORS.OFF_DAY)
      .setThumbnail(THUMBNAIL_URL)
      .setTimestamp();
  }

  const embed = new EmbedBuilder()
    .setColor(canProceed ? (status === 'FULL_ROSTER' ? COLORS.SUCCESS : COLORS.WARNING) : COLORS.ERROR)
    .setTitle(schedule.dateFormatted)
    .setURL(SHEET_URL)
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
  const mainLines = schedule.mainPlayers.map(formatPlayer).join('\n');
  embed.addFields({ name: 'Main Roster', value: mainLines, inline: false });

  // Subs - only show subs that either have a time or a custom name
  const visibleSubs = schedule.subs.filter(p =>
    p.timeRange !== null || (p.name !== 'Sub1' && p.name !== 'Sub2')
  );

  if (visibleSubs.length > 0) {
    const subLines = visibleSubs.map(p => {
      const line = formatPlayer(p);
      return result.requiredSubs.includes(p.name) ? line + ' 🔄' : line;
    }).join('\n');
    embed.addFields({ name: 'Subs', value: subLines || '—', inline: false });
  }

  // Coach - only show if time is entered or name is customized
  const shouldShowCoach = schedule.coach.timeRange !== null || schedule.coachName !== 'Coach';

  if (shouldShowCoach) {
    const coachLine = schedule.coach.available && schedule.coach.timeRange
      ? `✅ ${schedule.coachName} \`${schedule.coach.timeRange.start} - ${schedule.coach.timeRange.end}\``
      : `❌ ~~${schedule.coachName}~~`;

    embed.addFields({ name: 'Coach', value: coachLine, inline: false });
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

  if (commonTimeRange && canProceed) {
    const duration = getOverlapDuration(commonTimeRange);
    const startTimestamp = convertTimeToUnixTimestamp(schedule.date, commonTimeRange.start, config.scheduling.timezone);
    const endTimestamp = convertTimeToUnixTimestamp(schedule.date, commonTimeRange.end, config.scheduling.timezone);
    statusText += `\n⏰ <t:${startTimestamp}:t> - <t:${endTimestamp}:t> (${duration}h)`;
  }

  embed.addFields({ name: 'Status', value: statusText, inline: false });

  return embed;
}

export function buildNoDataEmbed(date: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ No Data')
    .setURL(SHEET_URL)
    .setDescription(`No entries found for **${date}**.`)
    .setColor(COLORS.ERROR)
    .setThumbnail(THUMBNAIL_URL)
    .setTimestamp();
}

export function buildErrorEmbed(error: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('⚠️ Error')
    .setDescription(error)
    .setColor(COLORS.ERROR)
    .setTimestamp();
}
