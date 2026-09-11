/**
 * A fixed 365-day teaching calendar, not an ephemeris for a particular year.
 * Each illustrative equinox/solstice date is anchored to the matching orbital
 * quarter so the date, solar declination, diagram and seasonal caption agree.
 */
export const ILLUSTRATIVE_YEAR_DAYS = 365

export const SEASON_TERMS = [
  { name: '春分', day: 80, date: '3月21日', directPoint: '赤道', phase: 0 },
  { name: '夏至', day: 172, date: '6月21日', directPoint: '北回归线', phase: 0.25 },
  { name: '秋分', day: 266, date: '9月23日', directPoint: '赤道', phase: 0.5 },
  { name: '冬至', day: 356, date: '12月22日', directPoint: '南回归线', phase: 0.75 },
] as const

/** One-based month starts in the same non-leap-year calendar. */
export const CALENDAR_MONTH_START_DAYS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335] as const

const wrap01 = (value: number) => {
  const wrapped = value % 1
  return wrapped < 0 ? wrapped + 1 : wrapped
}

/** Locate a season in a continuous year beginning at the March equinox. */
function calendarSeasonSegment(progress: number) {
  let calendarDay = wrap01(progress) * ILLUSTRATIVE_YEAR_DAYS
  const springDay = SEASON_TERMS[0].day - 1
  // Recover exact date anchors after modulo arithmetic introduces tiny errors.
  // The tolerance is far smaller than any visible or selectable calendar step.
  for (const term of SEASON_TERMS) {
    if (Math.abs(calendarDay - (term.day - 1)) < 1e-9) {
      calendarDay = term.day - 1
      break
    }
  }
  if (calendarDay < springDay) calendarDay += ILLUSTRATIVE_YEAR_DAYS
  for (let index = SEASON_TERMS.length - 1; index >= 0; index--) {
    const startDay = SEASON_TERMS[index]!.day - 1
    if (calendarDay < startDay) continue
    const endDay = index + 1 < SEASON_TERMS.length
      ? SEASON_TERMS[index + 1]!.day - 1
      : springDay + ILLUSTRATIVE_YEAR_DAYS
    return { index, elapsedDays: calendarDay - startDay, durationDays: endDay - startDay }
  }
  // Progress is finite in the scene; this fallback also keeps malformed input safe.
  return { index: 0, elapsedDays: 0, durationDays: SEASON_TERMS[1].day - SEASON_TERMS[0].day }
}

/** Calendar fraction -> orbital fraction, with March equinox at orbital zero. */
export function calendarProgressToSeasonProgress(progress: number) {
  const segment = calendarSeasonSegment(progress)
  return wrap01((segment.index + segment.elapsedDays / segment.durationDays) / 4)
}

/** Inverse mapping for anything positioned by orbital quarters. */
export function seasonProgressToCalendarProgress(progress: number) {
  const quarter = wrap01(progress) * 4
  const index = Math.floor(quarter)
  const startDay = SEASON_TERMS[index]!.day - 1
  const endDay = index + 1 < SEASON_TERMS.length
    ? SEASON_TERMS[index + 1]!.day - 1
    : SEASON_TERMS[0].day - 1 + ILLUSTRATIVE_YEAR_DAYS
  return wrap01((startDay + (quarter - index) * (endDay - startDay)) / ILLUSTRATIVE_YEAR_DAYS)
}

/** d(orbital fraction)/d(calendar fraction); right-hand derivative at a term. */
export function calendarOrbitRateScale(progress: number) {
  return ILLUSTRATIVE_YEAR_DAYS / (4 * calendarSeasonSegment(progress).durationDays)
}

export function calendarProgressToDayOfYear(progress: number) {
  const zeroBasedDay = wrap01(progress) * ILLUSTRATIVE_YEAR_DAYS
  return Math.min(ILLUSTRATIVE_YEAR_DAYS, Math.floor(zeroBasedDay + 1e-9) + 1)
}

/** Name only the anchor date itself as a term; intermediate dates are intervals. */
export function seasonLabelForDay(dayOfYear: number) {
  const day = Math.min(ILLUSTRATIVE_YEAR_DAYS, Math.max(1, Math.floor(dayOfYear)))
  const exact = SEASON_TERMS.find((term) => term.day === day)
  if (exact) return exact.name
  let precedingIndex = SEASON_TERMS.length - 1
  for (let index = 0; index < SEASON_TERMS.length; index++) {
    if (SEASON_TERMS[index]!.day < day) precedingIndex = index
  }
  return `${SEASON_TERMS[precedingIndex]!.name}—${SEASON_TERMS[(precedingIndex + 1) % SEASON_TERMS.length]!.name}`
}
