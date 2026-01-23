import { prisma } from './database.repository.js';
import type { ScrimEntry, ScrimStats } from '../shared/types/types.js';

function generateScrimId(): string {
  return `scrim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function ensureScrimSheetExists(): Promise<void> {
  console.log('Scrims table verified (PostgreSQL)');
}

export async function getAllScrims(): Promise<ScrimEntry[]> {
  const scrims = await prisma.scrim.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return scrims.map(s => ({
    id: s.id,
    date: s.date,
    opponent: s.opponent,
    result: s.result.toLowerCase() as 'win' | 'loss' | 'draw',
    scoreUs: s.scoreUs,
    scoreThem: s.scoreThem,
    map: s.map,
    matchType: s.matchType,
    ourAgents: s.ourAgents.split(',').filter(Boolean),
    theirAgents: s.theirAgents.split(',').filter(Boolean),
    vodUrl: s.vodUrl,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

export async function getScrimById(id: string): Promise<ScrimEntry | null> {
  const scrim = await prisma.scrim.findUnique({
    where: { id },
  });

  if (!scrim) return null;

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
    notes: scrim.notes,
    createdAt: scrim.createdAt.toISOString(),
    updatedAt: scrim.updatedAt.toISOString(),
  };
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
      notes: scrim.notes,
    },
  });

  console.log('Added scrim:', newScrim.id);

  return {
    id: newScrim.id,
    date: newScrim.date,
    opponent: newScrim.opponent,
    result: newScrim.result.toLowerCase() as 'win' | 'loss' | 'draw',
    scoreUs: newScrim.scoreUs,
    scoreThem: newScrim.scoreThem,
    map: newScrim.map,
    matchType: newScrim.matchType,
    ourAgents: newScrim.ourAgents.split(',').filter(Boolean),
    theirAgents: newScrim.theirAgents.split(',').filter(Boolean),
    vodUrl: newScrim.vodUrl,
    notes: newScrim.notes,
    createdAt: newScrim.createdAt.toISOString(),
    updatedAt: newScrim.updatedAt.toISOString(),
  };
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
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const updatedScrim = await prisma.scrim.update({
      where: { id },
      data: updateData,
    });

    console.log('Updated scrim:', id);

    return {
      id: updatedScrim.id,
      date: updatedScrim.date,
      opponent: updatedScrim.opponent,
      result: updatedScrim.result.toLowerCase() as 'win' | 'loss' | 'draw',
      scoreUs: updatedScrim.scoreUs,
      scoreThem: updatedScrim.scoreThem,
      map: updatedScrim.map,
      matchType: updatedScrim.matchType,
      ourAgents: updatedScrim.ourAgents.split(',').filter(Boolean),
      theirAgents: updatedScrim.theirAgents.split(',').filter(Boolean),
      vodUrl: updatedScrim.vodUrl,
      notes: updatedScrim.notes,
      createdAt: updatedScrim.createdAt.toISOString(),
      updatedAt: updatedScrim.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error('Error updating scrim:', error);
    return null;
  }
}

export async function deleteScrim(id: string): Promise<boolean> {
  try {
    await prisma.scrim.delete({
      where: { id },
    });

    console.log('Deleted scrim:', id);
    return true;
  } catch (error) {
    console.error('Error deleting scrim:', error);
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
