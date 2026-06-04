import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays } from 'lucide-react';
import { PageSpinner } from '@/components/ui/page-spinner';
import { toast } from 'sonner';
import { BOT_API_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import { useTimezone } from '@/lib/timezone';
import { parseDDMMYYYY, formatDateToDDMMYYYY } from '@/lib/date-utils';
import { useUserDiscordId } from '@/hooks/use-user-discord-id';
import { AvailabilityGrid, type AvailabilityEntry, type TimeWindow } from './availability-grid';
import { parseWindows } from '@/lib/availability-utils';

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

export function UserAvailability() {
  const { user, isLoading: authLoading } = useUserDiscordId();
  const userDiscordId = user?.discordId || '';
  const { convertRangeToLocal, convertRangeToBot, botTimezoneLoaded, timezoneVersion } = useTimezone();
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !userDiscordId || !botTimezoneLoaded) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userDiscordId, botTimezoneLoaded, timezoneVersion]);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [absencesRes, scheduleRes, recurringRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/absences?userId=${userDiscordId}`, { headers }),
        fetch(`${BOT_API_URL}/api/schedule/next14`, { headers }),
        fetch(`${BOT_API_URL}/api/recurring-availability?userId=${userDiscordId}`, { headers }),
      ]);

      const [absencesData, scheduleData, recurringData] = await Promise.all([
        absencesRes.ok ? absencesRes.json().catch(() => ({ absences: [] })) : Promise.resolve({ absences: [] }),
        scheduleRes.ok ? scheduleRes.json().catch(() => ({ schedules: [] })) : Promise.resolve({ schedules: [] }),
        recurringRes.ok ? recurringRes.json().catch(() => ({ entries: [] })) : Promise.resolve({ entries: [] }),
      ]);

      const recurringMap = new Map<number, string>();
      for (const entry of (recurringData.entries || [])) {
        if (entry.active) recurringMap.set(entry.dayOfWeek, entry.availability);
      }

      const absences: AbsenceData[] = absencesData.absences || [];

      if (!scheduleRes.ok) {
        toast.error('Failed to load schedule');
        setLoading(false);
        return;
      }

      const schedules = scheduleData.schedules || [];
      const dateEntries: AvailabilityEntry[] = [];
      const today = new Date();

      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = formatDateToDDMMYYYY(date);

        const schedule = schedules.find((s: any) => s.date === dateStr);
        const player = schedule?.players?.find((p: any) => p.userId === userDiscordId);
        const availability = player?.availability || '';
        const dayOfWeek = date.getDay();
        const recurringValue = recurringMap.get(dayOfWeek);
        const isRecurring = !!(availability && recurringValue && availability === recurringValue);

        const windows = parseWindows(availability, convertRangeToLocal);

        dateEntries.push({
          date: dateStr,
          value: availability,
          windows,
          isRecurring,
          isAbsent: isDateInAbsence(dateStr, absences),
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

  const updateEntry = async (
    date: string,
    availability: string,
    localUpdates: Partial<AvailabilityEntry>,
  ) => {
    setEntries(prev => prev.map(e =>
      e.date === date ? { ...e, isSaving: true, justSaved: false } : e
    ));
    try {
      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ date, userId: userDiscordId, availability }),
      });
      if (response.ok) {
        setEntries(prev => prev.map(e =>
          e.date === date ? { ...e, ...localUpdates, isSaving: false, justSaved: true } : e
        ));
        setTimeout(() => {
          setEntries(prev => prev.map(e =>
            e.date === date ? { ...e, justSaved: false } : e
          ));
        }, 1500);
      } else {
        toast.error('Failed to update availability');
        setEntries(prev => prev.map(e =>
          e.date === date ? { ...e, isSaving: false } : e
        ));
      }
    } catch {
      toast.error('Failed to save availability');
      setEntries(prev => prev.map(e =>
        e.date === date ? { ...e, isSaving: false } : e
      ));
    }
  };

  const saveSlots = (date: string, windows: TimeWindow[]) => {
    if (windows.length === 0) {
      void updateEntry(date, '', {
        value: '',
        windows: [],
        isRecurring: false,
      });
      return;
    }
    const localValue = windows.map(w => `${w.from}-${w.to}`).join(',');
    const botValue = convertRangeToBot(localValue);
    void updateEntry(date, botValue, {
      value: botValue,
      windows: windows.map(w => ({ ...w })),
      isRecurring: false,
    });
  };

  const setUnavailable = (date: string) => {
    void updateEntry(date, 'x', {
      value: 'x',
      windows: [],
      isRecurring: false,
    });
  };

  const clearEntry = (date: string) => {
    void updateEntry(date, '', {
      value: '',
      windows: [],
      isRecurring: false,
    });
  };

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Card className="animate-fadeIn flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Availability
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag across the grid to mark when you're available over the next 14 days. Changes save automatically.
          </p>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col pb-6">
          <AvailabilityGrid
            entries={entries}
            onSaveSlots={saveSlots}
            onSetUnavailable={setUnavailable}
            onClear={clearEntry}
          />
        </CardContent>
      </Card>
    </div>
  );
}
