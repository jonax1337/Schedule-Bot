"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Hash, AtSign } from "lucide-react";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stagger, microInteractions, loadingStates } from '@/lib/animations';
import { useSettings, useDiscordChannels, useDiscordRoles } from '@/hooks';

export function Settings() {
  const { settings, loading, setSettings, saveSettings } = useSettings();
  const { channels, loading: loadingChannels } = useDiscordChannels();
  const { roles, loading: loadingRoles } = useDiscordRoles();
  const [saving, setSaving] = useState(false);

  const loadingDiscord = loadingChannels || loadingRoles;

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const success = await saveSettings(settings);

      if (success) {
        toast.success('Settings saved and applied successfully!');
      } else {
        toast.error('Failed to save settings');
      }
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
            <TimezonePicker
              value={settings.scheduling.timezone}
              onChange={(tz) =>
                setSettings({
                  ...settings,
                  scheduling: { ...settings.scheduling, timezone: tz },
                })
              }
              className="w-full"
            />
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
              <Label htmlFor="pollDuration">Poll Duration (minutes)</Label>
              <Input
                id="pollDuration"
                type="number"
                min={1}
                max={10080}
                value={settings.scheduling.pollDurationMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    scheduling: {
                      ...settings.scheduling,
                      pollDurationMinutes: parseInt(e.target.value) || 60,
                    },
                  })
                }
                className={cn("w-full", microInteractions.focusRing)}
              />
              <p className="text-sm text-muted-foreground">
                How long the training start poll should remain open (1–10080 minutes)
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

      <Card className={stagger(3, 'slow', 'slideUpScale')}>
        <CardHeader>
          <CardTitle>Stratbook</CardTitle>
          <CardDescription>
            Configure who can create and edit strategies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editPermission">Edit Permission</Label>
            <Select
              value={settings.stratbook?.editPermission || 'admin'}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  stratbook: { ...settings.stratbook, editPermission: value as 'admin' | 'all' },
                })
              }
            >
              <SelectTrigger id="editPermission" className={cn("w-full", microInteractions.focusRing)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="admin">Only Admins</SelectItem>
                <SelectItem value="all">All Users</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Controls who can create, edit, and delete strategies in the Stratbook
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
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
