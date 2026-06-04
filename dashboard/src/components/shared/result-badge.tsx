import { Badge } from '@/components/ui/badge';

interface ResultBadgeProps {
  result: string;
  /** Use the higher-contrast variant for dark/coloured card surfaces. */
  onDark?: boolean;
}

/** Win / Loss / Draw badge. Returns null for unknown results. */
export function ResultBadge({ result, onDark = false }: ResultBadgeProps) {
  switch (result) {
    case 'win':
      return <Badge variant="default" className={onDark ? 'bg-green-600 text-white' : 'bg-green-500'}>Win</Badge>;
    case 'loss':
      return <Badge variant="destructive" className={onDark ? 'bg-red-600 text-white' : undefined}>Loss</Badge>;
    case 'draw':
      return <Badge variant="secondary" className={onDark ? 'bg-white/20 text-white' : undefined}>Draw</Badge>;
    default:
      return null;
  }
}
