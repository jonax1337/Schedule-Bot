'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

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

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="animate-fadeIn">
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Weekday</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.date}>
                  <TableCell className="font-medium">{entry.date}</TableCell>
                  <TableCell className="text-muted-foreground">{getWeekdayName(entry.date)}</TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={entry.timeFrom}
                      onChange={(e) => handleTimeChange(entry.date, 'from', e.target.value)}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="time"
                      value={entry.timeTo}
                      onChange={(e) => handleTimeChange(entry.date, 'to', e.target.value)}
                      className="w-32"
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
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setUnavailable(entry.date)}
                        disabled={saving}
                      >
                        Not Available
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
