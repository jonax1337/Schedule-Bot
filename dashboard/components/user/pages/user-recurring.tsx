'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, RefreshCw, Trash2, Clock, XCircle, Check, CheckSquare } from 'lucide-react';
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

interface DayEntry {
  dayOfWeek: number;
  timeFrom: string;
  timeTo: string;
  originalTimeFrom: string;
  originalTimeTo: string;
  availability: string;
  isSaving?: boolean;
  justSaved?: boolean;
}

export function UserRecurring() {
  const router = useRouter();
  const { convertRangeToLocal, convertRangeToBot, isConverting, userTimezone, botTimezone, botTimezoneLoaded, timezoneVersion } = useTimezone();
  const [userDiscordId, setUserDiscordId] = useState('');
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [bulkTimeFrom, setBulkTimeFrom] = useState('');
  const [bulkTimeTo, setBulkTimeTo] = useState('');
  const autoSaveTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Monday-first order
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const loadData = async (userName?: string) => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const headers = getAuthHeaders();

      // Resolve Discord ID from user mappings
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
      const entries: RecurringEntry[] = data.entries || [];

      // Build day entries for all 7 days
      const newDayEntries: DayEntry[] = DAY_ORDER.map(dayOfWeek => {
        const entry = entries.find(e => e.dayOfWeek === dayOfWeek);
        let timeFrom = '';
        let timeTo = '';
        const availability = entry?.availability || '';

        if (availability && availability !== 'x' && availability.includes('-')) {
          const localRange = convertRangeToLocal(availability);
          const parts = localRange.split('-');
          if (parts.length === 2) {
            timeFrom = parts[0].trim();
            timeTo = parts[1].trim();
          }
        }

        return {
          dayOfWeek,
          timeFrom,
          timeTo,
          originalTimeFrom: timeFrom,
          originalTimeTo: timeTo,
          availability,
        };
      });

      setDayEntries(newDayEntries);
    } catch {
      toast.error('Failed to load recurring schedule');
    } finally {
      setLoading(false);
    }
  };

  const saveDay = async (dayOfWeek: number, timeFrom: string, timeTo: string, isAutoSave = false) => {
    if (!timeFrom || !timeTo) {
      if (!isAutoSave) {
        toast.error('Please enter both start and end time');
      }
      return;
    }

    if (timeTo <= timeFrom) {
      if (!isAutoSave) {
        toast.error('End time must be after start time');
      }
      return;
    }

    // Mark as saving
    setDayEntries(prev => prev.map(e =>
      e.dayOfWeek === dayOfWeek ? { ...e, isSaving: true, justSaved: false } : e
    ));

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
        if (!isAutoSave) {
          toast.success(`${WEEKDAY_NAMES[dayOfWeek]} updated`);
        }

        setDayEntries(prev => prev.map(e =>
          e.dayOfWeek === dayOfWeek ? {
            ...e,
            availability: botValue,
            originalTimeFrom: timeFrom,
            originalTimeTo: timeTo,
            isSaving: false,
            justSaved: true,
          } : e
        ));

        setTimeout(() => {
          setDayEntries(prev => prev.map(e =>
            e.dayOfWeek === dayOfWeek ? { ...e, justSaved: false } : e
          ));
        }, 2000);
      } else {
        toast.error('Failed to save');
        setDayEntries(prev => prev.map(e =>
          e.dayOfWeek === dayOfWeek ? { ...e, isSaving: false } : e
        ));
      }
    } catch {
      toast.error('Failed to save');
      setDayEntries(prev => prev.map(e =>
        e.dayOfWeek === dayOfWeek ? { ...e, isSaving: false } : e
      ));
    }
  };

  const setDayUnavailable = async (dayOfWeek: number) => {
    setDayEntries(prev => prev.map(e =>
      e.dayOfWeek === dayOfWeek ? { ...e, isSaving: true, justSaved: false } : e
    ));

    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dayOfWeek, availability: 'x', userId: userDiscordId }),
      });

      if (response.ok) {
        toast.success(`${WEEKDAY_NAMES[dayOfWeek]} marked as unavailable`);
        setDayEntries(prev => prev.map(e =>
          e.dayOfWeek === dayOfWeek ? {
            ...e,
            availability: 'x',
            timeFrom: '',
            timeTo: '',
            originalTimeFrom: '',
            originalTimeTo: '',
            isSaving: false,
            justSaved: true,
          } : e
        ));

        setTimeout(() => {
          setDayEntries(prev => prev.map(e =>
            e.dayOfWeek === dayOfWeek ? { ...e, justSaved: false } : e
          ));
        }, 2000);
      } else {
        toast.error('Failed to save');
        setDayEntries(prev => prev.map(e =>
          e.dayOfWeek === dayOfWeek ? { ...e, isSaving: false } : e
        ));
      }
    } catch {
      toast.error('Failed to save');
      setDayEntries(prev => prev.map(e =>
        e.dayOfWeek === dayOfWeek ? { ...e, isSaving: false } : e
      ));
    }
  };

  const removeDay = async (dayOfWeek: number) => {
    setDayEntries(prev => prev.map(e =>
      e.dayOfWeek === dayOfWeek ? { ...e, isSaving: true, justSaved: false } : e
    ));

    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/recurring-availability/${dayOfWeek}?userId=${userDiscordId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        setDayEntries(prev => prev.map(e =>
          e.dayOfWeek === dayOfWeek ? {
            ...e,
            availability: '',
            timeFrom: '',
            timeTo: '',
            originalTimeFrom: '',
            originalTimeTo: '',
            isSaving: false,
            justSaved: true,
          } : e
        ));

        setTimeout(() => {
          setDayEntries(prev => prev.map(e =>
            e.dayOfWeek === dayOfWeek ? { ...e, justSaved: false } : e
          ));
        }, 2000);
      } else {
        toast.error('Failed to remove');
        setDayEntries(prev => prev.map(e =>
          e.dayOfWeek === dayOfWeek ? { ...e, isSaving: false } : e
        ));
      }
    } catch {
      toast.error('Failed to remove');
      setDayEntries(prev => prev.map(e =>
        e.dayOfWeek === dayOfWeek ? { ...e, isSaving: false } : e
      ));
    }
  };

  const handleTimeChange = (dayOfWeek: number, field: 'timeFrom' | 'timeTo', value: string) => {
    // Update local state immediately
    setDayEntries(prev => prev.map(e =>
      e.dayOfWeek === dayOfWeek ? { ...e, [field]: value } : e
    ));

    // Clear existing timeout for this day
    if (autoSaveTimeoutsRef.current[dayOfWeek]) {
      clearTimeout(autoSaveTimeoutsRef.current[dayOfWeek]);
    }

    // Auto-save after 1 second
    autoSaveTimeoutsRef.current[dayOfWeek] = setTimeout(() => {
      setDayEntries(current => {
        const entry = current.find(e => e.dayOfWeek === dayOfWeek);
        if (entry && entry.timeFrom && entry.timeTo) {
          saveDay(dayOfWeek, entry.timeFrom, entry.timeTo, true);
        } else if (entry && !entry.timeFrom && !entry.timeTo && entry.availability && entry.availability !== 'x') {
          // Both fields cleared — remove the entry
          removeDay(dayOfWeek);
        }
        return current;
      });
    }, 1000);
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

        setDayEntries(prev => prev.map(e =>
          selectedDays.has(e.dayOfWeek) ? {
            ...e,
            availability: botValue,
            timeFrom: bulkTimeFrom,
            timeTo: bulkTimeTo,
            originalTimeFrom: bulkTimeFrom,
            originalTimeTo: bulkTimeTo,
          } : e
        ));

        setSelectedDays(new Set());
        setBulkTimeFrom('');
        setBulkTimeTo('');
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

        setDayEntries(prev => prev.map(e =>
          selectedDays.has(e.dayOfWeek) ? {
            ...e,
            availability: 'x',
            timeFrom: '',
            timeTo: '',
            originalTimeFrom: '',
            originalTimeTo: '',
          } : e
        ));

        setSelectedDays(new Set());
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
      setSelectedDays(new Set(DAY_ORDER));
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
      {selectedDays.size > 0 && (
        <Card className="animate-slideDown border-primary">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              {selectedDays.size} day(s) selected
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
                    className={microInteractions.focusRing}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">Bulk To</label>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Recurring Weekly Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set your default weekly availability. Auto-applied when new schedule days are created. Override specific dates in &quot;My Availability&quot;.
          </p>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed w-full">
            <colgroup>
              <col className="w-10" />
              <col className="w-[120px]" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col />
              <col className="w-[180px]" />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={selectedDays.size === 7}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Day</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayEntries.map((entry, index) => {
                const isSelected = selectedDays.has(entry.dayOfWeek);
                const isWeekend = entry.dayOfWeek === 0 || entry.dayOfWeek === 6;

                return (
                  <TableRow
                    key={entry.dayOfWeek}
                    className={cn(
                      isSelected && 'bg-primary/5',
                      !isSelected && isWeekend && 'bg-muted/30',
                      stagger(index, 'fast', 'fadeIn')
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDaySelection(entry.dayOfWeek)}
                        aria-label={`Select ${WEEKDAY_NAMES[entry.dayOfWeek]}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{WEEKDAY_NAMES[entry.dayOfWeek]}</TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input
                          type="time"
                          value={entry.timeFrom}
                          onChange={(e) => handleTimeChange(entry.dayOfWeek, 'timeFrom', e.target.value)}
                          className={cn("w-32", microInteractions.focusRing)}
                          disabled={entry.isSaving}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <Input
                          type="time"
                          value={entry.timeTo}
                          onChange={(e) => handleTimeChange(entry.dayOfWeek, 'timeTo', e.target.value)}
                          className={cn("w-32", microInteractions.focusRing)}
                          disabled={entry.isSaving}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.justSaved ? (
                        <span className="flex items-center gap-2 text-green-600 animate-fadeIn">
                          <Check className="w-4 h-4" />
                          Saved
                        </span>
                      ) : entry.availability === 'x' ? (
                        <span className="flex items-center gap-2 text-red-500">
                          <XCircle className="w-4 h-4" />
                          Not Available
                        </span>
                      ) : entry.availability ? (
                        <span className="flex items-center gap-2 text-green-600">
                          <Clock className="w-4 h-4" />
                          {convertRangeToLocal(entry.availability)}
                          {isConverting && (
                            <span className="text-xs text-muted-foreground">({entry.availability} {getTimezoneAbbr(botTimezone)})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {entry.availability && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeDay(entry.dayOfWeek)}
                            disabled={saving || entry.isSaving}
                            className={cn(microInteractions.activePress, microInteractions.smooth)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDayUnavailable(entry.dayOfWeek)}
                          disabled={saving || entry.isSaving}
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
