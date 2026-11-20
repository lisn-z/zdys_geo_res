import * as THREE from 'three'

interface VerticalMotion {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
  ribbon: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  radial: THREE.Vector3
  rising: boolean
}

export interface SingleCellTeachingVisuals {
  heating: THREE.Group
  vertical: THREE.Group
  readonly radius: number
  readonly motions: VerticalMotion[]
  cycleStartedAt: number | null
}

const WARM = '#ff915f'
const COLD = '#72caff'

function directionAt(latitude: number, longitude: number) {
  const lat = THREE.MathUtils.degToRad(latitude)
  const lon = THREE.MathUtils.degToRad(longitude)
  return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
}

function temperatureBand(radius: number, center: number, halfWidth: number, color: string) {
  const position: number[] = [], uv: number[] = [], indices: number[] = []
  const longitudeSteps = 160, latitudeSteps = 20
  const start = Math.max(-89.9, center - halfWidth)
  const end = Math.min(89.9, center + halfWidth)
  for (let j = 0; j <= latitudeSteps; j++) {
    const latitude = THREE.MathUtils.lerp(start, end, j / latitudeSteps)
    for (let i = 0; i <= longitudeSteps; i++) {
      const p = directionAt(latitude, i / longitudeSteps * 360).multiplyScalar(radius + .024)
      position.push(p.x, p.y, p.z)
      uv.push(i / longitudeSteps, (latitude - center + halfWidth) / (2 * halfWidth))
      if (j < latitudeSteps && i < longitudeSteps) {
        const a = j * (longitudeSteps + 1) + i
        indices.push(a, a + 1, a + longitudeSteps + 1, a + 1, a + longitudeSteps + 2, a + longitudeSteps + 1)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 color;
      void main() {
        float edge=abs(vUv.y-.5)*2.;
        float opacity=(1.-smoothstep(.1,1.,edge))*.23;
        gl_FragColor=vec4(color,opacity);
      }`,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = center === 0 ? 'equatorial-heating' : center > 0 ? 'north-polar-cooling' : 'south-polar-cooling'
  mesh.renderOrder = 2
  return mesh
}

function radialArrowGeometry() {
  // A simple flat teaching arrow; positive local Y always points along the flow.
  const shape = new THREE.Shape()
  shape.moveTo(-.024, 0)
  shape.lineTo(.024, 0)
  shape.lineTo(.024, .25)
  shape.lineTo(.072, .25)
  shape.lineTo(0, .37)
  shape.lineTo(-.072, .25)
  shape.lineTo(-.024, .25)
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}

function verticalRibbon(color: string) {
  // A narrow flat translucent path, not a cylinder or a global pressure overlay.
  const geometry = new THREE.PlaneGeometry(.12, .37, 1, 12)
  geometry.translate(0, .185, 0)
  const material = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, formation: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 color; uniform float formation;
      void main(){
        float side=1.-smoothstep(.18,1.,abs(vUv.x-.5)*2.);
        float ends=smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.88,1.,vUv.y));
        gl_FragColor=vec4(color,side*ends*.18*min(1.,formation*3.));
      }`,
    transparent: true, depthTest: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  })
  const ribbon = new THREE.Mesh(geometry, material)
  ribbon.renderOrder = 3
  ribbon.frustumCulled = false
  return ribbon
}

/** Local explanatory layers for the non-rotating single-cell model, not an atmosphere shell. */
export function createSingleCellTeachingVisuals(radius = 2.5): SingleCellTeachingVisuals {
  const heating = new THREE.Group()
  heating.name = 'single-cell-heating-difference'
  heating.add(temperatureBand(radius, 0, 12, WARM),
    temperatureBand(radius, 80, 10, COLD), temperatureBand(radius, -80, 10, COLD))
  const vertical = new THREE.Group()
  vertical.name = 'single-cell-vertical-motion'
  const motions: VerticalMotion[] = []
  const geometry = radialArrowGeometry()
  for (const latitude of [0, 82, -82]) {
    const rising = latitude === 0
    const count = rising ? 8 : 4
    for (let i = 0; i < count; i++) {
      const longitude = i * 360 / count
      const radial = directionAt(latitude, longitude)
      const material = new THREE.MeshBasicMaterial({
        color: rising ? WARM : COLD,
        transparent: true, opacity: .9, depthTest: true, depthWrite: false,
        side: THREE.DoubleSide, toneMapped: false,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = rising ? 'equatorial-rising-arrow' : latitude > 0 ? 'north-polar-sinking-arrow' : 'south-polar-sinking-arrow'
      // Tangential width and radial height keep arrows clear of the globe.
      const yAxis = radial.clone().multiplyScalar(rising ? 1 : -1)
      const lon = THREE.MathUtils.degToRad(longitude)
      const xAxis = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon))
      const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
      mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
      mesh.renderOrder = 4
      mesh.frustumCulled = false
      const ribbon = verticalRibbon(rising ? WARM : COLD)
      ribbon.name = `${mesh.name}-path`
      ribbon.quaternion.copy(mesh.quaternion)
      vertical.add(ribbon, mesh)
      motions.push({ mesh, ribbon, radial, rising })
    }
  }
  const visuals: SingleCellTeachingVisuals = { heating, vertical, radius, motions, cycleStartedAt: null }
  updateSingleCellTeachingVisuals(visuals, 0, 0)
  return visuals
}

/** Time is supplied by the lesson clock, so pausing the lesson also pauses these arrows. */
export function updateSingleCellTeachingVisuals(visuals: SingleCellTeachingVisuals, time: number, formation = 1) {
  const amount = THREE.MathUtils.clamp(formation, 0, 1)
  const growth = THREE.MathUtils.smoothstep(amount, 0, 1)
  if (amount < 1) visuals.cycleStartedAt = null
  else if (visuals.cycleStartedAt === null || time < visuals.cycleStartedAt) visuals.cycleStartedAt = time

  // The repeating flow clock begins at completion, not at the global animation time.
  // This prevents a jump from a half-grown arrow into an unrelated cycle phase.
  const cycles = visuals.cycleStartedAt === null ? 0 : Math.max(0, time - visuals.cycleStartedAt) * .2
  const phase = THREE.MathUtils.euclideanModulo(cycles, 1)
  const entrance = cycles < 1 ? 1 : THREE.MathUtils.smoothstep(phase, 0, .12)
  const opacity = .9 * Math.min(1, growth * 3) * entrance
    * (1 - THREE.MathUtils.smoothstep(phase, .86, 1))
  for (const motion of visuals.motions) {
    const baseHeight = motion.rising ? .06 : .54
    const height = baseHeight + (motion.rising ? 1 : -1) * phase * .11
    motion.mesh.position.copy(motion.radial).multiplyScalar(visuals.radius + height)
    motion.mesh.scale.set(1, growth, 1)
    motion.mesh.visible = amount > 0
    motion.mesh.material.opacity = opacity
    // Both paths and arrows grow from their respective source: ground for rising
    // flow, upper atmosphere for sinking flow. No whole-arrow fade-in substitute.
    motion.ribbon.position.copy(motion.radial).multiplyScalar(visuals.radius + baseHeight)
    motion.ribbon.scale.set(1, growth, 1)
    motion.ribbon.visible = amount > 0
    motion.ribbon.material.uniforms.formation!.value = growth
  }
}
