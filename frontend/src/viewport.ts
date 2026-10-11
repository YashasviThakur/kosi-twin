// Whether the screen is wide enough for the side panel (above 860 px); below that the panel is a bottom sheet (see App.css).
import { useSyncExternalStore } from 'react'

const WIDE = '(min-width: 861px)'
const subscribe = (notify: () => void) => {
  const mq = window.matchMedia(WIDE)
  mq.addEventListener('change', notify)
  return () => mq.removeEventListener('change', notify)
}

export const useWide = () => useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => true)
