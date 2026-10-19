import type { GlobeSceneState } from './globe-scene'
import { AXIAL_TILT_DEGREES } from './globe-constants.ts'
import { createTraceProgress, TRACE_DEFINITIONS, TRACE_ORDER, type TraceId } from './globe-tracing.ts'

export interface LearningStep {
  title: string
  eyebrow: string
  instruction: string
  hint: string
  concept: string
}

export const STEP_INDEX = {
  sphere: 0,
  axis: 1,
  map: 2,
  equator: 3,
  grid: 4,
  tilt: 5,
  stand: 6,
} as const

export const STEPS: LearningStep[] = [
  {
    title: '放上球体',
    eyebrow: '01 · 认识模型',
    instruction: '从材料工具箱拖出球体，把它放到工作台中央。',
    hint: '按住工具箱中的球体材料，把它拖入工作台后松开。也可以先选择材料，再点击工作台放置。',
    concept: '地球仪是地球的缩小模型。真实地球两极稍扁、赤道略鼓，这里用球体作简化表示。',
  },
  {
    title: '装轴 · 标两极',
    eyebrow: '02 · 认识地轴与两极',
    instruction: '拖入地轴，让它穿过球心，再把 N 和 S 标签拖到两极。',
    hint: '从工具箱拖入地轴并调整到球心。把 N 标签拖到标有“北端参考”的一端，把 S 标签拖到另一端。',
    concept: '地轴是地球自转的假想轴，穿过地心。它与地球表面相交的两点是南、北极；模型中的轴杆帮助我们观察。',
  },
  {
    title: '贴上海陆图',
    eyebrow: '03 · 认识海陆分布',
    instruction: '把工具箱中的平面海陆图拖到球体上，看地图慢慢卷贴到球面，再转动观察海陆分布。',
    hint: '拖到球体上松手，地图会从一侧逐段卷贴，接缝合拢后就贴好了。先观察海陆分布，接下来再描出赤道和经纬线来确定位置。',
    concept: '海陆图表现地球表面的海陆分布，经纬线是人们为确定位置而设想的线。这里的卷贴是动画示意；实际用纸制作时，通常需要把地图裁成若干瓣片再粘贴。',
  },
  {
    title: '描出赤道',
    eyebrow: '04 · 平分南北半球',
    instruction: '拿起画笔，从起点沿球面的引导线描出赤道。',
    hint: '按住画笔往终点拖动，画笔会自动沿固定轨迹描画，不需要精确贴着虚线移动。完成可见的半圈后，球体翻面，再描另一半。',
    concept: '赤道是 0° 纬线，也是最大的纬线圈。它所在的平面经过地心并垂直于地轴，把地球分为南、北半球。',
  },
  {
    title: '描线 · 加经纬网',
    eyebrow: '05 · 建立位置参照',
    instruction: '依次描出北、南回归线和 20°W、160°E 经线，再把解锁的完整经纬网拖到球面上。',
    hint: '先描北回归线，再描南回归线；接着描 20°W 和 160°E 经线。四条线都完成后，就能添加完整经纬网，包括蓝色虚线的南、北极圈。',
    concept: '南、北回归线分别位于南、北纬 23°26′，南、北极圈分别位于南、北纬约 66°34′。20°W 与 160°E 两条经线组成经线圈，通常用作东、西半球的分界线。',
  },
  {
    title: '调整地轴倾角',
    eyebrow: '06 · 认识倾斜关系',
    instruction: '直接拖动球体，让地轴与公转轨道平面法线的夹角达到 23°26′。',
    hint: '法线就是垂直于轨道平面的参考线。拖动球体，观察它与地轴的夹角，接近 23°26′ 时会吸附到目标，松手完成调整。画面中的左右倾斜方向会随观察视角改变。',
    concept: '黄赤交角是赤道平面与公转轨道平面的夹角。本模型采用教学值 23°26′，它也等于地轴与轨道平面法线的夹角；地轴与轨道平面本身的夹角约为 66°34′。',
  },
  {
    title: '装配支架',
    eyebrow: '07 · 完成你的作品',
    instruction: '先把支架拖到透明轮廓，再把场景上方暂放的球体拖进支架中间的透明球位。',
    hint: '先对准透明支架轮廓放好支架，再拖动上方暂放的球体，放入支架中间的透明球位。球体装好后，你的地球仪就制作完成了，可以自由转动和观察。',
    concept: '本模型用底座所在平面模拟公转轨道平面。地轴与该平面的垂线（法线）夹角为 23°26′，与该平面夹角约为 66°34′。',
  },
]

export function createInitialState(): GlobeSceneState {
  return {
    sphere: false,
    axis: false,
    poles: false,
    equator: false,
    grid: false,
    latitude: false,
    longitude: false,
    tropics: false,
    polarCircles: false,
    map: false,
    stand: false,
    mounted: false,
    rotating: false,
    traces: createTraceProgress(),
    activeTrace: null,
    axialTilt: 0,
    tiltAdjusted: false,
    axisOffset: 0.35,
    equatorOffset: 0,
    equatorTilt: 0,
    northLabel: null,
    southLabel: null,
    focus: 'assembly',
    selectedTool: null,
  }
}

export interface StepCheck {
  ok: boolean
  message: string
}

// The small tolerance accommodates pointer/slider input; exact geometry is the target.
const CENTER_TOLERANCE = 0.015
const TILT_TOLERANCE_DEGREES = 1
const AXIAL_TILT_TOLERANCE_DEGREES = 0.5

function traceComplete(state: GlobeSceneState, id: TraceId): boolean {
  return state.traces[id] === 1
}

function withinTolerance(value: number, tolerance: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= tolerance
}

export function checkStep(step: number, state: GlobeSceneState): StepCheck {
  if (!Number.isInteger(step) || step < 0 || step >= STEPS.length) {
    return { ok: false, message: '请选择一个制作步骤，再检查你的作品。' }
  }

  if (!state.sphere) {
    return { ok: false, message: '先放上球体。我们需要用球体来表示地球的基本形状。' }
  }
  if (step >= STEP_INDEX.axis) {
    if (!state.axis) {
      return { ok: false, message: '先安装地轴。它帮助我们表示地球绕着哪条假想轴自转。' }
    }
    if (!withinTolerance(state.axisOffset, CENTER_TOLERANCE)) {
      return { ok: false, message: '地轴还没有穿过球心。请移动地轴，让它通过中央的球心标记。' }
    }
    if (state.northLabel === null || state.southLabel === null) {
      return { ok: false, message: '两极还没有标全。地轴与球面的两个交点分别是北极 N 和南极 S。' }
    }
    if (state.northLabel !== 'N' || state.southLabel !== 'S') {
      return { ok: false, message: '检查一下两极标签：标有“北端参考”的一端为北极 N，另一端为南极 S。' }
    }
  }
  if (step >= STEP_INDEX.map && !state.map) {
    return { ok: false, message: '先把海陆图拖到球面上，观察真实的海陆分布，再叠加用于定位的赤道和经纬网。' }
  }
  if (step >= STEP_INDEX.equator) {
    if (!state.equator || !traceComplete(state, 'equator')) {
      return { ok: false, message: '请先沿引导线描完整条赤道，包括球体另一面的半圈。赤道把球体分成南、北两个半球。' }
    }
    if (!withinTolerance(state.equatorOffset, CENTER_TOLERANCE)) {
      return { ok: false, message: '这个圆环还不能平分南、北半球。移动它，使圆环所在平面经过球心。' }
    }
    if (!withinTolerance(state.equatorTilt, TILT_TOLERANCE_DEGREES)) {
      return { ok: false, message: '圆环的方向还需要调整。赤道所在平面必须与地轴垂直。' }
    }
  }
  if (step >= STEP_INDEX.grid) {
    for (const id of TRACE_ORDER.slice(1)) {
      if (!traceComplete(state, id)) {
        return { ok: false, message: `请沿引导线描完${TRACE_DEFINITIONS[id].label}。描线完成后才能添加完整经纬网。` }
      }
    }
    if (!state.tropics) {
      return { ok: false, message: '请确认南、北回归线都已描出，它们分别位于南、北纬 23°26′。' }
    }
    if (!state.grid || !state.latitude || !state.longitude || !state.polarCircles) {
      return { ok: false, message: '重要的线已经描好了。把已解锁的完整经纬网拖到球面上，补齐其余经纬线与南、北极圈。' }
    }
  }
  if (step >= STEP_INDEX.tilt) {
    if (!state.tiltAdjusted) {
      return { ok: false, message: '请亲手拖动球体，调整地轴与公转轨道平面法线的夹角，接近 23°26′ 后松手。' }
    }
    if (!withinTolerance(state.axialTilt - AXIAL_TILT_DEGREES, AXIAL_TILT_TOLERANCE_DEGREES)) {
      return { ok: false, message: '地轴倾角还需要调整。请拖动球体，使地轴与轨道平面法线的夹角达到 23°26′。' }
    }
  }
  if (step >= STEP_INDEX.stand) {
    if (!state.stand) {
      return { ok: false, message: '先把工具箱中的支架拖到场景中的透明支架轮廓，让支架就位。' }
    }
    if (!state.mounted) {
      return { ok: false, message: '支架已经就位。再把场景上方暂放的球体拖进支架中间的透明球位，就能完成你的地球仪。' }
    }
  }

  const messages = [
    '球体已就位！接下来找到地轴和两极。',
    '地轴通过球心，两极标记正确！接下来把海陆图贴到球面上。',
    '海陆图已贴好！接下来亲手描出赤道，观察南、北半球的海陆分布。',
    '赤道已描好！它所在的平面经过球心并垂直于地轴。接下来描回归线与半球分界线。',
    '描线与经纬网都已完成！接下来直接拖动球体，调整地轴倾角。',
    '地轴倾角已调整！接下来先放好支架，再把球体装进支架中间。',
    '地球仪已组装完成！转动你的作品，观察海陆分布和经纬线吧。',
  ]
  return { ok: true, message: messages[step]! }
}
