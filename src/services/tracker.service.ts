import { logger } from '../shared/utils/logger.js';

/**
 * Extracts match ID from a tracker.gg URL
 * Example: https://tracker.gg/valorant/match/139af99f-4671-406b-9958-67405210b813
 */
export function extractMatchId(trackerUrl: string): string | null {
  if (!trackerUrl) return null;
  const match = trackerUrl.match(
    /tracker\.gg\/valorant\/match\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return match ? match[1] : null;
}

/**
 * Tracker.gg data interfaces
 */
export interface TrackerPlayerStats {
  name: string;
  tag: string;
  team: string;
  agent: string;
  score: number;
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  headshots: number;
  bodyshots: number;
  legshots: number;
  headshotPct: number;
  firstBloods: number;
  firstDeaths: number;
  multiKills: number;
  plants: number;
  defuses: number;
  damagePerRound: number;
  rank?: string;
}

export interface TrackerTeamData {
  name: string;
  roundsWon: number;
  roundsLost: number;
  hasWon: boolean;
}

export interface TrackerMatchData {
  matchId: string;
  map: string;
  mode: string;
  startedAt: string;
  duration: number;
  roundsPlayed: number;
  teams: {
    red: TrackerTeamData;
    blue: TrackerTeamData;
  };
  players: TrackerPlayerStats[];
}

/**
 * Fetch match data from HenrikDev API
 */
export async function fetchTrackerData(
  matchId: string,
  apiKey: string,
  region: string = 'eu'
): Promise<TrackerMatchData | null> {
  if (!apiKey) {
    logger.error('HenrikDev API key not configured');
    return null;
  }

  try {
    const url = `https://api.henrikdev.xyz/valorant/v4/match/${region}/${matchId}`;
    logger.info('Fetching match data from HenrikDev API', matchId);

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`HenrikDev API error (${response.status})`, errorText);
      return null;
    }

    const json = await response.json();
    const data = json.data;

    if (!data) {
      logger.error('No data in HenrikDev API response');
      return null;
    }

    return parseHenrikMatchData(data, matchId);
  } catch (error) {
    logger.error('Failed to fetch tracker data', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Parse HenrikDev v4 match response into our TrackerMatchData format
 */
function parseHenrikMatchData(data: any, matchId: string): TrackerMatchData {
  const metadata = data.metadata || {};
  const players = data.players || [];
  const teams = data.teams || {};

  const redTeam = teams.red || {};
  const blueTeam = teams.blue || {};

  const parsedPlayers: TrackerPlayerStats[] = players.map((p: any) => {
    const stats = p.stats || {};
    const totalShots = (stats.headshots || 0) + (stats.bodyshots || 0) + (stats.legshots || 0);

    return {
      name: p.name || '',
      tag: p.tag || '',
      team: p.team || '',
      agent: p.agent?.name || '',
      score: stats.score || 0,
      kills: stats.kills || 0,
      deaths: stats.deaths || 0,
      assists: stats.assists || 0,
      kd: stats.deaths > 0 ? Math.round((stats.kills / stats.deaths) * 100) / 100 : stats.kills,
      headshots: stats.headshots || 0,
      bodyshots: stats.bodyshots || 0,
      legshots: stats.legshots || 0,
      headshotPct: totalShots > 0 ? Math.round((stats.headshots / totalShots) * 1000) / 10 : 0,
      firstBloods: stats.first_bloods || 0,
      firstDeaths: stats.first_deaths || 0,
      multiKills: stats.multi_kills || 0,
      plants: stats.plants || 0,
      defuses: stats.defuses || 0,
      damagePerRound: stats.damage?.per_round || 0,
      rank: p.tier?.name || undefined,
    };
  });

  return {
    matchId,
    map: metadata.map?.name || '',
    mode: metadata.queue?.name || metadata.mode || '',
    startedAt: metadata.started_at || '',
    duration: metadata.game_length_in_ms || 0,
    roundsPlayed: metadata.rounds_played || 0,
    teams: {
      red: {
        name: 'Red',
        roundsWon: redTeam.rounds?.won || 0,
        roundsLost: redTeam.rounds?.lost || 0,
        hasWon: redTeam.won || false,
      },
      blue: {
        name: 'Blue',
        roundsWon: blueTeam.rounds?.won || 0,
        roundsLost: blueTeam.rounds?.lost || 0,
        hasWon: blueTeam.won || false,
      },
    },
    players: parsedPlayers,
  };
}

export const trackerService = {
  extractMatchId,
  fetchTrackerData,
};
