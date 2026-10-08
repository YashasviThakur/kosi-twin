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

export interface ReplayFrame {
  hours: number
  time: string
  discharge_lakh: number
  rise_m: number
  layer_url: string | null
  stats: StageStats
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
  villages: () => get<Village[]>('/api/villages'),
  scenario: (discharge: number, signal?: AbortSignal) =>
    get<Scenario>(`/api/scenario?discharge=${discharge.toFixed(2)}`, signal),
  replay: (name: string) => get<Replay>(`/api/replay/${name}`),
}

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
