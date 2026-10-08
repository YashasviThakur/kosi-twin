// Everyday objects at typical rural-Bihar heights, and a one-line depth comparison against them.
import type { Lang } from './api'
import { X } from './i18n-extra'
import type { DepthObject } from './i18n-extra'

export const OBJECTS: { key: DepthObject; h: number; icon: string }[] = [
  { key: 'charpai', h: 0.45, icon: '🛏️' },
  { key: 'goat', h: 0.7, icon: '🐐' },
  { key: 'motorbike', h: 1.1, icon: '🏍️' },
  { key: 'cow', h: 1.4, icon: '🐄' },
  { key: 'adult', h: 1.65, icon: '🧍' },
  { key: 'door', h: 2.1, icon: '🚪' },
  { key: 'house', h: 3.0, icon: '🏠' },
]
export function depthSentence(depth: number, lang: Lang) {
  const x = X[lang]
  const below = [...OBJECTS].reverse().find((o) => o.h <= depth)
  const above = OBJECTS.find((o) => o.h > depth)
  if (!below) return x.belowAll(x.object[OBJECTS[0].key])
  if (!above) return x.aboveAll(x.object[below.key])
  return `${x.deeperThan(x.object[below.key])} · ${x.shallowerThan(x.object[above.key])}`
}
