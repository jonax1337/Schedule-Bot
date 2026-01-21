'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Trash2, Edit, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface Absence {
  id: string;
  discordId: string;
  username: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

interface AbsenceManagerProps {
  discordId: string;
  username: string;
}

export function AbsenceManager({ discordId, username }: AbsenceManagerProps) {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<Absence | null>(null);

  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    loadAbsences();
  }, [discordId]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BOT_API_URL}/api/absences/user/${discordId}`);
      if (response.ok) {
        const data = await response.json();
        setAbsences(data.absences || []);
      } else {
        toast.error('Failed to load absences');
      }
    } catch (error) {
      console.error('Failed to load absences:', error);
      toast.error('Failed to load absences');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (dateStr: string): string => {
    const parts = dateStr.split('.');
    if (parts.length !== 3) return '';
    const [day, month, year] = parts;
    return `${year}-${month}-${day}`;
  };

  const formatDateForAPI = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts;
    return `${day}.${month}.${year}`;
  };

  const handleAdd = async () => {
    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/absences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          discordId,
          username,
          startDate: formatDateForAPI(formData.startDate),
          endDate: formatDateForAPI(formData.endDate),
          reason: formData.reason,
        }),
      });

      if (response.ok) {
        toast.success('Absence added successfully!');
        setIsAddDialogOpen(false);
        setFormData({ startDate: '', endDate: '', reason: '' });
        loadAbsences();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add absence');
      }
    } catch (error) {
      console.error('Failed to add absence:', error);
      toast.error('Failed to add absence');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingAbsence) return;

    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select start and end dates');
      return;
    }

    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (endDate < startDate) {
      toast.error('End date must be after start date');
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/absences/${editingAbsence.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          startDate: formatDateForAPI(formData.startDate),
          endDate: formatDateForAPI(formData.endDate),
          reason: formData.reason,
        }),
      });

      if (response.ok) {
        toast.success('Absence updated successfully!');
        setIsEditDialogOpen(false);
        setEditingAbsence(null);
        setFormData({ startDate: '', endDate: '', reason: '' });
        loadAbsences();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update absence');
      }
    } catch (error) {
      console.error('Failed to update absence:', error);
      toast.error('Failed to update absence');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this absence?')) {
      return;
    }

    setSaving(true);
    try {
      const { getAuthHeaders } = await import('@/lib/auth');

      const response = await fetch(`${BOT_API_URL}/api/absences/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success('Absence deleted successfully!');
        loadAbsences();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete absence');
      }
    } catch (error) {
      console.error('Failed to delete absence:', error);
      toast.error('Failed to delete absence');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (absence: Absence) => {
    setEditingAbsence(absence);
    setFormData({
      startDate: formatDateForInput(absence.startDate),
      endDate: formatDateForInput(absence.endDate),
      reason: absence.reason,
    });
    setIsEditDialogOpen(true);
  };

  const formatDisplayDate = (dateStr: string): string => {
    const parts = dateStr.split('.');
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const isAbsenceActive = (absence: Absence): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startParts = absence.startDate.split('.');
    const endParts = absence.endDate.split('.');
    
    const startDate = new Date(parseInt(startParts[2]), parseInt(startParts[1]) - 1, parseInt(startParts[0]));
    const endDate = new Date(parseInt(endParts[2]), parseInt(endParts[1]) - 1, parseInt(endParts[0]));
    
    return today >= startDate && today <= endDate;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Absence Planning
            </CardTitle>
            <CardDescription>
              Plan your absences in advance. The system will automatically mark you as unavailable (x) during these periods.
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Absence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Absence</DialogTitle>
                <DialogDescription>
                  Schedule a period when you will be unavailable
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Vacation, Business trip, etc."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    disabled={saving}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Add Absence
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {absences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No absences planned</p>
            <p className="text-sm mt-1">Click "Add Absence" to schedule time off</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {absences.map((absence) => {
                  const isActive = isAbsenceActive(absence);
                  return (
                    <TableRow key={absence.id} className={isActive ? 'bg-orange-50 dark:bg-orange-950/20' : ''}>
                      <TableCell>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 text-sm font-medium">
                            <AlertCircle className="h-4 w-4" />
                            Active
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Scheduled</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatDisplayDate(absence.startDate)}</TableCell>
                      <TableCell className="font-medium">{formatDisplayDate(absence.endDate)}</TableCell>
                      <TableCell className="max-w-xs truncate">{absence.reason || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(absence)}
                            disabled={saving}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(absence.id)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Absence</DialogTitle>
              <DialogDescription>
                Update your absence details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-date">End Date</Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reason">Reason (Optional)</Label>
                <Textarea
                  id="edit-reason"
                  placeholder="e.g., Vacation, Business trip, etc."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  disabled={saving}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
