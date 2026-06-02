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
import type { ScheduleData } from '../../shared/types/types.js';

interface PlayerRow {
  userId: string;
  displayName: string;
  sortOrder: number;
}

function stripZeroMins(time: string): string {
  return time.endsWith(':00') ? time.slice(0, -3) : time;
}

function formatTimeRange(value: string): string {
  return value
    .split(',')
    .map(seg => {
      const [start, end] = seg.trim().split('-');
      if (!start || !end) return seg.trim();
      return `${stripZeroMins(start)}-${stripZeroMins(end)}`;
    })
    .join(', ');
}

function playerLine(player: PlayerRow, availability: string, isAbsent: boolean): string {
  if (isAbsent) return `✈️ ${player.displayName}`;
  const v = availability.trim();
  if (!v) return `⚪ ${player.displayName}`;
  if (v.toLowerCase() === 'x') return `❌ ${player.displayName}`;
  return `✅ ${player.displayName} \`${formatTimeRange(v)}\``;
}

function isOffDay(schedule: ScheduleData | undefined): boolean {
  if (!schedule) return false;
  return schedule.reason.toLowerCase().includes('off');
}

function buildDayField(
  date: string,
  weekdayLabel: string,
  schedule: ScheduleData | undefined,
  players: PlayerRow[],
  absentIds: string[],
): { name: string; value: string; inline: boolean } {
  const [day, month] = date.split('.');
  const name = `📅 ${weekdayLabel} ${day}.${month}`;

  if (isOffDay(schedule)) {
    const focus = schedule?.focus?.trim();
    const value = `🟣 **Off-Day**${focus ? `\n_${focus}_` : ''}`;
    return { name, value, inline: true };
  }

  const lines = players.map(p => {
    const entry = schedule?.players.find(sp => sp.userId === p.userId);
    return playerLine(p, entry?.availability ?? '', absentIds.includes(p.userId));
  });

  const value = lines.length > 0 ? lines.join('\n') : '_No roster_';
  return { name, value, inline: true };
}

function countOpenDays(
  dates: string[],
  schedulesByDate: Map<string, ScheduleData>,
  players: PlayerRow[],
  absentByDate: Map<string, string[]>,
): { planned: number; total: number; openSlots: number } {
  let planned = 0;
  let openSlots = 0;

  for (const date of dates) {
    const schedule = schedulesByDate.get(date);
    if (isOffDay(schedule)) {
      planned++;
      continue;
    }
    const absent = absentByDate.get(date) ?? [];
    const relevant = players.filter(p => !absent.includes(p.userId));
    const filled = relevant.every(p => {
      const entry = schedule?.players.find(sp => sp.userId === p.userId);
      return (entry?.availability ?? '').trim() !== '';
    });
    if (filled && relevant.length > 0) {
      planned++;
    } else {
      for (const p of relevant) {
        const entry = schedule?.players.find(sp => sp.userId === p.userId);
        if (!(entry?.availability ?? '').trim()) openSlots++;
      }
    }
  }

  return { planned, total: dates.length, openSlots };
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
  const schedules = await getSchedulesForDates(dates);
  const schedulesByDate = new Map(schedules.map(s => [s.date, s]));

  const userMappings = await getUserMappings();
  const players: PlayerRow[] = userMappings
    .filter(m => m.role !== 'coach')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => ({ userId: m.discordId, displayName: m.displayName, sortOrder: m.sortOrder }));

  const absentByDate = new Map<string, string[]>();
  for (const date of dates) {
    absentByDate.set(date, await getAbsentUserIdsForDate(date));
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`📋 Weekly Overview — ${formatWeekRange(weekMonday)}`)
    .setTimestamp();

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const field = buildDayField(date, WEEKDAY_LABELS[i], schedulesByDate.get(date), players, absentByDate.get(date) ?? []);
    embed.addFields(field);
  }

  // Pad to 9 fields so 3-column grid stays even (3+3+3 → trailing Sun in last row with 2 blanks)
  embed.addFields({ name: '​', value: '​', inline: true });
  embed.addFields({ name: '​', value: '​', inline: true });

  const { planned, total, openSlots } = countOpenDays(dates, schedulesByDate, players, absentByDate);
  const summary = `${planned}/${total} days planned · ${openSlots} open player slot(s) · ✅ available · ❌ unavailable · ⚪ no entry · ✈️ absent`;
  embed.setFooter({ text: summary });

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
