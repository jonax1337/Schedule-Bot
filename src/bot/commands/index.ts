import { ChatInputCommandInteraction } from 'discord.js';
import { handleScheduleCommand, handlePostScheduleCommand } from './schedule.commands.js';
import {
  handleAvailabilityCommand,
  handleScheduleWeekCommand,
  handleMyScheduleCommand,
  handleSetTimezoneCommand,
  handleRemoveTimezoneCommand
} from './availability.commands.js';
import { handleRegisterCommand, handleUnregisterCommand } from './user-management.commands.js';
import { handleSendRemindersCommand, handleInfoCommand } from './admin.commands.js';
import { 
  handleQuickPollCommand, 
  handleTrainingStartPollCommand, 
  handleSendTrainingPollCommand 
} from './poll.commands.js';
import { 
  handleAddScrimCommand, 
  handleViewScrimsCommand, 
  handleScrimStatsCommand 
} from './scrim.commands.js';

/**
 * Central command handler - routes commands to appropriate handlers
 */
export async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const { commandName } = interaction;

  switch (commandName) {
    // Schedule commands
    case 'schedule':
      await handleScheduleCommand(interaction);
      break;
    case 'post-schedule':
      await handlePostScheduleCommand(interaction);
      break;

    // Availability commands
    case 'set':
      await handleAvailabilityCommand(interaction);
      break;
    case 'schedule-week':
      await handleScheduleWeekCommand(interaction);
      break;
    case 'my-schedule':
      await handleMyScheduleCommand(interaction);
      break;
    case 'set-timezone':
      await handleSetTimezoneCommand(interaction);
      break;
    case 'remove-timezone':
      await handleRemoveTimezoneCommand(interaction);
      break;

    // User management commands
    case 'register':
      await handleRegisterCommand(interaction);
      break;
    case 'unregister':
      await handleUnregisterCommand(interaction);
      break;

    // Admin commands
    case 'remind':
      await handleSendRemindersCommand(interaction);
      break;
    case 'notify':
      await handleInfoCommand(interaction);
      break;

    // Poll commands
    case 'poll':
      await handleQuickPollCommand(interaction);
      break;
    case 'training-start-poll':
      await handleTrainingStartPollCommand(interaction);
      break;
    case 'send-training-poll':
      await handleSendTrainingPollCommand(interaction);
      break;

    // Scrim commands
    case 'add-scrim':
      await handleAddScrimCommand(interaction);
      break;
    case 'view-scrims':
      await handleViewScrimsCommand(interaction);
      break;
    case 'scrim-stats':
      await handleScrimStatsCommand(interaction);
      break;

    default:
      console.warn(`Unknown command: ${commandName}`);
  }
}
