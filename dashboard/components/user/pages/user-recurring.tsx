'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Loader2, RefreshCw, Trash2, Clock, XCircle, Check, CheckSquare } from 'lucide-react';
import { PageSpinner } from '@/components/ui/page-spinner';
import { toast } from 'sonner';
import { stagger, microInteractions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { useTimezone, getTimezoneAbbr } from '@/lib/timezone';
import { WEEKDAY_NAMES } from '@/lib/date-utils';
import { useUserDiscordId, useRecurringAvailability } from '@/hooks';

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
  const { user, isLoading: authLoading } = useUserDiscordId();
  const userDiscordId = user?.discordId || '';
  const { convertRangeToLocal, convertRangeToBot, isConverting, userTimezone, botTimezone, botTimezoneLoaded, timezoneVersion } = useTimezone();

  // Use hook for data fetching
  const {
    recurring,
    loading: hookLoading,
    setRecurring: hookSetRecurring,
    setRecurringBulk: hookSetRecurringBulk,
    removeRecurring: hookRemoveRecurring,
  } = useRecurringAvailability({ userId: userDiscordId, fetchOnMount: !!userDiscordId && botTimezoneLoaded });

  const [dayEntries, setDayEntries] = useState<DayEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [bulkTimeFrom, setBulkTimeFrom] = useState('');
  const [bulkTimeTo, setBulkTimeTo] = useState('');
  const autoSaveTimeoutsRef = useRef<Record<number, NodeJS.Timeout>>({});

  // Monday-first order
  const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  // Sync hook data to local state with timezone conversion
  useEffect(() => {
    if (authLoading || !userDiscordId || !botTimezoneLoaded) return;

    const newDayEntries: DayEntry[] = DAY_ORDER.map(dayOfWeek => {
      const entry = recurring.find(e => e.dayOfWeek === dayOfWeek);
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
  }, [recurring, authLoading, userDiscordId, botTimezoneLoaded, timezoneVersion, convertRangeToLocal]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(autoSaveTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
    };
  }, []);

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

    const localValue = `${timeFrom}-${timeTo}`;
    const botValue = convertRangeToBot(localValue);

    const success = await hookSetRecurring(dayOfWeek, botValue);

    if (success) {
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
  };

  const setDayUnavailable = async (dayOfWeek: number) => {
    setDayEntries(prev => prev.map(e =>
      e.dayOfWeek === dayOfWeek ? { ...e, isSaving: true, justSaved: false } : e
    ));

    const success = await hookSetRecurring(dayOfWeek, 'x');

    if (success) {
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
  };

  const removeDay = async (dayOfWeek: number) => {
    setDayEntries(prev => prev.map(e =>
      e.dayOfWeek === dayOfWeek ? { ...e, isSaving: true, justSaved: false } : e
    ));

    const success = await hookRemoveRecurring(dayOfWeek);

    if (success) {
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
    const localValue = `${bulkTimeFrom}-${bulkTimeTo}`;
    const botValue = convertRangeToBot(localValue);

    const success = await hookSetRecurringBulk(Array.from(selectedDays), botValue);

    if (success) {
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
    setSaving(false);
  };

  const bulkSetUnavailable = async () => {
    if (selectedDays.size === 0) {
      toast.error('Please select at least one day');
      return;
    }

    setSaving(true);
    const success = await hookSetRecurringBulk(Array.from(selectedDays), 'x');

    if (success) {
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
    setSaving(false);
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

  if (hookLoading || authLoading) {
    return <PageSpinner />;
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Recurring Entry"
        description={`Are you sure you want to remove the recurring availability for ${deleteTarget !== null ? WEEKDAY_NAMES[deleteTarget] : ''}?`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteTarget !== null) {
            removeDay(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />

      {/* Main Table */}
      <Card className="animate-fadeIn">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Recurring Weekly Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set your default weekly availability. Auto-applied when new schedule days are created. Override specific dates in &quot;Availability&quot;.
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
                      <div className="flex gap-1 justify-end">
                        {entry.availability && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(entry.dayOfWeek)}
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
