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
} from 'discord.js';
import { getUserMapping } from './userMapping.js';
import { updatePlayerAvailability, getPlayerAvailabilityForRange, getAvailableDates } from './sheetUpdater.js';
import { getScheduleForDate } from './sheets.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';
import { buildScheduleEmbed } from './embed.js';

export function createDateNavigationButtons(currentDate: string): ActionRowBuilder<ButtonBuilder> {
  const prevDate = getAdjacentDate(currentDate, -1);
  const nextDate = getAdjacentDate(currentDate, 1);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`schedule_prev_${prevDate}`)
      .setLabel('← Previous Day')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('schedule_today')
      .setLabel('Today')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`schedule_next_${nextDate}`)
      .setLabel('Next Day →')
      .setStyle(ButtonStyle.Secondary)
  );
}

export function createAvailabilityButtons(date: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`set_available_${date}`)
      .setLabel('✅ Available')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`set_unavailable_${date}`)
      .setLabel('❌ Not Available')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`set_custom_${date}`)
      .setLabel('⏰ Set Time')
      .setStyle(ButtonStyle.Primary)
  );
}

export async function createDateSelectMenu(): Promise<ActionRowBuilder<StringSelectMenuBuilder>> {
  const dates = await getAvailableDates();
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
  return new ModalBuilder()
    .setCustomId(`time_modal_${date}`)
    .setTitle(`Availability for ${date}`)
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

  const navigationButtons = createDateNavigationButtons(targetDate);

  await interaction.editReply({
    embeds: [embed],
    components: [navigationButtons],
  });
}

export async function handleAvailabilityButton(
  interaction: ButtonInteraction
): Promise<void> {
  const userMapping = await getUserMapping(interaction.user.id);
  
  if (!userMapping) {
    await interaction.reply({
      content: '❌ You are not registered yet. Please contact an admin to register you.',
      ephemeral: true,
    });
    return;
  }

  const customId = interaction.customId;
  const date = customId.split('_').pop()!;

  if (customId.startsWith('set_available_')) {
    await interaction.showModal(createTimeInputModal(date));
  } else if (customId.startsWith('set_unavailable_')) {
    await interaction.deferReply({ ephemeral: true });
    
    const success = await updatePlayerAvailability(date, userMapping.sheetColumnName, 'x');
    
    if (success) {
      await interaction.editReply({
        content: `✅ You have been marked as not available for ${date}.`,
      });
    } else {
      await interaction.editReply({
        content: `❌ Error updating. Please try again later.`,
      });
    }
  } else if (customId.startsWith('set_custom_')) {
    await interaction.showModal(createTimeInputModal(date));
  }
}

export async function handleTimeModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

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
  const success = await updatePlayerAvailability(date, userMapping.sheetColumnName, timeRange);

  if (success) {
    await interaction.editReply({
      content: `✅ Your availability for ${date} has been set to ${timeRange}.`,
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
    ephemeral: true,
  });
}

export async function sendWeekOverview(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

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
  await interaction.deferReply({ ephemeral: true });

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

  const availability = await getPlayerAvailabilityForRange(
    userMapping.sheetColumnName,
    today.toLocaleDateString('de-DE'),
    endDate.toLocaleDateString('de-DE')
  );

  const embed = new EmbedBuilder()
    .setTitle(`📋 Your Availability (${userMapping.sheetColumnName})`)
    .setColor(0x2ecc71)
    .setTimestamp();

  if (availability.length === 0) {
    embed.setDescription('No entries for the next 14 days.');
  } else {
    let description = '';
    for (const entry of availability) {
      const status = entry.availability 
        ? (entry.availability === 'x' ? '❌ Not available' : `✅ ${entry.availability}`)
        : '⚪ No entry';
      description += `**${entry.date}**: ${status}\n`;
    }
    embed.setDescription(description);
  }

  await interaction.editReply({ embeds: [embed] });
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
