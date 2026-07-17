/**
 * 将 output 目录下的生成文件复制到目标项目：
 *   - output/astro/*.astro          →  <target>/src/pages/geo/
 *   - output/styles/*.css           →  <target>/src/styles/
 *   - output/geo/*  (所有子文件夹)   →  <target>/src/components/geo/
 */

import { existsSync, mkdirSync, cpSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ======================== 配置 ========================
const OUTPUT_DIR = join(root, 'output')

/** 目标项目根路径 */
const TARGET_DIR = 'D:\\company\\geography-design-tool'

/**
 * 复制白名单 — 只复制列表中包含的文件/文件夹名称。
 * 如果数组为空，则复制全部（原行为）。
 * 支持按目录限定，例如只复制 astro 中的某几个文件：
 *   COPY_WHITELIST = ['apparent-motion-of-the-sun.astro', 'soil-erosion.astro']
 * 或只复制某几个 geo 组件：
 *   COPY_WHITELIST = ['apparent-motion-of-the-sun', 'soil-erosion']
 */
const COPY_WHITELIST = [
  // 示例：取消注释即可只复制这几项
  'apparent-motion-of-the-sun',
  'earth-motion',
  'grid-system-mini-game',
  'zdys-calculator',
  'solar-system',
  'put-it-together',
  'threeD-terrain',
  'earth-rotation',
  'moon-phase',
  'temperature-and-precipitation',
  'soil-erosion'
]

const MAPPINGS = [
  {
    label: 'astro 页面',
    src: join(OUTPUT_DIR, 'astro'),
    dest: join(TARGET_DIR, 'src', 'pages', 'geo'),
    filter: (name) =>
      name.endsWith('.astro') && whitelistMatch(name),
  },
  {
    label: '样式文件',
    src: join(OUTPUT_DIR, 'styles'),
    dest: join(TARGET_DIR, 'src', 'styles'),
    filter: (name) =>
      name.endsWith('.css'),
  },
  {
    label: 'geo 组件',
    src: join(OUTPUT_DIR, 'geo'),
    dest: join(TARGET_DIR, 'src', 'components', 'geo'),
    filter: (name) => whitelistMatch(name),
  },
]

// ======================== 工具函数 ========================

/** 从 astro 文件中提取 <title> 标签内的中文名 */
function extractAstroTitle(astroPath) {
  try {
    const content = readFileSync(astroPath, 'utf-8')
    const match = content.match(/<title>([^<]+)<\/title>/)
    return match ? match[1].trim() : ''
  } catch {
    return ''
  }
}

// ======================== 白名单辅助 ========================

/**
 * 检查名称是否在白名单中。白名单为空时放行所有项目。
 */
function whitelistMatch(name) {
  if (COPY_WHITELIST.length === 0) return true
  return COPY_WHITELIST.includes(name)
}

// ======================== 主逻辑 ========================

function formatTimestamp(date) {
  const y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return { full: `${y}-${M}-${d}_${h}-${m}-${s}`, date: `${y}-${M}-${d}`, time: `${h}:${m}:${s}` }
}

function main() {
  const now = new Date()
  const fmt = formatTimestamp(now)
  const report = {
    target: TARGET_DIR,
    copyTime: fmt.time,
    copyDate: fmt.date,
    timestamp: now.toISOString(),
    keys: [],
  }

  console.log(`📂 目标项目: ${TARGET_DIR}\n`)

  for (const mapping of MAPPINGS) {
    const { label, src, dest, filter } = mapping

    if (!existsSync(src)) {
      console.warn(`⚠️  源目录不存在，跳过 ${label}: ${src}`)
      continue
    }

    // 确保目标目录存在
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true })
    }

    // 读取源目录内容
    const entries = readdirSync(src, { withFileTypes: true })
    let copyCount = 0

    for (const entry of entries) {
      if (!filter(entry.name)) continue

      const srcPath = join(src, entry.name)
      const destPath = join(dest, entry.name)

      // 删除目标已存在的，再复制
      if (existsSync(destPath)) {
        rmSync(destPath, { recursive: true, force: true })
      }

      cpSync(srcPath, destPath, { recursive: true })
      copyCount++

      if (mapping.label === '样式文件') {
        // 样式文件直接放在根级别
        if (!report[label]) report[label] = []
        report[label].push({ input: srcPath, output: destPath })
      } else {
        // astro 页面 / geo 组件：归入 geo/xxxx 对象下
        const compName = mapping.label === 'astro 页面'
          ? entry.name.replace(/\.astro$/, '')
          : entry.name
        const geoKey = `/geo/${compName}`
        if (!report[geoKey]) {
          // 从对应的 astro 文件中读取中文标题
          const astroFilePath = join(OUTPUT_DIR, 'astro', `${compName}.astro`)
          report[geoKey] = { name: extractAstroTitle(astroFilePath) }
        }
        if (!report[geoKey][label]) report[geoKey][label] = []
        report[geoKey][label].push({ input: srcPath, output: destPath })
      }
    }

    console.log(`  ✅ ${label}: ${src} → ${dest} (${copyCount} 项)`)
  }

  console.log('\n🎉 复制完成！')

  // 收集所有 key
  report.keys = Object.keys(report)
    .filter(k => !['target', 'timestamp', 'keys', '样式文件', 'copyTime', 'copyDate'].includes(k))
    .map(k => ({ key: k, name: report[k].name || '' }))

  // 输出 JSON 报告
  const logsDir = join(root, 'logs')
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true })
  const reportPath = join(logsDir, `copy_${fmt.full}.json`)
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`\n📋 复制报告已保存: ${reportPath}`)
  console.log(JSON.stringify(report, null, 2))
}

main()
