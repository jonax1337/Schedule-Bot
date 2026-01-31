'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BookOpen, Copy, ExternalLink, FileText, Folder, FolderOpen, FolderPlus, FolderInput, Loader2, Palette, Pencil, Plus, Search, Swords, Shield, Trash2, X } from 'lucide-react';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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

const FOLDER_COLORS = [
  { label: 'None', value: null },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
];

interface FolderEntry {
  id: number;
  name: string;
  parentId: number | null;
  color: string | null;
}

interface StratEntry {
  id: number;
  title: string;
  map: string | null;
  side: string | null;
  tags: string[];
  agents: string[];
  folderId?: number | null;
  authorId: string;
  authorName: string;
  content?: any;
  files?: { id: number; filename: string; originalName: string; size: number }[];
  createdAt: string;
  updatedAt: string;
}


function normalizeAgentName(name: string): string {
  return name.replace(/\//g, '');
}

type View = 'list' | 'detail' | 'create' | 'edit';

export function Stratbook() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stratParam = searchParams.get('strat');
  const folderParam = searchParams.get('folder');

  const [strats, setStrats] = useState<StratEntry[]>([]);
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(
    folderParam ? parseInt(folderParam, 10) || null : null
  );
  const [folderPath, setFolderPath] = useState<FolderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [mapFilter, setMapFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Folder dialogs
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<FolderEntry | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<FolderEntry | null>(null);

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

  // Move to folder
  const [allFolders, setAllFolders] = useState<FolderEntry[]>([]);
  const [allFoldersLoaded, setAllFoldersLoaded] = useState(false);

  // PDF preview
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null);

  // Content cache
  const contentCache = useRef<Record<number, any>>({});
  const initialDeepLinkHandled = useRef(false);

  const updateUrlParams = useCallback((updates: { strat?: number | null; folder?: number | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if ('strat' in updates) {
      if (updates.strat !== null && updates.strat !== undefined) {
        params.set('strat', String(updates.strat));
      } else {
        params.delete('strat');
      }
    }
    if ('folder' in updates) {
      if (updates.folder !== null && updates.folder !== undefined) {
        params.set('folder', String(updates.folder));
      } else {
        params.delete('folder');
      }
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const setStratParam = useCallback((stratId: number | null) => {
    updateUrlParams({ strat: stratId });
  }, [updateUrlParams]);

  // Ref to break circular dep between navigateToFolder <-> updateBreadcrumbForFolder
  const navigateToFolderRef = useRef<(id: number | null) => void>(() => {});

  const updateBreadcrumbForFolder = useCallback((path: FolderEntry[]) => {
    if (path.length === 0) {
      setSubPage(null);
      return;
    }
    const currentFolder = path[path.length - 1];
    const trail = path.slice(0, -1).map(f => ({
      label: f.name,
      onClick: () => navigateToFolderRef.current(f.id),
    }));
    setSubPage({
      label: currentFolder.name,
      onNavigateBack: () => navigateToFolderRef.current(null),
      trail,
    });
  }, [setSubPage]);

  const navigateToFolder = useCallback((folderId: number | null) => {
    setCurrentFolderId(folderId);
    updateUrlParams({ folder: folderId });
    if (folderId === null) {
      setFolderPath([]);
      updateBreadcrumbForFolder([]);
    } else {
      (async () => {
        try {
          const { getAuthHeaders } = await import('@/lib/auth');
          const response = await fetch(`${BOT_API_URL}/api/strategies/folders/${folderId}/path`, { headers: getAuthHeaders() });
          if (response.ok) {
            const data = await response.json();
            const newPath = data.path || [];
            setFolderPath(newPath);
            updateBreadcrumbForFolder(newPath);
          }
        } catch { /* ignore */ }
      })();
    }
  }, [updateUrlParams, updateBreadcrumbForFolder]);

  // Keep ref in sync
  navigateToFolderRef.current = navigateToFolder;

  const goBack = useCallback(() => {
    setTransitioning(true);
    setTimeout(() => {
      setSelectedStrat(null);
      setStratParam(null);
      setView('list');
      updateBreadcrumbForFolder(folderPath);
      requestAnimationFrame(() => setTransitioning(false));
    }, 150);
  }, [setStratParam, folderPath, updateBreadcrumbForFolder]);

  useEffect(() => {
    return () => { setSubPage(null); };
  }, [setSubPage]);

  useEffect(() => {
    fetchStrats();
    fetchFolders();
    checkPermission();
  }, [mapFilter, sideFilter, currentFolderId]);

  // Load folder path on mount if deep-linked to a folder
  useEffect(() => {
    if (currentFolderId !== null) {
      navigateToFolder(currentFolderId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (initialLoad) setLoading(true);
      const { getAuthHeaders } = await import('@/lib/auth');
      const params = new URLSearchParams();
      if (mapFilter !== 'all') params.set('map', mapFilter);
      if (sideFilter !== 'all') params.set('side', sideFilter);
      // When searching, don't filter by folder (search across all)
      if (!searchQuery) {
        params.set('folderId', currentFolderId !== null ? String(currentFolderId) : 'null');
      }

      const url = `${BOT_API_URL}/api/strategies?${params}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setStrats(data.strategies || []);
    } catch (error) {
      toast.error('Failed to load strategies');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  const fetchFolders = async () => {
    setAllFoldersLoaded(false);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const params = new URLSearchParams();
      params.set('parentId', currentFolderId !== null ? String(currentFolderId) : 'null');
      const response = await fetch(`${BOT_API_URL}/api/strategies/folders?${params}`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setFolders(data.folders || []);
      }
    } catch { /* ignore */ }
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/folders`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim(), parentId: currentFolderId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create folder');
      }
      toast.success('Folder created');
      setFolderDialogOpen(false);
      setFolderName('');
      fetchFolders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create folder');
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolder || !folderName.trim()) return;
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/folders/${renamingFolder.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to rename folder');
      }
      toast.success('Folder renamed');
      setRenamingFolder(null);
      setFolderName('');
      fetchFolders();
      // Refresh breadcrumb with updated folder name
      if (currentFolderId !== null) navigateToFolder(currentFolderId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/folders/${deletingFolder.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Folder is not empty');
      }
      toast.success('Folder deleted');
      setDeletingFolder(null);
      fetchFolders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete folder');
    }
  };

  const handleDuplicateStrategy = async (strat: StratEntry) => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/duplicate/${strat.id}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: currentFolderId }),
      });
      if (!response.ok) throw new Error('Failed to duplicate');
      toast.success('Strategy duplicated');
      fetchStrats();
    } catch {
      toast.error('Failed to duplicate strategy');
    }
  };

  const handleDuplicateFolder = async (folder: FolderEntry) => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/folders/${folder.id}/duplicate`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to duplicate');
      toast.success('Folder duplicated');
      fetchFolders();
    } catch {
      toast.error('Failed to duplicate folder');
    }
  };

  const handleFolderColor = async (folder: FolderEntry, color: string | null) => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/folders/${folder.id}/color`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      if (!response.ok) throw new Error('Failed to update color');
      fetchFolders();
    } catch {
      toast.error('Failed to update folder color');
    }
  };

  const fetchAllFolders = async () => {
    if (allFoldersLoaded) return;
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/folders?all=true`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setAllFolders(data.folders || []);
        setAllFoldersLoaded(true);
      }
    } catch { /* ignore */ }
  };

  const buildFolderTree = (folders: FolderEntry[]): { id: number | null; label: string; depth: number }[] => {
    const result: { id: number | null; label: string; depth: number }[] = [{ id: null, label: 'Stratbook', depth: 0 }];
    const childrenMap = new Map<number | null, FolderEntry[]>();
    for (const f of folders) {
      const children = childrenMap.get(f.parentId) || [];
      children.push(f);
      childrenMap.set(f.parentId, children);
    }
    const walk = (parentId: number | null, depth: number) => {
      const children = childrenMap.get(parentId) || [];
      for (const child of children) {
        result.push({ id: child.id, label: child.name, depth });
        walk(child.id, depth + 1);
      }
    };
    walk(null, 1);
    return result;
  };

  const handleMoveStrategy = async (stratId: number, targetFolderId: number | null) => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/strategies/move/${stratId}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      if (!response.ok) throw new Error('Failed to move strategy');
      toast.success('Strategy moved');
      fetchStrats();
    } catch {
      toast.error('Failed to move strategy');
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
    const trail = folderPath.map(f => ({
      label: f.name,
      onClick: () => { goBack(); navigateToFolder(f.id); },
    }));
    setSubPage({ label: strat.title, onNavigateBack: goBack, trail });
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
          <StrategyForm onSaved={handleSaved} onCancel={goBack} folderId={currentFolderId} />
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
          <div className="space-y-4">
            <Card className={stagger(0, 'fast', 'slideUpScale')}>
              <CardHeader className="space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{selectedStrat.title}</CardTitle>
                    {selectedStrat.side && (
                      <span className={cn("inline-flex", selectedStrat.side === 'Attack' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')} title={selectedStrat.side}>
                        {selectedStrat.side === 'Attack' ? <Swords className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                      </span>
                    )}
                  </div>
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
                {selectedStrat.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedStrat.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
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
            <Card className={stagger(0, 'fast', 'slideUpScale')}>
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
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setFolderName(''); setFolderDialogOpen(true); }} className={microInteractions.activePress}>
                        <FolderPlus className="h-4 w-4 mr-1" />
                        Folder
                      </Button>
                      <Button size="sm" onClick={handleCreate} className={microInteractions.activePress}>
                        <Plus className="h-4 w-4 mr-1" />
                        Strategy
                      </Button>
                    </div>
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
                <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div>
                {filteredStrats.length === 0 && folders.length === 0 ? (
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
                    {/* Folder cards */}
                    {!searchQuery && folders.map((folder, index) => (
                      <ContextMenu key={`folder-${folder.id}`}>
                        <ContextMenuTrigger asChild>
                          <Card
                            className={cn(
                              'cursor-pointer border overflow-hidden h-[160px]',
                              stagger(index, 'fast', 'fadeIn'),
                              microInteractions.hoverLift
                            )}
                            style={folder.color ? { borderLeftWidth: '3px', borderLeftColor: folder.color } : undefined}
                            onClick={() => navigateToFolder(folder.id)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium leading-snug flex items-center gap-2">
                                <Folder className="h-4 w-4 shrink-0" style={folder.color ? { color: folder.color } : undefined} />
                                {folder.name}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0" />
                          </Card>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => navigateToFolder(folder.id)}>
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Open
                          </ContextMenuItem>
                          {canEdit && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem onClick={() => { setFolderName(folder.name); setRenamingFolder(folder); }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleDuplicateFolder(folder)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <div className="px-2 py-1.5">
                                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                  <Palette className="h-3 w-3" /> Color
                                </p>
                                <div className="flex gap-1">
                                  {FOLDER_COLORS.map(c => (
                                    <button
                                      key={c.label}
                                      title={c.label}
                                      className={cn(
                                        "w-5 h-5 rounded-full border-2 transition-transform hover:scale-110",
                                        folder.color === c.value ? "border-foreground scale-110" : "border-transparent"
                                      )}
                                      style={{ backgroundColor: c.value || 'var(--muted)' }}
                                      onClick={(e) => { e.stopPropagation(); handleFolderColor(folder, c.value); }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <ContextMenuSeparator />
                              <ContextMenuItem variant="destructive" onClick={() => setDeletingFolder(folder)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                    {filteredStrats.map((strat, index) => (
                      <ContextMenu key={strat.id}>
                        <ContextMenuTrigger asChild>
                          <Card
                            className={cn(
                              'cursor-pointer border overflow-hidden relative h-[160px]',
                              stagger(index, 'fast', 'fadeIn'),
                              microInteractions.hoverLift
                            )}
                            onMouseEnter={() => handleStratHover(strat.id)}
                            onClick={() => openStrat(strat)}
                          >
                            {strat.map && (
                              <>
                                <div
                                  className="absolute inset-0 bg-cover bg-center"
                                  style={{ backgroundImage: `url(/assets/maps/Loading_Screen_${strat.map}.webp)` }}
                                />
                                <div className="absolute inset-0 bg-black/50 dark:bg-black/60" />
                              </>
                            )}
                            <div className="relative flex flex-col h-full">
                              <CardHeader className="pb-2">
                                <div className="flex items-start justify-between gap-2">
                                  <CardTitle className={cn("text-sm font-medium leading-snug", strat.map && "text-white drop-shadow-md")}>
                                    {strat.title}
                                  </CardTitle>
                                  {strat.side && (
                                    <span className={cn("inline-flex shrink-0", strat.map && "drop-shadow-md", strat.side === 'Attack' ? (strat.map ? 'text-red-400' : 'text-red-600 dark:text-red-400') : (strat.map ? 'text-blue-400' : 'text-blue-600 dark:text-blue-400'))} title={strat.side}>
                                      {strat.side === 'Attack' ? <Swords className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                    </span>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="pt-0 mt-auto">
                                {strat.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {strat.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className={cn("text-xs", strat.map ? "text-white/90 border-white/30 bg-black/30 backdrop-blur-sm" : "text-muted-foreground")}>
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                                )}
                                {strat.agents.length > 0 && (
                                  <div className={cn("flex flex-wrap gap-1 mt-2 pt-2 border-t", strat.map ? "border-white/20" : "border-foreground/10")}>
                                    {strat.agents.map(agent => (
                                      <img
                                        key={agent}
                                        src={`/assets/agents/${normalizeAgentName(agent)}_icon.webp`}
                                        alt={agent}
                                        title={agent}
                                        className={cn("w-6 h-6 rounded border", strat.map ? "border-white/50" : "border-primary/50")}
                                      />
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </div>
                          </Card>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => openStrat(strat)}>
                            <BookOpen className="h-4 w-4 mr-2" />
                            Open
                          </ContextMenuItem>
                          {canEdit && (
                            <>
                              <ContextMenuItem onClick={async () => { await openStrat(strat); setTimeout(handleEdit, 200); }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </ContextMenuItem>
                              <ContextMenuItem onClick={() => handleDuplicateStrategy(strat)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </ContextMenuItem>
                              <ContextMenuSub>
                                <ContextMenuSubTrigger onPointerEnter={fetchAllFolders} onFocus={fetchAllFolders}>
                                  <FolderInput className="h-4 w-4 mr-2" />
                                  Move to
                                </ContextMenuSubTrigger>
                                <ContextMenuSubContent className="max-h-64 overflow-y-auto">
                                  {buildFolderTree(allFolders).map(item => (
                                    <ContextMenuItem
                                      key={item.id ?? 'root'}
                                      disabled={item.id === currentFolderId}
                                      onClick={() => handleMoveStrategy(strat.id, item.id)}
                                      style={{ paddingLeft: `${8 + item.depth * 16}px` }}
                                    >
                                      <Folder className="h-3.5 w-3.5 mr-2 shrink-0" />
                                      <span className="truncate">{item.label}</span>
                                      {item.id === currentFolderId && (
                                        <span className="ml-auto text-xs text-muted-foreground">current</span>
                                      )}
                                    </ContextMenuItem>
                                  ))}
                                </ContextMenuSubContent>
                              </ContextMenuSub>
                              <ContextMenuSeparator />
                              <ContextMenuItem variant="destructive" onClick={() => setDeleteTarget(strat)}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    ))}
                  </div>
                )}
                  </div>
                </ContextMenuTrigger>
                {canEdit && (
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => { setFolderName(''); setFolderDialogOpen(true); }}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      New Folder
                    </ContextMenuItem>
                    <ContextMenuItem onClick={handleCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Strategy
                    </ContextMenuItem>
                  </ContextMenuContent>
                )}
              </ContextMenu>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete strategy dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Strategy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
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

      {/* Create folder dialog */}
      <AlertDialog open={folderDialogOpen} onOpenChange={open => { if (!open) setFolderDialogOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for the new folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            placeholder="Folder name"
            maxLength={100}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); }}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFolderDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateFolder} disabled={!folderName.trim()}>
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename folder dialog */}
      <AlertDialog open={!!renamingFolder} onOpenChange={open => { if (!open) setRenamingFolder(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Folder</AlertDialogTitle>
          </AlertDialogHeader>
          <Input
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            placeholder="Folder name"
            maxLength={100}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(); }}
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRenamingFolder(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRenameFolder} disabled={!folderName.trim()}>
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete folder dialog */}
      <AlertDialog open={!!deletingFolder} onOpenChange={open => { if (!open) setDeletingFolder(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{deletingFolder?.name}&quot;? The folder must be empty.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
