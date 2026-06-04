import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SectionCardProps {
  title: ReactNode;
  description?: ReactNode;
  /** Optional icon rendered before the title (h-5 w-5). */
  icon?: LucideIcon;
  /** Optional header-right content (buttons, badges, ...). */
  action?: ReactNode;
  /** Classes for the Card (layout/animation, e.g. stagger(...)). */
  className?: string;
  /** Classes for the CardContent (e.g. "space-y-4"). */
  contentClassName?: string;
  children: ReactNode;
}

/**
 * Card with the standard header (icon + title + description) and a content
 * area. Replaces the repeated Card/CardHeader/CardTitle/CardContent
 * boilerplate across the admin and user pages.
 */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  className,
  contentClassName,
  children,
}: SectionCardProps) {
  const header = (
    <>
      <CardTitle className={Icon ? 'flex items-center gap-2' : undefined}>
        {Icon && <Icon className="h-5 w-5" />}
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </>
  );

  return (
    <Card className={className}>
      <CardHeader>
        {action ? (
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">{header}</div>
            {action}
          </div>
        ) : (
          header
        )}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
