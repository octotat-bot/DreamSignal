import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSentry } from './lib/sentry'

// Initialize Sentry before mounting so it can catch errors thrown during
// React's initial render. No-ops if VITE_SENTRY_DSN isn't set.
initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
