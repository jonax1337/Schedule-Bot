import { prisma } from './database.repository.js';
import { logger } from '../shared/utils/logger.js';

export interface StrategyListItem {
  id: number;
  title: string;
  map: string | null;
  side: string | null;
  tags: string[];
  agents: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyDetail extends StrategyListItem {
  content: any;
}

export interface CreateStrategyData {
  title: string;
  map?: string | null;
  side?: string | null;
  tags?: string;
  agents?: string;
  content?: any;
  authorId: string;
  authorName: string;
}

export interface UpdateStrategyData {
  title?: string;
  map?: string | null;
  side?: string | null;
  tags?: string;
  agents?: string;
  content?: any;
}

function toListItem(s: any): StrategyListItem {
  return {
    id: s.id,
    title: s.title,
    map: s.map,
    side: s.side,
    tags: s.tags ? s.tags.split(',').filter(Boolean) : [],
    agents: s.agents ? s.agents.split(',').filter(Boolean) : [],
    authorId: s.authorId,
    authorName: s.authorName,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function toDetail(s: any): StrategyDetail {
  return {
    ...toListItem(s),
    content: s.content,
  };
}

export async function findAllStrategies(filter?: { map?: string; side?: string }): Promise<StrategyListItem[]> {
  const where: any = {};
  if (filter?.map) where.map = filter.map;
  if (filter?.side) where.side = filter.side;

  const strategies = await prisma.strategy.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      map: true,
      side: true,
      tags: true,
      agents: true,
      authorId: true,
      authorName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return strategies.map(toListItem);
}

export async function findStrategyById(id: number): Promise<StrategyDetail | null> {
  const strategy = await prisma.strategy.findUnique({ where: { id } });
  if (!strategy) return null;
  return toDetail(strategy);
}

export async function createStrategy(data: CreateStrategyData): Promise<StrategyDetail> {
  const strategy = await prisma.strategy.create({
    data: {
      title: data.title,
      map: data.map || null,
      side: data.side || null,
      tags: data.tags || '',
      agents: data.agents || '',
      content: data.content || {},
      authorId: data.authorId,
      authorName: data.authorName,
    },
  });

  logger.success('Strategy created', `"${strategy.title}" by ${data.authorName}`);
  return toDetail(strategy);
}

export async function updateStrategy(id: number, data: UpdateStrategyData): Promise<StrategyDetail | null> {
  try {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.map !== undefined) updateData.map = data.map || null;
    if (data.side !== undefined) updateData.side = data.side || null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.agents !== undefined) updateData.agents = data.agents;
    if (data.content !== undefined) updateData.content = data.content;

    const strategy = await prisma.strategy.update({
      where: { id },
      data: updateData,
    });

    logger.success('Strategy updated', `"${strategy.title}" (ID: ${id})`);
    return toDetail(strategy);
  } catch (error) {
    logger.error('Error updating strategy', error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function deleteStrategy(id: number): Promise<boolean> {
  try {
    await prisma.strategy.delete({ where: { id } });
    logger.success('Strategy deleted', `ID: ${id}`);
    return true;
  } catch (error) {
    logger.error('Error deleting strategy', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Image helpers
export async function createStrategyImage(data: {
  strategyId?: number | null;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}) {
  return prisma.strategyImage.create({ data });
}

export async function linkOrphanImages(filenames: string[], strategyId: number) {
  if (filenames.length === 0) return;
  await prisma.strategyImage.updateMany({
    where: { filename: { in: filenames }, strategyId: null },
    data: { strategyId },
  });
}

export async function deleteOrphanImages(): Promise<string[]> {
  const orphans = await prisma.strategyImage.findMany({
    where: { strategyId: null },
    select: { filename: true, id: true },
  });
  if (orphans.length === 0) return [];
  await prisma.strategyImage.deleteMany({
    where: { id: { in: orphans.map(o => o.id) } },
  });
  return orphans.map(o => o.filename);
}
