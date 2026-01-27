'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Ban, MapPin, Swords, ChevronRight, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { stagger, microInteractions, cn } from '@/lib/animations';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

const VALORANT_MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture',
  'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'
];

// Standard BO3 veto format: Ban-Ban-Pick-Pick-Ban-Ban-Decider
const VETO_STEPS = [
  { action: 'BAN' as const, team: 'OUR_TEAM' as const, label: 'Our Ban' },
  { action: 'BAN' as const, team: 'OPPONENT' as const, label: 'Their Ban' },
  { action: 'PICK' as const, team: 'OUR_TEAM' as const, label: 'Our Pick' },
  { action: 'PICK' as const, team: 'OPPONENT' as const, label: 'Their Pick' },
  { action: 'BAN' as const, team: 'OUR_TEAM' as const, label: 'Our Ban' },
  { action: 'BAN' as const, team: 'OPPONENT' as const, label: 'Their Ban' },
  { action: 'DECIDER' as const, team: 'OUR_TEAM' as const, label: 'Decider' },
];

interface VetoEntry {
  step: number;
  action: 'BAN' | 'PICK' | 'DECIDER';
  map: string;
  team: 'OUR_TEAM' | 'OPPONENT';
}

interface VetoSession {
  id: string;
  title: string;
  opponent: string;
  date: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  entries: VetoEntry[];
}

interface MapStats {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
}

export function MapVetoPlanner() {
  const [sessions, setSessions] = useState<VetoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapStats, setMapStats] = useState<Record<string, MapStats>>({});
  const [teamName, setTeamName] = useState('Our Team');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewSession, setViewSession] = useState<VetoSession | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formOpponent, setFormOpponent] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [vetoEntries, setVetoEntries] = useState<VetoEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchMapStats();
    fetchTeamName();
  }, []);

  const fetchSessions = async () => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/map-veto`, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch veto sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMapStats = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/scrims/stats/summary`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats?.mapStats) {
          const stats: Record<string, MapStats> = {};
          for (const [map, s] of Object.entries(data.stats.mapStats as Record<string, any>)) {
            stats[map] = {
              played: s.played || 0,
              wins: s.wins || 0,
              losses: s.losses || 0,
              winRate: s.played > 0 ? (s.wins / s.played) * 100 : 0,
            };
          }
          setMapStats(stats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch map stats:', error);
    }
  };

  const fetchTeamName = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/settings`);
      if (response.ok) {
        const data = await response.json();
        if (data?.branding?.teamName) setTeamName(data.branding.teamName);
      }
    } catch (error) {
      console.error('Failed to fetch team name:', error);
    }
  };

  const availableMaps = useMemo(() => {
    const usedMaps = vetoEntries.map(e => e.map);
    return VALORANT_MAPS.filter(m => !usedMaps.includes(m));
  }, [vetoEntries]);

  const handleSelectMap = (map: string) => {
    if (currentStep >= VETO_STEPS.length) return;

    const step = VETO_STEPS[currentStep];
    const entry: VetoEntry = {
      step: currentStep + 1,
      action: step.action,
      map,
      team: step.team,
    };

    setVetoEntries([...vetoEntries, entry]);
    setCurrentStep(currentStep + 1);
  };

  const handleUndo = () => {
    if (vetoEntries.length === 0) return;
    setVetoEntries(vetoEntries.slice(0, -1));
    setCurrentStep(currentStep - 1);
  };

  const handleSaveSession = async () => {
    if (!formTitle.trim()) { toast.error('Title is required'); return; }
    if (vetoEntries.length !== VETO_STEPS.length) { toast.error('Please complete all veto steps'); return; }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/map-veto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          title: formTitle,
          opponent: formOpponent,
          date: formDate,
          notes: formNotes,
          entries: vetoEntries,
        }),
      });

      if (response.ok) {
        toast.success('Veto session saved!');
        setIsCreateOpen(false);
        resetForm();
        fetchSessions();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to save session');
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Delete this veto session?')) return;
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/map-veto/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        toast.success('Session deleted');
        fetchSessions();
      } else {
        toast.error('Failed to delete session');
      }
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormOpponent('');
    setFormDate('');
    setFormNotes('');
    setCurrentStep(0);
    setVetoEntries([]);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BAN': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'PICK': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'DECIDER': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
      default: return '';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BAN': return <Ban className="w-3.5 h-3.5" />;
      case 'PICK': return <MapPin className="w-3.5 h-3.5" />;
      case 'DECIDER': return <Swords className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const getMapWinRate = (map: string): string | null => {
    const stat = mapStats[map];
    if (!stat || stat.played === 0) return null;
    return `${stat.winRate.toFixed(0)}%`;
  };

  const getMapWinRateColor = (map: string): string => {
    const stat = mapStats[map];
    if (!stat || stat.played === 0) return 'text-muted-foreground';
    if (stat.winRate >= 60) return 'text-green-500';
    if (stat.winRate >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-scaleIn">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Map Win Rates Overview */}
      <Card className={cn(stagger(0, 'fast', 'slideUpScale'), microInteractions.hoverLift)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Map Win Rates</CardTitle>
          <CardDescription>Your team&apos;s performance per map based on match history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {VALORANT_MAPS.map((map) => {
              const stat = mapStats[map];
              const winRate = getMapWinRate(map);
              return (
                <div
                  key={map}
                  className="relative overflow-hidden rounded-lg border p-2 text-center"
                >
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: `url(/assets/maps/Loading_Screen_${map}.webp)`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div className="relative z-10">
                    <p className="text-xs font-medium truncate">{map}</p>
                    {stat && stat.played > 0 ? (
                      <>
                        <p className={cn("text-lg font-bold", getMapWinRateColor(map))}>
                          {winRate}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {stat.wins}W-{stat.losses}L ({stat.played})
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">No data</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <Card className={stagger(1, 'fast', 'slideUpScale')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Veto Sessions</CardTitle>
              <CardDescription className="hidden sm:block">Plan and review map vetoes for upcoming matches</CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className={cn(microInteractions.activePress)}>
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Veto</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Plan Map Veto</DialogTitle>
                  <DialogDescription>Simulate a BO3 map veto process (Ban-Ban-Pick-Pick-Ban-Ban-Decider)</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Session Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="veto-title">Title</Label>
                      <Input
                        id="veto-title"
                        placeholder="e.g. vs Team Alpha - Premier"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="veto-opponent">Opponent</Label>
                      <Input
                        id="veto-opponent"
                        placeholder="Opponent team name"
                        value={formOpponent}
                        onChange={(e) => setFormOpponent(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="veto-date">Date</Label>
                      <Input
                        id="veto-date"
                        type="date"
                        value={formDate ? formDate.split('.').reverse().join('-') : ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v) {
                            const [y, m, d] = v.split('-');
                            setFormDate(`${d}.${m}.${y}`);
                          } else {
                            setFormDate('');
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="veto-notes">Notes</Label>
                      <Input
                        id="veto-notes"
                        placeholder="Optional notes..."
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Veto Process */}
                  <div className="border rounded-lg p-4 space-y-4">
                    {/* Progress */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {currentStep < VETO_STEPS.length
                          ? `Step ${currentStep + 1}/${VETO_STEPS.length}: ${VETO_STEPS[currentStep].label}`
                          : 'Veto Complete'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUndo}
                        disabled={vetoEntries.length === 0}
                        className="h-7 text-xs"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Undo
                      </Button>
                    </div>

                    {/* Steps Progress Bar */}
                    <div className="flex gap-1">
                      {VETO_STEPS.map((step, i) => {
                        const entry = vetoEntries[i];
                        const isCurrent = i === currentStep;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "flex-1 h-2 rounded-full transition-all",
                              entry
                                ? step.action === 'BAN' ? 'bg-red-500' : step.action === 'PICK' ? 'bg-green-500' : 'bg-amber-500'
                                : isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-muted'
                            )}
                          />
                        );
                      })}
                    </div>

                    {/* Completed Steps */}
                    {vetoEntries.length > 0 && (
                      <div className="space-y-1.5">
                        {vetoEntries.map((entry, i) => {
                          const stepDef = VETO_STEPS[i];
                          return (
                            <div
                              key={i}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm",
                                getActionColor(entry.action)
                              )}
                            >
                              {getActionIcon(entry.action)}
                              <span className="font-medium">{stepDef.label}</span>
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              <span className="font-semibold">{entry.map}</span>
                              {getMapWinRate(entry.map) && (
                                <Badge variant="outline" className={cn("ml-auto text-[10px]", getMapWinRateColor(entry.map))}>
                                  {getMapWinRate(entry.map)} WR
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Map Selection */}
                    {currentStep < VETO_STEPS.length && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          {VETO_STEPS[currentStep].action === 'BAN'
                            ? 'Select a map to ban:'
                            : VETO_STEPS[currentStep].action === 'PICK'
                            ? 'Select a map to pick:'
                            : 'Remaining map becomes the decider:'}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableMaps.map((map) => {
                            const winRate = getMapWinRate(map);
                            return (
                              <button
                                key={map}
                                onClick={() => handleSelectMap(map)}
                                className={cn(
                                  "relative overflow-hidden rounded-lg border p-3 text-left transition-all hover:ring-2 hover:ring-primary",
                                  microInteractions.activePress
                                )}
                              >
                                <div
                                  className="absolute inset-0 opacity-15"
                                  style={{
                                    backgroundImage: `url(/assets/maps/Loading_Screen_${map}.webp)`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                  }}
                                />
                                <div className="relative z-10">
                                  <p className="text-sm font-medium">{map}</p>
                                  {winRate ? (
                                    <p className={cn("text-xs font-semibold", getMapWinRateColor(map))}>
                                      {winRate} WR
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground">No data</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Veto Summary */}
                    {currentStep >= VETO_STEPS.length && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm font-medium text-green-600">Veto complete!</p>
                        <div className="mt-2 space-y-1">
                          {vetoEntries.filter(e => e.action === 'PICK' || e.action === 'DECIDER').map((entry, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="text-[10px]">Map {i + 1}</Badge>
                              <span className="font-medium">{entry.map}</span>
                              <span className="text-xs text-muted-foreground">
                                ({entry.action === 'DECIDER' ? 'Decider' : entry.team === 'OUR_TEAM' ? `${teamName} pick` : 'Opponent pick'})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</Button>
                  <Button
                    onClick={handleSaveSession}
                    disabled={saving || currentStep < VETO_STEPS.length}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Veto
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No veto sessions yet. Create your first map veto plan!
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => {
                const picks = session.entries.filter(e => e.action === 'PICK' || e.action === 'DECIDER');
                const bans = session.entries.filter(e => e.action === 'BAN');
                return (
                  <div
                    key={session.id}
                    className={cn(
                      "border rounded-lg p-4 transition-colors hover:bg-accent/50",
                      stagger(index, 'fast', 'fadeIn')
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">{session.title}</h4>
                          {session.opponent && (
                            <Badge variant="outline" className="text-xs">vs {session.opponent}</Badge>
                          )}
                          {session.date && (
                            <span className="text-xs text-muted-foreground">{session.date}</span>
                          )}
                        </div>
                        {/* Maps played */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {picks.map((entry, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <div
                                className="w-8 h-8 rounded overflow-hidden border"
                                style={{
                                  backgroundImage: `url(/assets/maps/Loading_Screen_${entry.map}.webp)`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }}
                              />
                              <div>
                                <p className="text-xs font-medium leading-tight">{entry.map}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {entry.action === 'DECIDER' ? 'Decider' : entry.team === 'OUR_TEAM' ? 'Our pick' : 'Their pick'}
                                </p>
                              </div>
                            </div>
                          ))}
                          <div className="flex items-center gap-1 ml-1">
                            {bans.map((entry, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] text-red-500 border-red-500/30">
                                <Ban className="w-2.5 h-2.5 mr-0.5" />
                                {entry.map}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => { setViewSession(session); setViewOpen(true); }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {session.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{session.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Session Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{viewSession?.title}</DialogTitle>
            {viewSession?.opponent && (
              <DialogDescription>vs {viewSession.opponent} {viewSession.date ? `- ${viewSession.date}` : ''}</DialogDescription>
            )}
          </DialogHeader>
          {viewSession && (
            <div className="space-y-3 py-2">
              {viewSession.entries.map((entry, i) => {
                const stepDef = VETO_STEPS[i];
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md border text-sm",
                      getActionColor(entry.action)
                    )}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    {getActionIcon(entry.action)}
                    <span className="font-medium flex-1">
                      {stepDef?.label || entry.action}
                    </span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded overflow-hidden border"
                        style={{
                          backgroundImage: `url(/assets/maps/Loading_Screen_${entry.map}.webp)`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <span className="font-semibold">{entry.map}</span>
                    </div>
                  </div>
                );
              })}
              {viewSession.notes && (
                <p className="text-xs text-muted-foreground italic pt-2 border-t">{viewSession.notes}</p>
              )}
              <p className="text-[10px] text-muted-foreground">Created by {viewSession.createdBy}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
