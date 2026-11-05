import { BRAND_LOGO, SITES, SOURCES } from './lesson'
import type { PlayerRecord } from './types'

type Progress = (message: string) => void
type TextStyle = { size: number; line: number; color: string; bold?: boolean }
type Command =
  | { kind: 'text'; text: string; x: number; y: number; style: TextStyle }
  | { kind: 'line'; y: number }
  | { kind: 'photo'; image: HTMLImageElement | null; x: number; y: number; width: number; height: number; index: number }
type PagePlan = { commands: Command[]; photos: number }
type PreparedReport = { pages: PagePlan[]; logo: HTMLImageElement | null; date: string }

const WIDTH = 1440, HEIGHT = 2036, MARGIN = 88, CONTENT_WIDTH = WIDTH - MARGIN * 2
const TOP = 220, BOTTOM = HEIGHT - 120
const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'
const BODY: TextStyle = { size: 28, line: 45, color: '#293c37' }
const SMALL: TextStyle = { size: 22, line: 35, color: '#63736b' }
const FIELD: TextStyle = { size: 25, line: 40, color: '#416a59', bold: true }
const TITLE: TextStyle = { size: 35, line: 54, color: '#214b3c', bold: true }
const SUBTITLE: TextStyle = { size: 29, line: 46, color: '#34584a', bold: true }
const LEGACY_SITES = [
  { id: 'drain', title: '排水观察点' },
  { id: 'plaza', title: '中央广场与游客路线' },
] as const
const text = (value: unknown): string => typeof value === 'string' ? value : ''
const font = (style: TextStyle) => `${style.bold ? '700' : '400'} ${style.size}px ${FONT}`
const nextPaint = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function formatDate(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '未记录时间'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}

function loadImage(source: string, remote = false): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const image = new Image()
    let done = false
    const finish = (result: HTMLImageElement | null) => {
      if (done) return
      done = true; clearTimeout(timer); image.onload = null; image.onerror = null; resolve(result)
    }
    const timer = setTimeout(() => finish(null), remote ? 5000 : 10000)
    image.decoding = 'async'
    if (remote) image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) { finish(null); return }
      if (remote) {
        // Check origin cleanliness before the logo touches a report page. A
        // missing CORS header must never prevent the student's PNG export.
        try {
          const probe = document.createElement('canvas'); probe.width = probe.height = 1
          const ctx = probe.getContext('2d')
          if (!ctx) { finish(null); return }
          ctx.drawImage(image, 0, 0, 1, 1); ctx.getImageData(0, 0, 1, 1)
        } catch { finish(null); return }
      }
      finish(image)
    }
    image.onerror = () => finish(null)
    image.src = source
  })
}

function wrap(context: CanvasRenderingContext2D, value: string, style: TextStyle): string[] {
  context.font = font(style)
  const lines: string[] = []
  const paragraphs = value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')
  for (const paragraph of paragraphs) {
    if (!paragraph) { lines.push(''); continue }
    let line = ''
    for (const character of Array.from(paragraph)) {
      const trial = line + character
      if (line && context.measureText(trial).width > CONTENT_WIDTH) {
        // Keep closing Chinese punctuation with a preceding character, while
        // retaining every character and staying inside the printable area.
        const chars = Array.from(line)
        if (/[，。！？；：、）】》」』]/u.test(character) && chars.length > 1) {
          const carry = chars.pop()!; lines.push(chars.join('')); line = carry + character
        } else if (/[（【《「『]$/u.test(line) && chars.length > 1) {
          const carry = chars.pop()!; lines.push(chars.join('')); line = carry + character
        } else { lines.push(line); line = character }
      } else line = trial
    }
    lines.push(line)
  }
  return lines
}

async function prepare(record: PlayerRecord, onProgress?: Progress): Promise<PreparedReport> {
  onProgress?.('正在整理完整笔记与照片…')
  // Copy strings and photo metadata before asynchronous work; editing the page
  // during an export must not mix two versions of a student's report.
  const snapshot: PlayerRecord = {
    ...record, visited: [...record.visited],
    // Removing an activity must not discard the student's earlier writing.
    // Copy the complete note collection; only presentation follows active SITES.
    notes: Object.fromEntries(Object.entries(record.notes).map(([id, note]) => [id, { ...note }])) as PlayerRecord['notes'],
    photos: record.photos.map(photo => ({ ...photo })), proposal: { ...record.proposal },
  }
  if (snapshot.photos.length > 6) throw new Error('一份记录最多导出 6 张照片，请先整理照片后重试。文字内容不会被截断。')
  if (document.fonts) await Promise.race([document.fonts.ready, new Promise<void>(resolve => setTimeout(resolve, 1500))])
  const [logo, ...images] = await Promise.all([
    loadImage(BRAND_LOGO, true),
    ...snapshot.photos.map(photo => /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(photo.data) ? loadImage(photo.data) : Promise.resolve(null)),
  ])
  const measure = document.createElement('canvas').getContext('2d')
  if (!measure) throw new Error('浏览器无法创建导出画布，请重试或更换支持 Canvas 的浏览器。')
  const pages: PagePlan[] = []
  let page: PagePlan, y = TOP
  const newPage = () => { page = { commands: [], photos: 0 }; pages.push(page); y = TOP }
  newPage()
  const space = (height: number) => { if (y + height > BOTTOM) newPage() }
  const paragraph = (value: string, style: TextStyle = BODY, gap = 14) => {
    for (const line of wrap(measure, value, style)) {
      space(style.line)
      page.commands.push({ kind: 'text', text: line, x: MARGIN, y, style }); y += style.line
    }
    y = Math.min(BOTTOM, y + gap)
  }
  const heading = (value: string, major = false, followingHeight = BODY.line * 2) => {
    const style = major ? TITLE : SUBTITLE, lines = wrap(measure, value, style)
    // Include intervening subtitles/field labels when keeping a heading with
    // its first content; otherwise the heading can be stranded at a page end.
    space(lines.length * style.line + followingHeight + (major ? 56 : 14))
    if (major) { y += 18; page.commands.push({ kind: 'line', y }); y += 24 }
    paragraph(value, style, 14)
  }
  const field = (label: string, value: string) => {
    space(FIELD.line + BODY.line * 2)
    paragraph(label, FIELD, 1)
    paragraph(value || '（尚未记录）')
  }

  paragraph(`姓名：${text(snapshot.name) || '未填写'}`, SUBTITLE)
  paragraph(`记录时间：${formatDate(snapshot.updatedAt)}`, SMALL, 8)
  const visited = SITES.filter(site => snapshot.visited.includes(site.id)).map(site => site.title).join('、')
  paragraph(`探索足迹：${visited || '尚未记录到访地点'}`, SMALL, 12)
  paragraph('围绕自然环境、保护问题与政府建议，保留观察、资料和思考。照片是本游戏教学模型的截图。', SMALL, 22)

  const noteStart = SMALL.line + 8 + FIELD.line + 1 + BODY.line * 2
  heading('一、我的调查笔记', true, SUBTITLE.line + 14 + noteStart)
  for (const [index, site] of SITES.entries()) {
    heading(`${index + 1}. ${site.title}`, false, noteStart)
    paragraph(site.subtitle, SMALL, 8)
    const note = snapshot.notes[site.id]
    field('我观察到的现象', text(note?.observation))
    field('我的解释与可能原因', text(note?.cause))
    field('资料来源与依据', text(note?.source))
  }

  heading('二、照片与现场说明', true, snapshot.photos.length ? SUBTITLE.line + SMALL.line + 520 + BODY.line * 2 + 45 : BODY.line * 2)
  if (!snapshot.photos.length) paragraph('本次记录尚未保存照片。')
  for (const [index, photo] of snapshot.photos.entries()) {
    const image = images[index] ?? null
    const legacyTitle = LEGACY_SITES.find(site => site.id === photo.site)?.title
    const title = SITES.find(site => site.id === photo.site)?.title ?? (legacyTitle ? `${legacyTitle}（早期记录）` : '探索地点')
    const frameHeight = 520
    // At most two images per page, including a failed-image placeholder. Long
    // captions continue as normal text on later pages instead of being clipped.
    if (page!.photos >= 2 || y + SUBTITLE.line + SMALL.line + frameHeight + BODY.line * 2 + 45 > BOTTOM) newPage()
    paragraph(`照片 ${index + 1} · ${title}`, SUBTITLE, 4)
    paragraph(`拍摄于 ${formatDate(photo.createdAt)}`, SMALL, 12)
    page!.commands.push({ kind: 'photo', image, x: MARGIN, y, width: CONTENT_WIDTH, height: frameHeight, index: index + 1 })
    page!.photos++; y += frameHeight + 18
    paragraph(text(photo.caption) || '（尚未填写照片说明）')
  }

  heading('三、给当地政府的保护建议', true, FIELD.line + 1 + BODY.line * 2)
  field('优先解决的问题与依据', text(snapshot.proposal.priority))
  field('准备采取的措施', text(snapshot.proposal.measures))
  field('需要权衡的代价与不同群体', text(snapshot.proposal.tradeoffs))
  field('怎样检查效果、继续改进', text(snapshot.proposal.evaluation))

  heading('四、我的反思与自我检查', true, SMALL.line + 14 + BODY.line * 2)
  paragraph('回顾获得的信息、查阅资料的途径、方案中的不足，以及下次可以改进之处。', SMALL)
  paragraph(text(snapshot.reflection) || '（尚未填写反思）')

  heading('五、资料与模型说明', true, SUBTITLE.line + 14 + SMALL.line * 2)
  for (const source of SOURCES) {
    heading(source.title)
    paragraph(source.detail, SMALL, 10)
    if (source.url) paragraph(source.url, SMALL, 18)
  }
  const legacyNotes = LEGACY_SITES.filter(site => {
    const note = snapshot.notes[site.id]
    return [note?.observation, note?.cause, note?.source].some(value => text(value).trim())
  })
  if (legacyNotes.length) {
    heading('附录：早期探索笔记', true, SMALL.line * 2 + SUBTITLE.line + FIELD.line + BODY.line)
    paragraph('以下文字保留自本机旧版本记录。这些活动已移出当前调查任务，无需补填。', SMALL)
    for (const site of legacyNotes) {
      heading(site.title, false, FIELD.line + BODY.line * 2)
      const note = snapshot.notes[site.id]
      for (const [label, value] of [
        ['我观察到的现象', note?.observation],
        ['我的解释与可能原因', note?.cause],
        ['资料来源与依据', note?.source],
      ] as const) {
        if (text(value).trim()) field(label, text(value))
      }
    }
  }
  onProgress?.(`内容已排为 ${pages.length} 页，正在生成图片…`)
  return { pages, logo: logo ?? null, date: formatDate(snapshot.updatedAt) }
}

function renderPage(report: PreparedReport, index: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = WIDTH; canvas.height = HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('导出画布创建失败，未完成的页面可以重试。')
  context.fillStyle = '#f6f4ec'; context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#1d5140'; context.fillRect(0, 0, WIDTH, 12)
  context.textBaseline = 'top'
  context.fillStyle = '#315f4c'; context.font = `700 26px ${FONT}`
  if (report.logo) {
    const scale = Math.min(148 / report.logo.naturalWidth, 66 / report.logo.naturalHeight)
    context.drawImage(report.logo, MARGIN, 49, report.logo.naturalWidth * scale, report.logo.naturalHeight * scale)
  } else context.fillText('智地有申', MARGIN, 61)
  context.fillStyle = '#6c796e'; context.font = `400 22px ${FONT}`
  context.textAlign = 'right'; context.fillText('跨学科主题学习 · 六年级上册', WIDTH - MARGIN, 64); context.textAlign = 'left'
  context.fillStyle = '#244d3c'; context.font = `700 44px ${FONT}`
  context.fillText('马丘比丘古城 · 守护记录', MARGIN, 127)
  context.strokeStyle = '#d5ddcf'; context.lineWidth = 2
  context.beginPath(); context.moveTo(MARGIN, 194); context.lineTo(WIDTH - MARGIN, 194); context.stroke()

  for (const command of report.pages[index]!.commands) {
    if (command.kind === 'text') {
      context.font = font(command.style); context.fillStyle = command.style.color
      context.fillText(command.text, command.x, command.y)
    } else if (command.kind === 'line') {
      context.strokeStyle = '#c6d2c3'; context.lineWidth = 2
      context.beginPath(); context.moveTo(MARGIN, command.y); context.lineTo(WIDTH - MARGIN, command.y); context.stroke()
    } else {
      context.fillStyle = '#e7eadd'; context.fillRect(command.x, command.y, command.width, command.height)
      if (command.image) {
        const scale = Math.min(command.width / command.image.naturalWidth, command.height / command.image.naturalHeight)
        const width = command.image.naturalWidth * scale, height = command.image.naturalHeight * scale
        context.drawImage(command.image, command.x + (command.width - width) / 2, command.y + (command.height - height) / 2, width, height)
      } else {
        context.fillStyle = '#657565'; context.font = `400 26px ${FONT}`; context.textAlign = 'center'
        context.fillText(`照片 ${command.index} 无法读取，文字说明已保留`, command.x + command.width / 2, command.y + command.height / 2 - 15)
        context.textAlign = 'left'
      }
      context.strokeStyle = '#c8d2c3'; context.lineWidth = 2; context.strokeRect(command.x, command.y, command.width, command.height)
    }
  }
  context.strokeStyle = '#d5ddcf'; context.beginPath(); context.moveTo(MARGIN, HEIGHT - 91); context.lineTo(WIDTH - MARGIN, HEIGHT - 91); context.stroke()
  context.fillStyle = '#6a796e'; context.font = `400 20px ${FONT}`
  context.fillText(`教学探索记录 · ${report.date}`, MARGIN, HEIGHT - 66)
  context.textAlign = 'right'; context.fillText(`第 ${index + 1} / ${report.pages.length} 页`, WIDTH - MARGIN, HEIGHT - 66)
  context.textAlign = 'left'
  return canvas
}

/** Local preview/QA entry point. It creates canvases without downloading files. */
export async function renderReportPages(record: PlayerRecord, onProgress?: Progress): Promise<HTMLCanvasElement[]> {
  const report = await prepare(record, onProgress), pages: HTMLCanvasElement[] = []
  for (let index = 0; index < report.pages.length; index++) {
    pages.push(renderPage(report, index)); onProgress?.(`已生成第 ${index + 1} / ${report.pages.length} 页`)
    await nextPaint()
  }
  return pages
}

function png(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try { canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG 图片生成失败，请重试。')), 'image/png') }
    catch (error) { reject(error instanceof Error ? error : new Error('无法导出 PNG 图片。')) }
  })
}

function filename(record: PlayerRecord): string {
  const name = (text(record.name).trim() || '守护员').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 36)
  const date = new Date(record.updatedAt)
  const stamp = Number.isFinite(date.getTime()) ? `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}` : '未注明日期'
  return `马丘比丘守护记录_${name}_${stamp}`
}

export interface ReportImage {
  url: string
  filename: string
  pages: string
}

/**
 * Combines up to four complete report pages into each local PNG. No downloads
 * are triggered here: the caller presents explicit links and owns successful
 * object URLs until it replaces the images or unmounts its export UI.
 */
export async function createReportImages(record: PlayerRecord, onProgress?: Progress): Promise<ReportImage[]> {
  const stem = filename(record), report = await prepare(record, onProgress)
  const images: ReportImage[] = [], pagesPerImage = 4
  const totalImages = Math.ceil(report.pages.length / pagesPerImage)
  try {
    for (let start = 0; start < report.pages.length; start += pagesPerImage) {
      const end = Math.min(start + pagesPerImage, report.pages.length)
      const number = images.length + 1
      const pages = end === start + 1 ? `第 ${end} 页` : `第 ${start + 1}—${end} 页`
      onProgress?.(`正在生成第 ${number} / ${totalImages} 张长图（${pages}）…`)
      const combined = document.createElement('canvas')
      // 1440 × at most 8144: keep each canvas below 12 million pixels instead
      // of creating an unbounded image that can exceed mobile canvas limits.
      combined.width = WIDTH; combined.height = HEIGHT * (end - start)
      try {
        const context = combined.getContext('2d')
        if (!context) throw new Error('长图画布创建失败，请关闭其他占用内存的页面后重试。')
        for (let index = start; index < end; index++) {
          const page = renderPage(report, index)
          try { context.drawImage(page, 0, (index - start) * HEIGHT) }
          finally { page.width = page.height = 1 }
          onProgress?.(`正在拼接第 ${index + 1} / ${report.pages.length} 页…`)
          await nextPaint()
        }
        const blob = await png(combined)
        images.push({
          url: URL.createObjectURL(blob),
          filename: `${stem}_${String(number).padStart(2, '0')}_${start + 1}-${end}页.png`,
          pages,
        })
      } finally { combined.width = combined.height = 1 }
      await nextPaint()
    }
    onProgress?.(`已生成 ${images.length} 张长图，包含全部 ${report.pages.length} 页。`)
    return images
  } catch (error) {
    // No URLs are handed to the UI after a partial failure, so clean them here.
    for (const image of images) URL.revokeObjectURL(image.url)
    throw error
  }
}

/** Initiates one local PNG download per page, without opening a window or upload. */
export async function exportReport(record: PlayerRecord, onProgress?: Progress): Promise<number> {
  const stem = filename(record), report = await prepare(record, onProgress)
  for (let index = 0; index < report.pages.length; index++) {
    onProgress?.(`正在导出第 ${index + 1} / ${report.pages.length} 页…`)
    const canvas = renderPage(report, index), blob = await png(canvas)
    const url = URL.createObjectURL(blob), anchor = document.createElement('a')
    try {
      anchor.href = url; anchor.download = `${stem}_${String(index + 1).padStart(2, '0')}.png`
      anchor.style.display = 'none'; document.body.appendChild(anchor); anchor.click()
    } finally {
      anchor.remove()
      // Allow the browser to consume the URL before releasing it, even when
      // download dispatch is asynchronous. Each page's canvas is released now.
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      canvas.width = canvas.height = 1
    }
    await nextPaint()
  }
  onProgress?.(`已发起 ${report.pages.length} 页 PNG 下载；多页文件请按页码保存。`)
  return report.pages.length
}
