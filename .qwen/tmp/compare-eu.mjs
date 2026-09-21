import { readFileSync } from 'node:fs'

const src = readFileSync('src/views/temperature-and-precipitation/index.vue', 'utf8')
const s0 = src.indexOf('const cityList: CityItem[] = [')
const mm = /\r?\n\]\r?\n/.exec(src.slice(s0))
const cityList = eval('(' + src.slice(s0 + 'const cityList: CityItem[] = '.length, s0 + mm.index + mm[0].indexOf(']') + 1) + ')')

// 实测常年值（来源见每条注释）。气温用「日平均气温」；英美官方源只发布最高/最低时，
// 采用国际通行的 (最高+最低)/2，并在来源里注明是推算。
const REF = {
  伦敦: {
    src: 'Met Office Heathrow WMO 03772, 1991–2020（官网直接抓取）',
    t: [5.6, 5.8, 7.9, 10.5, 13.7, 16.8, 19.0, 18.7, 15.9, 12.3, 8.4, 5.9],
    p: [58.8, 45.0, 38.8, 42.3, 45.9, 47.3, 45.8, 52.8, 49.6, 65.1, 66.6, 57.1],
    alt: { 'St James’s Park 市中心 1981–2010': { t: [5.6,5.65,8.1,10.25,13.5,16.4,18.55,18.45,15.7,12.15,8.55,5.9], p: [41.6,36.3,40.3,40.1,44.9,47.4,34.6,54.3,51.0,61.1,57.5,48.4] },
           'Hampstead 1991–2020': { p: [69.54,51.41,42.82,49.59,50.51,58.45,50.49,67.65,59.08,78.57,75.71,68.25] } },
  },
  莫斯科: {
    src: 'Roshydromet / Центральное УГМС，ВДНХ 站 27612，1991–2020（官网直接抓取）',
    t: [-6.2, -5.9, -0.7, 6.9, 13.6, 17.3, 19.7, 17.6, 11.9, 5.8, -0.5, -4.4],
    p: [53, 44, 39, 37, 61, 77, 84, 78, 66, 70, 52, 51],
    alt: { '同站 1961–1990（WMO WWIS + Гидрометцентр 双官方源一致）': { t: [-9.3,-7.7,-2.2,5.8,13.1,16.6,18.2,16.4,11.0,5.1,-1.2,-6.1], p: [42,36,34,44,51,75,94,77,65,59,58,56] } },
  },
  雅典: {
    src: '雅典市中心 NOA（Cosmos / National Observatory of Athens），1991–2020（维基转引具名来源）',
    t: [10.2, 10.8, 13.1, 16.7, 21.8, 26.6, 29.3, 29.4, 25.0, 20.3, 15.6, 11.6],
    p: [55.6, 44.4, 45.6, 27.6, 20.7, 11.6, 10.7, 5.4, 25.8, 38.6, 70.8, 76.3],
    alt: { 'WMO WWIS Athens 1955–1997（老图册最可能的底本）': { t: [8.85,9.45,11.2,14.9,19.95,24.65,27.15,26.95,23.25,18.35,13.95,10.45], p: [56.9,46.7,40.7,30.8,22.7,10.6,5.8,6.0,13.9,52.6,58.3,69.1] },
           'Elliniko HNMS 1955–2010（沿海机场站）': { t: [10.3,10.6,12.4,16.1,20.9,25.6,28.3,28.2,24.3,19.6,15.4,11.9], p: [47.7,38.5,42.3,25.5,14.3,5.4,6.3,6.2,12.3,45.9,60.1,62.0] } },
  },
}

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1)
const sum = (a) => a.reduce((x, y) => x + y, 0)
const line = (label, arr) => `  ${label.padEnd(10)}${arr.map((v) => f1(v).padStart(6)).join('')}  ${f1(sum(arr)).padStart(7)}`

// Köppen 干旱阈值：年降水 < 20×年均温(+7/+14) 即为 B 类
function aridityThreshold(T, P) {
  const Tann = sum(T) / 12, Pann = sum(P)
  const byT = T.map((_, i) => i).sort((a, b) => T[b] - T[a])
  const warmShare = sum(byT.slice(0, 6).map((i) => P[i])) / Pann
  return { Tann, Pann, thresh: 20 * Tann + (warmShare >= 0.7 ? 7 : warmShare <= 0.3 ? 14 : 0), warmShare }
}

for (const [name, ref] of Object.entries(REF)) {
  const c = cityList.find((x) => x.name === name)
  const dT = c.temperature.map((v, i) => v - ref.t[i])
  const dP = c.precipitation.map((v, i) => v - ref.p[i])
  const maxT = dT.map(Math.abs).indexOf(Math.max(...dT.map(Math.abs)))
  const maxP = dP.map(Math.abs).indexOf(Math.max(...dP.map(Math.abs)))

  console.log(`\n════════════ ${name} ════════════`)
  console.log(`  实测来源：${ref.src}`)
  console.log(`  月份      ${Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(6)).join('')}     年值`)
  console.log(line('气温·文件', c.temperature))
  console.log(line('气温·实测', ref.t))
  console.log(line('气温·偏差', dT) + `   最大 ${f1(Math.abs(dT[maxT]))}℃(${maxT + 1}月)`)
  console.log(line('降水·文件', c.precipitation))
  console.log(line('降水·实测', ref.p))
  console.log(line('降水·偏差', dP) + `   最大 ${f1(Math.abs(dP[maxP]))}mm(${maxP + 1}月)`)
  console.log(`  气温平均绝对偏差 ${f1(sum(dT.map(Math.abs)) / 12)}℃   年较差：文件 ${f1(Math.max(...c.temperature) - Math.min(...c.temperature))}℃ / 实测 ${f1(Math.max(...ref.t) - Math.min(...ref.t))}℃`)
  const pf = sum(c.precipitation), pr = sum(ref.p)
  console.log(`  年降水偏差 ${f1(pf - pr)}mm（${((pf / pr - 1) * 100).toFixed(1)}%）`)

  const aFile = aridityThreshold(c.temperature, c.precipitation)
  const aRef = aridityThreshold(ref.t, ref.p)
  console.log(`  Köppen 干旱阈值检查：文件 ${f1(aFile.Pann)}mm ${aFile.Pann < aFile.thresh ? '<' : '≥'} ${f1(aFile.thresh)}mm → ${aFile.Pann < aFile.thresh ? 'B 干旱/半干旱' : 'C/D 非干旱'}   |   实测 ${f1(aRef.Pann)}mm ${aRef.Pann < aRef.thresh ? '<' : '≥'} ${f1(aRef.thresh)}mm → ${aRef.Pann < aRef.thresh ? 'B 干旱/半干旱' : 'C/D 非干旱'}`)

  for (const [altName, alt] of Object.entries(ref.alt)) {
    const parts = []
    if (alt.t) parts.push(`气温 ${f1(sum(alt.t) / 12)}℃`)
    if (alt.p) parts.push(`降水 ${f1(sum(alt.p))}mm`)
    const dAnn = alt.p ? `${((pf / sum(alt.p) - 1) * 100).toFixed(1)}%` : '-'
    console.log(`    · 备选 ${altName}: ${parts.join(' / ')}（文件年降水相对偏差 ${dAnn}）`)
  }
}
