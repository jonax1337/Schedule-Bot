import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  PermissionFlagsBits,
} from 'discord.js';
import { config } from './config.js';
import { getScheduleForDate } from './sheets.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';
import { buildScheduleEmbed, buildNoDataEmbed, buildErrorEmbed } from './embed.js';
import {
  createDateNavigationButtons,
  createDateSelectMenu,
  handleDateNavigation,
  handleAvailabilityButton,
  handleTimeModal,
  handleDateSelect,
  sendWeekOverview,
  sendMySchedule,
} from './interactive.js';
import { getUserMapping, addUserMapping, removeUserMapping, initializeUserMappingSheet } from './userMapping.js';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Show availability for a specific date')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('Date in DD.MM.YYYY format (optional, default: today)')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('availability')
    .setDescription('Set your availability for upcoming days')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('schedule-week')
    .setDescription('Show availability for the next 7 days')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('my-schedule')
    .setDescription('Show your personal availability for the next 14 days')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('register')
    .setDescription('Register a user for availability management (Admin)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The Discord user')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('column')
        .setDescription('The column name in the Google Sheet')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('role')
        .setDescription('The player role')
        .setRequired(true)
        .addChoices(
          { name: 'Main Roster', value: 'main' },
          { name: 'Sub', value: 'sub' },
          { name: 'Coach', value: 'coach' }
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('unregister')
    .setDescription('Remove a user from availability management (Admin)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The Discord user')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
];

async function handleScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const dateOption = interaction.options.getString('date');
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

    const navigationButtons = createDateNavigationButtons(displayDate);

    await interaction.editReply({ 
      embeds: [embed],
      components: [navigationButtons]
    });
  } catch (error) {
    console.error('Error handling schedule command:', error);
    await interaction.editReply({
      embeds: [buildErrorEmbed('An error occurred. Please try again later.')],
    });
  }
}

async function handleAvailabilityCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const userMapping = await getUserMapping(interaction.user.id);
    
    if (!userMapping) {
      await interaction.editReply({
        content: '❌ You are not registered yet. Please contact an admin to register you with `/register`.'
      });
      return;
    }

    const dateSelectMenu = await createDateSelectMenu();

    await interaction.editReply({
      content: `Hello **${userMapping.sheetColumnName}**!

Select a date to set your availability:`,
      components: [dateSelectMenu],
    });
  } catch (error) {
    console.error('Error handling availability command:', error);
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}

async function handleRegisterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const user = interaction.options.getUser('user', true);
    const columnName = interaction.options.getString('column', true);
    const role = interaction.options.getString('role', true) as 'main' | 'sub' | 'coach';

    const existingMapping = await getUserMapping(user.id);
    if (existingMapping) {
      await interaction.editReply({
        content: `❌ ${user.username} is already registered as **${existingMapping.sheetColumnName}**.`,
      });
      return;
    }

    await addUserMapping({
      discordId: user.id,
      discordUsername: user.username,
      sheetColumnName: columnName,
      role,
    });

    await interaction.editReply({
      content: `✅ ${user.username} has been successfully registered as **${columnName}** (${role}).`,
    });
  } catch (error) {
    console.error('Error handling register command:', error);
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}

async function handleUnregisterCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const user = interaction.options.getUser('user', true);

    const success = await removeUserMapping(user.id);

    if (success) {
      await interaction.editReply({
        content: `✅ ${user.username} has been successfully removed from the system.`,
      });
    } else {
      await interaction.editReply({
        content: `❌ ${user.username} was not registered.`,
      });
    }
  } catch (error) {
    console.error('Error handling unregister command:', error);
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
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
      embeds: [buildErrorEmbed('Error fetching schedule.')],
    });
  }
}

client.once('ready', async () => {
  console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
  await initializeUserMappingSheet();
  await registerCommands();
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'schedule':
          await handleScheduleCommand(interaction);
          break;
        case 'availability':
          await handleAvailabilityCommand(interaction);
          break;
        case 'schedule-week':
          await sendWeekOverview(interaction);
          break;
        case 'my-schedule':
          await sendMySchedule(interaction);
          break;
        case 'register':
          await handleRegisterCommand(interaction);
          break;
        case 'unregister':
          await handleUnregisterCommand(interaction);
          break;
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('schedule_')) {
        await handleDateNavigation(interaction);
      } else if (
        interaction.customId.startsWith('set_available_') ||
        interaction.customId.startsWith('set_unavailable_') ||
        interaction.customId.startsWith('set_custom_')
      ) {
        await handleAvailabilityButton(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_date') {
        await handleDateSelect(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('time_modal_')) {
        await handleTimeModal(interaction);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred. Please try again later.',
        ephemeral: true,
      });
    }
  }
});

export async function startBot(): Promise<void> {
  await client.login(config.discord.token);
}
