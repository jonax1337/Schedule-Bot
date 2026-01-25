'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, Loader2, Edit2, Save, X, Palmtree } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PlayerStatus {
  name: string;
  status: 'available' | 'unavailable' | 'not-set';
  time?: string;
  role?: 'main' | 'sub' | 'coach';
}

interface ScheduleDetails {
  status: string;
  startTime?: string;
  endTime?: string;
  availablePlayers: string[];
  unavailablePlayers: string[];
  noResponsePlayers: string[];
}

interface DateEntry {
  date: string;
  weekday: string;
  availability: {
    available: number;
    unavailable: number;
    notSet: number;
  };
  players: PlayerStatus[];
  reason?: string;
  isOffDay: boolean;
  userHasSet: boolean;
  userStatus?: 'available' | 'unavailable' | 'not-set';
  scheduleDetails?: ScheduleDetails;
}

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

export function UserScheduleContent() {
  const router = useRouter();
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<DateEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState(false);
  const [editTimeFrom, setEditTimeFrom] = useState('');
  const [editTimeTo, setEditTimeTo] = useState('');
  const [editStatus, setEditStatus] = useState<'available' | 'unavailable'>('available');
  const [saving, setSaving] = useState(false);
  const [userMappings, setUserMappings] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingReason, setEditingReason] = useState(false);
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
    const checkAuth = async () => {
      try {
        const { validateToken, removeAuthToken, getUser } = await import('@/lib/auth');
        
        const user = localStorage.getItem('selectedUser');
        
        if (!user) {
          router.replace('/login');
          return;
        }
        
        const isValid = await validateToken();
        
        if (!isValid) {
          removeAuthToken();
          localStorage.removeItem('selectedUser');
          localStorage.removeItem('sessionToken');
          router.replace('/login');
          return;
        }
        
        const currentUser = getUser();
        if (currentUser?.role === 'admin') {
          setIsAdmin(true);
        }
        
        setLoggedInUser(user);
        await loadScheduleData();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  const loadScheduleData = async () => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/schedule/next14`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        toast.error('Failed to load schedule data');
        setLoading(false);
        return;
      }

      const data = await response.json();
      const schedules = data.schedules || [];

      const mappingsRes = await fetch(`${BOT_API_URL}/api/user-mappings`);
      if (!mappingsRes.ok) {
        toast.error('Failed to load user mappings');
        setLoading(false);
        return;
      }

      const mappingsData = await mappingsRes.json();
      const mappings = mappingsData.mappings || [];
      setUserMappings(mappings.map((m: any) => m.displayName));

      const loggedUser = localStorage.getItem('selectedUser');
      const userMapping = mappings.find((m: any) => m.displayName === loggedUser);
      const userDiscordId = userMapping?.discordId;

      const today = new Date();
      const dateEntries: DateEntry[] = [];

      const formatDate = (d: Date): string => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
      };

      const getWeekdayName = (d: Date): string => {
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return weekdays[d.getDay()];
      };

      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = formatDate(date);
        const weekday = getWeekdayName(date);

        const schedule = schedules.find((s: any) => s.date === dateStr);
        const isOffDay = schedule?.reason === 'Off-Day';

        let available = 0;
        let unavailable = 0;
        let notSet = 0;
        const players: PlayerStatus[] = [];
        let userHasSet = false;
        let userStatus: 'available' | 'unavailable' | 'not-set' = 'not-set';

        if (schedule && schedule.players) {
          schedule.players.forEach((player: any) => {
            const mapping = mappings.find((m: any) => m.discordId === player.userId);
            if (!mapping) return;

            const playerName = mapping.displayName;
            const availability = player.availability || '';
            let status: 'available' | 'unavailable' | 'not-set' = 'not-set';
            let time: string | undefined;

            if (availability === 'x') {
              status = 'unavailable';
              unavailable++;
            } else if (availability && availability !== '') {
              status = 'available';
              time = availability;
              available++;
            } else {
              notSet++;
            }

            if (player.userId === userDiscordId) {
              userHasSet = status !== 'not-set';
              userStatus = status;
            }

            players.push({
              name: playerName,
              status,
              time,
              role: mapping.role?.toLowerCase() as 'main' | 'sub' | 'coach',
            });
          });
        }

        let scheduleDetails: ScheduleDetails | undefined;
        if (schedule && !isOffDay) {
          const availablePlayers = players.filter(p => p.status === 'available').map(p => p.name);
          const unavailablePlayers = players.filter(p => p.status === 'unavailable').map(p => p.name);
          const noResponsePlayers = players.filter(p => p.status === 'not-set').map(p => p.name);

          let status = 'Unknown';
          let startTime: string | undefined;
          let endTime: string | undefined;

          if (available >= 5) {
            status = 'Able to play';
            const times = players
              .filter(p => p.status === 'available' && p.time)
              .map(p => p.time!);

            if (times.length > 0) {
              const timeRanges = times.map(t => {
                const [start, end] = t.split('-').map(s => s.trim());
                return { start, end };
              });

              const latestStart = timeRanges.reduce((max, curr) => 
                curr.start > max ? curr.start : max, timeRanges[0].start);
              const earliestEnd = timeRanges.reduce((min, curr) => 
                curr.end < min ? curr.end : min, timeRanges[0].end);

              startTime = latestStart;
              endTime = earliestEnd;
            }
          } else if (available === 4) {
            status = 'Almost there';
          } else if (available === 3) {
            status = 'More players needed';
          } else if (available < 3 && available > 0) {
            status = 'Insufficient players';
          }

          scheduleDetails = {
            status,
            startTime,
            endTime,
            availablePlayers,
            unavailablePlayers,
            noResponsePlayers,
          };
        }

        dateEntries.push({
          date: dateStr,
          weekday,
          availability: { available, unavailable, notSet },
          players,
          reason: schedule?.reason,
          isOffDay,
          userHasSet,
          userStatus,
          scheduleDetails,
        });
      }

      setEntries(dateEntries);
    } catch (error) {
      console.error('Failed to load schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (entry: DateEntry) => {
    setSelectedDate(entry);
    setDialogOpen(true);
    setEditingUser(false);
    setEditingReason(false);
    setReasonValue(entry.reason || 'Training');
  };

  const isToday = (dateStr: string): boolean => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayStr = `${day}.${month}.${year}`;
    return dateStr === todayStr;
  };

  const getStatusDot = (entry: DateEntry) => {
    if (entry.isOffDay) {
      return <div className="w-3 h-3 rounded-full bg-purple-500" />;
    }

    const { available } = entry.availability;
    let color = 'bg-gray-400';

    if (available >= 5) {
      color = 'bg-green-500';
    } else if (available === 4) {
      color = 'bg-cyan-400';
    } else if (available === 3) {
      color = 'bg-yellow-500';
    } else if (available > 0) {
      color = 'bg-red-500';
    }

    return <div className={`w-3 h-3 rounded-full ${color}`} />;
  };

  const startEditingUser = () => {
    if (!selectedDate || !loggedInUser) return;

    const userPlayer = selectedDate.players.find(p => p.name === loggedInUser);
    if (userPlayer && userPlayer.status === 'available' && userPlayer.time) {
      const [from, to] = userPlayer.time.split('-').map(t => t.trim());
      setEditTimeFrom(from);
      setEditTimeTo(to);
      setEditStatus('available');
    } else if (userPlayer && userPlayer.status === 'unavailable') {
      setEditTimeFrom('');
      setEditTimeTo('');
      setEditStatus('unavailable');
    } else {
      setEditTimeFrom('');
      setEditTimeTo('');
      setEditStatus('available');
    }

    setEditingUser(true);
  };

  const saveUserAvailability = async () => {
    if (!selectedDate || !loggedInUser) return;

    setSaving(true);
    try {
      const mappingsRes = await fetch(`${BOT_API_URL}/api/user-mappings`);
      const mappingsData = await mappingsRes.json();
      const userMapping = mappingsData.mappings.find((m: any) => m.displayName === loggedInUser);

      if (!userMapping) {
        toast.error('User mapping not found');
        setSaving(false);
        return;
      }

      let availability = 'x';
      if (editStatus === 'available') {
        if (!editTimeFrom || !editTimeTo) {
          toast.error('Please enter both start and end time');
          setSaving(false);
          return;
        }
        if (editTimeTo <= editTimeFrom) {
          toast.error('End time must be after start time');
          setSaving(false);
          return;
        }
        availability = `${editTimeFrom}-${editTimeTo}`;
      }

      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/schedule/update-availability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: selectedDate.date,
          userId: userMapping.discordId,
          availability,
        }),
      });

      if (response.ok) {
        toast.success('Availability updated!');
        await loadScheduleData();
        setDialogOpen(false);
        setEditingUser(false);
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

  const saveReason = async () => {
    if (!selectedDate || !isAdmin) return;

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/schedule/update-reason`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          date: selectedDate.date,
          reason: reasonValue,
        }),
      });

      if (response.ok) {
        toast.success('Reason updated!');
        await loadScheduleData();
        setEditingReason(false);
        setDialogOpen(false);
      } else {
        toast.error('Failed to update reason');
      }
    } catch (error) {
      console.error('Failed to save reason:', error);
      toast.error('Failed to save reason');
    } finally {
      setSaving(false);
    }
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
      <div className="p-3 bg-muted/50 rounded-lg border animate-fadeIn">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs">Off-Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs">Able to play</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-xs">Almost there</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-xs">More players needed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs">Insufficient players</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            <span className="text-xs">Unknown</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {entries.map((entry, index) => {
          const isTodayDate = isToday(entry.date);
          let ringClass = '';
          
          if (isTodayDate) {
            ringClass = 'ring-2 ring-blue-500';
          } else if (entry.isOffDay) {
            ringClass = 'ring-1 ring-purple-500/40';
          } else if (loggedInUser) {
            if (entry.userStatus === 'available') {
              ringClass = 'ring-1 ring-green-500/40';
            } else if (entry.userStatus === 'unavailable') {
              ringClass = 'ring-1 ring-red-500/40';
            } else {
              ringClass = 'ring-1 ring-gray-400/40';
            }
          }
          
          return (
            <Card
              key={entry.date}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:-translate-y-1 animate-slideUp ${ringClass} ${
                entry.isOffDay ? 'bg-purple-500/5 opacity-60' : ''
              }`}
              onClick={() => handleDateClick(entry)}
              style={{ animationDelay: `${(index % 14) * 0.08}s` }}
            >
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{entry.date}</CardTitle>
                  <p className="text-xs text-muted-foreground mb-0">{entry.weekday}</p>
                </div>
                {getStatusDot(entry)}
              </div>
            </CardHeader>
            <CardContent className="pt-0.5 pb-3">
              {entry.isOffDay ? (
                <div className="py-4"></div>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-sm font-medium">{entry.availability.available}</span>
                    <span className="text-xs text-muted-foreground">available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    <span className="text-sm font-medium">{entry.availability.unavailable}</span>
                    <span className="text-xs text-muted-foreground">unavailable</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm font-medium">{entry.availability.notSet}</span>
                    <span className="text-xs text-muted-foreground">not set</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto animate-scaleIn">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{selectedDate?.date} - {selectedDate?.weekday}</DialogTitle>
              {selectedDate && (
                <span 
                  className={
                    `inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      selectedDate.reason === 'Premier' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
                      selectedDate.reason === 'Off-Day' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' :
                      selectedDate.reason === 'VOD-Review' ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300' :
                      selectedDate.reason === 'Scrims' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                      selectedDate.reason === 'Tournament' ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300' :
                      'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                    }`
                  }
                >
                  {selectedDate.reason === 'Premier' && (
                    <Image
                      src="/assets/Premier_logo.png"
                      alt="Premier"
                      width={14}
                      height={14}
                      className="mr-1.5"
                    />
                  )}
                  {selectedDate.reason || 'Training'}
                </span>
              )}
            </div>
          </DialogHeader>
          
          {selectedDate && (
            <div className="space-y-3 mt-4">
              {selectedDate.isOffDay ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-60">
                  <Palmtree className="w-24 h-24 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground">There is nothing scheduled for today</p>
                </div>
              ) : (
                <>
                {selectedDate.scheduleDetails && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Schedule Status</span>
                      <Badge 
                        variant="outline"
                        className="text-xs"
                        style={{
                          backgroundColor: 
                            selectedDate.scheduleDetails.status === 'Able to play' ? 'rgb(34 197 94 / 0.2)' :
                            selectedDate.scheduleDetails.status === 'Almost there' ? 'rgb(34 211 238 / 0.25)' :
                            selectedDate.scheduleDetails.status === 'More players needed' ? 'rgb(234 179 8 / 0.2)' :
                            selectedDate.scheduleDetails.status === 'Insufficient players' ? 'rgb(239 68 68 / 0.2)' :
                            'rgb(156 163 175 / 0.2)',
                          borderColor:
                            selectedDate.scheduleDetails.status === 'Able to play' ? 'rgb(34 197 94)' :
                            selectedDate.scheduleDetails.status === 'Almost there' ? 'rgb(34 211 238)' :
                            selectedDate.scheduleDetails.status === 'More players needed' ? 'rgb(234 179 8)' :
                            selectedDate.scheduleDetails.status === 'Insufficient players' ? 'rgb(239 68 68)' :
                            'rgb(156 163 175)',
                          color:
                            selectedDate.scheduleDetails.status === 'Able to play' ? 'rgb(22 163 74)' :
                            selectedDate.scheduleDetails.status === 'Almost there' ? 'rgb(6 182 212)' :
                            selectedDate.scheduleDetails.status === 'More players needed' ? 'rgb(202 138 4)' :
                            selectedDate.scheduleDetails.status === 'Insufficient players' ? 'rgb(220 38 38)' :
                            'rgb(107 114 128)'
                        }}
                      >
                        {selectedDate.scheduleDetails.status}
                      </Badge>
                    </div>
                    {selectedDate.scheduleDetails.status === 'Able to play' && 
                     selectedDate.scheduleDetails.startTime && 
                     selectedDate.scheduleDetails.endTime && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {selectedDate.scheduleDetails.startTime} - {selectedDate.scheduleDetails.endTime}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Players</h4>
                    {!editingUser && loggedInUser && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={startEditingUser}
                        className="h-7 text-xs"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit My Status
                      </Button>
                    )}
                  </div>

                  {editingUser && (
                    <div className="p-3 bg-muted/50 rounded-lg border space-y-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={editStatus === 'available' ? 'default' : 'outline'}
                          onClick={() => setEditStatus('available')}
                          className="flex-1"
                        >
                          Available
                        </Button>
                        <Button
                          size="sm"
                          variant={editStatus === 'unavailable' ? 'destructive' : 'outline'}
                          onClick={() => setEditStatus('unavailable')}
                          className="flex-1"
                        >
                          Unavailable
                        </Button>
                      </div>

                      {editStatus === 'available' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">From</label>
                              <Input
                                type="time"
                                value={editTimeFrom}
                                onChange={(e) => setEditTimeFrom(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">To</label>
                              <Input
                                type="time"
                                value={editTimeTo}
                                onChange={(e) => setEditTimeTo(e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={saveUserAvailability}
                          disabled={saving}
                          className="flex-1"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(false)}
                          disabled={saving}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {selectedDate.players
                      .sort((a, b) => {
                        const roleOrder = { main: 0, sub: 1, coach: 2 };
                        return (roleOrder[a.role || 'sub'] || 1) - (roleOrder[b.role || 'sub'] || 1);
                      })
                      .map((player) => (
                        <div
                          key={player.name}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              player.status === 'available' ? 'bg-green-500' :
                              player.status === 'unavailable' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`} />
                            <span className="text-sm font-medium">{player.name}</span>
                            {player.role && player.role !== 'main' && (
                              <Badge variant="outline" className="text-xs h-5">
                                {player.role === 'sub' ? 'Substitute' : player.role === 'coach' ? 'Coach' : player.role}
                              </Badge>
                            )}
                          </div>
                          {player.time && (
                            <span className="text-xs text-muted-foreground">{player.time}</span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
