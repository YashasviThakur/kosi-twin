import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Landing } from './components/Landing.tsx'

// Two pages without a router: "#/app" is the planner, anything else is the landing page. Hash links need no server rules.
const inApp = () => window.location.hash.startsWith('#/app')

function Root() {
  const [app, setApp] = useState(inApp)
  useEffect(() => {
    const on = () => { setApp(inApp()); if (!window.location.hash.startsWith('#/app') && !['#how', '#record'].includes(window.location.hash)) window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return app ? <App /> : <Landing />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
