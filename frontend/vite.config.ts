import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In dev, the API and flood layers come from the local FastAPI server (uvicorn on :8000).
// In production CloudFront serves both from the same domain, so the app always uses relative URLs.
export default defineConfig({
  plugins: [react()],
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
