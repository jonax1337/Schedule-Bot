'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Trash2, UserPlus, Search, Users, Edit3, Edit, GripVertical, Shield, UserCheck, Headset } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { stagger, microInteractions, cn } from '@/lib/animations';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

interface DiscordMember {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
}

interface UserMapping {
  discordId: string;
  discordUsername: string;
  displayName: string;
  role: 'main' | 'sub' | 'coach';
  sortOrder: number;
}

type RoleType = 'main' | 'sub' | 'coach';

const ROLE_CONFIG: Record<RoleType, { label: string; pluralLabel: string; icon: typeof Shield; color: string; badgeClass: string }> = {
  main: {
    label: 'Main Player',
    pluralLabel: 'Main Players',
    icon: Shield,
    color: 'text-blue-500',
    badgeClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  sub: {
    label: 'Substitute',
    pluralLabel: 'Substitutes',
    icon: UserCheck,
    color: 'text-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  coach: {
    label: 'Coach',
    pluralLabel: 'Coaches',
    icon: Headset,
    color: 'text-emerald-500',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
};

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

// --- Sortable Item Component ---
function SortableUserItem({
  mapping,
  roleConfig,
  onEdit,
  onRemove,
  isOverlay = false,
}: {
  mapping: UserMapping;
  roleConfig: typeof ROLE_CONFIG[RoleType];
  onEdit: (mapping: UserMapping) => void;
  onRemove: (discordId: string) => void;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: mapping.discordId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 border rounded-lg bg-background",
        isDragging && "opacity-50 shadow-lg z-50",
        isOverlay && "shadow-xl border-primary/50 bg-background",
        !isDragging && !isOverlay && "hover:bg-accent/50",
        microInteractions.smooth
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Drag to reorder ${mapping.displayName}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{mapping.displayName}</div>
        <div className="text-sm text-muted-foreground truncate">
          @{mapping.discordUsername}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(mapping)}
          className={cn("h-8 w-8 p-0", microInteractions.hoverScale, microInteractions.smooth)}
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(mapping.discordId)}
          className={cn("h-8 w-8 p-0", microInteractions.hoverScale, microInteractions.smooth)}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// --- Role Group Component ---
function RoleGroup({
  role,
  mappings,
  onEdit,
  onRemove,
  index,
}: {
  role: RoleType;
  mappings: UserMapping[];
  onEdit: (mapping: UserMapping) => void;
  onRemove: (discordId: string) => void;
  index: number;
}) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  return (
    <div className={cn("space-y-3", stagger(index, 'fast', 'fadeIn'))}>
      <div className="flex items-center gap-2 px-1">
        <Icon className={cn("w-4 h-4", config.color)} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {config.pluralLabel}
        </h3>
        <Badge variant="outline" className={cn("text-xs", config.badgeClass)}>
          {mappings.length}
        </Badge>
      </div>
      <SortableContext
        items={mappings.map(m => m.discordId)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1.5">
          {mappings.length === 0 ? (
            <div className="text-sm text-muted-foreground italic px-1 py-3 border border-dashed rounded-lg text-center">
              No {config.pluralLabel.toLowerCase()} added yet
            </div>
          ) : (
            mappings.map((mapping) => (
              <SortableUserItem
                key={mapping.discordId}
                mapping={mapping}
                roleConfig={config}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// --- Main Component ---
export function UserMappings() {
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [mappings, setMappings] = useState<UserMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'search' | 'manual'>('search');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<RoleType>('main');

  // Edit mode state
  const [editingMapping, setEditingMapping] = useState<UserMapping | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDiscordId, setEditDiscordId] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<RoleType>('main');

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group mappings by role
  const groupedMappings = useMemo(() => {
    const groups: Record<RoleType, UserMapping[]> = {
      main: [],
      sub: [],
      coach: [],
    };
    for (const mapping of mappings) {
      groups[mapping.role]?.push(mapping);
    }
    // Sort within each group by sortOrder
    for (const role of Object.keys(groups) as RoleType[]) {
      groups[role].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return groups;
  }, [mappings]);

  const activeMapping = useMemo(
    () => mappings.find(m => m.discordId === activeId) ?? null,
    [mappings, activeId]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const [membersRes, mappingsRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/discord/members`, { headers: getAuthHeaders() }),
        fetch(`${BOT_API_URL}/api/user-mappings`, { headers: getAuthHeaders() }),
      ]);

      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data.members || []);
      }

      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setMappings(data.mappings || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load user mappings');
    } finally {
      setLoading(false);
    }
  };

  const addMapping = async () => {
    let discordId = '';
    let discordUsername = '';

    if (inputMode === 'search') {
      if (!selectedUserId || !displayName || !role) {
        toast.error('Please fill all fields');
        return;
      }

      const selectedMember = members.find(m => m.id === selectedUserId);
      if (!selectedMember) {
        toast.error('Selected user not found');
        return;
      }

      discordId = selectedUserId;
      discordUsername = selectedMember.username;
    } else {
      if (!manualUserId || !manualUsername || !displayName || !role) {
        toast.error('Please fill all fields');
        return;
      }

      discordId = manualUserId;
      discordUsername = manualUsername;
    }

    if (mappings.some(m => m.discordId === discordId)) {
      toast.error('This user already has a mapping');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/user-mappings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          discordId,
          discordUsername,
          displayName,
          role,
        }),
      });

      if (response.ok) {
        toast.success('User mapping added successfully!');
        setSelectedUserId('');
        setManualUserId('');
        setManualUsername('');
        setDisplayName('');
        setRole('main');
        loadData();
      } else {
        toast.error('Failed to add user mapping');
      }
    } catch (error) {
      console.error('Failed to add mapping:', error);
      toast.error('Failed to add user mapping');
    } finally {
      setSaving(false);
    }
  };

  const removeMapping = async (discordId: string) => {
    if (!confirm('Are you sure you want to remove this mapping?')) {
      return;
    }

    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/user-mappings/${discordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success('User mapping removed successfully!');
        loadData();
      } else {
        toast.error('Failed to remove user mapping');
      }
    } catch (error) {
      console.error('Failed to remove mapping:', error);
      toast.error('Failed to remove user mapping');
    }
  };

  const handleEdit = (mapping: UserMapping) => {
    setEditingMapping(mapping);
    setEditDiscordId(mapping.discordId);
    setEditUsername(mapping.discordUsername);
    setEditDisplayName(mapping.displayName);
    setEditRole(mapping.role);
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingMapping || !editDisplayName || !editRole) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/user-mappings/${editingMapping.discordId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          discordId: editDiscordId,
          discordUsername: editUsername,
          displayName: editDisplayName,
          role: editRole,
        }),
      });

      if (response.ok) {
        toast.success('User mapping updated successfully!');
        setEditDialogOpen(false);
        setEditingMapping(null);
        loadData();
      } else {
        toast.error('Failed to update user mapping');
      }
    } catch (error) {
      console.error('Failed to update mapping:', error);
      toast.error('Failed to update user mapping');
    } finally {
      setSaving(false);
    }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeMapping = mappings.find(m => m.discordId === active.id);
    const overMapping = mappings.find(m => m.discordId === over.id);

    if (!activeMapping || !overMapping) return;

    // Only allow reorder within the same role group
    if (activeMapping.role !== overMapping.role) return;

    const roleGroup = groupedMappings[activeMapping.role];
    const oldIndex = roleGroup.findIndex(m => m.discordId === active.id);
    const newIndex = roleGroup.findIndex(m => m.discordId === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    // Reorder within the role group
    const reordered = arrayMove(roleGroup, oldIndex, newIndex);

    // Calculate base offset for this role group
    let baseOffset = 0;
    const roles: RoleType[] = ['main', 'sub', 'coach'];
    for (const r of roles) {
      if (r === activeMapping.role) break;
      baseOffset += groupedMappings[r].length;
    }

    // Build new orderings for the entire group
    const orderings = reordered.map((m, i) => ({
      discordId: m.discordId,
      sortOrder: baseOffset + i,
    }));

    // Optimistic update: update local state immediately
    const updatedMappings = mappings.map(m => {
      const ordering = orderings.find(o => o.discordId === m.discordId);
      if (ordering) {
        return { ...m, sortOrder: ordering.sortOrder };
      }
      return m;
    });
    setMappings(updatedMappings);

    // Persist to backend
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/user-mappings/reorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ orderings }),
      });

      if (!response.ok) {
        toast.error('Failed to save new order');
        loadData(); // Revert on error
      }
    } catch (error) {
      console.error('Failed to reorder:', error);
      toast.error('Failed to save new order');
      loadData(); // Revert on error
    }
  }, [mappings, groupedMappings]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const selectedMember = members.find(m => m.id === selectedUserId);

  return (
    <div className="space-y-6">
      <Card className="animate-slideUpScale">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add User Mapping
          </CardTitle>
          <CardDescription>
            Link Discord users to the schedule roster
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as 'search' | 'manual')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search User
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Manual Input
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-2 mt-4">
              <Label htmlFor="user-select">Discord User</Label>
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-9 font-normal text-left px-3"
                  >
                    {selectedMember ? (
                      <span className="truncate">{selectedMember.displayName} (@{selectedMember.username})</span>
                    ) : (
                      <span className="text-muted-foreground">Select user...</span>
                    )}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {members.map((member) => (
                          <CommandItem
                            key={member.id}
                            value={`${member.username} ${member.displayName}`}
                            onSelect={() => {
                              setSelectedUserId(member.id);
                              setOpen(false);
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{member.displayName}</span>
                              <span className="text-sm text-muted-foreground">@{member.username}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="manualUserId">Discord User ID</Label>
                <Input
                  id="manualUserId"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  placeholder="e.g., 123456789012345678"
                  className={microInteractions.focusRing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manualUsername">Discord Username</Label>
                <Input
                  id="manualUsername"
                  value={manualUsername}
                  onChange={(e) => setManualUsername(e.target.value)}
                  placeholder="e.g., username"
                  className={microInteractions.focusRing}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Alpha, Beta, Coach Delta"
              className={microInteractions.focusRing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: RoleType) => setRole(value)}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="main">Main Player</SelectItem>
                <SelectItem value="sub">Substitute</SelectItem>
                <SelectItem value="coach">Coach</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={addMapping} disabled={saving} className={cn("w-full", microInteractions.activePress)}>
            {saving ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-1 h-4 w-4" />
                Add Mapping
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="animate-slideUpScale stagger-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Roster ({mappings.length})
          </CardTitle>
          <CardDescription>
            Drag and drop to reorder players within each role group
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : mappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 animate-fadeIn">
              No user mappings yet. Add one above to get started.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
              modifiers={[restrictToVerticalAxis]}
            >
              <div className="space-y-6">
                {(['main', 'sub', 'coach'] as RoleType[]).map((roleKey, index) => (
                  <RoleGroup
                    key={roleKey}
                    role={roleKey}
                    mappings={groupedMappings[roleKey]}
                    onEdit={handleEdit}
                    onRemove={removeMapping}
                    index={index}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeMapping ? (
                  <SortableUserItem
                    mapping={activeMapping}
                    roleConfig={ROLE_CONFIG[activeMapping.role]}
                    onEdit={() => {}}
                    onRemove={() => {}}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="animate-fadeIn stagger-1">Edit User Mapping</DialogTitle>
            <DialogDescription className="animate-fadeIn stagger-2">
              Update user mapping details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 animate-fadeIn stagger-3">
            <div className="space-y-2">
              <Label htmlFor="edit-discord-id">Discord User ID</Label>
              <Input
                id="edit-discord-id"
                value={editDiscordId}
                onChange={(e) => setEditDiscordId(e.target.value)}
                placeholder="e.g., 123456789012345678"
                className={microInteractions.focusRing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Discord Username</Label>
              <Input
                id="edit-username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="e.g., username"
                className={microInteractions.focusRing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-display-name">Display Name</Label>
              <Input
                id="edit-display-name"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="e.g., Alpha, Beta, Coach Delta"
                className={microInteractions.focusRing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={(value: RoleType) => setEditRole(value)}>
                <SelectTrigger id="edit-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="main">Main Player</SelectItem>
                  <SelectItem value="sub">Substitute</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="animate-fadeIn stagger-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className={microInteractions.smooth}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={saving}
              className={microInteractions.activePress}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Mapping'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
