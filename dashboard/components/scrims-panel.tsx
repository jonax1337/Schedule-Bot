'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, TrendingUp, Trophy, Target } from "lucide-react";
import { toast } from "sonner";

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

interface ScrimEntry {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  scoreUs: number;
  scoreThem: number;
  maps: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface ScrimStats {
  totalScrims: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  mapStats: {
    [mapName: string]: {
      played: number;
      wins: number;
      losses: number;
    };
  };
}

export function ScrimsPanel() {
  const [scrims, setScrims] = useState<ScrimEntry[]>([]);
  const [stats, setStats] = useState<ScrimStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingScrim, setEditingScrim] = useState<ScrimEntry | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: '',
    opponent: '',
    result: 'loss' as 'win' | 'loss' | 'draw',
    scoreUs: 0,
    scoreThem: 0,
    maps: '',
    notes: '',
  });

  useEffect(() => {
    fetchScrims();
    fetchStats();
  }, []);

  const fetchScrims = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/scrims`);
      const data = await response.json();
      if (data.success) {
        // Sort by date (newest first)
        const sorted = data.scrims.sort((a: ScrimEntry, b: ScrimEntry) => {
          const parseDate = (dateStr: string) => {
            const [day, month, year] = dateStr.split('.').map(Number);
            return new Date(year, month - 1, day).getTime();
          };
          return parseDate(b.date) - parseDate(a.date);
        });
        setScrims(sorted);
      }
    } catch (error) {
      console.error('Error fetching scrims:', error);
      toast.error('Failed to fetch scrims');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${BOT_API_URL}/api/scrims/stats/summary`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const mapsArray = formData.maps.split(',').map(m => m.trim()).filter(Boolean);
      
      const body = {
        date: formData.date,
        opponent: formData.opponent,
        result: formData.result,
        scoreUs: formData.scoreUs,
        scoreThem: formData.scoreThem,
        maps: mapsArray,
        notes: formData.notes,
      };

      let response;
      if (editingScrim) {
        response = await fetch(`${BOT_API_URL}/api/scrims/${editingScrim.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch(`${BOT_API_URL}/api/scrims`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await response.json();
      
      if (data.success) {
        toast.success(editingScrim ? 'Scrim updated!' : 'Scrim added!');
        setIsAddDialogOpen(false);
        setEditingScrim(null);
        resetForm();
        fetchScrims();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to save scrim');
      }
    } catch (error) {
      console.error('Error saving scrim:', error);
      toast.error('Failed to save scrim');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scrim?')) return;
    
    try {
      const response = await fetch(`${BOT_API_URL}/api/scrims/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Scrim deleted!');
        fetchScrims();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to delete scrim');
      }
    } catch (error) {
      console.error('Error deleting scrim:', error);
      toast.error('Failed to delete scrim');
    }
  };

  const handleEdit = (scrim: ScrimEntry) => {
    setEditingScrim(scrim);
    setFormData({
      date: scrim.date,
      opponent: scrim.opponent,
      result: scrim.result,
      scoreUs: scrim.scoreUs,
      scoreThem: scrim.scoreThem,
      maps: scrim.maps.join(', '),
      notes: scrim.notes,
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: '',
      opponent: '',
      result: 'loss',
      scoreUs: 0,
      scoreThem: 0,
      maps: '',
      notes: '',
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      setEditingScrim(null);
      resetForm();
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'win':
        return <Badge variant="default" className="bg-green-500">✅ Win</Badge>;
      case 'loss':
        return <Badge variant="destructive">❌ Loss</Badge>;
      case 'draw':
        return <Badge variant="secondary">➖ Draw</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Record</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.wins}-{stats.losses}-{stats.draws}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalScrims} total scrims
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.wins} wins out of {stats.totalScrims} games
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maps Played</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.mapStats).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Different maps
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scrims List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scrim Results</CardTitle>
              <CardDescription>Manage and track your team&apos;s scrim history</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Scrim
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingScrim ? 'Edit Scrim' : 'Add New Scrim'}</DialogTitle>
                    <DialogDescription>
                      {editingScrim ? 'Update scrim details' : 'Record a new scrim result'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="date" className="text-right">
                        Date
                      </Label>
                      <Input
                        id="date"
                        placeholder="DD.MM.YYYY"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="opponent" className="text-right">
                        Opponent
                      </Label>
                      <Input
                        id="opponent"
                        placeholder="Team name"
                        value={formData.opponent}
                        onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="result" className="text-right">
                        Result
                      </Label>
                      <Select
                        value={formData.result}
                        onValueChange={(value: 'win' | 'loss' | 'draw') => 
                          setFormData({ ...formData, result: value })
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="win">✅ Win</SelectItem>
                          <SelectItem value="loss">❌ Loss</SelectItem>
                          <SelectItem value="draw">➖ Draw</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="scoreUs" className="text-right">
                        Our Score
                      </Label>
                      <Input
                        id="scoreUs"
                        type="number"
                        value={formData.scoreUs}
                        onChange={(e) => setFormData({ ...formData, scoreUs: parseInt(e.target.value) || 0 })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="scoreThem" className="text-right">
                        Their Score
                      </Label>
                      <Input
                        id="scoreThem"
                        type="number"
                        value={formData.scoreThem}
                        onChange={(e) => setFormData({ ...formData, scoreThem: parseInt(e.target.value) || 0 })}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="maps" className="text-right">
                        Maps
                      </Label>
                      <Input
                        id="maps"
                        placeholder="Bind, Haven, Ascent"
                        value={formData.maps}
                        onChange={(e) => setFormData({ ...formData, maps: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="notes" className="text-right">
                        Notes
                      </Label>
                      <Input
                        id="notes"
                        placeholder="Optional notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingScrim ? 'Update' : 'Add'} Scrim
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {scrims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No scrims recorded yet. Add your first scrim to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {scrims.map((scrim) => (
                <div
                  key={scrim.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-lg">{scrim.opponent}</span>
                      {getResultBadge(scrim.result)}
                      <span className="text-sm text-muted-foreground">{scrim.date}</span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium">Score: {scrim.scoreUs}-{scrim.scoreThem}</span>
                      {scrim.maps.length > 0 && (
                        <span className="ml-4">Maps: {scrim.maps.join(', ')}</span>
                      )}
                    </div>
                    {scrim.notes && (
                      <div className="mt-1 text-sm text-muted-foreground italic">
                        {scrim.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(scrim)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(scrim.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
