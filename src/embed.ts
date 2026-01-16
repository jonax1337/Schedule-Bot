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

function convertUKTimeToUnixTimestamp(date: string, time: string): number {
  // date format: "DD.MM.YYYY" or similar
  // time format: "HH:MM"
  const [day, month, year] = date.split('.').map(Number);
  const [hours, minutes] = time.split(':').map(Number);

  // Create date in UK timezone (UTC+0 or UTC+1 depending on DST)
  // Using UTC as baseline for UK time
  const ukDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

  return Math.floor(ukDate.getTime() / 1000);
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
      .setFooter({ text: 'Schedule Bot' })
      .setTimestamp();
  }

  const embed = new EmbedBuilder()
    .setColor(canProceed ? (status === 'FULL_ROSTER' ? COLORS.SUCCESS : COLORS.WARNING) : COLORS.ERROR)
    .setTitle(schedule.dateFormatted)
    .setURL(SHEET_URL)
    .setThumbnail(THUMBNAIL_URL)
    .setFooter({ text: 'Schedule Bot' })
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
    const unixTimestamp = convertUKTimeToUnixTimestamp(schedule.date, commonTimeRange.start);
    statusText += `\n⏰ Start: <t:${unixTimestamp}:t> (${duration}h)`;
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
    .setFooter({ text: 'Schedule Bot' })
    .setTimestamp();
}

export function buildErrorEmbed(error: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('⚠️ Error')
    .setDescription(error)
    .setColor(COLORS.ERROR)
    .setFooter({ text: 'Schedule Bot' })
    .setTimestamp();
}
