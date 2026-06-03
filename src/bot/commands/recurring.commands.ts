import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import {
  getRecurringForUser,
  getRecurringForUserAndDay,
  setRecurring,
  removeRecurring,
  removeAllRecurringForUser,
} from '../../repositories/recurring-availability.repository.js';
import {
  applyRecurringToEmptySchedules,
  clearRecurringFromSchedules,
} from '../../repositories/schedule.repository.js';
import { refreshWeeklyOverview } from '../utils/weekly-overview.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { requireRegisteredUser } from '../utils/command-helpers.js';
import { COLORS } from '../embeds/embed.js';

const DAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_EMOJI = ['🟠', '🔵', '🟢', '🟡', '🟣', '🔴', '⚪'];

function parseDays(input: string): number[] | null {
  const parts = input.toLowerCase().split(',').map(s => s.trim());
  const days: number[] = [];

  for (const part of parts) {
    // Handle ranges like "mon-fri"
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = DAY_MAP[startStr];
      const end = DAY_MAP[endStr];
      if (start === undefined || end === undefined) return null;

      // Handle wrapping (e.g., fri-mon)
      let current = start;
      while (true) {
        days.push(current);
        if (current === end) break;
        current = (current + 1) % 7;
      }
    } else {
      const day = DAY_MAP[part];
      if (day === undefined) return null;
      days.push(day);
    }
  }

  // Deduplicate
  return [...new Set(days)];
}

/**
 * Handle /set-recurring command
 */
export async function handleSetRecurringCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await requireRegisteredUser(interaction);
    if (!userMapping) return;

    const daysInput = interaction.options.getString('days', true);
    const timeInput = interaction.options.getString('time', true);

    // Parse days
    const days = parseDays(daysInput);
    if (!days || days.length === 0) {
      await interaction.editReply({
        content: '❌ Invalid days format. Use: `mon,tue,wed` or `mon-fri` or `sat,sun`',
      });
      return;
    }

    // Validate time format (supports comma-separated multiple windows)
    const timeValue = timeInput.toLowerCase().trim();
    if (timeValue !== 'x') {
      const timePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
      const segments = timeValue.split(',').map(s => s.trim());
      const allValid = segments.length > 0 && segments.every(seg => timePattern.test(seg));
      if (!allValid) {
        await interaction.editReply({
          content: '❌ Invalid time format. Use `HH:MM-HH:MM` (e.g., `18:00-22:00`) or multiple windows `14:00-16:00,17:00-20:00` or `x` for unavailable.',
        });
        return;
      }
    }

    let count = 0;
    for (const day of days) {
      if (day < 0 || day > 6) continue;
      await setRecurring(interaction.user.id, day, timeValue);
      count++;
    }
    logger.info('Bulk recurring set', `${interaction.user.id}: ${count} days → ${timeValue}`);

    applyRecurringToEmptySchedules(interaction.user.id)
      .then(() => refreshWeeklyOverview())
      .catch(err => logger.error('Failed to apply recurring to schedules', err));

    const dayNames = days.sort((a, b) => a - b).map(d => WEEKDAY_NAMES[d]).join(', ');
    const displayValue = timeValue === 'x' ? 'Unavailable' : timeValue;

    await interaction.editReply({
      content: `✅ Recurring schedule set!\n\n📅 **${dayNames}** → **${displayValue}**\n\nThis will be auto-applied when new schedule days are created. You can always override for specific dates using \`/set\`.`,
    });
  } catch (error) {
    logger.error('Error in set-recurring command', getErrorMessage(error));
    await interaction.editReply({ content: 'An error occurred. Please try again later.' });
  }
}

/**
 * Handle /my-recurring command
 */
export async function handleMyRecurringCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await requireRegisteredUser(interaction);
    if (!userMapping) return;

    const entries = await getRecurringForUser(interaction.user.id);

    if (entries.length === 0) {
      await interaction.editReply({
        content: '📅 You have no recurring schedule set.\n\nUse `/set-recurring` to create one (e.g., `/set-recurring days:mon-fri time:18:00-22:00`).',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔄 Your Recurring Schedule')
      .setColor(COLORS.DISCORD_BLURPLE)
      .setDescription('This schedule is auto-applied to new days. Override specific dates with `/set`.');

    // Build a full week view
    const lines: string[] = [];
    for (let day = 0; day < 7; day++) {
      const entry = entries.find(e => e.dayOfWeek === day);
      const emoji = WEEKDAY_EMOJI[day];
      const name = WEEKDAY_NAMES[day];

      if (entry) {
        const status = entry.active ? '' : ' *(paused)*';
        const value = entry.availability === 'x' ? '❌ Unavailable' : `🕐 ${entry.availability}`;
        lines.push(`${emoji} **${name}**: ${value}${status}`);
      } else {
        lines.push(`${emoji} **${name}**: —`);
      }
    }

    embed.addFields({ name: 'Weekly Schedule', value: lines.join('\n') });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error in my-recurring command', getErrorMessage(error));
    await interaction.editReply({ content: 'An error occurred. Please try again later.' });
  }
}

/**
 * Handle /clear-recurring command
 */
export async function handleClearRecurringCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await requireRegisteredUser(interaction);
    if (!userMapping) return;

    const dayInput = interaction.options.getString('day', true).toLowerCase().trim();

    if (dayInput === 'all') {
      const count = await removeAllRecurringForUser(interaction.user.id);
      await interaction.editReply({
        content: `✅ Cleared all recurring entries (${count} removed).`,
      });
      return;
    }

    const dayNum = DAY_MAP[dayInput];
    if (dayNum === undefined) {
      await interaction.editReply({
        content: '❌ Invalid day. Use: `mon`, `tue`, `wed`, `thu`, `fri`, `sat`, `sun`, or `all`.',
      });
      return;
    }

    const oldEntry = await getRecurringForUserAndDay(interaction.user.id, dayNum);
    const oldAvailability = oldEntry?.availability || '';

    await removeRecurring(interaction.user.id, dayNum);

    if (oldAvailability) {
      clearRecurringFromSchedules(interaction.user.id, dayNum, oldAvailability)
        .then(() => refreshWeeklyOverview())
        .catch(err => logger.error('Failed to clear recurring from schedules', err));
    }

    await interaction.editReply({
      content: `✅ Recurring entry for **${WEEKDAY_NAMES[dayNum]}** removed.`,
    });
  } catch (error) {
    logger.error('Error in clear-recurring command', getErrorMessage(error));
    await interaction.editReply({ content: 'An error occurred. Please try again later.' });
  }
}
