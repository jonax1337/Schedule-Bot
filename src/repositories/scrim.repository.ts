import { prisma } from './database.repository.js';
import type { ScrimEntry, ScrimStats } from '../shared/types/types.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

function generateScrimId(): string {
  return `scrim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function mapScrimToEntry(scrim: any): ScrimEntry {
  return {
    id: scrim.id,
    date: scrim.date,
    opponent: scrim.opponent,
    result: scrim.result.toLowerCase() as 'win' | 'loss' | 'draw',
    scoreUs: scrim.scoreUs,
    scoreThem: scrim.scoreThem,
    map: scrim.map,
    matchType: scrim.matchType,
    ourAgents: scrim.ourAgents.split(',').filter(Boolean),
    theirAgents: scrim.theirAgents.split(',').filter(Boolean),
    vodUrl: scrim.vodUrl,
    matchLink: scrim.matchLink,
    notes: scrim.notes,
    createdAt: scrim.createdAt.toISOString(),
    updatedAt: scrim.updatedAt.toISOString(),
  };
}

export async function getAllScrims(): Promise<ScrimEntry[]> {
  const scrims = await prisma.scrim.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return scrims.map(mapScrimToEntry);
}

export async function getScrimById(id: string): Promise<ScrimEntry | null> {
  const scrim = await prisma.scrim.findUnique({
    where: { id },
  });

  if (!scrim) return null;

  return mapScrimToEntry(scrim);
}

export async function addScrim(scrim: Omit<ScrimEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScrimEntry> {
  const resultEnum = scrim.result.toUpperCase() as 'WIN' | 'LOSS' | 'DRAW';
  
  const newScrim = await prisma.scrim.create({
    data: {
      id: generateScrimId(),
      date: scrim.date,
      opponent: scrim.opponent,
      result: resultEnum,
      scoreUs: scrim.scoreUs,
      scoreThem: scrim.scoreThem,
      map: scrim.map || '',
      matchType: scrim.matchType || '',
      ourAgents: scrim.ourAgents.join(','),
      theirAgents: scrim.theirAgents.join(','),
      vodUrl: scrim.vodUrl,
      matchLink: scrim.matchLink || '',
      notes: scrim.notes,
    },
  });

  logger.info('Added scrim', newScrim.id);

  return mapScrimToEntry(newScrim);
}

export async function updateScrim(id: string, updates: Partial<Omit<ScrimEntry, 'id' | 'createdAt'>>): Promise<ScrimEntry | null> {
  try {
    const updateData: any = {};

    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.opponent !== undefined) updateData.opponent = updates.opponent;
    if (updates.result !== undefined) updateData.result = updates.result.toUpperCase();
    if (updates.scoreUs !== undefined) updateData.scoreUs = updates.scoreUs;
    if (updates.scoreThem !== undefined) updateData.scoreThem = updates.scoreThem;
    if (updates.map !== undefined) updateData.map = updates.map;
    if (updates.matchType !== undefined) updateData.matchType = updates.matchType;
    if (updates.ourAgents !== undefined) updateData.ourAgents = updates.ourAgents.join(',');
    if (updates.theirAgents !== undefined) updateData.theirAgents = updates.theirAgents.join(',');
    if (updates.vodUrl !== undefined) updateData.vodUrl = updates.vodUrl;
    if (updates.matchLink !== undefined) updateData.matchLink = updates.matchLink;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const updatedScrim = await prisma.scrim.update({
      where: { id },
      data: updateData,
    });

    logger.info('Updated scrim', id);

    return mapScrimToEntry(updatedScrim);
  } catch (error) {
    logger.error('Error updating scrim', getErrorMessage(error));
    return null;
  }
}

export async function deleteScrim(id: string): Promise<boolean> {
  try {
    await prisma.scrim.delete({
      where: { id },
    });

    logger.info('Deleted scrim', id);
    return true;
  } catch (error) {
    logger.error('Error deleting scrim', getErrorMessage(error));
    return false;
  }
}

export async function getScrimStats(): Promise<ScrimStats> {
  const scrims = await getAllScrims();

  const stats: ScrimStats = {
    totalScrims: scrims.length,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    mapStats: {},
  };

  for (const scrim of scrims) {
    if (scrim.result === 'win') stats.wins++;
    else if (scrim.result === 'loss') stats.losses++;
    else if (scrim.result === 'draw') stats.draws++;

    if (scrim.map) {
      const mapName = scrim.map;
      if (!stats.mapStats[mapName]) {
        stats.mapStats[mapName] = { played: 0, wins: 0, losses: 0 };
      }
      stats.mapStats[mapName].played++;
      if (scrim.result === 'win') stats.mapStats[mapName].wins++;
      else if (scrim.result === 'loss') stats.mapStats[mapName].losses++;
    }
  }

  stats.winRate = stats.totalScrims > 0 ? (stats.wins / stats.totalScrims) * 100 : 0;

  return stats;
}

export async function getScrimsByDateRange(startDate: string, endDate: string): Promise<ScrimEntry[]> {
  const scrims = await getAllScrims();
  
  return scrims.filter((scrim) => {
    const scrimDate = scrim.date;
    return scrimDate >= startDate && scrimDate <= endDate;
  });
}
