import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, MessageSquare, Edit, Trash2, Send, Clock, X, Check, Filter, Hash, User, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTimestamp, getTagColor } from '@/lib/vod-utils';
import { CommentText } from './vod-comment-text';
import { MentionInput } from './vod-mention-input';
import type { VodReviewController } from './use-vod-review';

interface VodCommentPanelProps {
  vod: VodReviewController;
  /** Classes for the panel's outer container (width/border/etc.). */
  className?: string;
  style?: CSSProperties;
}

/** The comments side panel: header + filter popover + active filters + list + composer. */
export function VodCommentPanel({ vod, className, style }: VodCommentPanelProps) {
  const {
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
    seekTo, handleAddComment, handleUpdateComment, handleDeleteComment, startEditing, handleTagClick,
  } = vod;

  return (
    <div className={cn('flex flex-col bg-card shrink-0', className)} style={style}>
      {/* Header with filter */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comments ({filteredComments.length}{hasActiveFilter ? `/${comments.length}` : ''})</span>
        </div>
        {(allUsers.length > 1 || allTags.length > 0 || allMentionedUsers.length > 0) && (
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={`h-7 w-7 ${hasActiveFilter ? 'text-primary' : ''}`}>
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end" side="bottom" sideOffset={4}>
              <div className="space-y-3">
                {/* Author filter */}
                {allUsers.length > 1 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
                      <User className="h-3 w-3" />
                      <span>Author</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {allUsers.map(u => (
                        <button
                          key={u}
                          onClick={() => { setFilterUser(prev => prev === u ? null : u); }}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                            filterUser === u
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-accent'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Mentioned filter */}
                {allMentionedUsers.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
                      <AtSign className="h-3 w-3" />
                      <span>Mentioned</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => setFilterMentioned(prev => prev.includes('__all__') ? prev.filter(x => x !== '__all__') : ['__all__'])}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                          filterMentioned.includes('__all__')
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-accent'
                        }`}
                      >
                        All
                      </button>
                      {allMentionedUsers.map(u => (
                        <button
                          key={u}
                          onClick={() => setFilterMentioned(prev => {
                            const without = prev.filter(x => x !== '__all__');
                            return without.includes(u) ? without.filter(x => x !== u) : [...without, u];
                          })}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                            filterMentioned.includes(u)
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-accent'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Tag filter */}
                {allTags.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
                      <Hash className="h-3 w-3" />
                      <span>Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagClick(tag)}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                            filterTags.includes(tag)
                              ? 'bg-primary text-primary-foreground'
                              : `${getTagColor(tag)} hover:opacity-80`
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Clear filters */}
                {hasActiveFilter && (
                  <button
                    onClick={() => { setFilterUser(null); setFilterTags([]); setFilterMentioned([]); }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground py-1 cursor-pointer"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Active filter badges */}
      {hasActiveFilter && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b shrink-0 flex-wrap">
          {filterUser && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <User className="h-3 w-3" />
              {filterUser}
              <button onClick={() => setFilterUser(null)} className="hover:text-primary/70 cursor-pointer"><X className="h-3 w-3" /></button>
            </span>
          )}
          {filterMentioned.map(m => (
            <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <AtSign className="h-3 w-3" />
              {m === '__all__' ? 'All Mentions' : m}
              <button onClick={() => setFilterMentioned(prev => prev.filter(x => x !== m))} className="hover:opacity-70 cursor-pointer"><X className="h-3 w-3" /></button>
            </span>
          ))}
          {filterTags.map(tag => (
            <span key={tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
              {tag}
              <button onClick={() => setFilterTags(prev => prev.filter(t => t !== tag))} className="hover:opacity-70 cursor-pointer"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}

      <div ref={scrollViewportRef} className="flex-1 min-h-0 overflow-auto">
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {hasActiveFilter ? 'No matching comments' : 'No comments yet'}
            </div>
          ) : (
            filteredComments.map((comment) => (
              <div
                key={comment.id}
                ref={(el) => {
                  if (el) commentRefsMap.current.set(comment.id, el);
                  else commentRefsMap.current.delete(comment.id);
                }}
                onClick={(e) => {
                  if (editingId === comment.id) return;
                  if ((e.target as HTMLElement).closest('button')) return;
                  if ((e.target as HTMLElement).closest('textarea')) return;
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
                    {/* Editable timestamp */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditTimestamp(currentTime)}
                        className="flex items-center gap-1 text-xs font-mono text-primary hover:underline cursor-pointer"
                        title="Click to set timestamp to current video time"
                      >
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(editTimestamp ?? comment.timestamp)}
                      </button>
                      {editTimestamp !== null && editTimestamp !== comment.timestamp && (
                        <span className="text-[10px] text-muted-foreground">
                          (was {formatTimestamp(comment.timestamp)})
                        </span>
                      )}
                    </div>
                    <MentionInput
                      textareaRef={editRef}
                      value={editContent}
                      onChange={setEditContent}
                      onSubmit={() => handleUpdateComment(comment.id)}
                      mentionUsers={mentionUsers}
                      autoFocus
                      onEscape={() => { setEditingId(null); setEditContent(''); setEditTimestamp(null); }}
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleUpdateComment(comment.id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingId(null); setEditContent(''); setEditTimestamp(null); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); seekTo(comment.timestamp); }}
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
                              onClick={() => startEditing(comment)}
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
                    <CommentText text={comment.content} onTagClick={handleTagClick} />
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

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
              placeholder="Comment... (@ mention, # tag)"
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
  );
}
