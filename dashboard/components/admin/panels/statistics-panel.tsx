'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Target, Map, BarChart3, TrendingUp, Swords, Loader2 } from 'lucide-react';
import { stagger, cn } from '@/lib/animations';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface ScheduleDay {
  date: string;
  players: {
    userId: string;
    displayName: string;
    role: string;
    availability: string;
    sortOrder: number;
  }[];
  reason: string;
  focus: string;
}

interface ScrimEntry {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  scoreUs: number;
  scoreThem: number;
  map: string;
  matchType?: string;
  ourAgents?: string[];
  theirAgents?: string[];
}

interface ScrimStats {
  totalScrims: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  mapStats: {
    [mapName: string]: {
      played: number;
      wins: number;
      losses: number;
    };
  };
}

type AvailabilityRange = 'next14' | 'last14' | 'last30' | 'last60';

const AVAILABILITY_RANGES: { value: AvailabilityRange; label: string; offsets: number[] }[] = [
  { value: 'next14', label: 'Next 14 Days', offsets: [0] },
  { value: 'last14', label: 'Last 14 Days', offsets: [-1] },
  { value: 'last30', label: 'Last 30 Days', offsets: [-2, -1] },
  { value: 'last60', label: 'Last 60 Days', offsets: [-4, -3, -2, -1] },
];

type ScrimTimeRange = 'all' | 'last30' | 'last90' | 'last180' | 'last365';

const SCRIM_TIME_RANGES: { value: ScrimTimeRange; label: string; days: number | null }[] = [
  { value: 'all', label: 'All Time', days: null },
  { value: 'last30', label: 'Last 30 Days', days: 30 },
  { value: 'last90', label: 'Last 90 Days', days: 90 },
  { value: 'last180', label: 'Last 6 Months', days: 180 },
  { value: 'last365', label: 'Last Year', days: 365 },
];

// Chart configurations
const scrimResultsConfig: ChartConfig = {
  wins: { label: 'Wins', color: 'oklch(0.723 0.219 149.579)' },
  losses: { label: 'Losses', color: 'oklch(0.577 0.245 27.325)' },
  draws: { label: 'Draws', color: 'oklch(0.708 0 0)' },
};

const availabilityConfig: ChartConfig = {
  available: { label: 'Available', color: 'oklch(0.723 0.219 149.579)' },
  unavailable: { label: 'Unavailable', color: 'oklch(0.577 0.245 27.325)' },
  noResponse: { label: 'No Response', color: 'oklch(0.708 0 0)' },
};

const mapStatsConfig: ChartConfig = {
  wins: { label: 'Wins', color: 'oklch(0.723 0.219 149.579)' },
  losses: { label: 'Losses', color: 'oklch(0.577 0.245 27.325)' },
};

const SCORE_US_COLOR = 'oklch(0.488 0.243 264.376)';
const SCORE_THEM_COLOR = 'oklch(0.645 0.246 16.439)';

const recentResultsConfig: ChartConfig = {
  scoreUs: { label: 'Our Score', color: SCORE_US_COLOR },
  scoreThem: { label: 'Opponent', color: SCORE_THEM_COLOR },
};

function parseDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function computeStatsFromScrims(scrims: ScrimEntry[]): ScrimStats {
  const stats: ScrimStats = {
    totalScrims: scrims.length,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    mapStats: {},
  };

  for (const scrim of scrims) {
    if (scrim.result === 'win') stats.wins++;
    else if (scrim.result === 'loss') stats.losses++;
    else if (scrim.result === 'draw') stats.draws++;

    if (scrim.map) {
      if (!stats.mapStats[scrim.map]) {
        stats.mapStats[scrim.map] = { played: 0, wins: 0, losses: 0 };
      }
      stats.mapStats[scrim.map].played++;
      if (scrim.result === 'win') stats.mapStats[scrim.map].wins++;
      else if (scrim.result === 'loss') stats.mapStats[scrim.map].losses++;
    }
  }

  stats.winRate = stats.totalScrims > 0 ? (stats.wins / stats.totalScrims) * 100 : 0;
  return stats;
}

function ScrimFilters({
  matchType,
  onMatchTypeChange,
  timeRange,
  onTimeRangeChange,
  matchTypes,
}: {
  matchType: string;
  onMatchTypeChange: (v: string) => void;
  timeRange: ScrimTimeRange;
  onTimeRangeChange: (v: string) => void;
  matchTypes: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={matchType} onValueChange={onMatchTypeChange}>
        <SelectTrigger size="sm" className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="end">
          <SelectItem value="__all__">All Types</SelectItem>
          {matchTypes.map(type => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={timeRange} onValueChange={onTimeRangeChange}>
        <SelectTrigger size="sm" className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" align="end">
          {SCRIM_TIME_RANGES.map(range => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function StatisticsPanel() {
  const [loading, setLoading] = useState(true);
  const [allScrims, setAllScrims] = useState<ScrimEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDay[]>([]);
  const [availabilityRange, setAvailabilityRange] = useState<AvailabilityRange>('next14');
  const [availabilitySchedules, setAvailabilitySchedules] = useState<ScheduleDay[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [scrimMatchType, setScrimMatchType] = useState('__all__');
  const [scrimTimeRange, setScrimTimeRange] = useState<ScrimTimeRange>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const [schedulesRes, scrimsRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/schedule/next14`, { headers: getAuthHeaders() }),
        fetch(`${BOT_API_URL}/api/scrims`, { headers: getAuthHeaders() }),
      ]);

      const [schedulesData, scrimsData] = await Promise.all([
        schedulesRes.json(),
        scrimsRes.json(),
      ]);

      const schedulesList = schedulesData.schedules || [];
      const scrimsList: ScrimEntry[] = scrimsData.scrims || [];

      setSchedules(schedulesList);
      setAvailabilitySchedules(schedulesList);
      setAllScrims(scrimsList);
    } catch (error) {
      console.error('Failed to load statistics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailabilityForRange = useCallback(async (range: AvailabilityRange) => {
    if (range === 'next14') {
      setAvailabilitySchedules(schedules);
      return;
    }

    setAvailabilityLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const rangeConfig = AVAILABILITY_RANGES.find(r => r.value === range)!;

      const responses = await Promise.all(
        rangeConfig.offsets.map(offset =>
          fetch(`${BOT_API_URL}/api/schedule/paginated?offset=${offset}`, {
            headers: getAuthHeaders(),
          })
        )
      );

      const dataArray = await Promise.all(responses.map(r => r.json()));
      const allSchedules: ScheduleDay[] = dataArray.flatMap(d => d.schedules || []);

      allSchedules.sort((a, b) => {
        const [ad, am, ay] = a.date.split('.').map(Number);
        const [bd, bm, by] = b.date.split('.').map(Number);
        return (ay - by) || (am - bm) || (ad - bd);
      });

      setAvailabilitySchedules(allSchedules);
    } catch (error) {
      console.error('Failed to load availability data:', error);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [schedules]);

  const handleAvailabilityRangeChange = useCallback((value: string) => {
    const range = value as AvailabilityRange;
    setAvailabilityRange(range);
    loadAvailabilityForRange(range);
  }, [loadAvailabilityForRange]);

  // Extract unique match types from all scrims
  const availableMatchTypes = useMemo(() => {
    const types = new Set<string>();
    for (const scrim of allScrims) {
      if (scrim.matchType && scrim.matchType.trim()) {
        types.add(scrim.matchType.trim());
      }
    }
    return Array.from(types).sort();
  }, [allScrims]);

  // Filter scrims by match type and time range
  const filteredScrims = useMemo(() => {
    let filtered = allScrims;

    if (scrimMatchType !== '__all__') {
      filtered = filtered.filter(s => s.matchType === scrimMatchType);
    }

    const rangeConfig = SCRIM_TIME_RANGES.find(r => r.value === scrimTimeRange);
    if (rangeConfig?.days) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - rangeConfig.days);
      filtered = filtered.filter(s => parseDDMMYYYY(s.date) >= cutoff);
    }

    return filtered;
  }, [allScrims, scrimMatchType, scrimTimeRange]);

  // Compute stats from filtered scrims (client-side)
  const filteredStats = useMemo(() => computeStatsFromScrims(filteredScrims), [filteredScrims]);

  // Compute chart data from filtered stats
  const scrimResultsData = useMemo(() => {
    if (filteredStats.totalScrims === 0) return [];
    return [
      { name: 'wins', value: filteredStats.wins, fill: 'oklch(0.723 0.219 149.579)' },
      { name: 'losses', value: filteredStats.losses, fill: 'oklch(0.577 0.245 27.325)' },
      { name: 'draws', value: filteredStats.draws, fill: 'oklch(0.708 0 0)' },
    ].filter(d => d.value > 0);
  }, [filteredStats]);

  const availabilityData = useMemo(() => {
    return availabilitySchedules.map(schedule => {
      const mainPlayers = schedule.players.filter(p => p.role === 'MAIN');
      const available = mainPlayers.filter(p => p.availability && p.availability !== 'x' && p.availability !== 'X').length;
      const unavailable = mainPlayers.filter(p => p.availability === 'x' || p.availability === 'X').length;
      const noResponse = mainPlayers.filter(p => !p.availability).length;

      const [day, month] = schedule.date.split('.');
      return {
        date: `${day}.${month}`,
        available,
        unavailable,
        noResponse,
        total: mainPlayers.length,
      };
    });
  }, [availabilitySchedules]);

  const mapStatsData = useMemo(() => {
    if (!filteredStats.mapStats) return [];
    return Object.entries(filteredStats.mapStats)
      .map(([map, data]) => ({
        map,
        wins: data.wins,
        losses: data.losses,
        played: data.played,
        winRate: data.played > 0 ? Math.round((data.wins / data.played) * 100) : 0,
      }))
      .sort((a, b) => b.played - a.played)
      .slice(0, 8);
  }, [filteredStats]);

  const recentResultsData = useMemo(() => {
    return [...allScrims]
      .slice(0, 10)
      .reverse()
      .slice(-8)
      .map(scrim => ({
        opponent: scrim.opponent.length > 12 ? scrim.opponent.slice(0, 12) + '..' : scrim.opponent,
        scoreUs: scrim.scoreUs,
        scoreThem: scrim.scoreThem,
        result: scrim.result,
      }));
  }, [allScrims]);

  const agentUsageData = useMemo(() => {
    const agentCounts: Record<string, { picks: number; wins: number }> = {};

    for (const scrim of filteredScrims) {
      if (scrim.ourAgents && scrim.ourAgents.length > 0) {
        for (const agent of scrim.ourAgents) {
          if (!agent || !agent.trim()) continue;
          const name = agent.trim();
          if (!agentCounts[name]) {
            agentCounts[name] = { picks: 0, wins: 0 };
          }
          agentCounts[name].picks++;
          if (scrim.result === 'win') agentCounts[name].wins++;
        }
      }
    }

    return Object.entries(agentCounts)
      .map(([agent, data]) => ({
        agent,
        picks: data.picks,
        wins: data.wins,
        winRate: data.picks > 0 ? Math.round((data.wins / data.picks) * 100) : 0,
      }))
      .sort((a, b) => b.picks - a.picks)
      .slice(0, 10);
  }, [filteredScrims]);

  const maxAgentPicks = useMemo(() => {
    return agentUsageData.length > 0 ? agentUsageData[0].picks : 0;
  }, [agentUsageData]);

  const hasScrimData = filteredStats.totalScrims > 0;
  const hasAvailabilityData = availabilitySchedules.length > 0;
  const hasAgentData = agentUsageData.length > 0;
  const selectedRangeLabel = AVAILABILITY_RANGES.find(r => r.value === availabilityRange)?.label || '';
  const isFiltered = scrimMatchType !== '__all__' || scrimTimeRange !== 'all';

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
      {/* Charts Row 1: Scrim Results + Availability */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Scrim Results Pie Chart */}
        <Card className={stagger(0, 'slow', 'slideUpScale')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Scrim Results
            </CardTitle>
            <CardAction>
              <ScrimFilters
                matchType={scrimMatchType}
                onMatchTypeChange={setScrimMatchType}
                timeRange={scrimTimeRange}
                onTimeRangeChange={(v) => setScrimTimeRange(v as ScrimTimeRange)}
                matchTypes={availableMatchTypes}
              />
            </CardAction>
            <CardDescription>
              {hasScrimData
                ? `Win/Loss distribution across ${filteredStats.totalScrims} matches${isFiltered ? ' (filtered)' : ''}`
                : allScrims.length > 0
                  ? 'No matches match the current filters'
                  : 'No scrim data available yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {hasScrimData && scrimResultsData.length > 0 ? (
              <ChartContainer config={scrimResultsConfig} className="mx-auto aspect-square max-h-[300px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={scrimResultsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {scrimResultsData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                  <text
                    x="50%"
                    y="45%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground text-2xl font-bold"
                  >
                    {filteredStats.winRate.toFixed(0)}%
                  </text>
                  <text
                    x="50%"
                    y="55%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-muted-foreground text-xs"
                  >
                    Win Rate
                  </text>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                {allScrims.length > 0 ? 'No matches match the current filters' : 'Play some matches to see statistics'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability Overview Bar Chart */}
        <Card className={stagger(1, 'slow', 'slideUpScale')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Team Availability
            </CardTitle>
            <CardAction>
              <Select value={availabilityRange} onValueChange={handleAvailabilityRangeChange}>
                <SelectTrigger size="sm" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" align="end">
                  {AVAILABILITY_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardAction>
            <CardDescription>
              {availabilityLoading
                ? 'Loading...'
                : hasAvailabilityData
                  ? `Main player availability — ${selectedRangeLabel}`
                  : 'No schedule data available'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {!availabilityLoading && hasAvailabilityData && availabilityData.length > 0 ? (
              <ChartContainer config={availabilityConfig} className="aspect-auto h-[300px] w-full">
                <BarChart data={availabilityData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tickMargin={8}
                    interval={availabilityData.length > 20 ? Math.floor(availabilityData.length / 10) : 0}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="available"
                    stackId="a"
                    fill="oklch(0.723 0.219 149.579)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="unavailable"
                    stackId="a"
                    fill="oklch(0.577 0.245 27.325)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="noResponse"
                    stackId="a"
                    fill="oklch(0.708 0 0)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : availabilityLoading ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Schedule data will appear here
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Map Performance + Recent Results */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Map Performance Bar Chart */}
        <Card className={stagger(2, 'slow', 'slideUpScale')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Map Performance
            </CardTitle>
            <CardAction>
              <ScrimFilters
                matchType={scrimMatchType}
                onMatchTypeChange={setScrimMatchType}
                timeRange={scrimTimeRange}
                onTimeRangeChange={(v) => setScrimTimeRange(v as ScrimTimeRange)}
                matchTypes={availableMatchTypes}
              />
            </CardAction>
            <CardDescription>
              {mapStatsData.length > 0
                ? `Win/Loss breakdown by map${isFiltered ? ' (filtered)' : ''}`
                : allScrims.length > 0
                  ? 'No matches match the current filters'
                  : 'No map data available yet'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {mapStatsData.length > 0 ? (
              <ChartContainer config={mapStatsConfig} className="aspect-auto h-[300px] w-full">
                <BarChart data={mapStatsData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                  <YAxis
                    dataKey="map"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    width={80}
                    tickMargin={4}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="wins" stackId="a" fill="oklch(0.723 0.219 149.579)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="losses" stackId="a" fill="oklch(0.577 0.245 27.325)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                {allScrims.length > 0 ? 'No matches match the current filters' : 'Play matches on different maps to see performance'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Match Results */}
        <Card className={stagger(3, 'slow', 'slideUpScale')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Recent Matches
            </CardTitle>
            <CardDescription>
              {recentResultsData.length > 0
                ? 'Score comparison for recent matches'
                : 'No recent match data'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {recentResultsData.length > 0 ? (
              <ChartContainer config={recentResultsConfig} className="aspect-auto h-[300px] w-full">
                <BarChart data={recentResultsData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="opponent"
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tickMargin={8}
                    angle={-30}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickMargin={4}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="scoreUs" fill={SCORE_US_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="scoreThem" fill={SCORE_THEM_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Recent match scores will appear here
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Usage */}
      <Card className={stagger(4, 'slow', 'slideUpScale')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Swords className="h-4 w-4" />
            Agent Usage
          </CardTitle>
          <CardAction>
            <ScrimFilters
              matchType={scrimMatchType}
              onMatchTypeChange={setScrimMatchType}
              timeRange={scrimTimeRange}
              onTimeRangeChange={(v) => setScrimTimeRange(v as ScrimTimeRange)}
              matchTypes={availableMatchTypes}
            />
          </CardAction>
          <CardDescription>
            {hasAgentData
              ? `Most picked agents across ${filteredScrims.filter(s => s.ourAgents && s.ourAgents.length > 0).length} matches with agent data${isFiltered ? ' (filtered)' : ''}`
              : allScrims.length > 0
                ? 'No agent data available for the current filters'
                : 'No agent data available yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasAgentData ? (
            <div className="space-y-2">
              {agentUsageData.map((entry, index) => {
                const losses = entry.picks - entry.wins;
                const barWidth = maxAgentPicks > 0 ? (entry.picks / maxAgentPicks) * 100 : 0;
                const winPortion = entry.picks > 0 ? (entry.wins / entry.picks) * 100 : 0;

                return (
                  <div
                    key={entry.agent}
                    className={cn(
                      'flex items-center gap-3 py-1.5',
                      stagger(index, 'fast', 'fadeIn')
                    )}
                  >
                    <img
                      src={`/assets/agents/${entry.agent}_icon.webp`}
                      alt={entry.agent}
                      className="w-7 h-7 rounded-md shrink-0"
                      title={entry.agent}
                    />
                    <div className="w-16 text-sm font-medium truncate shrink-0">
                      {entry.agent}
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 h-5 bg-muted/50 rounded overflow-hidden" style={{ maxWidth: `${barWidth}%`, minWidth: '20px' }}>
                        <div className="h-full flex">
                          {entry.wins > 0 && (
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${winPortion}%`,
                                backgroundColor: 'oklch(0.723 0.219 149.579)',
                              }}
                            />
                          )}
                          {losses > 0 && (
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${100 - winPortion}%`,
                                backgroundColor: 'oklch(0.577 0.245 27.325)',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums shrink-0 text-right w-20">
                      <span className="font-medium text-foreground">{entry.picks}</span>
                      {' '}{entry.picks === 1 ? 'pick' : 'picks'}
                    </div>
                    <div className="w-12 text-right tabular-nums shrink-0">
                      <span className={cn(
                        'text-xs font-medium',
                        entry.winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {entry.winRate}%
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground border-t">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'oklch(0.723 0.219 149.579)' }} />
                  Wins
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'oklch(0.577 0.245 27.325)' }} />
                  Losses
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              {allScrims.length > 0 ? 'No agent data available for the current filters' : 'Add agents to your scrims to see usage statistics'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
