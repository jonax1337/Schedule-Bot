'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Calendar, Trophy, TrendingUp, Clock, Percent, BarChart3, Zap, Settings, Terminal } from 'lucide-react';
import { stagger, microInteractions, cn } from '@/lib/animations';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

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
  result: 'win' | 'loss' | 'draw';
}

interface UserMapping {
  discordId: string;
  displayName: string;
  role: string;
}

function parseDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('.').map(Number);
  return new Date(year, month - 1, day);
}

export default function AdminDashboardHome() {
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
            description: hasScrimData ? `Win Rate: ${overallStats.winRate.toFixed(1)}%` : 'Match history records',
          },
          {
            title: 'Win Rate',
            icon: Percent,
            value: loading ? '...' : hasScrimData ? `${overallStats.winRate.toFixed(1)}%` : 'N/A',
            description: hasScrimData ? `${overallStats.wins}W / ${overallStats.losses}L / ${overallStats.draws}D` : 'No match data',
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

      {/* Quick Actions */}
      <Card className="animate-slideUp">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              href: '/admin?tab=scrims',
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
