// The 3D map: light basemap, AWS Terrain Tiles relief, the flood layer, and one column per village
// (height = people, colour = risk).
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { Lang, Risk, Village } from '../api'
import { int } from '../format'

const STYLE = 'https://tiles.openfreemap.org/styles/positron'
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

const RISK_COLOR: Record<Risk, string> = { EVACUATE: '#B23A26', WATCH: '#9A6512', SAFE: '#CFCAC0' }

interface Props {
  bounds: [number, number, number, number]
  villages: Village[]
  risk: Map<number, Risk>
  layerUrl: string | null
  selectedId: number | null
  lang: Lang
  onSelect: (id: number) => void
}

function columns(villages: Village[]): FeatureCollection {
  const half = 0.0045 // ~500 m
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

export function MapView({ bounds, villages, risk, layerUrl, selectedId, lang, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)
  const byId = useRef(new Map<number, Village>())
  byId.current = new Map(villages.map((v) => [v.id, v]))
  const langRef = useRef(lang)
  langRef.current = lang
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const [w, s, e, n] = bounds
    const map = new maplibregl.Map({
      container: el.current!,
      style: STYLE,
      bounds: [[w, s], [e, n]],
      fitBoundsOptions: { padding: framePadding() },
      pitch: 48,
      bearing: -10,
      maxPitch: 70,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    if (!isPhone()) map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right')

    map.on('load', () => {
      const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
      const dem = { type: 'raster-dem' as const, tiles: [TERRARIUM], encoding: 'terrarium' as const, tileSize: 256, maxzoom: 12,
        attribution: 'Terrain: <a href="https://registry.opendata.aws/terrain-tiles/">AWS Terrain Tiles</a>' }
      map.addSource('terrain', dem)
      map.addSource('shade', dem)
      map.setTerrain({ source: 'terrain', exaggeration: 2 })
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'shade',
        paint: { 'hillshade-exaggeration': 0.3, 'hillshade-shadow-color': '#5A6B71', 'hillshade-highlight-color': '#F8F6F1' } }, firstSymbol)

      map.addSource('flood', { type: 'image', url: BLANK, coordinates: [[w, n], [e, n], [e, s], [w, s]] })
      map.addLayer({ id: 'flood', type: 'raster', source: 'flood',
        paint: { 'raster-opacity': 0.92, 'raster-fade-duration': 0 } }, firstSymbol)

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

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'village-pop', offset: 8 })
      map.on('mousemove', 'village-cols', (ev) => {
        const v = byId.current.get(Number(ev.features?.[0]?.id))
        if (!v) return
        map.getCanvas().style.cursor = 'pointer'
        const name = langRef.current === 'en' ? v.name : (v.name_hi ?? v.name)
        popup.setLngLat([v.lon, v.lat]).setHTML(`<strong>${escapeHtml(name)}</strong><span>${int(v.pop)} 👤</span>`).addTo(map)
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
      for (let r = 0.5; r <= 10; r += 0.5) new Image().src = `/layers/flood_${r.toFixed(1)}.png`
    })
    return () => map.remove()
    // The map is created once; data changes flow through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const src = map.getSource('flood') as maplibregl.ImageSource
    src.updateImage({ url: layerUrl ?? BLANK })
  }, [ready, layerUrl])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const v of villages) map.setFeatureState({ source: 'villages', id: v.id }, { risk: risk.get(v.id) ?? 'SAFE' })
  }, [ready, risk, villages])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || selectedId == null) return
    map.setFeatureState({ source: 'villages', id: selectedId }, { selected: true })
    return () => { map.setFeatureState({ source: 'villages', id: selectedId }, { selected: false }) }
  }, [ready, selectedId])

  return <div ref={el} className="map" />
}

// Keep the Kosi visible between the panels: side panels on desktop, bottom panels on phones.
const isPhone = () => window.matchMedia('(max-width: 860px)').matches
function framePadding() {
  if (isPhone()) return { top: 110, bottom: Math.round(window.innerHeight * 0.52) + 16, left: 8, right: 8 }
  return { top: 40, bottom: 40, left: 260, right: 340 }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
