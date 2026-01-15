import { EmbedBuilder } from 'discord.js';
import { getOverlapDuration } from './analyzer.js';
import type { ScheduleResult, PlayerAvailability } from './types.js';

const COLORS = {
  SUCCESS: 0x00ff00,      // Green
  WARNING: 0xffaa00,      // Orange
  ERROR: 0xff0000,        // Red
  OFF_DAY: 0x808080,      // Gray
};

function formatPlayerLine(player: PlayerAvailability): string {
  if (player.available && player.timeRange) {
    return `${player.name}: ${player.timeRange.start}-${player.timeRange.end}`;
  }
  return `${player.name}: nicht verfuegbar`;
}

function getStatusEmoji(available: boolean): string {
  return available ? '>' : 'x';
}

export function buildScheduleEmbed(result: ScheduleResult): EmbedBuilder {
  const { schedule, status, commonTimeRange, canProceed } = result;

  // Off-Day special embed
  if (status === 'OFF_DAY') {
    return new EmbedBuilder()
      .setTitle(`${schedule.dateFormatted} - OFF DAY`)
      .setDescription('Heute ist kein Training geplant.\nNutzt die Zeit zur Erholung!')
      .setColor(COLORS.OFF_DAY)
      .setTimestamp();
  }

  // Build main embed
  const embed = new EmbedBuilder()
    .setTitle(`Valorant Training - ${schedule.dateFormatted}`)
    .setColor(canProceed ? (status === 'FULL_ROSTER' ? COLORS.SUCCESS : COLORS.WARNING) : COLORS.ERROR)
    .setTimestamp();

  // Reason and Focus
  if (schedule.reason || schedule.focus) {
    let infoText = '';
    if (schedule.reason) infoText += `**Reason:** ${schedule.reason}\n`;
    if (schedule.focus) infoText += `**Focus:** ${schedule.focus}`;
    embed.setDescription(infoText.trim());
  }

  // Main Roster
  const mainRosterLines = schedule.mainPlayers.map(p => {
    const emoji = getStatusEmoji(p.available);
    return `\`${emoji}\` ${formatPlayerLine(p)}`;
  });
  embed.addFields({
    name: 'MAIN ROSTER',
    value: mainRosterLines.join('\n'),
    inline: false,
  });

  // Subs
  const subLines = schedule.subs.map(p => {
    const emoji = getStatusEmoji(p.available);
    const neededIndicator = result.requiredSubs.includes(p.name) ? ' **(einspringend)**' : '';
    return `\`${emoji}\` ${formatPlayerLine(p)}${neededIndicator}`;
  });
  embed.addFields({
    name: 'SUBS',
    value: subLines.join('\n'),
    inline: false,
  });

  // Coach
  const coachEmoji = getStatusEmoji(schedule.coach.available);
  const coachText = schedule.coach.available && schedule.coach.timeRange
    ? `${schedule.coach.timeRange.start}-${schedule.coach.timeRange.end}`
    : 'nicht verfuegbar';
  embed.addFields({
    name: schedule.coachName.toUpperCase(),
    value: `\`${coachEmoji}\` ${schedule.coachName}: ${coachText}`,
    inline: false,
  });

  // Status summary
  let statusText = '';

  if (status === 'WITH_SUBS') {
    statusText += `**Status:** Mit Subs (${result.unavailableMains.join(', ')} nicht verfuegbar)\n`;
  } else if (status === 'NOT_ENOUGH') {
    statusText += `**Status:** Nicht genuegend Spieler\n`;
  } else {
    statusText += `**Status:** Volles Main-Roster\n`;
  }

  if (commonTimeRange) {
    const duration = getOverlapDuration(commonTimeRange);
    statusText += `**Gemeinsame Zeit:** ab ${commonTimeRange.start} (${duration} Stunden)\n`;
  }

  if (canProceed) {
    statusText += `\n**Training kann stattfinden!**`;
  } else {
    statusText += `\n**Training kann NICHT stattfinden.**`;
  }

  embed.addFields({
    name: '\u200B', // Zero-width space for separator
    value: statusText,
    inline: false,
  });

  return embed;
}

export function buildNoDataEmbed(date: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Keine Daten gefunden')
    .setDescription(`Fuer das Datum **${date}** wurden keine Daten im Schedule gefunden.`)
    .setColor(COLORS.ERROR)
    .setTimestamp();
}

export function buildErrorEmbed(error: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Fehler')
    .setDescription(error)
    .setColor(COLORS.ERROR)
    .setTimestamp();
}
