'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { AbsenceManager } from '@/components/absence-manager';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface DateEntry {
  date: string;
  value: string;
  timeFrom: string;
  timeTo: string;
}

export default function UserSchedule() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userDiscordId, setUserDiscordId] = useState('');
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const { validateToken, removeAuthToken } = await import('@/lib/auth');
        
        const savedUser = localStorage.getItem('selectedUser');
        if (!savedUser) {
          router.push('/login');
          return;
        }
        
        const isValid = await validateToken();
        if (!isValid) {
          removeAuthToken();
          localStorage.removeItem('selectedUser');
          router.push('/login');
          return;
        }
        
        setUserName(savedUser);
        loadData(savedUser);
      } catch (e) {
        console.error('Auth check error:', e);
        router.push('/login');
      }
    };
    
    checkAuthAndLoad();
  }, [router]);

  const loadData = async (user: string) => {
    setLoading(true);
    try {
      // Get user's Discord ID from user mappings
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

      // Get schedule data for next 14 days
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
      
      // Generate next 14 dates
      const today = new Date();
      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toLocaleDateString('de-DE');
        
        // Find schedule for this date
        const schedule = schedules.find((s: any) => s.date === dateStr);
        const player = schedule?.players?.find((p: any) => p.userId === userMapping.discordId);
        const availability = player?.availability || '';
        
        // Parse time range
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
        setEntries(prev => prev.map(e => 
          e.date === date ? { ...e, value, timeFrom, timeTo } : e
        ));
        toast.success('Availability updated!');
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
        setEntries(prev => prev.map(e => 
          e.date === date ? { ...e, value: 'x', timeFrom: '', timeTo: '' } : e
        ));
        toast.success('Marked as not available');
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Availability - {userName}
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage your availability for the next 14 days
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Absence Manager */}
        {userDiscordId && (
          <div className="mb-6">
            <AbsenceManager discordId={userDiscordId} username={userName} />
          </div>
        )}

        {/* Schedule Table */}
        <Card>
          <CardHeader>
            <CardTitle>Your Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
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
                    <TableCell>
                      <Input
                        type="time"
                        value={entry.timeFrom}
                        onChange={(e) => handleTimeChange(entry.date, 'from', e.target.value)}
                        disabled={entry.value === 'x'}
                        className="w-32"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={entry.timeTo}
                        onChange={(e) => handleTimeChange(entry.date, 'to', e.target.value)}
                        disabled={entry.value === 'x'}
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
                          disabled={saving || entry.value === 'x' || !entry.timeFrom || !entry.timeTo}
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
    </div>
  );
}
