import { Client, User, EmbedBuilder } from 'discord.js';
import { getUserMappings } from './userMapping.js';
import { getScheduleForDate } from './sheets.js';
import { createAvailabilityButtons } from './interactive.js';

function normalizeDateFormat(dateStr: string): string {
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return dateStr;

  const [, day, month, year] = match;
  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`;
}

export async function sendRemindersToUsersWithoutEntry(client: Client, date?: string): Promise<void> {
  const targetDate = date || new Date().toLocaleDateString('de-DE');
  const normalizedDate = normalizeDateFormat(targetDate);
  
  console.log(`Checking for users without availability entry for ${normalizedDate}...`);

  try {
    const userMappings = await getUserMappings();
    const sheetData = await getScheduleForDate(targetDate);

    if (!sheetData) {
      console.log(`No sheet data found for ${targetDate}, skipping reminders.`);
      return;
    }

    let remindersSent = 0;

    for (const mapping of userMappings) {
      // Skip coach role
      if (mapping.role === 'coach') {
        continue;
      }

      // Get the player's availability from the sheet
      let playerAvailability = '';
      
      switch (mapping.sheetColumnName) {
        case sheetData.names.player1:
          playerAvailability = sheetData.players.player1;
          break;
        case sheetData.names.player2:
          playerAvailability = sheetData.players.player2;
          break;
        case sheetData.names.player3:
          playerAvailability = sheetData.players.player3;
          break;
        case sheetData.names.player4:
          playerAvailability = sheetData.players.player4;
          break;
        case sheetData.names.player5:
          playerAvailability = sheetData.players.player5;
          break;
        case sheetData.names.sub1:
          playerAvailability = sheetData.players.sub1;
          break;
        case sheetData.names.sub2:
          playerAvailability = sheetData.players.sub2;
          break;
      }

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
            components: [createAvailabilityButtons(targetDate)],
          });

          remindersSent++;
          console.log(`Sent reminder to ${mapping.discordUsername} (${mapping.sheetColumnName})`);
        } catch (error) {
          console.error(`Failed to send reminder to ${mapping.discordUsername}:`, error);
        }
      }
    }

    console.log(`Reminders sent: ${remindersSent}/${userMappings.length - userMappings.filter(m => m.role === 'coach').length} players`);
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
