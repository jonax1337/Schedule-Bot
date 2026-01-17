"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, Vote, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ActionsPanel() {
  const [loading, setLoading] = useState<string | null>(null);

  // Poll state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("");
  const [pollDuration, setPollDuration] = useState("1");

  // Reminder state
  const [reminderDate, setReminderDate] = useState("");

  // Schedule post state
  const [scheduleDate, setScheduleDate] = useState("");

  const handleAction = async (action: string, endpoint: string, body: any) => {
    setLoading(action);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Post Schedule
            </CardTitle>
            <CardDescription>
              Manually post the schedule for a specific date
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleDate">Date (Optional)</Label>
              <Input
                id="scheduleDate"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                placeholder="Leave empty for today"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to post today's schedule
              </p>
            </div>
            <Button 
              onClick={postSchedule} 
              disabled={loading === 'schedule'}
              className="w-full"
            >
              {loading === 'schedule' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Post Schedule
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Send Reminders
            </CardTitle>
            <CardDescription>
              Send reminders to users who haven't set their availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reminderDate">Date (Optional)</Label>
              <Input
                id="reminderDate"
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                placeholder="Leave empty for today"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to send reminders for today
              </p>
            </div>
            <Button 
              onClick={sendReminders} 
              disabled={loading === 'remind'}
              className="w-full"
            >
              {loading === 'remind' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Send Reminders
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Vote className="mr-2 h-5 w-5" />
            Create Poll
          </CardTitle>
          <CardDescription>
            Create a quick poll for the team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pollQuestion">Question</Label>
            <Input
              id="pollQuestion"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="What should we practice today?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pollOptions">Options (comma-separated)</Label>
            <Textarea
              id="pollOptions"
              value={pollOptions}
              onChange={(e) => setPollOptions(e.target.value)}
              placeholder="Aim training, Team tactics, Map practice"
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Separate options with commas (max 10 options)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pollDuration">Duration</Label>
            <Select value={pollDuration} onValueChange={setPollDuration}>
              <SelectTrigger id="pollDuration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="1">1 hour</SelectItem>
                <SelectItem value="2">2 hours</SelectItem>
                <SelectItem value="4">4 hours</SelectItem>
                <SelectItem value="8">8 hours</SelectItem>
                <SelectItem value="24">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={createPoll} 
            disabled={loading === 'poll'}
            className="w-full"
          >
            {loading === 'poll' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Vote className="mr-2 h-4 w-4" />
                Create Poll
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
