import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
} from 'discord.js';
import { getUserMapping, updateUserMapping } from '../../repositories/user-mapping.repository.js';
import { updatePlayerAvailability, getScheduleForDate, getNext14Dates } from '../../repositories/schedule.repository.js';
import { isUserAbsentOnDate, getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { buildScheduleEmbed, convertTimeToUnixTimestamp, COLORS, NOTIFICATION_TYPE_CONFIG } from '../embeds/embed.js';
import { getTodayFormatted, addDays, normalizeDateFormat, isDateAfterOrEqual } from '../../shared/utils/dateFormatter.js';
import { getScheduleStatus, checkAndNotifyStatusChange } from '../utils/schedule-poster.js';
import { config } from '../../shared/config/config.js';
import { convertTimeRangeBetweenTimezones, getTimezoneAbbreviation, isValidTimezone } from '../../shared/utils/timezoneConverter.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { client } from '../client.js';

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
    await interaction.editReply({
      content: `No data found for ${targetDate}.`,
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
      await interaction.editReply({
        content: `✅ You have been marked as not available for ${date}.`,
      });

      // Check and notify status change (fire and forget)
      if (oldStatus) {
        checkAndNotifyStatusChange(date, oldStatus).catch(() => {});
      }
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

  let timeRange = `${startTime}-${endTime}`;

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
    const normalizedDate = normalizeDateFormat(date);
    // Use the converted (bot TZ) times for Discord timestamps
    const convertedParts = timeRange.split('-');
    const startTs = convertTimeToUnixTimestamp(date, convertedParts[0], botTz);
    const endTs = convertTimeToUnixTimestamp(date, convertedParts[1], botTz);
    await interaction.editReply({
      content: `✅ Your availability for ${normalizedDate} has been set to <t:${startTs}:t> - <t:${endTs}:t>.`,
    });

    // Check and notify status change (fire and forget)
    if (oldStatus) {
      checkAndNotifyStatusChange(date, oldStatus).catch(() => {});
    }
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

  await interaction.reply({
    content: `What is your availability for **${selectedDate}**?`,
    components,
    flags: MessageFlags.Ephemeral,
  });
}

export async function sendWeekOverview(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const dates = getNext14Dates().slice(0, 7);

  const embed = new EmbedBuilder()
    .setTitle('📅 Week Overview')
    .setColor(COLORS.INFO)
    .setTimestamp();

  for (const date of dates) {
    const sheetData = await getScheduleForDate(date);

    if (sheetData) {
      const absentUserIds = await getAbsentUserIdsForDate(date);
      const schedule = parseSchedule(sheetData, absentUserIds);
      const result = analyzeSchedule(schedule);
      
      let statusEmoji = '❌';
      if (result.status === 'OFF_DAY') statusEmoji = '🟣';
      else if (result.status === 'FULL_ROSTER') statusEmoji = '✅';
      else if (result.status === 'WITH_SUBS') statusEmoji = '⚠️';

      const availableCount = result.availableMainCount + result.availableSubCount;
      let timeInfo = 'No common time';
      if (result.commonTimeRange) {
        const startTs = convertTimeToUnixTimestamp(date, result.commonTimeRange.start, config.scheduling.timezone);
        const endTs = convertTimeToUnixTimestamp(date, result.commonTimeRange.end, config.scheduling.timezone);
        timeInfo = `<t:${startTs}:t>-<t:${endTs}:t>`;
      }

      embed.addFields({
        name: `${statusEmoji} ${date}`,
        value: `Players: ${availableCount}/5\nTime: ${timeInfo}`,
        inline: true,
      });
    } else {
      embed.addFields({
        name: `❓ ${date}`,
        value: 'No data',
        inline: true,
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}

export async function sendMySchedule(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const userMapping = await getUserMapping(interaction.user.id);
  
  if (!userMapping) {
    await interaction.editReply({
      content: '❌ You are not registered yet. Please contact an admin.',
    });
    return;
  }

  // Simplified - fetch schedules for next 14 days
  const dates = getNext14Dates();
  const availability: Record<string, { value: string; isAbsent: boolean }> = {};

  for (const date of dates) {
    const isAbsent = await isUserAbsentOnDate(userMapping.discordId, date);
    if (isAbsent) {
      availability[date] = { value: '', isAbsent: true };
      continue;
    }
    const schedule = await getScheduleForDate(date);
    if (schedule) {
      const player = schedule.players.find(p => p.userId === userMapping.discordId);
      if (player && player.availability) {
        availability[date] = { value: player.availability, isAbsent: false };
      }
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Your Availability (${userMapping.displayName})`)
    .setColor(COLORS.SUCCESS)
    .setTimestamp();

  const availabilityEntries = Object.entries(availability);
  if (availabilityEntries.length === 0) {
    embed.setDescription('No entries for the next 14 days.');
  } else {
    let description = '';
    for (const [date, entry] of availabilityEntries) {
      let status: string;
      if (entry.isAbsent) {
        status = '✈️ Absent';
      } else if (entry.value) {
        if (entry.value === 'x') {
          status = '❌ Not available';
        } else {
          // Convert time range to Discord timestamps
          const parts = entry.value.split('-').map((s: string) => s.trim());
          if (parts.length === 2) {
            const startTs = convertTimeToUnixTimestamp(date, parts[0], config.scheduling.timezone);
            const endTs = convertTimeToUnixTimestamp(date, parts[1], config.scheduling.timezone);
            status = `✅ <t:${startTs}:t> - <t:${endTs}:t>`;
          } else {
            status = `✅ ${entry.value}`;
          }
        }
      } else {
        status = '⚪ No entry';
      }
      description += `**${date}**: ${status}\n`;
    }
    embed.setDescription(description);
  }

  await interaction.editReply({ embeds: [embed] });
}

export function createInfoModal(customId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Send Team Notification')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('info_title')
          .setLabel('Title')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Team Notification')
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('info_message')
          .setLabel('Message')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Your message here...')
          .setRequired(true)
          .setMaxLength(1000)
      )
    );
}

export async function handleInfoModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Parse customId to get type, target and specificUser
    const [, , type, target, specificUserId] = interaction.customId.split('_');
    const specificUser = specificUserId !== 'none' ? await client.users.fetch(specificUserId) : null;

    // Get modal values
    const title = interaction.fields.getTextInputValue('info_title').trim();
    const message = interaction.fields.getTextInputValue('info_message').trim();

    const notifConfig = NOTIFICATION_TYPE_CONFIG[type];

    let recipients: string[] = [];
    let recipientNames: string[] = [];

    // If specific user is provided, only send to them
    if (specificUser) {
      const userMapping = await getUserMapping(specificUser.id);
      if (!userMapping) {
        await interaction.editReply({
          content: `❌ ${specificUser.username} is not registered in the system.`,
        });
        return;
      }
      recipients.push(specificUser.id);
      recipientNames.push(userMapping.discordUsername);
    } else {
      // Get all user mappings and filter by target
      const { getUserMappings } = await import('../../repositories/user-mapping.repository.js');
      const allMappings = await getUserMappings();

      const filteredMappings = allMappings.filter(mapping => {
        if (target === 'all') return true;
        return mapping.role === target;
      });

      if (filteredMappings.length === 0) {
        await interaction.editReply({
          content: `❌ No users found for target: ${target}`,
        });
        return;
      }

      recipients = filteredMappings.map(m => m.discordId);
      recipientNames = filteredMappings.map(m => m.discordUsername);
    }

    // Create info embed
    const infoEmbed = new EmbedBuilder()
      .setColor(notifConfig.color)
      .setTitle(`${notifConfig.emoji} ${title}`)
      .setDescription(message)
      .setFooter({ text: `Sent by ${interaction.user.username}` })
      .setTimestamp();

    // Send to all recipients
    let successCount = 0;
    let failedUsers: string[] = [];

    for (let i = 0; i < recipients.length; i++) {
      try {
        const user = await client.users.fetch(recipients[i]);
        await user.send({ embeds: [infoEmbed] });
        successCount++;
      } catch (error) {
        logger.error(`Failed to send info to ${recipientNames[i]}`, getErrorMessage(error));
        failedUsers.push(recipientNames[i]);
      }
    }

    // Send confirmation
    let confirmMessage = `✅ Info sent to ${successCount}/${recipients.length} user(s)`;
    if (specificUser) {
      confirmMessage += ` (${recipientNames[0]})`;
    } else {
      confirmMessage += ` (${target})`;
    }

    if (failedUsers.length > 0) {
      confirmMessage += `\n\n⚠️ Failed to send to: ${failedUsers.join(', ')}`;
    }

    await interaction.editReply({ content: confirmMessage });
  } catch (error) {
    logger.error('Error handling info modal', getErrorMessage(error));
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}


function validateTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

// Common timezones for the quick-select dropdown
const COMMON_TIMEZONES = [
  { label: 'US Eastern (New York)', value: 'America/New_York' },
  { label: 'US Central (Chicago)', value: 'America/Chicago' },
  { label: 'US Mountain (Denver)', value: 'America/Denver' },
  { label: 'US Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'UK (London)', value: 'Europe/London' },
  { label: 'Central Europe (Berlin)', value: 'Europe/Berlin' },
  { label: 'France (Paris)', value: 'Europe/Paris' },
  { label: 'Spain (Madrid)', value: 'Europe/Madrid' },
  { label: 'Italy (Rome)', value: 'Europe/Rome' },
  { label: 'Netherlands (Amsterdam)', value: 'Europe/Amsterdam' },
  { label: 'Sweden (Stockholm)', value: 'Europe/Stockholm' },
  { label: 'Poland (Warsaw)', value: 'Europe/Warsaw' },
  { label: 'Finland (Helsinki)', value: 'Europe/Helsinki' },
  { label: 'Romania (Bucharest)', value: 'Europe/Bucharest' },
  { label: 'Turkey (Istanbul)', value: 'Europe/Istanbul' },
  { label: 'Russia (Moscow)', value: 'Europe/Moscow' },
  { label: 'Japan (Tokyo)', value: 'Asia/Tokyo' },
  { label: 'South Korea (Seoul)', value: 'Asia/Seoul' },
  { label: 'China (Shanghai)', value: 'Asia/Shanghai' },
  { label: 'Australia (Sydney)', value: 'Australia/Sydney' },
  { label: 'Brazil (São Paulo)', value: 'America/Sao_Paulo' },
  { label: 'India (Kolkata)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
];

/**
 * Handle the "Set Timezone" button click from reminder DMs.
 * Shows a select menu with common timezones.
 */
export async function handleTimezoneButton(interaction: ButtonInteraction): Promise<void> {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_timezone')
    .setPlaceholder('Select your timezone...')
    .addOptions(
      COMMON_TIMEZONES.map(tz => ({
        label: tz.label,
        value: tz.value,
        description: getTimezoneAbbreviation(tz.value),
      }))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    content: '🌍 **Select your timezone:**\n\nThis will be used to automatically convert times when you set your availability.\n\n*Need a timezone not listed? Use `/set-timezone` on the server.*',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Handle timezone selection from the dropdown.
 */
export async function handleTimezoneSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const selectedTz = interaction.values[0];

  if (!isValidTimezone(selectedTz)) {
    await interaction.reply({
      content: '❌ Invalid timezone selected.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const userMapping = await getUserMapping(interaction.user.id);
  if (!userMapping) {
    await interaction.reply({
      content: '❌ You are not registered.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await updateUserMapping(interaction.user.id, { timezone: selectedTz });

  const abbr = getTimezoneAbbreviation(selectedTz);
  const botTz = config.scheduling.timezone;
  const botAbbr = getTimezoneAbbreviation(botTz);
  const isSame = selectedTz === botTz;

  await interaction.update({
    content: `✅ Timezone set to **${selectedTz}** (${abbr})!${isSame ? '\n\nThis matches the bot timezone — no conversion needed.' : `\n\n⏰ Your inputs will be converted: ${abbr} → ${botAbbr}`}`,
    components: [],
  });
}
