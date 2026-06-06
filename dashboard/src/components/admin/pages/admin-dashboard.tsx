

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Calendar, Trophy, TrendingUp, Clock, Percent, BarChart3, Zap, Settings, Terminal } from 'lucide-react';
import { stagger, microInteractions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { BOT_API_URL } from '@/lib/config';
import { getAuthHeaders } from '@/lib/auth';
import { parseDDMMYYYY } from '@/lib/date-utils';
import { type ScheduleDay, type ScrimEntry } from '@/lib/types';

interface DashboardStats {
  totalUsers: number;
  totalSchedules: number;
  totalScrims: number;
  upcomingSchedules: number;
}

interface BotStatus {
  status: 'running' | 'offline';
  botReady: boolean;
  uptime?: number;
}

interface UserMapping {
  discordId: string;
  displayName: string;
  role: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [userMappings, setUserMappings] = useState<UserMapping[]>([]);
  const [scrims, setScrims] = useState<ScrimEntry[]>([]);

  useEffect(() => {
    loadStats();
    checkBotStatus();
    const interval = setInterval(checkBotStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {


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
      setScrims(scrimsList);

      setStats({
        totalUsers: mappings.length,
        totalSchedules: schedulesList.length,
        totalScrims: scrimsList.length,
        upcomingSchedules: schedulesList.filter((s: ScheduleDay) => {
          const scheduleDate = parseDDMMYYYY(s.date);
          return scheduleDate >= new Date();
        }).length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBotStatus = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/bot-status`, { headers: getAuthHeaders() });
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

  const overallStats = useMemo(() => {
    let wins = 0, losses = 0, draws = 0;
    for (const scrim of scrims) {
      if (scrim.result === 'win') wins++;
      else if (scrim.result === 'loss') losses++;
      else if (scrim.result === 'draw') draws++;
    }
    const total = scrims.length;
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    return { wins, losses, draws, winRate, total };
  }, [scrims]);

  const rosterBreakdown = useMemo(() => {
    const mains = userMappings.filter(u => u.role.toLowerCase() === 'main').length;
    const subs = userMappings.filter(u => u.role.toLowerCase() === 'sub').length;
    const coaches = userMappings.filter(u => u.role.toLowerCase() === 'coach').length;
    return { mains, subs, coaches };
  }, [userMappings]);

  const isOnline = botStatus && botStatus.status === 'running' && botStatus.botReady;
  const hasScrimData = overallStats.total > 0;

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
      color: statusLoading ? 'muted' : isOnline ? 'green' : 'red',
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

  return (
    <div className="space-y-6">
      {/* Bot Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card, index) => {
          const Icon = card.icon;
          const isGreen = card.color === 'green';
          const isRed = card.color === 'red';
          const colorClass = isGreen
            ? 'text-green-600 dark:text-green-400'
            : isRed
              ? 'text-red-600 dark:text-red-400'
              : 'text-muted-foreground';
          const iconBgClass = isGreen
            ? 'bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400'
            : isRed
              ? 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400'
              : 'bg-muted text-muted-foreground';
          const glowClass = isGreen ? 'glow-green' : isRed ? 'glow-red' : '';

          return (
            <Card
              key={card.title}
              className={cn(
                stagger(index, 'fast', 'slideUpScale')
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconBgClass)}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'h-2 w-2 rounded-full',
                    isGreen ? 'bg-green-500 animate-pulse' : isRed ? 'bg-red-500' : 'bg-muted-foreground',
                    glowClass
                  )} />
                  <div className={cn('text-2xl font-bold', colorClass)}>
                    {card.value}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Team Overview Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Roster Summary */}
        <Card className={stagger(0, 'slow', 'slideUpScale')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Roster</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : stats?.totalUsers ?? 0}</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{rosterBreakdown.mains}</span> Main
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{rosterBreakdown.subs}</span> Sub
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{rosterBreakdown.coaches}</span> Coach
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Win Rate */}
        <Card className={stagger(1, 'slow', 'slideUpScale')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn(
              'text-3xl font-bold tabular-nums',
              hasScrimData
                ? overallStats.winRate >= 50
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
            )}>
              {hasScrimData ? `${overallStats.winRate.toFixed(0)}%` : '--'}
            </div>
            {hasScrimData ? (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs"><span className="font-medium text-green-600 dark:text-green-400">{overallStats.wins}W</span></span>
                <span className="text-xs"><span className="font-medium text-red-600 dark:text-red-400">{overallStats.losses}L</span></span>
                {overallStats.draws > 0 && (
                  <span className="text-xs"><span className="font-medium text-muted-foreground">{overallStats.draws}D</span></span>
                )}
                <span className="text-xs text-muted-foreground">({overallStats.total} total)</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">No match data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Schedules */}
        <Card className={stagger(2, 'slow', 'slideUpScale')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{loading ? '...' : stats?.upcomingSchedules ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Scheduled days in the next 14 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="animate-slideUp">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[
            {
              href: '/admin?tab=statistics',
              icon: BarChart3,
              title: 'Statistics',
              description: 'Charts & analytics',
            },
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
              href: '/admin?tab=matches',
              icon: Trophy,
              title: 'View Scrims',
              description: 'Match history & stats',
            },
            {
              href: '/admin?tab=actions',
              icon: Zap,
              title: 'Bot Actions',
              description: 'Trigger manual actions',
            },
            {
              href: '/admin?tab=settings',
              icon: Settings,
              title: 'Settings',
              description: 'Configure bot settings',
            },
            {
              href: '/admin?tab=logs',
              icon: Terminal,
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
                  'group flex items-center gap-3 p-4 rounded-lg border hover:bg-accent/50 hover:border-primary/20',
                  stagger(index, 'fast', 'fadeIn'),
                  microInteractions.smooth,
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary transition-colors duration-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{action.description}</div>
                </div>
              </a>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
