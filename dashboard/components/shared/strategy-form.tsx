'use client';

import React, { useState, useEffect } from 'react';
import { type JSONContent } from '@tiptap/react';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { microInteractions } from '@/lib/animations';
import { StrategyEditor } from './strategy-editor';
import { AgentPicker } from './agent-picker';
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
  const [agentPickerOpen, setAgentPickerOpen] = useState(false);

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

  const toggleAgent = (agent: string) => {
    setAgents(prev =>
      prev.includes(agent)
        ? prev.filter(a => a !== agent)
        : prev.length < 5 ? [...prev, agent] : prev
    );
  };

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
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="strat-title">Title *</Label>
            <Input
              id="strat-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Strategy name"
              maxLength={200}
            />
          </div>

          {/* Map & Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Map</Label>
              <Select value={map} onValueChange={setMap}>
                <SelectTrigger>
                  <SelectValue placeholder="Select map" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {VALORANT_MAPS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Side</Label>
              <Select value={side} onValueChange={setSide}>
                <SelectTrigger>
                  <SelectValue placeholder="Select side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="Attack">Attack</SelectItem>
                  <SelectItem value="Defense">Defense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Add tag and press Enter"
                maxLength={50}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
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

          {/* Agents */}
          <div className="space-y-2">
            <Label>Agents</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAgentPickerOpen(true)}
              >
                Select Agents ({agents.length}/5)
              </Button>
              {agents.length > 0 && (
                <div className="flex gap-1">
                  {agents.map(agent => (
                    <img
                      key={agent}
                      src={`/assets/agents/${agent.replace(/\//g, '')}_icon.webp`}
                      alt={agent}
                      title={agent}
                      className="w-7 h-7 rounded border border-primary/50"
                    />
                  ))}
                </div>
              )}
            </div>
            <AgentPicker
              open={agentPickerOpen}
              onOpenChange={setAgentPickerOpen}
              selectedAgents={agents}
              onSelectAgent={toggleAgent}
              maxAgents={5}
              title="Select Agents for Strategy"
            />
          </div>

          {/* Content Editor */}
          <div className="space-y-2">
            <Label>Content</Label>
            <StrategyEditor content={content} onChange={setContent} editable={true} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className={microInteractions.activePress}
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
