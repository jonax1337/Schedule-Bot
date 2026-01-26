'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, XCircle, Clock, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { stagger, microInteractions, cn } from '@/lib/animations';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

function getWeekdayName(dateStr: string): string {
  const [day, month, year] = dateStr.split('.');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return weekdays[date.getDay()];
}

interface DateEntry {
  date: string;
  value: string;
  timeFrom: string;
  timeTo: string;
  originalTimeFrom: string;
  originalTimeTo: string;
}

export function UserAvailabilityContent() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userDiscordId, setUserDiscordId] = useState('');
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [bulkTimeFrom, setBulkTimeFrom] = useState('');
  const [bulkTimeTo, setBulkTimeTo] = useState('');

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const savedUser = localStorage.getItem('selectedUser');
        if (!savedUser) {
          router.replace('/login');
          return;
        }

        setUserName(savedUser);
        await loadData(savedUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuthAndLoad();
  }, [router]);

  const loadData = async (user: string) => {
    setLoading(true);
    try {
      const mappingsRes = await fetch(`${BOT_API_URL}/api/user-mappings`);
      if (!mappingsRes.ok) {
        toast.error('Failed to load user mappings');
        setLoading(false);
        return;
      }

      const mappingsData = await mappingsRes.json();
      const userMapping = mappingsData.mappings.find((m: any) => m.displayName === user);

      if (!userMapping) {
        toast.error('User mapping not found');
        setLoading(false);
        return;
      }

      setUserDiscordId(userMapping.discordId);

      const { getAuthHeaders } = await import('@/lib/auth');
      const scheduleRes = await fetch(`${BOT_API_URL}/api/schedule/next14`, {
        headers: getAuthHeaders(),
      });

      if (!scheduleRes.ok) {
        toast.error('Failed to load schedule');
        setLoading(false);
        return;
      }

      const scheduleData = await scheduleRes.json();
      const schedules = scheduleData.schedules || [];
      const dateEntries: DateEntry[] = [];

      const today = new Date();
      const formatDate = (d: Date): string => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
      };

      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = formatDate(date);

        const schedule = schedules.find((s: any) => s.date === dateStr);
        const player = schedule?.players?.find((p: any) => p.userId === userMapping.discordId);
        const availability = player?.availability || '';

        let timeFrom = '';
        let timeTo = '';

        if (availability && availability !== 'x' && availability.includes('-')) {
          const parts = availability.split('-');
          if (parts.length === 2) {
            timeFrom = parts[0].trim();
            timeTo = parts[1].trim();
          }
        }

        dateEntries.push({
          date: dateStr,
          value: availability,
          timeFrom,
          timeTo,
          originalTimeFrom: timeFrom,
          originalTimeTo: timeTo,
        });
      }

      setEntries(dateEntries);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (date: string, timeFrom: string, timeTo: string) => {
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
      const value = `${timeFrom}-${timeTo}`;
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          userId: userDiscordId,
          availability: value,
        }),
      });

      if (response.ok) {
        toast.success('Availability updated!');
        await loadData(userName);
      } else {
        toast.error('Failed to update availability');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const setUnavailable = async (date: string) => {
    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          userId: userDiscordId,
          availability: 'x',
        }),
      });

      if (response.ok) {
        toast.success('Marked as not available');
        await loadData(userName);
      } else {
        toast.error('Failed to update availability');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const handleTimeChange = (date: string, field: 'from' | 'to', value: string) => {
    setEntries(prev => prev.map(e =>
      e.date === date ? {
        ...e,
        [field === 'from' ? 'timeFrom' : 'timeTo']: value
      } : e
    ));
  };

  // Bulk Edit Functions
  const toggleDateSelection = (date: string) => {
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDates.size === entries.length) {
      setSelectedDates(new Set());
    } else {
      setSelectedDates(new Set(entries.map(e => e.date)));
    }
  };

  const bulkSetTime = async () => {
    if (selectedDates.size === 0) {
      toast.error('Please select at least one date');
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
      const value = `${bulkTimeFrom}-${bulkTimeTo}`;
      const { getAuthHeaders } = await import('@/lib/auth');

      const updates = Array.from(selectedDates).map(date =>
        fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            date,
            userId: userDiscordId,
            availability: value,
          }),
        })
      );

      const results = await Promise.all(updates);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        toast.success(`Updated ${selectedDates.size} day(s)`);
        setSelectedDates(new Set());
        setBulkTimeFrom('');
        setBulkTimeTo('');
        await loadData(userName);
      } else {
        toast.error('Some updates failed');
        await loadData(userName);
      }
    } catch (error) {
      console.error('Failed to bulk update:', error);
      toast.error('Failed to bulk update availability');
    } finally {
      setSaving(false);
    }
  };

  const bulkSetUnavailable = async () => {
    if (selectedDates.size === 0) {
      toast.error('Please select at least one date');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const updates = Array.from(selectedDates).map(date =>
        fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            date,
            userId: userDiscordId,
            availability: 'x',
          }),
        })
      );

      const results = await Promise.all(updates);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        toast.success(`Marked ${selectedDates.size} day(s) as unavailable`);
        setSelectedDates(new Set());
        await loadData(userName);
      } else {
        toast.error('Some updates failed');
        await loadData(userName);
      }
    } catch (error) {
      console.error('Failed to bulk update:', error);
      toast.error('Failed to bulk update availability');
    } finally {
      setSaving(false);
    }
  };

  const bulkClear = async () => {
    if (selectedDates.size === 0) {
      toast.error('Please select at least one date');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const updates = Array.from(selectedDates).map(date =>
        fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            date,
            userId: userDiscordId,
            availability: '',
          }),
        })
      );

      const results = await Promise.all(updates);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        toast.success(`Cleared ${selectedDates.size} day(s)`);
        setSelectedDates(new Set());
        await loadData(userName);
      } else {
        toast.error('Some updates failed');
        await loadData(userName);
      }
    } catch (error) {
      console.error('Failed to bulk clear:', error);
      toast.error('Failed to bulk clear availability');
    } finally {
      setSaving(false);
    }
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
      {/* Bulk Actions Toolbar */}
      {selectedDates.size > 0 && (
        <Card className="animate-slideDown border-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              {selectedDates.size} day(s) selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex gap-2 flex-1 min-w-[300px]">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Bulk From</label>
                  <Input
                    type="time"
                    value={bulkTimeFrom}
                    onChange={(e) => setBulkTimeFrom(e.target.value)}
                    placeholder="Start time"
                    className={microInteractions.focusRing}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Bulk To</label>
                  <Input
                    type="time"
                    value={bulkTimeTo}
                    onChange={(e) => setBulkTimeTo(e.target.value)}
                    placeholder="End time"
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
                  variant="outline"
                  onClick={bulkClear}
                  disabled={saving}
                  className={microInteractions.activePress}
                >
                  Clear
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedDates(new Set())}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDates.size === entries.length && entries.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Weekday</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => {
                const isSelected = selectedDates.has(entry.date);
                return (
                  <TableRow
                    key={entry.date}
                    className={cn(
                      isSelected && 'bg-primary/5',
                      stagger(index, 'fast', 'fadeIn')
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDateSelection(entry.date)}
                        aria-label={`Select ${entry.date}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{entry.date}</TableCell>
                    <TableCell className="text-muted-foreground">{getWeekdayName(entry.date)}</TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={entry.timeFrom}
                        onChange={(e) => handleTimeChange(entry.date, 'from', e.target.value)}
                        className={cn("w-32", microInteractions.focusRing)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={entry.timeTo}
                        onChange={(e) => handleTimeChange(entry.date, 'to', e.target.value)}
                        className={cn("w-32", microInteractions.focusRing)}
                      />
                    </TableCell>
                    <TableCell>
                      {entry.value === 'x' ? (
                        <span className="flex items-center gap-2 text-red-500">
                          <XCircle className="w-4 h-4" />
                          Not Available
                        </span>
                      ) : entry.value ? (
                        <span className="flex items-center gap-2 text-green-600">
                          <Clock className="w-4 h-4" />
                          {entry.value}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEntry(entry.date, entry.timeFrom, entry.timeTo)}
                          disabled={
                            saving ||
                            !entry.timeFrom ||
                            !entry.timeTo ||
                            (entry.timeFrom === entry.originalTimeFrom && entry.timeTo === entry.originalTimeTo)
                          }
                          className={cn(microInteractions.activePress, microInteractions.smooth)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setUnavailable(entry.date)}
                          disabled={saving}
                          className={cn(microInteractions.activePress, microInteractions.smooth)}
                        >
                          Not Available
                        </Button>
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
