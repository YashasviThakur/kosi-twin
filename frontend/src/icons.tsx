// One line-icon set for the whole app (24px grid, rounded 1.7px strokes, currentColor), replacing emoji so every
// icon looks the same on every phone. <Icon name="…" /> in React, iconSvg("…") for HTML strings (map markers).
export type IconName =
  | 'walk' | 'bike' | 'motorbike' | 'image' | 'camera' | 'ruler' | 'wave' | 'clock' | 'elder' | 'child' | 'road'
  | 'hospital' | 'school' | 'highground' | 'user' | 'pin' | 'drop' | 'alert' | 'siren' | 'bed' | 'goat' | 'cow'
  | 'adult' | 'door' | 'house' | 'sun' | 'cloud' | 'rain' | 'storm' | 'mountain'

const STICK = '<circle cx="12" cy="4.6" r="2"/><path d="M12 7.6v7M12 14.6l-3 6M12 14.6l3 6M8 11l4-2.2 4 2.2"/>'
const ANIMAL = '<path d="M4.5 9.5h11l3-3 2.5 1-1.6 3.4V19M15.5 19v-5M7.5 19v-5M11 19v-5M4.5 9.5V14"/>'

const PATHS: Record<IconName, string> = {
  walk: '<circle cx="13" cy="4.6" r="2"/><path d="M12.6 7.6l-2.4 5 3.2 2.4 1.2 5.4M10.2 12.6l-3 .9-1.2 3M12.6 7.6l3 2.4 2.4 1.4"/>',
  bike: '<circle cx="6" cy="16" r="3.6"/><circle cx="18" cy="16" r="3.6"/><path d="M6 16l4-8h5l3 8M10 8H7.5M15 8l-3 8"/>',
  motorbike: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M5.5 16.5l4-6.5h5l2.2 3.5M14.5 10l-1-3h-2.7M12 16.5h3.5"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10.2" r="1.6"/><path d="M4 17l5-5 4 4 3-3 4 4"/>',
  camera: '<path d="M4 8h3l1.6-2h6.8L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  ruler: '<path d="M4 16L16 4l4 4L8 20z"/><path d="M8 12l2 2M11 9l2 2M14 6l2 2"/>',
  wave: '<path d="M3 7.5c2.2-2 3.8-2 6 0s3.8 2 6 0 3.8-2 6 0M3 12.5c2.2-2 3.8-2 6 0s3.8 2 6 0 3.8-2 6 0M3 17.5c2.2-2 3.8-2 6 0s3.8 2 6 0 3.8-2 6 0"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.5 2"/>',
  elder: '<circle cx="9.5" cy="4.8" r="2"/><path d="M9.5 7.8v6.6M9.5 14.4l-2.6 6M9.5 14.4l2 6M6.5 11l3-1.6 2.6 1.4M17 20.5V12a2 2 0 10-4 0"/>',
  child: '<circle cx="12" cy="7" r="2.2"/><path d="M12 10.4v5M12 15.4l-2.2 4.6M12 15.4l2.2 4.6M8.8 13l3.2-1.6 3.2 1.6"/>',
  road: '<path d="M8.5 3L5 21M15.5 3L19 21M12 4v3M12 10v4M12 17v3"/>',
  hospital: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
  school: '<path d="M3 10l9-6 9 6M5 10v9.5h14V10M10 19.5v-5h4v5"/>',
  highground: '<path d="M2.5 19.5l6-10 4 6 2.2-3.2 6.8 7.2z"/><path d="M14.5 6h4M16.5 4v4"/>',
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/>',
  pin: '<path d="M12 21s6-5.6 6-11a6 6 0 10-12 0c0 5.4 6 11 6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  drop: '<path d="M12 3c3.6 4.2 6 7.2 6 10.5a6 6 0 11-12 0C6 10.2 8.4 7.2 12 3z"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.4M12 17.2v.1"/>',
  siren: '<path d="M7 19v-6a5 5 0 0110 0v6M5 19h14M12 3v2M4.6 6l1.6 1.6M19.4 6l-1.6 1.6"/>',
  bed: '<path d="M3 12h18v5H3zM5 17v3M19 17v3M3 12V8.5"/>',
  goat: ANIMAL + '<path d="M18 5.5l-.6-2M20.5 6.5l1-1.8"/>',
  cow: ANIMAL + '<path d="M18.5 6.2l-1-1.8M21 7.2l1.4-1.2M10 14.4h3"/>',
  adult: STICK,
  door: '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M14.6 12v.1"/>',
  house: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  cloud: '<path d="M6.5 18.5a4 4 0 01-.4-7.98 5.5 5.5 0 0110.6-1.2A4.1 4.1 0 0117 18.5z"/>',
  rain: '<path d="M6.5 14.5a4 4 0 01-.4-7.98 5.5 5.5 0 0110.6-1.2A4.1 4.1 0 0117 14.5z"/><path d="M8 17.5l-1 3M12 17.5l-1 3M16 17.5l-1 3"/>',
  storm: '<path d="M6.5 14.5a4 4 0 01-.4-7.98 5.5 5.5 0 0110.6-1.2A4.1 4.1 0 0117 14.5z"/><path d="M12.8 14.5l-2.6 3.8h3.6l-2.2 3.7"/>',
  mountain: '<path d="M2.5 19.5l6.5-11 4 6.5 2.5-3.5 6 8z"/>',
}

export const iconSvg = (name: IconName, size = '1em') =>
  `<svg class="icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${PATHS[name]}</svg>`

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PATHS[name] }} />
}
