import { prisma } from './database.repository.js';
import { logger } from '../shared/utils/logger.js';

/**
 * Create a new map veto session with entries
 */
export async function createMapVetoSession(data: {
  id: string;
  title: string;
  opponent?: string;
  date?: string;
  notes?: string;
  createdBy: string;
  entries: { step: number; action: 'BAN' | 'PICK' | 'DECIDER'; map: string; team: 'OUR_TEAM' | 'OPPONENT' }[];
}) {
  try {
    const session = await prisma.mapVetoSession.create({
      data: {
        id: data.id,
        title: data.title,
        opponent: data.opponent || '',
        date: data.date || '',
        notes: data.notes || '',
        createdBy: data.createdBy,
        entries: {
          create: data.entries.map(e => ({
            step: e.step,
            action: e.action,
            map: e.map,
            team: e.team,
          })),
        },
      },
      include: { entries: { orderBy: { step: 'asc' } } },
    });
    logger.success('Map veto session created', session.id);
    return session;
  } catch (error) {
    logger.error('Failed to create map veto session', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get all map veto sessions (newest first)
 */
export async function getAllMapVetoSessions() {
  try {
    return await prisma.mapVetoSession.findMany({
      include: { entries: { orderBy: { step: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.error('Failed to fetch map veto sessions', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Get a single map veto session by ID
 */
export async function getMapVetoSession(id: string) {
  try {
    return await prisma.mapVetoSession.findUnique({
      where: { id },
      include: { entries: { orderBy: { step: 'asc' } } },
    });
  } catch (error) {
    logger.error('Failed to fetch map veto session', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Update a map veto session (replaces entries)
 */
export async function updateMapVetoSession(id: string, data: {
  title?: string;
  opponent?: string;
  date?: string;
  notes?: string;
  entries?: { step: number; action: 'BAN' | 'PICK' | 'DECIDER'; map: string; team: 'OUR_TEAM' | 'OPPONENT' }[];
}) {
  try {
    // If entries are provided, delete old ones and create new
    if (data.entries) {
      await prisma.mapVetoEntry.deleteMany({ where: { sessionId: id } });
    }

    const session = await prisma.mapVetoSession.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.opponent !== undefined && { opponent: data.opponent }),
        ...(data.date !== undefined && { date: data.date }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.entries && {
          entries: {
            create: data.entries.map(e => ({
              step: e.step,
              action: e.action,
              map: e.map,
              team: e.team,
            })),
          },
        }),
      },
      include: { entries: { orderBy: { step: 'asc' } } },
    });
    logger.success('Map veto session updated', id);
    return session;
  } catch (error) {
    logger.error('Failed to update map veto session', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Delete a map veto session
 */
export async function deleteMapVetoSession(id: string) {
  try {
    await prisma.mapVetoSession.delete({ where: { id } });
    logger.success('Map veto session deleted', id);
    return true;
  } catch (error) {
    logger.error('Failed to delete map veto session', error instanceof Error ? error.message : String(error));
    throw error;
  }
}
