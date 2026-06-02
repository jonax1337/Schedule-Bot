import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getUserMappings } from '../../repositories/user-mapping.repository.js';
import { getTodayFormatted, normalizeDateFormat, parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';
import { COLORS } from '../embeds/embed.js';
import { createAvailabilityButtons } from './interactive.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { getCurrentWeekMonday, getMissingDaysForUser, getWeekDates, type MissingDayInfo } from '../utils/week-utils.js';

export type ReminderVariant = 'daily-gaps' | 'weekly-planning';

interface ReminderOptions {
  weekMonday?: string;
  variant?: ReminderVariant;
}

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
  const limited = missing.slice(0, 7);
  let current = new ActionRowBuilder<ButtonBuilder>();
  limited.forEach((day, idx) => {
    if (idx === 4) {
      rows.push(current);
      current = new ActionRowBuilder<ButtonBuilder>();
    }
    current.addComponents(
      new ButtonBuilder()
        .setCustomId(`set_custom_${day.date}`)
        .setLabel(`${day.weekdayLabel.slice(0, 3)} ${day.date.slice(0, 5)}`)
        .setStyle(ButtonStyle.Primary),
    );
  });
  rows.push(current);
  return rows;
}

function formatWeekRange(weekMonday: string): string {
  const dates = getWeekDates(weekMonday);
  const start = parseDDMMYYYY(dates[0]);
  const end = parseDDMMYYYY(dates[6]);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  return `${fmt(start)} - ${fmt(end)}${end.getFullYear()}`;
}

function buildReminderEmbed(variant: ReminderVariant, weekMonday: string, missing: MissingDayInfo[]): EmbedBuilder {
  const range = formatWeekRange(weekMonday);
  const dayList = missing.map(m => `• **${m.weekdayLabel}** (${m.date})`).join('\n');
  const isCurrentWeek = weekMonday === getCurrentWeekMonday();

  if (variant === 'weekly-planning') {
    const title = isCurrentWeek ? '📆 Plan this week' : '📆 Plan next week';
    const intro = isCurrentWeek
      ? `The week ${range} has started. Please fill in your availability for the days you can play.`
      : `The next week is coming up (${range}). Please set your availability so the team can plan ahead.`;

    return new EmbedBuilder()
      .setColor(COLORS.INFO)
      .setTitle(title)
      .setDescription(`${intro}\n\nYou have **${missing.length} open day(s)**:\n\n${dayList}\n\nClick a day to set a time window. The pinned weekly overview shows the full week.`)
      .setTimestamp();
  }

  return new EmbedBuilder()
    .setColor(COLORS.WARNING)
    .setTitle('Weekly Availability — Open Days')
    .setDescription(`You still have **${missing.length} open day(s)** for ${range}:\n\n${dayList}\n\nUse the buttons below to set them. The pinned weekly overview shows the full week.`)
    .setTimestamp();
}

export async function sendRemindersToUsersWithoutEntry(
  client: Client,
  options?: ReminderOptions,
): Promise<void> {
  const variant: ReminderVariant = options?.variant ?? 'daily-gaps';
  const weekMonday = options?.weekMonday ?? getCurrentWeekMonday();
  logger.info('Checking weekly availability gaps', `${variant} for week starting ${weekMonday}`);

  try {
    const userMappings = await getUserMappings();
    let remindersSent = 0;

    for (const mapping of userMappings) {
      if (mapping.role === 'coach') continue;

      const missing = await getMissingDaysForUser(mapping.discordId, weekMonday);
      if (missing.length === 0) continue;

      try {
        const user = await client.users.fetch(mapping.discordId);
        const embed = buildReminderEmbed(variant, weekMonday, missing);
        const components: ActionRowBuilder<ButtonBuilder>[] = createMissingDayButtonRows(missing);
        if (!mapping.timezone) components.push(createTimezoneButtonRow());

        await user.send({ embeds: [embed], components });
        remindersSent++;
        logger.info(`Sent ${variant} reminder to ${mapping.discordUsername}`, `${missing.length} open days`);
      } catch (error) {
        logger.error(`Failed to send reminder to ${mapping.discordUsername}`, getErrorMessage(error));
      }
    }

    const nonCoachCount = userMappings.filter(m => m.role !== 'coach').length;
    logger.info(`Reminders sent: ${remindersSent}/${nonCoachCount} players (${variant})`);
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
