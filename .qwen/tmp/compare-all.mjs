import { readFileSync } from 'node:fs'

const src = readFileSync('src/views/temperature-and-precipitation/index.vue', 'utf8')
const s0 = src.indexOf('const cityList: CityItem[] = [')
const mm = /\r?\n\]\r?\n/.exec(src.slice(s0))
const cityList = eval('(' + src.slice(s0 + 'const cityList: CityItem[] = '.length, s0 + mm.index + mm[0].indexOf(']') + 1) + ')')

// 实测参照值。v=一手核验（我自己下载/抓取原始文件），a=agent 抓取未复验
const REF = [
  { n: '伊基托斯', v: 'v', src: 'DWD CLIMAT 站84377 1991–2020(气温)/1961–1990(降水)',
    t: [26.1,26.1,26.0,26.0,25.7,25.3,25.2,25.7,26.1,26.3,26.4,26.1],
    p: [279,238,273,309,283,198,170,165,189,242,260,282] },
  { n: '巴马科', v: 'v', src: 'DWD CLIMAT 站61291 1991–2020（巴马科-塞努机场 381m）',
    t: [24.9,27.9,30.6,32.3,31.6,29.1,26.8,26.1,26.7,27.8,26.7,25.1],
    p: [2.1,0.8,3.7,17.7,70.9,129.9,227.4,263.8,175.7,52.6,2.2,0.0] },
  { n: '胡志明市', v: 'v', src: 'WMO WWIS 309 标1991–2020（新山一机场，气温为(高+低)/2推算）',
    t: [27.7,27.9,29.25,30.45,30.65,29.5,29.1,29.0,28.8,28.65,28.65,27.75],
    p: [12,8,18,57,202,224,231,219,273,240,128,41] },
  { n: '比尔马', v: 'v', src: 'DWD CLIMAT 站61017 1991–2020（max/min 已损坏，仅用 mean+precip）',
    t: [17.1,20.3,25.1,30.0,33.0,34.5,34.4,33.6,32.4,28.4,22.2,17.9],
    p: [0.0,0.0,0.0,1.0,0.6,0.5,1.3,8.7,1.1,0.2,0.0,0.0] },
  { n: '上海', v: 'v', src: 'NOAA NCEI/WMO CSV 58362 宝山 1991–2020',
    t: [4.9,6.5,10.3,15.7,20.9,24.4,28.8,28.5,24.7,19.7,13.9,7.5],
    p: [69.8,64.0,86.5,77.1,90.2,196.7,146.9,210.1,116.5,71.4,57.5,49.3] },
  { n: '莫斯科', v: 'a', src: 'Roshydromet/Центральное УГМС ВДНХ站27612 1991–2020',
    t: [-6.2,-5.9,-0.7,6.9,13.6,17.3,19.7,17.6,11.9,5.8,-0.5,-4.4],
    p: [53,44,39,37,61,77,84,78,66,70,52,51] },
  { n: '雅典', v: 'a', src: '雅典市中心 NOA/Cosmos 1991–2020（站点身份与坐标缺失）',
    t: [10.2,10.8,13.1,16.7,21.8,26.6,29.3,29.4,25.0,20.3,15.6,11.6],
    p: [55.6,44.4,45.6,27.6,20.7,11.6,10.7,5.4,25.8,38.6,70.8,76.3] },
  { n: '雅库茨克', v: 'v', src: 'NOAA NCEI/WMO CSV 24959 JAKUTSK 1991–2020',
    t: [-36.9,-32.9,-19.1,-3.7,8.0,17.0,19.9,15.6,6.4,-6.9,-25.9,-37.0],
    p: [9.7,8.5,6.3,7.9,20.1,29.5,40.1,37.1,29.6,18.6,16.9,8.5] },
  { n: '北京', v: 'v', src: 'NOAA NCEI/WMO CSV 54511 北京观象台 1991–2020',
    t: [-2.7,0.6,7.5,15.1,21.3,25.3,27.2,26.1,21.2,13.8,5.2,-1.0],
    p: [2.2,5.8,8.6,21.7,36.1,72.4,169.7,113.4,53.7,28.7,13.5,2.2] },
  { n: '拉萨', v: 'v', src: 'NOAA NCEI/WMO CSV 55591 1991–2020',
    t: [-0.3,2.7,6.1,9.2,13.2,16.7,16.5,15.8,14.2,9.8,4.1,0.3],
    p: [0.9,1.9,3.5,8.3,31.1,84.0,140.5,129.8,64.8,6.5,0.9,0.7] },
  { n: '伦敦', v: 'v', src: 'Met Office Heathrow 03772 1991–2020（气温为(高+低)/2推算）',
    t: [5.6,5.8,7.9,10.5,13.7,16.8,19.0,18.7,15.9,12.3,8.4,5.9],
    p: [58.8,45.0,38.8,42.3,45.9,47.3,45.8,52.8,49.6,65.1,66.6,57.1] },
]

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1)
const sum = (a) => a.reduce((x, y) => x + y, 0)
const range = (a) => Math.max(...a) - Math.min(...a)

console.log('城市        核 | 气温平均绝对偏差  最大偏差      年较差 文件→实测 | 年降水 文件→实测      偏差%   最大月偏差')
console.log('-'.repeat(124))
const rows = []
for (const r of REF) {
  const c = cityList.find((x) => x.name === r.n)
  const dT = c.temperature.map((v, i) => v - r.t[i])
  const dP = c.precipitation.map((v, i) => v - r.p[i])
  const absT = dT.map(Math.abs), absP = dP.map(Math.abs)
  const iT = absT.indexOf(Math.max(...absT)), iP = absP.indexOf(Math.max(...absP))
  const pf = sum(c.precipitation), pr = sum(r.p)
  rows.push({
    n: r.n, v: r.v,
    madT: sum(absT) / 12, maxT: dT[iT], mT: iT + 1,
    rf: range(c.temperature), rr: range(r.t),
    pf, pr, dp: (pf / pr - 1) * 100,
    maxP: dP[iP], mP: iP + 1, madP: sum(absP) / 12,
    // 最多雨月是否标错
    wetFile: c.precipitation.indexOf(Math.max(...c.precipitation)) + 1,
    wetReal: r.p.indexOf(Math.max(...r.p)) + 1,
    hotFile: c.temperature.indexOf(Math.max(...c.temperature)) + 1,
    hotReal: r.t.indexOf(Math.max(...r.t)) + 1,
  })
  console.log(
    r.n.padEnd(11), r.v, '|',
    `${f1(sum(absT) / 12)}℃`.padStart(14),
    `${dT[iT] >= 0 ? '+' : ''}${f1(dT[iT])}℃(${iT + 1}月)`.padStart(14),
    `${f1(range(c.temperature))}→${f1(range(r.t))}℃`.padStart(18), '|',
    `${f1(pf)}→${f1(pr)}`.padStart(16),
    `${((pf / pr - 1) * 100 >= 0 ? '+' : '') + ((pf / pr - 1) * 100).toFixed(1)}%`.padStart(9),
    `  ${dP[iP] >= 0 ? '+' : ''}${f1(dP[iP])}mm(${iP + 1}月)`
  )
}

console.log('\n--- 派生结论 ---')
for (const r of rows) {
  const flags = []
  if (Math.abs(r.rf - r.rr) >= 2) flags.push(`年较差${r.rf > r.rr ? '放大' : '缩小'} ${f1(Math.abs(r.rf - r.rr))}℃`)
  if (Math.abs(r.dp) >= 10) flags.push(`年降水${r.dp > 0 ? '偏多' : '偏少'} ${Math.abs(r.dp).toFixed(1)}%`)
  if (r.wetFile !== r.wetReal) flags.push(`最多雨月错标 ${r.wetFile}月→应为${r.wetReal}月`)
  if (r.hotFile !== r.hotReal) flags.push(`最热月错标 ${r.hotFile}月→应为${r.hotReal}月`)
  if (r.madT >= 2) flags.push(`气温系统性偏差（平均绝对 ${f1(r.madT)}℃）`)
  console.log(`  ${r.n.padEnd(11)} ${flags.length ? flags.join('；') : '✓ 基本准确'}`)
}

const worst = [...rows].sort((a, b) => (Math.abs(b.dp) + b.madT * 5) - (Math.abs(a.dp) + a.madT * 5))
console.log(`\n按严重度排序：${worst.map((r) => r.n).join(' > ')}`)
console.log(`一手核验 ${rows.filter((r) => r.v === 'v').length}/11，agent 抓取未复验 ${rows.filter((r) => r.v === 'a').length}/11（${rows.filter((r) => r.v === 'a').map((r) => r.n).join('、')}）`)
