export interface ClimateTypeInfo {
  id: string
  name: string
  color: string
  distribution: string
  temperature: string
  precipitation: string
  circulation: string
  image?: string
  imageAlt?: string
  imageNote?: string
}

export interface ClimateStationData {
  id: string
  name: string
  climateId: string
  lat: number
  lon: number
  temperature: readonly (number | null)[]
  precipitation: readonly (number | null)[]
  dataNote?: string
  annualTemperatureC?: number
  annualPrecipitationMm?: number | null
  annualPrecipitationUpperBoundMm?: number
}

export const climateChartFrame = {
  width: 360, height: 240,
  left: 40, top: 28, plotWidth: 280, plotHeight: 172,
} as const

function validValue(value: unknown, nonnegative = false): number | null {
  return typeof value === 'number' && Number.isFinite(value) && (!nonnegative || value >= 0) ? value : null
}

function niceStep(span: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(span, .001)))
  const fraction = span / magnitude
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude
}

function makeAxis(minimum: number, maximum: number) {
  const step = niceStep((maximum - minimum) / 5)
  const min = Math.floor(minimum / step) * step
  const max = Math.ceil(maximum / step) * step
  const ticks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => min + index * step)
  return { min, max, step, ticks }
}

/** Monthly observations stay in their calendar slots; absent values are never interpolated. */
export function createClimateChartModel(station?: Pick<ClimateStationData, 'temperature' | 'precipitation'>) {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    temperature: validValue(station?.temperature[index]),
    precipitation: validValue(station?.precipitation[index], true),
  }))
  const temperatures = months.flatMap(month => month.temperature === null ? [] : [month.temperature])
  const precipitation = months.flatMap(month => month.precipitation === null ? [] : [month.precipitation])
  const temperatureAxis = makeAxis(Math.min(0, ...temperatures), Math.max(30, ...temperatures))
  const precipitationAxis = makeAxis(0, Math.max(100, ...precipitation))
  const frame = climateChartFrame
  const bottom = frame.top + frame.plotHeight
  const x = (month: number) => frame.left + (month - .5) * frame.plotWidth / 12
  const temperatureY = (value: number) => bottom - (value - temperatureAxis.min) / (temperatureAxis.max - temperatureAxis.min) * frame.plotHeight
  const precipitationY = (value: number) => bottom - value / precipitationAxis.max * frame.plotHeight
  const points = months.flatMap(month => month.temperature === null ? [] : [{
    month: month.month, value: month.temperature, x: x(month.month), y: temperatureY(month.temperature),
  }])
  const temperaturePaths: string[] = []
  let path = ''
  for (const month of months) {
    if (month.temperature === null) {
      if (path) temperaturePaths.push(path)
      path = ''
      continue
    }
    path += `${path ? ' L' : 'M'}${x(month.month).toFixed(2)} ${temperatureY(month.temperature).toFixed(2)}`
  }
  if (path) temperaturePaths.push(path)
  const bars = months.flatMap(month => month.precipitation === null ? [] : [{
    month: month.month, value: month.precipitation,
    x: x(month.month) - 6.5, y: precipitationY(month.precipitation), width: 13,
    height: bottom - precipitationY(month.precipitation),
  }])
  return {
    frame, bottom,
    months: months.map(month => ({ ...month, x: x(month.month) })),
    temperatureAxis: { ...temperatureAxis, ticks: temperatureAxis.ticks.map(value => ({ value, y: temperatureY(value) })) },
    precipitationAxis: { ...precipitationAxis, ticks: precipitationAxis.ticks.map(value => ({ value, y: precipitationY(value) })) },
    points, bars, temperaturePaths,
    hasData: temperatures.length > 0 || precipitation.length > 0,
    missingMonths: months.filter(month => month.temperature === null || month.precipitation === null).length,
    meanTemperature: temperatures.length === 12 ? temperatures.reduce((sum, value) => sum + value, 0) / 12 : null,
    annualPrecipitation: precipitation.length === 12 ? precipitation.reduce((sum, value) => sum + value, 0) : null,
  }
}
