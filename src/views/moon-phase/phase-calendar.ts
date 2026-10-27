/** Common Chinese-calendar teaching references, not dates derived from model age.
 * The simulation's phase categories have approximate boundaries; actual dates
 * vary by lunar month. In particular, the new-Moon category straddles the cycle.
 */
const LUNAR_DATE_REFERENCES: Record<string, string> = {
  新月: '初一前后',
  蛾眉月: '约初二～初六',
  上弦月: '初七、初八前后',
  盈凸月: '约初九～十四',
  满月: '十五前后',
  亏凸月: '约十六～廿一',
  下弦月: '廿二、廿三前后',
  残月: '约廿四～月末',
}

export function lunarDateReference(phaseName: string): string {
  return LUNAR_DATE_REFERENCES[phaseName] ?? ''
}

export const LUNAR_DATE_NOTE = '常见农历日期参考，各月可能有所变化，不代表当前模拟日期。'
