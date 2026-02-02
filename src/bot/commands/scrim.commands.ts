import { ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { addScrim, getAllScrims, getScrimStats } from '../../repositories/scrim.repository.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Handle /add-scrim command - Add a scrim result (Admin)
 */
export async function handleAddScrimCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
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
      matchLink: '', // Discord bot doesn't support match link yet
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
    logger.error('Error adding scrim', error instanceof Error ? error.message : String(error));
    await interaction.editReply({
      content: '❌ An error occurred while adding the scrim.',
    });
  }
}

/**
 * Handle /view-scrims command - View recent scrim results
 */
export async function handleViewScrimsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
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
    logger.error('Error viewing scrims', error instanceof Error ? error.message : String(error));
    await interaction.editReply({
      content: '❌ An error occurred while fetching scrims.',
    });
  }
}

/**
 * Handle /scrim-stats command - View scrim statistics
 */
export async function handleScrimStatsCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
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
          value: `Total Games: **${stats.totalScrims}**\n` +
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
    logger.error('Error fetching scrim stats', error instanceof Error ? error.message : String(error));
    await interaction.editReply({
      content: '❌ An error occurred while fetching statistics.',
    });
  }
}
