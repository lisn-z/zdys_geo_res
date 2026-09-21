import { readFileSync } from 'node:fs'

const src = readFileSync('src/views/temperature-and-precipitation/index.vue', 'utf8')
const start = src.indexOf('const cityList: CityItem[] = [')
const m = /\r?\n\]\r?\n/.exec(src.slice(start))
const cityList = eval('(' + src.slice(start + 'const cityList: CityItem[] = '.length, start + m.index + m[0].indexOf(']') + 1) + ')')

// ===== Köppen 分类（Peel et al. 2007 常用阈值，C/D 界线取 -3℃）=====
function koppen(T, P) {
  const Pann = P.reduce((s, v) => s + v, 0)
  const Tann = T.reduce((s, v) => s + v, 0) / 12
  const Tmin = Math.min(...T), Tmax = Math.max(...T)
  const driest = Math.min(...P)
  const notes = []

  // 干旱阈值：看降水集中在暖半年还是冷半年
  const idxWarm = T.map((t, i) => i).sort((a, b) => T[b] - T[a]).slice(0, 6)
  const warmShare = idxWarm.reduce((s, i) => s + P[i], 0) / (Pann || 1)
  const thresh = 20 * Tann + (warmShare >= 0.7 ? 7 : warmShare <= 0.3 ? 14 : 0)

  if (Pann < thresh) {
    const second = Pann < thresh / 2 ? 'W' : 'S'
    const third = Tann >= 18 ? 'h' : 'k'
    return { code: `B${second}${third}`, notes: [`年降水 ${Pann.toFixed(0)}mm < 干旱阈值 ${thresh.toFixed(0)}mm`] }
  }
  if (Tmin >= 18) {
    if (driest >= 60) return { code: 'Af', notes: [`最干月 ${driest}mm ≥ 60mm`] }
    const amLimit = 100 - Pann / 25
    if (driest >= amLimit) return { code: 'Am', notes: [`最干月 ${driest}mm < 60mm，但 ≥ 100-年降水/25 = ${amLimit.toFixed(1)}mm`] }
    return { code: 'Aw', notes: [`最干月 ${driest}mm < ${amLimit.toFixed(1)}mm，有明显干季`] }
  }
  if (Tmax < 10) {
    return { code: Tmax >= 0 ? 'ET' : 'EF', notes: [`最热月 ${Tmax}℃ < 10℃`] }
  }
  // C / D
  const isC = Tmin > -3
  const letter = isC ? 'C' : 'D'
  // 夏干 / 冬干 / 常湿：暖半年 = 气温最高的 6 个月，冷半年 = 其余 6 个月
  const byTemp = T.map((_, i) => i).sort((a, b) => T[b] - T[a])
  const warm6 = byTemp.slice(0, 6), cold6 = byTemp.slice(6)
  const dryWarm = Math.min(...warm6.map((i) => P[i]))
  const wetCold = Math.max(...cold6.map((i) => P[i]))
  const dryCold = Math.min(...cold6.map((i) => P[i]))
  const wetWarm = Math.max(...warm6.map((i) => P[i]))
  let second
  if (dryWarm < 40 && dryWarm < wetCold / 3) { second = 's'; notes.push(`夏干：暖半年最干月 ${dryWarm}mm < 40mm 且 < 冷半年最湿月/3 (${(wetCold / 3).toFixed(1)})`) }
  else if (dryCold < wetWarm / 10) { second = 'w'; notes.push(`冬干：冷半年最干月 ${dryCold}mm < 暖半年最湿月/10 (${(wetWarm / 10).toFixed(1)})`) }
  else { second = 'f'; notes.push(`常湿：无明显干季`) }
  // 第三位
  let third
  const months10 = T.filter((t) => t > 10).length
  if (Tmax >= 22) third = 'a'
  else if (months10 >= 4) third = 'b'
  else if (Tmax >= 10) third = 'c'
  else third = 'd'
  if (!isC && third === 'd' && Tmin > -38) { third = 'c'; notes.push('D 类最冷月未低于 -38℃，降为 c') }
  return { code: `${letter}${second}${third}`, notes }
}

// 教材气候类型 → 允许的 Köppen 代码
const EXPECT = {
  '热带雨林气候': ['Af'],
  '热带稀树草原气候': ['Aw', 'As'],
  '热带季风气候': ['Am', 'Aw'],
  '热带沙漠气候': ['BWh', 'BWk'],
  '亚热带季风气候': ['Cfa', 'Cwa'],
  '亚热带季风性湿润气候': ['Cfa'],
  '地中海气候': ['Csa', 'Csb'],
  '温带季风气候': ['Cwa', 'Dwa', 'Dwb', 'Cfa'],
  '温带大陆性气候': ['Dfb', 'Dfa', 'Dwb', 'Dwa', 'Dfc', 'Cfb'],
  '温带海洋性气候': ['Cfb'],
  '亚寒带针叶林气候': ['Dfc', 'Dfd', 'Dwc', 'Dwd', 'Dfb'],
  '苔原气候': ['ET'],
  '冰原气候': ['EF'],
  '高原山地气候': ['Cwb', 'Cwc', 'Dwb', 'Dwc', 'ET', 'BSk'],
}

const NORTHERN = { iquitos: false, bamako: true, huzhiming: true, bilma: true, shanghai: true, sydney: false, moscow: true, athens: true, yakutsk: true, beijing: true, lhasa: true, london: true, utqiagvik: true, vostok: false }

console.log('城市        教材气候类型              Köppen   判定     数据特征')
console.log('-'.repeat(118))
let bad = 0
for (const c of cityList) {
  // 南半球城市把月份翻转，让「暖半年」逻辑与北半球一致
  const T = NORTHERN[c.id] ? c.temperature : [...c.temperature].reverse()
  const P = NORTHERN[c.id] ? c.precipitation : [...c.precipitation].reverse()
  const { code, notes } = koppen(T, P)
  const allowed = EXPECT[c.climateName] ?? []
  const ok = allowed.includes(code)
  if (!ok) bad++
  const Pann = P.reduce((s, v) => s + v, 0)
  const Tmin = Math.min(...c.temperature), Tmax = Math.max(...c.temperature)
  console.log(
    c.name.padEnd(11),
    c.climateName.padEnd(22),
    code.padEnd(8),
    ok ? '✓ 一致' : `✗ 期望 ${allowed.join('/')}`,
    ` 年均${(T.reduce((s, v) => s + v, 0) / 12).toFixed(1)}℃ 年较差${(Tmax - Tmin).toFixed(1)}℃ 年降水${Pann.toFixed(0)}mm`
  )
  if (!ok) console.log(' '.repeat(52) + notes.join('；'))
}
console.log(`\n${bad === 0 ? '✓ 14 个城市的气候类型标注与其数据全部自洽' : `✗ ${bad} 个城市的数据与其标注的气候类型不自洽`}`)

// 数值"整度"程度：判断是否为图表读数
console.log('\n--- 数值精度特征（判断是图表读数还是站点实测）---')
const coarse = (v, step) => Math.abs(v / step - Math.round(v / step)) < 1e-9
for (const c of cityList) {
  const tCoarse = c.temperature.filter((v) => coarse(v, 0.5)).length
  const pCoarse = c.precipitation.filter((v) => coarse(v, 5)).length
  const n = tCoarse + pCoarse
  const tag = n === 24 ? '24/24 都落在粗刻度（气温 0.5℃、降水 5mm）→ 图表读数'
    : n >= 18 ? `${n}/24 落在粗刻度 → 偏图表读数`
      : `${n}/24 落在粗刻度 → 站点实测精度`
  console.log(`  ${c.name.padEnd(11)} ${tag}`)
}
