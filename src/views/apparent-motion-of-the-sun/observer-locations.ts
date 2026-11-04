export interface ObservationLocation {
  name: string
  lat: number
  /** 纬线和极点预设不指定经度，保留当前选择。 */
  lon: number | null
}

// 城市代表点近似到0.01°。中国城市及悉尼沿用本项目地理数据；
// 雅加达、圣保罗、霍巴特分别对应 GeoNames 1642911、3448439、2163355。
export const observationLocations: ObservationLocation[] = [
  { lat: 90, lon: null, name: '北极' },
  { lat: 66.56, lon: null, name: '北极圈' },
  { lat: 45.76, lon: 126.64, name: '哈尔滨' },
  { lat: 39.90, lon: 116.41, name: '北京' },
  { lat: 31.23, lon: 121.47, name: '上海' },
  { lat: 23.13, lon: 113.26, name: '广州' },
  { lat: 0, lon: null, name: '赤道' },
  { lat: -6.21, lon: 106.85, name: '雅加达' },
  { lat: -23.55, lon: -46.64, name: '圣保罗' },
  { lat: -33.87, lon: 151.21, name: '悉尼' },
  { lat: -42.88, lon: 147.33, name: '霍巴特' },
  { lat: -66.56, lon: null, name: '南极圈' },
  { lat: -90, lon: null, name: '南极' },
]

export function locationNameAt(latitude: number, longitude: number): string {
  return observationLocations.find(location => Math.abs(location.lat - latitude) < 1e-6
    && (location.lon === null || Math.abs(location.lon - longitude) < 1e-6))?.name ?? ''
}
