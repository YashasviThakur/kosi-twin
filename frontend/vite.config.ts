import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

// MapLibre 6 runs in a web worker that is a separate file in its package. The production build does not copy it,
// so ship it ourselves (the app points MapLibre at /maplibre/maplibre-gl-worker.mjs, see MapView.tsx).
const maplibreWorker = (): Plugin => ({
  name: 'maplibre-worker',
  generateBundle() {
    this.emitFile({
      type: 'asset', fileName: 'maplibre/maplibre-gl-worker.mjs',
      source: readFileSync(fileURLToPath(new URL('./node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url))),
    })
  },
})

// In dev, the API and flood layers come from the local FastAPI server (uvicorn on :8000).
// In production CloudFront serves both from the same domain, so the app always uses relative URLs.
export default defineConfig({
  plugins: [react(), maplibreWorker()],
  // MapLibre 6 loads its web worker relative to its own module file; pre-bundling moves that file and breaks the path.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: {
    host: '127.0.0.1',   // listen on IPv4 too; Node otherwise may bind only [::1] and browsers can't reach "localhost"
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/layers': 'http://127.0.0.1:8000',
    },
  },
})
