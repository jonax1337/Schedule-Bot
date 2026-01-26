"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RefreshCw, Terminal, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { stagger, microInteractions, loadingStates, cn } from "@/lib/animations";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  details?: string;
}

export default function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [limit, setLimit] = useState<string>("100");

  useEffect(() => {
    loadLogs();

    if (autoRefresh) {
      const interval = setInterval(loadLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filter, limit]);

  const loadLogs = async () => {
    try {
      const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';
      const { getAuthHeaders } = await import('@/lib/auth');
      const levelParam = filter !== "all" ? `&level=${filter}` : "";
      const response = await fetch(`${BOT_API_URL}/api/logs?limit=${limit}${levelParam}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to load logs:', error);
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'warn':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'success':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="animate-fadeIn">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Terminal className="mr-2 h-5 w-5" />
              Bot Logs
            </CardTitle>
            <CardDescription>
              Real-time bot activity and error logs
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
                Auto-refresh
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLogs()}
              disabled={loading}
              className={cn(microInteractions.activePress, microInteractions.smooth)}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Label htmlFor="filter" className="text-sm">Filter by Level</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger id="filter" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="limit" className="text-sm">Show Last</Label>
            <Select value={limit} onValueChange={setLimit}>
              <SelectTrigger id="limit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="50">50 entries</SelectItem>
                <SelectItem value="100">100 entries</SelectItem>
                <SelectItem value="200">200 entries</SelectItem>
                <SelectItem value="500">500 entries</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[600px] w-full rounded-md border p-4 bg-muted/30">
          {loading && logs.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={cn("flex items-start gap-3 p-3 border rounded-lg", loadingStates.skeleton)}>
                  <Skeleton className="h-4 w-4 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Terminal className="h-12 w-12 mb-2" />
              <p>No logs available</p>
            </div>
          ) : (
            <div className="space-y-2 font-mono text-sm">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    getLevelColor(log.level),
                    stagger(index, 'fast', 'fadeIn'),
                    microInteractions.smooth
                  )}
                >
                  <div className="mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {formatTime(log.timestamp)}
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase">
                        {log.level}
                      </Badge>
                    </div>
                    <div className="font-semibold">{log.message}</div>
                    {log.details && (
                      <div className="text-xs mt-1 opacity-80">{log.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
