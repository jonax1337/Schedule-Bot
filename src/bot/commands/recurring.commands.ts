import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { getUserMapping } from '../../repositories/user-mapping.repository.js';
import { recurringAvailabilityService } from '../../services/recurring-availability.service.js';
import { logger } from '../../shared/utils/logger.js';

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
    const userMapping = await getUserMapping(interaction.user.id);
    if (!userMapping) {
      await interaction.editReply({
        content: '❌ You are not registered yet. Please contact an admin to register you with `/register`.',
      });
      return;
    }

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

    // Validate time format
    const timeValue = timeInput.toLowerCase().trim();
    if (timeValue !== 'x') {
      const timePattern = /^\d{2}:\d{2}-\d{2}:\d{2}$/;
      if (!timePattern.test(timeValue)) {
        await interaction.editReply({
          content: '❌ Invalid time format. Use `HH:MM-HH:MM` (e.g., `18:00-22:00`) or `x` for unavailable.',
        });
        return;
      }
    }

    const result = await recurringAvailabilityService.setBulk(
      interaction.user.id,
      days,
      timeValue,
    );

    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    const dayNames = days.sort((a, b) => a - b).map(d => WEEKDAY_NAMES[d]).join(', ');
    const displayValue = timeValue === 'x' ? 'Unavailable' : timeValue;

    await interaction.editReply({
      content: `✅ Recurring schedule set!\n\n📅 **${dayNames}** → **${displayValue}**\n\nThis will be auto-applied when new schedule days are created. You can always override for specific dates using \`/set\`.`,
    });
  } catch (error) {
    logger.error('Error in set-recurring command', error instanceof Error ? error.message : String(error));
    await interaction.editReply({ content: 'An error occurred. Please try again later.' });
  }
}

/**
 * Handle /my-recurring command
 */
export async function handleMyRecurringCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await getUserMapping(interaction.user.id);
    if (!userMapping) {
      await interaction.editReply({
        content: '❌ You are not registered yet.',
      });
      return;
    }

    const entries = await recurringAvailabilityService.getForUser(interaction.user.id);

    if (entries.length === 0) {
      await interaction.editReply({
        content: '📅 You have no recurring schedule set.\n\nUse `/set-recurring` to create one (e.g., `/set-recurring days:mon-fri time:18:00-22:00`).',
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle('🔄 Your Recurring Schedule')
      .setColor(0x5865F2)
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
    logger.error('Error in my-recurring command', error instanceof Error ? error.message : String(error));
    await interaction.editReply({ content: 'An error occurred. Please try again later.' });
  }
}

/**
 * Handle /clear-recurring command
 */
export async function handleClearRecurringCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const userMapping = await getUserMapping(interaction.user.id);
    if (!userMapping) {
      await interaction.editReply({
        content: '❌ You are not registered yet.',
      });
      return;
    }

    const dayInput = interaction.options.getString('day', true).toLowerCase().trim();

    if (dayInput === 'all') {
      const result = await recurringAvailabilityService.removeAll(interaction.user.id);
      if (!result.success) {
        await interaction.editReply({ content: `❌ ${result.error}` });
        return;
      }
      await interaction.editReply({
        content: `✅ Cleared all recurring entries (${result.count} removed).`,
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

    const result = await recurringAvailabilityService.remove(interaction.user.id, dayNum);
    if (!result.success) {
      await interaction.editReply({ content: `❌ ${result.error}` });
      return;
    }

    await interaction.editReply({
      content: `✅ Recurring entry for **${WEEKDAY_NAMES[dayNum]}** removed.`,
    });
  } catch (error) {
    logger.error('Error in clear-recurring command', error instanceof Error ? error.message : String(error));
    await interaction.editReply({ content: 'An error occurred. Please try again later.' });
  }
}
