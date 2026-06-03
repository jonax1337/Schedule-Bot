import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { TimezoneProvider } from '@/lib/timezone'
import { BreadcrumbProvider } from '@/lib/breadcrumb-context'
import { AppShell } from '@/components/app-shell'
import { Placeholder } from '@/pages/placeholder'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

function ShellLayout({ title }: { title: string }) {
  return (
    <AppShell>
      <Placeholder title={title} />
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TimezoneProvider>
          <TooltipProvider>
            <BreadcrumbProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Placeholder title="User Login" />} />
                  <Route path="/admin/login" element={<Placeholder title="Admin Login" />} />
                  <Route path="/auth/callback" element={<Placeholder title="OAuth Callback" />} />
                  <Route path="/" element={<ShellLayout title="User Dashboard" />} />
                  <Route path="/admin" element={<ShellLayout title="Admin Dashboard" />} />
                  <Route path="/vod/:scrimId" element={<ShellLayout title="VOD Review" />} />
                  <Route path="*" element={<Placeholder title="404 — Not Found" />} />
                </Routes>
              </BrowserRouter>
              <Toaster />
            </BreadcrumbProvider>
          </TooltipProvider>
        </TimezoneProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
