import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
} from 'discord.js';
import { config } from './config.js';
import { getScheduleForDate } from './sheets.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';
import { buildScheduleEmbed, buildNoDataEmbed, buildErrorEmbed } from './embed.js';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Zeigt die Verfuegbarkeit fuer ein bestimmtes Datum an')
    .addStringOption(option =>
      option
        .setName('datum')
        .setDescription('Datum im Format DD.MM.YYYY (optional, Standard: heute)')
        .setRequired(false)
    )
    .toJSON(),
];

async function handleScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const dateOption = interaction.options.getString('datum');
    const targetDate = dateOption || undefined;

    const displayDate = targetDate || new Date().toLocaleDateString('de-DE');

    const sheetData = await getScheduleForDate(targetDate);

    if (!sheetData) {
      await interaction.editReply({ embeds: [buildNoDataEmbed(displayDate)] });
      return;
    }

    const schedule = parseSchedule(sheetData);
    const result = analyzeSchedule(schedule);
    const embed = buildScheduleEmbed(result);

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error handling schedule command:', error);
    await interaction.editReply({
      embeds: [buildErrorEmbed('Ein Fehler ist aufgetreten. Bitte versuche es spaeter erneut.')],
    });
  }
}

export async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(client.user!.id, config.discord.guildId),
      { body: commands }
    );
    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
}

export async function postScheduleToChannel(date?: string): Promise<void> {
  const channel = await client.channels.fetch(config.discord.channelId);

  if (!channel || !(channel instanceof TextChannel)) {
    console.error('Could not find text channel with ID:', config.discord.channelId);
    return;
  }

  try {
    const displayDate = date || new Date().toLocaleDateString('de-DE');
    const sheetData = await getScheduleForDate(date);

    if (!sheetData) {
      await channel.send({ embeds: [buildNoDataEmbed(displayDate)] });
      return;
    }

    const schedule = parseSchedule(sheetData);
    const result = analyzeSchedule(schedule);
    const embed = buildScheduleEmbed(result);

    // Ping role if configured
    const pingContent = config.discord.pingRoleId
      ? `<@&${config.discord.pingRoleId}>`
      : undefined;

    await channel.send({ content: pingContent, embeds: [embed] });
    console.log(`Schedule posted to channel for date: ${displayDate}`);
  } catch (error) {
    console.error('Error posting schedule to channel:', error);
    await channel.send({
      embeds: [buildErrorEmbed('Fehler beim Abrufen des Schedules.')],
    });
  }
}

client.once('ready', async () => {
  console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'schedule') {
    await handleScheduleCommand(interaction);
  }
});

export async function startBot(): Promise<void> {
  await client.login(config.discord.token);
}
