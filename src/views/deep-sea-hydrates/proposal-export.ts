export type InquiryId = 'resource' | 'pressure' | 'transport' | 'environment'
export type InquiryEntry = { evidence: string; suggestion: string }
export interface ProposalDraft {
  team: string
  entries: Record<InquiryId, InquiryEntry>
  peerReview: string
  comparison: string
  energySaving: string
}
export interface EvidenceRecord { id: string; text: string }
export const INQUIRIES: { id: InquiryId; question: string; evidenceHint: string; suggestionHint: string }[] = [
  { id: 'resource', question: '看起来像冰，为什么还能燃烧？', evidenceHint: '观察样品和燃烧现象，结合资料区分水和可燃气体的作用。', suggestionHint: '认识可燃冰的性质和分布后，开发前还需要调查哪些信息？' },
  { id: 'pressure', question: '为什么潜水时必须穿坚固耐压的潜水服？', evidenceHint: '记录不同水深的压力，或你查到的耐压设备资料。', suggestionHint: '深海设备应怎样应对高压？请写出依据和建议。' },
  { id: 'transport', question: '怎样将可燃冰从海底运送到海面上？', evidenceHint: '记录从海底到海面的连接和输送过程。', suggestionHint: '需要哪些设备或技术？怎样减少输送中的风险？' },
  { id: 'environment', question: '大量开采海底可燃冰会对海洋环境产生哪些影响？', evidenceHint: '从资料或模型中寻找需要关注的环境问题。', suggestionHint: '开采前、开采中分别应采取哪些保护措施？' },
]
export function emptyProposal(): ProposalDraft {
  return { team: '', entries: { resource: { evidence: '', suggestion: '' }, pressure: { evidence: '', suggestion: '' }, transport: { evidence: '', suggestion: '' }, environment: { evidence: '', suggestion: '' } }, peerReview: '', comparison: '', energySaving: '' }
}

type Paragraph = { kind: 'section' | 'label' | 'body' | 'note'; text: string }
type MeasuredParagraph = Paragraph & { lines: string[]; height: number; font: string; lineHeight: number; before: number; after: number }
const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'

/** Wraps measured glyphs, preserving user-entered paragraph breaks and all text. */
export function wrapCanvasText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const output: string[] = []
  for (const paragraph of value.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) { output.push(''); continue }
    let line = ''
    for (const glyph of Array.from(paragraph)) {
      if (line && ctx.measureText(line + glyph).width > maxWidth) { output.push(line); line = glyph }
      else line += glyph
    }
    output.push(line)
  }
  return output
}

/** This image is drawn locally; no logo, network image or user data is uploaded. */
export async function drawProposalImage(draft: ProposalDraft, records: EvidenceRecord[], date = new Date()): Promise<{ blob: Blob; filename: string; width: number; height: number }> {
  await document.fonts?.ready
  const dateText = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const paragraphs: Paragraph[] = [
    { kind: 'note', text: `小组 / 姓名：${draft.team.trim() || '未填写'}    日期：${dateText}` },
    { kind: 'note', text: '教材：上海六年级上册第 78—79 页 · 跨学科主题学习' },
    { kind: 'body', text: '主题：开采海底可燃冰需要解决哪些难题' },
    { kind: 'section', text: '一、我们的观察与资料' },
    ...(records.length ? records.map((record, index): Paragraph => ({ kind: 'body', text: `${index + 1}. ${record.text}` })) : [{ kind: 'note' as const, text: '尚未添加观察记录。可从读图、样品观察和压力探究中记录发现。' }]),
  ]
  for (const [index, item] of INQUIRIES.entries()) {
    const entry = draft.entries[item.id]
    paragraphs.push(
      { kind: 'section', text: `${['二', '三', '四', '五'][index]}、${item.question}` },
      { kind: 'label', text: '观察依据' }, { kind: 'body', text: entry.evidence.trim() || '未填写' },
      { kind: 'label', text: '我们的建议' }, { kind: 'body', text: entry.suggestion.trim() || '未填写' },
    )
  }
  paragraphs.push(
    { kind: 'section', text: '六、交流与反思' },
    { kind: 'label', text: '同伴或班级研讨提出的意见' }, { kind: 'body', text: draft.peerReview.trim() || '未填写' },
    { kind: 'label', text: '与陆地矿产开采相比，深海开采有哪些不同的困难？' }, { kind: 'body', text: draft.comparison.trim() || '未填写' },
    { kind: 'label', text: '生活中，我们可以怎样节约能源？' }, { kind: 'body', text: draft.energySaving.trim() || '未填写' },
    { kind: 'note', text: '课堂探究成果 · 请结合资料核对和小组讨论继续完善。模型中的比例、地层和开采流程为教学示意。' },
  )
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('当前浏览器无法生成图片。')
  const width = 1440, margin = 90, contentWidth = width - margin * 2
  const settings = {
    section: { font: `600 30px ${FONT}`, lineHeight: 45, before: 26, after: 14 },
    label: { font: `600 24px ${FONT}`, lineHeight: 38, before: 10, after: 5 },
    body: { font: `400 25px ${FONT}`, lineHeight: 42, before: 0, after: 12 },
    note: { font: `400 22px ${FONT}`, lineHeight: 36, before: 5, after: 12 },
  }
  const measured: MeasuredParagraph[] = paragraphs.map(paragraph => {
    const style = settings[paragraph.kind]; ctx.font = style.font
    const lines = wrapCanvasText(ctx, paragraph.text, contentWidth - (paragraph.kind === 'section' ? 28 : 0))
    return { ...paragraph, ...style, lines, height: style.before + lines.length * style.lineHeight + style.after }
  })
  const height = Math.ceil(230 + measured.reduce((total, item) => total + item.height, 0) + 80)
  // Browser texture/canvas limits vary. Never silently crop an oversized record.
  if (height > 24000) throw new Error('记录内容过长，图片会超出浏览器尺寸限制。请精简重复的观察记录后再生成。')
  canvas.width = width; canvas.height = height
  ctx.fillStyle = '#f7f6ee'; ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#23515a'; ctx.fillRect(0, 0, width, 16)
  ctx.fillStyle = '#23515a'; ctx.font = `600 45px ${FONT}`; ctx.textBaseline = 'top'
  ctx.fillText('南海可燃冰开采建议书', margin, 75)
  ctx.font = `400 23px ${FONT}`; ctx.fillStyle = '#678379'
  ctx.fillText('依据观察提出建议，让资源开发与海洋保护同行', margin, 140)
  let y = 230
  for (const paragraph of measured) {
    y += paragraph.before
    ctx.font = paragraph.font
    if (paragraph.kind === 'section') {
      const bandTop = y - 6
      const bandHeight = paragraph.lines.length * paragraph.lineHeight + 12
      ctx.fillStyle = '#dfe9df'; ctx.fillRect(margin - 18, bandTop, contentWidth + 36, bandHeight)
      ctx.fillStyle = '#4b8a79'; ctx.fillRect(margin - 18, bandTop, 5, bandHeight)
      ctx.fillStyle = '#284d50'
      // Centre the visible glyphs, not the font's em box: Chinese font baselines
      // differ on Windows and tablets, and titles can wrap onto multiple lines.
      ctx.save(); ctx.textBaseline = 'alphabetic'
      paragraph.lines.forEach((line, index) => {
        const metrics = ctx.measureText(line)
        const ascent = metrics.actualBoundingBoxAscent
        const descent = metrics.actualBoundingBoxDescent
        const centre = bandTop + 6 + (index + .5) * paragraph.lineHeight
        ctx.fillText(line, margin, centre + (ascent - descent) / 2)
      })
      ctx.restore()
      y += paragraph.lines.length * paragraph.lineHeight + paragraph.after
      continue
    }
    ctx.fillStyle = paragraph.kind === 'note' ? '#62766e' : paragraph.kind === 'label' ? '#497567' : '#284d50'
    for (const line of paragraph.lines) { ctx.fillText(line, margin, y); y += paragraph.lineHeight }
    y += paragraph.after
  }
  ctx.strokeStyle = '#d1ded3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(margin, height - 51); ctx.lineTo(width - margin, height - 51); ctx.stroke()
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('图片生成失败，请重试。')), 'image/png'))
  return { blob, filename: `南海可燃冰开采建议书-${dateText}.png`, width, height }
}
