// The 3D map: a light map or Sentinel-2 satellite base, AWS Terrain Tiles relief, the flood layer,
// one column per village (height = people, colour = risk) and village name labels.
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
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
const LABELS_FROM_ZOOM = 8.5     // below this only towns and villages in the water's path are labelled
// Bihar plus a small margin: the map can't be panned away from the state.
const BIHAR_LIMITS: [[number, number], [number, number]] = [[82.6, 23.8], [89.0, 28.0]]

// Basemap (OpenFreeMap Positron) label layers: city/town names we restyle, and ones we hide on satellite.
const PLACE_LABELS = ['label_city', 'label_city_capital', 'label_town', 'label_state']
const CLUTTER_LABELS = ['label_village', 'label_other', 'highway-name-path', 'highway-name-minor', 'highway-name-major',
  'highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us']

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
  const placeLayers = useRef<{ id: string; size: unknown }[]>([])
  const roadLayers = useRef<{ id: string; color: unknown; opacity: unknown }[]>([])
  const districtLabels = useRef<HTMLDivElement[]>([])
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
      pitch: 35,
      bearing: -6,
      maxPitch: 70,
      maxBounds: BIHAR_LIMITS,
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
        paint: { 'raster-saturation': 0.12, 'raster-contrast': 0.08 } }, firstLine)

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
          paint: { 'raster-opacity': 1, 'raster-fade-duration': 0 } }, firstSymbol)
      })

      // District boundaries and the main Kosi channel, drawn over the flood.
      map.addSource('districts', { type: 'geojson', data: '/districts.geojson' })
      map.addLayer({ id: 'districts', type: 'line', source: 'districts',
        paint: { 'line-color': '#5A6B71', 'line-width': 1, 'line-opacity': 0.55 } }, firstSymbol)
      map.addSource('kosi', { type: 'geojson', data: '/kosi.geojson' })
      map.addLayer({ id: 'kosi', type: 'line', source: 'kosi', layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#12357A', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.5, 12, 4], 'line-opacity': 0.85 } }, firstSymbol)

      // Roads: remember the light map's colours so switching back from satellite restores them.
      roadLayers.current = layers
        .filter((l) => l.type === 'line' && (l as { 'source-layer'?: string })['source-layer'] === 'transportation')
        .map((l) => ({ id: l.id, color: map.getPaintProperty(l.id, 'line-color'), opacity: map.getPaintProperty(l.id, 'line-opacity') }))

      // Dim everything outside Bihar (above the basemap and its labels) and outline the state.
      map.addSource('outside-bihar', { type: 'geojson', data: '/bihar-mask.geojson' })
      map.addLayer({ id: 'outside-bihar', type: 'fill', source: 'outside-bihar',
        paint: { 'fill-color': '#F8F6F1', 'fill-opacity': 0.86 } })
      map.addLayer({ id: 'bihar-outline', type: 'line', source: 'outside-bihar',
        paint: { 'line-color': '#1B4352', 'line-width': 1.6, 'line-opacity': 0.7 } })

      // Remember the basemap's city/town name sizes so the satellite view can enlarge them.
      placeLayers.current = layers.filter((l) => PLACE_LABELS.includes(l.id))
        .map((l) => ({ id: l.id, size: map.getLayoutProperty(l.id, 'text-size') }))

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
        label.className = v.type === 'town' || v.type === 'city' ? 'vlabel is-town' : 'vlabel'
        label.textContent = villageName(v, langRef.current)
        label.addEventListener('click', () => onSelectRef.current(v.id))
        labels.current.set(v.id, label)
        new maplibregl.Marker({ element: label, anchor: 'left', offset: [10, 0] }).setLngLat([v.lon, v.lat]).addTo(map)
      }
      // District names (HTML for correct Devanagari), larger and quieter than village names.
      fetch('/district-labels.geojson').then((r) => r.json()).then((fc: FeatureCollection) => {
        for (const f of fc.features) {
          const label = document.createElement('div')
          label.className = 'dlabel'
          const props = f.properties as { name: string; name_hi: string | null }
          label.dataset.en = props.name
          label.dataset.hi = props.name_hi ?? props.name
          label.textContent = langRef.current === 'en' ? props.name : label.dataset.hi
          districtLabels.current.push(label)
          new maplibregl.Marker({ element: label }).setLngLat((f.geometry as Point).coordinates as [number, number]).addTo(map)
        }
      })
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
    // Satellite look: vivid imagery with relief shading, white district lines, orange roads, and the
    // blue flood ramp over a navy channel. Outside Bihar is only lightly dimmed so the Himalayan relief shows.
    const paint: [string, string, unknown, unknown][] = [
      ['hillshade', 'hillshade-exaggeration', 0.55, 0.3],
      ['hillshade', 'hillshade-shadow-color', '#0B1A20', '#5A6B71'],
      ['hillshade', 'hillshade-highlight-color', 'rgba(255,255,255,0.18)', '#F8F6F1'],
      ['outside-bihar', 'fill-color', '#0B1A20', '#F8F6F1'],
      ['outside-bihar', 'fill-opacity', 0.38, 0.86],
      ['bihar-outline', 'line-color', '#FFFFFF', '#1B4352'],
      ['bihar-outline', 'line-width', 2.2, 1.6],
      ['districts', 'line-color', '#FFFFFF', '#5A6B71'],
      ['districts', 'line-opacity', 0.75, 0.55],
      ['kosi', 'line-color', '#0E2A66', '#12357A'],
    ]
    // The table mixes properties of different layer types, so it goes through a loosely typed setter.
    const setPaint = map.setPaintProperty.bind(map) as (id: string, prop: string, value: unknown) => void
    for (const [id, prop, satValue, mapValue] of paint) setPaint(id, prop, sat ? satValue : mapValue)
    for (const { id, color, opacity } of roadLayers.current) {
      setPaint(id, 'line-color', sat ? '#F0A35E' : color)
      setPaint(id, 'line-opacity', sat ? 0.8 : opacity)
    }
    // City and town names: white with a dark outline on satellite, ink on the light map; larger either way.
    for (const { id, size } of placeLayers.current) {
      map.setPaintProperty(id, 'text-color', sat ? '#FFFFFF' : '#1E2F36')
      map.setPaintProperty(id, 'text-halo-color', sat ? 'rgba(30,47,54,0.9)' : 'rgba(255,255,255,0.95)')
      map.setPaintProperty(id, 'text-halo-width', 1.6)
      if (size !== undefined) map.setLayoutProperty(id, 'text-size', scaleSize(size, 1.25))
    }
    // The basemap's own village/hamlet names and road names duplicate our labels: hide them on satellite.
    for (const id of CLUTTER_LABELS) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', sat ? 'none' : 'visible')
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
    for (const label of districtLabels.current) label.textContent = (lang === 'en' ? label.dataset.en : label.dataset.hi) ?? ''
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

// Scale a style's text-size, which may be a number, a legacy {stops} function, or a zoom
// interpolate expression (zoom expressions can't be wrapped in ['*', …], so scale each output instead).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scaleSize(size: any, k: number): any {
  if (typeof size === 'number') return size * k
  if (size && Array.isArray(size.stops)) return { ...size, stops: size.stops.map(([z, v]: [number, number]) => [z, v * k]) }
  if (Array.isArray(size) && size[0] === 'interpolate') {
    return [...size.slice(0, 3), ...size.slice(3).map((v: unknown, i: number) => (i % 2 === 1 && typeof v === 'number' ? v * k : v))]
  }
  return size
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
