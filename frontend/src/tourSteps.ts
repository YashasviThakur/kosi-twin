// What the guided tour points at, in order. The wording for each step is in i18n-more.ts (tour.steps), in the same order.
export interface TourStep {
  target: string | null             // CSS selector of what to light up (the first match that is on screen); null = a caption in the middle
  village?: boolean                 // needs a village card open
  sample?: boolean                  // needs some village to flood: if the real river is too low the tour uses a what-if level
}

export const TOUR_STEPS: TourStep[] = [
  { target: null },
  { target: '.sb-top .search' },
  { target: '.gauge-panel .gauge' },
  { target: '.live-strip' },
  { target: '.floods-card' },
  { target: '.vlist', sample: true },
  { target: '.shelter-load', sample: true },
  { target: '.tl-card, .vc-leave', village: true, sample: true },
  { target: '.vc-depthline', village: true, sample: true },
  { target: '.vc-tabs', village: true, sample: true },
  { target: '.vc-actions', village: true, sample: true },
  { target: '.alert-signup', village: true, sample: true },
  { target: '.round-accent' },
  { target: '.map-controls' },
  { target: '.sb-collapse, .sheet-handle' },                    // the button on a computer, the drag bar on a phone
  { target: null },
]
