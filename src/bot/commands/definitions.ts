import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

/**
 * All slash command definitions for the bot
 */
export const commands = [
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

  new SlashCommandBuilder()
    .setName('set-timezone')
    .setDescription('Set your personal timezone for automatic time conversion')
    .addStringOption(option =>
      option
        .setName('timezone')
        .setDescription('Your IANA timezone (e.g., America/New_York, Europe/London)')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('remove-timezone')
    .setDescription('Remove your personal timezone (revert to bot default)')
    .toJSON(),
];
