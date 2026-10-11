// Whether the browser thinks it has a connection (the service worker, public/sw.js, serves saved data when it does not).
import { useSyncExternalStore } from 'react'

const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
  return () => { window.removeEventListener('online', notify); window.removeEventListener('offline', notify) }
}

export const useOnline = () => useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
