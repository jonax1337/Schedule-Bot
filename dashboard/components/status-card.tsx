"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Clock, Users, Calendar } from "lucide-react";

interface BotStatus {
  status: 'running' | 'offline';
  botReady: boolean;
  uptime?: number;
}

export default function StatusCard() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/bot-status');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({ status: 'offline', botReady: false });
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="px-6 py-0">
          <div className="flex items-center justify-center h-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOnline = status && status.status === 'running' && status.botReady;

  return (
    <Card>
      <CardContent className="px-6 py-0">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Activity className="mr-1 h-4 w-4" />
              Status
            </div>
            <div className="flex items-center">
              {isOnline ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  ● Running
                </Badge>
              ) : (
                <Badge variant="destructive">
                  ● Offline
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              Uptime
            </div>
            <div className="text-sm font-medium">
              {formatUptime(status?.uptime)}
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-1 h-4 w-4" />
              API Server
            </div>
            <div className="text-sm font-medium">
              {isOnline ? (
                <span className="text-green-600 dark:text-green-400">Port 3001</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">Offline</span>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Users className="mr-1 h-4 w-4" />
              Connection
            </div>
            <div className="text-sm font-medium">
              {status?.botReady ? (
                <span className="text-green-600 dark:text-green-400">Discord Ready</span>
              ) : (
                <span className="text-red-600 dark:text-red-400">Not Connected</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
