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
      const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';
      const response = await fetch(`${BOT_API_URL}/api/bot-status`);
      const data = await response.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      setStatus({ status: 'offline', botReady: false });
      setLoading(false);
    }
  };

  const getApiServerUrl = () => {
    const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';
    try {
      const url = new URL(BOT_API_URL);
      // For localhost, show with port
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return url.host;
      }
      // For production URLs, just show hostname (cleaner)
      return url.hostname;
    } catch {
      return 'API';
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="invisible">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
                <Activity className="mr-2 h-4 w-4" />
                Placeholder
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pt-0 pb-4">
              <div className="text-2xl font-bold">
                00h 00m
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const isOnline = status && status.status === 'running' && status.botReady;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Status Card */}
      <Card className="animate-slideUp stagger-1">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
            <Activity className="mr-2 h-4 w-4" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center pt-0 pb-4">
          {isOnline ? (
            <Badge className="bg-green-500 hover:bg-green-600 text-base px-4 py-1">
              ● Running
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-base px-4 py-1">
              ● Offline
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Uptime Card */}
      <Card className="animate-slideUp stagger-2">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
            <Clock className="mr-2 h-4 w-4" />
            Uptime
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center pt-0 pb-4">
          <div className="text-2xl font-bold">
            {formatUptime(status?.uptime)}
          </div>
        </CardContent>
      </Card>

      {/* API Server Card */}
      <Card className="animate-slideUp stagger-3">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            API Server
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center pt-0 pb-4">
          {isOnline ? (
            <>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">Online</div>
              <div className="text-xs text-muted-foreground mt-1 truncate max-w-full px-2" title={process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001'}>
                {getApiServerUrl()}
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">Offline</div>
          )}
        </CardContent>
      </Card>

      {/* Connection Card */}
      <Card className="animate-slideUp stagger-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium flex items-center justify-center text-muted-foreground">
            <Users className="mr-2 h-4 w-4" />
            Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center pt-0 pb-4">
          {status?.botReady ? (
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">Ready</div>
          ) : (
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">Offline</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
