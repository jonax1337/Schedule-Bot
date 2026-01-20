'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, TrendingUp, Trophy, Target, X } from "lucide-react";
import { toast } from "sonner";
import { AgentSelector } from "./agent-picker";

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';

// Helper to extract YouTube video ID from URL
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

const VALORANT_MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture',
  'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset'
];

const MATCH_TYPES = [
  'Scrim',
  'Tournament',
  'Premier',
  'Ranked',
  'Custom',
];

// Helper to get today's date in DD.MM.YYYY format
function getTodayDate(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}.${month}.${year}`;
}

interface ScrimEntry {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  scoreUs: number;
  scoreThem: number;
  map: string;
  matchType?: string;
  ourAgents: string[];
  theirAgents: string[];
  vodUrl: string;
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
    date: getTodayDate(),
    opponent: '',
    result: 'loss' as 'win' | 'loss' | 'draw',
    scoreUs: 0,
    scoreThem: 0,
    map: '',
    matchType: 'Scrim',
    ourAgents: [] as string[],
    theirAgents: [] as string[],
    vodUrl: '',
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
      const body = {
        date: formData.date,
        opponent: formData.opponent,
        result: formData.result,
        scoreUs: formData.scoreUs,
        scoreThem: formData.scoreThem,
        maps: formData.map ? [formData.map] : [],
        matchType: formData.matchType,
        ourAgents: formData.ourAgents,
        theirAgents: formData.theirAgents,
        vodUrl: formData.vodUrl,
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
        toast.success(editingScrim ? 'Match updated!' : 'Match added!');
        setIsAddDialogOpen(false);
        setEditingScrim(null);
        resetForm();
        fetchScrims();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to save match');
      }
    } catch (error) {
      console.error('Error saving scrim:', error);
      toast.error('Failed to save match');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this match?')) return;
    
    try {
      const response = await fetch(`${BOT_API_URL}/api/scrims/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Match deleted!');
        fetchScrims();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to delete match');
      }
    } catch (error) {
      console.error('Error deleting scrim:', error);
      toast.error('Failed to delete match');
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
      map: scrim.maps && scrim.maps.length > 0 ? scrim.maps[0] : '',
      matchType: scrim.matchType || 'Scrim',
      ourAgents: scrim.ourAgents || [],
      theirAgents: scrim.theirAgents || [],
      vodUrl: scrim.vodUrl || '',
      notes: scrim.notes,
    });
    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: getTodayDate(),
      opponent: '',
      result: 'loss',
      scoreUs: 0,
      scoreThem: 0,
      map: '',
      matchType: 'Scrim',
      ourAgents: [],
      theirAgents: [],
      vodUrl: '',
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
        return <Badge variant="default" className="bg-green-500">Win</Badge>;
      case 'loss':
        return <Badge variant="destructive">Loss</Badge>;
      case 'draw':
        return <Badge variant="secondary">Draw</Badge>;
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
              <CardTitle>Match Results</CardTitle>
              <CardDescription>Manage and track your team&apos;s match history</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Match
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingScrim ? 'Edit Match' : 'Add New Match'}</DialogTitle>
                    <DialogDescription>
                      {editingScrim ? 'Update match details' : 'Record a new match result'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date ? formData.date.split('.').reverse().join('-') : ''}
                          onChange={(e) => {
                            const dateValue = e.target.value;
                            if (dateValue) {
                              const [year, month, day] = dateValue.split('-');
                              setFormData({ ...formData, date: `${day}.${month}.${year}` });
                            } else {
                              setFormData({ ...formData, date: '' });
                            }
                          }}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="opponent">Opponent Team</Label>
                        <Input
                          id="opponent"
                          placeholder="Enter opponent team name"
                          value={formData.opponent}
                          onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    {/* Result & Score Section */}
                    <div className="space-y-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="result">Result</Label>
                        <Select
                          value={formData.result}
                          onValueChange={(value: 'win' | 'loss' | 'draw') => 
                            setFormData({ ...formData, result: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="win">Win</SelectItem>
                            <SelectItem value="loss">Loss</SelectItem>
                            <SelectItem value="draw">Draw</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="scoreUs">Our Score</Label>
                          <Input
                            id="scoreUs"
                            type="number"
                            min="0"
                            value={formData.scoreUs}
                            onChange={(e) => setFormData({ ...formData, scoreUs: parseInt(e.target.value) || 0 })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="scoreThem">Their Score</Label>
                          <Input
                            id="scoreThem"
                            type="number"
                            min="0"
                            value={formData.scoreThem}
                            onChange={(e) => setFormData({ ...formData, scoreThem: parseInt(e.target.value) || 0 })}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="map">Map</Label>
                        <Select
                          value={formData.map}
                          onValueChange={(value) => setFormData({ ...formData, map: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a map..." />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {VALORANT_MAPS.map((map) => (
                              <SelectItem key={map} value={map}>
                                {map}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="matchType">Match Type</Label>
                        <Select
                          value={formData.matchType}
                          onValueChange={(value) => setFormData({ ...formData, matchType: value })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            {MATCH_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Team Compositions Section */}
                    <div className="space-y-4 pt-2 border-t">
                      <AgentSelector
                        label="Our Team Composition"
                        agents={formData.ourAgents}
                        onChange={(agents) => setFormData({ ...formData, ourAgents: agents })}
                        maxAgents={5}
                      />
                      
                      <AgentSelector
                        label="Enemy Team Composition (Optional)"
                        agents={formData.theirAgents}
                        onChange={(agents) => setFormData({ ...formData, theirAgents: agents })}
                        maxAgents={5}
                      />
                    </div>
                    
                    {/* Additional Info Section */}
                    <div className="space-y-4 pt-2 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="vodUrl">VOD Link</Label>
                        <Input
                          id="vodUrl"
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={formData.vodUrl}
                          onChange={(e) => setFormData({ ...formData, vodUrl: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">YouTube video URL for review</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                          id="notes"
                          placeholder="Add any additional notes or observations..."
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingScrim ? 'Update Match' : 'Add Match'}
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
              No matches recorded yet. Add your first match to get started!
            </div>
          ) : (
            <div className="space-y-4">
              {scrims.map((scrim) => {
                const vodId = getYouTubeVideoId(scrim.vodUrl);
                
                return (
                  <div
                    key={scrim.id}
                    className="border rounded-lg hover:bg-accent transition-colors overflow-hidden"
                  >
                    <div className="flex items-start justify-between p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-lg">{scrim.opponent}</span>
                          {getResultBadge(scrim.result)}
                          {scrim.matchType && (
                            <Badge variant="outline" className="text-xs">
                              {scrim.matchType}
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">{scrim.date}</span>
                        </div>
                        
                        <div className="mt-2 text-sm text-muted-foreground">
                          <span className="font-medium">Score: {scrim.scoreUs}-{scrim.scoreThem}</span>
                          {scrim.map && (
                            <span className="ml-4">Map: {scrim.map}</span>
                          )}
                        </div>
                        
                        {/* Agent Compositions */}
                        {(scrim.ourAgents?.length > 0 || scrim.theirAgents?.length > 0) && (
                          <div className="mt-3 space-y-2">
                            {scrim.ourAgents?.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground min-w-[80px]">Our Team:</span>
                                <div className="flex gap-1">
                                  {scrim.ourAgents.map((agent, idx) => (
                                    <img
                                      key={`our-${idx}`}
                                      src={`/assets/agents/${agent}_icon.webp`}
                                      alt={agent}
                                      className="w-6 h-6 rounded border border-primary/50"
                                      title={agent}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                            {scrim.theirAgents?.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground min-w-[80px]">Enemy Team:</span>
                                <div className="flex gap-1">
                                  {scrim.theirAgents.map((agent, idx) => (
                                    <img
                                      key={`their-${idx}`}
                                      src={`/assets/agents/${agent}_icon.webp`}
                                      alt={agent}
                                      className="w-6 h-6 rounded border border-destructive/50"
                                      title={agent}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {scrim.notes && (
                          <div className="mt-2 text-sm text-muted-foreground italic">
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
                    
                    {/* VOD Embed */}
                    {vodId && (
                      <div className="px-4 pb-4">
                        <div className="aspect-video rounded-lg overflow-hidden">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${vodId}`}
                            title="VOD Review"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
