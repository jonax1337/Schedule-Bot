import { prisma } from './database.repository.js';
import type { VodComment } from '../shared/types/types.js';

function mapComment(c: { id: number; scrimId: string; userName: string; timestamp: number; content: string; createdAt: Date; updatedAt: Date }): VodComment {
  return {
    id: c.id,
    scrimId: c.scrimId,
    userName: c.userName,
    timestamp: c.timestamp,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export async function getCommentsByScrimId(scrimId: string): Promise<VodComment[]> {
  const comments = await prisma.vodComment.findMany({
    where: { scrimId },
    orderBy: { timestamp: 'asc' },
  });
  return comments.map(mapComment);
}

export async function getCommentById(id: number): Promise<VodComment | null> {
  const comment = await prisma.vodComment.findUnique({ where: { id } });
  return comment ? mapComment(comment) : null;
}

export async function createComment(scrimId: string, userName: string, timestamp: number, content: string): Promise<VodComment> {
  const comment = await prisma.vodComment.create({
    data: { scrimId, userName, timestamp, content },
  });
  return mapComment(comment);
}

export async function updateComment(id: number, updates: { content?: string; timestamp?: number }): Promise<VodComment | null> {
  try {
    const comment = await prisma.vodComment.update({ where: { id }, data: updates });
    return mapComment(comment);
  } catch {
    return null;
  }
}

export async function deleteComment(id: number): Promise<boolean> {
  try {
    await prisma.vodComment.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
