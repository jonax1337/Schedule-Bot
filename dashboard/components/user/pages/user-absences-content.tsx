'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, PlaneTakeoff } from 'lucide-react';
import { toast } from 'sonner';
import { stagger, microInteractions, cn } from '@/lib/animations';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface Absence {
  id: number;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
}

function formatDateFromInput(isoDate: string): string {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
}

function getWeekdayName(dateStr: string): string {
  const [day, month, year] = dateStr.split('.');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return weekdays[date.getDay()];
}

function isAbsenceActive(absence: Absence): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [endDay, endMonth, endYear] = absence.endDate.split('.');
  const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay));
  return endDate >= today;
}

function isAbsenceCurrent(absence: Absence): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [startDay, startMonth, startYear] = absence.startDate.split('.');
  const [endDay, endMonth, endYear] = absence.endDate.split('.');
  const startDate = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay));
  const endDate = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay));
  return today >= startDate && today <= endDate;
}

export function UserAbsencesContent() {
  const router = useRouter();
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userDiscordId, setUserDiscordId] = useState('');

  // Form state
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newReason, setNewReason] = useState('');

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const savedUser = localStorage.getItem('selectedUser');
        if (!savedUser) {
          router.replace('/login');
          return;
        }

        // Look up the user mapping to get discordId (same pattern as availability page)
        const mappingsRes = await fetch(`${BOT_API_URL}/api/user-mappings`);
        if (!mappingsRes.ok) {
          toast.error('Failed to load user mappings');
          setLoading(false);
          return;
        }

        const mappingsData = await mappingsRes.json();
        const userMapping = (mappingsData.mappings || []).find((m: any) => m.displayName === savedUser);

        if (!userMapping) {
          toast.error('User mapping not found');
          setLoading(false);
          return;
        }

        setUserDiscordId(userMapping.discordId);
        await loadAbsences(userMapping.discordId);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuthAndLoad();
  }, [router]);

  const loadAbsences = async (discordId?: string) => {
    const userId = discordId || userDiscordId;
    if (!userId) return;

    setLoading(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/absences?userId=${userId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        toast.error('Failed to load absences');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setAbsences(data.absences || []);
    } catch (error) {
      console.error('Failed to load absences:', error);
      toast.error('Failed to load absences');
    } finally {
      setLoading(false);
    }
  };

  const createAbsence = async () => {
    if (!newStartDate || !newEndDate) {
      toast.error('Please select start and end date');
      return;
    }

    const startDate = formatDateFromInput(newStartDate);
    const endDate = formatDateFromInput(newEndDate);

    if (newEndDate < newStartDate) {
      toast.error('End date must be after start date');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/absences`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: userDiscordId,
          startDate,
          endDate,
          reason: newReason,
        }),
      });

      if (response.ok) {
        toast.success('Absence created');
        setNewStartDate('');
        setNewEndDate('');
        setNewReason('');
        setDialogOpen(false);
        await loadAbsences();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create absence');
      }
    } catch (error) {
      console.error('Failed to create absence:', error);
      toast.error('Failed to create absence');
    } finally {
      setSaving(false);
    }
  };

  const deleteAbsenceHandler = async (id: number) => {
    setDeleting(id);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');
      const response = await fetch(`${BOT_API_URL}/api/absences/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success('Absence deleted');
        await loadAbsences();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete absence');
      }
    } catch (error) {
      console.error('Failed to delete absence:', error);
      toast.error('Failed to delete absence');
    } finally {
      setDeleting(null);
    }
  };

  const openNewAbsenceDialog = () => {
    setNewStartDate('');
    setNewEndDate('');
    setNewReason('');
    setDialogOpen(true);
  };

  // Set minimum date to today for the date inputs
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const activeAbsences = absences.filter(isAbsenceActive);
  const pastAbsences = absences.filter(a => !isAbsenceActive(a));

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-scaleIn">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className={stagger(0, 'slow', 'slideUpScale')}>
        <CardContent>
          {/* Action bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {activeAbsences.length > 0
                ? `${activeAbsences.length} active/upcoming absence${activeAbsences.length !== 1 ? 's' : ''}`
                : 'No active absences'}
            </p>
            <Button
              size="sm"
              onClick={openNewAbsenceDialog}
              className={microInteractions.activePress}
            >
              <Plus className="w-4 h-4 mr-1" />
              New Absence
            </Button>
          </div>

          {/* Absences Table */}
          {absences.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAbsences.map((absence, index) => {
                  const isCurrent = isAbsenceCurrent(absence);
                  return (
                    <TableRow
                      key={absence.id}
                      className={cn(
                        stagger(index, 'fast', 'fadeIn'),
                        isCurrent && 'bg-purple-500/5'
                      )}
                    >
                      <TableCell className="font-medium">
                        {absence.startDate}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({getWeekdayName(absence.startDate)})
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {absence.endDate}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({getWeekdayName(absence.endDate)})
                        </span>
                      </TableCell>
                      <TableCell>
                        {absence.reason || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {isCurrent ? (
                          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30">
                            Absent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Upcoming
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteAbsenceHandler(absence.id)}
                          disabled={deleting === absence.id}
                          className={cn("text-destructive hover:text-destructive", microInteractions.activePress)}
                        >
                          {deleting === absence.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pastAbsences.map((absence, index) => (
                  <TableRow
                    key={absence.id}
                    className={cn("opacity-40", stagger(activeAbsences.length + index, 'fast', 'fadeIn'))}
                  >
                    <TableCell className="text-muted-foreground">{absence.startDate}</TableCell>
                    <TableCell className="text-muted-foreground">{absence.endDate}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {absence.reason || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-muted-foreground opacity-60">
                        Past
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAbsenceHandler(absence.id)}
                        disabled={deleting === absence.id}
                        className={cn("text-destructive hover:text-destructive", microInteractions.activePress)}
                      >
                        {deleting === absence.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center">
              <PlaneTakeoff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No absences registered</p>
              <p className="text-xs text-muted-foreground mt-1">Add an absence to automatically mark yourself as unavailable</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Absence Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlaneTakeoff className="w-4 h-4" />
              New Absence
            </DialogTitle>
            <DialogDescription>
              Add an absence period to automatically mark yourself as unavailable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Start Date</label>
                <Input
                  type="date"
                  value={newStartDate}
                  min={minDate}
                  onChange={(e) => {
                    setNewStartDate(e.target.value);
                    if (newEndDate && e.target.value > newEndDate) {
                      setNewEndDate(e.target.value);
                    }
                  }}
                  className={microInteractions.focusRing}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">End Date</label>
                <Input
                  type="date"
                  value={newEndDate}
                  min={newStartDate || minDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className={microInteractions.focusRing}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Reason (optional)</label>
              <Input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="e.g. Vacation, Sick, Personal"
                maxLength={100}
                className={microInteractions.focusRing}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className={microInteractions.activePress}
              >
                Cancel
              </Button>
              <Button
                onClick={createAbsence}
                disabled={saving || !newStartDate || !newEndDate}
                className={microInteractions.activePress}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Add Absence
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
