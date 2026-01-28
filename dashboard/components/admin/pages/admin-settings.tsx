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
import { stagger, microInteractions, loadingStates } from '@/lib/animations';

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
      const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';
      const response = await fetch(`${BOT_API_URL}/api/settings`);
      const data = await response.json();

      // Validate settings structure (admin is now optional, comes from .env)
      if (!data || !data.discord || !data.scheduling || !data.branding) {
        console.error('Invalid settings structure:', data);
        toast.error('Settings missing required fields');
        return;
      }

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
      // Import auth helpers
      const { isAuthenticated, getAuthHeaders } = await import('@/lib/auth');

      // Only load Discord data if authenticated
      if (!isAuthenticated()) {
        console.log('Not authenticated, skipping Discord data load');
        return;
      }

      const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';
      const [channelsRes, rolesRes] = await Promise.all([
        fetch(`${BOT_API_URL}/api/discord/channels`, { headers: getAuthHeaders() }),
        fetch(`${BOT_API_URL}/api/discord/roles`, { headers: getAuthHeaders() }),
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
      const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';
      const { getAuthHeaders } = await import('@/lib/auth');

      await fetch(`${BOT_API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
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
    return null;
  }

  if (!settings) {
    return <div>Failed to load settings</div>;
  }

  return (
    <div className="space-y-6">
      <Card className={stagger(0, 'slow', 'slideUpScale')}>
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
              <div className={cn("flex items-center h-10 px-3 border rounded-md", loadingStates.skeleton)}>
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
                <SelectTrigger id="channelId" className={cn("w-full", microInteractions.focusRing)}>
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
              <div className={cn("flex items-center h-10 px-3 border rounded-md", loadingStates.skeleton)}>
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
                <SelectTrigger id="pingRoleId" className={cn("w-full", microInteractions.focusRing)}>
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

          <div className="flex items-center justify-between space-x-2 pt-2">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="allowDiscordAuth">Allow Discord Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Let users with Discord mappings sign in via Discord OAuth
              </p>
            </div>
            <Switch
              id="allowDiscordAuth"
              checked={settings.discord.allowDiscordAuth}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  discord: { ...settings.discord, allowDiscordAuth: checked },
                })
              }
              className={microInteractions.smooth}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={stagger(1, 'slow', 'slideUpScale')}>
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
              className={microInteractions.focusRing}
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
              <SelectTrigger id="reminderHours" className={cn("w-full", microInteractions.focusRing)}>
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

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="duplicateReminder">Duplicate Reminder</Label>
              <p className="text-sm text-muted-foreground">
                Send a second reminder to players who still haven&apos;t set their availability
              </p>
            </div>
            <Switch
              id="duplicateReminder"
              checked={settings.scheduling.duplicateReminderEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  scheduling: {
                    ...settings.scheduling,
                    duplicateReminderEnabled: checked,
                  },
                })
              }
              className={microInteractions.smooth}
            />
          </div>

          {settings.scheduling.duplicateReminderEnabled && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label htmlFor="duplicateReminderHours">Second Reminder Hours Before Post</Label>
              <Select
                value={settings.scheduling.duplicateReminderHoursBefore.toString()}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    scheduling: {
                      ...settings.scheduling,
                      duplicateReminderHoursBefore: parseInt(value),
                    },
                  })
                }
              >
                <SelectTrigger id="duplicateReminderHours" className={cn("w-full", microInteractions.focusRing)}>
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
                How many hours before the daily post to send the second reminder (should be less than the first reminder)
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="timezone"
                  variant="outline"
                  role="combobox"
                  aria-expanded={timezoneOpen}
                  className={cn("w-full justify-between font-normal", microInteractions.focusRing)}
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
              className={microInteractions.smooth}
            />
          </div>

          {settings.scheduling.trainingStartPollEnabled && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label htmlFor="pollDuration">Poll Duration</Label>
              <Select
                value={settings.scheduling.pollDurationMinutes.toString()}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    scheduling: {
                      ...settings.scheduling,
                      pollDurationMinutes: parseInt(value),
                    },
                  })
                }
              >
                <SelectTrigger id="pollDuration" className={cn("w-full", microInteractions.focusRing)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                  <SelectItem value="4320">3 days</SelectItem>
                  <SelectItem value="10080">1 week</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                How long the training start poll should remain open
              </p>
            </div>
          )}

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="cleanChannel">Clean Channel Before Post</Label>
              <p className="text-sm text-muted-foreground">
                Delete all messages in the channel before posting the daily schedule (keeps pinned messages)
              </p>
            </div>
            <Switch
              id="cleanChannel"
              checked={settings.scheduling.cleanChannelBeforePost}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  scheduling: {
                    ...settings.scheduling,
                    cleanChannelBeforePost: checked,
                  },
                })
              }
              className={microInteractions.smooth}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="changeNotifications">Change Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications when roster improvements are detected (e.g. additional players become available)
              </p>
            </div>
            <Switch
              id="changeNotifications"
              checked={settings.scheduling.changeNotificationsEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  scheduling: {
                    ...settings.scheduling,
                    changeNotificationsEnabled: checked,
                  },
                })
              }
              className={microInteractions.smooth}
            />
          </div>
        </CardContent>
      </Card>

      <Card className={stagger(2, 'slow', 'slideUpScale')}>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize your team's identity and visual appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Team Name Field */}
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              type="text"
              maxLength={50}
              value={settings.branding?.teamName || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  branding: { ...settings.branding, teamName: e.target.value },
                })
              }
              placeholder="Valorant Bot"
              className={microInteractions.focusRing}
            />
            <p className="text-sm text-muted-foreground">
              Your team's name displayed throughout the application
            </p>
          </div>

          {/* Tagline Field */}
          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline / Slogan</Label>
            <Input
              id="tagline"
              type="text"
              maxLength={100}
              value={settings.branding?.tagline || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  branding: { ...settings.branding, tagline: e.target.value },
                })
              }
              placeholder="Schedule Manager"
              className={microInteractions.focusRing}
            />
            <p className="text-sm text-muted-foreground">
              Subtitle displayed below team name (e.g., "Building champions together")
            </p>
          </div>

          {/* Logo URL Field */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Team Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={settings.branding?.logoUrl || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  branding: { ...settings.branding, logoUrl: e.target.value },
                })
              }
              placeholder="https://i.imgur.com/yourlogo.png"
              className={microInteractions.focusRing}
            />
            <p className="text-sm text-muted-foreground">
              External image URL for your team logo (displayed in sidebar header)
            </p>
            {/* Logo Preview */}
            {settings.branding?.logoUrl && (
              <div className="flex items-center gap-2 p-2 border rounded-md">
                <img
                  src={settings.branding.logoUrl}
                  alt="Logo preview"
                  className="w-8 h-8 object-contain rounded"
                  onError={(e) => {
                    e.currentTarget.src = '';
                    e.currentTarget.alt = 'Invalid image URL';
                  }}
                />
                <span className="text-xs text-muted-foreground">Logo preview</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className={cn(microInteractions.activePress, microInteractions.smooth)}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
