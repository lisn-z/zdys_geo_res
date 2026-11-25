/**
 * 大气环流课件 · 用户交互埋点 v1
 *
 * 当前只输出到 console，不联网、不写 localStorage、不采集身份信息。
 * 页面在用户事件处理器里调用 track；不要在 watch / 动画帧 / 教学预设中调用。
 *
 * 接后端时，在应用入口调用 setInteractionTelemetrySink(event => yourClient.post('/events', event))。
 * Sink 可以是同步函数或 Promise；失败不会阻断课堂操作，不在这里自动重试。
 * event_id 在本次页面实例内唯一；stage_number / step_number 为从 1 开始的编号。
 * triggered_at 为 UTC ISO 时间，triggered_at_ms 为对应 Unix 毫秒，可用于排序。
 */

export const INTERACTION_LOG_PREFIX = '[AtmosphericInteraction]'

export type InteractionEventName =
  | 'layer_control_change'
  | 'climate_topic_select'
  | 'climate_opacity_change'
  | 'layer_panel_toggle'
  | 'panels_visibility_change'

export type InteractionValue = string | number | boolean | null

export interface InteractionEventParams {
  source: 'layer_panel' | 'top_toolbar'
  control_id: string
  control_label: string
  control_type: 'switch' | 'button' | 'range'
  previous_value: InteractionValue
  value: InteractionValue
  changed: boolean
}

export interface InteractionContext {
  stage_number: number
  stage_id: string
  step_number: number
  step_id: string
  month: 1 | 7 | null
  season_point: string | null
  comparison_active: boolean
  climate_topic: string | null
  playing: boolean
  playback_speed: number
  enabled_layers: readonly string[]
}

export interface InteractionTelemetryEvent {
  schema_version: 1
  page: 'general-atmospheric-circulation'
  event_id: string
  event_name: InteractionEventName
  event_params: Readonly<InteractionEventParams>
  triggered_at: string
  triggered_at_ms: number
  context: Readonly<InteractionContext>
}

export type InteractionTelemetrySink = (event: InteractionTelemetryEvent) => void | Promise<unknown>

export const consoleInteractionTelemetrySink: InteractionTelemetrySink = event => {
  console.info(INTERACTION_LOG_PREFIX, event)
}

let defaultSink: InteractionTelemetrySink = consoleInteractionTelemetrySink
/** Set one adapter for all page instances, including instances already mounted. */
export function setInteractionTelemetrySink(sink: InteractionTelemetrySink) { defaultSink = sink }

export function createInteractionTelemetry(
  getContext: () => InteractionContext,
  options: { sink?: InteractionTelemetrySink; now?: () => number; instanceId?: string } = {},
) {
  let sink = options.sink
  const now = options.now ?? Date.now
  const instanceId = options.instanceId ?? `atmosphere-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  let sequence = 0
  const reportFailure = (error: unknown) => console.warn(`${INTERACTION_LOG_PREFIX} 上报失败，课件操作继续。`, error)

  return {
    setSink(nextSink: InteractionTelemetrySink) { sink = nextSink },
    track(eventName: InteractionEventName, eventParams: InteractionEventParams): InteractionTelemetryEvent | undefined {
      // Isolate diagnostics from lesson behavior, including a future failing backend adapter.
      try {
        const timestamp = now()
        const context = getContext()
        const event: InteractionTelemetryEvent = Object.freeze({
          schema_version: 1,
          page: 'general-atmospheric-circulation',
          event_id: `${instanceId}-${++sequence}`,
          event_name: eventName,
          event_params: Object.freeze({ ...eventParams }),
          triggered_at: new Date(timestamp).toISOString(),
          triggered_at_ms: timestamp,
          context: Object.freeze({ ...context, enabled_layers: Object.freeze([...context.enabled_layers]) }),
        })
        const pending = (sink ?? defaultSink)(event)
        if (pending && typeof pending.then === 'function') void Promise.resolve(pending).catch(reportFailure)
        return event
      } catch (error) {
        reportFailure(error)
        return undefined
      }
    },
  }
}
