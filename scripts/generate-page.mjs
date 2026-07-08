import { createInterface } from 'readline/promises'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const rl = createInterface({ input: process.stdin, output: process.stdout })

async function main() {
  console.log('\n📄 创建新页面\n')

  // 1. 收集输入
  const routeName = (await rl.question('🔗 资源路由名称 (kebab-case，如 my-route): ')).trim()
  if (!routeName) {
    console.error('❌ 路由名称不能为空')
    rl.close()
    return
  }

  const title = (await rl.question('📛 资源名称 (中文，如 我的资源): ')).trim()
  if (!title) {
    console.error('❌ 资源名称不能为空')
    rl.close()
    return
  }

  rl.close()

  const viewDir = join(root, 'src', 'views', routeName)
  const viewFile = join(viewDir, 'index.vue')
  const routesFile = join(root, 'src', 'routes', 'index.ts')

  // 2. 检查是否已存在
  if (existsSync(viewDir)) {
    console.error(`❌ 目录已存在: src/views/${routeName}/`)
    return
  }

  // 3. 创建 view 文件
  mkdirSync(viewDir, { recursive: true })
  const vueTemplate = `<template>
  <div class="${routeName}-container">
    <h1>${title}</h1>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.${routeName}-container {
  height: 100%;
  color: #fff;
}
</style>
`
  writeFileSync(viewFile, vueTemplate, 'utf-8')
  console.log(`✅ 已创建: src/views/${routeName}/index.vue`)

  // 4. 在路由表中注册（仅在 routes 数组中插入）
  const routeEntry = `  {
    path: '/${routeName}',
    name: '${routeName}',
    meta: {
      title: '${title}',
    },
    component: () => import('@/views/${routeName}/index.vue'),
  },
`

  let routesContent = readFileSync(routesFile, 'utf-8')
  // 精确查找 routes 数组结尾: "]," 后紧跟换行 + "export const routesNav"
  // 兼容 Windows (\r\n) 和 Unix (\n) 换行
  const marker = routesContent.includes('\r\n')
    ? ']\r\n\r\nexport const routesNav'
    : ']\n\nexport const routesNav'
  const insertPos = routesContent.indexOf(marker)
  if (insertPos === -1) {
    console.error('❌ 无法定位 routes 数组结尾')
    return
  }
  routesContent = routesContent.slice(0, insertPos) + routeEntry + routesContent.slice(insertPos)
  writeFileSync(routesFile, routesContent, 'utf-8')
  console.log(`✅ 已注册路由: /${routeName} → "${title}"`)

  console.log(`\n🎉 完成！请重启 dev server 后访问 /${routeName}\n`)
}

main().catch(console.error)
