/**
 * Animation System - Practical Examples
 *
 * Copy-paste ready code snippets showing how to use the animation system
 * in different scenarios.
 */

import { stagger, microInteractions, presets, cn, gridStagger } from '@/lib/animations';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ============================================
// EXAMPLE 1: List with Stagger Animation
// ============================================

export function StaggeredList() {
  const items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ];

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={item.id}
          className={stagger(index, 'fast', 'slideUp')}
        >
          {item.name}
        </div>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Cards Grid with Hover Effects
// ============================================

export function AnimatedCardsGrid() {
  const cards = [
    { id: 1, title: 'Card 1', content: 'Content 1' },
    { id: 2, title: 'Card 2', content: 'Content 2' },
    { id: 3, title: 'Card 3', content: 'Content 3' },
    { id: 4, title: 'Card 4', content: 'Content 4' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, index) => (
        <Card
          key={card.id}
          className={cn(
            stagger(index, 'slow', 'slideUpScale'),
            microInteractions.hoverLift
          )}
        >
          <h3>{card.title}</h3>
          <p>{card.content}</p>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 3: Button with Interactions
// ============================================

export function InteractiveButton() {
  return (
    <Button className={presets.button}>
      {/* presets.button includes smooth transitions + active press effect */}
      Click me
    </Button>
  );
}

// ============================================
// EXAMPLE 4: Stats Cards (Dashboard Style)
// ============================================

export function StatsCards() {
  const stats = [
    { label: 'Total Users', value: '1,234', icon: '👥' },
    { label: 'Active Sessions', value: '567', icon: '📊' },
    { label: 'Revenue', value: '$12.3k', icon: '💰' },
    { label: 'Growth', value: '+23%', icon: '📈' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.label}
          className={cn(
            stagger(index, 'fast', 'slideUpScale'),
            microInteractions.hoverLift
          )}
        >
          <div className="text-4xl">{stat.icon}</div>
          <div className="text-2xl font-bold">{stat.value}</div>
          <div className="text-sm text-muted-foreground">{stat.label}</div>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// EXAMPLE 5: Loading Skeleton
// ============================================

export function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 skeleton-pulse rounded-lg" />
      <div className="h-4 w-full skeleton-pulse rounded-lg" />
      <div className="h-4 w-3/4 skeleton-pulse rounded-lg" />
    </div>
  );
}

// ============================================
// EXAMPLE 6: Conditional Loading with Fade
// ============================================

export function ConditionalContent({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      Your content here
    </div>
  );
}

// ============================================
// EXAMPLE 7: Grid with 2D Stagger
// ============================================

export function GridWithStagger() {
  const items = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    name: `Item ${i + 1}`
  }));
  const columns = 4;

  return (
    <div className="grid grid-cols-4 gap-4">
      {items.map((item, i) => {
        const row = Math.floor(i / columns);
        const col = i % columns;

        return (
          <Card
            key={item.id}
            className={cn(
              gridStagger(row, col, columns, 'fast', 'scaleIn'),
              microInteractions.hoverScale
            )}
          >
            {item.name}
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// EXAMPLE 8: Navigation with Hover Effects
// ============================================

export function AnimatedNav() {
  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <nav className="flex gap-4">
      {navItems.map((item, index) => (
        <a
          key={item.label}
          href={item.href}
          className={cn(
            'px-4 py-2 rounded-lg',
            stagger(index, 'fast', 'fadeIn'),
            microInteractions.smooth,
            microInteractions.hoverScaleSm
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

// ============================================
// EXAMPLE 9: Modal/Dialog Entrance
// ============================================

export function AnimatedDialog({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 animate-fadeIn" />

      {/* Dialog */}
      <Card className={presets.modalEntrance}>
        <h2 className="animate-fadeIn stagger-1">Dialog Title</h2>
        <p className="animate-fadeIn stagger-2">Dialog content goes here</p>
        <Button className={cn('animate-fadeIn stagger-3', presets.button)}>
          Close
        </Button>
      </Card>
    </div>
  );
}

// ============================================
// EXAMPLE 10: Page Section Entrance
// ============================================

export function PageSection() {
  return (
    <section className={presets.sectionEntrance}>
      <h2 className="animate-fadeIn stagger-1">Section Title</h2>
      <p className="animate-fadeIn stagger-2">Section description</p>
      <div className="animate-fadeIn stagger-3">
        Section content
      </div>
    </section>
  );
}

// ============================================
// EXAMPLE 11: Notification/Toast
// ============================================

export function AnimatedToast({ message }: { message: string }) {
  return (
    <div className={cn(
      'fixed top-4 right-4 p-4 bg-card border rounded-lg shadow-lg',
      presets.alertEntrance
    )}>
      {message}
    </div>
  );
}

// ============================================
// EXAMPLE 12: Shimmer Loading Card
// ============================================

export function ShimmerCard() {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 animate-shimmer" />
      <div className="relative">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-8 w-full bg-muted rounded mt-2" />
      </div>
    </Card>
  );
}

// ============================================
// EXAMPLE 13: Interactive Form Field
// ============================================

export function AnimatedInput() {
  return (
    <input
      type="text"
      className={cn(
        'px-4 py-2 border rounded-lg',
        microInteractions.focusRing,
        microInteractions.smooth
      )}
      placeholder="Type something..."
    />
  );
}

// ============================================
// EXAMPLE 14: Sidebar Items
// ============================================

export function AnimatedSidebar() {
  const items = [
    { icon: '🏠', label: 'Home' },
    { icon: '📊', label: 'Dashboard' },
    { icon: '⚙️', label: 'Settings' },
    { icon: '👤', label: 'Profile' },
  ];

  return (
    <aside className="space-y-2">
      {items.map((item, index) => (
        <button
          key={item.label}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent',
            stagger(index, 'fast', 'slideLeft'),
            microInteractions.smooth
          )}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </aside>
  );
}

// ============================================
// EXAMPLE 15: Error Shake Animation
// ============================================

export function ErrorInput({ hasError }: { hasError: boolean }) {
  return (
    <input
      type="text"
      className={cn(
        'px-4 py-2 border rounded-lg',
        hasError && 'animate-shake border-red-500',
        microInteractions.smooth
      )}
    />
  );
}

// ============================================
// QUICK PATTERNS REFERENCE
// ============================================

/*
// Fast feedback (buttons, toggles)
className={cn(microInteractions.smooth, microInteractions.activePress)}

// Hoverable cards
className={cn(presets.cardEntrance, microInteractions.hoverLift)}

// List items
className={stagger(index, 'fast', 'fadeIn')}

// Stats/Dashboard cards
className={stagger(index, 'slow', 'slideUpScale')}

// Navigation items
className={cn(stagger(index, 'fast'), microInteractions.hoverScaleSm)}

// Modal/Dialog
className={presets.modalEntrance}

// Loading skeleton
className="skeleton-pulse"

// Shimmer effect
className="animate-shimmer"

// Error state
className={hasError && 'animate-shake'}

// Grid items
className={gridStagger(row, col, columns, 'fast', 'scaleIn')}
*/
