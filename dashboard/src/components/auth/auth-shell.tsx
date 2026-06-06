import type { ReactNode } from 'react'
import { SynqedMark, Wordmark } from '@/components/synqed-brand'
import { FloatingPaths } from '@/components/floating-paths'

/**
 * Premium split-screen auth frame (based on Efferd auth-5), branded for Synqed.
 * Left = brand panel with animated FloatingPaths + tagline; right = the sign-in
 * content (passed as children). Shared by the control plane, team login and the
 * auth callback so the premium look is consistent across all entry points.
 */
export function AuthShell({
  tagline,
  subline = 'Scheduling, scrims, availability and your Discord bot — synced across your whole roster.',
  children,
}: {
  tagline: string
  subline?: string
  children: ReactNode
}) {
  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-secondary dark:bg-secondary/20 relative hidden h-full flex-col overflow-hidden border-r p-10 lg:flex">
        <div className="bg-linear-to-b absolute inset-0 from-transparent via-transparent to-background" />
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
        <div className="z-10 flex items-center gap-2.5">
          <SynqedMark className="text-foreground size-7" />
          <Wordmark className="text-2xl" />
        </div>
        <div className="z-10 mt-auto space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight">{tagline}</h2>
          <p className="text-muted-foreground max-w-md text-sm">{subline}</p>
        </div>
      </div>

      {/* Content panel */}
      <div className="relative flex min-h-screen flex-col justify-center px-8">
        <div aria-hidden className="absolute inset-0 isolate -z-10 opacity-60 contain-strict">
          <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
        </div>
        <div className="mx-auto w-full space-y-6 sm:w-sm">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
              <SynqedMark className="size-6" />
            </div>
            <Wordmark className="text-xl" />
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
