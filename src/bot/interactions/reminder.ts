import { Client, EmbedBuilder } from 'discord.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { getTodayFormatted, normalizeDateFormat } from '../../shared/utils/dateFormatter.js';
import { createAvailabilityButtons } from './interactive.js';

export async function sendRemindersToUsersWithoutEntry(client: Client, date?: string): Promise<void> {
  const targetDate = date || getTodayFormatted();
  const normalizedDate = normalizeDateFormat(targetDate);
  
  console.log(`Checking for users without availability entry for ${normalizedDate}...`);

  try {
    const userMappings = await getUserMappings();
    const scheduleData = await getScheduleForDate(normalizedDate);

    if (!scheduleData) {
      console.log(`No schedule data found for ${normalizedDate}, skipping reminders.`);
      return;
    }

    let remindersSent = 0;

    for (const mapping of userMappings) {
      // Skip coach role
      if (mapping.role === 'coach') {
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
            .setTitle('⏰ Availability Reminder')
            .setDescription(`You haven't set your availability for **${normalizedDate}** yet.\n\nPlease set your availability using the buttons below.`)
            .setTimestamp();

          await user.send({
            embeds: [embed],
            components: [createAvailabilityButtons(normalizedDate)],
          });

          remindersSent++;
          console.log(`Sent reminder to ${mapping.discordUsername} (${mapping.displayName})`);
        } catch (error) {
          console.error(`Failed to send reminder to ${mapping.discordUsername}:`, error);
        }
      }
    }

    const nonCoachCount = userMappings.filter(m => m.role !== 'coach').length;
    console.log(`Reminders sent: ${remindersSent}/${nonCoachCount} players`);
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
}

export async function sendReminderToUser(client: Client, userId: string, date: string): Promise<boolean> {
  try {
    const user = await client.users.fetch(userId);
    const normalizedDate = normalizeDateFormat(date);
    
    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('⏰ Availability Reminder')
      .setDescription(`You haven't set your availability for **${normalizedDate}** yet.\n\nPlease set your availability using the buttons below.`)
      .setFooter({ text: 'Schedule Bot' })
      .setTimestamp();

    await user.send({
      embeds: [embed],
      components: [createAvailabilityButtons(date)],
    });

    return true;
  } catch (error) {
    console.error(`Failed to send reminder to user ${userId}:`, error);
    return false;
  }
}
