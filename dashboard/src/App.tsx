import { useEffect } from 'react'
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
import { isControlPlaneHost, isBareApex, controlPlaneUrl } from '@/lib/tenant'
import { AdminShell } from '@/components/shells/admin-shell'
import { UserShell } from '@/components/shells/user-shell'
import { LoginPage } from '@/pages/login'
import { AuthCallbackPage } from '@/pages/auth-callback'
import { ControlPage } from '@/pages/control'
import { AdminHome } from '@/pages/admin-home'
import { UserHome } from '@/pages/user-home'
import VodReviewPage from '@/pages/vod-review'
import { Placeholder } from '@/pages/placeholder'

/** Bare apex (synqed.org) is not a team app — send it to the control plane host
 *  (app.synqed.org). In dev we just show /control locally to avoid a cross-origin
 *  hop. */
function ApexRedirect() {
  useEffect(() => {
    if (import.meta.env.PROD) window.location.replace(controlPlaneUrl('/control'))
  }, [])
  if (import.meta.env.DEV) return <Navigate to="/control" replace />
  return <div className="text-muted-foreground flex h-svh items-center justify-center text-sm">Redirecting…</div>
}

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
                      isBareApex() ? (
                        <ApexRedirect />
                      ) : isControlPlaneHost() ? (
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
                      isBareApex() ? (
                        <ApexRedirect />
                      ) : isControlPlaneHost() ? (
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
