import * as THREE from 'three'
import { createCirculationFormation } from './circulation-formation.ts'

/** Schematic zonal deflection, not a parcel trajectory or numerical weather model.
 * Meridional sections remain separate. Equatorward surface flow turns west;
 * poleward surface flow turns east, mirrored across the equator.
 */
export function deflectCirculationCurve(base: THREE.Curve<THREE.Vector3>, kind: 'single' | 'hadley' | 'ferrel' | 'polar') {
  if (kind === 'single') return base
  const points = Array.from({ length: 480 }, (_, i) => base.getPointAt(i / 480))
  const latitudes = points.map(p => Math.abs(Math.asin(p.y / p.length())))
  const min = Math.min(...latitudes), max = Math.max(...latitudes)
  const extent = THREE.MathUtils.degToRad(kind === 'polar' ? 48 : 38)
  const axis = new THREE.Vector3(0, 1, 0)
  points.forEach((point, i) => {
    const q = (latitudes[i]! - min) / Math.max(1e-6, max - min)
    // With z=-sin(longitude), positive Y rotation increases longitude.
    point.applyAxisAngle(axis, extent * (q * q - .5))
  })
  const result = new THREE.CatmullRomCurve3(points, true, 'centripetal')
  result.arcLengthDivisions = 960
  return result
}

/** Continuous flat ribbon with moving arrowheads; no gap when the phase wraps. */
export function createClosedCellRibbon(curve: THREE.Curve<THREE.Vector3>, arrowCount = 10, halfWidth = .095) {
  const samples = 480
  const points = Array.from({ length: samples + 1 }, (_, i) => curve.getPointAt(i / samples))
  const radii = points.map(p => p.length())
  const minR = Math.min(...radii), maxR = Math.max(...radii)
  const p = points[50]!
  const normal = new THREE.Vector3(-p.z, 0, p.x).normalize()
  const vertices: number[] = [], uv: number[] = [], heights: number[] = [], indices: number[] = []
  points.forEach((point, i) => {
    const tangent = curve.getTangentAt(i / samples).normalize()
    const side = new THREE.Vector3().crossVectors(normal, tangent).normalize()
    for (const sign of [-1, 1]) {
      const edge = point.clone().addScaledVector(side, sign * halfWidth)
      vertices.push(edge.x, edge.y, edge.z)
      uv.push(i / samples, (sign + 1) / 2)
      heights.push((point.length() - minR) / (maxR - minR))
    }
    if (i < samples) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setAttribute('aHeight', new THREE.Float32BufferAttribute(heights, 1))
  const formation = createCirculationFormation(curve)
  geometry.setAttribute('aFormation', new THREE.Float32BufferAttribute(
    Array.from({ length: (samples + 1) * 2 }, (_, i) => formation(Math.floor(i / 2) / samples)), 1))
  geometry.setIndex(indices)
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uReveal: { value: 1 } },
    vertexShader: `attribute float aHeight; attribute float aFormation; varying float vFormation; varying vec2 vUv; varying float vHeight;
      void main(){vUv=uv; vHeight=aHeight; vFormation=aFormation; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uTime; uniform float uReveal; varying float vFormation; varying vec2 vUv; varying float vHeight;
      void main(){
        if(uReveal<=0.) discard;
        float reveal = 1.-smoothstep(uReveal, uReveal+.018, vFormation);
        if(reveal<.01) discard;
        float phase=fract(vUv.x*${arrowCount.toFixed(1)}-uTime*${(arrowCount * .065).toFixed(3)});
        float head=phase>${(1-arrowCount*.03).toFixed(3)} ? (1.-phase)/${(arrowCount*.03).toFixed(3)} : 0.;
        float width=max(.34,head);
        if(abs(vUv.y-.5)*2.>width) discard;
        vec3 warm=vec3(1.,.28,.23), cool=vec3(.27,.64,1.), turn=vec3(.65,.53,.85);
        vec3 color=mix(warm,turn,smoothstep(.12,.48,vHeight));
        color=mix(color,cool,smoothstep(.52,.88,vHeight));
        gl_FragColor=vec4(color,.97*reveal);
      }`,
    side: THREE.DoubleSide, transparent: true, depthTest: true, depthWrite: false, toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'single-continuous-flat-arrow-loop'
  mesh.userData.arrowCount = arrowCount
  mesh.renderOrder = 6
  return mesh
}
