/**
 * Animation Utility System
 *
 * Provides helper functions and presets for consistent animations across the app.
 * Uses the animation design tokens defined in globals.css
 */

/**
 * Animation Preset Types
 */
export type AnimationPreset =
  | "fadeIn"
  | "fadeIn-fast"
  | "fadeIn-slow"
  | "fadeOut"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleIn"
  | "scaleIn-fast"
  | "scaleIn-slow"
  | "scaleBounce"
  | "slideUpScale"
  | "shimmer"
  | "pulse"
  | "wiggle"
  | "shake";

export type StaggerSpeed = "fast" | "base" | "slow";

/**
 * Generates stagger animation class names for lists
 *
 * @param index - Item index in the list (0-based)
 * @param speed - Stagger speed: "fast" (30ms), "base" (50ms), "slow" (75ms)
 * @param animation - Animation preset to apply
 * @returns Combined className string
 *
 * @example
 * ```tsx
 * {items.map((item, index) => (
 *   <div key={item.id} className={stagger(index, "fast", "slideUp")}>
 *     {item.name}
 *   </div>
 * ))}
 * ```
 */
export function stagger(
  index: number,
  speed: StaggerSpeed = "base",
  animation?: AnimationPreset
): string {
  const staggerNum = index + 1; // Convert 0-based to 1-based

  let staggerClass: string;

  if (speed === "fast") {
    staggerClass = `stagger-fast-${Math.min(staggerNum, 8)}`; // Max 8 for fast
  } else if (speed === "slow") {
    staggerClass = `stagger-slow-${Math.min(staggerNum, 5)}`; // Max 5 for slow
  } else {
    staggerClass = `stagger-${Math.min(staggerNum, 10)}`; // Max 10 for base
  }

  if (animation) {
    return `animate-${animation} ${staggerClass}`;
  }

  return staggerClass;
}

/**
 * Generates stagger classes for all items in a list
 *
 * @param count - Total number of items
 * @param speed - Stagger speed
 * @param animation - Animation preset to apply
 * @returns Array of className strings
 *
 * @example
 * ```tsx
 * const classes = staggerList(items.length, "base", "fadeIn");
 * {items.map((item, i) => (
 *   <div key={item.id} className={classes[i]}>{item.name}</div>
 * ))}
 * ```
 */
export function staggerList(
  count: number,
  speed: StaggerSpeed = "base",
  animation?: AnimationPreset
): string[] {
  return Array.from({ length: count }, (_, i) => stagger(i, speed, animation));
}

/**
 * Animation class builder for common patterns
 *
 * @example
 * ```tsx
 * <div className={animate("slideUp", { stagger: 1 })}>
 * <div className={animate("scaleIn", { speed: "fast" })}>
 * ```
 */
export function animate(
  preset: AnimationPreset,
  options?: {
    stagger?: number;
    speed?: StaggerSpeed;
  }
): string {
  const classes: string[] = [`animate-${preset}`];

  if (options?.stagger !== undefined) {
    const staggerSpeed = options.speed || "base";
    const staggerClass = stagger(options.stagger, staggerSpeed);
    classes.push(staggerClass);
  }

  return classes.join(" ");
}

/**
 * Micro-interaction utility classes
 */
export const microInteractions = {
  /** Smooth lift on hover with shadow */
  hoverLift: "hover-lift",

  /** Scale up slightly on hover */
  hoverScale: "hover-scale",

  /** Small scale on hover (more subtle) */
  hoverScaleSm: "hover-scale-sm",

  /** Scale with shadow - perfect for cards */
  hoverScaleCard: "hover-scale-card",

  /** Press down effect on click */
  activePress: "active-press",

  /** Smooth focus ring transition */
  focusRing: "focus-ring-smooth",

  /** Smooth all-property transition */
  smooth: "transition-smooth",

  /** Slower smooth transition */
  smoothSlow: "transition-smooth-slow",

  /** Glass morphism with smooth transitions */
  glass: "glass-smooth",
} as const;

/**
 * Page transition utilities
 */
export const pageTransitions = {
  enter: "page-enter",
  exit: "page-exit",
} as const;

/**
 * Loading state utilities
 */
export const loadingStates = {
  skeleton: "skeleton-pulse",
  shimmer: "animate-shimmer",
  pulse: "animate-pulse",
} as const;

/**
 * Preset combinations for common UI patterns
 */
export const presets = {
  /** Card entrance - slide up with scale */
  cardEntrance: "animate-slideUpScale",

  /** Modal/Dialog entrance */
  modalEntrance: "animate-scaleIn-fast",

  /** List item entrance */
  listItem: "animate-fadeIn-fast",

  /** Page section entrance */
  sectionEntrance: "animate-slideUp",

  /** Alert/Toast entrance */
  alertEntrance: "animate-slideDown",

  /** Button with press effect */
  button: `${microInteractions.smooth} ${microInteractions.activePress}`,

  /** Hoverable card */
  card: `${microInteractions.smooth} ${microInteractions.hoverLift}`,

  /** Interactive element */
  interactive: `${microInteractions.smooth} ${microInteractions.hoverScaleSm}`,
} as const;

/**
 * Combines multiple animation utilities
 *
 * @example
 * ```tsx
 * <Card className={combine("slideUp", "hover-lift", "stagger-2")}>
 * ```
 */
export function combine(...utilities: string[]): string {
  return utilities.join(" ");
}

/**
 * Grid stagger pattern - staggers items in a 2D grid
 *
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @param columns - Total number of columns
 * @param speed - Stagger speed
 * @returns Stagger className
 *
 * @example
 * ```tsx
 * <div className="grid grid-cols-3">
 *   {items.map((item, i) => {
 *     const row = Math.floor(i / 3);
 *     const col = i % 3;
 *     return (
 *       <div className={gridStagger(row, col, 3, "fast", "scaleIn")}>
 *         {item.name}
 *       </div>
 *     );
 *   })}
 * </div>
 * ```
 */
export function gridStagger(
  row: number,
  col: number,
  columns: number,
  speed: StaggerSpeed = "base",
  animation?: AnimationPreset
): string {
  const index = row * columns + col;
  return stagger(index, speed, animation);
}

/**
 * Conditional animation - only apply animation if condition is true
 *
 * @example
 * ```tsx
 * <div className={conditionalAnimate(isLoading, "pulse")}>
 * ```
 */
export function conditionalAnimate(
  condition: boolean,
  preset: AnimationPreset
): string {
  return condition ? `animate-${preset}` : "";
}

/**
 * Type-safe className builder with animations
 */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
