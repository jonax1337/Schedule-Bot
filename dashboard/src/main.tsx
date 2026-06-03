import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { IS_DEV_MODE, applyDevAuth } from '@/lib/dev-mode'

if (IS_DEV_MODE) {
  // Set up the dev user + fake JWT before any React code reads localStorage.
  applyDevAuth()
  // Install the fetch interceptor synchronously so the first request is mocked too.
  const { installMockFetch } = await import('@/lib/mock/mock-fetch')
  installMockFetch()
  // eslint-disable-next-line no-console
  console.info('[dev-mode] mock fetch installed, browse freely without a backend')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
