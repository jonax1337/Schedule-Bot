export const VALORANT_MAPS = [
  'Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture',
  'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset',
] as const;

export const VALORANT_AGENTS = [
  'Astra', 'Breach', 'Brimstone', 'Chamber', 'Clove', 'Cypher', 'Deadlock',
  'Fade', 'Gekko', 'Harbor', 'Iso', 'Jett', 'KAYO', 'Killjoy', 'Neon', 'Omen',
  'Phoenix', 'Raze', 'Reyna', 'Sage', 'Skye', 'Sova', 'Tejo', 'Veto',
  'Viper', 'Vyse', 'Waylay', 'Yoru'
].sort();

export const MATCH_TYPES = ['Scrim', 'Tournament', 'Premier', 'Custom'] as const;

export const FOLDER_COLORS = [
  { label: 'None', value: null },
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#22c55e' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink', value: '#ec4899' },
] as const;

export function normalizeAgentName(name: string): string {
  return name.replace(/\//g, '');
}
