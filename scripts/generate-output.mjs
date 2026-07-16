/**
 * 扫描 src/views/ 下的所有文件夹，生成：
 *   - output/geo/<folder>/index.vue   (原样复制)
 *   - output/geo/<folder>/main.ts     (原样创建)
 *   - output/astro/<folder>.astro     (Astro 页面)
 *   - output/styles/                  (src/styles/ 的复制)
 *   - output/report.json              (JSON 报告)
 *
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  statSync,
  cpSync,
  rmSync,
  readdirSync,
} from 'fs'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ======================== 配置 ========================
const SRC_DIR = join(root, 'src')
const VIEWS_DIR = join(SRC_DIR, 'views')
const STYLES_DIR = join(SRC_DIR, 'styles')
const ROUTES_FILE = join(SRC_DIR, 'routes', 'index.ts')
const OUTPUT_DIR = join(root, 'output')
const GEO_DIR = join(OUTPUT_DIR, 'geo')
const ASTRO_DIR = join(OUTPUT_DIR, 'astro')

/** 不参与扫描的文件夹白名单 */
const EXCLUDED_FOLDERS = ['skeleton', 'topo-builder']

// ======================== 工具函数 ========================

/**
 * 解析 src/routes/index.ts 中的 routes 数组，建立
 * 文件夹名（小写）→ meta.title 的映射。
 */
function buildFolderTitleMap(routesFilePath) {
  const map = {}
  if (!existsSync(routesFilePath)) {
    console.warn(`⚠️  未找到路由文件: ${routesFilePath}`)
    return map
  }

  const content = readFileSync(routesFilePath, 'utf-8')

  // 匹配每个路由块的 path 和 meta.title
  // 例如:
  //   path: '/apparent-motion-of-the-Sun',
  //   meta: {
  //     title: '太阳视运动',
  //   },
  const routeRegex = /path:\s*'([^']+)'[\s\S]*?meta:\s*\{[\s\S]*?title:\s*'([^']+)'/g
  let match
  while ((match = routeRegex.exec(content)) !== null) {
    const routePath = match[1]  // 例如 '/apparent-motion-of-the-Sun'
    const title = match[2]      // 例如 '太阳视运动'
    // 去掉前导 / 并转小写作为文件夹匹配 key
    const folderKey = routePath.replace(/^\//, '').toLowerCase()
    map[folderKey] = title
  }

  console.log(`📖 从路由文件解析到 ${Object.keys(map).length} 个标题映射`)
  return map
}

// ======================== 模板 ========================

const MAIN_TS_CONTENT = `import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import Index from './index.vue'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export function initAPP() {
  const app = createApp(Index)
  app.use(ElementPlus)

  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
  app.mount('#app')
}
`



function createAstroContent(folderName, title = '地震') {
  return `<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content="Astro" />
    <link href="/sty/quill.snow.css" rel="stylesheet" />
    <link rel="stylesheet" href="/cesium/Widgets/widgets.css" />
    <script is:inline src="/purify.min.js"></script>
    <script is:inline src="/cesium/Cesium.js"></script>
    <title>${title}</title>
    <style>
     * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body,#app {
      height: 100%;
    }
    </style>
  </head>
  <body style="background-color: #2c3036;">
    <div id="app"></div>
  </body>
</html>

<script>
  import { clearStoreItem, getStoreItem, setStoreItem, showGlobalLoading, hideGlobalLoading, getUrlParams, APIPrefix } from '@/utils/help_fn'
  import { initAPP } from '@/components/geo/${folderName}/main'

  if (window && window.location.href.indexOf('casToken=') >= 0) {
    // 重新获取token
    clearStoreItem()
    if (getUrlParams('casToken')) {
      const casToken = getUrlParams('casToken')
      const replaceState = window.location.href.replace(\`casToken=\${casToken}&\`, '').replace(\`casToken=\${casToken}\`, '')
      window.history.replaceState(undefined, '', replaceState)
      const response = await fetch(\`\${APIPrefix}/subject/appUser/loginByCasToken?eduProxyToken=\${casToken}&subjectFlag=DL\`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const res = await response.json()
        const data = res.data
        setStoreItem('userInfo', data.user)
        initAPP()
      }
      hideGlobalLoading()
    } else {
      hideGlobalLoading()
    }
  } else {
    var userInfo = getStoreItem('userInfo')
    if (userInfo) {
      if (userInfo.userType) {
        initAPP()
      }
    } else {
      document.getElementById('app')!.innerHTML = \`
          <p class="text-slate-400 text-center py-12">
            未获取到当前用户信息，请登录后再试
          </p>\`
    }
    hideGlobalLoading()
  }
</script>
`
}

// ======================== 主逻辑 ========================

function main() {
  // 1. 确保输出目录存在
  for (const dir of [OUTPUT_DIR, GEO_DIR, ASTRO_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
      console.log(`✅ 创建目录: ${dir}`)
    }
  }

  // 2. 扫描 src/views/ 下的所有文件夹
  const entries = existsSync(VIEWS_DIR)
    ? readdirSync(VIEWS_DIR, { withFileTypes: true })
    : []

  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const indexPath = join(VIEWS_DIR, name, 'index.vue')
      return existsSync(indexPath)
    })
    .filter((name) => !EXCLUDED_FOLDERS.includes(name))

  if (folders.length === 0) {
    console.warn('⚠️  未找到包含 index.vue 的文件夹')
  }

  console.log(`📂 发现 ${folders.length} 个组件文件夹: ${folders.join(', ')}`)

  // 3. 构建文件夹→标题映射
  const titleMap = buildFolderTitleMap(ROUTES_FILE)

  // 4. 读取上次报告，用于对比修改状态
  let prevReport = {}
  const reportPath = join(OUTPUT_DIR, 'report.json')
  if (existsSync(reportPath)) {
    try {
      prevReport = JSON.parse(readFileSync(reportPath, 'utf-8'))
    } catch { /* ignore */ }
  }

  // 5. 处理每个文件夹
  const report = {}

  for (const folderName of folders) {
    const srcFolder = join(VIEWS_DIR, folderName)
    const indexPath = join(srcFolder, 'index.vue')
    const mainTsPath = join(srcFolder, 'main.ts')

    // 目标路径
    const geoFolder = join(GEO_DIR, folderName)
    const geoIndexPath = join(geoFolder, 'index.vue')
    const geoMainTsPath = join(geoFolder, 'main.ts')

    // 确保 geo 子目录存在
    if (!existsSync(geoFolder)) {
      mkdirSync(geoFolder, { recursive: true })
    }

    // 4a. 复制 index.vue 到 output/geo/<folder>/
    if (existsSync(indexPath)) {
      const content = readFileSync(indexPath, 'utf-8')
      writeFileSync(geoIndexPath, content, 'utf-8')
      console.log(`  ✅ 复制: ${indexPath} → ${geoIndexPath}`)
    }

    // 4c. 创建 output/geo/<folder>/main.ts
    writeFileSync(geoMainTsPath, MAIN_TS_CONTENT, 'utf-8')
    console.log(`  ✅ 创建: ${geoMainTsPath}`)

    // 4d. 创建 output/astro/<folder>.astro
    const folderKey = folderName.toLowerCase()
    const title = titleMap[folderKey] || '地震'
    const astroPath = join(ASTRO_DIR, `${folderName}.astro`)
    writeFileSync(astroPath, createAstroContent(folderName, title), 'utf-8')
    console.log(`  ✅ 创建: ${astroPath}`)

    // 4e. 记录 index.vue 的最后修改时间
    const stat = statSync(indexPath)
    const mtime = stat.mtime
    const pad = (n) => String(n).padStart(2, '0')
    const formattedTime = `${mtime.getFullYear()}-${pad(mtime.getMonth() + 1)}-${pad(mtime.getDate())} ${pad(mtime.getHours())}:${pad(mtime.getMinutes())}:${pad(mtime.getSeconds())}`
    const prevTimestamp = prevReport[folderName]?.lastModifiedTimestamp
    const modified = prevTimestamp === undefined || stat.mtimeMs !== prevTimestamp
    report[folderName] = {
      name: title,
      modified,
      lastModified: formattedTime,
      lastModifiedTimestamp: stat.mtimeMs,
    }
  }

  // 6. 复制 src/styles/ → output/styles/
  const outputStylesDir = join(OUTPUT_DIR, 'styles')
  if (existsSync(STYLES_DIR)) {
    if (existsSync(outputStylesDir)) {
      // 先删除已存在的
      rmSync(outputStylesDir, { recursive: true, force: true })
    }
    cpSync(STYLES_DIR, outputStylesDir, { recursive: true })
    console.log(`✅ 复制: ${STYLES_DIR} → ${outputStylesDir}`)
  } else {
    console.warn('⚠️  src/styles/ 目录不存在，跳过')
  }

  // 7. 生成 report.json
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`✅ 生成报告: ${reportPath}`)

  // 8. 生成修改报告（仅 modified 为 true 的条目）
  const modifiedEntries = Object.fromEntries(
    Object.entries(report).filter(([, entry]) => entry.modified)
  )
  const modifiedReportPath = join(OUTPUT_DIR, 'report-modified.json')
  writeFileSync(modifiedReportPath, JSON.stringify(modifiedEntries, null, 2), 'utf-8')
  console.log(`✅ 生成修改报告: ${modifiedReportPath}`)

  console.log('\n🎉 全部完成！')
}

main()
