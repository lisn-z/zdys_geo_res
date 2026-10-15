/** Conventional classroom obliquity, shared by geometry and degree-minute labels. */
export const AXIAL_TILT_DEGREES = 23 + 26 / 60
export const POLAR_CIRCLE_DEGREES = 90 - AXIAL_TILT_DEGREES
export const AXIAL_TILT_LABEL = '23°26′'
export const POLAR_CIRCLE_LABEL = '66°34′'

/** Match earth-motion's latitude and longitude palette. */
export const GLOBE_LINE_COLORS = {
  grid: 0xa8fff6,
  equator: 0xff4058,
  tropics: 0xffd447,
  polarCircles: 0x66d9ff,
} as const
