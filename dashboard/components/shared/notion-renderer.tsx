'use client';

import React, { useState } from 'react';
import { FileText, Download, ExternalLink, ChevronDown, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RichText {
  plain_text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

interface NotionBlock {
  id: string;
  type: string;
  has_children?: boolean;
  children?: NotionBlock[];
  [key: string]: any;
}

// ─── Color mapping ───────────────────────────────────────────────────────────

const NOTION_COLORS: Record<string, string> = {
  gray: 'text-gray-500',
  brown: 'text-amber-700',
  orange: 'text-orange-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  pink: 'text-pink-500',
  red: 'text-red-500',
  gray_background: 'bg-gray-100 dark:bg-gray-800',
  brown_background: 'bg-amber-50 dark:bg-amber-900/30',
  orange_background: 'bg-orange-50 dark:bg-orange-900/30',
  yellow_background: 'bg-yellow-50 dark:bg-yellow-900/30',
  green_background: 'bg-green-50 dark:bg-green-900/30',
  blue_background: 'bg-blue-50 dark:bg-blue-900/30',
  purple_background: 'bg-purple-50 dark:bg-purple-900/30',
  pink_background: 'bg-pink-50 dark:bg-pink-900/30',
  red_background: 'bg-red-50 dark:bg-red-900/30',
};

function getColorClass(color?: string): string {
  if (!color || color === 'default') return '';
  return NOTION_COLORS[color] || '';
}

// ─── Rich Text Renderer ─────────────────────────────────────────────────────

function renderRichText(texts: RichText[]): React.ReactNode {
  if (!texts || texts.length === 0) return null;

  return texts.map((text, i) => {
    let content: React.ReactNode = text.plain_text;
    const ann = text.annotations;

    if (ann?.code) {
      content = (
        <code key={i} className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
          {content}
        </code>
      );
    }
    if (ann?.bold) content = <strong key={`b-${i}`}>{content}</strong>;
    if (ann?.italic) content = <em key={`i-${i}`}>{content}</em>;
    if (ann?.strikethrough) content = <s key={`s-${i}`}>{content}</s>;
    if (ann?.underline) content = <u key={`u-${i}`}>{content}</u>;

    const colorClass = getColorClass(ann?.color);

    if (text.href) {
      content = (
        <a
          key={`a-${i}`}
          href={text.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-primary underline hover:text-primary/80 ${colorClass}`}
        >
          {content}
        </a>
      );
    } else if (colorClass) {
      content = <span key={`c-${i}`} className={colorClass}>{content}</span>;
    }

    return <React.Fragment key={i}>{content}</React.Fragment>;
  });
}

// ─── Children Renderer ───────────────────────────────────────────────────────

function renderChildren(children?: NotionBlock[]) {
  if (!children || children.length === 0) return null;
  return (
    <div className="ml-4 mt-1">
      {children.map((child) => (
        <BlockRenderer key={child.id} block={child} />
      ))}
    </div>
  );
}

// ─── File URL Helper ─────────────────────────────────────────────────────────

function getFileUrl(data: any): string | null {
  return data?.file?.url || data?.external?.url || null;
}

function getFileName(data: any): string {
  if (data?.name) return data.name;
  const url = getFileUrl(data);
  if (!url) return 'File';
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop() || 'File';
    // Remove Notion's UUID prefix if present
    return name.replace(/^[a-f0-9-]{36}_/, '');
  } catch {
    return 'File';
  }
}

// ─── Block Renderer ──────────────────────────────────────────────────────────

function BlockRenderer({ block }: { block: NotionBlock }) {
  const { type } = block;
  const data = block[type];

  switch (type) {
    // ── Text blocks ──────────────────────────────────────────────────────
    case 'paragraph': {
      const colorClass = getColorClass(data?.color);
      return (
        <p className={`mb-3 leading-relaxed ${colorClass}`}>
          {renderRichText(data?.rich_text)}
        </p>
      );
    }

    case 'heading_1': {
      const colorClass = getColorClass(data?.color);
      return (
        <h1 className={`mb-4 mt-6 text-2xl font-bold first:mt-0 ${colorClass}`}>
          {renderRichText(data?.rich_text)}
          {data?.is_toggleable && renderChildren(block.children)}
        </h1>
      );
    }

    case 'heading_2': {
      const colorClass = getColorClass(data?.color);
      return (
        <h2 className={`mb-3 mt-5 text-xl font-semibold first:mt-0 ${colorClass}`}>
          {renderRichText(data?.rich_text)}
          {data?.is_toggleable && renderChildren(block.children)}
        </h2>
      );
    }

    case 'heading_3': {
      const colorClass = getColorClass(data?.color);
      return (
        <h3 className={`mb-2 mt-4 text-lg font-semibold first:mt-0 ${colorClass}`}>
          {renderRichText(data?.rich_text)}
          {data?.is_toggleable && renderChildren(block.children)}
        </h3>
      );
    }

    // ── List blocks ──────────────────────────────────────────────────────
    case 'bulleted_list_item':
      return (
        <li className="ml-4 mb-1 list-disc">
          {renderRichText(data?.rich_text)}
          {renderChildren(block.children)}
        </li>
      );

    case 'numbered_list_item':
      return (
        <li className="ml-4 mb-1 list-decimal">
          {renderRichText(data?.rich_text)}
          {renderChildren(block.children)}
        </li>
      );

    case 'to_do':
      return (
        <div className="mb-1 flex items-start gap-2">
          <input
            type="checkbox"
            checked={data?.checked || false}
            readOnly
            className="mt-1 rounded"
          />
          <span className={data?.checked ? 'line-through text-muted-foreground' : ''}>
            {renderRichText(data?.rich_text)}
          </span>
        </div>
      );

    // ── Media blocks ─────────────────────────────────────────────────────
    case 'image': {
      const src = getFileUrl(data);
      const caption = data?.caption;
      return (
        <figure className="mb-4">
          {src && (
            <img
              src={src}
              alt={caption?.[0]?.plain_text || 'Image'}
              className="max-w-full rounded-md"
              loading="lazy"
            />
          )}
          {caption && caption.length > 0 && (
            <figcaption className="mt-1 text-sm text-muted-foreground">
              {renderRichText(caption)}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'video': {
      const src = getFileUrl(data);
      const caption = data?.caption;
      if (!src) return null;

      // YouTube / Vimeo embeds
      const youtubeMatch = src.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
      const vimeoMatch = src.match(/vimeo\.com\/(\d+)/);

      if (youtubeMatch) {
        return (
          <figure className="mb-4">
            <div className="relative w-full overflow-hidden rounded-md" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {caption && caption.length > 0 && (
              <figcaption className="mt-1 text-sm text-muted-foreground">{renderRichText(caption)}</figcaption>
            )}
          </figure>
        );
      }

      if (vimeoMatch) {
        return (
          <figure className="mb-4">
            <div className="relative w-full overflow-hidden rounded-md" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
                className="absolute inset-0 h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
            {caption && caption.length > 0 && (
              <figcaption className="mt-1 text-sm text-muted-foreground">{renderRichText(caption)}</figcaption>
            )}
          </figure>
        );
      }

      return (
        <figure className="mb-4">
          <video src={src} controls className="max-w-full rounded-md">
            Your browser does not support the video tag.
          </video>
          {caption && caption.length > 0 && (
            <figcaption className="mt-1 text-sm text-muted-foreground">{renderRichText(caption)}</figcaption>
          )}
        </figure>
      );
    }

    case 'audio': {
      const src = getFileUrl(data);
      const caption = data?.caption;
      if (!src) return null;
      return (
        <figure className="mb-4">
          <audio src={src} controls className="w-full">
            Your browser does not support the audio tag.
          </audio>
          {caption && caption.length > 0 && (
            <figcaption className="mt-1 text-sm text-muted-foreground">{renderRichText(caption)}</figcaption>
          )}
        </figure>
      );
    }

    case 'file': {
      const src = getFileUrl(data);
      const name = getFileName(data);
      const caption = data?.caption;
      if (!src) return null;
      const isPdf = name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        return (
          <PdfEmbed src={src} name={name} caption={caption} renderRichText={renderRichText} />
        );
      }

      return (
        <div className="mb-4">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm font-medium">{name}</span>
            <Download className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </a>
          {caption && caption.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{renderRichText(caption)}</p>
          )}
        </div>
      );
    }

    case 'pdf': {
      const src = getFileUrl(data);
      const name = getFileName(data);
      const caption = data?.caption;
      if (!src) return null;
      return (
        <PdfEmbed src={src} name={name} caption={caption} renderRichText={renderRichText} />
      );
    }

    // ── Embed / Bookmark ─────────────────────────────────────────────────
    case 'embed': {
      const url = data?.url;
      const caption = data?.caption;
      if (!url) return null;
      return (
        <figure className="mb-4">
          <div className="relative w-full overflow-hidden rounded-md border" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={url}
              className="absolute inset-0 h-full w-full"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
          {caption && caption.length > 0 && (
            <figcaption className="mt-1 text-sm text-muted-foreground">{renderRichText(caption)}</figcaption>
          )}
        </figure>
      );
    }

    case 'bookmark': {
      const url = data?.url;
      const caption = data?.caption;
      if (!url) return null;
      let hostname = '';
      try { hostname = new URL(url).hostname; } catch { /* ignore */ }
      return (
        <div className="mb-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
              alt=""
              className="h-5 w-5 flex-shrink-0 rounded"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-primary">{url}</p>
              {caption && caption.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {caption.map((t: RichText) => t.plain_text).join('')}
                </p>
              )}
            </div>
            <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </a>
        </div>
      );
    }

    case 'link_preview': {
      const url = data?.url;
      if (!url) return null;
      let hostname = '';
      try { hostname = new URL(url).hostname; } catch { /* ignore */ }
      return (
        <div className="mb-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
          >
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
              alt=""
              className="h-5 w-5 flex-shrink-0 rounded"
            />
            <span className="flex-1 truncate text-sm text-primary">{url}</span>
            <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </a>
        </div>
      );
    }

    // ── Rich content blocks ──────────────────────────────────────────────
    case 'callout': {
      const colorClass = getColorClass(data?.color);
      return (
        <div className={`mb-4 flex gap-3 rounded-md border bg-muted/50 p-4 ${colorClass}`}>
          {data?.icon?.emoji && (
            <span className="text-lg flex-shrink-0">{data.icon.emoji}</span>
          )}
          {data?.icon?.external?.url && (
            <img src={data.icon.external.url} alt="" className="h-5 w-5 flex-shrink-0" />
          )}
          <div className="flex-1">
            {renderRichText(data?.rich_text)}
            {renderChildren(block.children)}
          </div>
        </div>
      );
    }

    case 'quote': {
      const colorClass = getColorClass(data?.color);
      return (
        <blockquote className={`mb-4 border-l-4 border-primary/50 pl-4 italic text-muted-foreground ${colorClass}`}>
          {renderRichText(data?.rich_text)}
          {renderChildren(block.children)}
        </blockquote>
      );
    }

    case 'code': {
      const language = data?.language || '';
      return (
        <div className="mb-4">
          {language && (
            <div className="rounded-t-md bg-muted/80 px-3 py-1 text-xs text-muted-foreground border border-b-0">
              {language}
            </div>
          )}
          <pre className={`overflow-x-auto bg-muted p-4 text-sm ${language ? 'rounded-b-md border border-t-0' : 'rounded-md'}`}>
            <code>{data?.rich_text?.map((t: RichText) => t.plain_text).join('')}</code>
          </pre>
          {data?.caption && data.caption.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{renderRichText(data.caption)}</p>
          )}
        </div>
      );
    }

    case 'equation':
      return (
        <div className="mb-3 overflow-x-auto rounded-md bg-muted p-3 text-center font-mono text-sm">
          {data?.expression}
        </div>
      );

    // ── Structure blocks ─────────────────────────────────────────────────
    case 'divider':
      return <hr className="my-4 border-border" />;

    case 'toggle':
      return (
        <details className="mb-3 rounded-md border p-3">
          <summary className="cursor-pointer font-medium">
            {renderRichText(data?.rich_text)}
          </summary>
          {renderChildren(block.children)}
        </details>
      );

    case 'column_list':
      return (
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
          {block.children?.map((col: NotionBlock) => (
            <div key={col.id} className="flex-1 min-w-0">
              {col.children?.map((child: NotionBlock) => (
                <BlockRenderer key={child.id} block={child} />
              ))}
            </div>
          ))}
        </div>
      );

    case 'column':
      // Columns are rendered by column_list
      return null;

    // ── Table blocks ─────────────────────────────────────────────────────
    case 'table': {
      const hasColumnHeader = data?.has_column_header;
      const hasRowHeader = data?.has_row_header;
      const rows = block.children || [];
      return (
        <div className="mb-4 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row: NotionBlock, rowIdx: number) => {
                const cells = row.table_row?.cells || [];
                const isHeaderRow = hasColumnHeader && rowIdx === 0;
                return (
                  <tr key={row.id} className={isHeaderRow ? 'bg-muted/50 font-medium' : 'border-t'}>
                    {cells.map((cell: RichText[], cellIdx: number) => {
                      const isHeaderCell = isHeaderRow || (hasRowHeader && cellIdx === 0);
                      const Tag = isHeaderCell ? 'th' : 'td';
                      return (
                        <Tag key={cellIdx} className="px-3 py-2 text-left">
                          {renderRichText(cell)}
                        </Tag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    case 'table_row':
      // Rendered by table
      return null;

    // ── Sub-page / Link / Synced ─────────────────────────────────────────
    case 'child_page':
      return (
        <div className="mb-3 flex items-center gap-2 rounded-md border p-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{data?.title || 'Untitled'}</span>
        </div>
      );

    case 'child_database':
      return (
        <div className="mb-3 flex items-center gap-2 rounded-md border p-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{data?.title || 'Database'}</span>
          <span className="text-xs text-muted-foreground">(embedded database)</span>
        </div>
      );

    case 'synced_block':
      // Synced blocks have children that contain the actual content
      return <>{renderChildren(block.children)}</>;

    case 'link_to_page':
      return (
        <div className="mb-3 flex items-center gap-2 rounded-md border p-3">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Link to page</span>
        </div>
      );

    case 'table_of_contents':
      return (
        <div className="mb-4 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground italic">
          Table of Contents (visible in Notion)
        </div>
      );

    case 'breadcrumb':
      return null; // Not useful outside Notion

    // ── Fallback for unsupported ─────────────────────────────────────────
    default:
      return (
        <div className="mb-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Unsupported block type: <code className="bg-muted px-1 rounded">{type}</code>
        </div>
      );
  }
}

// ─── PDF Viewer Component ────────────────────────────────────────────────────

function PdfEmbed({ src, name, caption, renderRichText }: {
  src: string;
  name: string;
  caption?: RichText[];
  renderRichText: (rt: RichText[]) => React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="mb-4">
      <div className="overflow-hidden rounded-lg border bg-card">
        {/* Toolbar */}
        <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
          <FileText className="h-4 w-4 flex-shrink-0 text-red-500" />
          <span className="flex-1 truncate text-sm font-medium">{name}</span>
          <div className="flex items-center gap-1">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={src}
              download
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Download"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>
        {/* PDF iframe — always mounted so it preloads, hidden when collapsed */}
        <div className={collapsed ? 'hidden' : 'relative bg-muted/20'}>
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span className="text-xs">Loading PDF…</span>
              </div>
            </div>
          )}
          <iframe
            src={src}
            className={`h-[600px] w-full transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
            title={name}
            onLoad={() => setLoaded(true)}
          />
        </div>
      </div>
      {caption && caption.length > 0 && (
        <p className="mt-1.5 text-sm text-muted-foreground">{renderRichText(caption)}</p>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function NotionRenderer({ blocks }: { blocks: NotionBlock[] }) {
  if (!blocks || blocks.length === 0) {
    return <p className="text-muted-foreground">No content.</p>;
  }

  // Group consecutive list items into proper list wrappers
  const grouped: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let listItems: NotionBlock[] = [];

  function flushList(key: string) {
    if (listItems.length === 0) return;
    const items = listItems.map(b => <BlockRenderer key={b.id} block={b} />);
    if (listType === 'ul') {
      grouped.push(<ul key={key} className="mb-3">{items}</ul>);
    } else {
      grouped.push(<ol key={key} className="mb-3">{items}</ol>);
    }
    listItems = [];
    listType = null;
  }

  blocks.forEach((block, i) => {
    const blockListType: 'ul' | 'ol' | null =
      block.type === 'bulleted_list_item' ? 'ul'
      : block.type === 'numbered_list_item' ? 'ol'
      : null;

    if (blockListType) {
      if (listType === blockListType) {
        listItems.push(block);
      } else {
        flushList(`list-${i}`);
        listType = blockListType;
        listItems = [block];
      }
    } else {
      flushList(`list-${i}`);
      grouped.push(<BlockRenderer key={block.id} block={block} />);
    }
  });

  flushList('list-end');

  return (
    <div className="prose-custom">
      {grouped}
    </div>
  );
}
