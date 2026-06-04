import { cn } from '@/lib/utils';

interface AgentGroupProps {
  agents: string[] | null | undefined;
  /** Extra classes for the flex container. */
  className?: string;
  /** Extra classes for each agent icon (size, border, ...). */
  iconClassName?: string;
  /** Disambiguates React keys when several groups render side by side. */
  keyPrefix?: string;
}

/** Row of agent icons (sorted), or null when there are none. */
export function AgentGroup({ agents, className, iconClassName, keyPrefix = 'agent' }: AgentGroupProps) {
  if (!agents || agents.length === 0) return null;
  return (
    <div className={cn('flex gap-1', className)}>
      {[...agents].sort().map((agent, idx) => (
        <img
          key={`${keyPrefix}-${idx}`}
          src={`/assets/agents/${agent}_icon.webp`}
          alt={agent}
          title={agent}
          className={cn('w-6 h-6 rounded', iconClassName)}
        />
      ))}
    </div>
  );
}
