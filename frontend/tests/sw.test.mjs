// Tests the service worker (public/sw.js) without a browser: it is loaded with a fake caches / fetch / self, then given fetch events.
// Run: node --test tests/sw.test.mjs
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

class FakeCache {
  constructor() { this.map = new Map() }
  async match(req) { const r = this.map.get(typeof req === 'string' ? req : req.url ?? String(req)); return r ? r.clone() : undefined }
  async put(req, res) {
    await new Promise((r) => setTimeout(r, 3))                     // real cache writes take a moment
    if (res.bodyUsed) throw new TypeError('body already used')
    this.map.set(typeof req === 'string' ? req : req.url, res)
  }
  async add(url) { this.map.set(url, new Response('x')) }
  async keys() { return [...this.map.keys()].map((url) => ({ url })) }
  async delete(req) { return this.map.delete(typeof req === 'string' ? req : req.url) }
}

function load({ online }) {
  const store = new Map()
  const listeners = {}
  const origin = 'https://site.test'
  const net = { online }
  const fakeFetch = async (req) => {
    if (!net.online) throw new TypeError('offline')
    const url = typeof req === 'string' ? req : req.url
    return new Response(`net:${url}`, { status: 200 })
  }
  const sandbox = {
    self: { location: { origin }, addEventListener: (type, fn) => { listeners[type] = fn }, skipWaiting: async () => {}, clients: { claim: async () => {} } },
    caches: {
      open: async (n) => { await new Promise((r) => setTimeout(r, 3)); if (!store.has(n)) store.set(n, new FakeCache()); return store.get(n) },
      keys: async () => [...store.keys()], delete: async (n) => store.delete(n),
    },
    fetch: fakeFetch, Response, URL, Promise, setTimeout, clearTimeout, console,
  }
  vm.runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), sandbox)
  const ask = async (path, { method = 'GET', mode = 'cors', host = origin } = {}) => {
    const request = { url: `${host}${path}`, method, mode }
    let result
    listeners.fetch({ request, respondWith: (p) => { result = p } })
    return result ? await result : undefined
  }
  return { ask, net, store, origin }
}

test('API data is fresh online and the saved copy is served offline', async () => {
  const sw = load({ online: true })
  const fresh = await sw.ask('/api/villages')
  assert.equal(await fresh.text(), 'net:https://site.test/api/villages')
  await new Promise((r) => setTimeout(r, 40))                        // the copy is saved in the background
  sw.net.online = false
  const saved = await sw.ask('/api/villages')
  assert.equal(await saved.text(), 'net:https://site.test/api/villages')
  await assert.rejects(sw.ask('/api/never-loaded'))                  // nothing saved, nothing to serve
})

test('navigation falls back to the saved index.html offline', async () => {
  const sw = load({ online: true })
  await sw.ask('/', { mode: 'navigate' })                            // an online visit saves the page itself
  await new Promise((r) => setTimeout(r, 40))
  const cache = sw.store.get('kosi-v1-shell')
  await cache.put('/index.html', new Response('<html>app</html>'))   // what install() saves
  sw.net.online = false
  assert.equal(await (await sw.ask('/', { mode: 'navigate' })).text(), 'net:https://site.test/')            // the saved copy of a page that was visited
  assert.equal(await (await sw.ask('/never/opened', { mode: 'navigate' })).text(), '<html>app</html>')       // any other page opens the app shell
})

test('writes, audio and the worker itself are never intercepted', async () => {
  const sw = load({ online: true })
  assert.equal(await sw.ask('/api/alerts/subscribe', { method: 'POST' }), undefined)
  assert.equal(await sw.ask('/api/villages/1/audio?lang=hi'), undefined)
  assert.equal(await sw.ask('/api/mirror'), undefined)
  assert.equal(await sw.ask('/sw.js'), undefined)
})

test('map tiles and flood layers are saved once and reused offline', async () => {
  const sw = load({ online: true })
  const tile = '/12/3000/1700.png'
  await sw.ask(tile, { host: 'https://tiles.openfreemap.org' })
  await sw.ask('/layers/flood_3.0_0.png?v4')
  await new Promise((r) => setTimeout(r, 40))
  sw.net.online = false
  assert.match(await (await sw.ask(tile, { host: 'https://tiles.openfreemap.org' })).text(), /^net:/)
  assert.match(await (await sw.ask('/layers/flood_3.0_0.png?v4')).text(), /^net:/)
  assert.equal(await sw.ask('/elsewhere/page', { host: 'https://other.example' }), undefined)   // unrelated sites are left alone
})
