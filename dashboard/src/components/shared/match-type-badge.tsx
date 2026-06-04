import { getMatchTypeClasses } from '@/lib/design-tokens';

interface MatchTypeBadgeProps {
  type: string;
  /** Use the variant tuned for dark/coloured card surfaces. */
  onDark?: boolean;
}

/** Pill badge for a scrim match type, with the Premier logo for Premier games. */
export function MatchTypeBadge({ type, onDark = false }: MatchTypeBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getMatchTypeClasses(type, onDark)}`}>
      {type === 'Premier' && (
        <img src="/assets/Premier_logo.png" alt="Premier" width={12} height={12} className="mr-1" />
      )}
      {type}
    </span>
  );
}
