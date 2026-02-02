import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { getAbsentUserIdsForDate } from '../../repositories/absence.repository.js';
import { getTodayFormatted, normalizeDateFormat } from '../../shared/utils/dateFormatter.js';
import { createAvailabilityButtons } from './interactive.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Create a "Set Timezone" button row for users without a timezone set.
 */
function createTimezoneButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('set_timezone_prompt')
      .setLabel('🌍 Set Timezone')
      .setStyle(ButtonStyle.Secondary)
  );
}

export async function sendRemindersToUsersWithoutEntry(client: Client, date?: string): Promise<void> {
  const targetDate = date || getTodayFormatted();
  const normalizedDate = normalizeDateFormat(targetDate);
  
  logger.info(`Checking for users without availability entry for ${normalizedDate}`);

  try {
    const userMappings = await getUserMappings();
    const scheduleData = await getScheduleForDate(normalizedDate);

    if (!scheduleData) {
      logger.info(`No schedule data found for ${normalizedDate}, skipping reminders`);
      return;
    }

    // Fetch absent user IDs for this date
    const absentUserIds = await getAbsentUserIdsForDate(normalizedDate);

    let remindersSent = 0;

    for (const mapping of userMappings) {
      // Skip coach role
      if (mapping.role === 'coach') {
        continue;
      }

      // Skip absent users - they don't need reminders
      if (absentUserIds.includes(mapping.discordId)) {
        continue;
      }

      // Find player's availability in schedule
      const playerEntry = scheduleData.players.find(p => p.userId === mapping.discordId);
      const playerAvailability = playerEntry?.availability || '';

      // Check if player has no entry (empty or whitespace only)
      if (!playerAvailability || playerAvailability.trim() === '') {
        try {
          const user = await client.users.fetch(mapping.discordId);
          
          const embed = new EmbedBuilder()
            .setColor(0xf39c12)
            .setTitle('Availability Reminder')
            .setDescription(`You haven't set your availability for **${normalizedDate}** yet.\n\nPlease set your availability using the buttons below.`)
            .setTimestamp();

          const components: any[] = [createAvailabilityButtons(normalizedDate)];
          if (!mapping.timezone) {
            components.push(createTimezoneButtonRow());
          }

          await user.send({
            embeds: [embed],
            components,
          });

          remindersSent++;
          logger.info(`Sent reminder to ${mapping.discordUsername} (${mapping.displayName})`);
        } catch (error) {
          logger.error(`Failed to send reminder to ${mapping.discordUsername}`, error instanceof Error ? error.message : String(error));
        }
      }
    }

    const nonCoachCount = userMappings.filter(m => m.role !== 'coach').length;
    logger.info(`Reminders sent: ${remindersSent}/${nonCoachCount} players`);
  } catch (error) {
    logger.error('Error sending reminders', error instanceof Error ? error.message : String(error));
  }
}

export async function sendReminderToUser(client: Client, userId: string, date: string): Promise<boolean> {
  try {
    const user = await client.users.fetch(userId);
    const normalizedDate = normalizeDateFormat(date);
    
    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('Availability Reminder')
      .setDescription(`You haven't set your availability for **${normalizedDate}** yet.\n\nPlease set your availability using the buttons below.`)
      .setFooter({ text: 'Schedule Bot' })
      .setTimestamp();

    await user.send({
      embeds: [embed],
      components: [createAvailabilityButtons(date)],
    });

    return true;
  } catch (error) {
    logger.error(`Failed to send reminder to user ${userId}`, error instanceof Error ? error.message : String(error));
    return false;
  }
}
