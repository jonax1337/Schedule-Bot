/**
 * Animation utility system. Uses tokens defined in globals.css.
 */

export type AnimationPreset =
  | 'fadeIn' | 'fadeIn-fast' | 'fadeIn-slow' | 'fadeOut'
  | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight'
  | 'scaleIn' | 'scaleIn-fast' | 'scaleIn-slow' | 'scaleBounce'
  | 'slideUpScale' | 'shimmer' | 'pulse' | 'wiggle' | 'shake'

export type StaggerSpeed = 'fast' | 'base' | 'slow'

export function stagger(index: number, speed: StaggerSpeed = 'base', animation?: AnimationPreset): string {
  const staggerNum = index + 1
  let staggerClass: string

  if (speed === 'fast') {
    staggerClass = `stagger-fast-${Math.min(staggerNum, 8)}`
  } else if (speed === 'slow') {
    staggerClass = `stagger-slow-${Math.min(staggerNum, 5)}`
  } else {
    staggerClass = `stagger-${Math.min(staggerNum, 10)}`
  }

  if (animation) return `animate-${animation} ${staggerClass}`
  return staggerClass
}

export const microInteractions = {
  hoverLift: 'hover-lift',
  hoverScale: 'hover-scale',
  hoverScaleSm: 'hover-scale-sm',
  hoverScaleCard: 'hover-scale-card',
  activePress: 'active-press',
  focusRing: 'focus-ring-smooth',
  smooth: 'transition-smooth',
  smoothSlow: 'transition-smooth-slow',
  glass: 'glass-smooth',
} as const

export const loadingStates = {
  skeleton: 'skeleton-pulse',
  shimmer: 'animate-shimmer',
  pulse: 'animate-pulse',
} as const
