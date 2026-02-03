'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Calendar, Trophy, Clock, BarChart3, Zap, Settings, Terminal } from 'lucide-react';
import { stagger, microInteractions } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { parseDDMMYYYY } from '@/lib/date-utils';
import { useUserMappings, useScrims, useSchedule, useBotStatus } from '@/hooks';

export function AdminDashboard() {
  const { mappings: userMappings } = useUserMappings();
  const { scrims } = useScrims();
  const { schedules } = useSchedule();
  const { botStatus, loading: statusLoading, isOnline, formattedUptime } = useBotStatus({ pollInterval: 10000 });

  const stats = useMemo(() => ({
    totalUsers: userMappings.length,
    totalSchedules: schedules.length,
    totalScrims: scrims.length,
    upcomingSchedules: schedules.filter(s => {
      const scheduleDate = parseDDMMYYYY(s.date);
      return scheduleDate >= new Date();
    }).length,
  }), [userMappings, schedules, scrims]);

  const rosterBreakdown = useMemo(() => {
    const mains = userMappings.filter(u => u.role.toLowerCase() === 'main').length;
    const subs = userMappings.filter(u => u.role.toLowerCase() === 'sub').length;
    const coaches = userMappings.filter(u => u.role.toLowerCase() === 'coach').length;
    return { mains, subs, coaches };
  }, [userMappings]);

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
      value: statusLoading ? '...' : formattedUptime,
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
