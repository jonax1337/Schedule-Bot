'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Calendar, Save, RefreshCw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface UserMapping {
  discordId: string;
  discordUsername: string;
  displayName: string;
  role: 'main' | 'sub' | 'coach';
  sortOrder: number;
}

interface SchedulePlayer {
  userId: string;
  displayName: string;
  availability: string;
  role: string;
}

interface ScheduleData {
  date: string;
  players: SchedulePlayer[];
  reason?: string;
  focus?: string;
}

export function ScheduleEditor() {
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [userMappings, setUserMappings] = useState<UserMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ date: string; userId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [hasNewer, setHasNewer] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedDateForReason, setSelectedDateForReason] = useState<string | null>(null);
  const [reasonValue, setReasonValue] = useState('');

  const PREDEFINED_SUGGESTIONS = [
    'Training',
    'Off-Day',
    'VOD-Review',
    'Scrims',
    'Premier',
    'Tournament',
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (page: number = 0) => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      
      // Load user mappings and schedules
      const [mappingsRes, schedulesRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/user-mappings`),
        fetch(`${BOT_API_URL}/api/schedule/paginated?offset=${page}`, { headers: getAuthHeaders() }),
      ]);

      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        const sorted = (data.mappings || []).sort((a: UserMapping, b: UserMapping) => a.sortOrder - b.sortOrder);
        setUserMappings(sorted);
      }

      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data.schedules || []);
        setHasMore(data.hasMore || false);
        setHasNewer(data.hasNewer || false);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (date: string, userId: string, currentValue: string) => {
    setEditingCell({ date, userId });
    setEditValue(currentValue || '');
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;

    const { date, userId } = editingCell;
    const schedule = schedules.find(s => s.date === date);
    const player = schedule?.players.find(p => p.userId === userId);
    const currentValue = player?.availability || '';

    if (editValue !== currentValue) {
      await saveCell(date, userId, editValue);
    }

    setEditingCell(null);
  };

  const saveCell = async (date: string, userId: string, availability: string) => {
    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          userId,
          availability,
        }),
      });

      if (response.ok) {
        toast.success('Availability updated');
        // Update local state
        setSchedules(prevSchedules => {
          return prevSchedules.map(schedule => {
            if (schedule.date === date) {
              return {
                ...schedule,
                players: schedule.players.map(player => {
                  if (player.userId === userId) {
                    return { ...player, availability };
                  }
                  return player;
                }),
              };
            }
            return schedule;
          });
        });
      } else {
        toast.error('Failed to update availability');
      }
    } catch (error) {
      console.error('Failed to update:', error);
      toast.error('Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  const handleReasonClick = (date: string, currentReason?: string) => {
    setSelectedDateForReason(date);
    setReasonValue(currentReason || '');
    setReasonDialogOpen(true);
  };

  const saveReason = async () => {
    if (!selectedDateForReason) return;

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/schedule/update-reason`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: selectedDateForReason,
          reason: reasonValue.trim(),
          focus: '',
        }),
      });

      if (response.ok) {
        toast.success('Reason updated');
        // Update local state
        setSchedules(prevSchedules => {
          return prevSchedules.map(schedule => {
            if (schedule.date === selectedDateForReason) {
              return {
                ...schedule,
                reason: reasonValue.trim(),
                focus: '',
              };
            }
            return schedule;
          });
        });
        setReasonDialogOpen(false);
      } else {
        toast.error('Failed to update reason');
      }
    } catch (error) {
      console.error('Failed to update reason:', error);
      toast.error('Failed to update reason');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="p-2">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Skeleton className="h-8 w-24" />
                  {Array.from({ length: 7 }).map((_, j) => (
                    <Skeleton key={j} className="h-8 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Editor
            </CardTitle>
            <CardDescription>
              {currentPage === 0 
                ? 'Edit player availability for the next 14 days'
                : `Viewing historical data (${currentPage * 14} - ${(currentPage + 1) * 14} days from now)`
              }
            </CardDescription>
          </div>
          <Button onClick={() => loadData(currentPage)} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[120px]">Reason</TableHead>
                {userMappings.map((mapping) => (
                  <TableHead key={mapping.discordId} className="min-w-[120px]">
                    <div className="flex flex-col">
                      <span className="font-semibold">{mapping.displayName}</span>
                      <span className="text-xs text-muted-foreground capitalize">{mapping.role}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => {
                // Parse date and get weekday
                const getWeekday = (dateStr: string) => {
                  const [day, month, year] = dateStr.split('.');
                  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  return date.toLocaleDateString('en-US', { weekday: 'long' });
                };
                
                return (
                <TableRow key={schedule.date}>
                  <TableCell className="sticky left-0 bg-background z-10">
                    <div className="flex flex-col">
                      <span className="font-medium">{schedule.date}</span>
                      <span className="text-xs text-muted-foreground">{getWeekday(schedule.date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReasonClick(schedule.date, schedule.reason)}
                      className="h-8 w-full justify-start text-xs p-1"
                    >
                      <div className={
                        `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                          schedule.reason === 'Premier' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
                          schedule.reason === 'Off-Day' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' :
                          schedule.reason === 'VOD-Review' ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300' :
                          schedule.reason === 'Scrims' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                          schedule.reason === 'Tournament' ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' :
                          'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                        }`
                      }>
                        {schedule.reason === 'Premier' && (
                          <Image
                            src="/assets/Premier_logo.png"
                            alt="Premier"
                            width={12}
                            height={12}
                            className="mr-1"
                          />
                        )}
                        {schedule.reason || 'Training'}
                      </div>
                    </Button>
                  </TableCell>
                  {userMappings.map((mapping) => {
                    const player = schedule.players.find(p => p.userId === mapping.discordId);
                    const availability = player?.availability || '';
                    const isEditing = editingCell?.date === schedule.date && editingCell?.userId === mapping.discordId;

                    return (
                      <TableCell key={mapping.discordId} className="p-1">
                        {isEditing ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="h-8 text-sm"
                            placeholder="14:00-20:00 or x"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(schedule.date, mapping.discordId, availability)}
                            className="h-8 px-2 flex items-center cursor-pointer hover:bg-accent rounded text-sm"
                          >
                            {availability || '-'}
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {saving && (
          <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </div>
        )}
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            {currentPage === 0 ? (
              <span className="font-medium">Next 14 days</span>
            ) : currentPage < 0 ? (
              <span className="font-medium">Previous {Math.abs(currentPage) * 14} days</span>
            ) : (
              <span className="font-medium">Days {currentPage * 14 + 1}-{currentPage * 14 + 14} ahead</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(currentPage - 1)}
              disabled={loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Older
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => loadData(0)}
              disabled={currentPage === 0 || loading}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(currentPage + 1)}
              disabled={loading}
            >
              Newer
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Reason Dialog */}
        <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Reason for {selectedDateForReason}</DialogTitle>
              <DialogDescription>
                Choose the type of activity for this date
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag</label>
                <div className="relative">
                  <Input
                    value={reasonValue}
                    onChange={(e) => setReasonValue(e.target.value)}
                    placeholder="Enter tag (e.g., Training, Premier, Off-Day)"
                    className="pr-8"
                  />
                  {reasonValue && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setReasonValue('')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {PREDEFINED_SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setReasonValue(suggestion)}
                    >
                      {suggestion === 'Premier' && (
                        <Image
                          src="/assets/Premier_logo.png"
                          alt="Premier"
                          width={10}
                          height={10}
                          className="mr-1"
                        />
                      )}
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setReasonDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveReason} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
