"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings } from "@/lib/types";
import { Loader2, Save, Hash, AtSign, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface DiscordChannel {
  id: string;
  name: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDiscord, setLoadingDiscord] = useState(true);
  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");

  // Get all available timezones
  const allTimezones = Intl.supportedValuesOf('timeZone');
  const filteredTimezones = timezoneSearch
    ? allTimezones.filter(tz => tz.toLowerCase().includes(timezoneSearch.toLowerCase()))
    : allTimezones;

  useEffect(() => {
    loadSettings();
    loadDiscordData();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to load settings:', errorData);
        throw new Error(errorData.error || 'Failed to load settings');
      }
      
      const data = await response.json();
      console.log('Settings loaded:', data);
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadDiscordData = async () => {
    try {
      const [channelsRes, rolesRes] = await Promise.all([
        fetch('/api/discord/channels'),
        fetch('/api/discord/roles'),
      ]);

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setChannels(channelsData);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }
    } catch (error) {
      console.error('Failed to load Discord data:', error);
      toast.error('Failed to load Discord channels/roles');
    } finally {
      setLoadingDiscord(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      toast.success('Settings saved and applied successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!settings) {
    return <div>Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Discord Configuration</CardTitle>
          <CardDescription>
            Configure Discord channel and role settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channelId">
              <Hash className="inline h-4 w-4 mr-1" />
              Channel
            </Label>
            {loadingDiscord ? (
              <div className="flex items-center h-10 px-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading channels...</span>
              </div>
            ) : (
              <Select
                value={settings.discord.channelId}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    discord: { ...settings.discord, channelId: value },
                  })
                }
              >
                <SelectTrigger id="channelId" className="w-full">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-sm text-muted-foreground">
              The Discord channel where schedule posts will be sent
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pingRoleId">
              <AtSign className="inline h-4 w-4 mr-1" />
              Ping Role (Optional)
            </Label>
            {loadingDiscord ? (
              <div className="flex items-center h-10 px-3 border rounded-md">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading roles...</span>
              </div>
            ) : (
              <Select
                value={settings.discord.pingRoleId || "none"}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    discord: { ...settings.discord, pingRoleId: value === "none" ? null : value },
                  })
                }
              >
                <SelectTrigger id="pingRoleId" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="none">No role</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: role.color }}
                        />
                        @{role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-sm text-muted-foreground">
              Role to mention in schedule posts (leave empty for no ping)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling Configuration</CardTitle>
          <CardDescription>
            Configure automated posting and reminder times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dailyPostTime">Daily Post Time</Label>
            <Input
              id="dailyPostTime"
              type="time"
              value={settings.scheduling.dailyPostTime}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  scheduling: { ...settings.scheduling, dailyPostTime: e.target.value },
                })
              }
            />
            <p className="text-sm text-muted-foreground">
              Time when the daily schedule post is sent (24-hour format)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminderHours">Reminder Hours Before Post</Label>
            <Select
              value={settings.scheduling.reminderHoursBefore.toString()}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  scheduling: {
                    ...settings.scheduling,
                    reminderHoursBefore: parseInt(value),
                  },
                })
              }
            >
              <SelectTrigger id="reminderHours" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="1">1 hour before</SelectItem>
                <SelectItem value="2">2 hours before</SelectItem>
                <SelectItem value="3">3 hours before</SelectItem>
                <SelectItem value="4">4 hours before</SelectItem>
                <SelectItem value="6">6 hours before</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How many hours before the daily post to send reminders
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="timezone"
                  variant="outline"
                  role="combobox"
                  aria-expanded={timezoneOpen}
                  className="w-full justify-between font-normal"
                >
                  {settings.scheduling.timezone}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search timezone..." 
                    value={timezoneSearch}
                    onValueChange={setTimezoneSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No timezone found.</CommandEmpty>
                    <CommandGroup>
                      {filteredTimezones.map((timezone) => (
                        <CommandItem
                          key={timezone}
                          value={timezone}
                          onSelect={() => {
                            setSettings({
                              ...settings,
                              scheduling: { ...settings.scheduling, timezone },
                            });
                            setTimezoneOpen(false);
                            setTimezoneSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-1 h-4 w-4",
                              settings.scheduling.timezone === timezone ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {timezone}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-sm text-muted-foreground">
              Timezone for all scheduled tasks
            </p>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="trainingPoll">Training Start Poll</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create polls asking when to start training
              </p>
            </div>
            <Switch
              id="trainingPoll"
              checked={settings.scheduling.trainingStartPollEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  scheduling: {
                    ...settings.scheduling,
                    trainingStartPollEnabled: checked,
                  },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
