import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import { config } from '../../shared/config/config.js';
import { COLORS } from '../embeds/embed.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';
import { getWeekDates, WEEKDAY_LABELS } from '../utils/week-utils.js';

function shortDayLabel(date: string, weekdayLabel: string): string {
  const [day, month] = date.split('.');
  return `${weekdayLabel} ${day}.${month}`;
}

function buildDayButtonRows(weekMonday: string): ActionRowBuilder<ButtonBuilder>[] {
  const dates = getWeekDates(weekMonday);
  const rows: ActionRowBuilder<ButtonBuilder>[] = [
    new ActionRowBuilder<ButtonBuilder>(),
    new ActionRowBuilder<ButtonBuilder>(),
  ];

  dates.forEach((date, i) => {
    // Reuse the daily "set time" flow: customId is consumed by handleAvailabilityButton
    // which opens the same 3-field time modal as the per-date interaction.
    const button = new ButtonBuilder()
      .setCustomId(`set_custom_${date}`)
      .setLabel(shortDayLabel(date, WEEKDAY_LABELS[i]))
      .setStyle(ButtonStyle.Primary);
    const targetRow = i < 4 ? rows[0] : rows[1];
    targetRow.addComponents(button);
  });

  return rows;
}

export async function postWeeklyEntryMessage(
  weekMonday: string,
  variant: 'current' | 'next',
  clientInstance?: Client,
): Promise<void> {
  try {
    const botClient = clientInstance || (await import('../client.js')).client;
    const channel = await botClient.channels.fetch(config.discord.channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.error('Weekly entry post failed', 'Channel not found or not a text channel');
      return;
    }

    const dates = getWeekDates(weekMonday);
    const start = parseDDMMYYYY(dates[0]);
    const end = parseDDMMYYYY(dates[6]);
    const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
    const weekLabel = `${fmt(start)} - ${fmt(end)}${end.getFullYear()}`;

    const title = variant === 'next'
      ? `📆 Set availability for NEXT week (${weekLabel})`
      : `📆 Set availability for THIS week (${weekLabel})`;

    const description = variant === 'next'
      ? 'Plan ahead — pick each day to enter your time window. To mark a day as unavailable, use the daily schedule post buttons or `/set`.'
      : 'The week has started — fill in any days you have not already covered. To mark a day as unavailable, use the daily schedule post buttons or `/set`.';

    const embed = new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(title)
      .setDescription(description)
      .setTimestamp();

    const pingContent = config.discord.pingRoleId ? `<@&${config.discord.pingRoleId}>` : undefined;
    await channel.send({ content: pingContent, embeds: [embed], components: buildDayButtonRows(weekMonday) });
    logger.success('Weekly entry posted', `${variant} week ${weekMonday}`);
  } catch (error) {
    logger.error('Weekly entry post failed', getErrorMessage(error));
  }
}
