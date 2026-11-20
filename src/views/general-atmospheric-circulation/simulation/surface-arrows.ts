import * as THREE from 'three'

export const WIND_ARROW_PHASES = [0, 0.5] as const

// Wind belts and monsoons share a fine pale tail and a solid colored arrowhead.
// Geometry follows each route; the gradient does not introduce sideways motion.
export const surfaceWindArrowFragment = `
uniform vec3 color; uniform float opacity; uniform float highlight;
varying vec2 vUv;
#ifdef CROSS_EQUATOR_MONSOON
varying vec3 vCrossEquatorialColor;
#endif
void main(){
 float along=smoothstep(0.,.76,vUv.x);
 vec3 routeColor=color;
 #ifdef CROSS_EQUATOR_MONSOON
 routeColor=vCrossEquatorialColor;
 #endif
 vec3 tint=mix(mix(routeColor,vec3(1.),.18),routeColor,along);
 tint=mix(tint,vec3(1.),highlight*.62)*(1.+highlight*.5);
 float tail=mix(.42,1.,smoothstep(0.,.24,vUv.x));
 gl_FragColor=vec4(tint,opacity*.9*tail);
 #include <colorspace_fragment>
}
`

// These routes already use geographic coordinates and must not receive the
// ideal wind belts' seasonal latitude warp. Colors are sampled per vertex, so a
// long arrow straddling the equator keeps its source-hemisphere tail in the trade color.
export const crossEquatorialArrowVertex = `
attribute vec3 crossEquatorialColor;
varying vec3 vCrossEquatorialColor; varying vec2 vUv;
void main(){
 vUv=uv; vCrossEquatorialColor=crossEquatorialColor;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
}
`

export function crossEquatorialMonsoonMix(latitude: number, destinationHemisphere: 'north' | 'south' = 'north') {
  return THREE.MathUtils.smoothstep(latitude * (destinationHemisphere === 'north' ? 1 : -1), 0, 5)
}

export function setCrossEquatorialArrowColors(
  geometry: THREE.BufferGeometry, material: THREE.ShaderMaterial, tradeColor: string, monsoonColor: string,
  destinationHemisphere: 'north' | 'south' = 'north',
) {
  geometry.userData.crossEquatorialColors = { trade: new THREE.Color(tradeColor), monsoon: new THREE.Color(monsoonColor), destinationHemisphere }
  geometry.setAttribute('crossEquatorialColor', new THREE.BufferAttribute(
    new Float32Array(geometry.getAttribute('position').count * 3), 3,
  ).setUsage(THREE.DynamicDrawUsage))
  material.defines = { ...material.defines, CROSS_EQUATOR_MONSOON: 1 }
  material.vertexShader = crossEquatorialArrowVertex
}

export function createWindCurve(
  definition: { from: number; to: number; lonFrom: number; lonTo: number },
  longitude: number,
  radius: number,
) {
  const points = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24
    // Leave the pressure belt mainly meridionally, then turn increasingly zonal.
    const lat = (THREE.MathUtils.lerp(definition.from, definition.to, 1 - (1 - t) ** 1.6) * Math.PI) / 180
    const lon = ((longitude + THREE.MathUtils.lerp(definition.lonFrom, definition.lonTo, t ** 1.6)) * Math.PI) / 180
    return new THREE.Vector3(
      radius * Math.cos(lat) * Math.cos(lon),
      radius * Math.sin(lat),
      -radius * Math.cos(lat) * Math.sin(lon),
    )
  })
  return new THREE.CatmullRomCurve3(points)
}

// One placement rule for construction and animation prevents a first-frame jump.
export function surfaceArrowFrame(progress: number, span: number, direction = 1, inset = 0.06) {
  const phase = THREE.MathUtils.euclideanModulo(progress, 1)
  return {
    start: inset + phase * (1 - inset * 2 + span) - (direction > 0 ? span : 0),
    clipMin: inset,
    clipMax: 1 - inset,
  }
}

// Flat ribbons follow the sphere rather than extruding cones or cylindrical shafts.
const rows = Array.from({ length: 20 }, (_, i) => i * .7 / 19)
export function createSurfaceArrowGeometry() {
  const geometry = new THREE.BufferGeometry()
  const count = rows.length * 2 + 4
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage),
  )
  const uv: number[] = [],
    indices: number[] = []
  rows.forEach((t, i) => {
    uv.push(t, 0, t, 1)
    if (i < rows.length - 1) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  })
  uv.push(0.7, 0, 0.7, 1, 1, 0.5, 1, 0.5)
  indices.push(count - 4, count - 3, count - 2, count - 3, count - 1, count - 2)
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  return geometry
}

const center = new THREE.Vector3(),
  tangent = new THREE.Vector3(),
  normal = new THREE.Vector3(),
  side = new THREE.Vector3(),
  vertex = new THREE.Vector3(),
  geographicColor = new THREE.Color()
export function updateSurfaceArrow(
  geometry: THREE.BufferGeometry,
  curve: THREE.Curve<THREE.Vector3>,
  start: number,
  span: number,
  direction: number,
  radius: number,
  halfWidth: number,
  clipMin = 0,
  clipMax = 1,
) {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
  const crossColor = geometry.getAttribute('crossEquatorialColor') as THREE.BufferAttribute | undefined
  const crossColors = geometry.userData.crossEquatorialColors as {
    trade: THREE.Color; monsoon: THREE.Color; destinationHemisphere: 'north' | 'south'
  } | undefined
  // Clip in the arrow's longitudinal coordinates. The head becomes a trapezoid
  // as its tip crosses the boundary; no stretching or per-arrow opacity fade.
  const boundaryA = (clipMin - start) / (span * direction)
  const boundaryB = (clipMax - start) / (span * direction)
  const visibleMin = THREE.MathUtils.clamp(Math.min(boundaryA, boundaryB), 0, 1)
  const visibleMax = THREE.MathUtils.clamp(Math.max(boundaryA, boundaryB), 0, 1)
  let index = 0
  const pair = (t: number, width: number) => {
    const sample = THREE.MathUtils.clamp(start + t * span * direction, clipMin, clipMax)
    curve.getPoint(sample, center).normalize().multiplyScalar(radius)
    curve.getTangent(sample, tangent).multiplyScalar(direction)
    normal.copy(center).normalize()
    side.crossVectors(normal, tangent).normalize()
    for (const sign of [-1, 1]) {
      vertex
        .copy(center)
        .addScaledVector(side, width * sign)
        .normalize()
        .multiplyScalar(radius)
      uv.setXY(index, t, sign < 0 ? 0 : 1)
      if (crossColor && crossColors) {
        const latitude = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(vertex.y / radius, -1, 1)))
        geographicColor.copy(crossColors.trade).lerp(crossColors.monsoon, crossEquatorialMonsoonMix(latitude, crossColors.destinationHemisphere))
        crossColor.setXYZ(index, geographicColor.r, geographicColor.g, geographicColor.b)
      }
      position.setXYZ(index++, vertex.x, vertex.y, vertex.z)
    }
  }
  const shaftMin = Math.min(visibleMin, 0.7)
  const shaftMax = Math.min(visibleMax, 0.7)
  for (const t of rows) {
    const clipped = THREE.MathUtils.clamp(t, shaftMin, shaftMax)
    pair(clipped, halfWidth * (geometry.userData.taperedTail ? Math.pow(clipped / .7, .8) : 1))
  }
  for (const t of [0.7, 1]) {
    const clipped = THREE.MathUtils.clamp(t, Math.max(0.7, visibleMin), Math.max(0.7, visibleMax))
    pair(clipped, (halfWidth * 2.65 * (1 - clipped)) / 0.3)
  }
  position.needsUpdate = true
  uv.needsUpdate = true
  if (crossColor) crossColor.needsUpdate = true
}
