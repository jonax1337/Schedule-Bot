import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonInteraction,
  StringSelectMenuInteraction,
  MessageFlags,
} from 'discord.js';
import { getUserMapping, updateUserMapping } from '../../repositories/user-mapping.repository.js';
import { getTimezoneAbbreviation, isValidTimezone } from '../../shared/utils/timezoneConverter.js';
import { config } from '../../shared/config/config.js';

// Common timezones for the quick-select dropdown
const COMMON_TIMEZONES = [
  { label: 'US Eastern (New York)', value: 'America/New_York' },
  { label: 'US Central (Chicago)', value: 'America/Chicago' },
  { label: 'US Mountain (Denver)', value: 'America/Denver' },
  { label: 'US Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'UK (London)', value: 'Europe/London' },
  { label: 'Central Europe (Berlin)', value: 'Europe/Berlin' },
  { label: 'France (Paris)', value: 'Europe/Paris' },
  { label: 'Spain (Madrid)', value: 'Europe/Madrid' },
  { label: 'Italy (Rome)', value: 'Europe/Rome' },
  { label: 'Netherlands (Amsterdam)', value: 'Europe/Amsterdam' },
  { label: 'Sweden (Stockholm)', value: 'Europe/Stockholm' },
  { label: 'Poland (Warsaw)', value: 'Europe/Warsaw' },
  { label: 'Finland (Helsinki)', value: 'Europe/Helsinki' },
  { label: 'Romania (Bucharest)', value: 'Europe/Bucharest' },
  { label: 'Turkey (Istanbul)', value: 'Europe/Istanbul' },
  { label: 'Russia (Moscow)', value: 'Europe/Moscow' },
  { label: 'Japan (Tokyo)', value: 'Asia/Tokyo' },
  { label: 'South Korea (Seoul)', value: 'Asia/Seoul' },
  { label: 'China (Shanghai)', value: 'Asia/Shanghai' },
  { label: 'Australia (Sydney)', value: 'Australia/Sydney' },
  { label: 'Brazil (São Paulo)', value: 'America/Sao_Paulo' },
  { label: 'India (Kolkata)', value: 'Asia/Kolkata' },
  { label: 'UTC', value: 'UTC' },
];

/**
 * Handle the "Set Timezone" button click from reminder DMs.
 * Shows a select menu with common timezones.
 */
export async function handleTimezoneButton(interaction: ButtonInteraction): Promise<void> {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_timezone')
    .setPlaceholder('Select your timezone...')
    .addOptions(
      COMMON_TIMEZONES.map(tz => ({
        label: tz.label,
        value: tz.value,
        description: getTimezoneAbbreviation(tz.value),
      }))
    );

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  await interaction.reply({
    content: '🌍 **Select your timezone:**\n\nThis will be used to automatically convert times when you set your availability.\n\n*Need a timezone not listed? Use `/set-timezone` on the server.*',
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * Handle timezone selection from the dropdown.
 */
export async function handleTimezoneSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const selectedTz = interaction.values[0];

  if (!isValidTimezone(selectedTz)) {
    await interaction.reply({
      content: '❌ Invalid timezone selected.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const userMapping = await getUserMapping(interaction.user.id);
  if (!userMapping) {
    await interaction.reply({
      content: '❌ You are not registered.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await updateUserMapping(interaction.user.id, { timezone: selectedTz });

  const abbr = getTimezoneAbbreviation(selectedTz);
  const botTz = config.scheduling.timezone;
  const botAbbr = getTimezoneAbbreviation(botTz);
  const isSame = selectedTz === botTz;

  await interaction.update({
    content: `✅ Timezone set to **${selectedTz}** (${abbr})!${isSame ? '\n\nThis matches the bot timezone — no conversion needed.' : `\n\n⏰ Your inputs will be converted: ${abbr} → ${botAbbr}`}`,
    components: [],
  });
}
