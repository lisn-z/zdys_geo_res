# 地理资源

基于 Vue 3 + TypeScript + Vite 构建的地理教学交互工具集。

## 技术栈

| 包名 | 用途 |
|---|---|
| **Vue 3** (`^3.5.29`) | 前端框架 |
| **Vue Router** (`^5.1.0`) | 路由管理 |
| **Vite** (`^7.3.1`) | 构建工具 |
| **TypeScript** (`~5.9.3`) | 类型检查 |
| **Element Plus** (`^2.13.5`) | UI 组件库 |
| **Three.js** (`^0.184.0`) | 3D 场景渲染 |
| **Leaflet** (`^1.9.4`) | 地图渲染 |
| **vite-plugin-cesium** (`^1.2.23`) | Cesium 集成 |

## 路由注册

使用 `vue-router` 的 `createWebHistory` 模式，所有路由集中定义在 `src/routes/index.ts`。

### 规则

- 路由 **路径** 使用 `kebab-case`（短横线分隔小写），如 `/apparent-motion-of-the-Sun`
- 路由 **name** 与 path 保持一致
- 每个路由的 `meta.title` 为中文显示名称，用于导航卡片渲染
- 组件使用**懒加载**：`() => import('@/views/xxx/index.vue')`

### 当前路由表

| 路径 | 名称 | 标题 |
|---|---|---|
| `/` | `/` | 首页 |
| `/apparent-motion-of-the-Sun` | `apparent-motion-of-the-Sun` | 太阳视运动 |
| `/earth-motion` | `earth-motion` | 地球运动 |
| `/grid-system-mini-game` | `grid-system-mini-game` | 经纬网小游戏 |
| `/zdys-calculator` | `zdys-calculator` | 智地有申计算器 |

### 导航

`routesNav` 由 `routes.map` 生成，仅保留 `path` / `name` / `meta`，供首页导航卡片渲染使用（见 `App.vue`）。

## Views 目录规范

```
src/views/
├── apparent-motion-of-the-sun/    # 太阳视运动 — Three.js 3D 交互
│   └── index.vue
├── earth-motion/                  # 地球运动
│   └── index.vue
├── grid-system-mini-game/         # 经纬网小游戏 — Leaflet 地图
│   └── index.vue
└── zdys-calculator/               # 智地有申计算器
    └── index.vue
```

### 命名规范

1. **目录名** — `kebab-case`，与路由 path 对应
2. **入口文件** — 统一命名为 `index.vue`
3. **组件内依赖** — 如 `Three.js` 场景、工具函数等，放在对应目录下作为局部模块（如 `./skyColors.ts`），不跨目录引用

### 开发建议

- 新增页面时，在 `src/views/` 下新建 `kebab-case` 目录，内含 `index.vue`
- 在 `src/routes/index.ts` 中添加对应路由配置
- 每个页面作为一个独立功能模块，内部可拆分组件或工具文件，不与其他页面共享

## 常用命令

```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
npm run type-check   # 运行 TypeScript 类型检查
```
