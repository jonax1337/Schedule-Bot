import { Client, TextChannel } from 'discord.js';
import { config } from '../../shared/config/config.js';
import { loadSettings } from '../../shared/utils/settingsManager.js';
import { logger, getErrorMessage } from '../../shared/utils/logger.js';
import { parseDDMMYYYY } from '../../shared/utils/dateFormatter.js';
import { getWeekDates } from '../utils/week-utils.js';

function formatWeekRange(weekMonday: string): string {
  const dates = getWeekDates(weekMonday);
  const start = parseDDMMYYYY(dates[0]);
  const end = parseDDMMYYYY(dates[6]);
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
  return `${fmt(start)} - ${fmt(end)}${end.getFullYear()}`;
}

/**
 * Send a short role-mention reminder to the channel. The actual day-buttons
 * live permanently on the pinned weekly overview, so this message can be
 * cleaned up freely without losing functionality.
 */
export async function postWeeklyEntryMessage(
  weekMonday: string,
  variant: 'current' | 'next',
  clientInstance?: Client,
): Promise<void> {
  try {
    const botClient = clientInstance || (await import('../client.js')).client;
    const channel = await botClient.channels.fetch(config.discord.channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      logger.error('Weekly entry post failed', 'Channel not found or not a text channel');
      return;
    }

    const settings = loadSettings();
    const pinnedId = settings.discord.pinnedWeekMessageId;
    const weekLabel = formatWeekRange(weekMonday);
    const pingPrefix = config.discord.pingRoleId ? `<@&${config.discord.pingRoleId}> ` : '';
    const target = variant === 'next' ? '**next week**' : '**this week**';
    const overviewRef = pinnedId
      ? `[pinned weekly overview](https://discord.com/channels/${config.discord.guildId}/${config.discord.channelId}/${pinnedId})`
      : 'pinned weekly overview';

    const content = `${pingPrefix}📆 Fill in your availability for ${target} (${weekLabel}) — use the buttons on the ${overviewRef}.`;

    await channel.send({ content });
    logger.success('Weekly ping posted', `${variant} week ${weekMonday}`);
  } catch (error) {
    logger.error('Weekly ping post failed', getErrorMessage(error));
  }
}
