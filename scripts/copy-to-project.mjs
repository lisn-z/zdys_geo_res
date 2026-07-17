/**
 * 将 output 目录下的生成文件复制到目标项目：
 *   - output/astro/*.astro          →  <target>/src/pages/geo/
 *   - output/styles/*.css           →  <target>/src/styles/
 *   - output/geo/*  (所有子文件夹)   →  <target>/src/components/geo/
 */

import { existsSync, mkdirSync, cpSync, readdirSync, rmSync } from 'fs'
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
  // 'apparent-motion-of-the-sun.astro',
  // 'soil-erosion.astro',
  // 'apparent-motion-of-the-sun',
  // 'soil-erosion',
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

// ======================== 白名单辅助 ========================

/**
 * 检查名称是否在白名单中。白名单为空时放行所有项目。
 */
function whitelistMatch(name) {
  if (COPY_WHITELIST.length === 0) return true
  return COPY_WHITELIST.includes(name)
}

// ======================== 主逻辑 ========================

function main() {
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
    }

    console.log(`  ✅ ${label}: ${src} → ${dest} (${copyCount} 项)`)
  }

  console.log('\n🎉 复制完成！')
}

main()
