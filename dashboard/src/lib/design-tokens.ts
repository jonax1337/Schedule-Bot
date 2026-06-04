// Shared colour tokens for scrim match types and results. Centralised here so
// the matches table and the VOD review page render the same palette instead of
// each keeping its own copy of the class maps.

export const MATCH_TYPE_CLASSES: Record<string, string> = {
  Premier: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300',
  Scrim: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
  Tournament: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
  Custom: 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

// Variant for use on top of a dark/coloured card surface (the matches card view).
export const MATCH_TYPE_CLASSES_ON_DARK: Record<string, string> = {
  Premier: 'bg-amber-950/80 text-amber-300',
  Scrim: 'bg-blue-950/80 text-blue-300',
  Tournament: 'bg-yellow-950/80 text-yellow-300',
  Custom: 'bg-gray-800/80 text-gray-300',
};

export function getMatchTypeClasses(matchType: string, onDark = false): string {
  const map = onDark ? MATCH_TYPE_CLASSES_ON_DARK : MATCH_TYPE_CLASSES;
  return map[matchType] ?? map.Custom;
}
