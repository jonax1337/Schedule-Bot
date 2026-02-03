'use client';

import { useState, useEffect, useCallback } from 'react';
import { BOT_API_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';

export interface VodComment {
  id: number;
  scrimId: string;
  userName: string;
  timestamp: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface UseVodCommentsOptions {
  scrimId?: string;
  fetchOnMount?: boolean;
}

interface UseVodCommentsResult {
  comments: VodComment[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addComment: (timestamp: number, content: string) => Promise<VodComment | null>;
  updateComment: (id: number, timestamp: number, content: string) => Promise<boolean>;
  deleteComment: (id: number) => Promise<boolean>;
}

export function useVodComments(options: UseVodCommentsOptions = {}): UseVodCommentsResult {
  const { scrimId, fetchOnMount = true } = options;
  const [comments, setComments] = useState<VodComment[]>([]);
  const [loading, setLoading] = useState(fetchOnMount && !!scrimId);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!scrimId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/scrim/${scrimId}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      } else {
        throw new Error('Failed to fetch comments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  }, [scrimId]);

  useEffect(() => {
    if (fetchOnMount && scrimId) {
      fetchComments();
    }
  }, [fetchComments, fetchOnMount, scrimId]);

  const addComment = useCallback(async (timestamp: number, content: string): Promise<VodComment | null> => {
    if (!scrimId) return null;

    try {
      const res = await fetch(`${BOT_API_URL}/api/vod-comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ scrimId, timestamp, content }),
      });
      if (res.ok) {
        const data = await res.json();
        const newComment = data.comment;
        setComments(prev => [...prev, newComment].sort((a, b) => a.timestamp - b.timestamp));
        return newComment;
      }
      throw new Error('Failed to add comment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
      return null;
    }
  }, [scrimId]);

  const updateComment = useCallback(async (id: number, timestamp: number, content: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ timestamp, content }),
      });
      if (res.ok) {
        const data = await res.json();
        const updatedComment = data.comment;
        setComments(prev =>
          prev.map(c => c.id === id ? updatedComment : c).sort((a, b) => a.timestamp - b.timestamp)
        );
        return true;
      }
      throw new Error('Failed to update comment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
      return false;
    }
  }, []);

  const deleteComment = useCallback(async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== id));
        return true;
      }
      throw new Error('Failed to delete comment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      return false;
    }
  }, []);

  return {
    comments,
    loading,
    error,
    refetch: fetchComments,
    addComment,
    updateComment,
    deleteComment,
  };
}
