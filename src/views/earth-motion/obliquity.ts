/** Teaching maximum: 23 degrees 26 arcminutes, not 23.26 decimal degrees. */
export const MAX_OBLIQUITY_MINUTES = 23 * 60 + 26
export const MAX_OBLIQUITY_DEGREES = MAX_OBLIQUITY_MINUTES / 60

// 度分格式化统一由 @/hooks/useDegreeFormat 提供，不要在此重新实现。
