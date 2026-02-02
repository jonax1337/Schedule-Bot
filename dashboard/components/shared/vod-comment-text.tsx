'use client';

import { getTagColor } from '@/lib/vod-utils';

export function CommentText({ text, onTagClick }: { text: string; onTagClick?: (tag: string) => void }) {
  const parts = text.split(/(<@[^>]+>|#\w+)/g);
  return (
    <p className="text-sm whitespace-pre-wrap [overflow-wrap:anywhere]">
      {parts.map((part, i) => {
        const mentionMatch = part.match(/^<@(.+)>$/);
        if (mentionMatch) {
          return (
            <span key={i} className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-bold bg-blue-500/15 dark:bg-blue-400/15 rounded px-1 py-px text-xs">
              @{mentionMatch[1]}
            </span>
          );
        }
        const tagMatch = part.match(/^#(\w+)$/);
        if (tagMatch) {
          const tag = tagMatch[1];
          return (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); onTagClick?.(tag); }}
              className={`inline-flex items-center gap-0.5 font-bold rounded px-1 py-px text-xs cursor-pointer hover:opacity-80 ${getTagColor(tag)}`}
            >
              {tagMatch[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
