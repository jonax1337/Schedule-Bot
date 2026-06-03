import { BrowserRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { TimezoneProvider } from '@/lib/timezone'
import { BreadcrumbProvider } from '@/lib/breadcrumb-context'
import { ProtectedRoute } from '@/components/protected-route'
import { DevModeBanner } from '@/components/dev-mode-banner'
import { IS_DEV_MODE } from '@/lib/dev-mode'
import { AdminShell } from '@/components/shells/admin-shell'
import { UserShell } from '@/components/shells/user-shell'
import { AdminLoginPage } from '@/pages/admin-login'
import { LoginPage } from '@/pages/login'
import { AuthCallbackPage } from '@/pages/auth-callback'
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
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />

                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <UserShell>
                          <UserHome />
                        </UserShell>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminShell>
                          <AdminHome />
                        </AdminShell>
                      </ProtectedRoute>
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
