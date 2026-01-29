import { Client } from '@notionhq/client';
import { logger } from '../shared/utils/logger.js';

interface StratEntry {
  id: string;
  name: string;
  map: string | null;
  side: string | null;
  tags: string[];
  agents: string[];
  url: string;
  lastEdited: string;
}

interface NotionBlock {
  id: string;
  type: string;
  [key: string]: any;
}

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const CACHE_TTL = 60_000; // 60 seconds
const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

function getNotionClient(): Client | null {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) return null;
  return new Client({ auth: apiKey });
}

function getDatabaseId(): string | null {
  return process.env.NOTION_STRATS_DB_ID || null;
}

export async function getStrats(filter?: { map?: string; side?: string }): Promise<StratEntry[]> {
  const notion = getNotionClient();
  const databaseId = getDatabaseId();
  if (!notion || !databaseId) {
    return [];
  }

  const cacheKey = `strats:${filter?.map || ''}:${filter?.side || ''}`;
  const cached = getCached<StratEntry[]>(cacheKey);
  if (cached) return cached;

  try {
    const notionFilter: any[] = [];
    if (filter?.map) {
      notionFilter.push({ property: 'Map', select: { equals: filter.map } });
    }
    if (filter?.side) {
      notionFilter.push({ property: 'Side', select: { equals: filter.side } });
    }

    const queryParams: any = { database_id: databaseId };
    if (notionFilter.length === 1) {
      queryParams.filter = notionFilter[0];
    } else if (notionFilter.length > 1) {
      queryParams.filter = { and: notionFilter };
    }

    const response = await notion.databases.query(queryParams);

    const strats: StratEntry[] = response.results.map((page: any) => {
      const props = page.properties;
      return {
        id: page.id,
        name: props.Name?.title?.[0]?.plain_text || 'Untitled',
        map: props.Map?.select?.name || null,
        side: props.Side?.select?.name || null,
        tags: props.Tags?.multi_select?.map((t: any) => t.name) || [],
        agents: props.Agents?.multi_select?.map((a: any) => a.name) || [],
        url: page.url,
        lastEdited: page.last_edited_time,
      };
    });

    setCache(cacheKey, strats);
    return strats;
  } catch (error) {
    logger.error('Failed to fetch strats from Notion', error instanceof Error ? error.message : String(error));
    return [];
  }
}

export async function getStratContent(pageId: string): Promise<{ blocks: NotionBlock[] }> {
  const notion = getNotionClient();
  if (!notion) return { blocks: [] };

  const cacheKey = `strat-content:${pageId}`;
  const cached = getCached<{ blocks: NotionBlock[] }>(cacheKey);
  if (cached) return cached;

  try {
    const blocks = await fetchAllBlocks(notion, pageId);
    const result = { blocks };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    logger.error('Failed to fetch strat content from Notion', error instanceof Error ? error.message : String(error));
    return { blocks: [] };
  }
}

async function fetchAllBlocks(notion: Client, blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response: any = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      blocks.push(block as NotionBlock);
      // Recursively fetch children for blocks that have them
      if (block.has_children) {
        const children = await fetchAllBlocks(notion, block.id);
        (block as any).children = children;
      }
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

export function isNotionConfigured(): boolean {
  return !!(process.env.NOTION_API_KEY && process.env.NOTION_STRATS_DB_ID);
}
