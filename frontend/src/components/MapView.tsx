// The 3D map: a light map or Sentinel-2 satellite base, AWS Terrain Tiles relief, the flood layer,
// one glowing dot per village (size = people, colour = risk, pulsing ring when evacuation is needed) and name labels.
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { Lang, Report, Risk, Village, VillageCard } from '../api'
import { ago, int } from '../format'
import { X } from '../i18n-extra'

export type Basemap = 'map' | 'satellite'

const STYLE = 'https://tiles.openfreemap.org/styles/liberty'   // colourful, with 3D buildings
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const SATELLITE = 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg'
const BLANK = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// Opening view: the Supaul – Saharsa – Madhepura flood belt, close enough to see villages and channels.
const START: [[number, number], [number, number]] = [[86.42, 25.62], [87.12, 26.38]]
const LABELS_FROM_ZOOM = 8.5     // below this only towns and villages in the water's path are labelled
// Bihar plus a small margin: the map can't be panned away from the state.
const BIHAR_LIMITS: [[number, number], [number, number]] = [[82.6, 23.8], [89.0, 28.0]]

// Basemap (OpenFreeMap Liberty) label layers. Its place names would duplicate our own village/town/district
// labels (which also follow the language switch), so they are always hidden; road names only on satellite.
const PLACE_LABELS = ['label_village', 'label_other', 'label_town', 'label_city', 'label_city_capital']
const ROAD_LABELS = ['highway-name-path', 'highway-name-minor', 'highway-name-major',
  'highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us', 'poi_r20', 'poi_r7', 'poi_r1', 'poi_transit']

// Village dots: size grows with people (capped), calm villages are drawn smaller and paler.
const SIZE = ['min', 16, ['+', 3, ['*', ['sqrt', ['get', 'pop']], 0.08]]]
const CALM = ['match', ['feature-state', 'risk'], 'EVACUATE', 1, 'WATCH', 1, 0.42]
const PICKED = ['case', ['boolean', ['feature-state', 'selected'], false], 1.4, 1]
const radius = (k: number, extra: unknown = 0) => ['interpolate', ['linear'], ['zoom'],
  8, ['+', ['*', k * 0.7, SIZE, CALM, PICKED], extra], 12, ['+', ['*', k * 1.5, SIZE, CALM, PICKED], extra]] as unknown as maplibregl.ExpressionSpecification
const riskColor = (evac: string, watch: string, safe: string) =>
  ['match', ['feature-state', 'risk'], 'EVACUATE', evac, 'WATCH', watch, safe] as unknown as maplibregl.ExpressionSpecification

interface Props {
  tiles: [number, number, number, number][]   // flood overlay tiles: west, south, east, north
  villages: Village[]
  risk: Map<number, Risk>
  eta: Map<number, number>                    // hours until the water reaches each village (not during a replay)
  layer: string | null                        // flood layer prefix, e.g. /layers/flood_3.0
  basemap: Basemap
  selectedId: number | null
  // Loaded card: draw the shown route and destination pins; frame once per village + destination.
  focus: {
    villageId: number
    key: string
    route: VillageCard['route']
    eta: string                                                       // travel time shown on the route
    pins: { cat: string; icon: string; lon: number; lat: number; name: string; active: boolean }[]
  } | null
  lang: Lang
  onSelect: (id: number) => void
  showEmbankments: boolean
  reports: Report[]
  reportMode: boolean                       // next map click places a report
  draft: { lon: number; lat: number } | null
  onPick: (lon: number, lat: number) => void
}

const REPORT_ICON = { seepage: '💧', crack: '⚠️', breach: '🚨' } as const

function villagePoints(villages: Village[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: villages.map((v) => ({
      type: 'Feature',
      id: v.id,
      properties: { id: v.id, pop: v.pop },
      geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
    })),
  }
}

const villageName = (v: Village, lang: Lang) => (lang === 'en' ? v.name : (v.name_hi ?? v.name))

export function MapView({ tiles, villages, risk, eta, layer, basemap, selectedId, focus, lang, onSelect,
  showEmbankments, reports, reportMode, draft, onPick }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const labels = useRef(new Map<number, HTMLDivElement>())
  const roadLayers = useRef<{ id: string; color: unknown; opacity: unknown }[]>([])
  const districtLabels = useRef<HTMLDivElement[]>([])
  const pins = useRef<maplibregl.Marker[]>([])
  const fittedFor = useRef<string | null>(null)
  const pulseTimer = useRef<number | undefined>(undefined)
  const reportMarkers = useRef<maplibregl.Marker[]>([])
  const draftMarker = useRef<maplibregl.Marker | null>(null)
  const reportModeRef = useRef(reportMode)
  reportModeRef.current = reportMode
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  // Hide labels that would overlap a more important one: evacuate > watch > selected > town > district >
  // larger villages. Hidden labels keep their size (visibility: hidden), so every label can be measured.
  const declutter = () => {
    const rank = (el: HTMLDivElement) => {
      if (el.classList.contains('is-selected')) return 0
      if (el.dataset.risk === 'EVACUATE') return 1
      if (el.dataset.risk === 'WATCH') return 2
      if (el.classList.contains('is-town')) return 3
      if (el.classList.contains('dlabel')) return 4
      return 5
    }
    const all = [...labels.current.values(), ...districtLabels.current]
      .map((el) => ({ el, rank: rank(el), pop: Number(el.dataset.pop ?? 0), box: el.getBoundingClientRect() }))
      .filter((l) => l.box.width > 0)                      // display:none (not shown at this zoom)
      .sort((a, b) => a.rank - b.rank || b.pop - a.pop)
    const placed: DOMRect[] = []
    const gap = 3
    for (const l of all) {
      const hit = placed.some((p) => l.box.left < p.right + gap && l.box.right > p.left - gap
        && l.box.top < p.bottom + gap && l.box.bottom > p.top - gap)
      l.el.classList.toggle('is-hidden', hit)
      if (!hit) placed.push(l.box)
    }
  }
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

      // Plain map in the app's blue-white palette: pale silt land, soft blue water, quiet greens.
      for (const l of layers) {
        const sl = (l as { 'source-layer'?: string })['source-layer']
        if (l.type === 'background') map.setPaintProperty(l.id, 'background-color', '#F4F1EA')
        else if (l.type === 'fill' && sl === 'water') map.setPaintProperty(l.id, 'fill-color', '#BBD8E4')
        else if (l.type === 'fill' && (sl === 'landcover' || sl === 'landuse' || sl === 'park')) {
          map.setPaintProperty(l.id, 'fill-color', '#E8EEE4')
          map.setPaintProperty(l.id, 'fill-opacity', 0.75)
        }
      }

      // Satellite sits above the light map's land/water fills but below its roads and labels.
      map.addSource('satellite', { type: 'raster', tiles: [SATELLITE], tileSize: 256, maxzoom: 15,
        attribution: '<a href="https://s2maps.eu">Sentinel-2 cloudless 2023</a> by EOX (Copernicus Sentinel data)' })
      map.addLayer({ id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'none' },
        paint: { 'raster-saturation': -0.2, 'raster-contrast': 0.06, 'raster-brightness-max': 0.93 } }, firstLine)

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

      // Mapped dykes (OSM), coloured by how many people live on low ground close behind each stretch.
      map.addSource('embankments', { type: 'geojson', data: '/embankments.geojson' })
      const line = { 'line-join': 'round', 'line-cap': 'round' } as const
      map.addLayer({ id: 'embankments-casing', type: 'line', source: 'embankments', layout: line,
        paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 5.5, 13, 12] } }, firstSymbol)
      map.addLayer({ id: 'embankments', type: 'line', source: 'embankments', layout: line,
        paint: {
          'line-color': ['interpolate', ['linear'], ['get', 'people'], 0, '#3F7552', 1000, '#E0B93A', 2200, '#E0742A', 3400, '#B23A26'],
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3.5, 13, 8],
        } }, firstSymbol)
      const embPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'village-pop', offset: 10, maxWidth: '260px' })
      map.on('mousemove', 'embankments', (ev) => {
        const p = ev.features?.[0]?.properties as { rank: number; people: number } | undefined
        if (!p || reportModeRef.current) return
        map.getCanvas().style.cursor = 'help'
        embPopup.setLngLat(ev.lngLat).setHTML(`<span>${escapeHtml(X[langRef.current].embankPop(p.rank, int(p.people)))}</span>`).addTo(map)
      })
      map.on('mouseleave', 'embankments', () => {
        map.getCanvas().style.cursor = ''
        embPopup.remove()
      })

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

      for (const id of PLACE_LABELS) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')

      // Evacuation route, map-app style: white casing under a solid safety-green line (green, not blue,
      // so it never reads as floodwater).
      map.addSource('route', { type: 'geojson', data: EMPTY })
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#FFFFFF', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 6, 15, 12] } })
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#16A34A', 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 3.5, 15, 8] } })

      // Villages: a soft halo sized by people, an expanding ring for villages to evacuate, and a white-rimmed dot.
      map.addSource('villages', { type: 'geojson', data: villagePoints(villages), promoteId: 'id' })
      map.addLayer({ id: 'village-halo', type: 'circle', source: 'villages',
        paint: {
          'circle-radius': radius(1.9), 'circle-blur': 0.6,
          'circle-color': riskColor('#D64533', '#E8A317', '#7FAFC2'),
          'circle-opacity': ['match', ['feature-state', 'risk'], 'EVACUATE', 0.34, 'WATCH', 0.3, 0.1],
        } })
      map.addLayer({ id: 'village-pulse', type: 'circle', source: 'villages',
        paint: {
          'circle-radius': 0, 'circle-color': '#D64533', 'circle-opacity': 0,
          'circle-stroke-color': '#D64533', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0,
        } })
      map.addLayer({ id: 'village-dot', type: 'circle', source: 'villages',
        paint: {
          'circle-radius': radius(0.62),
          'circle-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#12357A',
            riskColor('#D64533', '#E8A317', '#FFFFFF')],
          'circle-stroke-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#FFFFFF',
            riskColor('#FFFFFF', '#FFFFFF', '#2F6B80')],
          'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, ['match', ['feature-state', 'risk'], 'EVACUATE', 2, 'WATCH', 2, 1.2]],
          'circle-opacity': ['match', ['feature-state', 'risk'], 'EVACUATE', 1, 'WATCH', 1, 0.7],
          'circle-stroke-opacity': ['match', ['feature-state', 'risk'], 'EVACUATE', 1, 'WATCH', 1, 0.7],
        } })
      // Expanding ring: one slow loop, only on villages to evacuate (skipped for reduced-motion).
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const start = performance.now()
        pulseTimer.current = window.setInterval(() => {
          const t = ((performance.now() - start) % 2000) / 2000
          const grow = ['match', ['feature-state', 'risk'], 'EVACUATE', 1, 0]
          map.setPaintProperty('village-pulse', 'circle-radius', radius(0.62, ['*', t * 22, grow]))
          map.setPaintProperty('village-pulse', 'circle-stroke-opacity', ['*', 0.85 * (1 - t), grow] as unknown as maplibregl.ExpressionSpecification)
        }, 70)
      }

      // Village names as HTML labels: the browser shapes Devanagari correctly, map text rendering does not.
      for (const v of villages) {
        const label = document.createElement('div')
        label.className = v.type === 'town' || v.type === 'city' ? 'vlabel is-town' : 'vlabel'
        label.innerHTML = '<span class="vl-name"></span><b class="vl-eta"></b>'
        label.querySelector('.vl-name')!.textContent = villageName(v, langRef.current)
        label.dataset.pop = String(v.pop)
        label.addEventListener('click', () => { if (!reportModeRef.current) onSelectRef.current(v.id) })
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
        declutter()
      })
      const zoomClass = () => el.current?.classList.toggle('labels-all', map.getZoom() >= LABELS_FROM_ZOOM)
      map.on('zoom', zoomClass)
      zoomClass()
      let frame = 0
      map.on('move', () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(declutter)
      })

      const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, className: 'village-pop', offset: 8 })
      map.on('mousemove', 'village-halo', (ev) => {
        const v = byId.current.get(Number(ev.features?.[0]?.id))
        if (!v) return
        map.getCanvas().style.cursor = 'pointer'
        popup.setLngLat([v.lon, v.lat]).setHTML(`<strong>${escapeHtml(villageName(v, langRef.current))}</strong><span>${int(v.pop)} 👤</span>`).addTo(map)
      })
      map.on('mouseleave', 'village-halo', () => {
        map.getCanvas().style.cursor = ''
        popup.remove()
      })
      map.on('click', 'village-halo', (ev) => {
        const id = Number(ev.features?.[0]?.id)
        if (id && !reportModeRef.current) onSelectRef.current(id)
      })
      map.on('click', (ev) => {
        if (reportModeRef.current) onPickRef.current(ev.lngLat.lng, ev.lngLat.lat)
      })
      setReady(true)
    })
    // Once the map has drawn, fetch every flood layer in the background so dragging the gauge never waits.
    map.once('idle', () => {
      for (let r = 0.5; r <= 10; r += 0.5) tiles.forEach((_, i) => { new Image().src = `/layers/flood_${r.toFixed(1)}_${i}.png` })
    })
    return () => { window.clearInterval(pulseTimer.current); map.remove() }
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
    for (const id of ROAD_LABELS) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', sat ? 'none' : 'visible')
    el.current?.classList.toggle('is-satellite', sat)
  }, [ready, basemap])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const v of villages) {
      const r = risk.get(v.id) ?? 'SAFE'
      map.setFeatureState({ source: 'villages', id: v.id }, { risk: r })
      const label = labels.current.get(v.id)
      if (label) {
        label.dataset.risk = r
        const h = eta.get(v.id)
        label.querySelector('.vl-eta')!.textContent = r !== 'SAFE' && h != null
          ? `${h < 1 ? '<1' : Math.round(h)}${langRef.current === 'en' ? 'h' : 'घं'}` : ''
      }
    }
    requestAnimationFrame(declutter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, risk, eta, lang, villages])

  useEffect(() => {
    for (const v of villages) {
      const label = labels.current.get(v.id)
      if (label) label.querySelector('.vl-name')!.textContent = villageName(v, lang)
    }
    for (const label of districtLabels.current) label.textContent = (lang === 'en' ? label.dataset.en : label.dataset.hi) ?? ''
    requestAnimationFrame(declutter)
  }, [ready, lang, villages])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || selectedId == null) return
    map.setFeatureState({ source: 'villages', id: selectedId }, { selected: true })
    const label = labels.current.get(selectedId)
    label?.classList.add('is-selected')
    requestAnimationFrame(declutter)
    return () => {
      map.setFeatureState({ source: 'villages', id: selectedId }, { selected: false })
      label?.classList.remove('is-selected')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedId])

  // Draw the selected village's route and shelter; frame them once per selection (not on every gauge change).
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const route = focus && focus.villageId === selectedId ? focus.route : null
    ;(map.getSource('route') as maplibregl.GeoJSONSource).setData(route
      ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.path } } : EMPTY)
    for (const p of pins.current) p.remove()
    pins.current = []
    if (focus && focus.villageId === selectedId) {
      for (const p of focus.pins) {
        const el = document.createElement('div')
        el.className = `dest-pin${p.active ? ' is-active' : ''}`
        el.innerHTML = `<span class="dest-pin-icon"><i>${p.icon}</i></span>${p.active ? `<span class="dest-pin-name">${escapeHtml(p.name)}</span>` : ''}`
        pins.current.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lon, p.lat]).addTo(map))
      }
      if (route && route.path.length > 1) {
        const mid = route.path[Math.floor(route.path.length / 2)]
        const bubble = document.createElement('div')
        bubble.className = 'eta-bubble'
        bubble.textContent = focus.eta
        pins.current.push(new maplibregl.Marker({ element: bubble, anchor: 'bottom', offset: [0, -6] }).setLngLat(mid).addTo(map))
      }
    }
    if (selectedId == null) { fittedFor.current = null; return }
    const fitKey = `${selectedId}:${focus?.key}`
    if (!focus || focus.villageId !== selectedId || fittedFor.current === fitKey) return
    fittedFor.current = fitKey
    const v = byId.current.get(selectedId)
    const pts: [number, number][] = route ? route.path : v ? [[v.lon, v.lat]] : []
    if (!pts.length) return
    const b = new maplibregl.LngLatBounds(pts[0], pts[0])
    for (const p of pts) b.extend(p)
    map.fitBounds(b, { padding: framePadding(), maxZoom: 13, duration: 900 })
  }, [ready, focus, selectedId, lang])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const id of ['embankments', 'embankments-casing']) {
      map.setLayoutProperty(id, 'visibility', showEmbankments ? 'visible' : 'none')
    }
  }, [ready, showEmbankments])

  // Leak reports as emoji pins; hovering shows what, when and that it is unverified.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    for (const m of reportMarkers.current) m.remove()
    const x = X[lang]
    reportMarkers.current = reports.map((r) => {
      const pin = document.createElement('div')
      pin.className = `report-pin kind-${r.kind}`
      pin.textContent = REPORT_ICON[r.kind]
      pin.title = `${x.reportKinds[r.kind]} · ${ago(r.time, lang)} · ${x.reportUnverified}${r.note ? `\n${r.note}` : ''}`
      return new maplibregl.Marker({ element: pin }).setLngLat([r.lon, r.lat]).addTo(map)
    })
  }, [ready, reports, lang])

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    draftMarker.current?.remove()
    draftMarker.current = null
    if (reportMode && draft) {
      const pin = document.createElement('div')
      pin.className = 'report-pin is-draft'
      pin.textContent = '📍'
      draftMarker.current = new maplibregl.Marker({ element: pin, anchor: 'bottom' }).setLngLat([draft.lon, draft.lat]).addTo(map)
    }
  }, [ready, reportMode, draft])

  useEffect(() => { el.current?.classList.toggle('is-reporting', reportMode) }, [reportMode])

  return <div ref={el} className="map" />
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

// Keep the flood belt visible between the panels: side panels on desktop, bottom panels on phones.
const isPhone = () => window.matchMedia('(max-width: 860px)').matches
function framePadding() {
  if (isPhone()) return { top: 70, bottom: Math.round(window.innerHeight * 0.5) + 16, left: 8, right: 64 }
  return { top: 70, bottom: 70, left: 470, right: 90 }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
