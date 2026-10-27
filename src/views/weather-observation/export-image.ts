/** Saved observation values; the export contains the student's checked record. */
export interface ObservationImageRecord {
  date: string
  location: string
  maximum: string
  minimum: string
  rainfall: string
  direction: string
  speed: string
}

const WIDTH = 1600
const MARGIN = 64
const TABLE_TOP = 184
const HEADER_HEIGHT = 84
const FOOTER_HEIGHT = 100
const MAX_PAGE_HEIGHT = 12000
const FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'
const LINE_HEIGHT = 37
const CELL_PADDING = 18

const COLUMNS = [
  { title: '序号', unit: '', width: 72, fontSize: 24 },
  { title: '日期', unit: '', width: 178, fontSize: 24 },
  { title: '地点', unit: '', width: 342, fontSize: 26 },
  { title: '最高气温', unit: '°C', width: 176, fontSize: 28 },
  { title: '最低气温', unit: '°C', width: 176, fontSize: 28 },
  { title: '降水量', unit: 'mm', width: 176, fontSize: 28 },
  { title: '风向', unit: '', width: 160, fontSize: 26 },
  { title: '风速', unit: 'm/s', width: 192, fontSize: 28 },
] as const

interface LaidOutRow {
  serial: number
  lines: string[][]
  height: number
}

function setFont(context: CanvasRenderingContext2D, size: number, weight = 400): void {
  context.font = `${weight} ${size}px ${FONT_FAMILY}`
}

/** Wrap by measured characters so Chinese, Latin text and long place names fit. */
function wrapText(context: CanvasRenderingContext2D, value: string, width: number): string[] {
  const paragraphs = value.replace(/\r\n?/g, '\n').replace(/\t/g, ' ').split('\n')
  const lines: string[] = []
  for (const paragraph of paragraphs) {
    let line = ''
    for (const character of paragraph) {
      const candidate = line + character
      if (line && context.measureText(candidate).width > width) {
        lines.push(line)
        line = character
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines.length ? lines : ['']
}

function layoutRows(context: CanvasRenderingContext2D, records: readonly ObservationImageRecord[]): LaidOutRow[] {
  return records.map((record, index) => {
    const values = [String(index + 1), record.date, record.location, record.maximum, record.minimum, record.rainfall, record.direction, record.speed]
    const lines = values.map((value, columnIndex) => {
      const column = COLUMNS[columnIndex]!
      setFont(context, column.fontSize)
      return wrapText(context, value, column.width - (columnIndex === 0 ? 8 : CELL_PADDING * 2))
    })
    const lineCount = Math.max(...lines.map(cell => cell.length))
    return { serial: index + 1, lines, height: Math.max(82, lineCount * LINE_HEIGHT + 30) }
  })
}

function paginate(rows: readonly LaidOutRow[]): LaidOutRow[][] {
  const capacity = MAX_PAGE_HEIGHT - TABLE_TOP - HEADER_HEIGHT - FOOTER_HEIGHT
  const pages: LaidOutRow[][] = []
  let page: LaidOutRow[] = []
  let height = 0
  for (const row of rows) {
    if (page.length && height + row.height > capacity) {
      pages.push(page)
      page = []
      height = 0
    }
    page.push(row)
    height += row.height
  }
  if (page.length) pages.push(page)
  return pages
}

function drawPage(context: CanvasRenderingContext2D, rows: readonly LaidOutRow[], pageIndex: number, pageCount: number, recordCount: number): void {
  const height = context.canvas.height
  context.fillStyle = '#fbfaf5'
  context.fillRect(0, 0, WIDTH, height)
  context.fillStyle = '#4e8b80'
  context.fillRect(MARGIN, 38, 44, 5)
  context.textBaseline = 'top'
  context.textAlign = 'left'
  setFont(context, 46, 600)
  context.fillStyle = '#28585d'
  context.fillText('气象观测记录', MARGIN, 61)
  setFont(context, 23)
  context.fillStyle = '#718c78'
  context.fillText('课堂模拟', MARGIN, 125)
  context.textAlign = 'right'
  context.fillText(`共 ${recordCount} 条记录${pageCount > 1 ? ` · 第 ${pageIndex + 1} / ${pageCount} 张` : ''}`, WIDTH - MARGIN, 127)

  context.fillStyle = '#e6eee0'
  context.fillRect(MARGIN, TABLE_TOP, WIDTH - MARGIN * 2, HEADER_HEIGHT)
  let columnX = MARGIN
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  for (const column of COLUMNS) {
    setFont(context, 24, 600)
    context.fillStyle = '#3b655a'
    context.fillText(column.title, columnX + column.width / 2, TABLE_TOP + (column.unit ? 30 : HEADER_HEIGHT / 2))
    if (column.unit) {
      setFont(context, 21)
      context.fillStyle = '#6e8b74'
      context.fillText(column.unit, columnX + column.width / 2, TABLE_TOP + 59)
    }
    columnX += column.width
  }

  let rowY = TABLE_TOP + HEADER_HEIGHT
  for (const row of rows) {
    context.fillStyle = row.serial % 2 === 0 ? '#f1f5ec' : '#fffef9'
    context.fillRect(MARGIN, rowY, WIDTH - MARGIN * 2, row.height)
    columnX = MARGIN
    row.lines.forEach((lines, index) => {
      const column = COLUMNS[index]!
      const leftAligned = index === 2
      context.textAlign = leftAligned ? 'left' : 'center'
      context.fillStyle = index === 0 ? '#82977f' : '#355d56'
      setFont(context, column.fontSize, index >= 3 ? 500 : 400)
      const textX = leftAligned ? columnX + CELL_PADDING : columnX + column.width / 2
      const firstLineY = rowY + row.height / 2 - (lines.length - 1) * LINE_HEIGHT / 2
      lines.forEach((line, lineIndex) => context.fillText(line, textX, firstLineY + lineIndex * LINE_HEIGHT))
      columnX += column.width
    })
    rowY += row.height
    context.beginPath()
    context.moveTo(MARGIN, rowY)
    context.lineTo(WIDTH - MARGIN, rowY)
    context.strokeStyle = '#dce5d6'
    context.lineWidth = 1
    context.stroke()
  }

  context.strokeStyle = '#d4dfce'
  context.lineWidth = 1.2
  context.beginPath()
  columnX = MARGIN
  context.moveTo(MARGIN, TABLE_TOP + HEADER_HEIGHT)
  context.lineTo(WIDTH - MARGIN, TABLE_TOP + HEADER_HEIGHT)
  for (const column of COLUMNS) {
    context.moveTo(columnX, TABLE_TOP)
    context.lineTo(columnX, rowY)
    columnX += column.width
  }
  context.stroke()
  context.strokeRect(MARGIN, TABLE_TOP, WIDTH - MARGIN * 2, rowY - TABLE_TOP)

  setFont(context, 21)
  context.fillStyle = '#80937b'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText('课堂模拟观测数据', MARGIN, rowY + 47)
  context.textAlign = 'right'
  context.fillText(`${rows[0]!.serial}—${rows[rows.length - 1]!.serial} / ${recordCount}`, WIDTH - MARGIN, rowY + 47)
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('图片生成失败，请稍后重试。'))
    }, 'image/png')
  })
}

/** Render every saved record. Exceptionally long lists continue in another PNG. */
export async function renderObservationRecordImages(records: readonly ObservationImageRecord[]): Promise<Blob[]> {
  if (!records.length) throw new Error('请先保存一条观测记录。')
  if (document.fonts) await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  const context = canvas.getContext('2d')
  if (!context) throw new Error('当前浏览器无法生成图片，请稍后重试。')
  try {
    const pages = paginate(layoutRows(context, records))
    const images: Blob[] = []
    for (let index = 0; index < pages.length; index++) {
      const rows = pages[index]!
      canvas.height = TABLE_TOP + HEADER_HEIGHT + rows.reduce((sum, row) => sum + row.height, 0) + FOOTER_HEIGHT
      drawPage(context, rows, index, pages.length, records.length)
      images.push(await toPng(canvas))
    }
    return images
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
