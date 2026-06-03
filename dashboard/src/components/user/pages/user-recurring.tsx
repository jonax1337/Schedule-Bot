import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';
import { PageSpinner } from '@/components/ui/page-spinner';
import { toast } from 'sonner';
import { BOT_API_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import { useTimezone } from '@/lib/timezone';
import { WEEKDAY_NAMES_SHORT } from '@/lib/date-utils';
import { useUserDiscordId } from '@/hooks/use-user-discord-id';
import { AvailabilityGrid, type AvailabilityEntry, type TimeWindow } from './availability-grid';

interface RecurringEntry {
  id: number;
  userId: string;
  dayOfWeek: number;
  availability: string;
  active: boolean;
}

// Monday-first order matches the Availability tab and how schedules read.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const keyForDay = (dow: number) => `dow-${dow}`;
const dayFromKey = (key: string): number => Number(key.slice(4));

export function UserRecurring() {
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
      const res = await fetch(
        `${BOT_API_URL}/api/recurring-availability?userId=${userDiscordId}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) {
        toast.error('Failed to load recurring schedule');
        setLoading(false);
        return;
      }
      const data = await res.json();
      const raw: RecurringEntry[] = data.entries || [];
      const byDay = new Map<number, RecurringEntry>();
      for (const e of raw) {
        if (e.active) byDay.set(e.dayOfWeek, e);
      }

      const built: AvailabilityEntry[] = DAY_ORDER.map((dow) => {
        const entry = byDay.get(dow);
        const availability = entry?.availability ?? '';
        return {
          date: keyForDay(dow),
          value: availability,
          windows: parseWindows(availability, convertRangeToLocal),
          headerPrimary: WEEKDAY_NAMES_SHORT[dow],
          headerSecondary: '',
        };
      });

      setEntries(built);
    } catch {
      toast.error('Failed to load recurring schedule');
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = async (
    key: string,
    availability: string,
    method: 'POST' | 'DELETE',
    localUpdates: Partial<AvailabilityEntry>,
  ) => {
    const dayOfWeek = dayFromKey(key);
    setEntries((prev) =>
      prev.map((e) => (e.date === key ? { ...e, isSaving: true, justSaved: false } : e)),
    );
    try {
      const response =
        method === 'DELETE'
          ? await fetch(
              `${BOT_API_URL}/api/recurring-availability/${dayOfWeek}?userId=${userDiscordId}`,
              { method: 'DELETE', headers: getAuthHeaders() },
            )
          : await fetch(`${BOT_API_URL}/api/recurring-availability`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ dayOfWeek, availability, userId: userDiscordId }),
            });

      if (!response.ok) {
        toast.error('Failed to update recurring schedule');
        setEntries((prev) =>
          prev.map((e) => (e.date === key ? { ...e, isSaving: false } : e)),
        );
        return;
      }

      setEntries((prev) =>
        prev.map((e) =>
          e.date === key ? { ...e, ...localUpdates, isSaving: false, justSaved: true } : e,
        ),
      );
      setTimeout(() => {
        setEntries((prev) =>
          prev.map((e) => (e.date === key ? { ...e, justSaved: false } : e)),
        );
      }, 1500);
    } catch {
      toast.error('Failed to save');
      setEntries((prev) =>
        prev.map((e) => (e.date === key ? { ...e, isSaving: false } : e)),
      );
    }
  };

  const saveSlots = (key: string, windows: TimeWindow[]) => {
    if (windows.length === 0) {
      void updateEntry(key, '', 'DELETE', { value: '', windows: [] });
      return;
    }
    const localValue = windows.map((w) => `${w.from}-${w.to}`).join(',');
    const botValue = convertRangeToBot(localValue);
    void updateEntry(key, botValue, 'POST', {
      value: botValue,
      windows: windows.map((w) => ({ ...w })),
    });
  };

  const setUnavailable = (key: string) => {
    void updateEntry(key, 'x', 'POST', { value: 'x', windows: [] });
  };

  const clearEntry = (key: string) => {
    void updateEntry(key, '', 'DELETE', { value: '', windows: [] });
  };

  if (loading) {
    return <PageSpinner />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Card className="animate-fadeIn flex-1 min-h-0 flex flex-col overflow-hidden">
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Recurring Weekly Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag across the grid to set your default weekly availability. Auto-applied to new
            schedule days. Override specific dates in &quot;Availability&quot;.
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

function parseWindows(availability: string, convertRangeToLocal: (s: string) => string): TimeWindow[] {
  if (!availability || availability === 'x' || availability === 'X') return [];
  if (!availability.includes('-')) return [];
  const local = convertRangeToLocal(availability);
  const out: TimeWindow[] = [];
  for (const seg of local.split(',')) {
    const parts = seg.trim().split('-');
    if (parts.length === 2 && parts[0] && parts[1]) {
      out.push({ from: parts[0].trim(), to: parts[1].trim() });
    }
  }
  return out;
}
