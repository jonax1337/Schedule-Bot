import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, EmbedBuilder, TextChannel } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { loadSettings, updateSetting } from '../../shared/utils/settingsManager.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { COLORS, convertTimeToUnixTimestamp } from '../embeds/embed.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { getCurrentWeekMonday, getWeekDates, WEEKDAY_LABELS } from './week-utils.js';
import { parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';
import { getAnalyzedSchedule } from '../../shared/utils/scheduleDetails.js';
import type { PlayerAvailability, TimeRange } from '../../shared/types/types.js';

interface RosterEntry {
  userId: string;
  displayName: string;
  sortOrder: number;
}

function formatTimeWindows(ranges: TimeRange[], date: string, tz: string): string {
  return ranges
    .map(r => {
      const sTs = convertTimeToUnixTimestamp(date, r.start, tz);
      const eTs = convertTimeToUnixTimestamp(date, r.end, tz);
      return `<t:${sTs}:t>-<t:${eTs}:t>`;
    })
    .join(', ');
}

function playerLine(player: PlayerAvailability, date: string, tz: string): string {
  if (player.isAbsent) return `✈️ ${player.displayName}`;
  if (player.available && player.timeRanges && player.timeRanges.length > 0) {
    return `✅ ${player.displayName} ${formatTimeWindows(player.timeRanges, date, tz)}`;
  }
  const v = (player.rawValue || '').trim();
  if (v.toLowerCase() === 'x') return `❌ ${player.displayName}`;
  return `⚪ ${player.displayName}`;
}

// Trailing blank line gives the field breathing room on mobile, where Discord
// stacks inline fields without spacing.
const MOBILE_SPACER = '\n​';

async function buildDayField(
  date: string,
  weekdayLabel: string,
  roster: RosterEntry[],
  tz: string,
): Promise<{ name: string; value: string; inline: boolean }> {
  const [day, month] = date.split('.');
  const name = `📅 ${weekdayLabel} ${day}.${month}`;

  const result = await getAnalyzedSchedule(date);

  if (!result) {
    return { name, value: '⚪ No schedule' + MOBILE_SPACER, inline: true };
  }

  if (result.status === 'OFF_DAY') {
    const focus = result.schedule.focus?.trim();
    return {
      name,
      value: `🟣 **Off-Day**${focus ? `\n_${focus}_` : ''}` + MOBILE_SPACER,
      inline: true,
    };
  }

  const lookup = new Map(result.schedule.players.map(p => [p.userId, p]));
  const lines = roster.map(entry => {
    const pa = lookup.get(entry.userId);
    return pa ? playerLine(pa, date, tz) : `⚪ ${entry.displayName}`;
  });

  return { name, value: lines.join('\n') + MOBILE_SPACER, inline: true };
}

function buildDayButtonRows(weekMonday: string): ActionRowBuilder<ButtonBuilder>[] {
  const dates = getWeekDates(weekMonday);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [
    new ActionRowBuilder<ButtonBuilder>(),
    new ActionRowBuilder<ButtonBuilder>(),
  ];

  dates.forEach((date, i) => {
    const [day, month] = date.split('.');
    const button = new ButtonBuilder()
      .setCustomId(`set_custom_${date}`)
      .setLabel(`${WEEKDAY_LABELS[i]} ${day}.${month}`)
      .setStyle(ButtonStyle.Primary);
    const targetRow = i < 4 ? rows[0] : rows[1];
    targetRow.addComponents(button);
  });

  return rows;
}

function formatWeekRange(weekMonday: string): string {
  const dates = getWeekDates(weekMonday);
  const start = parseDDMMYYYY(dates[0]);
  const end = parseDDMMYYYY(dates[6]);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  return `${fmt(start)} - ${fmt(end)}${end.getFullYear()}`;
}

export async function buildWeeklyOverviewEmbed(weekMonday: string): Promise<EmbedBuilder> {
  const dates = getWeekDates(weekMonday);
  const tz = config.scheduling.timezone;

  const userMappings = await getUserMappings();
  const roster: RosterEntry[] = userMappings
    .filter(m => m.role !== 'coach')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => ({ userId: m.discordId, displayName: m.displayName, sortOrder: m.sortOrder }));

  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`📋 Weekly Overview — ${formatWeekRange(weekMonday)}`)
    .setTimestamp();

  for (let i = 0; i < dates.length; i++) {
    embed.addFields(await buildDayField(dates[i], WEEKDAY_LABELS[i], roster, tz));
  }

  // Pad to 9 fields so 3-column grid stays even (3+3+3)
  embed.addFields({ name: '​', value: '​', inline: true });
  embed.addFields({ name: '​', value: '​', inline: true });

  embed.setFooter({ text: 'Times shown in your local timezone · ✅ available · ❌ unavailable · ⚪ no entry · ✈️ absent' });

  return embed;
}

async function getChannel(clientInstance?: Client): Promise<TextChannel | null> {
  const botClient = clientInstance || (await import('../client.js')).client;
  const channel = await botClient.channels.fetch(config.discord.channelId);
  if (!channel || !(channel instanceof TextChannel)) {
    logger.error('Weekly overview', 'Channel not found or not a text channel');
    return null;
  }
  return channel;
}

export async function refreshWeeklyOverview(clientInstance?: Client): Promise<void> {
  try {
    const settings = loadSettings();
    const weekMonday = getCurrentWeekMonday();
    const channel = await getChannel(clientInstance);
    if (!channel) return;

    const embed = await buildWeeklyOverviewEmbed(weekMonday);

    const existingId = settings.discord.pinnedWeekMessageId;
    const sameWeek = settings.discord.pinnedWeekStartDate === weekMonday;

    const components = buildDayButtonRows(weekMonday);

    if (existingId && sameWeek) {
      try {
        const message = await channel.messages.fetch(existingId);
        await message.edit({ embeds: [embed], components });
        return;
      } catch {
        logger.warn('Weekly overview', `Stored message ${existingId} not found, creating new pin`);
      }
    }

    if (existingId && !sameWeek) {
      try {
        const oldMessage = await channel.messages.fetch(existingId);
        await oldMessage.delete().catch(() => {});
      } catch {
        // old message gone, ignore
      }
    }

    const newMessage = await channel.send({ embeds: [embed], components });
    try {
      await newMessage.pin();
    } catch (error) {
      logger.warn('Weekly overview', `Could not pin message: ${getErrorMessage(error)}`);
    }

    await updateSetting('discord', 'pinnedWeekMessageId', newMessage.id);
    await updateSetting('discord', 'pinnedWeekStartDate', weekMonday);
    logger.success('Weekly overview', `Posted for week starting ${weekMonday}`);
  } catch (error) {
    logger.error('Weekly overview refresh failed', getErrorMessage(error));
  }
}
