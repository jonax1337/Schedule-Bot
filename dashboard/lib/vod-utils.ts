export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function extractTags(content: string): string[] {
  const matches = content.match(/#(\w+)/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1)))];
}

export const TAG_COLORS = [
  'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15',
  'text-amber-600 dark:text-amber-400 bg-amber-500/15',
  'text-rose-600 dark:text-rose-400 bg-rose-500/15',
  'text-violet-600 dark:text-violet-400 bg-violet-500/15',
  'text-cyan-600 dark:text-cyan-400 bg-cyan-500/15',
  'text-orange-600 dark:text-orange-400 bg-orange-500/15',
];

export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
