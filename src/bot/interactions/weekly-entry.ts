import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  Client,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  ModalSubmitInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { config } from '../../shared/config/config.js';
import { COLORS } from '../embeds/embed.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';
import { getWeekDates, WEEKDAY_LABELS } from '../utils/week-utils.js';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { isUserAbsentOnDate } from '../../repositories/absence.repository.js';
import { updatePlayerAvailability } from '../../repositories/schedule.repository.js';
import { convertTimeRangeBetweenTimezones } from '../../shared/utils/timezoneConverter.js';
import { getScheduleStatus, checkAndNotifyStatusChange } from '../utils/schedule-poster.js';
import { refreshWeeklyOverview } from '../utils/weekly-overview.js';

const WEEKLY_BUTTON_PREFIX = 'weekly_day_';
const WEEKLY_MODAL_PREFIX = 'weekly_day_modal_';

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
    const button = new ButtonBuilder()
      .setCustomId(`${WEEKLY_BUTTON_PREFIX}${date}`)
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
      ? 'Plan ahead — pick each day and enter your time window or mark yourself unavailable.\n\nUse `x` to mark a day as unavailable. Comma-separate multiple windows.'
      : 'The week has started — fill in any days you have not already covered.\n\nUse `x` to mark a day as unavailable. Comma-separate multiple windows.';

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

function createWeeklyDayModal(date: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${WEEKLY_MODAL_PREFIX}${date}`)
    .setTitle(`Availability for ${date}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('availability')
          .setLabel('Time window(s) or "x" to mark unavailable')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('14:00-22:00  or  17:00-20:00,21:00-23:00  or  x')
          .setRequired(true)
          .setMaxLength(100),
      ),
    );
}

const WINDOW_PATTERN = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

function normalizeAvailabilityInput(input: string): { value: string; isUnavailable: boolean } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === 'x') return { value: 'x', isUnavailable: true };

  const segments = trimmed.split(',').map(s => s.trim()).filter(Boolean);
  const valid: string[] = [];
  for (const seg of segments) {
    if (!WINDOW_PATTERN.test(seg)) return null;
    valid.push(seg);
  }
  if (valid.length === 0) return null;
  return { value: valid.join(','), isUnavailable: false };
}

export function isWeeklyDayButton(customId: string): boolean {
  return customId.startsWith(WEEKLY_BUTTON_PREFIX);
}

export function isWeeklyDayModal(customId: string): boolean {
  return customId.startsWith(WEEKLY_MODAL_PREFIX);
}

export async function handleWeeklyDayButton(interaction: ButtonInteraction): Promise<void> {
  const date = interaction.customId.slice(WEEKLY_BUTTON_PREFIX.length);

  const userMapping = await getUserMapping(interaction.user.id);
  if (!userMapping) {
    await interaction.reply({
      content: '❌ You are not registered yet. Please contact an admin.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (await isUserAbsentOnDate(userMapping.discordId, date)) {
    await interaction.reply({
      content: '✈️ You have an active absence on this date. Remove the absence first to set availability.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.showModal(createWeeklyDayModal(date));
}

export async function handleWeeklyDayModal(interaction: ModalSubmitInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userMapping = await getUserMapping(interaction.user.id);
  if (!userMapping) {
    await interaction.editReply({ content: '❌ You are not registered yet.' });
    return;
  }

  const date = interaction.customId.slice(WEEKLY_MODAL_PREFIX.length);
  if (await isUserAbsentOnDate(userMapping.discordId, date)) {
    await interaction.editReply({ content: '✈️ You have an active absence on this date.' });
    return;
  }

  const raw = interaction.fields.getTextInputValue('availability');
  const normalized = normalizeAvailabilityInput(raw);
  if (!normalized) {
    await interaction.editReply({
      content: '❌ Invalid format. Use `HH:MM-HH:MM` (e.g. `14:00-22:00`), comma-separate multiple windows, or `x` to mark unavailable.',
    });
    return;
  }

  let valueToStore = normalized.value;
  if (!normalized.isUnavailable && userMapping.timezone && userMapping.timezone !== config.scheduling.timezone) {
    valueToStore = convertTimeRangeBetweenTimezones(valueToStore, date, userMapping.timezone, config.scheduling.timezone);
  }

  const oldState = await getScheduleStatus(date);
  const oldStatus = oldState?.status;

  const success = await updatePlayerAvailability(date, userMapping.discordId, valueToStore);
  if (!success) {
    await interaction.editReply({ content: '❌ Error updating. Please try again later.' });
    return;
  }

  await interaction.editReply({
    content: normalized.isUnavailable
      ? `❌ You are marked as unavailable for ${date}.`
      : `✅ Availability for ${date} saved: \`${valueToStore}\`.`,
  });

  if (oldStatus) {
    checkAndNotifyStatusChange(date, oldStatus).catch(() => {});
  }
  refreshWeeklyOverview().catch(() => {});
}
