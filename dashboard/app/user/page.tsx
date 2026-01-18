'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, XCircle, Clock, Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface DateEntry {
  date: string;
  value: string;
  timeFrom: string;
  timeTo: string;
  selected?: boolean;
}

export default function UserSchedule() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [userColumn, setUserColumn] = useState('');
  const [userColumnIndex, setUserColumnIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkTimeFrom, setBulkTimeFrom] = useState('');
  const [bulkTimeTo, setBulkTimeTo] = useState('');

  const selectedEntries = entries.filter(e => e.selected);
  const hasSelection = selectedEntries.length > 0;

  useEffect(() => {
    const savedUser = localStorage.getItem('selectedUser');
    if (!savedUser) {
      router.push('/login');
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
            timeTo,
            selected: false
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

  const toggleSelection = (date: string) => {
    setEntries(prev => prev.map(e => 
      e.date === date ? { ...e, selected: !e.selected } : e
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = entries.every(e => e.selected);
    setEntries(prev => prev.map(e => ({ ...e, selected: !allSelected })));
  };

  const handleBulkApply = () => {
    if (!bulkTimeFrom || !bulkTimeTo) {
      toast.error('Please enter both start and end time');
      return;
    }

    if (bulkTimeTo <= bulkTimeFrom) {
      toast.error('End time must be after start time');
      return;
    }

    setEntries(prev => prev.map(e => 
      e.selected ? { ...e, timeFrom: bulkTimeFrom, timeTo: bulkTimeTo, value: `${bulkTimeFrom}-${bulkTimeTo}` } : e
    ));
    
    toast.success(`Applied time to ${selectedEntries.length} ${selectedEntries.length === 1 ? 'entry' : 'entries'}`);
  };

  const handleBulkNotAvailable = () => {
    setEntries(prev => prev.map(e => 
      e.selected ? { ...e, value: 'x', timeFrom: '', timeTo: '' } : e
    ));
    
    toast.success(`Marked ${selectedEntries.length} ${selectedEntries.length === 1 ? 'entry' : 'entries'} as not available`);
  };

  const handleBulkSave = async () => {
    if (selectedEntries.length === 0) {
      toast.error('No entries selected');
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

      let successCount = 0;
      for (const entry of selectedEntries) {
        const rowIndex = rows.findIndex((r: string[]) => r[0] === entry.date);
        if (rowIndex === -1) continue;

        const response = await fetch(`${BOT_API_URL}/api/sheet-data/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            row: rowIndex + 1,
            column: userColumn,
            value: entry.value,
          }),
        });

        if (response.ok) {
          successCount++;
        }
      }

      if (successCount === selectedEntries.length) {
        toast.success(`Saved ${successCount} ${successCount === 1 ? 'entry' : 'entries'}!`);
        // Deselect all after successful save
        setEntries(prev => prev.map(e => ({ ...e, selected: false })));
      } else {
        toast.warning(`Saved ${successCount} of ${selectedEntries.length} entries`);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
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
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6 animate-slideDown">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Home
          </Button>
          <ThemeToggle />
        </div>

        <div className="mb-6 animate-fadeIn">
          <h1 className="text-2xl sm:text-3xl font-bold">Availability</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your availability for the next 14 days
          </p>
        </div>

        {/* Bulk Actions Bar */}
        {hasSelection && (
          <Card className="mb-4 border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 animate-slideUp">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <span>{selectedEntries.length} selected</span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 flex-1">
                    <Label htmlFor="bulk-from" className="text-xs whitespace-nowrap">From:</Label>
                    <Input
                      id="bulk-from"
                      type="time"
                      value={bulkTimeFrom}
                      onChange={(e) => setBulkTimeFrom(e.target.value)}
                      className="h-9"
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Label htmlFor="bulk-to" className="text-xs whitespace-nowrap">To:</Label>
                    <Input
                      id="bulk-to"
                      type="time"
                      value={bulkTimeTo}
                      onChange={(e) => setBulkTimeTo(e.target.value)}
                      className="h-9"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkApply}
                    disabled={saving || !bulkTimeFrom || !bulkTimeTo}
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Apply Time
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkNotAvailable}
                    disabled={saving}
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    Not Available
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBulkSave}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                    Save All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={entries.length > 0 && entries.every(e => e.selected)}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Weekday</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const display = getDisplayValue(entry.value);
                return (
                  <TableRow key={entry.date} className={entry.selected ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={entry.selected}
                        onCheckedChange={() => toggleSelection(entry.date)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{entry.date}</TableCell>
                    <TableCell className="text-muted-foreground">{getWeekday(entry.date)}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1.5 ${display.color}`}>
                        {display.icon}
                        <span className="text-sm">{display.text}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={entry.timeFrom}
                        onChange={(e) => handleTimeChange(entry.date, 'from', e.target.value)}
                        className="h-9 w-32"
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={entry.timeTo}
                        onChange={(e) => handleTimeChange(entry.date, 'to', e.target.value)}
                        className="h-9 w-32"
                        disabled={saving}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSave(entry.date, entry.timeFrom, entry.timeTo)}
                          disabled={saving || !entry.timeFrom || !entry.timeTo}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleNotAvailable(entry.date)}
                          disabled={saving}
                          title="Mark as not available"
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
