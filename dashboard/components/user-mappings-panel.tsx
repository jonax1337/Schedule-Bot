'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2, UserPlus, Search, Users, Edit3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [sortOrder, setSortOrder] = useState(0);
  const [role, setRole] = useState<'main' | 'sub' | 'coach'>('main');

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
          sortOrder: sortOrder,
        }),
      });

      if (response.ok) {
        toast.success('User mapping added successfully!');
        setSelectedUserId('');
        setManualUserId('');
        setManualUsername('');
        setDisplayName('');
        setSortOrder(0);
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

  const selectedMember = members.find(m => m.id === selectedUserId);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-8 w-8" />
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
      <Card>
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
          <div className="space-y-2">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Alpha, Beta, Coach Delta"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              placeholder="0"
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

          <Button onClick={addMapping} disabled={saving} className="w-full">
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

      <Card>
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
            <p className="text-center text-muted-foreground py-8">
              No user mappings yet. Add one above to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {mappings.map((mapping) => (
                <div
                  key={mapping.discordId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMapping(mapping.discordId)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
