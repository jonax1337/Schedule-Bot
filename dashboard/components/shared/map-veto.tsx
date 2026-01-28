'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Ban, MapPin, Swords, ChevronRight, RotateCcw, RefreshCw } from 'lucide-react';
import { stagger, microInteractions, cn } from '@/lib/animations';
import { BOT_API_URL } from '@/lib/config';

const ALL_MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture',
  'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'
];

const DEFAULT_POOL: string[] = [];

type VetoAction = 'BAN' | 'PICK' | 'DECIDER';
type VetoTeam = 'US' | 'THEM';
type Format = 'BO1' | 'BO3' | 'BO5';

interface VetoStep {
  action: VetoAction;
  team: VetoTeam;
  label: string;
}

interface VetoEntry {
  action: VetoAction;
  map: string;
  team: VetoTeam;
  label: string;
}

interface MapStats {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
}

function buildSteps(format: Format, weBanFirst: boolean): VetoStep[] {
  const first: VetoTeam = weBanFirst ? 'US' : 'THEM';
  const second: VetoTeam = weBanFirst ? 'THEM' : 'US';

  // BO1: Ban-Ban-Ban-Ban-Ban-Ban-Decider (7 maps → 1 played)
  if (format === 'BO1') {
    return [
      { action: 'BAN', team: first, label: first === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'BAN', team: second, label: second === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'BAN', team: first, label: first === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'BAN', team: second, label: second === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'BAN', team: first, label: first === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'BAN', team: second, label: second === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'DECIDER', team: first, label: 'Decider' },
    ];
  }

  // BO3: Ban-Ban-Pick-Pick-Ban-Ban-Decider (7 maps → 3 played)
  if (format === 'BO3') {
    return [
      { action: 'BAN', team: first, label: first === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'BAN', team: second, label: second === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'PICK', team: first, label: first === 'US' ? 'Our Pick' : 'Their Pick' },
      { action: 'PICK', team: second, label: second === 'US' ? 'Our Pick' : 'Their Pick' },
      { action: 'BAN', team: first, label: first === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'BAN', team: second, label: second === 'US' ? 'Our Ban' : 'Their Ban' },
      { action: 'DECIDER', team: first, label: 'Decider' },
    ];
  }

  // BO5: Ban-Ban-Pick-Pick-Pick-Pick-Decider (7 maps → 5 played)
  return [
    { action: 'BAN', team: first, label: first === 'US' ? 'Our Ban' : 'Their Ban' },
    { action: 'BAN', team: second, label: second === 'US' ? 'Our Ban' : 'Their Ban' },
    { action: 'PICK', team: first, label: first === 'US' ? 'Our Pick' : 'Their Pick' },
    { action: 'PICK', team: second, label: second === 'US' ? 'Our Pick' : 'Their Pick' },
    { action: 'PICK', team: first, label: first === 'US' ? 'Our Pick' : 'Their Pick' },
    { action: 'PICK', team: second, label: second === 'US' ? 'Our Pick' : 'Their Pick' },
    { action: 'DECIDER', team: first, label: 'Decider' },
  ];
}

export function MapVetoPlanner() {
  const [mapStats, setMapStats] = useState<Record<string, MapStats>>({});
  const [teamName, setTeamName] = useState('Our Team');

  // Configuration
  const [format, setFormat] = useState<Format>('BO3');
  const [weBanFirst, setWeBanFirst] = useState(true);
  const [mapPool, setMapPool] = useState<string[]>(DEFAULT_POOL);

  // Simulation state
  const [currentStep, setCurrentStep] = useState(0);
  const [vetoEntries, setVetoEntries] = useState<VetoEntry[]>([]);

  const steps = useMemo(() => buildSteps(format, weBanFirst), [format, weBanFirst]);

  useEffect(() => {
    fetchMapStats();
    fetchTeamName();
  }, []);

  // Reset simulation when config changes
  useEffect(() => {
    setCurrentStep(0);
    setVetoEntries([]);
  }, [format, weBanFirst, mapPool]);

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
    return mapPool.filter(m => !usedMaps.includes(m));
  }, [vetoEntries, mapPool]);

  const isComplete = currentStep >= steps.length;

  const handleSelectMap = useCallback((map: string) => {
    if (currentStep >= steps.length) return;
    const step = steps[currentStep];
    const entry: VetoEntry = {
      action: step.action,
      map,
      team: step.team,
      label: step.label,
    };
    setVetoEntries(prev => [...prev, entry]);
    setCurrentStep(prev => prev + 1);
  }, [currentStep, steps]);

  const handleUndo = useCallback(() => {
    if (vetoEntries.length === 0) return;
    setVetoEntries(prev => prev.slice(0, -1));
    setCurrentStep(prev => prev - 1);
  }, [vetoEntries.length]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setVetoEntries([]);
  }, []);

  const poolReady = mapPool.length === 7;

  const toggleMapInPool = useCallback((map: string) => {
    setMapPool(prev => {
      if (prev.includes(map)) {
        return prev.filter(m => m !== map);
      }
      if (prev.length >= 7) return prev; // Max 7
      return [...prev, map].sort((a, b) => ALL_MAPS.indexOf(a) - ALL_MAPS.indexOf(b));
    });
  }, []);

  const getActionColor = (action: VetoAction) => {
    switch (action) {
      case 'BAN': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'PICK': return 'text-green-500 bg-green-500/10 border-green-500/30';
      case 'DECIDER': return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    }
  };

  const getActionIcon = (action: VetoAction) => {
    switch (action) {
      case 'BAN': return <Ban className="w-3.5 h-3.5" />;
      case 'PICK': return <MapPin className="w-3.5 h-3.5" />;
      case 'DECIDER': return <Swords className="w-3.5 h-3.5" />;
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

  const playedMaps = vetoEntries.filter(e => e.action === 'PICK' || e.action === 'DECIDER');

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
            {ALL_MAPS.map((map) => {
              const stat = mapStats[map];
              const winRate = getMapWinRate(map);
              const inPool = mapPool.includes(map);
              return (
                <div
                  key={map}
                  className={cn(
                    "relative overflow-hidden rounded-lg border p-2 text-center transition-opacity",
                    poolReady && !inPool && "opacity-40"
                  )}
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

      {/* Veto Simulator */}
      <Card className={stagger(1, 'fast', 'slideUpScale')}>
        <CardHeader>
          <CardTitle>Veto Simulator</CardTitle>
          <CardDescription>Simulate a map veto process — nothing is saved</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration Row */}
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg border">
            {/* Format */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as Format)}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="start">
                  <SelectItem value="BO1">BO1</SelectItem>
                  <SelectItem value="BO3">BO3</SelectItem>
                  <SelectItem value="BO5">BO5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ban First Toggle */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">First Ban</Label>
              <div className="flex items-center gap-2 h-9">
                <span className={cn("text-sm", !weBanFirst && "font-semibold")}>Them</span>
                <Switch checked={weBanFirst} onCheckedChange={setWeBanFirst} />
                <span className={cn("text-sm", weBanFirst && "font-semibold")}>Us</span>
              </div>
            </div>

            {/* Map Pool */}
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs text-muted-foreground">Active Map Pool ({mapPool.length}/7)</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_MAPS.map((map) => {
                  const inPool = mapPool.includes(map);
                  const disabled = vetoEntries.length > 0 || (!inPool && mapPool.length >= 7);
                  return (
                    <button
                      key={map}
                      onClick={() => toggleMapInPool(map)}
                      disabled={disabled}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm border transition-all",
                        inPool
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30",
                        disabled && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {map}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Veto Process */}
          <div className="border rounded-lg p-4 space-y-4">
            {!poolReady ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Select exactly 7 maps to start the veto simulation.</p>
                <p className="text-xs mt-1">{mapPool.length}/7 maps selected</p>
              </div>
            ) : (<>
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {!isComplete
                  ? `Step ${currentStep + 1}/${steps.length}: ${steps[currentStep].label}`
                  : 'Veto Complete'}
              </span>
              <div className="flex items-center gap-1">
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={vetoEntries.length === 0}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1">
              {steps.map((step, i) => {
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
                {vetoEntries.map((entry, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm",
                      getActionColor(entry.action)
                    )}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-4">{i + 1}</span>
                    {getActionIcon(entry.action)}
                    <span className="font-medium">{entry.label}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded overflow-hidden border flex-shrink-0"
                        style={{
                          backgroundImage: `url(/assets/maps/Loading_Screen_${entry.map}.webp)`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <span className="font-semibold">{entry.map}</span>
                    </div>
                    {getMapWinRate(entry.map) && (
                      <Badge variant="outline" className={cn("ml-auto text-[10px]", getMapWinRateColor(entry.map))}>
                        {getMapWinRate(entry.map)} WR
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Map Selection */}
            {!isComplete && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {steps[currentStep].action === 'BAN'
                    ? `Select a map to ban (${steps[currentStep].team === 'US' ? teamName : 'Opponent'}):`
                    : steps[currentStep].action === 'PICK'
                    ? `Select a map to pick (${steps[currentStep].team === 'US' ? teamName : 'Opponent'}):`
                    : 'Remaining map becomes the decider:'}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {availableMaps.map((map) => {
                    const winRate = getMapWinRate(map);
                    return (
                      <button
                        key={map}
                        onClick={() => handleSelectMap(map)}
                        className={cn(
                          "relative overflow-hidden rounded-lg border p-2.5 text-center transition-all hover:ring-2 hover:ring-primary",
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
            {isComplete && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg space-y-3">
                <p className="text-sm font-medium text-green-600">Veto complete — maps to be played:</p>
                <div className="space-y-2">
                  {playedMaps.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs font-mono w-14 justify-center">
                        Map {i + 1}
                      </Badge>
                      <div
                        className="w-8 h-8 rounded overflow-hidden border flex-shrink-0"
                        style={{
                          backgroundImage: `url(/assets/maps/Loading_Screen_${entry.map}.webp)`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      <span className="font-semibold text-sm">{entry.map}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.action === 'DECIDER'
                          ? 'Decider'
                          : entry.team === 'US'
                          ? `${teamName} pick`
                          : 'Opponent pick'}
                      </span>
                      {getMapWinRate(entry.map) && (
                        <Badge variant="outline" className={cn("ml-auto text-[10px]", getMapWinRateColor(entry.map))}>
                          {getMapWinRate(entry.map)} WR
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
