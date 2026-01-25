"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface BotStatus {
  status: 'running' | 'offline';
  botReady: boolean;
  uptime?: number;
}

export default function BotStatusBadge() {
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
    } catch (error) {
      setStatus({ status: 'offline', botReady: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Badge variant="outline">
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (!status || status.status === 'offline') {
    return (
      <Badge variant="destructive">
        ● Offline
      </Badge>
    );
  }

  const uptimeHours = status.uptime ? Math.floor(status.uptime / 3600) : 0;
  const uptimeMinutes = status.uptime ? Math.floor((status.uptime % 3600) / 60) : 0;

  return (
    <Badge variant="default" className="bg-green-500 hover:bg-green-600">
      ● Running {uptimeHours > 0 && `(${uptimeHours}h ${uptimeMinutes}m)`}
    </Badge>
  );
}
