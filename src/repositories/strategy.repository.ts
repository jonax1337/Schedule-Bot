import { prisma } from './database.repository.js';
import { logger, getErrorMessage } from '../shared/utils/logger.js';

export interface FolderItem {
  id: number;
  name: string;
  parentId: number | null;
  color: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyListItem {
  id: number;
  title: string;
  map: string | null;
  side: string | null;
  tags: string[];
  agents: string[];
  folderId: number | null;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyFileItem {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface StrategyDetail extends StrategyListItem {
  content: any;
  files?: StrategyFileItem[];
}

export interface CreateStrategyData {
  title: string;
  map?: string | null;
  side?: string | null;
  tags?: string;
  agents?: string;
  content?: any;
  folderId?: number | null;
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
    folderId: s.folderId ?? null,
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

export async function findAllStrategies(filter?: { map?: string; side?: string; folderId?: number | null }): Promise<StrategyListItem[]> {
  const where: any = {};
  if (filter?.map) where.map = filter.map;
  if (filter?.side) where.side = filter.side;
  if (filter && 'folderId' in filter) where.folderId = filter.folderId;

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
      folderId: true,
      authorId: true,
      authorName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return strategies.map(toListItem);
}

export async function findStrategyById(id: number): Promise<StrategyDetail | null> {
  const strategy = await prisma.strategy.findUnique({
    where: { id },
    include: { files: { orderBy: { createdAt: 'asc' } } },
  });
  if (!strategy) return null;
  const detail = toDetail(strategy);
  (detail as any).files = strategy.files.map(f => ({
    id: f.id,
    filename: f.filename,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    createdAt: f.createdAt.toISOString(),
  }));
  return detail;
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
      folderId: data.folderId ?? null,
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
    logger.error('Error updating strategy', getErrorMessage(error));
    return null;
  }
}

export async function deleteStrategy(id: number): Promise<boolean> {
  try {
    await prisma.strategy.delete({ where: { id } });
    logger.success('Strategy deleted', `ID: ${id}`);
    return true;
  } catch (error) {
    logger.error('Error deleting strategy', getErrorMessage(error));
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

// File (PDF) helpers
export async function createStrategyFile(data: {
  strategyId: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}): Promise<StrategyFileItem> {
  const file = await prisma.strategyFile.create({ data });
  return {
    id: file.id,
    filename: file.filename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
  };
}

export async function getStrategyFile(id: number) {
  return prisma.strategyFile.findUnique({ where: { id } });
}

export async function deleteStrategyFile(id: number): Promise<string | null> {
  try {
    const file = await prisma.strategyFile.delete({ where: { id } });
    return file.filename;
  } catch {
    return null;
  }
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

// --- Folder CRUD ---

export async function findFolders(parentId: number | null): Promise<FolderItem[]> {
  const folders = await prisma.strategyFolder.findMany({
    where: { parentId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return folders.map(f => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    color: f.color,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));
}

export async function findAllFolders(): Promise<FolderItem[]> {
  const folders = await prisma.strategyFolder.findMany({
    orderBy: [{ name: 'asc' }],
  });
  return folders.map(f => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    color: f.color,
    sortOrder: f.sortOrder,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }));
}

export async function findFolderById(id: number) {
  return prisma.strategyFolder.findUnique({ where: { id } });
}

export async function createFolder(name: string, parentId: number | null): Promise<FolderItem> {
  const folder = await prisma.strategyFolder.create({
    data: { name, parentId },
  });
  logger.success('Folder created', `"${name}"`);
  return {
    id: folder.id,
    name: folder.name,
    parentId: folder.parentId,
    color: folder.color,
    sortOrder: folder.sortOrder,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

export async function updateFolder(id: number, data: { name?: string; color?: string | null }): Promise<FolderItem | null> {
  try {
    const folder = await prisma.strategyFolder.update({
      where: { id },
      data,
    });
    return {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
      color: folder.color,
      sortOrder: folder.sortOrder,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function deleteFolder(id: number): Promise<boolean> {
  try {
    // Check if folder has children or strategies
    const [children, strategies] = await Promise.all([
      prisma.strategyFolder.count({ where: { parentId: id } }),
      prisma.strategy.count({ where: { folderId: id } }),
    ]);
    if (children > 0 || strategies > 0) return false;
    await prisma.strategyFolder.delete({ where: { id } });
    logger.success('Folder deleted', `ID: ${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function duplicateStrategy(id: number, folderId?: number | null): Promise<StrategyDetail | null> {
  const original = await prisma.strategy.findUnique({ where: { id } });
  if (!original) return null;
  const copy = await prisma.strategy.create({
    data: {
      title: `${original.title} (Copy)`,
      map: original.map,
      side: original.side,
      tags: original.tags,
      agents: original.agents,
      content: original.content as any,
      folderId: folderId !== undefined ? folderId : original.folderId,
      authorId: original.authorId,
      authorName: original.authorName,
    },
  });
  logger.success('Strategy duplicated', `"${copy.title}" from ID: ${id}`);
  return toDetail(copy);
}

export async function duplicateFolder(id: number, parentId?: number | null): Promise<FolderItem | null> {
  const original = await prisma.strategyFolder.findUnique({ where: { id } });
  if (!original) return null;
  const copy = await prisma.strategyFolder.create({
    data: {
      name: `${original.name} (Copy)`,
      parentId: parentId !== undefined ? parentId : original.parentId,
    },
  });
  logger.success('Folder duplicated', `"${copy.name}" from ID: ${id}`);
  return {
    id: copy.id,
    name: copy.name,
    parentId: copy.parentId,
    color: copy.color,
    sortOrder: copy.sortOrder,
    createdAt: copy.createdAt.toISOString(),
    updatedAt: copy.updatedAt.toISOString(),
  };
}

export async function moveStrategy(id: number, folderId: number | null): Promise<boolean> {
  try {
    await prisma.strategy.update({
      where: { id },
      data: { folderId },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getFolderPath(folderId: number): Promise<FolderItem[]> {
  const breadcrumbs: FolderItem[] = [];
  let currentId: number | null = folderId;
  while (currentId !== null) {
    const found: { id: number; name: string; parentId: number | null; color: string | null; sortOrder: number; createdAt: Date; updatedAt: Date } | null = await prisma.strategyFolder.findUnique({ where: { id: currentId } });
    if (!found) break;
    breadcrumbs.unshift({
      id: found.id,
      name: found.name,
      parentId: found.parentId,
      color: found.color,
      sortOrder: found.sortOrder,
      createdAt: found.createdAt.toISOString(),
      updatedAt: found.updatedAt.toISOString(),
    });
    currentId = found.parentId;
  }
  return breadcrumbs;
}
