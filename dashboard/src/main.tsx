import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { IS_DEV_MODE } from '@/lib/dev-mode'

if (IS_DEV_MODE) {
  // Intercept fetch synchronously so the very first API call is mocked.
  const { installMockFetch } = await import('@/lib/mock/mock-fetch')
  installMockFetch()
  // eslint-disable-next-line no-console
  console.info('[demo] mock fetch installed — visit /login to start')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
