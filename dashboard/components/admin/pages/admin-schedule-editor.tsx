'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Calendar, Save, RefreshCw, ChevronLeft, ChevronRight, X, PlaneTakeoff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { stagger, microInteractions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { BOT_API_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import { useTimezone, getTimezoneAbbr } from '@/lib/timezone';
import { getWeekdayName, getReasonBadgeClasses, SCHEDULE_REASON_SUGGESTIONS } from '@/lib/date-utils';

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
  const { convertRangeToLocal, convertRangeToBot, isConverting, userTimezone, botTimezoneLoaded, timezoneVersion } = useTimezone();
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [userMappings, setUserMappings] = useState<UserMapping[]>([]);
  const [absentByDate, setAbsentByDate] = useState<Record<string, string[]>>({});
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

  useEffect(() => {
    if (!botTimezoneLoaded) return;
    loadData();
  }, [botTimezoneLoaded, timezoneVersion]);

  const loadData = async (page: number = 0) => {
    setLoading(true);
    try {


      // Load user mappings and schedules
      const [mappingsRes, schedulesRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/user-mappings`, { headers: getAuthHeaders() }),
        fetch(`${BOT_API_URL}/api/schedule/paginated?offset=${page}`, { headers: getAuthHeaders() }),
      ]);

      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        const sorted = (data.mappings || []).sort((a: UserMapping, b: UserMapping) => a.sortOrder - b.sortOrder);
        setUserMappings(sorted);
      }

      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        const loadedSchedules = data.schedules || [];
        setSchedules(loadedSchedules);
        setHasMore(data.hasMore || false);
        setHasNewer(data.hasNewer || false);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);

        // Fetch absences for loaded dates
        if (loadedSchedules.length > 0) {
          const dates = loadedSchedules.map((s: ScheduleData) => s.date).join(',');
          try {
            const absencesRes = await fetch(`${BOT_API_URL}/api/absences/by-dates?dates=${dates}`, {
              headers: getAuthHeaders(),
            });
            if (absencesRes.ok) {
              const absenceData = await absencesRes.json();
              setAbsentByDate(absenceData.absentByDate || {});
            }
          } catch (err) {
            console.error('Failed to load absences:', err);
          }
        }
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
    const localValue = currentValue && currentValue !== 'x' && currentValue.includes('-')
      ? convertRangeToLocal(currentValue)
      : currentValue;
    setEditValue(localValue || '');
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
    const botAvailability = availability && availability !== 'x' && availability.includes('-')
      ? convertRangeToBot(availability)
      : availability;
    setSaving(true);
    try {

      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date,
          userId,
          availability: botAvailability,
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
                    return { ...player, availability: botAvailability };
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

  return (
    <Card className="animate-fadeIn">
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
          <Button
            onClick={() => loadData(currentPage)}
            variant="outline"
            size="sm"
            className={cn(microInteractions.hoverScale, microInteractions.smooth)}
          >
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
              {schedules.map((schedule, index) => {
                const isWeekend = (() => {
                  const [day, month, year] = schedule.date.split('.');
                  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  return d.getDay() === 0 || d.getDay() === 6;
                })();

                return (
                <TableRow key={schedule.date} className={cn(isWeekend && 'bg-muted/30', stagger(index, 'fast', 'fadeIn'))}>
                  <TableCell className={cn("sticky left-0 z-10", isWeekend ? 'bg-muted/30' : 'bg-background')}>
                    <div className="flex flex-col">
                      <span className="font-medium">{schedule.date}</span>
                      <span className="text-xs text-muted-foreground">{getWeekdayName(schedule.date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReasonClick(schedule.date, schedule.reason)}
                      className={cn("h-8 w-full justify-start text-xs p-1", microInteractions.smooth)}
                    >
                      <div className={
                        `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getReasonBadgeClasses(schedule.reason || 'Training')}`
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
                    const isAbsent = (absentByDate[schedule.date] || []).includes(mapping.discordId);

                    return (
                      <TableCell key={mapping.discordId} className="p-1">
                        {isAbsent ? (
                          <div className="h-8 px-2 flex items-center gap-1.5 text-sm text-purple-500 opacity-70">
                            <PlaneTakeoff className="w-3.5 h-3.5" />
                            <span className="font-medium">Absent</span>
                          </div>
                        ) : isEditing ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className={cn("h-8 text-sm", microInteractions.focusRing)}
                            placeholder={isConverting ? `14:00-20:00 (${getTimezoneAbbr(userTimezone)}) or x` : "14:00-20:00 or x"}
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(schedule.date, mapping.discordId, availability)}
                            className={cn("h-8 px-2 flex items-center cursor-pointer hover:bg-accent rounded text-sm", microInteractions.smooth)}
                          >
                            {availability
                              ? (availability === 'x' ? 'x' : convertRangeToLocal(availability))
                              : '-'}
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
          <div className="flex items-center justify-center mt-4 text-sm text-muted-foreground animate-scaleIn">
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
              className={cn(microInteractions.hoverScale, microInteractions.smooth)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Older
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => loadData(0)}
              disabled={currentPage === 0 || loading}
              className={cn(microInteractions.activePress, microInteractions.smooth)}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(currentPage + 1)}
              disabled={loading}
              className={cn(microInteractions.hoverScale, microInteractions.smooth)}
            >
              Newer
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Reason Dialog */}
        <Dialog open={reasonDialogOpen} onOpenChange={setReasonDialogOpen}>
          <DialogContent className="animate-scaleIn">
            <DialogHeader>
              <DialogTitle className={stagger(1, 'fast', 'fadeIn')}>Set Reason for {selectedDateForReason}</DialogTitle>
              <DialogDescription className={stagger(2, 'fast', 'fadeIn')}>
                Choose the type of activity for this date
              </DialogDescription>
            </DialogHeader>
            <div className={cn("space-y-4 py-4", stagger(3, 'fast', 'fadeIn'))}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag</label>
                <div className="relative">
                  <Input
                    value={reasonValue}
                    onChange={(e) => setReasonValue(e.target.value)}
                    placeholder="Enter tag (e.g., Training, Premier, Off-Day)"
                    className={cn("pr-8", microInteractions.focusRing)}
                  />
                  {reasonValue && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6", microInteractions.hoverScale)}
                      onClick={() => setReasonValue('')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SCHEDULE_REASON_SUGGESTIONS.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className={cn("h-6 text-xs", microInteractions.hoverScale, microInteractions.smooth)}
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
                <Button
                  variant="outline"
                  onClick={() => setReasonDialogOpen(false)}
                  className={cn(microInteractions.smooth)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveReason}
                  disabled={saving}
                  className={cn(microInteractions.activePress, microInteractions.smooth)}
                >
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
