import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { getTodayFormatted, normalizeDateFormat } from '../../shared/utils/dateFormatter.js';
import { COLORS } from '../embeds/embed.js';
import { createAvailabilityButtons } from './interactive.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { getCurrentWeekMonday, getMissingDaysForUser, type MissingDayInfo } from '../utils/week-utils.js';

function createTimezoneButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('set_timezone_prompt')
      .setLabel('🌍 Set Timezone')
      .setStyle(ButtonStyle.Secondary),
  );
}

function createMissingDayButtonRows(missing: MissingDayInfo[]): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const limited = missing.slice(0, 5);
  let current = new ActionRowBuilder<ButtonBuilder>();
  for (const day of limited) {
    current.addComponents(
      new ButtonBuilder()
        .setCustomId(`set_custom_${day.date}`)
        .setLabel(`${day.weekdayLabel.slice(0, 3)} ${day.date.slice(0, 5)}`)
        .setStyle(ButtonStyle.Primary),
    );
  }
  rows.push(current);
  return rows;
}

export async function sendRemindersToUsersWithoutEntry(client: Client, _legacyDate?: string): Promise<void> {
  // _legacyDate is accepted for back-compat with callers that used to pass a specific date.
  // The reminder now always checks the current week's gaps.
  const weekMonday = getCurrentWeekMonday();
  logger.info('Checking weekly availability gaps', `week starting ${weekMonday}`);

  try {
    const userMappings = await getUserMappings();
    let remindersSent = 0;

    for (const mapping of userMappings) {
      if (mapping.role === 'coach') continue;

      const missing = await getMissingDaysForUser(mapping.discordId, weekMonday);
      if (missing.length === 0) continue;

      try {
        const user = await client.users.fetch(mapping.discordId);
        const dayList = missing.map(m => `• **${m.weekdayLabel}** (${m.date})`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(COLORS.WARNING)
          .setTitle('Weekly Availability — Open Days')
          .setDescription(`You still have **${missing.length} open day(s)** this week:\n\n${dayList}\n\nUse the buttons below to set the first few. The pinned weekly overview shows the full week.`)
          .setTimestamp();

        const components: ActionRowBuilder<ButtonBuilder>[] = createMissingDayButtonRows(missing);
        if (!mapping.timezone) components.push(createTimezoneButtonRow());

        await user.send({ embeds: [embed], components });
        remindersSent++;
        logger.info(`Sent weekly reminder to ${mapping.discordUsername}`, `${missing.length} open days`);
      } catch (error) {
        logger.error(`Failed to send reminder to ${mapping.discordUsername}`, getErrorMessage(error));
      }
    }

    const nonCoachCount = userMappings.filter(m => m.role !== 'coach').length;
    logger.info(`Weekly reminders sent: ${remindersSent}/${nonCoachCount} players`);
  } catch (error) {
    logger.error('Error sending reminders', getErrorMessage(error));
  }
}

export async function sendReminderToUser(client: Client, userId: string, date: string): Promise<boolean> {
  try {
    const user = await client.users.fetch(userId);
    const normalizedDate = normalizeDateFormat(date || getTodayFormatted());

    const embed = new EmbedBuilder()
      .setColor(COLORS.WARNING)
      .setTitle('Availability Reminder')
      .setDescription(`You haven't set your availability for **${normalizedDate}** yet.\n\nPlease set your availability using the buttons below.`)
      .setFooter({ text: 'Schedule Bot' })
      .setTimestamp();

    await user.send({
      embeds: [embed],
      components: [createAvailabilityButtons(normalizedDate)],
    });

    return true;
  } catch (error) {
    logger.error(`Failed to send reminder to user ${userId}`, getErrorMessage(error));
    return false;
  }
}
