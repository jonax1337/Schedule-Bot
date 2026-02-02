'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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

export interface MentionUser {
  name: string;
  avatarUrl: string | null;
}

export function MentionInput({
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
