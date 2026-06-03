import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/app-shell'
import { DashboardSkeleton } from '@/components/dashboard-skeleton'

function App() {
  return (
    <TooltipProvider>
      <AppShell>
        <DashboardSkeleton />
      </AppShell>
    </TooltipProvider>
  )
}

export default App
