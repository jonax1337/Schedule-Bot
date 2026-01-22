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
  EmbedBuilder,
} from 'discord.js';
import { config } from './config.js';
import { getScheduleForDate } from './database/schedules.js';
import { parseSchedule, analyzeSchedule } from './analyzer.js';
import { buildScheduleEmbed } from './embed.js';
import {
  createDateNavigationButtons,
  createDateSelectMenu,
  handleDateNavigation,
  handleAvailabilityButton,
  handleDateSelect,
  handleWeekModal,
  handleInfoModal,
  handleTimeModal,
  sendWeekOverview,
  sendMySchedule,
  handleSetWeekCommand,
} from './interactive.js';
import { getUserMapping, addUserMapping, removeUserMapping } from './database/userMappings.js';
import { sendRemindersToUsersWithoutEntry } from './reminder.js';

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
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
  new SlashCommandBuilder()
    .setName('add-scrim')
    .setDescription('Add a scrim result (Admin)')
    .addStringOption(option =>
      option
        .setName('date')
        .setDescription('Date in DD.MM.YYYY format')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('opponent')
        .setDescription('Opponent team name')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('result')
        .setDescription('Match result')
        .setRequired(true)
        .addChoices(
          { name: '✅ Win', value: 'win' },
          { name: '❌ Loss', value: 'loss' },
          { name: '➖ Draw', value: 'draw' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('score-us')
        .setDescription('Our score')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('score-them')
        .setDescription('Their score')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('maps')
        .setDescription('Maps played (comma-separated)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('notes')
        .setDescription('Additional notes')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName('view-scrims')
    .setDescription('View recent scrim results')
    .addIntegerOption(option =>
      option
        .setName('limit')
        .setDescription('Number of scrims to show (default: 10)')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('scrim-stats')
    .setDescription('View scrim statistics')
    .toJSON(),
];

async function handleScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    
    // Format date as DD.MM.YYYY
    const formatDate = (d: Date): string => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };
    
    const targetDate = dateOption || formatDate(new Date());
    const displayDate = targetDate;

    const sheetData = await getScheduleForDate(targetDate);

    if (!sheetData) {
      const embed = new EmbedBuilder()
        .setTitle(displayDate)
        .setDescription('No schedule data available for this date.')
        .setColor(0xe74c3c);
      await interaction.editReply({ embeds: [embed] });
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
    const embed = new EmbedBuilder()
      .setTitle('Error')
      .setDescription('An error occurred. Please try again later.')
      .setColor(0xe74c3c);
    await interaction.editReply({
      embeds: [embed],
    });
  }
}

async function handlePostScheduleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const dateOption = interaction.options.getString('date');
    
    // Format date as DD.MM.YYYY
    const formatDate = (d: Date): string => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };
    
    const targetDate = dateOption || formatDate(new Date());
    const displayDate = targetDate;

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
        content: `❌ ${user.username} is already registered as **${existingMapping.displayName}**.`,
      });
      return;
    }

    await addUserMapping({
      discordId: user.id,
      discordUsername: user.username,
      displayName: columnName,
      role,
      sortOrder: 0,
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

async function handleAddScrimCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const { addScrim } = await import('./database/scrims.js');
    
    const date = interaction.options.getString('date', true);
    const opponent = interaction.options.getString('opponent', true);
    const result = interaction.options.getString('result', true) as 'win' | 'loss' | 'draw';
    const scoreUs = interaction.options.getInteger('score-us', true);
    const scoreThem = interaction.options.getInteger('score-them', true);
    const map = interaction.options.getString('map') || '';
    const matchType = interaction.options.getString('match-type') || 'Scrim';
    const notes = interaction.options.getString('notes') || '';
    
    const scrim = await addScrim({
      date,
      opponent,
      result,
      scoreUs,
      scoreThem,
      map: map || '',
      matchType: matchType || 'Scrim',
      ourAgents: [], // Discord bot doesn't support agent selection yet
      theirAgents: [], // Discord bot doesn't support agent selection yet
      vodUrl: '', // Discord bot doesn't support VOD URL yet
      notes,
    });
    
    const resultEmoji = result === 'win' ? '✅' : result === 'loss' ? '❌' : '➖';
    
    await interaction.editReply({
      content: `${resultEmoji} Scrim added successfully!\n\n` +
               `**${opponent}** - ${date}\n` +
               `Result: ${result.toUpperCase()} (${scoreUs}-${scoreThem})\n` +
               `${map ? `Map: ${map}\n` : ''}` +
               `${matchType ? `Type: ${matchType}\n` : ''}` +
               `${notes ? `Notes: ${notes}` : ''}`,
    });
  } catch (error) {
    console.error('Error adding scrim:', error);
    await interaction.editReply({
      content: '❌ An error occurred while adding the scrim.',
    });
  }
}

async function handleViewScrimsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const { getAllScrims } = await import('./database/scrims.js');
    const limit = interaction.options.getInteger('limit') || 10;
    
    const scrims = await getAllScrims();
    
    if (scrims.length === 0) {
      await interaction.editReply({
        content: '📋 No scrims found. Use `/add-scrim` to add one!',
      });
      return;
    }
    
    // Sort by date (newest first) and limit
    const sortedScrims = scrims
      .sort((a, b) => {
        // Parse DD.MM.YYYY dates for comparison
        const parseDate = (dateStr: string) => {
          const [day, month, year] = dateStr.split('.').map(Number);
          return new Date(year, month - 1, day).getTime();
        };
        return parseDate(b.date) - parseDate(a.date);
      })
      .slice(0, limit);
    
    const embed = new EmbedBuilder()
      .setTitle('📋 Recent Scrims')
      .setColor(0x3498db)
      .setDescription(
        sortedScrims.map((scrim, index) => {
          const resultEmoji = scrim.result === 'win' ? '✅' : scrim.result === 'loss' ? '❌' : '➖';
          return `**${index + 1}. ${scrim.opponent}** - ${scrim.date}\n` +
                 `${resultEmoji} ${scrim.result.toUpperCase()} (${scrim.scoreUs}-${scrim.scoreThem})` +
                 `${scrim.map ? ` | ${scrim.map}` : ''}`;
        }).join('\n\n')
      )
      .setFooter({ text: `Showing ${sortedScrims.length} of ${scrims.length} scrims` });
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error viewing scrims:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching scrims.',
    });
  }
}

async function handleScrimStatsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const { getScrimStats } = await import('./database/scrims.js');
    
    const stats = await getScrimStats();
    
    if (stats.totalScrims === 0) {
      await interaction.editReply({
        content: '📊 No scrim data available yet. Use `/add-scrim` to add scrims!',
      });
      return;
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Scrim Statistics')
      .setColor(0x2ecc71)
      .addFields(
        {
          name: '📈 Overall Record',
          value: `Total Scrims: **${stats.totalScrims}**\n` +
                 `Wins: **${stats.wins}** ✅\n` +
                 `Losses: **${stats.losses}** ❌\n` +
                 `Draws: **${stats.draws}** ➖\n` +
                 `Win Rate: **${stats.winRate.toFixed(1)}%**`,
          inline: false,
        }
      );
    
    // Add map statistics if available
    if (Object.keys(stats.mapStats).length > 0) {
      const mapStatsText = Object.entries(stats.mapStats)
        .sort((a, b) => b[1].played - a[1].played)
        .slice(0, 5)
        .map(([map, mapStat]) => {
          const winRate = mapStat.played > 0 
            ? ((mapStat.wins / mapStat.played) * 100).toFixed(0)
            : '0';
          return `**${map}**: ${mapStat.wins}-${mapStat.losses} (${winRate}% WR, ${mapStat.played} games)`;
        })
        .join('\n');
      
      embed.addFields({
        name: '🗺️ Map Statistics (Top 5)',
        value: mapStatsText || 'No map data',
        inline: false,
      });
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching scrim stats:', error);
    await interaction.editReply({
      content: '❌ An error occurred while fetching statistics.',
    });
  }
}

export async function postScheduleToChannel(date?: string): Promise<void> {
  const channel = await client.channels.fetch(config.discord.channelId);

  if (!channel || !(channel instanceof TextChannel)) {
    console.error('Channel not found or is not a text channel');
    return;
  }

  try {
    // Format date as DD.MM.YYYY
    const formatDate = (d: Date): string => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };
    
    // If no date provided, use today
    if (!date) {
      date = formatDate(new Date());
    }

    // Clean channel if enabled in settings
    const { loadSettings } = await import('./settingsManager.js');
    const settings = loadSettings();
    
    if (settings.scheduling.cleanChannelBeforePost) {
      console.log('Cleaning channel before posting schedule...');
      try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const messagestoDelete = messages.filter(msg => !msg.pinned);
        
        if (messagestoDelete.size > 0) {
          const recentMessages = messagestoDelete.filter(msg => 
            Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
          );
          
          if (recentMessages.size > 1) {
            await channel.bulkDelete(recentMessages);
            console.log(`Deleted ${recentMessages.size} messages from channel`);
          } else if (recentMessages.size === 1) {
            await recentMessages.first()?.delete();
            console.log('Deleted 1 message from channel');
          }
          
          const oldMessages = messagestoDelete.filter(msg => 
            Date.now() - msg.createdTimestamp >= 14 * 24 * 60 * 60 * 1000
          );
          
          for (const msg of oldMessages.values()) {
            try {
              await msg.delete();
            } catch (err) {
              console.warn('Could not delete old message:', err);
            }
          }
        }
      } catch (error) {
        console.error('Error cleaning channel:', error);
      }
    }

    const displayDate = date;
    const sheetData = await getScheduleForDate(date);

    if (!sheetData) {
      const embed = new EmbedBuilder()
        .setTitle(displayDate)
        .setDescription('No schedule data available for this date.')
        .setColor(0xe74c3c);
      await channel.send({ embeds: [embed] });
      return;
    }

    const schedule = parseSchedule(sheetData);
    const result = analyzeSchedule(schedule);
    const embed = buildScheduleEmbed(result);

    // Ping role if configured
    const pingContent = config.discord.pingRoleId
      ? `<@&${config.discord.pingRoleId}>`
      : undefined;

    console.log('Posting schedule with pingRoleId:', config.discord.pingRoleId);
    console.log('Ping content:', pingContent);

    await channel.send({ content: pingContent, embeds: [embed] });
    console.log(`Schedule posted to channel for date: ${displayDate}`);

    // Create training start poll if enabled
    const { createTrainingStartPoll } = await import('./trainingStartPoll.js');
    await createTrainingStartPoll(result, displayDate);
  } catch (error) {
    console.error('Error posting schedule to channel:', error);
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('Error')
          .setDescription('Failed to fetch schedule data')
          .setColor(0xe74c3c)
      ],
    });
  }
}

client.once('clientReady', async () => {
  console.log(`Bot is ready! Logged in as ${client.user?.tag}`);
      // User mapping table auto-created by Prisma
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
        case 'add-scrim':
          await handleAddScrimCommand(interaction);
          break;
        case 'view-scrims':
          await handleViewScrimsCommand(interaction);
          break;
        case 'scrim-stats':
          await handleScrimStatsCommand(interaction);
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
      if (interaction.customId === 'select_date') {
        await handleDateSelect(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('week_modal_')) {
        await handleWeekModal(interaction);
      } else if (interaction.customId.startsWith('info_modal_')) {
        await handleInfoModal(interaction);
      } else if (interaction.customId.startsWith('time_modal_')) {
        await handleTimeModal(interaction);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    // Log more details for debugging
    if (interaction.isModalSubmit()) {
      console.error('Modal customId:', interaction.customId);
    } else if (interaction.isButton()) {
      console.error('Button customId:', interaction.customId);
    } else if (interaction.isStringSelectMenu()) {
      console.error('Select menu customId:', interaction.customId);
    }
    
    try {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred. Please try again later.',
          flags: MessageFlags.Ephemeral,
        });
      } else if (interaction.isRepliable() && interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          content: 'An error occurred. Please try again later.',
        });
      }
    } catch (replyError) {
      console.error('Failed to send error message to user:', replyError);
    }
  }
});

export async function startBot(): Promise<void> {
  await client.login(config.discord.token);
}
