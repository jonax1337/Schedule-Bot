

import { useState, useEffect } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Field, FieldContent, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Settings as SettingsType } from "@/lib/types";
import { Loader2, Save, Hash, AtSign } from "lucide-react";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stagger, microInteractions, loadingStates } from '@/lib/animations';
import { isAuthenticated, getAuthHeaders } from '@/lib/auth';

interface DiscordChannel {
  id: string;
  name: string;
}

interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDiscord, setLoadingDiscord] = useState(true);
  useEffect(() => {
    loadSettings();
    loadDiscordData();
  }, []);

  const loadSettings = async () => {
    try {
      const { BOT_API_URL } = await import('@/lib/config');
      const response = await fetch(`${BOT_API_URL}/api/settings`, { headers: getAuthHeaders() });
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


      // Only load Discord data if authenticated
      if (!isAuthenticated()) {
        console.log('Not authenticated, skipping Discord data load');
        return;
      }

      const { BOT_API_URL } = await import('@/lib/config');
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
      const { BOT_API_URL } = await import('@/lib/config');


      const response = await fetch(`${BOT_API_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const msg = data.details?.map((d: { field: string; message: string }) => d.message).join(', ') || data.error || 'Save failed';
        toast.error(msg);
        return;
      }

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
      <SectionCard
        className={stagger(0, 'slow', 'slideUpScale')}
        title="Discord Configuration"
        description="Configure Discord channel and role settings"
        contentClassName="space-y-4"
      >
          <Field>
            <FieldLabel htmlFor="channelId">
              <Hash className="inline h-4 w-4 mr-1" />
              Channel
            </FieldLabel>
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
            <FieldDescription>
              The Discord channel where schedule posts will be sent
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="pingRoleId">
              <AtSign className="inline h-4 w-4 mr-1" />
              Ping Role (Optional)
            </FieldLabel>
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
            <FieldDescription>
              Role to mention in schedule posts (leave empty for no ping)
            </FieldDescription>
          </Field>

          <Field orientation="horizontal" className="pt-2">
            <FieldContent>
              <FieldLabel htmlFor="allowDiscordAuth">Allow Discord Authentication</FieldLabel>
              <FieldDescription>
                Let users with Discord mappings sign in via Discord OAuth
              </FieldDescription>
            </FieldContent>
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
          </Field>
      </SectionCard>

      <SectionCard
        className={stagger(1, 'slow', 'slideUpScale')}
        title="Scheduling Configuration"
        description="Configure automated posting and reminder times"
        contentClassName="space-y-4"
      >
          <Field>
            <FieldLabel htmlFor="dailyPostTime">Daily Post Time</FieldLabel>
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
            <FieldDescription>
              Time when the daily schedule post is sent (24-hour format)
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="reminderHours">Reminder Hours Before Post</FieldLabel>
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
            <FieldDescription>
              How many hours before the daily post to send reminders
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="duplicateReminder">Duplicate Reminder</FieldLabel>
              <FieldDescription>
                Send a second reminder to players who still haven&apos;t set their availability
              </FieldDescription>
            </FieldContent>
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
          </Field>

          {settings.scheduling.duplicateReminderEnabled && (
            <Field className="pl-4 border-l-2 border-muted">
              <FieldLabel htmlFor="duplicateReminderHours">Second Reminder Hours Before Post</FieldLabel>
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
              <FieldDescription>
                How many hours before the daily post to send the second reminder (should be less than the first reminder)
              </FieldDescription>
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
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
            <FieldDescription>
              Timezone for all scheduled tasks
            </FieldDescription>
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="trainingPoll">Training Start Poll</FieldLabel>
              <FieldDescription>
                Automatically create polls asking when to start training
              </FieldDescription>
            </FieldContent>
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
          </Field>

          {settings.scheduling.trainingStartPollEnabled && (
            <Field className="pl-4 border-l-2 border-muted">
              <FieldLabel htmlFor="pollDuration">Poll Duration (minutes)</FieldLabel>
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
              <FieldDescription>
                How long the training start poll should remain open (1–10080 minutes)
              </FieldDescription>
            </Field>
          )}

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="cleanChannel">Clean Channel Before Post</FieldLabel>
              <FieldDescription>
                Delete all messages in the channel before posting the daily schedule (keeps pinned messages)
              </FieldDescription>
            </FieldContent>
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
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="changeNotifications">Change Notifications</FieldLabel>
              <FieldDescription>
                Send notifications when roster improvements are detected (e.g. additional players become available)
              </FieldDescription>
            </FieldContent>
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
          </Field>

          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="weeklyPing">Weekly Planning Reminder</FieldLabel>
              <FieldDescription>
                Send a personal DM with day-buttons on the selected weekdays so each player can plan their week. Sundays target the upcoming week, other days target the current week. The pinned weekly overview in the channel is maintained regardless of this toggle. On weekly-ping days the daily reminder is skipped so players don&apos;t receive duplicate DMs.
              </FieldDescription>
            </FieldContent>
            <Switch
              id="weeklyPing"
              checked={settings.scheduling.weeklyPingEnabled}
              onCheckedChange={(checked) =>
                setSettings({
                  ...settings,
                  scheduling: {
                    ...settings.scheduling,
                    weeklyPingEnabled: checked,
                  },
                })
              }
              className={microInteractions.smooth}
            />
          </Field>

          {settings.scheduling.weeklyPingEnabled && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <Field>
                <FieldLabel htmlFor="weeklyPingTime">Weekly Ping Time</FieldLabel>
                <Input
                  id="weeklyPingTime"
                  type="time"
                  value={settings.scheduling.weeklyPingTime}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      scheduling: { ...settings.scheduling, weeklyPingTime: e.target.value },
                    })
                  }
                  className={microInteractions.focusRing}
                />
                <FieldDescription>
                  Time of day when the planning DM is sent (24-hour format)
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Ping Days</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {([
                    { idx: 1, label: 'Mon' },
                    { idx: 2, label: 'Tue' },
                    { idx: 3, label: 'Wed' },
                    { idx: 4, label: 'Thu' },
                    { idx: 5, label: 'Fri' },
                    { idx: 6, label: 'Sat' },
                    { idx: 0, label: 'Sun' },
                  ] as const).map(({ idx, label }) => {
                    const active = settings.scheduling.weeklyPingDays.includes(idx);
                    return (
                      <Button
                        key={idx}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const days = settings.scheduling.weeklyPingDays;
                          const next = active ? days.filter(d => d !== idx) : [...days, idx].sort((a, b) => a - b);
                          setSettings({
                            ...settings,
                            scheduling: { ...settings.scheduling, weeklyPingDays: next },
                          });
                        }}
                        className={microInteractions.smooth}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
                <FieldDescription>
                  Days the planning DM is sent. Select none to disable the DM entirely.
                </FieldDescription>
              </Field>
            </div>
          )}
      </SectionCard>

      <SectionCard
        className={stagger(2, 'slow', 'slideUpScale')}
        title="Team"
        description="Your team's name, shown in match and VOD views"
        contentClassName="space-y-4"
      >
          {/* Team Name Field */}
          <Field>
            <FieldLabel htmlFor="teamName">Team Name</FieldLabel>
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
              placeholder="Our Team"
              className={microInteractions.focusRing}
            />
            <FieldDescription>
              Displayed in match results and VOD reviews (e.g. "{settings.branding?.teamName || 'Our Team'} vs Opponent")
            </FieldDescription>
          </Field>

          {/* Team Logo Field */}
          <Field>
            <FieldLabel htmlFor="logoUrl">Team Logo URL</FieldLabel>
            <Input
              id="logoUrl"
              type="url"
              maxLength={500}
              value={settings.branding?.logoUrl || ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  branding: { ...settings.branding, logoUrl: e.target.value },
                })
              }
              placeholder="https://…/logo.png"
              className={microInteractions.focusRing}
            />
            <FieldDescription>
              Shown in the team switcher at the top of the sidebar. Leave empty to use the team's initial.
            </FieldDescription>
          </Field>
      </SectionCard>

      <SectionCard
        className={stagger(3, 'slow', 'slideUpScale')}
        title="Stratbook"
        description="Configure who can create and edit strategies"
        contentClassName="space-y-4"
      >
          <Field>
            <FieldLabel htmlFor="editPermission">Edit Permission</FieldLabel>
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
            <FieldDescription>
              Controls who can create, edit, and delete strategies in the Stratbook
            </FieldDescription>
          </Field>
      </SectionCard>

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
