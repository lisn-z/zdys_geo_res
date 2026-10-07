import L from 'leaflet'
import { formatDegreesMinutes } from './map-lesson'

/** Leaflet owns all distance, rounding, unit and bar-width calculations. */
export function createMapScale(map: L.Map): { dispose(): void } {
  const control = L.control.scale({ position: 'bottomleft', metric: true, imperial: false, maxWidth: 160 }).addTo(map)
  const container = control.getContainer()!
  container.classList.add('lesson-scale-control')
  container.setAttribute('role', 'img')
  container.title = '局部比例尺，仅适用于地图中心附近，与测距点无关；不同纬度的投影比例不同，不能直接量整条跨区域连线。'
  const heading = L.DomUtil.create('div', 'lesson-scale-scope')
  heading.textContent = '局部比例尺'
  const limit = L.DomUtil.create('div', 'lesson-scale-limit')
  limit.textContent = '仅适用于地图中心附近'
  const caption = L.DomUtil.create('div', 'lesson-scale-caption')
  container.prepend(heading, limit, caption)

  // This caption only identifies the native control's geographic reference.
  // It does not alter the scale's label, units, geometry or update lifecycle.
  const updateCaption = () => {
    const latitude = map.getCenter().lat
    caption.textContent = Math.abs(latitude) < 0.05 ? '视图中心：赤道附近'
      : `视图中心：${formatDegreesMinutes(latitude, 0)}${latitude < 0 ? 'S' : 'N'} 附近`
    container.setAttribute('aria-label', `局部比例尺，仅适用于地图中心附近；${caption.textContent}；${container.querySelector('.leaflet-control-scale-line')?.textContent ?? ''}`)
  }
  map.on('move', updateCaption)
  updateCaption()
  return { dispose() { map.off('move', updateCaption); control.remove() } }
}
