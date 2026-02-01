import * as repo from '../repositories/vod-comment.repository.js';
import type { VodComment } from '../shared/types/types.js';

class VodCommentService {
  async getCommentsByScrimId(scrimId: string): Promise<VodComment[]> {
    return repo.getCommentsByScrimId(scrimId);
  }

  async createComment(scrimId: string, userName: string, timestamp: number, content: string): Promise<VodComment> {
    return repo.createComment(scrimId, userName, timestamp, content);
  }

  async updateComment(id: number, updates: { content?: string; timestamp?: number }): Promise<VodComment | null> {
    return repo.updateComment(id, updates);
  }

  async deleteComment(id: number): Promise<boolean> {
    return repo.deleteComment(id);
  }

  async isCommentOwner(commentId: number, userName: string): Promise<boolean> {
    const comment = await repo.getCommentById(commentId);
    return comment !== null && comment.userName === userName;
  }
}

export const vodCommentService = new VodCommentService();
