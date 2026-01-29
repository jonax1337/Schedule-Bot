'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, ExternalLink, Loader2, Search, Swords, Shield, X } from 'lucide-react';
import { useBreadcrumbSub } from '@/lib/breadcrumb-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { stagger, microInteractions } from '@/lib/animations';
import { NotionRenderer } from './notion-renderer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

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

function getSideBadgeClasses(side: string): string {
  return side === 'Attack'
    ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-500/30'
    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500/30';
}

function getMapBadgeClasses(): string {
  return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-500/30';
}

/** Normalize agent name from Notion (e.g. "KAY/O") to file name (e.g. "KAYO") */
function normalizeAgentName(name: string): string {
  return name.replace(/\//g, '');
}

export function Stratbook() {
  const [strats, setStrats] = useState<StratEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [mapFilter, setMapFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail view
  const [selectedStrat, setSelectedStrat] = useState<StratEntry | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const { setSubPage } = useBreadcrumbSub();

  // Prefetch cache: strat id → blocks
  const prefetchCache = React.useRef<Record<string, any[]>>({});

  const goBack = useCallback(() => {
    setSelectedStrat(null);
    setBlocks([]);
    setSubPage(null);
  }, [setSubPage]);

  useEffect(() => {
    // Clean up breadcrumb on unmount (tab switch)
    return () => setSubPage(null);
  }, [setSubPage]);

  useEffect(() => {
    fetchStrats();
  }, [mapFilter, sideFilter]);

  const fetchStrats = async () => {
    try {
      setLoading(true);
      const { BOT_API_URL } = await import('@/lib/config');
      const { getAuthHeaders } = await import('@/lib/auth');

      const params = new URLSearchParams();
      if (mapFilter !== 'all') params.set('map', mapFilter);
      if (sideFilter !== 'all') params.set('side', sideFilter);

      const url = `${BOT_API_URL}/api/stratbook${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, { headers: getAuthHeaders() });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setStrats(data.strats || []);
      setConfigured(data.configured !== false);
    } catch (error) {
      toast.error('Failed to load stratbook');
    } finally {
      setLoading(false);
    }
  };

  /** Fetch blocks for a strat, returns from cache if available */
  const fetchBlocks = async (stratId: string): Promise<any[]> => {
    if (prefetchCache.current[stratId]) return prefetchCache.current[stratId];
    const { BOT_API_URL } = await import('@/lib/config');
    const { getAuthHeaders } = await import('@/lib/auth');
    const response = await fetch(`${BOT_API_URL}/api/stratbook/${stratId}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch content');
    const data = await response.json();
    const blocks = data.blocks || [];
    prefetchCache.current[stratId] = blocks;
    // Prefetch any PDF/file URLs so the browser caches them
    prefetchFileUrls(blocks);
    return blocks;
  };

  /** Extract file/pdf URLs from blocks and inject <link rel="prefetch"> */
  const prefetchFileUrls = (blocks: any[]) => {
    for (const block of blocks) {
      const data = block[block.type];
      if (!data) continue;
      const url =
        data?.file?.url || data?.external?.url || null;
      if (url && typeof url === 'string') {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        link.as = url.toLowerCase().endsWith('.pdf') ? 'document' : 'fetch';
        document.head.appendChild(link);
      }
      // Recurse into children
      if (data?.children) prefetchFileUrls(data.children);
    }
  };

  /** Prefetch on hover (fire-and-forget) */
  const handleStratHover = (stratId: string) => {
    if (!prefetchCache.current[stratId]) {
      fetchBlocks(stratId).catch(() => {});
    }
  };

  const openStrat = async (strat: StratEntry) => {
    setSelectedStrat(strat);
    setSubPage({ label: strat.name, onNavigateBack: goBack });
    setLoadingContent(true);
    try {
      const fetchedBlocks = await fetchBlocks(strat.id);
      setBlocks(fetchedBlocks);
    } catch (error) {
      toast.error('Failed to load strat content');
      setBlocks([]);
    } finally {
      setLoadingContent(false);
    }
  };

  const hasActiveFilters = mapFilter !== 'all' || sideFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setMapFilter('all');
    setSideFilter('all');
    setSearchQuery('');
  };

  // Derive unique maps from strats for filter
  const availableMaps = [...new Set(strats.map(s => s.map).filter(Boolean))].sort() as string[];

  const filteredStrats = strats.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q)) ||
      s.agents.some(a => a.toLowerCase().includes(q))
    );
  });

  // Not configured state
  if (!configured) {
    return (
      <div className="py-12 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Stratbook not configured</p>
        <p className="text-xs text-muted-foreground mt-1">
          Set <code className="bg-muted px-1 rounded">NOTION_API_KEY</code> and{' '}
          <code className="bg-muted px-1 rounded">NOTION_STRATS_DB_ID</code> environment
          variables to connect your Notion stratbook.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading && !selectedStrat) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-scaleIn">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  // Detail view
  if (selectedStrat) {
    return (
      <div className="space-y-6">
        <Card className="animate-fadeIn">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">{selectedStrat.name}</CardTitle>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {selectedStrat.map && (
                    <Badge variant="outline" className={getMapBadgeClasses()}>
                      {selectedStrat.map}
                    </Badge>
                  )}
                  {selectedStrat.side && (
                    <Badge variant="outline" className={getSideBadgeClasses(selectedStrat.side)}>
                      {selectedStrat.side === 'Attack' ? (
                        <Swords className="h-3 w-3 mr-1" />
                      ) : (
                        <Shield className="h-3 w-3 mr-1" />
                      )}
                      {selectedStrat.side}
                    </Badge>
                  )}
                  {selectedStrat.agents.map(agent => (
                    <img
                      key={agent}
                      src={`/assets/agents/${normalizeAgentName(agent)}_icon.webp`}
                      alt={agent}
                      title={agent}
                      className="w-6 h-6 rounded border border-primary/50"
                    />
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className={cn("flex-shrink-0", microInteractions.activePress)}
              >
                <a href={selectedStrat.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Open in Notion</span>
                  <span className="sm:hidden">Notion</span>
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingContent ? (
              <div className="min-h-[200px] flex items-center justify-center">
                <div className="animate-scaleIn">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <NotionRenderer blocks={blocks} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Main content card */}
      <Card className={stagger(0, 'fast', 'fadeIn')}>
        {/* Filter bar */}
        <div className="border-b pb-4 px-3 sm:px-6 pt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search strats..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className={cn("pl-9 w-full", microInteractions.focusRing)}
              />
            </div>
            <Select value={mapFilter} onValueChange={setMapFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Map" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All Maps</SelectItem>
                {availableMaps.map(map => (
                  <SelectItem key={map} value={map}>{map}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sideFilter} onValueChange={setSideFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Side" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Both Sides</SelectItem>
                <SelectItem value="Attack">Attack</SelectItem>
                <SelectItem value="Defense">Defense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
              <div className="text-sm text-muted-foreground sm:ml-auto">
                Showing {filteredStrats.length} of {strats.length} strats
              </div>
            </div>
          )}
        </div>

        {/* Strats grid */}
        <CardContent className="pt-4">
          {filteredStrats.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters
                  ? 'No strats found with selected filters. Try adjusting filters.'
                  : 'No strats found. Add strategies in Notion to get started!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStrats.map((strat, index) => (
                <Card
                  key={strat.id}
                  className={cn(
                    'cursor-pointer border overflow-hidden relative',
                    stagger(index, 'fast', 'fadeIn'),
                    microInteractions.hoverLift
                  )}
                  onMouseEnter={() => handleStratHover(strat.id)}
                  onClick={() => openStrat(strat)}
                >
                  {strat.map && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-25"
                      style={{ backgroundImage: `url(/assets/maps/Loading_Screen_${strat.map}.webp)` }}
                    />
                  )}
                  <CardHeader className="pb-2 relative">
                    <CardTitle className="text-sm font-medium leading-snug">
                      {strat.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 relative">
                    <div className="flex flex-wrap gap-1.5">
                      {strat.map && (
                        <Badge variant="outline" className={cn("text-xs", getMapBadgeClasses())}>
                          {strat.map}
                        </Badge>
                      )}
                      {strat.side && (
                        <Badge variant="outline" className={cn("text-xs", getSideBadgeClasses(strat.side))}>
                          {strat.side === 'Attack' ? (
                            <Swords className="h-2.5 w-2.5 mr-0.5" />
                          ) : (
                            <Shield className="h-2.5 w-2.5 mr-0.5" />
                          )}
                          {strat.side}
                        </Badge>
                      )}
                      {strat.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {strat.agents.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t">
                        {strat.agents.map(agent => (
                          <img
                            key={agent}
                            src={`/assets/agents/${normalizeAgentName(agent)}_icon.webp`}
                            alt={agent}
                            title={agent}
                            className="w-6 h-6 rounded border border-primary/50"
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
