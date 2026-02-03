'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Users, Calendar, Trophy, TrendingUp, Clock, Zap, Settings, Terminal, ArrowRight, BarChart3 } from 'lucide-react';
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

  const statusCards = [
    {
      title: 'Bot Status',
      icon: Activity,
      value: statusLoading ? '...' : isOnline ? 'Online' : 'Offline',
      description: isOnline ? 'All systems operational' : 'Bot is offline',
      status: statusLoading ? 'loading' : isOnline ? 'success' : 'destructive',
    },
    {
      title: 'Uptime',
      icon: Clock,
      value: statusLoading ? '...' : formatUptime(botStatus?.uptime),
      description: 'Since last restart',
      status: statusLoading ? 'loading' : isOnline ? 'success' : 'muted',
    },
    {
      title: 'Discord',
      icon: Users,
      value: statusLoading ? '...' : botStatus?.botReady ? 'Connected' : 'Disconnected',
      description: botStatus?.botReady ? 'Gateway active' : 'No connection',
      status: statusLoading ? 'loading' : botStatus?.botReady ? 'success' : 'destructive',
    },
    {
      title: 'Win Rate',
      icon: TrendingUp,
      value: loading ? '...' : `${overallStats.winRate.toFixed(0)}%`,
      description: `${overallStats.wins}W / ${overallStats.losses}L / ${overallStats.draws}D`,
      status: loading ? 'loading' : overallStats.winRate >= 50 ? 'success' : 'warning',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statusCards.map((card, index) => {
          const Icon = card.icon;
          const getStatusStyles = () => {
            switch (card.status) {
              case 'success':
                return {
                  dot: 'status-dot-success status-dot-pulse',
                  badge: 'success' as const,
                  icon: 'text-success',
                };
              case 'destructive':
                return {
                  dot: 'status-dot-destructive',
                  badge: 'destructive' as const,
                  icon: 'text-destructive',
                };
              case 'warning':
                return {
                  dot: 'status-dot-warning',
                  badge: 'warning' as const,
                  icon: 'text-warning',
                };
              default:
                return {
                  dot: '',
                  badge: 'secondary' as const,
                  icon: 'text-muted-foreground',
                };
            }
          };

          const styles = getStatusStyles();

          return (
            <Card
              key={card.title}
              variant="elevated"
              className={cn(stagger(index, 'fast', 'slideUpScale'))}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={cn(
                  "p-2 rounded-lg",
                  card.status === 'success' && "bg-success/10",
                  card.status === 'destructive' && "bg-destructive/10",
                  card.status === 'warning' && "bg-warning/10",
                  card.status === 'loading' && "bg-muted",
                )}>
                  <Icon className={cn("h-4 w-4", styles.icon)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {card.status !== 'loading' && (
                    <div className={cn("status-dot", styles.dot)} />
                  )}
                  <span className="text-2xl font-bold tracking-tight">
                    {card.value}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="gradient" className={cn(stagger(0, 'base', 'slideUp'))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Team Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{userMappings.length}</span>
              <span className="text-sm text-muted-foreground">players</span>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant="outline-info">{rosterBreakdown.mains} Main</Badge>
              <Badge variant="outline-warning">{rosterBreakdown.subs} Sub</Badge>
              <Badge variant="outline-success">{rosterBreakdown.coaches} Coach</Badge>
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className={cn(stagger(1, 'base', 'slideUp'))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Scrims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{scrims.length}</span>
              <span className="text-sm text-muted-foreground">matches</span>
            </div>
            <div className="flex gap-2 mt-3">
              <Badge variant="success">{overallStats.wins} Wins</Badge>
              <Badge variant="destructive">{overallStats.losses} Losses</Badge>
              {overallStats.draws > 0 && (
                <Badge variant="secondary">{overallStats.draws} Draws</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="gradient" className={cn(stagger(2, 'base', 'slideUp'))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats?.upcomingSchedules || 0}</span>
              <span className="text-sm text-muted-foreground">upcoming days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Next 14 days of availability tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="elevated" className="animate-slideUp">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: '/admin?tab=statistics',
              icon: BarChart3,
              title: 'Statistics',
              description: 'Charts & analytics',
              color: 'info',
            },
            {
              href: '/admin?tab=users',
              icon: Users,
              title: 'Manage Users',
              description: 'Team roster',
              color: 'primary',
            },
            {
              href: '/admin?tab=schedule',
              icon: Calendar,
              title: 'Edit Schedule',
              description: 'Update reasons',
              color: 'primary',
            },
            {
              href: '/admin?tab=matches',
              icon: Trophy,
              title: 'View Scrims',
              description: 'Match history',
              color: 'warning',
            },
            {
              href: '/admin?tab=actions',
              icon: Zap,
              title: 'Bot Actions',
              description: 'Manual triggers',
              color: 'warning',
            },
            {
              href: '/admin?tab=settings',
              icon: Settings,
              title: 'Settings',
              description: 'Configuration',
              color: 'primary',
            },
            {
              href: '/admin?tab=logs',
              icon: Terminal,
              title: 'View Logs',
              description: 'System activity',
              color: 'muted',
            },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <a
                key={action.title}
                href={action.href}
                className={cn(
                  'group flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50',
                  'transition-all duration-200',
                  stagger(index, 'fast', 'fadeIn'),
                  microInteractions.smooth
                )}
              >
                <div className={cn(
                  'p-2.5 rounded-lg transition-colors',
                  action.color === 'info' && 'bg-info/10 text-info group-hover:bg-info/20',
                  action.color === 'warning' && 'bg-warning/10 text-warning group-hover:bg-warning/20',
                  action.color === 'primary' && 'bg-primary/10 text-primary group-hover:bg-primary/20',
                  action.color === 'muted' && 'bg-muted text-muted-foreground group-hover:bg-muted/80',
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm text-muted-foreground">{action.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </a>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
