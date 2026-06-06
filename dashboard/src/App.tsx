import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { TimezoneProvider } from '@/lib/timezone'
import { BreadcrumbProvider } from '@/lib/breadcrumb-context'
import { ProtectedRoute } from '@/components/protected-route'
import { DevModeBanner } from '@/components/dev-mode-banner'
import { IS_DEV_MODE } from '@/lib/dev-mode'
import { isApex } from '@/lib/tenant'
import { AdminShell } from '@/components/shells/admin-shell'
import { UserShell } from '@/components/shells/user-shell'
import { LoginPage } from '@/pages/login'
import { AuthCallbackPage } from '@/pages/auth-callback'
import { ControlPage } from '@/pages/control'
import { AdminHome } from '@/pages/admin-home'
import { UserHome } from '@/pages/user-home'
import VodReviewPage from '@/pages/vod-review'
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

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TimezoneProvider>
          <TooltipProvider>
            <BreadcrumbProvider>
              <BrowserRouter>
                {IS_DEV_MODE && <DevModeBanner />}
                <Routes>
                  <Route path="/control" element={<ControlPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />

                  {/* Apex (synqed.org) is the SaaS entry → control plane.
                      Team app lives on the team's subdomain. */}
                  <Route
                    path="/"
                    element={
                      isApex() ? (
                        <Navigate to="/control" replace />
                      ) : (
                        <ProtectedRoute>
                          <UserShell>
                            <UserHome />
                          </UserShell>
                        </ProtectedRoute>
                      )
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      isApex() ? (
                        <Navigate to="/control" replace />
                      ) : (
                        <ProtectedRoute requireAdmin>
                          <AdminShell>
                            <AdminHome />
                          </AdminShell>
                        </ProtectedRoute>
                      )
                    }
                  />
                  <Route
                    path="/vod/:scrimId"
                    element={
                      <ProtectedRoute>
                        <VodReviewPage />
                      </ProtectedRoute>
                    }
                  />

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
