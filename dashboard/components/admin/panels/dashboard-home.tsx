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
import { Activity, Users, Calendar, Trophy, TrendingUp, Clock, Target, Map, BarChart3, Percent } from 'lucide-react';
import { stagger, microInteractions, cn } from '@/lib/animations';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface DashboardStats {
  totalUsers: number;
  totalSchedules: number;
  totalScrims: number;
  upcomingSchedules: number;
  recentActivity: string[];
}

interface BotStatus {
  status: 'running' | 'offline';
  botReady: boolean;
  uptime?: number;
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
}

interface UserMapping {
  discordId: string;
  displayName: string;
  role: string;
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

export default function AdminDashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [allScrims, setAllScrims] = useState<ScrimEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleDay[]>([]);
  const [userMappings, setUserMappings] = useState<UserMapping[]>([]);
  const [availabilityRange, setAvailabilityRange] = useState<AvailabilityRange>('next14');
  const [availabilitySchedules, setAvailabilitySchedules] = useState<ScheduleDay[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [scrimMatchType, setScrimMatchType] = useState('__all__');
  const [scrimTimeRange, setScrimTimeRange] = useState<ScrimTimeRange>('all');

  useEffect(() => {
    loadStats();
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const [usersRes, schedulesRes, scrimsRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/user-mappings`, { headers: getAuthHeaders() }),
        fetch(`${BOT_API_URL}/api/schedule/next14`, { headers: getAuthHeaders() }),
        fetch(`${BOT_API_URL}/api/scrims`, { headers: getAuthHeaders() }),
      ]);

      const [usersData, schedulesData, scrimsData] = await Promise.all([
        usersRes.json(),
        schedulesRes.json(),
        scrimsRes.json(),
      ]);

      const mappings = usersData.mappings || [];
      const schedulesList = schedulesData.schedules || [];
      const scrimsList: ScrimEntry[] = scrimsData.scrims || [];

      setUserMappings(mappings);
      setSchedules(schedulesList);
      setAvailabilitySchedules(schedulesList);
      setAllScrims(scrimsList);

      setStats({
        totalUsers: mappings.length,
        totalSchedules: schedulesList.length,
        totalScrims: scrimsList.length,
        upcomingSchedules: schedulesList.filter((s: ScheduleDay) => {
          const scheduleDate = parseDDMMYYYY(s.date);
          return scheduleDate >= new Date();
        }).length,
        recentActivity: [],
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  const checkBotStatus = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot-status`);
      const data = await response.json();
      setBotStatus(data);
      setStatusLoading(false);
    } catch (error) {
      setBotStatus({ status: 'offline', botReady: false });
      setStatusLoading(false);
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

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

  // Overall stats (unfiltered) for the summary cards
  const overallStats = useMemo(() => computeStatsFromScrims(allScrims), [allScrims]);

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

  const rosterBreakdown = useMemo(() => {
    const mains = userMappings.filter(u => u.role.toLowerCase() === 'main').length;
    const subs = userMappings.filter(u => u.role.toLowerCase() === 'sub').length;
    const coaches = userMappings.filter(u => u.role.toLowerCase() === 'coach').length;
    return { mains, subs, coaches };
  }, [userMappings]);

  const isOnline = botStatus && botStatus.status === 'running' && botStatus.botReady;

  const statusCards = [
    {
      title: 'Bot Status',
      icon: Activity,
      value: statusLoading ? '...' : isOnline ? 'Running' : 'Offline',
      description: isOnline ? 'Bot is operational' : 'Bot is offline',
      color: statusLoading ? 'muted' : isOnline ? 'green' : 'red',
    },
    {
      title: 'Uptime',
      icon: Clock,
      value: statusLoading ? '...' : formatUptime(botStatus?.uptime),
      description: 'Time since last restart',
      color: 'default',
    },
    {
      title: 'API Server',
      icon: Calendar,
      value: statusLoading ? '...' : isOnline ? 'Online' : 'Offline',
      description: isOnline ? 'API responding' : 'API not responding',
      color: statusLoading ? 'muted' : isOnline ? 'green' : 'red',
    },
    {
      title: 'Discord Connection',
      icon: Users,
      value: statusLoading ? '...' : botStatus?.botReady ? 'Ready' : 'Offline',
      description: botStatus?.botReady ? 'Connected to Discord' : 'Not connected',
      color: statusLoading ? 'muted' : botStatus?.botReady ? 'green' : 'red',
    },
  ];

  const hasScrimData = filteredStats.totalScrims > 0;
  const hasOverallScrimData = overallStats.totalScrims > 0;
  const hasAvailabilityData = availabilitySchedules.length > 0;
  const selectedRangeLabel = AVAILABILITY_RANGES.find(r => r.value === availabilityRange)?.label || '';
  const isFiltered = scrimMatchType !== '__all__' || scrimTimeRange !== 'all';

  return (
    <div className="space-y-6">
      {/* Bot Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card, index) => {
          const Icon = card.icon;
          const colorClass =
            card.color === 'green'
              ? 'text-green-600 dark:text-green-400'
              : card.color === 'red'
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground';

          return (
            <Card
              key={card.title}
              className={cn(
                stagger(index, 'fast', 'slideUpScale')
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn('text-2xl font-bold', colorClass)}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: 'Total Users',
            icon: Users,
            value: loading ? '...' : stats?.totalUsers || 0,
            description: `${rosterBreakdown.mains} Main, ${rosterBreakdown.subs} Sub, ${rosterBreakdown.coaches} Coach`,
          },
          {
            title: 'Upcoming Schedules',
            icon: Calendar,
            value: loading ? '...' : stats?.upcomingSchedules || 0,
            description: 'Next 14 days',
          },
          {
            title: 'Total Scrims',
            icon: Trophy,
            value: loading ? '...' : stats?.totalScrims || 0,
            description: hasOverallScrimData ? `Win Rate: ${overallStats.winRate.toFixed(1)}%` : 'Match history records',
          },
          {
            title: 'Win Rate',
            icon: Percent,
            value: loading ? '...' : hasOverallScrimData ? `${overallStats.winRate.toFixed(1)}%` : 'N/A',
            description: hasOverallScrimData ? `${overallStats.wins}W / ${overallStats.losses}L / ${overallStats.draws}D` : 'No match data',
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={cn(
                stagger(index, 'slow', 'slideUpScale')
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1: Scrim Results + Availability */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Scrim Results Pie Chart */}
        <Card className="animate-slideUp">
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
        <Card className="animate-slideUp">
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
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Loading availability data...
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
        <Card className="animate-slideUp">
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
        <Card className="animate-slideUp">
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

      {/* Quick Actions */}
      <Card className="animate-slideUp">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: '/admin?tab=users',
              icon: Users,
              title: 'Manage Users',
              description: 'Add or edit team members',
            },
            {
              href: '/admin?tab=schedule',
              icon: Calendar,
              title: 'Edit Schedule',
              description: 'Update schedule reasons',
            },
            {
              href: '/admin?tab=scrims',
              icon: Trophy,
              title: 'View Scrims',
              description: 'Match history & stats',
            },
            {
              href: '/admin?tab=actions',
              icon: Activity,
              title: 'Bot Actions',
              description: 'Trigger manual actions',
            },
            {
              href: '/admin?tab=settings',
              icon: Clock,
              title: 'Settings',
              description: 'Configure bot settings',
            },
            {
              href: '/admin?tab=logs',
              icon: TrendingUp,
              title: 'View Logs',
              description: 'System activity logs',
            },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <a
                key={action.title}
                href={action.href}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border hover:bg-accent',
                  stagger(index, 'fast', 'fadeIn'),
                  microInteractions.smooth,
                  microInteractions.hoverScaleSm
                )}
              >
                <Icon className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm text-muted-foreground">{action.description}</div>
                </div>
              </a>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
