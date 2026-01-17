'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface DateEntry {
  date: string;
  value: string;
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
          dateEntries.push({
            date: row[0],
            value: row[userCol.index] || ''
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

  const handleSave = async (date: string, value: string) => {
    if (!userColumn) {
      toast.error('User column not found');
      return;
    }

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
          e.date === date ? { ...e, value } : e
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

  const handleTimeChange = (date: string, value: string) => {
    setEntries(prev => prev.map(e => 
      e.date === date ? { ...e, value } : e
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Welcome, {userName}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your available time or mark as unavailable
          </p>
        </div>

        <div className="space-y-2">
          {entries.map((entry) => {
            const display = getDisplayValue(entry.value);
            return (
              <Card key={entry.date} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-32 font-medium text-sm">
                    <div>{entry.date}</div>
                    <div className="text-xs text-muted-foreground">{getWeekday(entry.date)}</div>
                  </div>
                  
                  <div className={`flex items-center gap-1 flex-shrink-0 w-32 text-sm ${display.color}`}>
                    {display.icon}
                    <span className="truncate">{display.text}</span>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="e.g. 19:00-21:00"
                      value={entry.value === 'x' ? '' : entry.value}
                      onChange={(e) => handleTimeChange(entry.date, e.target.value)}
                      className="h-8 text-sm"
                      disabled={saving}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSave(entry.date, entry.value)}
                      disabled={saving || !entry.value || entry.value === 'x'}
                      className="h-8 px-3"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSave(entry.date, 'x')}
                      disabled={saving}
                      className="h-8 px-3"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
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
