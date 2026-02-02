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
 * Loading state utilities
 */
export const loadingStates = {
  skeleton: "skeleton-pulse",
  shimmer: "animate-shimmer",
  pulse: "animate-pulse",
} as const;
