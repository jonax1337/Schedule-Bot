

import { useState, useEffect } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Bell, Send, Vote, Calendar, Loader2, MessageSquare, ChevronsUpDown, Check, Trash2, Timer } from "lucide-react";
import { toast } from "sonner";
import { stagger, microInteractions } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { BOT_API_URL } from "@/lib/config";
import { getAuthHeaders } from '@/lib/auth';
import type { DiscordMember } from "@/lib/types";

export function Actions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [includePinned, setIncludePinned] = useState(false);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [pollDuration, setPollDuration] = useState("60");

  // Reminder state
  const [reminderDate, setReminderDate] = useState("");

  // Schedule post state
  const [scheduleDate, setScheduleDate] = useState("");

  // Notify state
  const [notifyType, setNotifyType] = useState("info");
  const [notifyTarget, setNotifyTarget] = useState("all");
  const [notifySpecificUser, setNotifySpecificUser] = useState("");
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [userOpen, setUserOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Training poll state
  const [trainingPollDate, setTrainingPollDate] = useState("");

  // Pin message state
  const [pinMessage, setPinMessage] = useState("");

  const filteredMembers = userSearch
    ? members.filter(m =>
        m.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
        m.username.toLowerCase().includes(userSearch.toLowerCase())
      )
    : members;

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {

      const response = await fetch(`${BOT_API_URL}/api/discord/members`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setMembers(data.members);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleAction = async (action: string, endpoint: string, body: any) => {
    setLoading(action);
    try {

      const response = await fetch(`${BOT_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Action completed successfully');
      } else {
        toast.error(data.error || 'Failed to perform action');
      }
    } catch (error) {
      toast.error('Failed to communicate with bot');
    } finally {
      setLoading(null);
    }
  };

  const sendReminders = () => {
    handleAction('remind', '/api/actions/remind', { date: reminderDate || undefined });
  };

  const createPoll = () => {
    const options = pollOptions.split(',').map(opt => opt.trim()).filter(Boolean);
    if (!pollQuestion || options.length < 2) {
      toast.error('Please provide a question and at least 2 options');
      return;
    }
    handleAction('poll', '/api/actions/poll', {
      question: pollQuestion,
      options,
      duration: parseInt(pollDuration),
    });
  };

  const postSchedule = () => {
    handleAction('schedule', '/api/actions/schedule', { date: scheduleDate || undefined });
  };

  const sendNotification = () => {
    if (!notifyTitle || !notifyMessage) {
      toast.error('Please provide both title and message');
      return;
    }
    handleAction('notify', '/api/actions/notify', {
      type: notifyType,
      target: notifyTarget,
      specificUserId: notifySpecificUser || 'none',
      title: notifyTitle,
      message: notifyMessage,
    });
  };

  const clearChannel = () => {
    handleAction('clear', '/api/actions/clear-channel', { includePinned });
    setClearDialogOpen(false);
    setIncludePinned(false);
  };

  const sendTrainingPoll = () => {
    handleAction('training-poll', '/api/actions/training-poll', { date: trainingPollDate || undefined });
  };

  const sendPinMessage = () => {
    if (!pinMessage.trim()) {
      toast.error('Please provide a message to pin');
      return;
    }
    handleAction('pin', '/api/actions/pin-message', { message: pinMessage });
    setPinMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          className={stagger(0, 'fast', 'slideUpScale')}
          icon={Calendar}
          title="Post Schedule"
          description="Manually post the schedule for a specific date"
          contentClassName="space-y-4"
        >
            <Field>
              <FieldLabel htmlFor="scheduleDate">Date (Optional)</FieldLabel>
              <Input
                id="scheduleDate"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                placeholder="Leave empty for today"
                className={microInteractions.focusRing}
              />
              <FieldDescription>
                Leave empty to post today's schedule
              </FieldDescription>
            </Field>
            <Button
              onClick={postSchedule}
              disabled={loading === 'schedule'}
              className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
            >
              {loading === 'schedule' ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-1 h-4 w-4" />
                  Post Schedule
                </>
              )}
            </Button>
        </SectionCard>

        <SectionCard
          className={stagger(1, 'fast', 'slideUpScale')}
          icon={Bell}
          title="Send Reminders"
          description="Send reminders to users who haven't set their availability"
          contentClassName="space-y-4"
        >
            <Field>
              <FieldLabel htmlFor="reminderDate">Date (Optional)</FieldLabel>
              <Input
                id="reminderDate"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                placeholder="Leave empty for today"
                className={microInteractions.focusRing}
              />
              <FieldDescription>
                Leave empty to send reminders for today
              </FieldDescription>
            </Field>
            <Button
              onClick={sendReminders}
              disabled={loading === 'remind'}
              className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
            >
              {loading === 'remind' ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="mr-1 h-4 w-4" />
                  Send Reminders
                </>
              )}
            </Button>
        </SectionCard>
      </div>

      <SectionCard
        className={stagger(2, 'fast', 'slideUpScale')}
        icon={Timer}
        title="Training Start Poll"
        description="Create a training start time poll based on today's availability"
        contentClassName="space-y-4"
      >
          <Field>
            <FieldLabel htmlFor="trainingPollDate">Date (Optional)</FieldLabel>
            <Input
              id="trainingPollDate"
              type="date"
              value={trainingPollDate}
              onChange={(e) => setTrainingPollDate(e.target.value)}
              placeholder="Leave empty for today"
              className={microInteractions.focusRing}
            />
            <FieldDescription>
              Leave empty for today. Requires enough players available.
            </FieldDescription>
          </Field>
          <Button
            onClick={sendTrainingPoll}
            disabled={loading === 'training-poll'}
            className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
          >
            {loading === 'training-poll' ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Timer className="mr-1 h-4 w-4" />
                Send Training Poll
              </>
            )}
          </Button>
      </SectionCard>

      <SectionCard
        className={stagger(3, 'fast', 'slideUpScale')}
        icon={Vote}
        title="Create Poll"
        description="Create a quick poll for the team"
        contentClassName="space-y-4"
      >
          <Field>
            <FieldLabel htmlFor="pollQuestion">Question</FieldLabel>
            <Input
              id="pollQuestion"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="What should we practice today?"
              className={microInteractions.focusRing}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="pollOptions">Options (comma-separated)</FieldLabel>
            <Textarea
              id="pollOptions"
              value={pollOptions}
              onChange={(e) => setPollOptions(e.target.value)}
              placeholder="Aim training, Team tactics, Map practice"
              rows={3}
              className={microInteractions.focusRing}
            />
            <FieldDescription>
              Separate options with commas (max 10 options)
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="pollDuration">Duration (minutes)</FieldLabel>
            <Input
              id="pollDuration"
              type="number"
              min={1}
              max={10080}
              value={pollDuration}
              onChange={(e) => setPollDuration(e.target.value)}
              className="w-full"
            />
            <FieldDescription>
              How long the poll should remain open (1–10080 minutes)
            </FieldDescription>
          </Field>

          <Button
            onClick={createPoll}
            disabled={loading === 'poll'}
            className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
          >
            {loading === 'poll' ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Vote className="mr-1 h-4 w-4" />
                Create Poll
              </>
            )}
          </Button>
      </SectionCard>

      <SectionCard
        className={stagger(4, 'fast', 'slideUpScale')}
        icon={MessageSquare}
        title="Send Notification"
        description="Send a notification to team members"
        contentClassName="space-y-4"
      >
          <Field>
            <FieldLabel htmlFor="notifyType">Type</FieldLabel>
            <Select value={notifyType} onValueChange={setNotifyType}>
              <SelectTrigger id="notifyType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="info">📢 Info</SelectItem>
                <SelectItem value="success">✅ Success</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="error">❌ Error</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="notifyTarget">Target</FieldLabel>
            <Select value={notifyTarget} onValueChange={setNotifyTarget}>
              <SelectTrigger id="notifyTarget" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="main">Main Roster Only</SelectItem>
                <SelectItem value="sub">Subs Only</SelectItem>
                <SelectItem value="coach">Coaches Only</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="notifyUser">Specific User (Optional)</FieldLabel>
            <Popover open={userOpen} onOpenChange={setUserOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="notifyUser"
                  variant="outline"
                  role="combobox"
                  aria-expanded={userOpen}
                  className={cn("w-full justify-between font-normal", microInteractions.smooth)}
                >
                  {notifySpecificUser
                    ? members.find(m => m.id === notifySpecificUser)?.displayName
                    : "Select user (overrides target)"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search users..."
                    value={userSearch}
                    onValueChange={setUserSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value=""
                        onSelect={() => {
                          setNotifySpecificUser("");
                          setUserOpen(false);
                          setUserSearch("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-1 h-4 w-4",
                            !notifySpecificUser ? "opacity-100" : "opacity-0"
                          )}
                        />
                        None (use target instead)
                      </CommandItem>
                      {filteredMembers.map((member) => (
                        <CommandItem
                          key={member.id}
                          value={member.id}
                          onSelect={() => {
                            setNotifySpecificUser(member.id);
                            setUserOpen(false);
                            setUserSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-1 h-4 w-4",
                              notifySpecificUser === member.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {member.displayName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FieldDescription>
              If set, only this user will receive the notification
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="notifyTitle">Title</FieldLabel>
            <Input
              id="notifyTitle"
              value={notifyTitle}
              onChange={(e) => setNotifyTitle(e.target.value)}
              placeholder="Team Announcement"
              maxLength={100}
              className={microInteractions.focusRing}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="notifyMessage">Message</FieldLabel>
            <Textarea
              id="notifyMessage"
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              placeholder="Your message here..."
              rows={4}
              maxLength={1000}
              className={microInteractions.focusRing}
            />
            <FieldDescription>
              {notifyMessage.length}/1000 characters
            </FieldDescription>
          </Field>

          <Button
            onClick={sendNotification}
            disabled={loading === 'notify'}
            className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
          >
            {loading === 'notify' ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageSquare className="mr-1 h-4 w-4" />
                Send Notification
              </>
            )}
          </Button>
      </SectionCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard
          className={stagger(5, 'fast', 'slideUpScale')}
          icon={MessageSquare}
          title="Pin Message"
          description="Send a message to the schedule channel and pin it (e.g., Dashboard URLs)"
          contentClassName="space-y-4"
        >
            <Field>
              <FieldLabel htmlFor="pinMessage">Message</FieldLabel>
              <Textarea
                id="pinMessage"
                value={pinMessage}
                onChange={(e) => setPinMessage(e.target.value)}
                placeholder="Dashboard: https://your-dashboard.com"
                rows={5}
                maxLength={2000}
                className={microInteractions.focusRing}
              />
              <FieldDescription>
                {pinMessage.length}/2000 characters
              </FieldDescription>
            </Field>
            <Button
              onClick={sendPinMessage}
              disabled={loading === 'pin'}
              className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
            >
              {loading === 'pin' ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-1 h-4 w-4" />
                  Send & Pin Message
                </>
              )}
            </Button>
        </SectionCard>

        <SectionCard
          className={stagger(6, 'fast', 'slideUpScale')}
          icon={Trash2}
          title="Clear Channel"
          description="Delete all messages in the schedule channel (keeps pinned messages)"
          contentClassName="space-y-4"
        >
            <div className="flex items-center space-x-2">
              <Switch
                id="includePinned"
                checked={includePinned}
                onCheckedChange={setIncludePinned}
              />
              <Label htmlFor="includePinned" className="cursor-pointer">
                Also delete pinned messages
              </Label>
            </div>
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={loading === 'clear'}
                  className={cn("w-full", microInteractions.activePress, microInteractions.smooth)}
                >
                  {loading === 'clear' ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1 h-4 w-4" />
                      Clear Channel
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all messages in the schedule channel{includePinned ? ' including pinned messages' : ' except pinned messages'}. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearChannel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear Channel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-sm text-muted-foreground">
              ⚠️ This will permanently delete all {includePinned ? 'messages (including pinned)' : 'non-pinned messages'}
            </p>
        </SectionCard>
      </div>
    </div>
  );
}
