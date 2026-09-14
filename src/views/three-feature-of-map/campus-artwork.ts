import type { Coordinate } from './map-lesson'
import { mapDirections } from './direction-guide'
import type { BuilderArtworkCapture } from './campus-builder-scene'

const font = '"Microsoft YaHei", "PingFang SC", sans-serif'

export function renderCampusArtwork(capture: BuilderArtworkCapture, title: string, origin: Coordinate): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = capture.viewportWidth < 720 ? 1000 : 1600
  const padding = 32, headingHeight = 116, footerHeight = 156
  const imageScale = Math.min((canvas.width - padding * 2) / capture.canvas.width, 1600 / capture.canvas.height)
  const imageWidth = capture.canvas.width * imageScale, imageHeight = capture.canvas.height * imageScale
  canvas.height = Math.ceil(headingHeight + imageHeight + footerHeight)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器无法生成作品图片。')
  ctx.fillStyle = '#f8f7ef'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#558171'; ctx.font = `16px ${font}`
  ctx.fillText('我的校园 / 三维作品', 46, 36)
  ctx.fillStyle = '#1d443a'; ctx.font = `bold 34px ${font}`
  ctx.fillText(title.trim() || '我心中的校园', 46, 83, canvas.width - 92)
  const imageLeft = (canvas.width - imageWidth) / 2
  ctx.drawImage(capture.canvas, imageLeft, headingHeight, imageWidth, imageHeight)
  const footerTop = headingHeight + imageHeight
  ctx.strokeStyle = '#c5d8c8'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(46, footerTop + 18); ctx.lineTo(canvas.width - 46, footerTop + 18); ctx.stroke()
  ctx.fillStyle = '#36594b'; ctx.font = `17px ${font}`
  ctx.fillText(capture.view.view === 'plan' ? '俯视图 · 线段比例尺' : '视图中心 · 地面参考尺', 46, footerTop + 48)
  if (capture.view.scaleValid) {
    const length = capture.view.scalePixels * imageWidth / capture.viewportWidth
    const y = footerTop + 89
    ctx.strokeStyle = '#294f40'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.moveTo(46, y - 10); ctx.lineTo(46, y); ctx.lineTo(46 + length, y); ctx.lineTo(46 + length, y - 10); ctx.stroke()
    ctx.font = `15px ${font}`; ctx.textAlign = 'center'; ctx.fillText('0', 46, y - 15)
    // Keep the endpoint label outside the bar so short rulers cannot crowd the zero mark.
    ctx.textAlign = 'left'; ctx.fillText(`${capture.view.scaleMetres} 米`, 46 + length + 8, y - 15)
  } else {
    ctx.font = `15px ${font}`; ctx.fillText('此视角无法显示地面参考尺', 46, footerTop + 82)
  }
  ctx.fillStyle = '#6a8174'; ctx.font = `14px ${font}`
  ctx.fillText(capture.view.view === 'plan' ? '图中距离按米制校园绘制。' : '透视画面近大远小，参考尺仅适用于视图中心地面。', 46, footerTop + 118)
  ctx.fillText(`方位参考 ${Math.abs(origin.lat).toFixed(4)}°${origin.lat < 0 ? 'S' : 'N'}  ${Math.abs(origin.lng).toFixed(4)}°${origin.lng < 0 ? 'W' : 'E'}`, 46, footerTop + 142)
  const compassX = canvas.width - 105, compassY = footerTop + 85
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `14px ${font}`
  for (const direction of mapDirections) {
    const angle = (direction.bearing + capture.view.compassAngle) * Math.PI / 180
    ctx.strokeStyle = '#88a494'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(compassX, compassY); ctx.lineTo(compassX + Math.sin(angle) * 30, compassY - Math.cos(angle) * 30); ctx.stroke()
    ctx.fillStyle = direction.bearing === 0 ? '#b9523b' : '#476651'
    ctx.fillText(direction.label, compassX + Math.sin(angle) * 53, compassY - Math.cos(angle) * 53)
    if (direction.bearing === 0) {
      ctx.save(); ctx.translate(compassX, compassY); ctx.rotate(angle)
      ctx.beginPath(); ctx.moveTo(0, -37); ctx.lineTo(-6, -19); ctx.lineTo(6, -19); ctx.closePath(); ctx.fill(); ctx.restore()
    }
  }
  return canvas
}
