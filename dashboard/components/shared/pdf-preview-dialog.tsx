'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function PdfPreviewDialog({ open, onOpenChange, url, title }: PdfPreviewDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={() => onOpenChange(false)}
    >
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <span className="text-white/80 text-sm font-medium truncate max-w-[80%]">{title}</span>
        <button
          className="text-white/80 hover:text-white transition-colors"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <iframe
        src={url}
        title={title}
        className="w-[90vw] h-[85vh] rounded-lg border-0"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
