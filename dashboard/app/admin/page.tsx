'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import SettingsPanel from "@/components/settings-panel";
import ActionsPanel from "@/components/actions-panel";
import LogsPanel from "@/components/logs-panel";
import { UserMappingsPanel } from "@/components/user-mappings-panel";
import { ScheduleEditor } from "@/components/schedule-editor";
import { ScrimsPanel } from "@/components/scrims-panel";
import SecurityPanel from "@/components/security-panel";
import StatusCard from "@/components/status-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Settings, Zap, Terminal, Users, CalendarDays, LogOut, Trophy, ArrowLeft, Shield } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check for JWT token and admin role
    const checkAuth = async () => {
      const { validateToken, removeAuthToken, getUser } = await import('@/lib/auth');
      
      const user = getUser();
      if (!user || user.role !== 'admin') {
        removeAuthToken();
        router.push('/admin/login');
        return;
      }

      // Validate the token with the server
      const isValid = await validateToken();
      
      if (!isValid) {
        // Token is invalid, clean up and redirect to login
        removeAuthToken();
        router.push('/admin/login');
        return;
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    const { logout } = await import('@/lib/auth');
    await logout();
    router.push('/');
  };
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8 animate-slideDown">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => router.push("/")}
                title="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold tracking-tight">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Configure, monitor und steuere deinen Valorant Bot
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Status Card */}
        <StatusCard />

        {/* Main Content */}
        <Tabs defaultValue="settings" className="space-y-4 mt-6 animate-fadeIn stagger-1">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="scrims" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Scrims
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <SettingsPanel />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserMappingsPanel />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-4">
            <ScheduleEditor />
          </TabsContent>

          <TabsContent value="scrims" className="space-y-4">
            <ScrimsPanel />
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <ActionsPanel />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityPanel />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <LogsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
