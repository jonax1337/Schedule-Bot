import { prisma } from './database.repository.js';
import type { ScrimEntry, ScrimStats } from '../shared/types/types.js';

function generateScrimId(): string {
  return `scrim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function mapScrimToEntry(s: any): ScrimEntry {
  return {
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
    trackerUrl: s.trackerUrl || '',
    trackerData: s.trackerData || null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function getAllScrims(): Promise<ScrimEntry[]> {
  const scrims = await prisma.scrim.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return scrims.map(s => mapScrimToEntry(s));
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
      notes: scrim.notes,
      trackerUrl: scrim.trackerUrl || '',
      trackerData: scrim.trackerData || undefined,
    },
  });

  console.log('Added scrim:', newScrim.id);
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
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.trackerUrl !== undefined) updateData.trackerUrl = updates.trackerUrl;
    if (updates.trackerData !== undefined) updateData.trackerData = updates.trackerData;

    const updatedScrim = await prisma.scrim.update({
      where: { id },
      data: updateData,
    });

    console.log('Updated scrim:', id);
    return mapScrimToEntry(updatedScrim);
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
