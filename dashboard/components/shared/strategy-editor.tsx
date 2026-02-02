'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { common, createLowlight } from 'lowlight';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Link as LinkIcon,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus, ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Undo, Redo, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAuthHeaders } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { BOT_API_URL } from '@/lib/config';

const lowlight = createLowlight(common);

// --- Resizable Image Node View ---
function ResizableImageView({ node, updateAttributes, selected, editor }: any) {
  const [resizing, setResizing] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const isEditable = editor?.isEditable;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imgRef.current) return;
    setResizing(true);
    startX.current = e.clientX;
    startWidth.current = imgRef.current.offsetWidth;

    const onMouseMove = (ev: MouseEvent) => {
      const diff = ev.clientX - startX.current;
      const newWidth = Math.max(100, startWidth.current + diff);
      updateAttributes({ width: newWidth });
    };

    const onMouseUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [updateAttributes]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightboxOpen]);

  return (
    <NodeViewWrapper data-drag-handle>
      <div
        className="relative inline-block max-w-full"
        style={{ width: node.attrs.width ? `${node.attrs.width}px` : undefined }}
      >
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || ''}
          title={node.attrs.title || ''}
          className={cn(
            'rounded-lg max-w-full h-auto block',
            isEditable && selected && 'outline outline-2 outline-primary',
            !isEditable && 'cursor-zoom-in',
          )}
          style={{ width: '100%' }}
          draggable={false}
          onClick={!isEditable ? () => setLightboxOpen(true) : undefined}
        />
        {isEditable && selected && (
          <div
            className="absolute top-0 bottom-0 -right-1.5 w-3 cursor-col-resize flex items-center justify-center"
            onMouseDown={onMouseDown}
            title="Drag to resize"
          >
            <div className="w-1 h-8 rounded-full bg-primary" />
          </div>
        )}
      </div>
      {lightboxOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={node.attrs.src}
            alt={node.attrs.alt || ''}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </NodeViewWrapper>
  );
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attributes: any) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}px` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

interface StrategyEditorProps {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
}

export function StrategyEditor({ content, onChange, editable = true }: StrategyEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // replaced by lowlight version
      }),
      Underline,
      Link.configure({
        openOnClick: !editable,
        autolink: true,
        HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
      }),
      ResizableImage.configure({
        HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' },
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Placeholder.configure({
        placeholder: 'Write your strategy here...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] [&_img]:my-0',
          editable ? 'px-4 py-3' : 'cursor-default'
        ),
      },
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return;
    const formData = new FormData();
    formData.append('image', file);

    try {

      const headers = getAuthHeaders();
      // Remove Content-Type so browser sets multipart boundary
      delete (headers as any)['Content-Type'];

      const response = await fetch(`${BOT_API_URL}/api/strategies/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const data = await response.json();
      editor.chain().focus().setImage({ src: `${BOT_API_URL}${data.url}` }).run();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    }
  }, [editor]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    e.target.value = '';
  }, [uploadImage]);

  if (!editor) return null;

  if (!editable) {
    return <EditorContent editor={editor} />;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} active={editor.isActive('link')} title="Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Upload Image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 p-0',
        active && 'bg-muted text-foreground'
      )}
    >
      {children}
    </Button>
  );
}
