'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, RefreshCw, Trash2, Clock, XCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { stagger, microInteractions, cn } from '@/lib/animations';
import { BOT_API_URL } from '@/lib/config';
import { useTimezone, getTimezoneAbbr } from '@/lib/timezone';

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface RecurringEntry {
  id: number;
  userId: string;
  dayOfWeek: number;
  availability: string;
  active: boolean;
}

export function UserRecurring() {
  const router = useRouter();
  const { convertRangeToLocal, convertRangeToBot, isConverting, userTimezone, botTimezoneLoaded, timezoneVersion } = useTimezone();
  const [userDiscordId, setUserDiscordId] = useState('');
  const [entries, setEntries] = useState<RecurringEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [bulkTimeFrom, setBulkTimeFrom] = useState('');
  const [bulkTimeTo, setBulkTimeTo] = useState('');

  // Per-day editing state
  const [dayEdits, setDayEdits] = useState<Record<number, { timeFrom: string; timeTo: string }>>({});

  useEffect(() => {
    if (!botTimezoneLoaded) return;

    const checkAuthAndLoad = async () => {
      try {
        const savedUser = localStorage.getItem('selectedUser');
        if (!savedUser) {
          router.replace('/login');
          return;
        }
        await loadData(savedUser);
      } catch {
        router.push('/login');
      }
    };

    checkAuthAndLoad();
  }, [router, botTimezoneLoaded, timezoneVersion]);

  const loadData = async (userName?: string) => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const headers = getAuthHeaders();

      // Resolve Discord ID from user mappings (same pattern as user-availability)
      let discordId = userDiscordId;
      if (!discordId) {
        const mappingsRes = await fetch(`${BOT_API_URL}/api/user-mappings`, { headers });
        if (!mappingsRes.ok) {
          toast.error('Failed to load user mappings');
          setLoading(false);
          return;
        }
        const mappingsData = await mappingsRes.json().catch(() => ({ mappings: [] }));
        const currentUser = userName || localStorage.getItem('selectedUser');
        const userMapping = mappingsData.mappings.find((m: any) => m.displayName === currentUser);
        if (!userMapping) {
          toast.error('User not found in roster');
          setLoading(false);
          return;
        }
        discordId = userMapping.discordId;
        setUserDiscordId(discordId);
      }

      const res = await fetch(`${BOT_API_URL}/api/recurring-availability?userId=${discordId}`, { headers });
      if (!res.ok) {
        toast.error('Failed to load recurring schedule');
        setLoading(false);
        return;
      }

      const data = await res.json();
      setEntries(data.entries || []);

      // Initialize edit state from existing entries
      const edits: Record<number, { timeFrom: string; timeTo: string }> = {};
      for (const entry of (data.entries || [])) {
        if (entry.availability && entry.availability !== 'x' && entry.availability.includes('-')) {
          const localRange = convertRangeToLocal(entry.availability);
          const parts = localRange.split('-');
          if (parts.length === 2) {
            edits[entry.dayOfWeek] = { timeFrom: parts[0].trim(), timeTo: parts[1].trim() };
          }
        }
      }
      setDayEdits(edits);
    } catch {
      toast.error('Failed to load recurring schedule');
    } finally {
      setLoading(false);
    }
  };

  const saveDay = async (dayOfWeek: number, timeFrom: string, timeTo: string) => {
    if (!timeFrom || !timeTo) {
      toast.error('Please enter both start and end time');
      return;
    }

    if (timeTo <= timeFrom) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const localValue = `${timeFrom}-${timeTo}`;
      const botValue = convertRangeToBot(localValue);
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dayOfWeek, availability: botValue, userId: userDiscordId }),
      });

      if (response.ok) {
        toast.success(`${WEEKDAY_NAMES[dayOfWeek]} updated`);
        await loadData();
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setDayUnavailable = async (dayOfWeek: number) => {
    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dayOfWeek, availability: 'x', userId: userDiscordId }),
      });

      if (response.ok) {
        toast.success(`${WEEKDAY_NAMES[dayOfWeek]} marked as unavailable`);
        setDayEdits(prev => {
          const next = { ...prev };
          delete next[dayOfWeek];
          return next;
        });
        await loadData();
      } else {
        toast.error('Failed to save');
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const removeDay = async (dayOfWeek: number) => {
    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability/${dayOfWeek}?userId=${userDiscordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success(`${WEEKDAY_NAMES[dayOfWeek]} recurring entry removed`);
        setDayEdits(prev => {
          const next = { ...prev };
          delete next[dayOfWeek];
          return next;
        });
        await loadData();
      } else {
        toast.error('Failed to remove');
      }
    } catch {
      toast.error('Failed to remove');
    } finally {
      setSaving(false);
    }
  };

  const clearAll = async () => {
    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability?userId=${userDiscordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success('All recurring entries cleared');
        setDayEdits({});
        await loadData();
      } else {
        toast.error('Failed to clear');
      }
    } catch {
      toast.error('Failed to clear');
    } finally {
      setSaving(false);
    }
  };

  // Bulk operations
  const bulkSetTime = async () => {
    if (selectedDays.size === 0) {
      toast.error('Please select at least one day');
      return;
    }
    if (!bulkTimeFrom || !bulkTimeTo) {
      toast.error('Please enter both start and end time');
      return;
    }
    if (bulkTimeTo <= bulkTimeFrom) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      const localValue = `${bulkTimeFrom}-${bulkTimeTo}`;
      const botValue = convertRangeToBot(localValue);
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ days: Array.from(selectedDays), availability: botValue, userId: userDiscordId }),
      });

      if (response.ok) {
        toast.success(`Updated ${selectedDays.size} day(s)`);
        setSelectedDays(new Set());
        setBulkTimeFrom('');
        setBulkTimeTo('');
        await loadData();
      } else {
        toast.error('Failed to bulk update');
      }
    } catch {
      toast.error('Failed to bulk update');
    } finally {
      setSaving(false);
    }
  };

  const bulkSetUnavailable = async () => {
    if (selectedDays.size === 0) {
      toast.error('Please select at least one day');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ days: Array.from(selectedDays), availability: 'x', userId: userDiscordId }),
      });

      if (response.ok) {
        toast.success(`Marked ${selectedDays.size} day(s) as unavailable`);
        setSelectedDays(new Set());
        await loadData();
      } else {
        toast.error('Failed to bulk update');
      }
    } catch {
      toast.error('Failed to bulk update');
    } finally {
      setSaving(false);
    }
  };

  const toggleDaySelection = (day: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDays.size === 7) {
      setSelectedDays(new Set());
    } else {
      setSelectedDays(new Set([0, 1, 2, 3, 4, 5, 6]));
    }
  };

  const handleTimeChange = (dayOfWeek: number, field: 'timeFrom' | 'timeTo', value: string) => {
    setDayEdits(prev => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek] || { timeFrom: '', timeTo: '' },
        [field]: value,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-scaleIn">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <Card className="animate-fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Recurring Weekly Schedule
          </CardTitle>
          <CardDescription>
            Set your default availability for each day of the week. This will be auto-applied when new schedule days are created. You can always override specific dates in &quot;My Availability&quot;.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Bulk Actions */}
      {selectedDays.size > 0 && (
        <Card className="animate-slideDown border-primary">
          <CardHeader>
            <CardTitle className="text-sm">
              {selectedDays.size} day(s) selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2 flex-1 min-w-[300px]">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">From</label>
                  <Input
                    type="time"
                    value={bulkTimeFrom}
                    onChange={(e) => setBulkTimeFrom(e.target.value)}
                    className={microInteractions.focusRing}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">To</label>
                  <Input
                    type="time"
                    value={bulkTimeTo}
                    onChange={(e) => setBulkTimeTo(e.target.value)}
                    className={microInteractions.focusRing}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={bulkSetTime}
                  disabled={saving || !bulkTimeFrom || !bulkTimeTo}
                  className={microInteractions.activePress}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set Time'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={bulkSetUnavailable}
                  disabled={saving}
                  className={microInteractions.activePress}
                >
                  Mark Unavailable
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedDays(new Set())}
                  className={microInteractions.activePress}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card className="animate-fadeIn">
        <CardContent>
          <div className="flex justify-end mb-4">
            {entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={saving}
                className={microInteractions.activePress}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDays.size === 7}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Day</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Render Monday first (1), then Tue-Sun: 1,2,3,4,5,6,0 */}
              {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek, index) => {
                const entry = entries.find(e => e.dayOfWeek === dayOfWeek);
                const isSelected = selectedDays.has(dayOfWeek);
                const edit = dayEdits[dayOfWeek] || { timeFrom: '', timeTo: '' };
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <TableRow
                    key={dayOfWeek}
                    className={cn(
                      isSelected && 'bg-primary/5',
                      isWeekend && 'bg-muted/30',
                      stagger(index, 'fast', 'fadeIn')
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDaySelection(dayOfWeek)}
                        aria-label={`Select ${WEEKDAY_NAMES[dayOfWeek]}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{WEEKDAY_NAMES[dayOfWeek]}</TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={edit.timeFrom}
                        onChange={(e) => handleTimeChange(dayOfWeek, 'timeFrom', e.target.value)}
                        className={cn("w-32", microInteractions.focusRing)}
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={edit.timeTo}
                        onChange={(e) => handleTimeChange(dayOfWeek, 'timeTo', e.target.value)}
                        className={cn("w-32", microInteractions.focusRing)}
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell>
                      {entry ? (
                        entry.availability === 'x' ? (
                          <span className="flex items-center gap-2 text-red-500">
                            <XCircle className="w-4 h-4" />
                            Unavailable
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-green-600">
                            <Clock className="w-4 h-4" />
                            {convertRangeToLocal(entry.availability)}
                            {isConverting && (
                              <span className="text-xs text-muted-foreground">({getTimezoneAbbr(userTimezone)})</span>
                            )}
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => saveDay(dayOfWeek, edit.timeFrom, edit.timeTo)}
                          disabled={saving || !edit.timeFrom || !edit.timeTo}
                          className={microInteractions.activePress}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDayUnavailable(dayOfWeek)}
                          disabled={saving}
                          className={microInteractions.activePress}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                        {entry && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDay(dayOfWeek)}
                            disabled={saving}
                            className={microInteractions.activePress}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
