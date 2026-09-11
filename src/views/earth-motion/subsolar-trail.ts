import * as THREE from 'three'
import { rotationCutawayShader, rotationCutawayUniforms } from './earth-cutaway'

/** Last revolution in globe-local coordinates, with a bounded, fading shader ribbon. */
export function createSubsolarTrail(radius: number) {
  const group = new THREE.Group()
  group.name = 'subsolar-history'
  const capacity = 720
  const fullTurn = Math.PI * 2
  // Sample by longitude, not seconds, so even slow playback can retain a whole revolution.
  const sampleRotationStep = fullTurn / (capacity - 2)
  const samples: { direction: THREE.Vector3; rotation: number; distance: number }[] = []
  const positions = new THREE.Float32BufferAttribute(new Float32Array(capacity * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage)
  const colors = new THREE.Float32BufferAttribute(new Float32Array(capacity * 2 * 4), 4).setUsage(THREE.DynamicDrawUsage)
  const distances = new THREE.Float32BufferAttribute(new Float32Array(capacity * 2), 1).setUsage(THREE.DynamicDrawUsage)
  const sides = new THREE.Float32BufferAttribute(new Float32Array(capacity * 2), 1)
  for (let i = 0; i < capacity; i++) {
    sides.setX(i * 2, -1)
    sides.setX(i * 2 + 1, 1)
  }
  const geometry = new THREE.BufferGeometry()
    .setAttribute('position', positions).setAttribute('color', colors)
    .setAttribute('trailDistance', distances).setAttribute('trailSide', sides)
  const indices: number[] = []
  for (let i = 0; i < capacity - 1; i++) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  geometry.setIndex(indices)
  geometry.setDrawRange(0, 0)
  const flowUniforms = {
    ...rotationCutawayUniforms,
    uFlowTime: { value: 0 },
    uFlowSpeed: { value: radius * 0.85 },
    uFlowSpacing: { value: radius * 1.6 },
    uFlowWidth: { value: radius * 0.22 },
    uHighlightColor: { value: new THREE.Color('#fff5cd') },
  }
  const trail = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    name: 'subsolar-flow-material',
    uniforms: flowUniforms,
    vertexColors: true,
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      attribute float trailDistance;
      attribute float trailSide;
      varying float vTrailDistance;
      varying float vTrailSide;
      varying vec4 vTrailColor;
      varying vec3 vTrailWorldPosition;
      void main() {
        vTrailDistance = trailDistance;
        vTrailSide = trailSide;
        vTrailColor = color;
        vTrailWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${rotationCutawayShader}
      uniform float uFlowTime;
      uniform float uFlowSpeed;
      uniform float uFlowSpacing;
      uniform float uFlowWidth;
      uniform vec3 uHighlightColor;
      varying float vTrailDistance;
      varying float vTrailSide;
      varying vec4 vTrailColor;
      varying vec3 vTrailWorldPosition;
      void main() {
        if (insideRotationCutaway(vTrailWorldPosition - cutawayCenter)) discard;

        // Absolute arc length grows from the past towards the current direct point.
        // Advancing the phase in that direction produces a bright head with a trailing glow.
        float phase = mod(vTrailDistance - uFlowTime * uFlowSpeed + uFlowSpacing * 0.5, uFlowSpacing) - uFlowSpacing * 0.5;
        float pulseWidth = phase > 0.0 ? uFlowWidth * 0.2 : uFlowWidth;
        float pulse = exp(-pow(phase / pulseWidth, 2.0));
        float across = abs(vTrailSide);
        float feather = max(fwidth(vTrailSide) * 1.25, 0.08);
        float edge = 1.0 - smoothstep(1.0 - feather, 1.0, across);
        float core = 1.0 - smoothstep(0.1, 0.48, across);
        float glow = exp(-3.5 * across * across);
        // The history fade remains in charge: flowing highlights cannot revive expired samples.
        float opacity = vTrailColor.a * edge * (0.14 * glow + 0.58 * core + pulse * (0.55 * glow + 0.3 * core));
        vec3 tint = mix(vTrailColor.rgb, uHighlightColor, pulse * (0.65 + 0.35 * core));
        gl_FragColor = vec4(tint, clamp(opacity, 0.0, 1.0));
        #include <colorspace_fragment>
      }
    `,
  }))
  trail.name = 'subsolar-flow-ribbon'
  trail.frustumCulled = false
  trail.renderOrder = 6
  const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.017, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe8a1, toneMapped: false }))
  const halo = new THREE.Mesh(new THREE.RingGeometry(radius * 0.028, radius * 0.035, 48), new THREE.MeshBasicMaterial({ color: 0xffd369, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }))
  group.add(trail, head, halo)
  const direction = new THREE.Vector3()
  const lastDirection = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  const side = new THREE.Vector3()
  const position = new THREE.Vector3()
  const color = new THREE.Color()
  const oldColor = new THREE.Color(0x377fba)
  const newColor = new THREE.Color(0xffcf63)
  const surfaceRadius = radius * 1.02
  let clock = 0
  let rotationTravel = 0
  let lastCycleProgress: number | undefined
  let travelledDistance = 0
  let hasLastDirection = false
  function clear() {
    samples.length = 0
    clock = 0
    rotationTravel = 0
    lastCycleProgress = undefined
    travelledDistance = 0
    hasLastDirection = false
    flowUniforms.uFlowTime.value = 0
    geometry.setDrawRange(0, 0)
  }
  function update(sunInEarthLocal: THREE.Vector3, elapsedPlayingSeconds: number, cycleProgress?: number) {
    direction.copy(sunInEarthLocal).normalize()
    head.position.copy(direction).multiplyScalar(surfaceRadius)
    halo.position.copy(head.position)
    halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
    // Scrubbing a paused scene moves only the direct point, not its playback history.
    if (!Number.isFinite(elapsedPlayingSeconds) || elapsedPlayingSeconds <= 0) return
    clock += elapsedPlayingSeconds
    flowUniforms.uFlowTime.value = clock
    // Keep the same phase on surviving samples when the oldest history is removed.
    if (hasLastDirection) {
      travelledDistance += lastDirection.angleTo(direction) * surfaceRadius
      // Unwrap longitude across the date line. A turn is 360° around the axis,
      // not a fixed number of seconds or a latitude-dependent surface distance.
      // With spin frozen, the direct point travels in reverse as Earth orbits.
      // Use the supplied year phase to retain exactly one annual cycle in this mode.
      const phaseStep = cycleProgress !== undefined && lastCycleProgress !== undefined
        ? (cycleProgress - lastCycleProgress) * fullTurn
        : Math.atan2(direction.z, direction.x) - Math.atan2(lastDirection.z, lastDirection.x)
      rotationTravel += Math.abs(Math.atan2(Math.sin(phaseStep), Math.cos(phaseStep)))
    }
    lastDirection.copy(direction)
    lastCycleProgress = cycleProgress
    hasLastDirection = true
    while (samples.length && rotationTravel - samples[0]!.rotation > fullTurn) samples.shift()
    const last = samples[samples.length - 1]
    if (!last || rotationTravel - last.rotation >= sampleRotationStep) {
      samples.push({ direction: direction.clone(), rotation: rotationTravel, distance: travelledDistance })
      if (samples.length >= capacity) samples.shift()
    }
    // Include the exact current direct point as the end of the ribbon between samples.
    const points = [...samples, { direction, rotation: rotationTravel, distance: travelledDistance }]
    for (let i = 0; i < points.length; i++) {
      const sample = points[i]!
      const previous = points[Math.max(0, i - 1)]!.direction
      const next = points[Math.min(points.length - 1, i + 1)]!.direction
      tangent.subVectors(next, previous)
      side.crossVectors(sample.direction, tangent).normalize().multiplyScalar(radius * 0.0085)
      const freshness = THREE.MathUtils.clamp(1 - (rotationTravel - sample.rotation) / fullTurn, 0, 1)
      // A short taper also softens the oldest end when the trail is just starting.
      const alpha = Math.pow(freshness, 2.2) * Math.min(1, i / 8) * 0.92
      color.copy(oldColor).lerp(newColor, Math.pow(freshness, 3))
      for (let edge = 0; edge < 2; edge++) {
        position.copy(sample.direction).multiplyScalar(surfaceRadius).addScaledVector(side, edge ? 1 : -1)
        positions.setXYZ(i * 2 + edge, position.x, position.y, position.z)
        colors.setXYZW(i * 2 + edge, color.r, color.g, color.b, alpha)
        distances.setX(i * 2 + edge, sample.distance)
      }
    }
    positions.needsUpdate = true
    colors.needsUpdate = true
    distances.needsUpdate = true
    geometry.setDrawRange(0, Math.max(0, points.length - 1) * 6)
  }
  function dispose() {
    geometry.dispose()
    trail.material.dispose()
    head.geometry.dispose()
    head.material.dispose()
    halo.geometry.dispose()
    halo.material.dispose()
    group.removeFromParent()
  }
  return { group, update, clear, dispose }
}
