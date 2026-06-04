import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Centered "no data" placeholder: optional icon, title, hint and an action. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('py-12 text-center', className)}>
      {Icon && <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />}
      <p className="text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
