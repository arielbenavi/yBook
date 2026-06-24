import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App.tsx'
import './index.css'

// reducedMotion="user" → Framer Motion reads the user's prefers-reduced-motion
// preference and drops every animated transition to its end state. Non-
// negotiable for a11y; this is the single switch that makes every motion
// component in the tree honor it.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
