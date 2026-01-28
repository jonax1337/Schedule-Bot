'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, TrendingUp, Trophy, Target, X, LayoutGrid, Table as TableIcon, Video, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Image from 'next/image';
import { toast } from "sonner";
import { AgentSelector } from "./agent-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { stagger, microInteractions, loadingStates, cn } from '@/lib/animations';

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [teamName, setTeamName] = useState<string>('Our Team');
  
  // Filter states
  const [filterMap, setFilterMap] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterMatchType, setFilterMatchType] = useState<string>('all');
  
  // Sort state
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    date: getTodayDate(),
    opponent: '',
    result: 'loss' as 'win' | 'loss' | 'draw',
    scoreUs: 0 as number | string,
    scoreThem: 0 as number | string,
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

  useEffect(() => {
    const fetchTeamName = async () => {
      try {
        const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001'
        const response = await fetch(`${BOT_API_URL}/api/settings`)
        if (response.ok) {
          const data = await response.json()
          if (data?.branding?.teamName) {
            setTeamName(data.branding.teamName)
          }
        }
      } catch (error) {
        console.error('Failed to fetch team name:', error)
      }
    }

    fetchTeamName()
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
        scoreUs: typeof formData.scoreUs === 'string' ? 0 : formData.scoreUs,
        scoreThem: typeof formData.scoreThem === 'string' ? 0 : formData.scoreThem,
        map: formData.map,
        matchType: formData.matchType,
        ourAgents: formData.ourAgents,
        theirAgents: formData.theirAgents,
        vodUrl: formData.vodUrl,
        notes: formData.notes,
      };

      // Import auth helpers
      const { getAuthHeaders } = await import('@/lib/auth');
      
      let response;
      if (editingScrim) {
        response = await fetch(`${BOT_API_URL}/api/scrims/${editingScrim.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(body),
        });
      } else {
        response = await fetch(`${BOT_API_URL}/api/scrims`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
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
      // Import auth helpers
      const { getAuthHeaders } = await import('@/lib/auth');
      
      const response = await fetch(`${BOT_API_URL}/api/scrims/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
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
      map: scrim.map || '',
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

  const getMatchTypeBadge = (matchType: string) => {
    const getClassName = () => {
      switch (matchType) {
        case 'Premier':
          return 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300';
        case 'Scrim':
          return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
        case 'Tournament':
          return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300';
        case 'Custom':
          return 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
        default:
          return 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      }
    };

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getClassName()}`}>
        {matchType === 'Premier' && (
          <Image
            src="/assets/Premier_logo.png"
            alt="Premier"
            width={12}
            height={12}
            className="mr-1"
          />
        )}
        {matchType}
      </span>
    );
  };

  // Filter and sort scrims - memoized for performance
  const filteredScrims = useMemo(() => {
    const filtered = scrims.filter((scrim) => {
      // Filter by map
      if (filterMap !== 'all' && scrim.map !== filterMap) {
        return false;
      }
      // Filter by result
      if (filterResult !== 'all' && scrim.result !== filterResult) {
        return false;
      }
      // Filter by match type
      if (filterMatchType !== 'all' && scrim.matchType !== filterMatchType) {
        return false;
      }
      return true;
    });

    // Sort by date if sortBy is set
    if (sortBy) {
      return filtered.sort((a, b) => {
        // Parse DD.MM.YYYY format to Date objects
        const parseDate = (dateStr: string) => {
          const [day, month, year] = dateStr.split('.');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        };

        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);

        if (sortBy === 'date-desc') {
          return dateB.getTime() - dateA.getTime(); // Newest first
        } else {
          return dateA.getTime() - dateB.getTime(); // Oldest first
        }
      });
    }
    
    return filtered;
  }, [scrims, filterMap, filterResult, filterMatchType, sortBy]);

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
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={cn(stagger(0, 'fast', 'slideUpScale'), microInteractions.hoverLift)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Record</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.wins}-{stats.losses}-{stats.draws}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalScrims} total games
              </p>
            </CardContent>
          </Card>

          <Card className={cn(stagger(1, 'fast', 'slideUpScale'), microInteractions.hoverLift)}>
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

          <Card className={cn(stagger(2, 'fast', 'slideUpScale'), microInteractions.hoverLift)}>
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
      <Card className={stagger(3, 'fast', 'slideUpScale')}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Match Results</CardTitle>
              <CardDescription className="hidden sm:block">Manage and track your team&apos;s match history</CardDescription>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* View Switcher - Hidden on mobile */}
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'cards' | 'table')} className="hidden md:block">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cards" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden lg:inline">Cards</span>
                  </TabsTrigger>
                  <TabsTrigger value="table" className="flex items-center gap-2">
                    <TableIcon className="h-4 w-4" />
                    <span className="hidden lg:inline">Table</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm" className={cn("flex-1 sm:flex-none", microInteractions.activePress)}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add Match</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle className="animate-fadeIn stagger-1">{editingScrim ? 'Edit Match' : 'Add New Match'}</DialogTitle>
                    <DialogDescription className="animate-fadeIn stagger-2">
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
                          className={microInteractions.focusRing}
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
                          className={microInteractions.focusRing}
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
                            onChange={(e) => setFormData({ ...formData, scoreUs: e.target.value === '' ? '' : parseInt(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            className={microInteractions.focusRing}
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
                            onChange={(e) => setFormData({ ...formData, scoreThem: e.target.value === '' ? '' : parseInt(e.target.value) })}
                            onFocus={(e) => e.target.select()}
                            className={microInteractions.focusRing}
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
                        label={`${teamName} Composition`}
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
                          className={microInteractions.focusRing}
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
                          className={microInteractions.focusRing}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogOpenChange(false)}
                      className={microInteractions.smooth}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className={cn(microInteractions.activePress, microInteractions.smooth)}
                    >
                      {editingScrim ? 'Update Match' : 'Add Match'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </CardHeader>
        
        {/* Filters Section */}
        {scrims.length > 0 && (
          <div className="border-b pb-4 px-3 sm:px-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {/* Map Filter */}
              <Select value={filterMap} onValueChange={setFilterMap}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by map" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">All Maps</SelectItem>
                  {VALORANT_MAPS.map((map) => (
                    <SelectItem key={map} value={map}>
                      {map}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Result Filter */}
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Results" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="loss">Loss</SelectItem>
                  <SelectItem value="draw">Draw</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Match Type Filter */}
              <Select value={filterMatchType} onValueChange={setFilterMatchType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Match Type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="all">All Types</SelectItem>
                  {MATCH_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2">
              {(filterMap !== 'all' || filterResult !== 'all' || filterMatchType !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterMap('all');
                    setFilterResult('all');
                    setFilterMatchType('all');
                  }}
                  className="h-9 w-full sm:w-auto"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
              
              {/* Showing X of Y results */}
              <div className="text-sm text-muted-foreground sm:ml-auto">
                Showing {filteredScrims.length} of {scrims.length} matches
              </div>
            </div>
          </div>
        )}
        
        <CardContent>
          {scrims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No matches recorded yet. Add your first match to get started!
            </div>
          ) : filteredScrims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No matches found with the selected filters. Try adjusting your filters.
            </div>
          ) : viewMode === 'table' ? (
            // Table View
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 data-[state=open]:bg-accent"
                        onClick={() => {
                          if (sortBy === null) {
                            setSortBy('date-desc');
                          } else if (sortBy === 'date-desc') {
                            setSortBy('date-asc');
                          } else {
                            setSortBy(null);
                          }
                        }}
                      >
                        Date
                        {sortBy === 'date-desc' ? (
                          <ArrowDown className="ml-2 h-4 w-4" />
                        ) : sortBy === 'date-asc' ? (
                          <ArrowUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Opponent</TableHead>
                    <TableHead>Map</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    <TableHead>Our Comp</TableHead>
                    <TableHead>Their Comp</TableHead>
                    <TableHead className="text-center">VOD</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScrims.map((scrim) => (
                    <TableRow key={scrim.id} className="relative">
                      <TableCell className="font-medium">{scrim.date}</TableCell>
                      <TableCell>
                        {scrim.matchType && (
                          getMatchTypeBadge(scrim.matchType)
                        )}
                      </TableCell>
                      <TableCell>{scrim.opponent}</TableCell>
                      <TableCell>{scrim.map || '-'}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {scrim.scoreUs}:{scrim.scoreThem}
                      </TableCell>
                      <TableCell className="text-center">
                        {getResultBadge(scrim.result)}
                      </TableCell>
                      <TableCell>
                        {scrim.ourAgents?.length > 0 && (
                          <div className="flex gap-1">
                            {[...scrim.ourAgents].sort().map((agent, idx) => (
                              <img
                                key={`our-${idx}`}
                                src={`/assets/agents/${agent}_icon.webp`}
                                alt={agent}
                                className="w-6 h-6 rounded border border-primary/50"
                                title={agent}
                              />
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {scrim.theirAgents?.length > 0 && (
                          <div className="flex gap-1">
                            {[...scrim.theirAgents].sort().map((agent, idx) => (
                              <img
                                key={`their-${idx}`}
                                src={`/assets/agents/${agent}_icon.webp`}
                                alt={agent}
                                className="w-6 h-6 rounded border border-destructive/50"
                                title={agent}
                              />
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {scrim.vodUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            asChild
                          >
                            <a href={scrim.vodUrl} target="_blank" rel="noopener noreferrer">
                              <Video className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(scrim)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(scrim.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      {/* Map Background Image with Gradient in a dedicated <td> */}
                      <TableCell className="p-0 m-0 w-0 align-top relative" style={{width:0,minWidth:0,maxWidth:0}}>
                        {scrim.map && (
                          <span
                            className="block absolute right-0 top-0 bottom-0 w-48 pointer-events-none overflow-hidden"
                            aria-hidden="true"
                          >
                            <span 
                              className="block absolute right-0 top-0 bottom-0 w-full"
                              style={{
                                backgroundImage: `linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 20%, rgba(0,0,0,0.08) 100%), url(/assets/maps/Loading_Screen_${scrim.map}.webp)`,
                                backgroundPosition: 'center',
                                backgroundSize: 'cover',
                                backgroundRepeat: 'no-repeat',
                                maskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
                              }}
                            />
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            // Cards View
            <div className="space-y-4">
              {filteredScrims.map((scrim) => {
                const vodId = getYouTubeVideoId(scrim.vodUrl);
                
                return (
                  <div
                    key={scrim.id}
                    className="border rounded-lg hover:bg-accent/50 transition-colors overflow-hidden relative"
                  >
                    {/* Map Background Image - Full Card Coverage */}
                    {scrim.map && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg z-0">
                        <div 
                          className="absolute inset-0 w-full h-full"
                          style={{
                            backgroundImage: `url(/assets/maps/Loading_Screen_${scrim.map}.webp)`,
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                            backgroundRepeat: 'no-repeat',
                            opacity: 0.2,
                          }}
                        />
                        <div 
                          className="absolute inset-0 w-full h-full bg-gradient-to-r from-background/90 via-background/70 to-background/90"
                        />
                      </div>
                    )}
                    {/* Header with Match Type and Actions */}
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b bg-muted/30 relative z-10">
                      <div className="flex items-center gap-2">
                        {scrim.matchType && (
                          getMatchTypeBadge(scrim.matchType)
                        )}
                        {getResultBadge(scrim.result)}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(scrim)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(scrim.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-4 relative z-10">
                      {/* Teams and Score Layout - Single Row */}
                      <div className="flex items-center justify-between gap-4">
                        {/* Our Team - Left Side */}
                        <div className="flex-1 flex flex-col items-center">
                          <span className="text-base sm:text-lg font-semibold">{teamName}</span>
                          {scrim.ourAgents?.length > 0 && (
                            <div className="flex gap-1 sm:gap-1.5 justify-center flex-wrap mt-1">
                              {[...scrim.ourAgents].sort().map((agent, idx) => (
                                <img
                                  key={`our-${idx}`}
                                  src={`/assets/agents/${agent}_icon.webp`}
                                  alt={agent}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded border-2 border-primary/60"
                                  title={agent}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Score - Center */}
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`text-3xl sm:text-4xl font-bold ${scrim.result === 'win' ? 'text-green-500' : scrim.result === 'loss' ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {scrim.scoreUs}
                          </div>
                          <div className="text-xl sm:text-2xl font-semibold text-muted-foreground">:</div>
                          <div className={`text-3xl sm:text-4xl font-bold ${scrim.result === 'loss' ? 'text-green-500' : scrim.result === 'win' ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {scrim.scoreThem}
                          </div>
                        </div>

                        {/* Opponent Team - Right Side */}
                        <div className="flex-1 flex flex-col items-center">
                          <span className="text-base sm:text-lg font-semibold">{scrim.opponent}</span>
                          {scrim.theirAgents?.length > 0 && (
                            <div className="flex gap-1 sm:gap-1.5 justify-center flex-wrap mt-1">
                              {[...scrim.theirAgents].sort().map((agent, idx) => (
                                <img
                                  key={`their-${idx}`}
                                  src={`/assets/agents/${agent}_icon.webp`}
                                  alt={agent}
                                  className="w-6 h-6 sm:w-7 sm:h-7 rounded border-2 border-destructive/60"
                                  title={agent}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Map and Date - Below */}
                      <div className="flex flex-col items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
                        {scrim.map && (
                          <span className="font-medium">{scrim.map}</span>
                        )}
                        <span>{scrim.date}</span>
                      </div>
                        
                      {scrim.notes && (
                        <div className="mt-4 pt-4 border-t text-sm text-muted-foreground italic text-center">
                          {scrim.notes}
                        </div>
                      )}
                    </div>
                    
                    {/* VOD Accordion */}
                    {vodId && (
                      <div className="relative z-10">
                        <Accordion type="single" collapsible className="border-t">
                          <AccordionItem value="vod" className="border-0">
                            <AccordionTrigger className="px-4 py-3 hover:bg-accent/30">
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                <span className="font-medium">Watch VOD Review</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <div className="aspect-video rounded-lg overflow-hidden border relative z-20">
                                <iframe
                                  width="100%"
                                  height="100%"
                                  src={`https://www.youtube.com/embed/${vodId}`}
                                  title="VOD Review"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="w-full h-full relative z-20"
                                  style={{ position: 'relative', zIndex: 20 }}
                                />
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
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
