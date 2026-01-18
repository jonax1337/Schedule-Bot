'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { Calendar, LogIn, Shield, CheckCircle2, XCircle, Clock, Loader2, Users, User, LogOut, Home, Edit2, Save } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PlayerStatus {
  name: string;
  status: 'available' | 'unavailable' | 'not-set';
  time?: string;
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
}

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

export default function HomePage() {
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

  useEffect(() => {
    const init = async () => {
      await loadUserMappings();
    };
    init();
    // Check if user is logged in
    const savedUser = localStorage.getItem('selectedUser');
    if (savedUser) {
      setLoggedInUser(savedUser);
    }
  }, []);

  useEffect(() => {
    // Load calendar once userMappings are loaded (even if empty)
    if (userMappings !== null) {
      loadCalendar();
    }
  }, [userMappings]);

  const loadUserMappings = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/user-mappings`);
      if (response.ok) {
        const data = await response.json();
        const mappedColumnNames = data.mappings.map((m: any) => m.sheetColumnName);
        setUserMappings(mappedColumnNames);
      }
    } catch (error) {
      console.error('Failed to load user mappings:', error);
    }
  };

  const loadCalendar = async () => {
    setLoading(true);
    try {
      // Load columns first
      const columnsRes = await fetch(`${BOT_API_URL}/api/sheet-columns`);
      if (!columnsRes.ok) return;
      
      const columnsData = await columnsRes.json();
      // Filter to only show columns with Discord user mappings
      const columns = columnsData.columns.filter((col: any) => 
        !userMappings || userMappings.length === 0 || userMappings.includes(col.name)
      );

      // Load sheet data for next 14 days
      const sheetRes = await fetch(`${BOT_API_URL}/api/sheet-data?startRow=1&endRow=15`);
      if (!sheetRes.ok) return;
      
      const result = await sheetRes.json();
      const rows = result.data;

      const calendarEntries: DateEntry[] = [];
      
      for (let i = 1; i < Math.min(rows.length, 15); i++) {
        const row = rows[i];
        if (row && row[0]) {
          let available = 0;
          let unavailable = 0;
          let notSet = 0;
          const players: PlayerStatus[] = [];
          
          // Get reason from column 9 (REASON column)
          const reason = row[9] || '';
          
          // Check if it's an off-day
          const isOffDay = reason.toLowerCase().includes('off-day') ||
                          reason.toLowerCase().includes('off day') ||
                          reason.toLowerCase() === 'off';

          // Process each player column
          for (let j = 0; j < columns.length; j++) {
            const columnIndex = columns[j].index;
            const value = row[columnIndex] || '';
            const playerName = columns[j].name;

            if (value === 'x') {
              unavailable++;
              players.push({
                name: playerName,
                status: 'unavailable'
              });
            } else if (value && value.trim() !== '') {
              available++;
              players.push({
                name: playerName,
                status: 'available',
                time: value
              });
            } else {
              notSet++;
              players.push({
                name: playerName,
                status: 'not-set'
              });
            }
          }

          calendarEntries.push({
            date: row[0],
            weekday: getWeekday(row[0]),
            availability: {
              available,
              unavailable,
              notSet
            },
            players,
            reason,
            isOffDay
          });
        }
      }
      
      setEntries(calendarEntries);
    } catch (error) {
      console.error('Failed to load calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekday = (dateStr: string) => {
    const parts = dateStr.split('.');
    if (parts.length !== 3) return '';
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    
    const date = new Date(year, month, day);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return weekdays[date.getDay()];
  };

  const getStatusDot = (available: number, unavailable: number, isOffDay: boolean) => {
    if (isOffDay) {
      return <div className="w-3 h-3 rounded-full bg-purple-500" />;
    }
    // Rot wenn 2+ Leute unavailable sind
    if (unavailable >= 2) {
      return <div className="w-3 h-3 rounded-full bg-red-500" />;
    }
    // Grün wenn 5+ verfügbar
    if (available >= 5) {
      return <div className="w-3 h-3 rounded-full bg-green-500" />;
    }
    // Orange wenn 3-4 verfügbar
    if (available >= 3) {
      return <div className="w-3 h-3 rounded-full bg-yellow-500" />;
    }
    // Grau wenn weniger als 3
    return <div className="w-3 h-3 rounded-full bg-gray-400" />;
  };

  const isToday = (dateStr: string): boolean => {
    const today = new Date();
    const parts = dateStr.split('.');
    if (parts.length !== 3) return false;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const handleDateClick = (entry: DateEntry) => {
    setSelectedDate(entry);
    setDialogOpen(true);
    setEditingUser(false);
    
    // Wenn User angemeldet ist, seine aktuellen Daten laden
    if (loggedInUser) {
      const userPlayer = entry.players.find(p => p.name === loggedInUser);
      if (userPlayer) {
        if (userPlayer.status === 'unavailable') {
          setEditStatus('unavailable');
          setEditTimeFrom('');
          setEditTimeTo('');
        } else if (userPlayer.time) {
          setEditStatus('available');
          const times = userPlayer.time.split('-');
          setEditTimeFrom(times[0]?.trim() || '');
          setEditTimeTo(times[1]?.trim() || '');
        } else {
          setEditStatus('available');
          setEditTimeFrom('');
          setEditTimeTo('');
        }
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('selectedUser');
    setLoggedInUser(null);
  };

  const handleSaveUserTime = async () => {
    if (!selectedDate || !loggedInUser) return;
    
    setSaving(true);
    try {
      // Finde die Spalte des Users
      const columnsRes = await fetch(`${BOT_API_URL}/api/sheet-columns`);
      const columnsData = await columnsRes.json();
      const userColumn = columnsData.columns.find((col: any) => col.name === loggedInUser);
      
      if (!userColumn) {
        toast.error('User column not found');
        setSaving(false);
        return;
      }

      // Lade alle Daten um die Row zu finden
      const sheetRes = await fetch(`${BOT_API_URL}/api/sheet-data?startRow=1&endRow=15`);
      const sheetData = await sheetRes.json();
      
      // Finde die Row für das ausgewählte Datum
      let rowNumber = -1;
      for (let i = 1; i < sheetData.data.length; i++) {
        if (sheetData.data[i][0] === selectedDate.date) {
          rowNumber = i + 1; // +1 weil Sheet 1-basiert ist
          break;
        }
      }

      if (rowNumber === -1) {
        toast.error('Date not found in sheet');
        setSaving(false);
        return;
      }

      const value = editStatus === 'unavailable' ? 'x' : `${editTimeFrom}-${editTimeTo}`;
      
      const response = await fetch(`${BOT_API_URL}/api/sheet-data/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          row: rowNumber,
          column: userColumn.column,
          value
        })
      });

      if (response.ok) {
        toast.success('Availability updated');
        setEditingUser(false);
        // Reload calendar
        await loadCalendar();
        // Update selected date
        const updatedEntry = entries.find(e => e.date === selectedDate.date);
        if (updatedEntry) {
          setSelectedDate(updatedEntry);
        }
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        toast.error('Failed to update');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Team Schedule</h1>
            <p className="text-muted-foreground mt-2">
              View team availability for the next 14 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loggedInUser ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <User className="mr-1 h-4 w-4" />
                      {loggedInUser}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-1 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={() => router.push('/user')}>
                  <Calendar className="mr-1 h-4 w-4" />
                  Schedule
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => router.push('/login')}>
                <LogIn className="mr-1 h-4 w-4" />
                Player Login
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push('/admin/login')}>
              <Shield className="mr-1 h-4 w-4" />
              Admin
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Legend */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-xs">Off-Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-xs">5+ players</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-xs">3-4 players</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs">2+ unavailable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-xs">Pending</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {entries.map((entry) => (
              <Card
                key={entry.date}
                className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                  isToday(entry.date) ? 'ring-2 ring-blue-500' : ''
                } ${
                  entry.isOffDay ? 'bg-purple-500/5 opacity-60' : ''
                }`}
                onClick={() => handleDateClick(entry)}
              >
                <CardHeader className="pb-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{entry.date}</CardTitle>
                      <p className="text-xs text-muted-foreground mb-0">{entry.weekday}</p>
                    </div>
                    {getStatusDot(entry.availability.available, entry.availability.unavailable, entry.isOffDay)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0.5 pb-3">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedDate?.date} - {selectedDate?.weekday}</DialogTitle>
              <DialogDescription>
                Player availability status
              </DialogDescription>
            </DialogHeader>
            
            {selectedDate && (
              <div className="space-y-3 mt-4">
                {/* Off-Day Banner */}
                {selectedDate.isOffDay && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">Off-Day</span>
                      {selectedDate.reason && 
                       !selectedDate.reason.toLowerCase().includes('off-day') &&
                       !selectedDate.reason.toLowerCase().includes('off day') &&
                       selectedDate.reason.toLowerCase() !== 'off' && (
                        <span className="text-sm text-muted-foreground">— {selectedDate.reason}</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Summary */}
                {!selectedDate.isOffDay && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Status</span>
                    {getStatusDot(selectedDate.availability.available, selectedDate.availability.unavailable, selectedDate.isOffDay)}
                  </div>
                )}

                {/* Available Players */}
                {selectedDate.players.filter(p => p.status === 'available').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Available ({selectedDate.players.filter(p => p.status === 'available').length})
                    </h4>
                    <div className="space-y-2">
                      {selectedDate.players
                        .filter(p => p.status === 'available')
                        .map((player, idx) => {
                          const isCurrentUser = loggedInUser === player.name;
                          return (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded border ${
                              isCurrentUser 
                                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 ring-1 ring-blue-400' 
                                : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                            }`}>
                              <span className="text-sm font-medium">{player.name}</span>
                              <div className="flex items-center gap-2">
                                {player.time && (
                                  <Badge variant="outline" className="text-xs">
                                    {player.time}
                                  </Badge>
                                )}
                                {isCurrentUser && !editingUser && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-2"
                                    onClick={() => setEditingUser(true)}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Unavailable Players */}
                {selectedDate.players.filter(p => p.status === 'unavailable').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Unavailable ({selectedDate.players.filter(p => p.status === 'unavailable').length})
                    </h4>
                    <div className="space-y-2">
                      {selectedDate.players
                        .filter(p => p.status === 'unavailable')
                        .map((player, idx) => {
                          const isCurrentUser = loggedInUser === player.name;
                          return (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded border ${
                              isCurrentUser 
                                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 ring-1 ring-blue-400' 
                                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                            }`}>
                              <span className="text-sm font-medium">{player.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Not available
                                </Badge>
                                {isCurrentUser && !editingUser && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-2"
                                    onClick={() => setEditingUser(true)}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Not Set Players */}
                {selectedDate.players.filter(p => p.status === 'not-set').length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Not Set ({selectedDate.players.filter(p => p.status === 'not-set').length})
                    </h4>
                    <div className="space-y-2">
                      {selectedDate.players
                        .filter(p => p.status === 'not-set')
                        .map((player, idx) => {
                          const isCurrentUser = loggedInUser === player.name;
                          return (
                            <div key={idx} className={`flex items-center justify-between p-2 rounded border ${
                              isCurrentUser 
                                ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 ring-1 ring-blue-400' 
                                : 'bg-muted'
                            }`}>
                              <span className={`text-sm font-medium ${!isCurrentUser ? 'text-muted-foreground' : ''}`}>
                                {player.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Pending
                                </Badge>
                                {isCurrentUser && !editingUser && (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-2"
                                    onClick={() => setEditingUser(true)}
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                {loggedInUser && editingUser && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-700 rounded-lg space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Edit2 className="w-4 h-4" />
                      Edit Your Availability
                    </h4>
                    
                    <div className="space-y-2">
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
                          variant={editStatus === 'unavailable' ? 'default' : 'outline'}
                          onClick={() => setEditStatus('unavailable')}
                          className="flex-1"
                        >
                          Not Available
                        </Button>
                      </div>

                      {editStatus === 'available' && (
                        <div className="flex gap-2">
                          <Input
                            type="time"
                            value={editTimeFrom}
                            onChange={(e) => setEditTimeFrom(e.target.value)}
                            className="flex-1"
                            placeholder="From"
                          />
                          <Input
                            type="time"
                            value={editTimeTo}
                            onChange={(e) => setEditTimeTo(e.target.value)}
                            className="flex-1"
                            placeholder="To"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveUserTime}
                          disabled={saving || (editStatus === 'available' && (!editTimeFrom || !editTimeTo))}
                          className="flex-1"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-1 h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(false)}
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
