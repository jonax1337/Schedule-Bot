import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SettingsPanel from "@/components/settings-panel";
import ActionsPanel from "@/components/actions-panel";
import LogsPanel from "@/components/logs-panel";
import { UserMappingsPanel } from "@/components/user-mappings-panel";
import { ScheduleEditor } from "@/components/schedule-editor";
import StatusCard from "@/components/status-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Settings, Zap, Terminal, Users, CalendarDays } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                Valorant Schedule Bot
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage your Discord bot settings and execute actions
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Status Card */}
        <StatusCard />

        {/* Main Content */}
        <Tabs defaultValue="settings" className="space-y-4 mt-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[1000px]">
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
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Actions
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

          <TabsContent value="actions" className="space-y-4">
            <ActionsPanel />
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <LogsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
