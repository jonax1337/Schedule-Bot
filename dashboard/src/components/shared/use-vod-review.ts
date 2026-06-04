import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { YouTubeEvent } from 'react-youtube';
import { toast } from 'sonner';
import { getUser, getAuthHeaders } from '@/lib/auth';
import { BOT_API_URL } from '@/lib/config';
import { extractTags } from '@/lib/vod-utils';
import type { MentionUser } from './vod-mention-input';
import type { VodComment } from '@/lib/types';

/**
 * All VOD-review comment state, data fetching, player wiring and handlers.
 * Shared by the embedded matches view (shared/vod-review.tsx) and the
 * full-screen route (pages/vod-review.tsx); each owns only its own layout and
 * renders <VodCommentPanel vod={...} />.
 */
export function useVodReview(scrimId: string) {
  const [comments, setComments] = useState<VodComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTimestamp, setEditTimestamp] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [filterUser, setFilterUser] = useState<string | null>(null);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterMentioned, setFilterMentioned] = useState<string[]>([]); // [] | ["__all__"] | ["user1", ...]
  const [filterOpen, setFilterOpen] = useState(false);
  const playerRef = useRef<ReturnType<YouTubeEvent['target']['getInternalPlayer']> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commentRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastHighlightedId = useRef<number>(-1);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const newCommentRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const user = getUser();

  // Derive unique users and tags from comments
  const allUsers = useMemo(() => [...new Set(comments.map(c => c.userName))].sort(), [comments]);
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    comments.forEach(c => extractTags(c.content).forEach(t => tags.add(t)));
    return [...tags].sort();
  }, [comments]);
  const allMentionedUsers = useMemo(() => {
    const users = new Set<string>();
    comments.forEach(c => {
      const matches = c.content.match(/<@([^>]+)>/g);
      if (matches) matches.forEach(m => users.add(m.slice(2, -1)));
    });
    return [...users].sort();
  }, [comments]);

  // Filter comments
  const filteredComments = useMemo(() => {
    let result = comments;
    if (filterUser) {
      result = result.filter(c => c.userName === filterUser);
    }
    if (filterTags.length > 0) {
      result = result.filter(c => {
        const tags = extractTags(c.content);
        return filterTags.some(t => tags.includes(t));
      });
    }
    if (filterMentioned.length > 0) {
      if (filterMentioned.includes('__all__')) {
        result = result.filter(c => /<@[^>]+>/.test(c.content));
      } else {
        result = result.filter(c => filterMentioned.some(u => c.content.includes(`<@${u}>`)));
      }
    }
    return result;
  }, [comments, filterUser, filterTags, filterMentioned]);

  const hasActiveFilter = filterUser !== null || filterTags.length > 0 || filterMentioned.length > 0;

  // Fetch user mappings for @mentions
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BOT_API_URL}/api/user-mappings`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && Array.isArray(data.mappings)) {
          setMentionUsers(
            data.mappings
              .map((u: { displayName?: string; avatarUrl?: string | null }) => ({
                name: u.displayName || '',
                avatarUrl: u.avatarUrl ?? null,
              }))
              .filter((u: { name: string }) => u.name)
          );
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/scrim/${scrimId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setComments(data.comments);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [scrimId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Detect user scroll to disable auto-scroll
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    const handleScroll = () => {
      if (programmaticScrollRef.current) return;
      userScrolledRef.current = true;
    };
    viewport.addEventListener('scroll', handleScroll);
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  // Auto-scroll and highlight comment when video reaches its timestamp
  useEffect(() => {
    if (filteredComments.length === 0) return;

    const matchingComment = [...filteredComments]
      .reverse()
      .find(c => currentTime >= c.timestamp && currentTime <= c.timestamp + 5);

    if (!matchingComment) {
      lastHighlightedId.current = -1;
      return;
    }

    if (matchingComment.id !== lastHighlightedId.current) {
      lastHighlightedId.current = matchingComment.id;
      setHighlightedId(matchingComment.id);

      // Auto-scroll only downward and only if user hasn't manually scrolled
      if (!userScrolledRef.current) {
        const el = commentRefsMap.current.get(matchingComment.id);
        const viewport = scrollViewportRef.current;
        if (el && viewport) {
          const elTop = el.offsetTop;
          const elHeight = el.offsetHeight;
          const viewportHeight = viewport.clientHeight;
          const targetScrollTop = elTop - viewportHeight / 2 + elHeight / 2;
          if (targetScrollTop > viewport.scrollTop) {
            programmaticScrollRef.current = true;
            viewport.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            setTimeout(() => { programmaticScrollRef.current = false; }, 500);
          }
        }
      }

      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);

      if (!isPaused) {
        const id = matchingComment.id;
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightedId(prev => prev === id ? null : prev);
        }, 3000);
      }
    }
  }, [currentTime, filteredComments, isPaused]);

  // When video resumes playing, clear highlight after delay
  useEffect(() => {
    if (!isPaused && highlightedId !== null) {
      const id = highlightedId;
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedId(prev => prev === id ? null : prev);
      }, 3000);
    }
  }, [isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPlayerReady = (event: YouTubeEvent) => {
    playerRef.current = event.target;
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        try {
          setCurrentTime(Math.floor(playerRef.current.getCurrentTime()));
        } catch { /* player may not be ready */ }
      }
    }, 1000);
  };

  const onPlayerStateChange = (event: YouTubeEvent) => {
    setIsPaused(event.data === 2);
  };

  const seekTo = (timestamp: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(timestamp, true);
      userScrolledRef.current = false;
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      const res = await fetch(`${BOT_API_URL}/api/vod-comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ scrimId, timestamp: currentTime, content: newComment.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewComment('');
        fetchComments();
      } else {
        toast.error(data.error || 'Failed to add comment');
      }
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleUpdateComment = async (id: number) => {
    if (!editContent.trim()) return;
    try {
      const body: { content: string; timestamp?: number } = { content: editContent.trim() };
      if (editTimestamp !== null) {
        body.timestamp = editTimestamp;
      }
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        setEditContent('');
        setEditTimestamp(null);
        fetchComments();
      } else {
        toast.error(data.error || 'Failed to update comment');
      }
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const handleDeleteComment = async (id: number) => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchComments();
      } else {
        toast.error(data.error || 'Failed to delete comment');
      }
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const startEditing = (comment: VodComment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
    setEditTimestamp(null); // null = unchanged
  };

  const handleTagClick = (tag: string) => {
    setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  return {
    comments, loading, user,
    newComment, setNewComment,
    editingId, setEditingId,
    editContent, setEditContent,
    editTimestamp, setEditTimestamp,
    currentTime, highlightedId, mentionUsers,
    filterUser, setFilterUser,
    filterTags, setFilterTags,
    filterMentioned, setFilterMentioned,
    filterOpen, setFilterOpen,
    allUsers, allTags, allMentionedUsers, filteredComments, hasActiveFilter,
    scrollViewportRef, commentRefsMap, newCommentRef, editRef,
    onPlayerReady, onPlayerStateChange, seekTo,
    handleAddComment, handleUpdateComment, handleDeleteComment, startEditing, handleTagClick,
  };
}

export type VodReviewController = ReturnType<typeof useVodReview>;
