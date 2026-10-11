// Kosi Twin service worker: the app keeps working when the phone loses its signal, with whatever was last loaded.
//  * the app itself (index.html, hashed JS/CSS, images, icons) is saved on first visit; HTML is network-first so a new release is picked up
//  * API data (live reading, villages, village cards, scenarios) is network-first: online you always get fresh data, offline the last copy
//  * flood layers and map tiles are saved as they are viewed (capped), so places you looked at still draw offline
//  * anything that writes (sign-ups, reports, photos) and the audio are never cached
// Bump VERSION to drop every old cache. This file must be served fresh (deploy.sh invalidates /sw.js).
const VERSION = 'kosi-v1'
const SHELL = `${VERSION}-shell`
const DATA = `${VERSION}-data`
const LAYERS = `${VERSION}-layers`
const TILES = `${VERSION}-tiles`
const CAP = { [DATA]: 250, [LAYERS]: 40, [TILES]: 600 }
// How long a slow network is waited for when a saved copy exists (a request with nothing saved always waits). The test hook lets tests shorten it.
const NETWORK_WAIT_MS = self.KOSI_NETWORK_WAIT_MS ?? 4000

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL)
    try {
      const res = await fetch('/', { cache: 'reload' })
      const html = await res.clone().text()
      await cache.put('/index.html', res)
      const assets = [...html.matchAll(/(?:src|href)="(\/(?:assets|img)\/[^"]+)"/g)].map((m) => m[1])
      const extras = ['/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/maplibre/maplibre-gl-worker.mjs']
      await Promise.all([...new Set([...assets, ...extras])].map((u) => cache.add(u).catch(() => {})))
    } catch { /* offline at install: the first online visit saves the rest as it loads */ }
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key)
    await self.clients.claim()
  })())
})

async function trim(name) {
  const cap = CAP[name]
  if (!cap) return
  const cache = await caches.open(name)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - cap; i++) await cache.delete(keys[i])      // oldest first
}

// Callers pass a clone made *before* the page starts reading the response: a body cannot be cloned once it is being read.
async function save(name, req, copy) {
  if (!copy || !(copy.ok || copy.type === 'opaque')) return
  const cache = await caches.open(name)
  await cache.put(req, copy)
  trim(name)
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('slow network')), ms)
    promise.then((v) => { clearTimeout(id); resolve(v) }, (e) => { clearTimeout(id); reject(e) })
  })
}

async function networkFirst(req, name, fallbackKey) {
  const cache = await caches.open(name)
  const net = fetch(req).then((res) => { save(name, req, res.clone()); return res })
  net.catch(() => {})                                           // if we answer from the saved copy, the late failure is not an error
  const saved = async () => (await cache.match(req)) || (fallbackKey && (await cache.match(fallbackKey))) || undefined
  const hit = await saved()
  if (!hit) return net                                          // nothing saved: wait for the network however long it takes
  try { return await withTimeout(net, NETWORK_WAIT_MS) } catch { return hit }   // saved copy when offline or slow; the fetch still refreshes it
}

async function cacheFirst(req, name) {
  const cache = await caches.open(name)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  save(name, req, res.clone())
  return res
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name)
  const hit = await cache.match(req)
  const refresh = fetch(req).then((res) => { save(name, req, res.clone()); return res }).catch(() => hit)
  return hit || refresh
}

const TILE_HOSTS = /(^|\.)(openfreemap\.org|openmaptiles\.org|eox\.at|amazonaws\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  if (url.origin === self.location.origin) {
    const p = url.pathname
    if (req.mode === 'navigate') return void event.respondWith(networkFirst(req, SHELL, '/index.html'))
    if (p === '/sw.js') return
    if (p.startsWith('/api/')) {
      if (/\/(audio|mirror)/.test(p)) return                       // large, personal, or not useful offline
      return void event.respondWith(networkFirst(req, DATA))
    }
    if (p.startsWith('/layers/')) return void event.respondWith(cacheFirst(req, LAYERS))
    if (/^\/(assets|maplibre)\//.test(p)) return void event.respondWith(cacheFirst(req, SHELL))
    if (/^\/(img|samples)\//.test(p) || /\.(png|svg|webmanifest|geojson|ico)$/.test(p)) return void event.respondWith(staleWhileRevalidate(req, SHELL))
    return
  }
  if (TILE_HOSTS.test(url.hostname)) event.respondWith(cacheFirst(req, TILES))        // tiles rarely change: no background refetch
})
