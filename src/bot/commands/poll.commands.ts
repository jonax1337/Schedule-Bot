import { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { getScheduleForDate } from '../../repositories/schedule.repository.js';
import { parseSchedule, analyzeSchedule } from '../../shared/utils/analyzer.js';

/**
 * Handle /poll command - Create a quick poll (Admin)
 */
export async function handleQuickPollCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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

    const { createQuickPoll } = await import('../interactions/polls.js');
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

/**
 * Handle /training-start-poll command - Toggle automatic training start time poll on/off (Admin)
 */
export async function handleTrainingStartPollCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    const { toggleTrainingStartPoll } = await import('../interactions/trainingStartPoll.js');
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

/**
 * Handle /send-training-poll command - Manually send a training start time poll (Admin)
 */
export async function handleSendTrainingPollCommand(interaction: ChatInputCommandInteraction): Promise<void> {
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
    const { createTrainingStartPoll } = await import('../interactions/trainingStartPoll.js');
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
