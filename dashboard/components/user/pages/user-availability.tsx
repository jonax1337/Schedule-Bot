'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, XCircle, Clock, CheckSquare, Square, Check, PlaneTakeoff } from 'lucide-react';
import { toast } from 'sonner';
import { stagger, microInteractions, cn } from '@/lib/animations';
import { BOT_API_URL } from '@/lib/config';
import { useTimezone, getTimezoneAbbr } from '@/lib/timezone';

interface AbsenceData {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

function parseGermanDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

function isDateInAbsence(date: string, absences: AbsenceData[]): boolean {
  const d = parseGermanDate(date);
  return absences.some(a => {
    const start = parseGermanDate(a.startDate);
    const end = parseGermanDate(a.endDate);
    return d >= start && d <= end;
  });
}

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
  isSaving?: boolean;
  justSaved?: boolean;
}

export function UserAvailability() {
  const router = useRouter();
  const { convertRangeToLocal, convertRangeToBot, isConverting, userTimezone, botTimezone, botTimezoneLoaded, timezoneVersion } = useTimezone();
  const [userName, setUserName] = useState('');
  const [userDiscordId, setUserDiscordId] = useState('');
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [bulkTimeFrom, setBulkTimeFrom] = useState('');
  const [bulkTimeTo, setBulkTimeTo] = useState('');
  const [absences, setAbsences] = useState<AbsenceData[]>([]);
  const autoSaveTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!botTimezoneLoaded) return;

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
  }, [router, botTimezoneLoaded, timezoneVersion]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  const loadData = async (user: string) => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const headers = getAuthHeaders();

      // First fetch mappings to get the user's Discord ID
      const mappingsRes = await fetch(`${BOT_API_URL}/api/user-mappings`, { headers });
      if (!mappingsRes.ok) {
        toast.error('Failed to load user mappings');
        setLoading(false);
        return;
      }

      const mappingsData = await mappingsRes.json().catch(() => ({ mappings: [] }));
      const userMapping = mappingsData.mappings.find((m: any) => m.displayName === user);

      if (!userMapping) {
        toast.error('User mapping not found');
        setLoading(false);
        return;
      }

      setUserDiscordId(userMapping.discordId);

      // Fetch absences and schedule in parallel
      const [absencesRes, scheduleRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/absences?userId=${userMapping.discordId}`, { headers }),
        fetch(`${BOT_API_URL}/api/schedule/next14`, { headers }),
      ]);

      // Parse responses with safe JSON handling
      const [absencesData, scheduleData] = await Promise.all([
        absencesRes.ok ? absencesRes.json().catch(() => ({ absences: [] })) : Promise.resolve({ absences: [] }),
        scheduleRes.ok ? scheduleRes.json().catch(() => ({ schedules: [] })) : Promise.resolve({ schedules: [] }),
      ]);

      setAbsences(absencesData.absences || []);

      if (!scheduleRes.ok) {
        toast.error('Failed to load schedule');
        setLoading(false);
        return;
      }

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
          const localRange = convertRangeToLocal(availability);
          const parts = localRange.split('-');
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

  const saveEntry = async (date: string, timeFrom: string, timeTo: string, isAutoSave = false) => {
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

    // Mark this entry as saving
    setEntries(prev => prev.map(e =>
      e.date === date ? { ...e, isSaving: true, justSaved: false } : e
    ));

    try {
      const localValue = `${timeFrom}-${timeTo}`;
      const botValue = convertRangeToBot(localValue);
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          userId: userDiscordId,
          availability: botValue,
        }),
      });

      if (response.ok) {
        // Only show toast if it's NOT an auto-save
        if (!isAutoSave) {
          toast.success('Availability updated!');
        }

        // Update local state without reloading everything (keep local display values)
        setEntries(prev => prev.map(e =>
          e.date === date ? {
            ...e,
            value: localValue,
            originalTimeFrom: timeFrom,
            originalTimeTo: timeTo,
            isSaving: false,
            justSaved: true
          } : e
        ));

        // Clear the "just saved" indicator after 2 seconds
        setTimeout(() => {
          setEntries(prev => prev.map(e =>
            e.date === date ? { ...e, justSaved: false } : e
          ));
        }, 2000);
      } else {
        toast.error('Failed to update availability');
        setEntries(prev => prev.map(e =>
          e.date === date ? { ...e, isSaving: false } : e
        ));
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save availability');
      setEntries(prev => prev.map(e =>
        e.date === date ? { ...e, isSaving: false } : e
      ));
    }
  };

  const clearAvailability = async (date: string, isAutoSave = true) => {
    // Mark this entry as saving
    setEntries(prev => prev.map(e =>
      e.date === date ? { ...e, isSaving: true, justSaved: false } : e
    ));

    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          userId: userDiscordId,
          availability: '',
        }),
      });

      if (response.ok) {
        // Only show toast if it's NOT an auto-save
        if (!isAutoSave) {
          toast.success('Availability cleared');
        }

        // Update local state without reloading everything
        setEntries(prev => prev.map(e =>
          e.date === date ? {
            ...e,
            value: '',
            timeFrom: '',
            timeTo: '',
            originalTimeFrom: '',
            originalTimeTo: '',
            isSaving: false,
            justSaved: true
          } : e
        ));

        // Clear the "just saved" indicator after 2 seconds
        setTimeout(() => {
          setEntries(prev => prev.map(e =>
            e.date === date ? { ...e, justSaved: false } : e
          ));
        }, 2000);
      } else {
        toast.error('Failed to clear availability');
        setEntries(prev => prev.map(e =>
          e.date === date ? { ...e, isSaving: false } : e
        ));
      }
    } catch (error) {
      console.error('Failed to clear:', error);
      toast.error('Failed to clear availability');
      setEntries(prev => prev.map(e =>
        e.date === date ? { ...e, isSaving: false } : e
      ));
    }
  };

  const setUnavailable = async (date: string) => {
    // Mark this entry as saving
    setEntries(prev => prev.map(e =>
      e.date === date ? { ...e, isSaving: true, justSaved: false } : e
    ));

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

        // Update local state without reloading everything
        setEntries(prev => prev.map(e =>
          e.date === date ? {
            ...e,
            value: 'x',
            timeFrom: '',
            timeTo: '',
            originalTimeFrom: '',
            originalTimeTo: '',
            isSaving: false,
            justSaved: true
          } : e
        ));

        // Clear the "just saved" indicator after 2 seconds
        setTimeout(() => {
          setEntries(prev => prev.map(e =>
            e.date === date ? { ...e, justSaved: false } : e
          ));
        }, 2000);
      } else {
        toast.error('Failed to update availability');
        setEntries(prev => prev.map(e =>
          e.date === date ? { ...e, isSaving: false } : e
        ));
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save availability');
      setEntries(prev => prev.map(e =>
        e.date === date ? { ...e, isSaving: false } : e
      ));
    }
  };

  const handleTimeChange = (date: string, field: 'from' | 'to', value: string) => {
    // Update local state immediately
    setEntries(prev => prev.map(e =>
      e.date === date ? {
        ...e,
        [field === 'from' ? 'timeFrom' : 'timeTo']: value
      } : e
    ));

    // Clear existing timeout for this date
    if (autoSaveTimeoutsRef.current[date]) {
      clearTimeout(autoSaveTimeoutsRef.current[date]);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutsRef.current[date] = setTimeout(() => {
      // Get the updated entry
      setEntries(current => {
        const entry = current.find(e => e.date === date);
        if (entry && entry.timeFrom && entry.timeTo) {
          // Both fields are filled, trigger auto-save
          saveEntry(date, entry.timeFrom, entry.timeTo, true);
        } else if (entry && !entry.timeFrom && !entry.timeTo && entry.value) {
          // Both fields are empty but there was a previous value - clear it
          clearAvailability(date);
        }
        return current;
      });
    }, 1000); // Wait 1 second after last keystroke
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
    const selectableDates = entries.filter(e => !isDateInAbsence(e.date, absences)).map(e => e.date);
    if (selectedDates.size === selectableDates.length) {
      setSelectedDates(new Set());
    } else {
      setSelectedDates(new Set(selectableDates));
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
      const localValue = `${bulkTimeFrom}-${bulkTimeTo}`;
      const botValue = convertRangeToBot(localValue);
      const { getAuthHeaders } = await import('@/lib/auth');

      const updates = Array.from(selectedDates).map(date =>
        fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            date,
            userId: userDiscordId,
            availability: botValue,
          }),
        })
      );

      const results = await Promise.all(updates);
      const allSuccess = results.every(r => r.ok);

      if (allSuccess) {
        toast.success(`Updated ${selectedDates.size} day(s)`);

        // Update local state for all selected dates (keep local display values)
        setEntries(prev => prev.map(e =>
          selectedDates.has(e.date) ? {
            ...e,
            value: localValue,
            timeFrom: bulkTimeFrom,
            timeTo: bulkTimeTo,
            originalTimeFrom: bulkTimeFrom,
            originalTimeTo: bulkTimeTo,
          } : e
        ));

        setSelectedDates(new Set());
        setBulkTimeFrom('');
        setBulkTimeTo('');
      } else {
        toast.error('Some updates failed');
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

        // Update local state for all selected dates
        setEntries(prev => prev.map(e =>
          selectedDates.has(e.date) ? {
            ...e,
            value: 'x',
            timeFrom: '',
            timeTo: '',
            originalTimeFrom: '',
            originalTimeTo: '',
          } : e
        ));

        setSelectedDates(new Set());
      } else {
        toast.error('Some updates failed');
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

        // Update local state for all selected dates
        setEntries(prev => prev.map(e =>
          selectedDates.has(e.date) ? {
            ...e,
            value: '',
            timeFrom: '',
            timeTo: '',
            originalTimeFrom: '',
            originalTimeTo: '',
          } : e
        ));

        setSelectedDates(new Set());
      } else {
        toast.error('Some updates failed');
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
          <Table className="table-fixed w-full">
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col />
              <col style={{ width: 130 }} />
            </colgroup>
            <TableHeader>
              <TableRow>
                <TableHead>
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
                <TableHead>Current Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => {
                const isSelected = selectedDates.has(entry.date);
                const isAbsent = isDateInAbsence(entry.date, absences);
                const [day, month, year] = entry.date.split('.');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                return (
                  <TableRow
                    key={entry.date}
                    className={cn(
                      isSelected && 'bg-primary/5',
                      isAbsent && 'bg-purple-500/5 opacity-60',
                      !isSelected && !isAbsent && isWeekend && 'bg-muted/30',
                      stagger(index, 'fast', 'fadeIn')
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleDateSelection(entry.date)}
                        aria-label={`Select ${entry.date}`}
                        disabled={isAbsent}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{entry.date}</TableCell>
                    <TableCell className="text-muted-foreground">{getWeekdayName(entry.date)}</TableCell>
                    {isAbsent ? (
                      <>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type="time"
                              value=""
                              className="w-32 opacity-40 cursor-not-allowed"
                              disabled
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type="time"
                              value=""
                              className="w-32 opacity-40 cursor-not-allowed"
                              disabled
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 text-purple-500">
                            <PlaneTakeoff className="w-4 h-4" />
                            Absent
                          </span>
                        </TableCell>
                        <TableCell></TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <div className="relative">
                            <Input
                              type="time"
                              value={entry.timeFrom}
                              onChange={(e) => handleTimeChange(entry.date, 'from', e.target.value)}
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
                              onChange={(e) => handleTimeChange(entry.date, 'to', e.target.value)}
                              className={cn("w-32", microInteractions.focusRing)}
                              disabled={entry.isSaving}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="overflow-hidden">
                          {entry.justSaved ? (
                            <span className="flex items-center gap-2 text-green-600 animate-fadeIn">
                              <Check className="w-4 h-4 shrink-0" />
                              Saved
                            </span>
                          ) : entry.value === 'x' ? (
                            <span className="flex items-center gap-2 text-red-500">
                              <XCircle className="w-4 h-4 shrink-0" />
                              Not Available
                            </span>
                          ) : entry.value ? (
                            <span className="flex items-center gap-2 text-green-600 truncate">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span className="truncate">
                                {convertRangeToLocal(entry.value)}
                                {isConverting && (
                                  <span className="text-xs text-muted-foreground ml-1">({entry.value} {getTimezoneAbbr(botTimezone)})</span>
                                )}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setUnavailable(entry.date)}
                            disabled={saving || entry.isSaving}
                            className={cn(microInteractions.activePress, microInteractions.smooth)}
                          >
                            Not Available
                          </Button>
                        </TableCell>
                      </>
                    )}
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
