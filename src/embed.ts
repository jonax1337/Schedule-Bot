import { EmbedBuilder } from 'discord.js';
import { getOverlapDuration } from './analyzer.js';
import type { ScheduleResult, PlayerAvailability } from './types.js';

const COLORS = {
  SUCCESS: 0x2ecc71,
  WARNING: 0xf39c12,
  ERROR: 0xe74c3c,
  OFF_DAY: 0x9b59b6,
};

function formatPlayer(player: PlayerAvailability): string {
  if (player.available && player.timeRange) {
    return `✅ ${player.name} \`${player.timeRange.start} - ${player.timeRange.end}\``;
  }
  return `❌ ~~${player.name}~~`;
}

export function buildScheduleEmbed(result: ScheduleResult): EmbedBuilder {
  const { schedule, status, commonTimeRange, canProceed } = result;

  // Off-Day
  if (status === 'OFF_DAY') {
    return new EmbedBuilder()
      .setTitle(`📅 ${schedule.dateFormatted}`)
      .setDescription('🏖️ **Off-Day** — No practice today.')
      .setColor(COLORS.OFF_DAY)
      .setFooter({ text: 'Schedule Bot' })
      .setTimestamp();
  }

  const embed = new EmbedBuilder()
    .setColor(canProceed ? (status === 'FULL_ROSTER' ? COLORS.SUCCESS : COLORS.WARNING) : COLORS.ERROR)
    .setTitle(`📅 ${schedule.dateFormatted}`)
    .setFooter({ text: 'Schedule Bot' })
    .setTimestamp();

  // Reason & Focus
  if (schedule.reason || schedule.focus) {
    const parts = [];
    if (schedule.reason) parts.push(`📋 ${schedule.reason}`);
    if (schedule.focus) parts.push(`🎯 ${schedule.focus}`);
    embed.setDescription(parts.join('  •  '));
  }

  // Main Roster - split into two columns
  const mainLeft = schedule.mainPlayers.slice(0, 3).map(formatPlayer).join('\n');
  const mainRight = schedule.mainPlayers.slice(3).map(formatPlayer).join('\n');

  embed.addFields(
    { name: 'Main Roster', value: mainLeft, inline: true },
    { name: '\u200B', value: mainRight, inline: true },
    { name: '\u200B', value: '\u200B', inline: false },
  );

  // Subs & Coach side by side
  const subLines = schedule.subs.map(p => {
    const line = formatPlayer(p);
    return result.requiredSubs.includes(p.name) ? line + ' 🔄' : line;
  }).join('\n');

  const coachLine = schedule.coach.available && schedule.coach.timeRange
    ? `✅ ${schedule.coachName} \`${schedule.coach.timeRange.start} - ${schedule.coach.timeRange.end}\``
    : `❌ ~~${schedule.coachName}~~`;

  embed.addFields(
    { name: 'Subs', value: subLines || '—', inline: true },
    { name: 'Coach', value: coachLine, inline: true },
  );

  // Status
  let statusText = '';
  if (status === 'FULL_ROSTER') {
    statusText = '✅ Full roster available';
  } else if (status === 'WITH_SUBS') {
    statusText = `⚠️ With subs (${result.unavailableMains.join(', ')} unavailable)`;
  } else {
    statusText = `❌ Not enough players (${result.availableMainCount + result.availableSubCount}/5)`;
  }

  if (commonTimeRange && canProceed) {
    const duration = getOverlapDuration(commonTimeRange);
    statusText += `\n⏰ Start: \`${commonTimeRange.start}\` (${duration}h)`;
  }

  embed.addFields({ name: 'Status', value: statusText, inline: false });

  return embed;
}

export function buildNoDataEmbed(date: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ No Data')
    .setDescription(`No entries found for **${date}**.`)
    .setColor(COLORS.ERROR)
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
