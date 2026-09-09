export const suppliedTiandituKey = 'fa091364c3a8bd226ce031fc71b9c85f'
// 陈奇的 01c1f9a0ca6e1427154b85cef0525024 熊明祥的 03e1637ffbffc98d74b6ead0631a29d4
export const developmentTiandituKey = '03e1637ffbffc98d74b6ead0631a29d4'

// img_w GetCapabilities reports native matrices 1–18. Higher display zooms reuse matrix 18.
export const tiandituMinNativeZoom = 1
export const tiandituMaxNativeZoom = 18

export function tiandituTemplate(key: string) {
  return `https://t{s}.tianditu.gov.cn/img_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=img&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${encodeURIComponent(key)}`
}
