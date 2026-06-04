import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  MessageFlags,
} from 'discord.js';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { updatePlayerAvailability, getScheduleForDate, getNext14Dates } from '../../repositories/schedule.repository.js';
import { isUserAbsentOnDate, getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { buildScheduleEmbed, convertTimeToUnixTimestamp, dateToUnixTimestamp } from '../embeds/embed.js';
import { getTodayFormatted, addDays, normalizeDateFormat, isDateAfterOrEqual } from '../../shared/utils/dateFormatter.js';
import { getScheduleStatus, checkAndNotifyStatusChange } from '../utils/schedule-poster.js';
import { refreshWeeklyOverview } from '../utils/weekly-overview.js';
import { config } from '../../shared/config/config.js';
import { convertTimeRangeBetweenTimezones } from '../../shared/utils/timezoneConverter.js';

export async function createDateNavigationButtons(currentDate: string): Promise<ActionRowBuilder<ButtonBuilder>> {
  const prevDate = addDays(currentDate, -1);
  const nextDate = addDays(currentDate, 1);
  const today = getTodayFormatted();

  // Get available dates from sheet
  const availableDates = getNext14Dates();

  // Normalize all dates to DD.MM.YYYY format with leading zeros
  const normalizedAvailableDates = availableDates.map(d => normalizeDateFormat(d.trim()));
  const normalizedPrevDate = normalizeDateFormat(prevDate);
  const normalizedNextDate = normalizeDateFormat(nextDate);
  const normalizedCurrentDate = normalizeDateFormat(currentDate);
  const normalizedToday = normalizeDateFormat(today);

  // Check if prev/next dates are available
  const canGoPrev = normalizedAvailableDates.includes(normalizedPrevDate) && isDateAfterOrEqual(normalizedPrevDate, normalizedToday);
  const canGoNext = normalizedAvailableDates.includes(normalizedNextDate);
  const isToday = normalizedCurrentDate === normalizedToday;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`schedule_prev_${prevDate}`)
      .setLabel('← Previous Day')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canGoPrev),
    new ButtonBuilder()
      .setCustomId('schedule_today')
      .setLabel('Today')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isToday),
    new ButtonBuilder()
      .setCustomId(`schedule_next_${nextDate}`)
      .setLabel('Next Day →')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canGoNext)
  );
}

export function createAvailabilityButtons(date: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`set_custom_${date}`)
      .setLabel('✅ Available')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`set_unavailable_${date}`)
      .setLabel('❌ Not Available')
      .setStyle(ButtonStyle.Danger)
  );
}

export async function createDateSelectMenu(): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
  const dates = getNext14Dates();
  const options = dates.slice(0, 25).map(date => ({
    label: date,
    value: date,
    description: 'Set availability for this day',
  }));

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('select_date')
      .setPlaceholder('Select a date')
      .addOptions(options)
  );
}

export function createTimeInputModal(date: string): ModalBuilder {
  const normalizedDate = normalizeDateFormat(date);
  return new ModalBuilder()
    .setCustomId(`time_modal_${date}`)
    .setTitle(`Availability for ${normalizedDate}`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('start_time')
          .setLabel('From (HH:MM)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('14:00')
          .setRequired(true)
          .setMaxLength(5)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('end_time')
          .setLabel('To (HH:MM)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('20:00')
          .setRequired(true)
          .setMaxLength(5)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('additional_windows')
          .setLabel('Additional windows (optional)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('17:00-20:00, 21:00-23:00')
          .setRequired(false)
          .setMaxLength(100)
      )
    );
}

export async function handleDateNavigation(
  interaction: ButtonInteraction
): Promise<void> {
  await interaction.deferUpdate();

  let targetDate: string;

  if (interaction.customId === 'schedule_today') {
    targetDate = getTodayFormatted();
  } else if (interaction.customId.startsWith('schedule_prev_')) {
    targetDate = interaction.customId.replace('schedule_prev_', '');
  } else if (interaction.customId.startsWith('schedule_next_')) {
    targetDate = interaction.customId.replace('schedule_next_', '');
  } else {
    return;
  }

  const sheetData = await getScheduleForDate(targetDate);

  if (!sheetData) {
    const dateTs = dateToUnixTimestamp(targetDate, config.scheduling.timezone);
    await interaction.editReply({
      content: `No data found for <t:${dateTs}:D>.`,
      components: [],
    });
    return;
  }

  const absentUserIds = await getAbsentUserIdsForDate(targetDate);
  const schedule = parseSchedule(sheetData, absentUserIds);
  const result = analyzeSchedule(schedule);
  const embed = buildScheduleEmbed(result);

  const navigationButtons = await createDateNavigationButtons(targetDate);

  await interaction.editReply({
    embeds: [embed],
    components: [navigationButtons],
  });
}

export async function handleAvailabilityButton(
  interaction: ButtonInteraction
): Promise<void> {
  const customId = interaction.customId;
  const date = customId.split('_').pop()!;

  // For "Set Time" modal, show immediately without deferring
  if (customId.startsWith('set_custom_')) {
    const userMapping = await getUserMapping(interaction.user.id);

    if (!userMapping) {
      await interaction.reply({
        content: '❌ You are not registered yet. Please contact an admin to register you.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Check if user is absent on this date
    const isAbsent = await isUserAbsentOnDate(userMapping.discordId, date);
    if (isAbsent) {
      await interaction.reply({
        content: '✈️ You have an active absence for this date. Remove the absence first to set availability.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.showModal(createTimeInputModal(date));
    return;
  }

  // For "Not Available", defer first then process
  if (customId.startsWith('set_unavailable_')) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userMapping = await getUserMapping(interaction.user.id);

    if (!userMapping) {
      await interaction.editReply({
        content: '❌ You are not registered yet. Please contact an admin to register you.',
      });
      return;
    }

    // Check if user is absent on this date
    const isAbsent = await isUserAbsentOnDate(userMapping.discordId, date);
    if (isAbsent) {
      await interaction.editReply({
        content: '✈️ You have an active absence for this date. Remove the absence first to set availability.',
      });
      return;
    }

    // Capture old status before update (for change notification)
    const oldState = await getScheduleStatus(date);
    const oldStatus = oldState?.status;

    const success = await updatePlayerAvailability(date, userMapping.discordId, 'x');

    if (success) {
      const dateTs = dateToUnixTimestamp(date, config.scheduling.timezone);
      await interaction.editReply({
        content: `✅ You have been marked as not available for <t:${dateTs}:D>.`,
      });

      // Check and notify status change (fire and forget)
      if (oldStatus) {
        checkAndNotifyStatusChange(date, oldStatus).catch(() => {});
      }
      refreshWeeklyOverview().catch(() => {});
    } else {
      await interaction.editReply({
        content: `❌ Error updating. Please try again later.`,
      });
    }
  }
}

export async function handleTimeModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userMapping = await getUserMapping(interaction.user.id);

  if (!userMapping) {
    await interaction.editReply({
      content: '❌ You are not registered yet.',
    });
    return;
  }

  const date = interaction.customId.replace('time_modal_', '');

  // Check if user is absent on this date
  const isAbsent = await isUserAbsentOnDate(userMapping.discordId, date);
  if (isAbsent) {
    await interaction.editReply({
      content: '✈️ You have an active absence for this date. Remove the absence first to set availability.',
    });
    return;
  }

  const startTime = interaction.fields.getTextInputValue('start_time');
  const endTime = interaction.fields.getTextInputValue('end_time');

  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    await interaction.editReply({
      content: '❌ Invalid time format. Please use HH:MM (e.g. 14:00)',
    });
    return;
  }

  // Build primary window
  let timeRange = `${startTime}-${endTime}`;

  // Parse optional additional windows
  let additionalWindows = '';
  try {
    additionalWindows = interaction.fields.getTextInputValue('additional_windows')?.trim() || '';
  } catch {
    // Field may not exist in older modals
  }

  if (additionalWindows) {
    // Parse and validate additional windows (comma-separated "HH:MM-HH:MM" segments)
    const segments = additionalWindows.split(',').map(s => s.trim()).filter(Boolean);
    const windowPattern = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
    const validSegments: string[] = [];

    for (const seg of segments) {
      if (!windowPattern.test(seg)) {
        await interaction.editReply({
          content: `❌ Invalid additional window format: "${seg}". Use HH:MM-HH:MM (e.g. 17:00-20:00).`,
        });
        return;
      }
      validSegments.push(seg);
    }

    if (validSegments.length > 0) {
      timeRange = `${timeRange},${validSegments.join(',')}`;
    }
  }

  // Convert from user's timezone to bot timezone if user has a timezone set
  const userTz = userMapping.timezone;
  const botTz = config.scheduling.timezone;
  if (userTz && userTz !== botTz) {
    timeRange = convertTimeRangeBetweenTimezones(timeRange, date, userTz, botTz);
  }

  // Capture old status before update (for change notification)
  const oldState = await getScheduleStatus(date);
  const oldStatus = oldState?.status;

  const success = await updatePlayerAvailability(date, userMapping.discordId, timeRange);

  if (success) {
    const dateTs = dateToUnixTimestamp(date, botTz);
    // Format all windows with Discord timestamps
    const windowSegments = timeRange.split(',').map(s => s.trim());
    const formattedWindows = windowSegments.map(seg => {
      const parts = seg.split('-');
      const startTs = convertTimeToUnixTimestamp(date, parts[0], botTz);
      const endTs = convertTimeToUnixTimestamp(date, parts[1], botTz);
      return `<t:${startTs}:t> - <t:${endTs}:t>`;
    });
    await interaction.editReply({
      content: `✅ Your availability for <t:${dateTs}:D> has been set to ${formattedWindows.join(', ')}.`,
    });

    // Check and notify status change (fire and forget)
    if (oldStatus) {
      checkAndNotifyStatusChange(date, oldStatus).catch(() => {});
    }
    refreshWeeklyOverview().catch(() => {});
  } else {
    await interaction.editReply({
      content: `❌ Error updating. Please try again later.`,
    });
  }
}

export async function handleDateSelect(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const selectedDate = interaction.values[0];

  const components: ActionRowBuilder<ButtonBuilder>[] = [createAvailabilityButtons(selectedDate)];

  // Show timezone button if user has no timezone set
  const userMapping = await getUserMapping(interaction.user.id);
  if (userMapping && !userMapping.timezone) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('set_timezone_prompt')
          .setLabel('🌍 Set Timezone')
          .setStyle(ButtonStyle.Secondary)
      )
    );
  }

  const selectedTs = dateToUnixTimestamp(selectedDate, config.scheduling.timezone);
  await interaction.reply({
    content: `What is your availability for <t:${selectedTs}:D>?`,
    components,
    flags: MessageFlags.Ephemeral,
  });
}

function validateTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}
