'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type JSONContent } from '@tiptap/react';
import { FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { microInteractions } from '@/lib/animations';
import { StrategyEditor } from './strategy-editor';
import { AgentSelector } from './agent-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BOT_API_URL } from '@/lib/config';

const VALORANT_MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Fracture', 'Haven',
  'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset',
];

interface StrategyFormProps {
  /** If provided, we're editing an existing strategy */
  strategyId?: number;
  initialData?: {
    title: string;
    map: string | null;
    side: string | null;
    tags: string[];
    agents: string[];
    content: JSONContent;
  };
  onSaved: (strategy: any) => void;
  onCancel: () => void;
}

export function StrategyForm({ strategyId, initialData, onSaved, onCancel }: StrategyFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [map, setMap] = useState(initialData?.map || '');
  const [side, setSide] = useState(initialData?.side || '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [agents, setAgents] = useState<string[]>(initialData?.agents || []);
  const [content, setContent] = useState<JSONContent>(
    initialData?.content || { type: 'doc', content: [{ type: 'paragraph' }] }
  );
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<{ id: number; filename: string; originalName: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!strategyId;

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  // Load existing files when editing
  useEffect(() => {
    if (!strategyId) return;
    (async () => {
      try {
        const res = await fetch(`${BOT_API_URL}/api/strategies/${strategyId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.strategy?.files) setFiles(data.strategy.files);
        }
      } catch { /* ignore */ }
    })();
  }, [strategyId]);

  const uploadPdf = useCallback(async (file: File) => {
    if (!strategyId) return;
    setUploading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const headers = getAuthHeaders();
      delete (headers as any)['Content-Type'];
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BOT_API_URL}/api/strategies/${strategyId}/files`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      const data = await res.json();
      setFiles(prev => [...prev, data.file]);
      toast.success('PDF uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  }, [strategyId]);

  const deletePdf = useCallback(async (fileId: number) => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const res = await fetch(`${BOT_API_URL}/api/strategies/files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast.success('PDF deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete PDF');
    }
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const body = {
        title: title.trim(),
        map: map || null,
        side: side || null,
        tags: tags.join(','),
        agents: agents.join(','),
        content,
      };

      const url = isEditing
        ? `${BOT_API_URL}/api/strategies/${strategyId}`
        : `${BOT_API_URL}/api/strategies`;

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      const data = await response.json();
      toast.success(isEditing ? 'Strategy updated' : 'Strategy created');
      onSaved(data.strategy);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save strategy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Strategy' : 'New Strategy'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strat-title">Title *</Label>
              <Input
                id="strat-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter strategy name"
                maxLength={200}
                className={microInteractions.focusRing}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Map</Label>
                <Select value={map || 'none'} onValueChange={v => setMap(v === 'none' ? '' : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select map" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="none">None</SelectItem>
                    {VALORANT_MAPS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Side</Label>
                <Select value={side || 'none'} onValueChange={v => setSide(v === 'none' ? '' : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select side" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Attack">Attack</SelectItem>
                    <SelectItem value="Defense">Defense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Tags & Agents */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a tag and press Enter"
                maxLength={50}
                className={microInteractions.focusRing}
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <AgentSelector
              label="Agents"
              agents={agents}
              onChange={setAgents}
              maxAgents={5}
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>Content</Label>
            <StrategyEditor content={content} onChange={setContent} editable={true} />
          </div>

          {/* Attachments (only when editing — needs strategyId) */}
          {isEditing && (
            <div className="space-y-2">
              <Label>PDF Attachments</Label>
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{file.originalName}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deletePdf(file.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div
                onClick={() => !uploading && pdfInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type === 'application/pdf') uploadPdf(file);
                  else if (file) toast.error('Only PDF files are allowed');
                }}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors',
                  dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                  uploading && 'pointer-events-none opacity-60'
                )}
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Drop a PDF here or click to browse'}
                </span>
                <span className="text-xs text-muted-foreground/60">Max 10 MB</span>
              </div>
              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadPdf(file);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className={microInteractions.smooth}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className={cn(microInteractions.activePress, microInteractions.smooth)}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create Strategy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
