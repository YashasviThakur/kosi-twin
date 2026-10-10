// Typed client for the Kosi Twin API (same origin: Vite proxy in dev, CloudFront in production).

export type Lang = 'en' | 'hi' | 'bho' | 'mai'
export type Risk = 'EVACUATE' | 'WATCH' | 'SAFE'

export interface StageStats {
  rise_m: number
  area_km2: number
  people: number
  elderly: number
  children: number
  villages: number
  road_km_cut: number
  shelters_flooded: number
}

export interface Meta {
  // bounds and each flood overlay tile: [west, south, east, north]
  grid: { bounds: [number, number, number, number]; layer_tiles: [number, number, number, number][] }
  stage_stats: StageStats[]
  rating_curve: { q0_lakh: number; d0_m: number; exponent: number }
  discharge_range_lakh: [number, number]
  languages: Record<Lang, string>
}

export interface Village {
  id: number
  name: string
  type: 'village' | 'hamlet' | 'town' | 'city'
  name_hi: string | null
  lon: number
  lat: number
  pop: number
  first_wet_stage_m: number | null
}

export interface Affected {
  id: number
  risk: Exclude<Risk, 'SAFE'>
  eta_h: number
  depth_m: number
}

export interface Scenario {
  discharge_lakh: number
  rise_m: number
  layer_url: string | null
  stats: StageStats
  affected: Affected[]
  top_villages: (Affected & Pick<Village, 'name' | 'name_hi' | 'pop' | 'lon' | 'lat'>)[]
}

export interface VillageCard {
  id: number
  name: string
  name_hi: string | null
  type: Village['type']
  lon: number
  lat: number
  pop: number
  elderly: number
  children: number
  risk: Risk
  reason?: 'outside_kosi_floodplain' | 'above_peak_water'   // only when SAFE
  peak_rise_m: number
  eta_h?: number
  eta_time?: string
  max_depth_m?: number
  max_depth_band?: ({ key: string } & Record<Lang, string>) | null
  edge_only?: boolean                                     // water reaches the outskirts, not the centre
  leave_by_h?: number | null
  leave_by_time?: string | null
  leave_now?: boolean
  needs_boat?: boolean
  route?: {
    shelter: { name: string; name_hi: string; kind: string; lon: number; lat: number }
    distance_km: number
    walk_min: number
    path: [number, number][]
  } | null
  options?: Partial<Record<'hospital' | 'school' | 'high_ground', {
    shelter: { name: string; name_hi: string; kind: string; lon: number; lat: number }
    distance_km: number
    walk_min: number
    path: [number, number][]
    leave_by_h: number
  }>>
  facilities_at_risk?: { name: string; kind: string; km: number; floods_at_rise_m: number }[]
  timeline?: { hours: number; time: string; depth_m: number; wet: boolean }[]
}

export interface MirrorDetect {
  size: [number, number]                        // pixels of the photo Rekognition analysed
  reference: { kind: string; ground_y: number; top_y: number; ref_height_m: number; box: [number, number, number, number] }
  reference_frac: { ground: number; top: number }   // 0–1 of the photo height
}

export type ReportKind = 'seepage' | 'crack' | 'breach'

export interface Report {
  id: string
  kind: ReportKind
  lon: number
  lat: number
  note: string
  time: number          // unix seconds
  status: 'unverified'
}

export type Advisory = Record<Lang, string> & { source: string }

export interface ReplayFrame {
  hours: number
  time: string
  discharge_lakh: number
  rise_m: number
  layer_url: string | null
  stats: StageStats
}

export interface LivePoint { date: string; m3s: number; pct: number; lakh: number; forecast: boolean }
export interface LiveFlow {
  source: string
  modelled: boolean
  today: string
  now: LivePoint & { rise_m: number }
  trend: 'rising' | 'falling' | 'steady'
  peak_ahead: LivePoint | null
  series: LivePoint[]
  note: string
}

export interface History {
  source: string
  modelled: boolean
  start: string                   // first day of `values`
  end: string
  today: string
  values: (number | null)[]       // modelled river flow, m3/s, one per day from `start`
  peak_2024_m3s: number           // the model's own reading for the 2024 flood
  reported_peak_lakh: number      // the reported 2024 peak, lakh cusecs
  note: string
}

export interface Replay {
  name: string
  note: string
  frames: ReplayFrame[]
  village_wet_h: Record<string, number>
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  meta: () => get<Meta>('/api/meta'),
  live: () => get<LiveFlow>('/api/live'),
  history: () => get<History>('/api/history'),
  status: () => get<{ aws: boolean; region: string; bucket: boolean; text_models: string[]; image_model: string }>('/api/status'),
  villages: () => get<Village[]>('/api/villages'),
  scenario: (discharge: number, signal?: AbortSignal) =>
    get<Scenario>(`/api/scenario?discharge=${discharge.toFixed(2)}`, signal),
  replay: (name: string) => get<Replay>(`/api/replay/${name}`),
  village: (id: number, scenario: ScenarioRef, signal?: AbortSignal) =>
    get<VillageCard>(`/api/villages/${id}?${scenarioQuery(scenario)}`, signal),
  advisory: (id: number, scenario: ScenarioRef, signal?: AbortSignal) =>
    get<Advisory>(`/api/villages/${id}/advisory?${scenarioQuery(scenario)}`, signal),
  reports: () => get<Report[]>('/api/reports'),
  addReport: async (kind: ReportKind, lon: number, lat: number, note: string): Promise<Report> => {
    const body = new FormData()
    body.set('kind', kind)
    body.set('lon', String(lon))
    body.set('lat', String(lat))
    body.set('note', note)
    const res = await fetch('/api/reports', { method: 'POST', body })
    if (!res.ok) throw new Error(`report → ${res.status}`)
    return res.json() as Promise<Report>
  },
  // Flood Mirror: where a door / person / motorbike for scale was found (null if none).
  mirrorDetect: async (photo: Blob): Promise<MirrorDetect | null> => {
    const body = new FormData()
    body.set('photo', photo, 'photo.jpg')
    const res = await fetch('/api/mirror/detect', { method: 'POST', body })
    if (!res.ok) throw new Error(`mirror/detect → ${res.status}`)
    const j = await res.json()
    return j.reference ? { size: j.size, reference: j.reference, reference_frac: j.reference_frac } : null
  },
  // Water painted onto the photo at a given depth; marks are fractions of the photo height.
  mirror: async (photo: Blob, o: { depth: number; label: string; ground: number; top: number; refHeight: number }) => {
    const body = new FormData()
    body.set('photo', photo, 'photo.jpg')
    body.set('depth_m', String(o.depth))
    body.set('label', o.label.slice(0, 60))
    body.set('ground_frac', String(o.ground))
    body.set('top_frac', String(o.top))
    body.set('ref_height_m', String(o.refHeight))
    const res = await fetch('/api/mirror', { method: 'POST', body })
    if (!res.ok) throw new Error(`mirror → ${res.status}`)
    return { blob: await res.blob(), engine: res.headers.get('X-Render') ?? '' }
  },
  audioUrl: (id: number, lang: Lang, scenario: ScenarioRef) =>
    `/api/villages/${id}/audio?lang=${lang}&${scenarioQuery(scenario)}`,
}

// Which flood a village card describes: a constant discharge from the gauge, or a recorded replay.
export type ScenarioRef = { discharge: number } | { replay: string }
const scenarioQuery = (s: ScenarioRef) =>
  'replay' in s ? `replay=${encodeURIComponent(s.replay)}` : `discharge=${s.discharge.toFixed(2)}`

// Same rating curve as the backend (kosi/hydro.py) so the gauge and counters react instantly while dragging.
export function riseFor(dischargeLakh: number, rc: Meta['rating_curve']): number {
  if (dischargeLakh <= rc.q0_lakh) return 0
  return rc.d0_m * ((dischargeLakh / rc.q0_lakh) ** rc.exponent - 1)
}

export function statsAt(rise: number, stages: StageStats[]): StageStats | null {
  let found: StageStats | null = null
  for (const s of stages) if (s.rise_m <= rise + 1e-9) found = s
  return found
}

// Flood overlay for a rise, as a file prefix: tiles are `${prefix}_0.png` … `${prefix}_3.png`.
export function layerPrefix(rise: number): string | null {
  const step = Math.round(rise * 2) / 2
  if (step < 0.5) return null
  return `/layers/flood_${Math.min(step, 10).toFixed(1)}`
}
