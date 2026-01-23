import { EmbedBuilder, Message, MessageReaction, User } from 'discord.js';
import { client } from '../client.js';
import { config } from '../../shared/config/config.js';

interface PollOption {
  emoji: string;
  label: string;
  votes: string[]; // User IDs
}

interface Poll {
  messageId: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  expiresAt: Date;
  type: 'training' | 'maps' | 'quick';
  date?: string; // For training/maps polls
}

const activePolls = new Map<string, Poll>();

export async function createQuickPoll(
  question: string,
  options: string[],
  createdBy: string,
  duration: number = 1
): Promise<Message> {
  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  
  const pollOptions: PollOption[] = options.slice(0, 10).map((opt, i) => ({
    emoji: emojis[i],
    label: opt,
    votes: [],
  }));

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle('📊 Quick Poll')
    .setDescription(`**${question}**\n\nReact to vote!`)
    .setFooter({ text: `Poll closes in ${duration} hour(s)` })
    .setTimestamp();

  pollOptions.forEach(opt => {
    embed.addFields({
      name: `${opt.emoji} ${opt.label}`,
      value: '0 votes',
      inline: false,
    });
  });

  const channel = await client.channels.fetch(config.discord.channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error('Channel not found or not text-based');
  }

  const message = await (channel as any).send({ embeds: [embed] });

  for (const opt of pollOptions) {
    await message.react(opt.emoji);
  }

  const poll: Poll = {
    messageId: message.id,
    question,
    options: pollOptions,
    createdBy,
    expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000),
    type: 'quick',
  };

  activePolls.set(message.id, poll);

  setTimeout(() => closePoll(message.id), duration * 60 * 60 * 1000);

  return message;
}

export async function handlePollReaction(
  reaction: MessageReaction,
  user: User,
  added: boolean
): Promise<void> {
  if (user.bot) return;

  const poll = activePolls.get(reaction.message.id);
  if (!poll) return;

  const option = poll.options.find(opt => opt.emoji === reaction.emoji.name);
  if (!option) return;

  if (added) {
    if (!option.votes.includes(user.id)) {
      option.votes.push(user.id);
    }
  } else {
    const index = option.votes.indexOf(user.id);
    if (index > -1) {
      option.votes.splice(index, 1);
    }
  }

  await updatePollEmbed(poll);
}

async function updatePollEmbed(poll: Poll): Promise<void> {
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(poll.messageId);
    const embed = message.embeds[0];
    if (!embed) return;

    const newEmbed = EmbedBuilder.from(embed);
    newEmbed.setFields([]);

    poll.options.forEach(opt => {
      newEmbed.addFields({
        name: `${opt.emoji} ${opt.label}`,
        value: `${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}`,
        inline: false,
      });
    });

    await message.edit({ embeds: [newEmbed] });
  } catch (error) {
    console.error('Error updating poll embed:', error);
  }
}

async function closePoll(messageId: string): Promise<void> {
  const poll = activePolls.get(messageId);
  if (!poll) return;

  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(messageId);
    
    // Sort options by votes
    const sorted = [...poll.options].sort((a, b) => b.votes.length - a.votes.length);
    
    let resultText = '**📊 Poll Results:**\n\n';
    sorted.forEach((opt, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
      resultText += `${medal} ${opt.emoji} **${opt.label}**: ${opt.votes.length} vote${opt.votes.length !== 1 ? 's' : ''}\n`;
    });

    if (sorted[0].votes.length > 0) {
      resultText += `\n✅ **Winner:** ${sorted[0].label}`;
    }

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(`${message.embeds[0].title} - CLOSED`)
      .setDescription(resultText)
      .setFooter({ text: 'Poll closed' })
      .setTimestamp();

    await message.edit({ embeds: [embed] });
    activePolls.delete(messageId);

    console.log(`Poll closed: ${poll.question} - Winner: ${sorted[0].label}`);
  } catch (error) {
    console.error('Error closing poll:', error);
  }
}

export function getActivePoll(messageId: string): Poll | undefined {
  return activePolls.get(messageId);
}
