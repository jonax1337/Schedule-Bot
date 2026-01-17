'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';

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
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [userColumn, setUserColumn] = useState('');
  const [userColumnIndex, setUserColumnIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('selectedUser');
    if (!savedUser) {
      router.push('/');
      return;
    }
    setUserName(savedUser);
    loadData(savedUser);
  }, [router]);

  const loadData = async (user: string) => {
    setLoading(true);
    try {
      // Get user's column
      const columnsRes = await fetch(`${BOT_API_URL}/api/sheet-columns`);
      if (!columnsRes.ok) {
        toast.error('Failed to load columns');
        return;
      }
      
      const columnsData = await columnsRes.json();
      const userCol = columnsData.columns.find((c: any) => c.name === user);
      
      if (!userCol) {
        toast.error('User column not found');
        return;
      }
      
      setUserColumn(userCol.column);
      setUserColumnIndex(userCol.index);

      // Get schedule data (up to 50 rows to get at least 14 days)
      const sheetRes = await fetch(`${BOT_API_URL}/api/sheet-data?startRow=1&endRow=50`);
      if (!sheetRes.ok) {
        toast.error('Failed to load schedule');
        return;
      }
      
      const result = await sheetRes.json();
      const rows = result.data;
      
      // Get the next 14 entries from sheet (skip header)
      const dateEntries: DateEntry[] = [];
      for (let i = 1; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (row && row[0]) {
          const value = row[userCol.index] || '';
          // Parse existing time range (e.g., "19:00-21:00")
          let timeFrom = '';
          let timeTo = '';
          if (value && value !== 'x') {
            const parts = value.split('-');
            if (parts.length === 2) {
              timeFrom = parts[0].trim();
              timeTo = parts[1].trim();
            }
          }
          
          dateEntries.push({
            date: row[0],
            value,
            timeFrom,
            timeTo
          });
        }
      }
      
      setEntries(dateEntries);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (date: string, timeFrom: string, timeTo: string) => {
    if (!userColumn) {
      toast.error('User column not found');
      return;
    }

    // Validate times
    if (!timeFrom || !timeTo) {
      toast.error('Please enter both start and end time');
      return;
    }

    // Check if end time is after start time
    if (timeTo <= timeFrom) {
      toast.error('End time must be after start time');
      return;
    }

    const value = `${timeFrom}-${timeTo}`;

    setSaving(true);
    try {
      // Find row number for this date
      const sheetRes = await fetch(`${BOT_API_URL}/api/sheet-data?startRow=1&endRow=50`);
      if (!sheetRes.ok) {
        toast.error('Failed to load sheet data');
        return;
      }
      
      const result = await sheetRes.json();
      const rows = result.data;
      const rowIndex = rows.findIndex((r: string[]) => r[0] === date);
      
      if (rowIndex === -1) {
        toast.error('Date not found in sheet');
        return;
      }

      const response = await fetch(`${BOT_API_URL}/api/sheet-data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row: rowIndex + 1,
          column: userColumn,
          value,
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

  const handleNotAvailable = async (date: string) => {
    if (!userColumn) {
      toast.error('User column not found');
      return;
    }

    setSaving(true);
    try {
      const sheetRes = await fetch(`${BOT_API_URL}/api/sheet-data?startRow=1&endRow=50`);
      if (!sheetRes.ok) {
        toast.error('Failed to load sheet data');
        return;
      }
      
      const result = await sheetRes.json();
      const rows = result.data;
      const rowIndex = rows.findIndex((r: string[]) => r[0] === date);
      
      if (rowIndex === -1) {
        toast.error('Date not found in sheet');
        return;
      }

      const response = await fetch(`${BOT_API_URL}/api/sheet-data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row: rowIndex + 1,
          column: userColumn,
          value: 'x',
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

  const getWeekday = (dateStr: string) => {
    // Parse date format: DD.MM.YYYY
    const parts = dateStr.split('.');
    if (parts.length !== 3) return '';
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // Month is 0-indexed
    const year = parseInt(parts[2]);
    
    const date = new Date(year, month, day);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[date.getDay()];
  };

  const getDisplayValue = (value: string) => {
    if (!value) return { icon: null, text: 'Not set', color: 'text-gray-400' };
    if (value === 'x') return { icon: <XCircle className="w-4 h-4" />, text: 'Not Available', color: 'text-red-500' };
    return { icon: <Clock className="w-4 h-4" />, text: value, color: 'text-green-600' };
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
      <div className="container mx-auto p-3 sm:p-4 max-w-5xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <ThemeToggle />
        </div>

        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Welcome, {userName}!</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enter your available time or mark as unavailable
          </p>
        </div>

        <div className="space-y-2">
          {entries.map((entry) => {
            const display = getDisplayValue(entry.value);
            return (
              <Card key={entry.date} className="p-2 sm:p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="flex items-center justify-between sm:justify-start gap-3">
                    <div className="flex-shrink-0 w-28 sm:w-32 font-medium text-xs sm:text-sm">
                      <div>{entry.date}</div>
                      <div className="text-xs text-muted-foreground">{getWeekday(entry.date)}</div>
                    </div>
                    
                    <div className={`flex items-center gap-1 flex-shrink-0 w-28 sm:w-32 text-xs sm:text-sm ${display.color}`}>
                      {display.icon}
                      <span className="truncate">{display.text}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-1 flex-1">
                        <Label htmlFor={`from-${entry.date}`} className="text-xs whitespace-nowrap">From:</Label>
                        <Input
                          id={`from-${entry.date}`}
                          type="time"
                          value={entry.timeFrom}
                          onChange={(e) => handleTimeChange(entry.date, 'from', e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <Label htmlFor={`to-${entry.date}`} className="text-xs whitespace-nowrap">To:</Label>
                        <Input
                          id={`to-${entry.date}`}
                          type="time"
                          value={entry.timeTo}
                          onChange={(e) => handleTimeChange(entry.date, 'to', e.target.value)}
                          className="h-8 text-sm"
                          disabled={saving}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSave(entry.date, entry.timeFrom, entry.timeTo)}
                        disabled={saving || !entry.timeFrom || !entry.timeTo}
                        className="h-8 px-3 whitespace-nowrap flex-1 sm:flex-none"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleNotAvailable(entry.date)}
                        disabled={saving}
                        className="h-8 px-3 flex-1 sm:flex-none"
                        title="Not available"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
