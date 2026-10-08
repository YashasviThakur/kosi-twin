// The 3D map: a light map or Sentinel-2 satellite base, AWS Terrain Tiles relief, the flood layer,
// one column per village (height = people, colour = risk) and village name labels.
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { Lang, Risk, Village } from '../api'
import { int } from '../format'

export type Basemap = 'map' | 'satellite'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const SATELLITE = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg'
const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// Opening view: the Supaul – Saharsa – Madhepura flood belt, close enough to see villages and channels.
const START: [[number, number], [number, number]] = [[86.42, 25.62], [87.12, 26.38]]
const LABELS_FROM_ZOOM = 9.6     // below this only villages in the water's path are labelled

const RISK_COLOR: Record<Risk, string> = { EVACUATE: '#B23A26', WATCH: '#9A6512', SAFE: '#CFCAC0' }

interface Props {
  tiles: [number, number, number, number][]   // flood overlay tiles: west, south, east, north
  villages: Village[]
  risk: Map<number, Risk>
  layer: string | null                        // flood layer prefix, e.g. /layers/flood_3.0
  basemap: Basemap
  selectedId: number | null
  lang: Lang
  onSelect: (id: number) => void
}

function columns(villages: Village[]): FeatureCollection {
  const half = 0.0035 // ~400 m
  return {
    type: 'FeatureCollection',
    features: villages.map((v) => ({
      type: 'Feature',
      id: v.id,
      properties: { id: v.id, h: 300 + Math.sqrt(v.pop) * 28 },
      geometry: {
        type: 'Polygon',
        coordinates: [[[v.lon - half, v.lat - half], [v.lon + half, v.lat - half], [v.lon + half, v.lat + half],
          [v.lon - half, v.lat + half], [v.lon - half, v.lat - half]]],
      },
    })),
  }
}

const villageName = (v: Village, lang: Lang) => (lang === 'en' ? v.name : (v.name_hi ?? v.name))

export function MapView({ tiles, villages, risk, layer, basemap, selectedId, lang, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const labels = useRef(new Map<number, HTMLDivElement>())
  const [ready, setReady] = useState(false)
  const byId = useRef(new Map<number, Village>())
  byId.current = new Map(villages.map((v) => [v.id, v]))
  const langRef = useRef(lang)
  langRef.current = lang
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const map = new maplibregl.Map({
      container: el.current!,
      style: STYLE,
      bounds: START,
      fitBoundsOptions: { padding: framePadding() },
      pitch: 50,
      bearing: -10,
      maxPitch: 70,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    if (!isPhone()) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')

    map.on('load', () => {
      const layers = map.getStyle().layers
      const firstLine = layers.find((l) => l.type === 'line')?.id
      const firstSymbol = layers.find((l) => l.type === 'symbol')?.id

      // Satellite sits above the light map's land/water fills but below its roads and labels.
      map.addSource('satellite', { type: 'raster', tiles: [SATELLITE], tileSize: 256, maxzoom: 15,
        attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless 2023</a> by EOX (Copernicus Sentinel data)' })
      map.addLayer({ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' },
        paint: { 'raster-saturation': -0.2, 'raster-contrast': 0.05 } }, firstLine)

      const dem = { type: 'raster-dem' as const, tiles: [TERRARIUM], encoding: 'terrarium' as const, tileSize: 256, maxzoom: 12,
        attribution: 'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/">AWS Terrain Tiles</a>' }
      map.addSource('terrain', dem)
      map.addSource('shade', dem)
      map.setTerrain({ source: 'terrain', exaggeration: 2 })
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'shade',
        paint: { 'hillshade-exaggeration': 0.3, 'hillshade-shadow-color': '#5A6B71', 'hillshade-highlight-color': '#F8F6F1' } }, firstSymbol)

      tiles.forEach(([w, s, e, n], i) => {
        map.addSource(`flood-${i}`, { type: 'image', url: BLANK, coordinates: [[w, n], [e, n], [e, s], [w, s]] })
        map.addLayer({ id: `flood-${i}`, type: 'raster', source: `flood-${i}`,
          paint: { 'raster-opacity': 0.92, 'raster-fade-duration': 0 } }, firstSymbol)
      })

      map.addSource('villages', { type: 'geojson', data: columns(villages), promoteId: 'id' })
      map.addLayer({
        id: 'village-cols', type: 'fill-extrusion', source: 'villages',
        paint: {
          'fill-extrusion-color': ['case',
            ['boolean', ['feature-state', 'selected'], false], '#1E2F36',
            ['match', ['feature-state', 'risk'], 'EVACUATE', RISK_COLOR.EVACUATE, 'WATCH', RISK_COLOR.WATCH, RISK_COLOR.SAFE]],
          // Unaffected villages stay as short stubs; columns rise to full height when water reaches them.
          'fill-extrusion-height': ['*', ['get', 'h'],
            ['match', ['feature-state', 'risk'], 'EVACUATE', 1, 'WATCH', 1, 0.18]],
          'fill-extrusion-height-transition': { duration: 500, delay: 0 },
          'fill-extrusion-color-transition': { duration: 300, delay: 0 },
          'fill-extrusion-opacity': 0.94,
          'fill-extrusion-vertical-gradient': true,
        },
      })

      // Village names as HTML labels: the browser shapes Devanagari correctly, map text rendering does not.
      for (const v of villages) {
        const label = document.createElement('div')
        label.className = 'vlabel'
        label.textContent = villageName(v, langRef.current)
        label.addEventListener('click', () => onSelectRef.current(v.id))
        labels.current.set(v.id, label)
        new maplibregl.Marker({ element: label, anchor: 'left', offset: [10, 0] }).setLngLat([v.lon, v.lat]).addTo(map)
      }
      const zoomClass = () => el.current?.classList.toggle('labels-all', map.getZoom() >= LABELS_FROM_ZOOM)
      map.on('zoom', zoomClass)
      zoomClass()

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'village-pop', offset: 8 })
      map.on('mousemove', 'village-cols', (ev) => {
        const v = byId.current.get(Number(ev.features?.[0]?.id))
        if (!v) return
        map.getCanvas().style.cursor = 'pointer'
        popup.setLngLat([v.lon, v.lat]).setHTML(`<strong>${escapeHtml(villageName(v, langRef.current))}</strong><span>${int(v.pop)} 👤</span>`).addTo(map)
      })
      map.on('mouseleave', 'village-cols', () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })
      map.on('click', 'village-cols', (ev) => {
        const id = Number(ev.features?.[0]?.id)
        if (id) onSelectRef.current(id)
      })
      setReady(true)
    })
    // Once the map has drawn, fetch every flood layer in the background so dragging the gauge never waits.
    map.once('idle', () => {
      for (let r = 0.5; r <= 10; r += 0.5) tiles.forEach((_, i) => { new Image().src = `/layers/flood_${r.toFixed(1)}_${i}.png` })
    })
    return () => map.remove()
    // The map is created once; data changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    tiles.forEach((_, i) => {
      (map.getSource(`flood-${i}`) as maplibregl.ImageSource).updateImage({ url: layer ? `${layer}_${i}.png` : BLANK })
    })
  }, [ready, layer, tiles])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const sat = basemap === 'satellite'
    map.setLayoutProperty('satellite', 'visibility', sat ? 'visible' : 'none')
    map.setLayoutProperty('hillshade', 'visibility', sat ? 'none' : 'visible')
    el.current?.classList.toggle('is-satellite', sat)
  }, [ready, basemap])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const v of villages) {
      const r = risk.get(v.id) ?? 'SAFE'
      map.setFeatureState({ source: 'villages', id: v.id }, { risk: r })
      const label = labels.current.get(v.id)
      if (label) label.dataset.risk = r
    }
  }, [ready, risk, villages])

  useEffect(() => {
    for (const v of villages) {
      const label = labels.current.get(v.id)
      if (label) label.textContent = villageName(v, lang)
    }
  }, [ready, lang, villages])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || selectedId == null) return
    map.setFeatureState({ source: 'villages', id: selectedId }, { selected: true })
    labels.current.get(selectedId)?.classList.add('is-selected')
    return () => {
      map.setFeatureState({ source: 'villages', id: selectedId }, { selected: false })
      labels.current.get(selectedId)?.classList.remove('is-selected')
    }
  }, [ready, selectedId])

  return <div ref={el} className="map" />
}

// Keep the flood belt visible between the panels: side panels on desktop, bottom panels on phones.
const isPhone = () => window.matchMedia('(max-width: 860px)').matches
function framePadding() {
  if (isPhone()) return { top: 110, bottom: Math.round(window.innerHeight * 0.52) + 16, left: 8, right: 8 }
  return { top: 60, bottom: 40, left: 260, right: 350 }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
