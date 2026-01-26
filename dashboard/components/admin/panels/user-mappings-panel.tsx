'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2, UserPlus, Search, Users, Edit3, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { stagger, microInteractions, loadingStates, cn } from '@/lib/animations';

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

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

export function UserMappingsPanel() {
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
  const [role, setRole] = useState<'main' | 'sub' | 'coach'>('main');
  
  // Edit mode state
  const [editingMapping, setEditingMapping] = useState<UserMapping | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDiscordId, setEditDiscordId] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<'main' | 'sub' | 'coach'>('main');
  const [editSortOrder, setEditSortOrder] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const [membersRes, mappingsRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/discord/members`, { headers: getAuthHeaders() }),
        fetch(`${BOT_API_URL}/api/user-mappings`),
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
      // Manual mode
      if (!manualUserId || !manualUsername || !displayName || !role) {
        toast.error('Please fill all fields');
        return;
      }

      discordId = manualUserId;
      discordUsername = manualUsername;
    }

    // Check if user already has a mapping
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
          displayName: displayName,
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
    setEditSortOrder(mapping.sortOrder);
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
          sortOrder: editSortOrder,
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

  const selectedMember = members.find(m => m.id === selectedUserId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="animate-slideUpScale">
          <CardHeader>
            <Skeleton className={cn("h-6 w-40", loadingStates.skeleton)} />
            <Skeleton className={cn("h-4 w-56 mt-2", loadingStates.skeleton)} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className={cn("h-4 w-24", loadingStates.skeleton)} />
              <Skeleton className={cn("h-10 w-full", loadingStates.skeleton)} />
            </div>
            <div className="space-y-2">
              <Skeleton className={cn("h-4 w-24", loadingStates.skeleton)} />
              <Skeleton className={cn("h-10 w-full", loadingStates.skeleton)} />
            </div>
            <div className="space-y-2">
              <Skeleton className={cn("h-4 w-24", loadingStates.skeleton)} />
              <Skeleton className={cn("h-10 w-full", loadingStates.skeleton)} />
            </div>
            <Skeleton className={cn("h-10 w-full", loadingStates.skeleton)} />
          </CardContent>
        </Card>
        <Card className="animate-slideUpScale stagger-1">
          <CardHeader>
            <Skeleton className={cn("h-6 w-40", loadingStates.skeleton)} />
            <Skeleton className={cn("h-4 w-56 mt-2", loadingStates.skeleton)} />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={cn("flex items-center justify-between p-3 border rounded-lg", stagger(i, 'fast', 'fadeIn'))}>
                  <div className="space-y-1 flex-1">
                    <Skeleton className={cn("h-4 w-32", loadingStates.skeleton)} />
                    <Skeleton className={cn("h-3 w-48", loadingStates.skeleton)} />
                  </div>
                  <Skeleton className={cn("h-8 w-8", loadingStates.skeleton)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="animate-slideUpScale">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add User Mapping
          </CardTitle>
          <CardDescription>
            Link Discord users to Google Sheets columns
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
            <Select value={role} onValueChange={(value: 'main' | 'sub' | 'coach') => setRole(value)}>
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
            Current Mappings ({mappings.length})
          </CardTitle>
          <CardDescription>
            Manage existing user-to-column mappings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 animate-fadeIn">
              No user mappings yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {mappings.map((mapping, index) => (
                <div
                  key={mapping.discordId}
                  className={cn(
                    "flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50",
                    stagger(index, 'fast', 'fadeIn'),
                    microInteractions.smooth
                  )}
                >
                  <div className="flex-1">
                    <div className="font-medium">{mapping.discordUsername}</div>
                    <div className="text-sm text-muted-foreground">
                      Display: <span className="font-semibold">{mapping.displayName}</span>
                      {' • '}
                      Role: <span className="capitalize">{mapping.role}</span>
                      {' • '}
                      Order: <span className="font-mono">{mapping.sortOrder}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(mapping)}
                      className={cn(microInteractions.hoverScale, microInteractions.smooth)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMapping(mapping.discordId)}
                      className={cn(microInteractions.hoverScale, microInteractions.smooth)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
              <Select value={editRole} onValueChange={(value: 'main' | 'sub' | 'coach') => setEditRole(value)}>
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
            <div className="space-y-2">
              <Label htmlFor="edit-sort-order">Sort Order (Manual Override)</Label>
              <Input
                id="edit-sort-order"
                type="number"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
                className={microInteractions.focusRing}
              />
              <p className="text-xs text-muted-foreground">
                Leave as is for automatic ordering, or set manually to override
              </p>
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
