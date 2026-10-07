import * as THREE from 'three'

// Static geometry: the shader moves isolated beads along these narrow strands.
// No per-frame geometry allocation, random wandering or additional image textures.
export function createParticleStreamGeometry(curve: THREE.Curve<THREE.Vector3>, segments = 240, widthScale = 1) {
  const frames = curve.computeFrenetFrames(segments, true)
  // Finite-difference tangents can differ slightly at u=0/1; weld the closing ring.
  frames.normals[segments]!.copy(frames.normals[0]!)
  frames.binormals[segments]!.copy(frames.binormals[0]!)
  frames.tangents[segments]!.copy(frames.tangents[0]!)
  const positions: number[] = [], uv: number[] = [], vertical: number[] = []
  const phases: number[] = [], kinds: number[] = [], indices: number[] = []
  const point = new THREE.Vector3(), offset = new THREE.Vector3()
  const samples = Array.from({ length: segments + 1 }, (_, i) => {
    const position = curve.getPointAt(i / segments)
    return { position, rise: frames.tangents[i]!.dot(position.clone().normalize()) }
  })
  // Three faint guide filaments, seven particle lanes clustered around the core.
  for (let lane = 0; lane < 10; lane++) {
    const guide = lane < 3
    const index = guide ? lane : lane - 3
    const angle = index * 2.3999632297
    const spread = guide ? (index - 1) * .029 : index === 0 ? 0 : .013 + index * .006
    const width = (guide ? .003 : index < 4 ? .012 : .008) * widthScale
    const base = positions.length / 3
    for (let i = 0; i <= segments; i++) {
      const { position, rise } = samples[i]!
      // Subtle broadening on ascent and narrowing on descent; purely illustrative.
      const envelope = 1 + .16 * rise
      offset.copy(frames.normals[i]!).multiplyScalar(Math.cos(angle) * spread * envelope)
        .addScaledVector(frames.binormals[i]!, Math.sin(angle) * spread * envelope)
      for (let side = 0; side <= 4; side++) {
        const theta = side / 4 * Math.PI * 2
        point.copy(position).add(offset)
          .addScaledVector(frames.normals[i]!, Math.cos(theta) * width)
          .addScaledVector(frames.binormals[i]!, Math.sin(theta) * width)
        positions.push(point.x, point.y, point.z)
        uv.push(i / segments, side / 4)
        vertical.push(rise)
        phases.push((index * .381966) % 1)
        kinds.push(guide ? 0 : 1)
        if (i < segments && side < 4) {
          const a = base + i * 5 + side
          indices.push(a, a + 5, a + 1, a + 1, a + 5, a + 6)
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setAttribute('verticalFlow', new THREE.Float32BufferAttribute(vertical, 1))
  geometry.setAttribute('strandPhase', new THREE.Float32BufferAttribute(phases, 1))
  geometry.setAttribute('strandKind', new THREE.Float32BufferAttribute(kinds, 1))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

export function advancePulse(travel: number, dt: number, speed: number, direction: number, playing: boolean) {
  return playing ? travel + dt * speed * direction * .38 : travel
}

// Winter/summer wind routes already encode their own direction. Only explicitly
// reversing ocean currents may apply a negative seasonal playback multiplier.
export function flowMotionDirection(flow: { monsoon?: boolean }, seasonalSignal: number) {
  return flow.monsoon ? seasonalSignal : 1
}

// Layer entrance is a UI transition, independent of the particle playback clock.
// Retain the path while fading out; restart only when it becomes available again.
export function advancePathReveal(progress: number, wasAvailable: boolean, available: boolean, dt: number) {
  if (!available) return progress
  return Math.min(1, (wasAvailable ? progress : 0) + Math.max(0, dt) / 3)
}

// A continuous surface ribbon avoids gaps between former individual arrows.
export function createCurrentLineGeometry(curve: THREE.Curve<THREE.Vector3>, radius: number, halfWidth = .010) {
  const segments = Math.max(64, Math.ceil(curve.getLength() * 85))
  const positions: number[] = [], uv: number[] = [], indices: number[] = []
  const point = new THREE.Vector3(), side = new THREE.Vector3()
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    const center = curve.getPointAt(u).normalize()
    side.crossVectors(center, curve.getTangentAt(u)).normalize()
    for (const sign of [-1, 1]) {
      point.copy(center).multiplyScalar(radius).addScaledVector(side, sign * halfWidth)
        .normalize().multiplyScalar(radius)
      positions.push(point.x, point.y, point.z)
      uv.push(u, (sign + 1) / 2)
    }
    if (i < segments) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

export function matchesFlowFocus(selected: string, element: string) {
  return !!selected && (selected === element || element.startsWith(selected + '-'))
}
