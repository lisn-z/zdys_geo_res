import { readFileSync } from 'node:fs'

// ===== 解析 WMO 官方 CSV =====
function parseWmo(file) {
  const txt = readFileSync(file, 'utf8')
  const lines = txt.split(/\r?\n/)
  const grab = (code, calc) => {
    const row = lines.find((l) => new RegExp(`^\\d+,${code},${calc},`, 'i').test(l))
    if (!row) return null
    const f = row.split(',')
    return { monthly: f.slice(4, 16).map(Number), annual: Number(f[16]) }
  }
  const hIdx = lines.findIndex((l) => l.startsWith('WMO_Number,Latitude,Longitude,Station_Height'))
  if (hIdx < 0) throw new Error(`${file}: 找不到站点头表`)
  const hp = lines[hIdx + 1].split(',')
  const station = lines.find((l) => l.startsWith('Station_Name,'))?.split(',')[1]
  const country = lines.find((l) => l.startsWith('Country_Name,'))?.split(',')[1]
  const dmsToDeg = (raw) => {
    const [d, m, sec, h] = raw.replace(/"/g, '').split('|')
    const v = (+d || 0) + (+m || 0) / 60 + (parseFloat(sec) || 0) / 3600
    return h === 'S' || h === 'W' ? -v : v
  }
  return {
    station, country,
    lat: dmsToDeg(hp[1]), lng: dmsToDeg(hp[2]), elev: +hp[3],
    precip: grab(1, 'Sum'),
    tMean: grab(5, 'Mean'),
    tMax: grab(3, 'Mean'),
    tMin: grab(4, 'Mean'),
  }
}

const wmo = {
  上海: parseWmo('.qwen/tmp/SHANGHAI__BAOSHAN_58362.csv'),
  北京: parseWmo('.qwen/tmp/BEIJING_54511.csv'),
  拉萨: parseWmo('.qwen/tmp/LHASA_55591.csv'),
  雅库茨克: parseWmo('.qwen/tmp/Jakutsk_24959.csv'),
}

// ===== 从 .vue 抽当前数据 =====
const src = readFileSync('src/views/temperature-and-precipitation/index.vue', 'utf8')
const s0 = src.indexOf('const cityList: CityItem[] = [')
const mm = /\r?\n\]\r?\n/.exec(src.slice(s0))
const cityList = eval('(' + src.slice(s0 + 'const cityList: CityItem[] = '.length, s0 + mm.index + mm[0].indexOf(']') + 1) + ')')

const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1)
const stats = (diff) => {
  const abs = diff.map(Math.abs)
  const i = abs.indexOf(Math.max(...abs))
  return { maxAbs: Math.max(...abs), maxIdx: i + 1, meanAbs: abs.reduce((a, b) => a + b, 0) / 12, signed: diff }
}

console.log('════ WMO 1991–2020 官方 CSV 站点信息 ════')
for (const [n, w] of Object.entries(wmo)) {
  console.log(`  ${n.padEnd(6)} ${w.country} / ${w.station.padEnd(18)} ${w.lat.toFixed(4)}°N ${w.lng.toFixed(4)}°E 海拔 ${w.elev} m`)
}

for (const name of ['上海', '北京', '拉萨', '雅库茨克']) {
  const c = cityList.find((x) => x.name === name)
  const w = wmo[name]
  const dT = stats(c.temperature.map((v, i) => v - w.tMean.monthly[i]))
  const dP = stats(c.precipitation.map((v, i) => v - w.precip.monthly[i]))

  console.log(`\n════════ ${name} ════════`)
  console.log(`  文件坐标 ${c.lat}°, ${c.lng}°, 海拔 ${c.altitude}m   |   站点坐标 ${w.lat.toFixed(2)}°, ${w.lng.toFixed(2)}°, 海拔 ${w.elev}m`)
  console.log(`  月份      ${Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(6)).join('')}    年值`)
  console.log(`  气温·文件 ${c.temperature.map((v) => f1(v).padStart(6)).join('')}  ${f1(c.temperature.reduce((a, b) => a + b, 0) / 12).padStart(6)}`)
  console.log(`  气温·WMO  ${w.tMean.monthly.map((v) => f1(v).padStart(6)).join('')}  ${f1(w.tMean.annual).padStart(6)}`)
  console.log(`  气温·偏差 ${dT.signed.map((v) => (v >= 0 ? '+' : '') + f1(v).padStart(5)).join('')}   最大 ${f1(dT.maxAbs)}℃(${dT.maxIdx}月) 平均绝对 ${f1(dT.meanAbs)}℃`)
  console.log(`  降水·文件 ${c.precipitation.map((v) => f1(v).padStart(6)).join('')}  ${f1(c.precipitation.reduce((a, b) => a + b, 0)).padStart(6)}`)
  console.log(`  降水·WMO  ${w.precip.monthly.map((v) => f1(v).padStart(6)).join('')}  ${f1(w.precip.annual).padStart(6)}`)
  console.log(`  降水·偏差 ${dP.signed.map((v) => (v >= 0 ? '+' : '') + f1(v).padStart(5)).join('')}   最大 ${f1(dP.maxAbs)}mm(${dP.maxIdx}月) 平均绝对 ${f1(dP.meanAbs)}mm`)
  const pAnnFile = c.precipitation.reduce((a, b) => a + b, 0)
  console.log(`  年降水偏差 ${f1(pAnnFile - w.precip.annual)}mm（${((pAnnFile / w.precip.annual - 1) * 100).toFixed(1)}%）`)
}
