// Everyday objects at typical rural-Bihar heights, and a one-line depth comparison against them.
import type { Lang } from './api'
import { X } from './i18n-extra'
import type { IconName } from './icons'
import type { DepthObject } from './i18n-extra'

export const OBJECTS: { key: DepthObject; h: number; icon: IconName }[] = [
  { key: 'charpai', h: 0.45, icon: 'bed' },
  { key: 'goat', h: 0.7, icon: 'goat' },
  { key: 'motorbike', h: 1.1, icon: 'motorbike' },
  { key: 'cow', h: 1.4, icon: 'cow' },
  { key: 'adult', h: 1.65, icon: 'adult' },
  { key: 'door', h: 2.1, icon: 'door' },
  { key: 'house', h: 3.0, icon: 'house' },
]
export function depthSentence(depth: number, lang: Lang) {
  const x = X[lang]
  const below = [...OBJECTS].reverse().find((o) => o.h <= depth)
  const above = OBJECTS.find((o) => o.h > depth)
  if (!below) return x.belowAll(x.object[OBJECTS[0].key])
  if (!above) return x.aboveAll(x.object[below.key])
  return `${x.deeperThan(x.object[below.key])} · ${x.shallowerThan(x.object[above.key])}`
}
