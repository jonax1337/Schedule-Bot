'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Loader2, MessageSquare, Edit, Trash2, Send, Clock, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getUser, getAuthHeaders } from '@/lib/auth';
import { BOT_API_URL } from '@/lib/config';
import type { VodComment } from '@/lib/types';

interface VodReviewProps {
  videoId: string;
  scrimId: string;
}

interface MentionUser {
  name: string;
  avatarUrl: string | null;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Render comment text with <@Name> mention tokens highlighted as badges.
 */
function CommentText({ text }: { text: string }) {
  const parts = text.split(/(<@[^>]+>)/g);
  return (
    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
      {parts.map((part, i) => {
        const mentionMatch = part.match(/^<@(.+)>$/);
        if (mentionMatch) {
          return (
            <span key={i} className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold bg-blue-500/15 dark:bg-blue-400/15 rounded px-1 py-0.5 text-sm">
              @{mentionMatch[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

/**
 * Auto-growing textarea with @mention Popover+Command combobox.
 * Shows raw <@Name> tokens in the textarea; badges only render in CommentText display.
 */
function MentionInput({
  value,
  onChange,
  onSubmit,
  textareaRef,
  placeholder,
  autoFocus,
  className,
  mentionUsers,
  onEscape,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  mentionUsers: MentionUser[];
  onEscape?: () => void;
}) {
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const mentionStartPos = useRef<number>(-1);
  const savedCursorPos = useRef<number>(-1);

  // Auto-resize textarea to fit content
  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [textareaRef]);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    const lastOpenBracket = textBeforeCursor.lastIndexOf('<@');
    const lastCloseBracket = textBeforeCursor.lastIndexOf('>');
    const insideToken = lastOpenBracket > lastCloseBracket;

    if (!insideToken) {
      const mentionMatch = textBeforeCursor.match(/(^|[^<])@(\S*)$/);
      if (mentionMatch) {
        mentionStartPos.current = (mentionMatch.index ?? 0) + mentionMatch[1].length;
        savedCursorPos.current = cursorPos;
        setMentionSearch(mentionMatch[2]);
        setMentionOpen(true);
        return;
      }
    }

    setMentionOpen(false);
    setMentionSearch('');
  };

  const handleSelectUser = (userName: string) => {
    const startPos = mentionStartPos.current;
    const cursorPos = savedCursorPos.current >= 0 ? savedCursorPos.current : value.length;
    if (startPos < 0) return;

    const before = value.slice(0, startPos);
    const after = value.slice(cursorPos);
    const newValue = `${before}<@${userName}> ${after}`;
    onChange(newValue);
    setMentionOpen(false);
    setMentionSearch('');
    mentionStartPos.current = -1;
    savedCursorPos.current = -1;

    const newCursorPos = before.length + userName.length + 4;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !mentionOpen) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === 'Escape') {
      if (mentionOpen) {
        e.preventDefault();
        setMentionOpen(false);
      } else {
        onEscape?.();
      }
    }
  };

  return (
    <div className={`relative ${className || ''}`}>
      <Popover open={mentionOpen} onOpenChange={(open) => { if (!open) setMentionOpen(false); }}>
        <PopoverAnchor asChild>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            rows={1}
            className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30 placeholder:text-muted-foreground resize-none overflow-hidden leading-normal break-all"
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          side="top"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => { e.preventDefault(); setMentionOpen(false); }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search user..."
              value={mentionSearch}
              onValueChange={setMentionSearch}
            />
            <CommandList>
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                {mentionUsers
                  .filter(u => u.name.toLowerCase().includes(mentionSearch.toLowerCase()))
                  .slice(0, 8)
                  .map((u) => (
                    <CommandItem
                      key={u.name}
                      value={u.name}
                      onSelect={() => handleSelectUser(u.name)}
                    >
                      <Avatar className="h-5 w-5 mr-2">
                        <AvatarImage src={u.avatarUrl || undefined} alt={u.name} />
                        <AvatarFallback className="text-[10px]">
                          {u.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{u.name}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function VodReview({ videoId, scrimId }: VodReviewProps) {
  const [comments, setComments] = useState<VodComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [videoHeight, setVideoHeight] = useState<number>(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const playerRef = useRef<ReturnType<YouTubeEvent['target']['getInternalPlayer']> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commentRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastHighlightedId = useRef<number>(-1);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const newCommentRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledRef = useRef(false);
  const programmaticScrollRef = useRef(false);
  const user = getUser();

  // Measure video container height with ResizeObserver
  useEffect(() => {
    const el = videoContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setVideoHeight(entry.contentRect.height);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/scrim/${scrimId}`);
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
    if (comments.length === 0) return;

    const matchingComment = [...comments]
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
          // Only scroll if target is below current position
          if (targetScrollTop > viewport.scrollTop) {
            programmaticScrollRef.current = true;
            viewport.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth',
            });
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
  }, [currentTime, comments, isPaused]);

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
      // Reset user scroll flag so auto-scroll resumes from new position
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
      const res = await fetch(`${BOT_API_URL}/api/vod-comments/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingId(null);
        setEditContent('');
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full lg:items-start">
      {/* Video Player */}
      <div className="flex-1 min-w-0">
        <div ref={videoContainerRef} className="w-full aspect-video [&>div]:w-full [&>div]:h-full">
          <YouTube
            videoId={videoId}
            opts={{
              playerVars: { autoplay: 1 },
            }}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="w-full h-full"
            iframeClassName="w-full h-full rounded-lg"
          />
        </div>
      </div>

      {/* Comments Panel */}
      <div
        className="w-full lg:w-96 flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden shrink-0"
        style={{ height: videoHeight > 0 ? `${videoHeight}px` : undefined, maxHeight: videoHeight > 0 ? `${videoHeight}px` : '50vh' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comments ({comments.length})</span>
        </div>

        <ScrollArea className="flex-1 min-h-0" viewportRef={scrollViewportRef}>
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No comments yet
              </div>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  ref={(el) => {
                    if (el) commentRefsMap.current.set(comment.id, el);
                    else commentRefsMap.current.delete(comment.id);
                  }}
                  onClick={(e) => {
                    // Don't seek if clicking buttons or editing
                    if (editingId === comment.id) return;
                    if ((e.target as HTMLElement).closest('button')) return;
                    seekTo(comment.timestamp);
                  }}
                  className={`rounded-md border p-2.5 transition-all duration-500 min-w-0 [overflow-wrap:anywhere] ${
                    editingId === comment.id ? '' : 'cursor-pointer'
                  } ${
                    highlightedId === comment.id
                      ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/30'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <MentionInput
                        textareaRef={editRef}
                        value={editContent}
                        onChange={setEditContent}
                        onSubmit={() => handleUpdateComment(comment.id)}
                        mentionUsers={mentionUsers}
                        autoFocus
                        onEscape={() => { setEditingId(null); setEditContent(''); }}
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdateComment(comment.id)}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingId(null); setEditContent(''); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => seekTo(comment.timestamp)}
                            className="flex items-center gap-1 text-xs font-mono text-primary hover:underline cursor-pointer"
                          >
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(comment.timestamp)}
                          </button>
                          <span className="text-xs text-muted-foreground">{comment.userName}</span>
                        </div>
                        {user && (user.username === comment.userName || user.role === 'admin') && (
                          <div className="flex gap-0.5">
                            {user.username === comment.userName && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <CommentText text={comment.content} />
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Add Comment */}
        {user && (
          <div className="border-t p-3 space-y-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(currentTime)}</span>
            </div>
            <div className="flex gap-2">
              <MentionInput
                textareaRef={newCommentRef}
                placeholder="Comment... (@ to mention)"
                value={newComment}
                onChange={setNewComment}
                onSubmit={handleAddComment}
                mentionUsers={mentionUsers}
                className="flex-1 min-w-0"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
