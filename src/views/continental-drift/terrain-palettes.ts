import { resourceUrl } from './resource-loader'
/** Real source elevation, never estimated from the brightness of an already shaded image. */
export type TerrainPaletteId = 'sand' | 'paper' | 'slate' | 'topo'
export type ElevationStop = readonly [metres: number, color: string]
export const TERRAIN_DATA_ENCODING = {
  offsetMetres: 12000,
  stepMetres: 1,
  shadeByteScale: 200,
  colorSpace: 'NoColorSpace',
  size: [3600, 1800] as const,
} as const

export const SAND_ELEVATION_STOPS: readonly ElevationStop[] = [
  [0, '#ebdcb5'], [250, '#decda1'], [800, '#d1b382'], [1800, '#b88b5b'],
  [3000, '#9e704c'], [4500, '#8d6950'], [6500, '#c2b197'], [10500, '#ebe3d2'],
]
// A softened teaching adaptation of OpenTopoMap's published elevation stops.
// These colours encode elevation, not vegetation, soil, climate or snow cover.
// https://github.com/der-stefan/OpenTopoMap/blob/master/mapnik/relief_color_text_file.txt
export const TOPO_ELEVATION_STOPS: readonly ElevationStop[] = [
  [0, '#82af70'], [100, '#a9c383'], [300, '#e7da9e'], [1500, '#bd8954'],
  [3000, '#9d6757'], [4000, '#a3a19b'], [5000, '#f2f0e9'], [10500, '#f2f0e9'],
]
export const TERRAIN_PALETTES = [
  { id: 'sand', index: 0, name: '暖沙地形', sea: '#4da6c8', low: '#decda1', high: '#b88b5b' },
  { id: 'paper', index: 1, name: '素雅地形', sea: '#97bbc5', low: '#ded8c4', high: '#ad9b7f' },
  { id: 'slate', index: 2, name: '岩灰地形', sea: '#719aa8', low: '#b3b8b4', high: '#75868a' },
  { id: 'topo', index: 3, name: '绿野地形', sea: '#97d2e3', low: '#a9c383', high: '#bd8954',
    subtitle: 'OpenTopoMap 风格 · 按模型高程设色' },
] as const
export const DEFAULT_TERRAIN_PALETTE = 'topo' satisfies TerrainPaletteId
export const DEFAULT_TERRAIN_STYLE = TERRAIN_PALETTES.find(palette => palette.id === DEFAULT_TERRAIN_PALETTE)!
export const TERRAIN_STYLE_SOURCES = [
  { label: 'OpenTopoMap 官方高程色表', url: 'https://github.com/der-stefan/OpenTopoMap/blob/master/mapnik/relief_color_text_file.txt' },
  { label: 'OpenTopoMap 官方低比例尺海色', url: 'https://github.com/der-stefan/OpenTopoMap/blob/master/mapnik/styles-otm/basemap-sea.xml' },
  { label: 'OpenTopoMap DEM 与独立阴影处理', url: 'https://github.com/der-stefan/OpenTopoMap/blob/master/mapnik/HOWTO_DEM.md' },
  { label: 'Scotese / Wright PaleoDEM，CC BY 4.0', url: 'https://zenodo.org/records/5460860' },
] as const

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map(at => Number.parseInt(hex.slice(at, at + 2), 16) / 255) as [number, number, number]
}
function vec(hex: string): string { return `vec3(${rgb(hex).map(value => value.toFixed(9)).join(',')})` }
function ramp(name: string, stops: readonly ElevationStop[]): string {
  let body = `vec3 ${name}(float h) {\n`
  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1]!, current = stops[index]!
    body += `if(h<=${current[0].toFixed(1)}) return mix(${vec(previous[1])},${vec(current[1])},clamp((h-${previous[0].toFixed(1)})/${(current[0] - previous[0]).toFixed(1)},0.0,1.0));\n`
  }
  return body + `return ${vec(stops[stops.length - 1]![1])};\n}\n`
}

/** Prepend to the MeshBasic fragment shader once; engine supplies terrainPalette uniform 0..3. */
export const TERRAIN_PALETTE_GLSL = `
uniform float terrainPalette;
${ramp('terrainSand', SAND_ELEVATION_STOPS)}
${ramp('terrainTopo', TOPO_ELEVATION_STOPS)}
vec3 terrainSrgbToLinear(vec3 value) {
  value=clamp(value,0.0,1.0);
  return mix(value/12.92,pow((value+0.055)/1.055,vec3(2.4)),step(vec3(0.04045),value));
}
vec3 terrainDecodeAndColor(vec3 data) {
  float metres = dot(data.rg,vec2(65280.0,255.0))-12000.0;
  float shade = data.b*255.0/200.0;
  float h = max(metres,0.0);
  vec3 palette = terrainPalette>2.5 ? terrainTopo(h) : terrainSand(h);
  vec3 colour=terrainSrgbToLinear(palette*shade);
  float luminance=dot(colour,vec3(0.2126,0.7152,0.0722));
  if(terrainPalette>2.5) return colour;
  if(terrainPalette>1.5) return mix(colour,luminance*vec3(0.72,0.83,0.89),0.82);
  if(terrainPalette>0.5) return mix(mix(colour,vec3(luminance),0.64),vec3(0.94,0.91,0.82),0.24);
  return colour;
}
`

/** Replace #include <map_fragment> completely; do not multiply packed data RGB into the colour. */
export const TERRAIN_MAP_FRAGMENT_GLSL = `
#ifdef USE_MAP
  vec3 terrainData=texture2D(map,vMapUv).rgb;
  diffuseColor.rgb *= terrainDecodeAndColor(terrainData);
#endif
`

/** CPU reference for legend/tests: byte channels, not sRGB-decoded channel values. */
export function decodeTerrainData(red: number, green: number, blue: number): { metres: number; shade: number } {
  return { metres: red * 256 + green - TERRAIN_DATA_ENCODING.offsetMetres, shade: blue / TERRAIN_DATA_ENCODING.shadeByteScale }
}
export function terrainDataUrl(ageMa: number, present = false): string {
  return resourceUrl(`paleo/${present ? '000-present' : String(ageMa).padStart(3, '0')}-terrain-data.png`)
}

