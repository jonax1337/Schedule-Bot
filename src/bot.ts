import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  PermissionFlagsBits,
  MessageFlags,
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
  handleDateSelect,
  handleWeekModal,
  handleInfoModal,
  sendWeekOverview,
  sendMySchedule,
  handleSetWeekCommand,
} from './interactive.js';
import { getUserMapping, addUserMapping, removeUserMapping, initializeUserMappingSheet } from './userMapping.js';
import { sendRemindersToUsersWithoutEntry } from './reminder.js';

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  new SlashCommandBuilder()
    .setName('schedule')
    .setDescription('Check team availability for a specific date')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('Date in DD.MM.YYYY format (optional, default: today)')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('post-schedule')
    .setDescription('Post schedule to channel (Admin)')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('Date in DD.MM.YYYY format (optional, default: today)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('set')
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
    .setName('set-week')
    .setDescription('Set your availability for the next 7 days at once')
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
  new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Manually send reminders to users without availability entry (Admin)')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('Date in DD.MM.YYYY format (optional, default: today)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('notify')
    .setDescription('Send a notification to players (Admin)')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Notification type')
        .setRequired(true)
        .addChoices(
          { name: '📢 Info', value: 'info' },
          { name: '✅ Success', value: 'success' },
          { name: '⚠️ Warning', value: 'warning' },
          { name: '❌ Error', value: 'error' }
        )
    )
    .addStringOption(option =>
      option
        .setName('target')
        .setDescription('Who to send to')
        .setRequired(true)
        .addChoices(
          { name: 'All Players', value: 'all' },
          { name: 'Main Roster Only', value: 'main' },
          { name: 'Subs Only', value: 'sub' },
          { name: 'Coaches Only', value: 'coach' }
        )
    )
    .addUserOption(option =>
      option
        .setName('specific-user')
        .setDescription('Send to a specific user (overrides target)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a quick poll (Admin)')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('The poll question')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('options')
        .setDescription('Comma-separated options (max 10)')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Poll duration in hours (default: 1)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('training-start-poll')
    .setDescription('Toggle automatic training start time poll on/off (Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('send-training-poll')
    .setDescription('Manually send a training start time poll (Admin)')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('Date in DD.MM.YYYY format (optional, default: today)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
];

async function handleScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

    const navigationButtons = await createDateNavigationButtons(displayDate);

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

async function handlePostScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    const targetDate = dateOption || undefined;
    const displayDate = targetDate || new Date().toLocaleDateString('de-DE');

    // Post schedule to channel (like cron job does)
    await postScheduleToChannel(targetDate);

    await interaction.editReply({
      content: `✅ Schedule posted to channel for **${displayDate}**!`,
    });
  } catch (error) {
    console.error('Error posting schedule:', error);
    await interaction.editReply({
      content: '❌ An error occurred while posting the schedule.',
    });
  }
}

async function handleAvailabilityCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
      content: 'Select a date to set your availability:',
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
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

async function handleSendRemindersCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    const targetDate = dateOption || undefined;

    await interaction.editReply({
      content: '⏳ Sending reminders to users without availability entry...',
    });

    await sendRemindersToUsersWithoutEntry(client, targetDate);

    await interaction.editReply({
      content: `✅ Reminders sent successfully! Check console for details.`,
    });
  } catch (error) {
    console.error('Error handling send-reminders command:', error);
    await interaction.editReply({
      content: 'An error occurred. Please try again later.',
    });
  }
}

async function handleInfoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const type = interaction.options.getString('type', true);
    const target = interaction.options.getString('target', true);
    const specificUser = interaction.options.getUser('specific-user');

    // Store all info in customId for modal submit handler
    const modalId = `info_modal_${type}_${target}_${specificUser?.id || 'none'}`;

    const { createInfoModal } = await import('./interactive.js');
    await interaction.showModal(createInfoModal(modalId));
  } catch (error) {
    console.error('Error handling info command:', error);
    if (interaction.isRepliable() && !interaction.replied) {
      await interaction.reply({
        content: 'An error occurred. Please try again later.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

async function handleQuickPollCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const question = interaction.options.getString('question', true);
    const optionsStr = interaction.options.getString('options', true);
    const duration = interaction.options.getInteger('duration') || 1;

    const options = optionsStr.split(',').map(opt => opt.trim()).slice(0, 10);

    if (options.length < 2) {
      await interaction.editReply({
        content: '❌ You need at least 2 options for a poll.',
      });
      return;
    }

    const { createQuickPoll } = await import('./polls.js');
    await createQuickPoll(question, options, interaction.user.id, duration);

    await interaction.editReply({
      content: `✅ Poll created! It will close in ${duration} hour(s).`,
    });
  } catch (error) {
    console.error('Error creating quick poll:', error);
    await interaction.editReply({
      content: 'An error occurred while creating the poll.',
    });
  }
}

async function handleTrainingStartPollCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const { toggleTrainingStartPoll, isTrainingStartPollEnabled } = await import('./trainingStartPoll.js');
    const newState = await toggleTrainingStartPoll();

    const statusEmoji = newState ? '✅' : '❌';
    const statusText = newState ? 'enabled' : 'disabled';

    await interaction.editReply({
      content: `${statusEmoji} Training start time poll is now **${statusText}**.\n\n${newState ? 'A poll will be automatically created after each schedule post asking when to start training.' : 'No automatic polls will be created.'}`,
    });
  } catch (error) {
    console.error('Error toggling training start poll:', error);
    await interaction.editReply({
      content: 'An error occurred while toggling the training start poll feature.',
    });
  }
}

async function handleSendTrainingPollCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    const targetDate = dateOption || undefined;
    const displayDate = targetDate || new Date().toLocaleDateString('de-DE');

    // Fetch schedule data for the date
    const sheetData = await getScheduleForDate(targetDate);

    if (!sheetData) {
      await interaction.editReply({
        content: `❌ No schedule data found for ${displayDate}.`,
      });
      return;
    }

    const schedule = parseSchedule(sheetData);
    const result = analyzeSchedule(schedule);

    // Check if training can proceed
    if (!result.canProceed || !result.commonTimeRange) {
      await interaction.editReply({
        content: `❌ Cannot create training start poll for ${displayDate}.\n\nReason: ${result.statusMessage}`,
      });
      return;
    }

    // Create the poll
    const { createTrainingStartPoll } = await import('./trainingStartPoll.js');
    await createTrainingStartPoll(result, displayDate);

    const timeRange = result.commonTimeRange;
    await interaction.editReply({
      content: `✅ Training start time poll sent for **${displayDate}**!\n\n⏰ Available time: ${timeRange.start}-${timeRange.end}`,
    });
  } catch (error) {
    console.error('Error sending training start poll:', error);
    await interaction.editReply({
      content: 'An error occurred while sending the training start poll.',
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

    // Create training start poll if enabled
    const { createTrainingStartPoll } = await import('./trainingStartPoll.js');
    await createTrainingStartPoll(result, displayDate);
  } catch (error) {
    console.error('Error posting schedule to channel:', error);
    await channel.send({
      embeds: [buildErrorEmbed('Error fetching schedule.')],
    });
  }
}

client.once('clientReady', async () => {
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
        case 'post-schedule':
          await handlePostScheduleCommand(interaction);
          break;
        case 'set':
          await handleAvailabilityCommand(interaction);
          break;
        case 'schedule-week':
          await sendWeekOverview(interaction);
          break;
        case 'my-schedule':
          await sendMySchedule(interaction);
          break;
        case 'set-week':
          await handleSetWeekCommand(interaction);
          break;
        case 'register':
          await handleRegisterCommand(interaction);
          break;
        case 'unregister':
          await handleUnregisterCommand(interaction);
          break;
        case 'remind':
          await handleSendRemindersCommand(interaction);
          break;
        case 'notify':
          await handleInfoCommand(interaction);
          break;
        case 'poll':
          await handleQuickPollCommand(interaction);
          break;
        case 'training-start-poll':
          await handleTrainingStartPollCommand(interaction);
          break;
        case 'send-training-poll':
          await handleSendTrainingPollCommand(interaction);
          break;
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('schedule_')) {
        await handleDateNavigation(interaction);
      } else if (
        interaction.customId.startsWith('set_unavailable_') ||
        interaction.customId.startsWith('set_custom_')
      ) {
        await handleAvailabilityButton(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'date_select') {
        await handleDateSelect(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('week_modal_')) {
        await handleWeekModal(interaction);
      } else if (interaction.customId.startsWith('info_modal_')) {
        await handleInfoModal(interaction);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'An error occurred. Please try again later.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

export async function startBot(): Promise<void> {
  await client.login(config.discord.token);
}
