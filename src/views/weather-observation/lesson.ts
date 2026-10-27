import type { InstrumentId, WeatherState } from './types'

export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'

export const INSTRUMENTS: { id: InstrumentId; number: string; name: string; quantity: string; instruction: string }[] = [
  { id: 'screen', number: '01', name: '百叶箱', quantity: '气温 · °C', instruction: '打开箱门，辨认温度表，读取最高与最低气温。' },
  { id: 'rain', number: '02', name: '雨量器', quantity: '降水量 · mm', instruction: '查看承雨口和储水瓶，用配套量杯读取降水量。' },
  { id: 'wind', number: '03', name: '风向风速仪', quantity: '风向 / 风速 · m/s', instruction: '辨认风向标和风杯，观察风向与转速的变化。' },
]

export const WIND_DIRECTIONS = [
  { degrees: 0, label: '北风', short: '北', abbreviation: 'N' },
  { degrees: 45, label: '东北风', short: '东北', abbreviation: 'NE' },
  { degrees: 90, label: '东风', short: '东', abbreviation: 'E' },
  { degrees: 135, label: '东南风', short: '东南', abbreviation: 'SE' },
  { degrees: 180, label: '南风', short: '南', abbreviation: 'S' },
  { degrees: 225, label: '西南风', short: '西南', abbreviation: 'SW' },
  { degrees: 270, label: '西风', short: '西', abbreviation: 'W' },
  { degrees: 315, label: '西北风', short: '西北', abbreviation: 'NW' },
]

export function directionLabel(direction: number, speed: number): string {
  if (speed <= 0.2) return '静风'
  const index = Math.round(((direction % 360 + 360) % 360) / 45) % 8
  return WIND_DIRECTIONS[index]?.label ?? '北风'
}

export function airflowLabel(direction: number, speed: number): string {
  if (speed <= 0.2) return '静风，无定向气流'
  const index = Math.round(((direction % 360 + 360) % 360) / 45) % 8
  return `${WIND_DIRECTIONS[index]?.short ?? '北'} → ${WIND_DIRECTIONS[(index + 4) % 8]?.short ?? '南'}`
}

export const WEATHER_PRESETS: Omit<WeatherState, 'screenOpen' | 'rainCutaway' | 'raining'>[] = [
  { temperature: 23.6, maximum: 26.8, minimum: 17.4, rainfall: 12.4, windDirection: 135, windSpeed: 4.2 },
  { temperature: 18.2, maximum: 21.6, minimum: 12.8, rainfall: 3.6, windDirection: 0, windSpeed: 2.8 },
  { temperature: 28.4, maximum: 31.2, minimum: 23.6, rainfall: 0, windDirection: 225, windSpeed: 0 },
]

export const INITIAL_WEATHER: WeatherState = {
  ...WEATHER_PRESETS[0]!, screenOpen: false, rainCutaway: false, raining: false, windVisible: true,
}

export const LESSON_SOURCES = [
  { title: '上海六年级地理上册 · 第 85 页', url: 'https://dtxs.sinomaps.com/digitaldetail.html?id=15' },
  { title: '中国天气网 · 百叶箱的“秘密”', url: 'https://gd.weather.com.cn/qxrzt/2013/03/1820510.shtml' },
  { title: '深圳市气象局 · 雨量器', url: 'https://weather.sz.gov.cn/mobile/qixiangfuwu/qixiangjiance/jidishebe/content/post_10106204.html' },
  { title: '中央气象署 · 风向与风速的观测', url: 'https://edu.cwa.gov.tw/PopularScience/wt/wt_7.html' },
]
