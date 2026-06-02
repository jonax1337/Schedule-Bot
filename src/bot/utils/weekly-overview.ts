import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { loadSettings, updateSetting } from '../../shared/utils/settingsManager.js';
import { getSchedulesForDates } from '../../repositories/schedule.repository.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { COLORS } from '../embeds/embed.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { getCurrentWeekMonday, getWeekDates, WEEKDAY_LABELS } from './week-utils.js';
import { parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';

const CELL_WIDTH = 11;
const NAME_WIDTH = 12;

function padCell(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  return str + ' '.repeat(width - str.length);
}

function formatAvailabilityCell(availability: string, isAbsent: boolean): string {
  if (isAbsent) return 'absent';
  const trimmed = availability.trim();
  if (!trimmed) return '?';
  if (trimmed.toLowerCase() === 'x') return 'no';
  return trimmed.split(',').map(s => s.trim().replace(/:\d{2}/g, '')).join(',');
}

async function buildWeekTable(weekMonday: string): Promise<string> {
  const dates = getWeekDates(weekMonday);
  const schedules = await getSchedulesForDates(dates);
  const scheduleByDate = new Map(schedules.map(s => [s.date, s]));
  const userMappings = await getUserMappings();
  const players = userMappings.filter(m => m.role !== 'coach').sort((a, b) => a.sortOrder - b.sortOrder);

  const absentByDate = new Map<string, string[]>();
  for (const date of dates) {
    absentByDate.set(date, await getAbsentUserIdsForDate(date));
  }

  const header = padCell('Player', NAME_WIDTH) + WEEKDAY_LABELS.map(d => padCell(d, CELL_WIDTH)).join('');
  const separator = '-'.repeat(NAME_WIDTH) + WEEKDAY_LABELS.map(() => '-'.repeat(CELL_WIDTH - 1) + ' ').join('');

  const rows: string[] = [header, separator];

  for (const player of players) {
    const cells: string[] = [padCell(player.displayName, NAME_WIDTH)];
    for (const date of dates) {
      const schedule = scheduleByDate.get(date);
      const isAbsent = absentByDate.get(date)?.includes(player.discordId) ?? false;
      const entry = schedule?.players.find(p => p.userId === player.discordId);
      const cell = formatAvailabilityCell(entry?.availability ?? '', isAbsent);
      cells.push(padCell(cell, CELL_WIDTH));
    }
    rows.push(cells.join(''));
  }

  return '```\n' + rows.join('\n') + '\n```';
}

function formatWeekRange(weekMonday: string): string {
  const dates = getWeekDates(weekMonday);
  const start = parseDDMMYYYY(dates[0]);
  const end = parseDDMMYYYY(dates[6]);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  return `${fmt(start)} - ${fmt(end)}${end.getFullYear()}`;
}

export async function buildWeeklyOverviewEmbed(weekMonday: string): Promise<EmbedBuilder> {
  const table = await buildWeekTable(weekMonday);
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`Weekly Overview — ${formatWeekRange(weekMonday)}`)
    .setDescription(table)
    .setFooter({ text: 'Updates automatically when availability changes.' })
    .setTimestamp();
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

    if (existingId && sameWeek) {
      try {
        const message = await channel.messages.fetch(existingId);
        await message.edit({ embeds: [embed] });
        return;
      } catch {
        logger.warn('Weekly overview', `Stored message ${existingId} not found, creating new pin`);
      }
    }

    if (existingId && !sameWeek) {
      try {
        const oldMessage = await channel.messages.fetch(existingId);
        if (oldMessage.pinned) await oldMessage.unpin().catch(() => {});
      } catch {
        // old message gone, ignore
      }
    }

    const newMessage = await channel.send({ embeds: [embed] });
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
