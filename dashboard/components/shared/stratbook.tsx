'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BookOpen, ExternalLink, FileText, Loader2, Search, Swords, Shield, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { useBreadcrumbSub } from '@/lib/breadcrumb-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { stagger, microInteractions } from '@/lib/animations';
import { StrategyViewer } from './strategy-viewer';
import { StrategyForm } from './strategy-form';
import { PdfPreviewDialog } from './pdf-preview-dialog';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { BOT_API_URL } from '@/lib/config';

interface StratEntry {
  id: number;
  title: string;
  map: string | null;
  side: string | null;
  tags: string[];
  agents: string[];
  authorId: string;
  authorName: string;
  content?: any;
  files?: { id: number; filename: string; originalName: string; size: number }[];
  createdAt: string;
  updatedAt: string;
}

function getSideBadgeClasses(side: string): string {
  return side === 'Attack'
    ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-500/30'
    : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500/30';
}

function getMapBadgeClasses(): string {
  return 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-500/30';
}

function normalizeAgentName(name: string): string {
  return name.replace(/\//g, '');
}

type View = 'list' | 'detail' | 'create' | 'edit';

export function Stratbook() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stratParam = searchParams.get('strat');

  const [strats, setStrats] = useState<StratEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapFilter, setMapFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // View transition state
  const [view, setView] = useState<View>(stratParam ? 'detail' : 'list');
  const [transitioning, setTransitioning] = useState(false);

  // Detail/edit view
  const [selectedStrat, setSelectedStrat] = useState<StratEntry | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const { setSubPage } = useBreadcrumbSub();

  // Permission
  const [canEdit, setCanEdit] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<StratEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // PDF preview
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  // Content cache
  const contentCache = useRef<Record<number, any>>({});
  const initialDeepLinkHandled = useRef(false);

  const setStratParam = useCallback((stratId: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (stratId !== null) {
      params.set('strat', String(stratId));
    } else {
      params.delete('strat');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const goBack = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setSelectedStrat(null);
      setSubPage(null);
      setStratParam(null);
      setView('list');
      requestAnimationFrame(() => setTransitioning(false));
    }, 150);
  }, [setSubPage, setStratParam]);

  useEffect(() => {
    return () => setSubPage(null);
  }, [setSubPage]);

  useEffect(() => {
    fetchStrats();
    checkPermission();
  }, [mapFilter, sideFilter]);

  // Deep link handling
  useEffect(() => {
    if (initialDeepLinkHandled.current || !stratParam || strats.length === 0) return;
    initialDeepLinkHandled.current = true;
    const id = parseInt(stratParam, 10);
    const target = strats.find(s => s.id === id);
    if (target) openStrat(target, true);
  }, [strats, stratParam]);

  const checkPermission = async () => {
    try {
      const { getAuthHeaders, getAuthToken } = await import('@/lib/auth');
      const headers = getAuthHeaders();
      // Fetch settings to check editPermission
      const res = await fetch(`${BOT_API_URL}/api/settings`, { headers });
      if (res.ok) {
        const settings = await res.json();
        const editPerm = settings?.stratbook?.editPermission || 'admin';
        // Check if current user is admin or if all users can edit
        const token = getAuthToken();
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCanEdit(payload.role === 'admin' || editPerm === 'all');
          } catch {
            setCanEdit(false);
          }
        }
      }
    } catch {
      setCanEdit(false);
    }
  };

  const fetchStrats = async () => {
    try {
      setLoading(true);
      const { getAuthHeaders } = await import('@/lib/auth');
      const params = new URLSearchParams();
      if (mapFilter !== 'all') params.set('map', mapFilter);
      if (sideFilter !== 'all') params.set('side', sideFilter);

      const url = `${BOT_API_URL}/api/strategies${params.toString() ? `?${params}` : ''}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setStrats(data.strategies || []);
    } catch (error) {
      toast.error('Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async (id: number): Promise<{ content: any; files?: any[] }> => {
    if (contentCache.current[id]) return contentCache.current[id];
    const { getAuthHeaders } = await import('@/lib/auth');
    const response = await fetch(`${BOT_API_URL}/api/strategies/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch content');
    const data = await response.json();
    const result = { content: data.strategy?.content || {}, files: data.strategy?.files || [] };
    contentCache.current[id] = result;
    return result;
  };

  const handleStratHover = (id: number) => {
    if (!contentCache.current[id]) {
      fetchContent(id).catch(() => {});
    }
  };

  const openStrat = async (strat: StratEntry, skipTransition = false) => {
    if (!skipTransition) {
      setTransitioning(true);
      await new Promise(r => setTimeout(r, 150));
    }
    setSelectedStrat(strat);
    setSubPage({ label: strat.title, onNavigateBack: goBack });
    setStratParam(strat.id);
    setView('detail');
    setLoadingContent(true);
    if (!skipTransition) requestAnimationFrame(() => setTransitioning(false));
    try {
      const { content, files } = await fetchContent(strat.id);
      setSelectedStrat(prev => prev ? { ...prev, content, files } : null);
    } catch {
      toast.error('Failed to load strategy content');
    } finally {
      setLoadingContent(false);
    }
  };

  const handleCreate = () => {
    setTransitioning(true);
    setTimeout(() => {
      setSubPage({ label: 'New Strategy', onNavigateBack: goBack });
      setView('create');
      requestAnimationFrame(() => setTransitioning(false));
    }, 150);
  };

  const handleEdit = () => {
    if (!selectedStrat) return;
    setTransitioning(true);
    setTimeout(() => {
      setSubPage({ label: `Edit: ${selectedStrat.title}`, onNavigateBack: () => openStrat(selectedStrat) });
      setView('edit');
      requestAnimationFrame(() => setTransitioning(false));
    }, 150);
  };

  const handleSaved = (strategy: StratEntry) => {
    // Invalidate cache
    delete contentCache.current[strategy.id];
    fetchStrats();
    openStrat(strategy);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete');
      toast.success('Strategy deleted');
      delete contentCache.current[deleteTarget.id];
      setDeleteTarget(null);
      goBack();
      fetchStrats();
    } catch {
      toast.error('Failed to delete strategy');
    } finally {
      setDeleting(false);
    }
  };

  const hasActiveFilters = mapFilter !== 'all' || sideFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setMapFilter('all');
    setSideFilter('all');
    setSearchQuery('');
  };

  const availableMaps = [...new Set(strats.map(s => s.map).filter(Boolean))].sort() as string[];

  const filteredStrats = strats.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q)) ||
      s.agents.some(a => a.toLowerCase().includes(q))
    );
  });

  // Loading state
  if (loading && !selectedStrat && view === 'list') {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-scaleIn">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  const viewClasses = transitioning
    ? 'opacity-0 translate-y-2'
    : 'opacity-100 translate-y-0';

  return (
    <>
      <div className={cn('transition-all duration-200 ease-out', viewClasses)}>
        {/* Create view */}
        {view === 'create' && (
          <StrategyForm onSaved={handleSaved} onCancel={goBack} />
        )}

        {/* Edit view */}
        {view === 'edit' && selectedStrat && (
          <StrategyForm
            strategyId={selectedStrat.id}
            initialData={{
              title: selectedStrat.title,
              map: selectedStrat.map,
              side: selectedStrat.side,
              tags: selectedStrat.tags,
              agents: selectedStrat.agents,
              content: selectedStrat.content || { type: 'doc', content: [{ type: 'paragraph' }] },
            }}
            onSaved={handleSaved}
            onCancel={() => openStrat(selectedStrat)}
          />
        )}

        {/* Detail view */}
        {view === 'detail' && selectedStrat && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-xl">{selectedStrat.title}</CardTitle>
                  {canEdit && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEdit}
                        className={microInteractions.activePress}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteTarget(selectedStrat)}
                        className={cn("text-destructive hover:text-destructive", microInteractions.activePress)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
                {selectedStrat.agents.length > 0 && (
                  <div className="flex gap-1.5">
                    {selectedStrat.agents.map(agent => (
                      <img
                        key={agent}
                        src={`/assets/agents/${normalizeAgentName(agent)}_icon.webp`}
                        alt={agent}
                        title={agent}
                        className="w-7 h-7 rounded border border-primary/50"
                      />
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
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
                  {selectedStrat.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {loadingContent ? (
                  <div className="min-h-[200px] flex items-center justify-center">
                    <div className="animate-scaleIn">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  </div>
                ) : (
                  <div className="animate-fadeIn">
                    <StrategyViewer content={selectedStrat.content || {}} />
                    {selectedStrat.files && selectedStrat.files.length > 0 && (
                      <div className="mt-6 pt-4 border-t space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
                        <div className="space-y-1.5">
                          {selectedStrat.files.map(file => (
                            <button
                              key={file.id}
                              className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors w-full text-left"
                              onClick={() => setPdfPreview({
                                url: `${BOT_API_URL}/api/strategies/files/${file.filename}`,
                                title: file.originalName,
                              })}
                            >
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm truncate flex-1">{file.originalName}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {(file.size / 1024).toFixed(0)} KB
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <PdfPreviewDialog
              open={!!pdfPreview}
              onOpenChange={open => { if (!open) setPdfPreview(null); }}
              url={pdfPreview?.url || ''}
              title={pdfPreview?.title || ''}
            />
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="space-y-6">
            <Card className={stagger(0, 'fast', 'fadeIn')}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Stratbook
                    </CardTitle>
                    <CardDescription>
                      Browse and search team strategies.
                    </CardDescription>
                  </div>
                  {canEdit && (
                    <Button size="sm" onClick={handleCreate} className={microInteractions.activePress}>
                      <Plus className="h-4 w-4 mr-1" />
                      New Strategy
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Filter bar */}
              <div className="border-b pb-4 px-3 sm:px-6 space-y-3">
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
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 w-full sm:w-auto">
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
                        : 'No strategies yet. Create your first one!'}
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
                            {strat.title}
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
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Strategy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
