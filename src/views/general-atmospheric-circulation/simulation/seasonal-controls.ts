import { OBLIQUITY, seasonalShift, subsolarLatitude } from './model.ts'

export type SeasonPoint = 'spring-equinox' | 'summer-solstice' | 'autumn-equinox' | 'winter-solstice'

export const seasonPoints: readonly {
  id: SeasonPoint
  label: string
  solarLatitude: number
  latitudeShift: number
}[] = [
  { id: 'spring-equinox', label: '春分', solarLatitude: 0, latitudeShift: 0 },
  { id: 'summer-solstice', label: '夏至', solarLatitude: OBLIQUITY, latitudeShift: 5 },
  { id: 'autumn-equinox', label: '秋分', solarLatitude: 0, latitudeShift: 0 },
  { id: 'winter-solstice', label: '冬至', solarLatitude: -OBLIQUITY, latitudeShift: -5 },
]

/**
 * Stage indices are zero-based. Stage three uses exact equinox/solstice solar
 * latitudes and a schematic belt displacement; stage four keeps its independent
 * January/July monthly reference. An earlier step's neutralSeason flag must not
 * mask the user's explicit seasonal selection in either seasonal stage.
 */
export function resolveSeasonTargets(
  stage: number,
  month: number,
  seasonPoint: SeasonPoint = 'spring-equinox',
  _neutralSeason = false,
) {
  if (stage < 2) return { solarLatitude: 0, latitudeShift: 0 }
  if (stage === 2) {
    const point = seasonPoints.find(point => point.id === seasonPoint) ?? seasonPoints[0]!
    return { solarLatitude: point.solarLatitude, latitudeShift: point.latitudeShift }
  }
  return { solarLatitude: subsolarLatitude(month), latitudeShift: seasonalShift(month) }
}
