/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'leaflet' {
  const L: any
  export default L
  export type Map = any
  export type Marker = any
  export type TileLayer = any
  export type Layer = any
  export type DivIcon = any
  export type LatLngExpression = any
  export type LatLngBoundsExpression = any
  export type ZoomOptions = any
  export type PopupOptions = any
}
