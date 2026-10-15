import type { GlobeSceneState } from './globe-scene'

export interface LearningStep {
  title: string
  eyebrow: string
  instruction: string
  hint: string
  concept: string
}

export const STEPS: LearningStep[] = [
  {
    title: '放上球体',
    eyebrow: '01 · 认识模型',
    instruction: '从左侧工具箱拖出球体，把它放到工作台中央。',
    hint: '按住左侧的球体材料，把它拖入工作台后松开。也可以先选择材料，再点击工作台放置。',
    concept: '地球仪是地球的缩小模型。真实地球两极稍扁、赤道略鼓，这里用球体作简化表示。',
  },
  {
    title: '装轴 · 标两极',
    eyebrow: '02 · 找到旋转中心',
    instruction: '拖入地轴，让它穿过球心，再把 N 和 S 标签拖到两极。',
    hint: '从左侧拖入地轴并调整到球心。把 N 标签拖到标有“北端参考”的一端，把 S 标签拖到另一端。',
    concept: '地轴是地球自转的假想轴，穿过地心。它与地球表面相交的两点是南、北极；模型中的轴杆帮助我们观察。',
  },
  {
    title: '套上赤道',
    eyebrow: '03 · 平分南北半球',
    instruction: '从左侧拖入赤道圆环，调整位置和角度，让它成为赤道。',
    hint: '赤道所在平面既要经过球心，也要与地轴垂直。先调整偏移，再调整倾斜角度。',
    concept: '赤道是 0° 纬线，也是最大的纬线圈。它所在的平面经过地心并垂直于地轴，把地球分为南、北半球。',
  },
  {
    title: '添加经纬网',
    eyebrow: '04 · 建立位置参照',
    instruction: '把纬线、经线、回归线和极圈拖到球体上，观察它们的位置。',
    hint: '赤道用红色实线，回归线用黄色虚线，极圈用蓝色虚线。也可以从左侧拖入海陆图，帮助辨认位置。',
    concept: '经纬线是为确定位置而设想的线。经线连接两极，纬线与赤道平行。南、北回归线位于南、北纬 23°26′，南、北极圈位于南、北纬 66°34′。',
  },
  {
    title: '装上支架',
    eyebrow: '05 · 检验我的作品',
    instruction: '从左侧拖入支架，观察自转，再完成三个小挑战。',
    hint: '从北极上空向下看，地球自转是逆时针；从南极上空看则是顺时针。两种视角表示同一个自西向东的转动。',
    concept: '本模型用底座所在平面模拟公转轨道平面。地轴与该平面的垂线（法线）夹角约为 23°26′，与该平面夹角约为 66°34′。',
  },
]

export interface QuizQuestion {
  question: string
  options: string[]
  answer: number
  explanation: string
}

export const QUIZ: QuizQuestion[] = [
  {
    question: '哪一个圆环可以表示赤道？',
    options: ['所在平面经过球心，并与地轴垂直', '只要经过球心，怎样倾斜都可以', '只要与地轴垂直，放在哪里都可以'],
    answer: 0,
    explanation: '赤道所在平面必须同时满足两个条件：经过球心、垂直于地轴。它将球体分成南、北两个半球。',
  },
  {
    question: '在球体模型上，经线与纬线有什么区别？',
    options: ['经线和纬线都经过南、北极', '经线是连接两极的半圆，纬线是与赤道平行的圆（两极除外）', '经线是完整的圆，纬线是半圆'],
    answer: 1,
    explanation: '每条经线是连接两极的半圆；两条相对的经线可组成一个经线圈。纬线是圆，越接近两极越小，在两极退化为点。',
  },
  {
    question: '从北极上空向下看，地球怎样自转？',
    options: ['顺时针', '每天改变转动方向', '逆时针'],
    answer: 2,
    explanation: '地球自西向东自转。从北极上空向下看是逆时针，从南极上空向下看则是顺时针。',
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
    rotating: false,
    axisOffset: 0.35,
    equatorOffset: 0.28,
    equatorTilt: 25,
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
  if (step >= 1) {
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
  if (step >= 2) {
    if (!state.equator) {
      return { ok: false, message: '先安装赤道圆环。赤道把球体分成南、北两个半球。' }
    }
    if (!withinTolerance(state.equatorOffset, CENTER_TOLERANCE)) {
      return { ok: false, message: '这个圆环还不能平分南、北半球。移动它，使圆环所在平面经过球心。' }
    }
    if (!withinTolerance(state.equatorTilt, TILT_TOLERANCE_DEGREES)) {
      return { ok: false, message: '圆环的方向还需要调整。赤道所在平面必须与地轴垂直。' }
    }
  }
  if (step >= 3) {
    if (!state.latitude && !state.longitude) {
      return { ok: false, message: '把纬线和经线分别拖到球体上，观察平行的圆与连接两极的半圆有什么不同。' }
    }
    if (!state.latitude) {
      return { ok: false, message: '还缺少纬线。纬线圈与赤道平行，越接近两极，纬线圈越小。' }
    }
    if (!state.longitude) {
      return { ok: false, message: '还缺少经线。每一条经线都是连接南、北极的半圆。' }
    }
    if (!state.tropics) {
      return { ok: false, message: '把黄色虚线的回归线拖到球体上。南、北回归线分别位于南、北纬 23°26′。' }
    }
    if (!state.polarCircles) {
      return { ok: false, message: '把蓝色虚线的极圈拖到球体上。南、北极圈分别位于南、北纬 66°34′。' }
    }
  }
  if (step >= 4 && !state.stand) {
    return { ok: false, message: '为地球仪安装支架，让球体能够绕地轴转动，再检验你的作品。' }
  }

  const messages = [
    '球体已就位！接下来找到地轴和两极。',
    '地轴通过球心，两极标记正确！接下来安装赤道。',
    '赤道所在平面经过球心，并与地轴垂直！接下来添加经纬线。',
    '经纬网已完成！转动观察后，给作品装上支架。',
    '地球仪已组装完成！现在用三个小挑战检验你的发现。',
  ]
  return { ok: true, message: messages[step]! }
}
