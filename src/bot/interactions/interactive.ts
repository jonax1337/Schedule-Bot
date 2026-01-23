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
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { updatePlayerAvailability, getScheduleForDate, getNext14Dates } from '../../repositories/schedule.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { buildScheduleEmbed } from '../embeds/embed.js';
// Week operations removed - use individual updatePlayerAvailability calls
import { client } from '../client.js';

export async function createDateNavigationButtons(currentDate: string): Promise<ActionRowBuilder<ButtonBuilder>> {
  const prevDate = getAdjacentDate(currentDate, -1);
  const nextDate = getAdjacentDate(currentDate, 1);
  const today = new Date().toLocaleDateString('de-DE');

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
      .setLabel('Available')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`set_unavailable_${date}`)
      .setLabel('Not Available')
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
    targetDate = new Date().toLocaleDateString('de-DE');
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

  const schedule = parseSchedule(sheetData);
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
    
    const success = await updatePlayerAvailability(date, userMapping.discordId, 'x');
    
    if (success) {
      await interaction.editReply({
        content: `✅ You have been marked as not available for ${date}.`,
      });
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
  const startTime = interaction.fields.getTextInputValue('start_time');
  const endTime = interaction.fields.getTextInputValue('end_time');

  if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
    await interaction.editReply({
      content: '❌ Invalid time format. Please use HH:MM (e.g. 14:00)',
    });
    return;
  }

  const timeRange = `${startTime}-${endTime}`;
  const success = await updatePlayerAvailability(date, userMapping.discordId, timeRange);

  if (success) {
    const normalizedDate = normalizeDateFormat(date);
    await interaction.editReply({
      content: `✅ Your availability for ${normalizedDate} has been set to ${timeRange}.`,
    });
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
  
  await interaction.reply({
    content: `What is your availability for **${selectedDate}**?`,
    components: [createAvailabilityButtons(selectedDate)],
    flags: MessageFlags.Ephemeral,
  });
}

export async function sendWeekOverview(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const today = new Date();
  const dates: string[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dates.push(date.toLocaleDateString('de-DE'));
  }

  const embed = new EmbedBuilder()
    .setTitle('📅 Week Overview')
    .setColor(0x3498db)
    .setTimestamp();

  for (const date of dates) {
    const sheetData = await getScheduleForDate(date);
    
    if (sheetData) {
      const schedule = parseSchedule(sheetData);
      const result = analyzeSchedule(schedule);
      
      let statusEmoji = '❌';
      if (result.status === 'OFF_DAY') statusEmoji = '🟣';
      else if (result.status === 'FULL_ROSTER') statusEmoji = '✅';
      else if (result.status === 'WITH_SUBS') statusEmoji = '⚠️';

      const availableCount = result.availableMainCount + result.availableSubCount;
      const timeInfo = result.commonTimeRange 
        ? `${result.commonTimeRange.start}-${result.commonTimeRange.end}`
        : 'No common time';

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

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 13);

  // Simplified - fetch schedules for next 14 days
  const dates = getNext14Dates();
  const availability: Record<string, string> = {};
  
  for (const date of dates) {
    const schedule = await getScheduleForDate(date);
    if (schedule) {
      const player = schedule.players.find(p => p.userId === userMapping.discordId);
      if (player && player.availability) {
        availability[date] = player.availability;
      }
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`📋 Your Availability (${userMapping.displayName})`)
    .setColor(0x2ecc71)
    .setTimestamp();

  const availabilityEntries = Object.entries(availability);
  if (availabilityEntries.length === 0) {
    embed.setDescription('No entries for the next 14 days.');
  } else {
    let description = '';
    for (const [date, value] of availabilityEntries) {
      const status = value 
        ? (value === 'x' ? '❌ Not available' : `✅ ${value}`)
        : '⚪ No entry';
      description += `**${date}**: ${status}\n`;
    }
    embed.setDescription(description);
  }

  await interaction.editReply({ embeds: [embed] });
}

export async function createWeekModal(userId: string): Promise<ModalBuilder> {
  const dates = getNext14Dates().slice(0, 5); // First 5 days
  
  // Get user mapping to fetch current values
  const userMapping = await getUserMapping(userId);
  let currentValues: string[] = ['', '', '', '', ''];
  
  if (userMapping) {
    // Fetch current availability for the next 5 days
    // Fetch availability for first 5 days
    const availability: Record<string, string> = {};
    for (let i = 0; i < 5 && i < dates.length; i++) {
      const schedule = await getScheduleForDate(dates[i]);
      if (schedule) {
        const player = schedule.players.find(p => p.userId === userMapping.discordId);
        if (player) {
          availability[dates[i]] = player.availability;
        }
      }
    }
    
    // Map availability to values array
    for (let i = 0; i < dates.length && i < 5; i++) {
      const value = availability[dates[i]];
      if (value) {
        currentValues[i] = value;
      }
    }
  }
  
  return new ModalBuilder()
    .setCustomId('week_modal')
    .setTitle('Set Week Availability')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('day_0')
          .setLabel(`Day 1 (${dates[0]})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('14:00-22:00 or x (not available) or leave empty')
          .setRequired(false)
          .setMaxLength(20)
          .setValue(currentValues[0])
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('day_1')
          .setLabel(`Day 2 (${dates[1]})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('14:00-22:00 or x (not available) or leave empty')
          .setRequired(false)
          .setMaxLength(20)
          .setValue(currentValues[1])
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('day_2')
          .setLabel(`Day 3 (${dates[2]})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('14:00-22:00 or x (not available) or leave empty')
          .setRequired(false)
          .setMaxLength(20)
          .setValue(currentValues[2])
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('day_3')
          .setLabel(`Day 4 (${dates[3]})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('14:00-22:00 or x (not available) or leave empty')
          .setRequired(false)
          .setMaxLength(20)
          .setValue(currentValues[3])
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('day_4')
          .setLabel(`Day 5 (${dates[4]})`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('14:00-22:00 or x (not available) or leave empty')
          .setRequired(false)
          .setMaxLength(20)
          .setValue(currentValues[4])
      )
    );
}

export async function handleSetWeekCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const userMapping = await getUserMapping(interaction.user.id);
  
  if (!userMapping) {
    await interaction.reply({
      content: '❌ You are not registered yet. Please contact an admin to register you.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const modal = await createWeekModal(interaction.user.id);
  await interaction.showModal(modal);
}

export async function handleWeekModal(
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

  const dates = getNext14Dates().slice(0, 5);
  const weekData: Record<string, string> = {};
  const entries: string[] = [];

  // Collect all 7 days (only first 5 are in modal due to Discord limit)
  for (let i = 0; i < 5; i++) {
    const value = interaction.fields.getTextInputValue(`day_${i}`).trim();
    if (value) {
      // Validate format
      if (value.toLowerCase() === 'x') {
        weekData[dates[i]] = 'x';
        entries.push(`${dates[i]}: Not available`);
      } else if (validateTimeRangeFormat(value)) {
        weekData[dates[i]] = value;
        entries.push(`${dates[i]}: ${value}`);
      } else {
        await interaction.editReply({
          content: `❌ Invalid format for ${dates[i]}. Use HH:MM-HH:MM (e.g., 14:00-22:00) or 'x' for not available.`,
        });
        return;
      }
    }
  }

  if (Object.keys(weekData).length === 0) {
    await interaction.editReply({
      content: '❌ No availability entered. Please fill at least one day.',
    });
    return;
  }

  // Update all entries
  // Update each day individually
  let successCount = 0;
  for (const [date, value] of Object.entries(weekData)) {
    const success = await updatePlayerAvailability(date, userMapping.discordId, value);
    if (success) successCount++;
  }
  
  const result = { success: successCount === Object.keys(weekData).length, updated: successCount };

  if (result.success) {
    await interaction.editReply({
      content: `✅ Week availability updated successfully!\n\n${entries.join('\n')}`,
    });
  } else {
    await interaction.editReply({
      content: `⚠️ Partially updated. ${result.updated}/${Object.keys(weekData).length} days updated successfully.`,
    });
  }
}

function validateTimeRangeFormat(value: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(value);
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

    // Get color and emoji based on type
    const typeConfig = {
      info: { color: 0x3498db, emoji: '📢' },
      success: { color: 0x2ecc71, emoji: '✅' },
      warning: { color: 0xf39c12, emoji: '⚠️' },
      error: { color: 0xe74c3c, emoji: '❌' },
    };

    const config = typeConfig[type as keyof typeof typeConfig];

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
      .setColor(config.color)
      .setTitle(`${config.emoji} ${title}`)
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
        console.error(`Failed to send info to ${recipientNames[i]}:`, error);
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
    console.error('Error handling info modal:', error);
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}

function getAdjacentDate(dateStr: string, offset: number): string {
  const [day, month, year] = dateStr.split('.').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString('de-DE');
}

function validateTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

function isDateAfterOrEqual(dateStr1: string, dateStr2: string): boolean {
  const date1 = parseDateString(dateStr1);
  const date2 = parseDateString(dateStr2);
  
  if (!date1 || !date2) return false;
  
  return date1 >= date2;
}

function parseDateString(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function normalizeDateFormat(dateStr: string): string {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return dateStr;

  const [, day, month, year] = match;
  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
}
