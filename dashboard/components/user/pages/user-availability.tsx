'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, XCircle, Clock, CheckSquare, Check, PlaneTakeoff, CalendarDays, RefreshCw, Trash2 } from 'lucide-react';
import { PageSpinner } from '@/components/ui/page-spinner';
import { toast } from 'sonner';
import { stagger, microInteractions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useTimezone, getTimezoneAbbr } from '@/lib/timezone';
import { parseDDMMYYYY, getWeekdayName, formatDateToDDMMYYYY } from '@/lib/date-utils';
import { useUserDiscordId, useSchedule, useAbsences, useRecurringAvailability } from '@/hooks';

interface AbsenceData {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

function isDateInAbsence(date: string, absences: AbsenceData[]): boolean {
  const d = parseDDMMYYYY(date);
  return absences.some(a => {
    const start = parseDDMMYYYY(a.startDate);
    const end = parseDDMMYYYY(a.endDate);
    return d >= start && d <= end;
  });
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
  isRecurring?: boolean;
}

export function UserAvailability() {
  const { user, isLoading: authLoading } = useUserDiscordId();
  const userDiscordId = user?.discordId || '';
  const { convertRangeToLocal, convertRangeToBot, isConverting, botTimezone, botTimezoneLoaded, timezoneVersion } = useTimezone();

  // Use hooks for data fetching
  const {
    schedules,
    loading: scheduleLoading,
    updateAvailability: hookUpdateAvailability,
  } = useSchedule({ fetchOnMount: botTimezoneLoaded });

  const {
    absences: absenceData,
    loading: absenceLoading,
  } = useAbsences({ userId: userDiscordId, fetchOnMount: !!userDiscordId && botTimezoneLoaded });

  const {
    recurring,
    loading: recurringLoading,
  } = useRecurringAvailability({ userId: userDiscordId, fetchOnMount: !!userDiscordId && botTimezoneLoaded });

  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [bulkTimeFrom, setBulkTimeFrom] = useState('');
  const [bulkTimeTo, setBulkTimeTo] = useState('');
  const autoSaveTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Convert hook absences to local format
  const absences: AbsenceData[] = absenceData.map(a => ({
    id: a.id,
    userId: a.userId,
    startDate: a.startDate,
    endDate: a.endDate,
    reason: a.reason || '',
  }));

  // Build recurring lookup: dayOfWeek -> availability
  const recurringMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const entry of recurring) {
      if (entry.active) {
        map.set(entry.dayOfWeek, entry.availability);
      }
    }
    return map;
  }, [recurring]);

  // Sync hook data to local state with timezone conversion
  useEffect(() => {
    if (authLoading || !userDiscordId || !botTimezoneLoaded || scheduleLoading) return;

    const dateEntries: DateEntry[] = [];
    const today = new Date();

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = formatDateToDDMMYYYY(date);

      const schedule = schedules.find((s) => s.date === dateStr);
      const player = schedule?.players?.find((p) => p.userId === userDiscordId);
      const availability = player?.availability || '';
      const dayOfWeek = date.getDay();
      const recurringValue = recurringMap.get(dayOfWeek);
      const isRecurring = !!(availability && recurringValue && availability === recurringValue);

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
        isRecurring,
      });
    }

    setEntries(dateEntries);
  }, [schedules, authLoading, userDiscordId, botTimezoneLoaded, scheduleLoading, timezoneVersion, recurringMap, convertRangeToLocal]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

  // Unified save helper for single-date availability updates
  const updateEntry = async (
    date: string,
    availability: string,
    localUpdates: Partial<DateEntry>,
    opts?: { successMsg?: string; silent?: boolean }
  ) => {
    setEntries(prev => prev.map(e =>
      e.date === date ? { ...e, isSaving: true, justSaved: false } : e
    ));

    const success = await hookUpdateAvailability(date, userDiscordId, availability);

    if (success) {
      if (opts?.successMsg && !opts?.silent) toast.success(opts.successMsg);
      setEntries(prev => prev.map(e =>
        e.date === date ? { ...e, ...localUpdates, isSaving: false, justSaved: true } : e
      ));
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
  };

  const saveEntry = async (date: string, timeFrom: string, timeTo: string, isAutoSave = false) => {
    if (!timeFrom || !timeTo) {
      if (!isAutoSave) toast.error('Please enter both start and end time');
      return;
    }
    if (timeTo <= timeFrom) {
      if (!isAutoSave) toast.error('End time must be after start time');
      return;
    }
    const localValue = `${timeFrom}-${timeTo}`;
    const botValue = convertRangeToBot(localValue);
    await updateEntry(date, botValue, {
      value: localValue, originalTimeFrom: timeFrom, originalTimeTo: timeTo,
    }, { successMsg: 'Availability updated!', silent: isAutoSave });
  };

  const clearAvailability = async (date: string, isAutoSave = true) => {
    await updateEntry(date, '', {
      value: '', timeFrom: '', timeTo: '', originalTimeFrom: '', originalTimeTo: '',
    }, { successMsg: 'Availability cleared', silent: isAutoSave });
  };

  const setUnavailable = async (date: string) => {
    await updateEntry(date, 'x', {
      value: 'x', timeFrom: '', timeTo: '', originalTimeFrom: '', originalTimeTo: '',
    }, { successMsg: 'Marked as not available' });
  };

  const clearEntry = async (date: string) => {
    await updateEntry(date, '', {
      value: '', timeFrom: '', timeTo: '', originalTimeFrom: '', originalTimeTo: '', isRecurring: false,
    });
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

  // Unified bulk update helper
  const bulkUpdate = async (availability: string, localUpdates: Partial<DateEntry>, successMsg: string) => {
    if (selectedDates.size === 0) {
      toast.error('Please select at least one date');
      return;
    }
    setSaving(true);

    const updates = Array.from(selectedDates).map(date =>
      hookUpdateAvailability(date, userDiscordId, availability)
    );
    const results = await Promise.all(updates);

    if (results.every(r => r)) {
      toast.success(successMsg);
      setEntries(prev => prev.map(e =>
        selectedDates.has(e.date) ? { ...e, ...localUpdates } : e
      ));
      setSelectedDates(new Set());
      setBulkTimeFrom('');
      setBulkTimeTo('');
    } else {
      toast.error('Some updates failed');
    }
    setSaving(false);
  };

  const bulkSetTime = async () => {
    if (!bulkTimeFrom || !bulkTimeTo) {
      toast.error('Please enter both start and end time');
      return;
    }
    if (bulkTimeTo <= bulkTimeFrom) {
      toast.error('End time must be after start time');
      return;
    }
    const localValue = `${bulkTimeFrom}-${bulkTimeTo}`;
    const botValue = convertRangeToBot(localValue);
    await bulkUpdate(botValue, {
      value: localValue, timeFrom: bulkTimeFrom, timeTo: bulkTimeTo,
      originalTimeFrom: bulkTimeFrom, originalTimeTo: bulkTimeTo,
    }, `Updated ${selectedDates.size} day(s)`);
  };

  const bulkSetUnavailable = () => bulkUpdate('x', {
    value: 'x', timeFrom: '', timeTo: '', originalTimeFrom: '', originalTimeTo: '',
  }, `Marked ${selectedDates.size} day(s) as unavailable`);

  const bulkClear = () => bulkUpdate('', {
    value: '', timeFrom: '', timeTo: '', originalTimeFrom: '', originalTimeTo: '',
  }, `Cleared ${selectedDates.size} day(s)`);

  const loading = scheduleLoading || absenceLoading || recurringLoading || authLoading;
  if (loading) {
    return <PageSpinner />;
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Availability
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set your availability for the next 14 days. Changes are auto-saved when you fill in both time fields.
          </p>
        </CardHeader>
        <CardContent>
          <Table className="table-fixed w-full">
            <colgroup>
              <col className="w-10" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col />
              <col className="w-[180px]" />
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
                        <TableCell>
                          {entry.justSaved ? (
                            <span className="flex items-center gap-2 text-green-600 animate-fadeIn">
                              <Check className="w-4 h-4" />
                              Saved
                            </span>
                          ) : entry.value === 'x' ? (
                            <span className="flex items-center gap-2 text-red-500">
                              <XCircle className="w-4 h-4" />
                              Not Available
                              {entry.isRecurring && (
                                <RefreshCw className="w-3 h-3 text-muted-foreground" />
                              )}
                            </span>
                          ) : entry.value ? (
                            <span className="flex items-center gap-2 text-green-600">
                              <Clock className="w-4 h-4" />
                              {convertRangeToLocal(entry.value)}
                              {isConverting && (
                                <span className="text-xs text-muted-foreground">({entry.value} {getTimezoneAbbr(botTimezone)})</span>
                              )}
                              {entry.isRecurring && (
                                <RefreshCw className="w-3 h-3 text-muted-foreground" />
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            {entry.value && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => clearEntry(entry.date)}
                                disabled={saving || entry.isSaving}
                                className={cn(microInteractions.activePress, microInteractions.smooth)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setUnavailable(entry.date)}
                              disabled={saving || entry.isSaving}
                              className={cn(microInteractions.activePress, microInteractions.smooth)}
                            >
                              Not Available
                            </Button>
                          </div>
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
