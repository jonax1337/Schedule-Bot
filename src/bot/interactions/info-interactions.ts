import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
  MessageFlags,
} from 'discord.js';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { getScheduleForDate, getNext14Dates } from '../../repositories/schedule.repository.js';
import { isUserAbsentOnDate, getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';
import { convertTimeToUnixTimestamp, dateToUnixTimestamp, COLORS, NOTIFICATION_TYPE_CONFIG } from '../embeds/embed.js';
import { config } from '../../shared/config/config.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { client } from '../client.js';

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

      const dateTs = dateToUnixTimestamp(date, config.scheduling.timezone);
      embed.addFields({
        name: `${statusEmoji} <t:${dateTs}:d>`,
        value: `Players: ${availableCount}/5\nTime: ${timeInfo}`,
        inline: true,
      });
    } else {
      const dateTs = dateToUnixTimestamp(date, config.scheduling.timezone);
      embed.addFields({
        name: `❓ <t:${dateTs}:d>`,
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
    .setTitle(`Your Availability (${userMapping.displayName})`)
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
          // Convert time range(s) to Discord timestamps
          const windowSegments = entry.value.split(',').map((s: string) => s.trim());
          const formattedWindows = windowSegments.map((seg: string) => {
            const parts = seg.split('-').map((s: string) => s.trim());
            if (parts.length === 2) {
              const startTs = convertTimeToUnixTimestamp(date, parts[0], config.scheduling.timezone);
              const endTs = convertTimeToUnixTimestamp(date, parts[1], config.scheduling.timezone);
              return `<t:${startTs}:t> - <t:${endTs}:t>`;
            }
            return seg;
          });
          status = `✅ ${formattedWindows.join(', ')}`;
        }
      } else {
        status = '⚪ No entry';
      }
      const dateTs = dateToUnixTimestamp(date, config.scheduling.timezone);
      description += `<t:${dateTs}:D>: ${status}\n`;
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
