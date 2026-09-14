import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createEarthSurfaceMaterial, createEarthAtmosphereMaterial, type EarthUniforms } from '../tidal-phenomenon/earth-material'
import { getObservation, getEarthFrame, phaseElongation } from './moon-geometry'
import { MOON_SPACE_SCALE, MOON_SPHERE_UV_GLSL } from './moon-texture'

export type SceneMode = 'orbit' | 'observer'

export interface SceneStation {
  id: string
  name: string
  latitude: number
  longitude: number
  color?: string
}

export interface SceneState {
  phase: number
  latitude: number
  longitude: number
  utcHour: number
  dayOfYear?: number
  stations?: SceneStation[]
  activeStationId?: string
  mode: SceneMode
  showGuides: boolean
  showOrbitAngle?: boolean
}

interface SceneCallbacks {
  onError?: (message: string) => void
  onReady?: () => void
  onViewChange?: (heading: number, pitch: number) => void
  onMoonFollowChange?: (active: boolean) => void
  onSurfaceViewChange?: (active: boolean) => void
  onObserverPick?: (latitude: number, longitude: number) => void
  onLoadingProgress?: (progress: number) => void
}

const EARTH_RADIUS = MOON_SPACE_SCALE.earthRadius
const ORBIT_RADIUS = MOON_SPACE_SCALE.orbitRadius
const MOON_RADIUS = MOON_SPACE_SCALE.moonRadius
const EYE_HEIGHT = 1.7
const SURFACE_EYE_HEIGHT = MOON_SPACE_SCALE.surfaceEyeHeight
const TANGENT_RADIUS = 1.25
const SKY_MOON_DISTANCE = 450
const RAD = Math.PI / 180
const TEXTURE_PATH = '/geo-resources-folder/images/'
const REMOTE_TEXTURE_PATH = 'https://zdys.szjx.ai-study.net/geo-resources-folder/images/'

/** Two views of one geometry: an illustrative orbit and a local ENU sky. */
export function createMoonScene(container: HTMLElement, callbacks: SceneCallbacks = {}) {
  let disposed = false
  let frame = 0
  let firstFrame = true
  let readyReported = false
  let settledAssetsRendered = false
  const settledTextures = new Set<string>()
  const textureTimers = new Set<number>()
  let inViewport = true
  let hasSize = false
  let renderingLost = false
  let surfaceView = false
  let lastFrameTime = 0
  let resizePending = true
  let drawnWidth = 0
  let drawnHeight = 0
  let drawnPixelRatio = 0
  let flight: {
    elapsed: number
    startDirection: THREE.Vector3
    startRadius: number
    startFov: number
    approachDuration: number
    arcLift: number
    startRotation: THREE.Quaternion
    approachRotation: THREE.Quaternion
    turnRotation: THREE.Quaternion | null
    turnBlend: number
    followOnArrival: boolean
  } | null = null
  let focusedBody: 'earth' | 'moon' = 'earth'
  let bodyFlight: {
    elapsed: number
    body: 'earth' | 'moon'
    startPosition: THREE.Vector3
    startTarget: THREE.Vector3
    startRotation: THREE.Quaternion
    startUp: THREE.Vector3
    startFov: number
    endOffset: THREE.Vector3
  } | null = null
  let heading = 0
  let pitch = 20
  let skyTurn: { elapsed: number; duration: number; startHeading: number; headingDelta: number; startPitch: number; endPitch: number } | null = null
  let followingMoon = false
  let activePointer: number | null = null
  let pointerX = 0
  let pointerY = 0
  let pickCandidate: { pointerId: number; x: number; y: number; started: number } | null = null
  const orbitPointers = new Set<number>()
  let state: SceneState = { phase: 90, latitude: 31.23, longitude: 121.47, utcHour: 10, dayOfYear: 80, mode: 'orbit', showGuides: true }
  const textures = new Set<THREE.Texture>()
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const keepGeometry = <T extends THREE.BufferGeometry>(value: T) => { geometries.add(value); return value }
  const keepMaterial = <T extends THREE.Material>(value: T) => { materials.add(value); return value }
  const keepTexture = <T extends THREE.Texture>(value: T) => { textures.add(value); return value }
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (error) {
    callbacks.onError?.('三维场景暂时无法启动，请检查浏览器的 WebGL 支持。')
    throw error
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor('#030710', 1)
  const canvas = renderer.domElement
  canvas.style.cssText = 'display:block;width:100%;height:100%;outline:none;touch-action:none;'
  canvas.tabIndex = 0
  canvas.setAttribute('aria-label', '月相三维场景；地面视角可拖动或使用方向键环顾，Home 键寻找月亮')
  container.appendChild(canvas)

  const space = new THREE.Scene()
  const groundScene = new THREE.Scene()
  const orbitCamera = new THREE.PerspectiveCamera(46, 1, 0.1, 1500)
  const observerCamera = new THREE.PerspectiveCamera(92, 1, 0.1, 4000)
  observerCamera.position.set(0, EYE_HEIGHT, 0)
  const controls = new OrbitControls(orbitCamera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minDistance = 22
  controls.maxDistance = 125
  controls.minPolarAngle = 0.02
  controls.maxPolarAngle = Math.PI - 0.02
  controls.rotateSpeed = 0.5
  controls.zoomSpeed = 0.7
  const isSkyView = () => state.mode === 'observer'
  const isLocalControl = () => isSkyView() || surfaceView
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  let reducedMotion = reducedMotionQuery.matches
  let rippleTime = 0

  function solidTexture(color: string) {
    const c = document.createElement('canvas')
    c.width = c.height = 4
    const ctx = c.getContext('2d')!
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 4, 4)
    const texture = keepTexture(new THREE.CanvasTexture(c))
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  function reportLoadingProgress() {
    if (disposed) return
    const progress = Math.round(settledTextures.size / 4 * 90 + (firstFrame ? 0 : 5) + (settledAssetsRendered ? 5 : 0))
    callbacks.onLoadingProgress?.(Math.min(progress, 100))
    if (!readyReported && settledTextures.size === 4 && !firstFrame && settledAssetsRendered) {
      readyReported = true
      callbacks.onReady?.()
    }
  }

  // Every texture settles through success or bounded fallback attempts. Late
  // responses after timeout/disposal are discarded rather than reviving state.
  function loadTexture(name: string, receive: (texture: THREE.Texture) => void) {
    const loader = new THREE.TextureLoader()
    const settle = () => { settledTextures.add(name); reportLoadingProgress() }
    const attempt = (url: string, fallback: boolean) => {
      if (disposed) return
      let closed = false
      let pendingTexture: THREE.Texture | undefined
      const fail = () => {
        if (closed || disposed) return
        closed = true
        window.clearTimeout(timeout)
        textureTimers.delete(timeout)
        pendingTexture?.dispose()
        if (fallback) attempt(REMOTE_TEXTURE_PATH + name, false)
        else settle()
      }
      const timeout = window.setTimeout(fail, 7000)
      textureTimers.add(timeout)
      pendingTexture = loader.load(url, (texture) => {
        if (disposed || closed) { texture.dispose(); return }
        closed = true
        window.clearTimeout(timeout)
        textureTimers.delete(timeout)
        keepTexture(texture)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = THREE.RepeatWrapping
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
        receive(texture)
        settle()
      }, undefined, fail)
    }
    attempt(TEXTURE_PATH + name, true)
  }
  reportLoadingProgress()

  const earthUniforms: EarthUniforms = {
    uMap: { value: solidTexture('#276080') },
    uNightMap: { value: solidTexture('#000000') },
    uLightDirection: { value: new THREE.Vector3(1, 0, 0) },
    uOpacity: { value: 1 },
    uAtmosphereDayColor: { value: new THREE.Color('#56b9ff') },
    uAtmosphereTwilightColor: { value: new THREE.Color('#c66631') },
  }
  const earth = new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(EARTH_RADIUS, 128, 64)), keepMaterial(createEarthSurfaceMaterial(earthUniforms)))
  const atmosphere = new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(EARTH_RADIUS * 1.055, 96, 48)), keepMaterial(createEarthAtmosphereMaterial(earthUniforms)))
  space.add(earth, atmosphere)
  loadTexture('earth.jpg', texture => { earthUniforms.uMap.value = texture })
  loadTexture('emissive.jpg', texture => { earthUniforms.uNightMap.value = texture })

  const moonMaterial = keepMaterial(new THREE.MeshStandardMaterial({ color: '#f2f0e8', roughness: 1, metalness: 0, emissive: '#080b10', emissiveIntensity: 0.3 }))
  const moonBillboardVertex = `
    uniform float radius;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float distanceSquared = dot(center.xyz, center.xyz);
      float projectionScale = -center.z / sqrt(max(distanceSquared - radius * radius, 0.001));
      center.xy += position.xy * radius * 2.0 * projectionScale;
      gl_Position = projectionMatrix * center;
    }
  `
  // Lunar regolith has a much flatter apparent brightness than a Lambertian
  // studio-lit ball. Use the local Sun direction and a soft terminator while
  // letting the unlit part merge into the sky instead of outlining a black ball.
  const localMoonMaterial = keepMaterial(new THREE.ShaderMaterial({
    uniforms: {
      moonMap: { value: solidTexture('#b4b1aa') }, sunDirection: { value: new THREE.Vector3(1, 0, 0) }, daylight: { value: 0 },
      radius: { value: SKY_MOON_DISTANCE * Math.tan(2 * RAD) },
      discRight: { value: new THREE.Vector3(1, 0, 0) }, discUp: { value: new THREE.Vector3(0, 1, 0) },
      towardEye: { value: new THREE.Vector3(0, 0, 1) }, textureRotation: { value: new THREE.Matrix3() },
    },
    transparent: true, depthWrite: false, depthTest: true,
    vertexShader: moonBillboardVertex,
    fragmentShader: `
      uniform sampler2D moonMap;
      uniform vec3 sunDirection;
      uniform float daylight;
      uniform vec3 discRight;
      uniform vec3 discUp;
      uniform vec3 towardEye;
      uniform mat3 textureRotation;
      varying vec2 vUv;
      ${MOON_SPHERE_UV_GLSL}
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float radiusSquared = dot(p, p);
        if (radiusSquared > 1.0) discard;
        float front = sqrt(max(1.0 - radiusSquared, 0.0));
        vec3 n = normalize(discRight * p.x + discUp * p.y + towardEye * front);
        vec3 viewDirection = towardEye;
        float sunFacing = dot(n, normalize(sunDirection));
        float mu = max(dot(n, viewDirection), 0.0);
        float mu0 = max(sunFacing, 0.0);
        float terminator = smoothstep(-0.008, 0.035, sunFacing);
        if (terminator < 0.002) discard;
        vec3 textureNormal = normalize(textureRotation * n);
        vec2 lunarUv = moonSphereUv(textureNormal);
        vec3 mapColor = texture2D(moonMap, lunarUv).rgb;
        float lunarDetail = dot(mapColor, vec3(0.2126, 0.7152, 0.0722));
        float albedo = clamp(0.14 + lunarDetail * 1.5, 0.15, 1.18);
        float regolith = 0.76 + 0.24 * clamp(1.6 * mu0 / (mu0 + mu + 0.001), 0.0, 1.0);
        vec3 silver = vec3(0.96, 1.0, 1.055) * albedo * regolith * mix(1.48, 1.25, daylight);
        float edge = 1.0 - smoothstep(1.0 - fwidth(radiusSquared), 1.0, radiusSquared);
        gl_FragColor = vec4(silver, edge * terminator * mix(1.0, 0.82, daylight));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }))
  const moonGeometry = keepGeometry(new THREE.SphereGeometry(1, 80, 48))
  const moon = new THREE.Mesh(moonGeometry, moonMaterial)
  moon.scale.setScalar(MOON_RADIUS)
  const lunarDiscGeometry = keepGeometry(new THREE.PlaneGeometry(1, 1))
  const localMoon = new THREE.Mesh(lunarDiscGeometry, localMoonMaterial)
  // A 4° teaching disc makes the terminator legible while its center, horizon
  // visibility and orientation follow the observer's actual geometry.
  localMoon.scale.setScalar(SKY_MOON_DISTANCE * Math.tan(2 * RAD))
  localMoon.renderOrder = 10
  localMoon.frustumCulled = false
  const localMoonOccluder = new THREE.Mesh(lunarDiscGeometry, keepMaterial(new THREE.ShaderMaterial({
    uniforms: { radius: localMoonMaterial.uniforms.radius! }, colorWrite: false, depthWrite: true,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
    vertexShader: moonBillboardVertex,
    fragmentShader: 'varying vec2 vUv; void main() { vec2 p = (vUv - 0.5) * 2.0; if (dot(p, p) > 1.0) discard; gl_FragColor = vec4(0.0); }',
  })))
  localMoonOccluder.scale.copy(localMoon.scale)
  localMoonOccluder.frustumCulled = false
  // Stars remain occluded even where the lunar night side is visually transparent.
  groundScene.add(localMoonOccluder)
  const moonGlowMaterial = keepMaterial(new THREE.ShaderMaterial({
    uniforms: { sunDirection: localMoonMaterial.uniforms.sunDirection!, radius: localMoonMaterial.uniforms.radius!, daylight: localMoonMaterial.uniforms.daylight!, discRight: localMoonMaterial.uniforms.discRight!, discUp: localMoonMaterial.uniforms.discUp!, towardEye: localMoonMaterial.uniforms.towardEye! },
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform vec3 sunDirection;
      uniform float radius;
      uniform vec3 discRight;
      uniform vec3 discUp;
      uniform vec3 towardEye;
      varying vec2 vUv;
      varying vec3 vSunView;
      varying float vIllumination;
      void main() {
        vUv = uv;
        vec4 center = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vIllumination = clamp((1.0 + dot(normalize(sunDirection), towardEye)) * 0.5, 0.0, 1.0);
        vSunView = vec3(dot(sunDirection, discRight), dot(sunDirection, discUp), dot(sunDirection, towardEye));
        vec4 p = viewMatrix * center;
        float projectionScale = -p.z / sqrt(max(dot(p.xyz, p.xyz) - radius * radius, 0.001));
        p.xy += position.xy * radius * 2.6 * projectionScale;
        gl_Position = projectionMatrix * p;
      }
    `,
    fragmentShader: `
      uniform float daylight;
      varying vec2 vUv;
      varying vec3 vSunView;
      varying float vIllumination;
      void main() {
        vec2 p = (vUv - 0.5) * 2.6;
        float r = length(p);
        float halo = exp(-pow((r - 1.0) / 0.14, 2.0)) * smoothstep(0.96, 1.02, r) * (1.0 - smoothstep(1.17, 1.3, r));
        float litEdge = smoothstep(-0.12, 0.3, dot(p / max(r, 0.001), vSunView.xy) + vSunView.z * 0.55);
        float alpha = halo * litEdge * smoothstep(0.025, 0.75, vIllumination) * (1.0 - daylight * 0.92) * 0.047;
        gl_FragColor = vec4(vec3(0.64, 0.76, 0.92), alpha);
      }
    `,
  }))
  const moonGlow = new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(1, 1)), moonGlowMaterial)
  moonGlow.frustumCulled = false
  moonGlow.renderOrder = 9
  space.add(moon)
  groundScene.add(moonGlow, localMoon)
  loadTexture('moon.jpg', texture => {
    moonMaterial.map = texture
    localMoonMaterial.uniforms.moonMap!.value = texture
    moonMaterial.needsUpdate = true
  })
  const sunlight = new THREE.DirectionalLight('#fff4de', 3.2)
  sunlight.position.set(100, 0, 0)
  space.add(sunlight, new THREE.AmbientLight('#7692b0', 0.08))
  const localSunlight = new THREE.DirectionalLight('#fff6e7', 3.2)
  groundScene.add(localSunlight, localSunlight.target)

  const spaceGuides = new THREE.Group()
  const localGuides = new THREE.Group()
  space.add(spaceGuides)
  groundScene.add(localGuides)
  function line(points: THREE.Vector3[], color: string, opacity: number, loop = false) {
    const geometry = keepGeometry(new THREE.BufferGeometry().setFromPoints(points))
    const material = keepMaterial(new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: true, depthWrite: false }))
    return loop ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material)
  }
  function arrow(direction: THREE.Vector3, origin: THREE.Vector3, length: number, color: string, headLength = 0.8, headWidth = 0.4) {
    const helper = new THREE.ArrowHelper(direction, origin, length, color, headLength, headWidth) as THREE.ArrowHelper & {
      line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>
      cone: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
    }
    // ArrowHelper normally shares cached geometry across unrelated scenes.
    // Give this lesson its own copies so disposal cannot invalidate another view.
    helper.line.geometry = keepGeometry(helper.line.geometry.clone())
    helper.cone.geometry = keepGeometry(helper.cone.geometry.clone())
    keepMaterial(helper.line.material)
    keepMaterial(helper.cone.material)
    return helper
  }
  const rippleGeometry = keepGeometry(new THREE.RingGeometry(0.95, 1, 64))
  type RippleSet = {
    group: THREE.Group
    rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[]
    phaseOffset: number
    strength: number
  }
  const rippleSets = new Set<RippleSet>()
  function updateRipples(delta: number) {
    if (!reducedMotion) rippleTime += delta / 1000
    for (const ripple of rippleSets) {
      ripple.rings.forEach((ring, index) => {
        const phase = (rippleTime / 2.8 + index / 3 + ripple.phaseOffset) % 1
        const radius = reducedMotion ? 0.42 + index * 0.36 : 0.18 + phase * 1.17
        ring.scale.set(radius, radius, 1)
        ring.material.opacity = reducedMotion
          ? (0.14 - index * 0.035) * ripple.strength
          : Math.pow(1 - phase, 1.7) * 0.36 * ripple.strength
      })
    }
  }
  function createRipples(color: string, strength = 1): RippleSet {
    const group = new THREE.Group()
    group.position.y = 0.038
    const rings = Array.from({ length: 3 }, () => {
      const ring = new THREE.Mesh(rippleGeometry, keepMaterial(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0, depthTest: true, depthWrite: false })))
      ring.rotation.x = -Math.PI / 2
      ring.renderOrder = 5
      group.add(ring)
      return ring
    })
    const ripple = { group, rings, strength, phaseOffset: rippleSets.size * 0.13 }
    rippleSets.add(ripple)
    updateRipples(0)
    return ripple
  }
  function reducedMotionChange(event: MediaQueryListEvent) {
    reducedMotion = event.matches
    updateRipples(0)
    if (reducedMotion) advanceSkyTurn(0)
  }
  reducedMotionQuery.addEventListener('change', reducedMotionChange)
  const orbitPoints = Array.from({ length: 240 }, (_, i) => new THREE.Vector3(Math.cos(i / 240 * Math.PI * 2) * ORBIT_RADIUS, 0, -Math.sin(i / 240 * Math.PI * 2) * ORBIT_RADIUS))
  spaceGuides.add(line(orbitPoints, '#8babca', 0.34, true))
  const equator = line(Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos(i / 160 * Math.PI * 2) * EARTH_RADIUS * 1.008, 0, Math.sin(i / 160 * Math.PI * 2) * EARTH_RADIUS * 1.008)), '#67c5e8', 0.28, true)
  spaceGuides.add(equator)
  const axis = line([new THREE.Vector3(0, -(EARTH_RADIUS + 1.35), 0), new THREE.Vector3(0, EARTH_RADIUS + 1.35, 0)], '#7fb8da', 0.5)
  spaceGuides.add(axis)
  const moonRay = line([new THREE.Vector3(), new THREE.Vector3(ORBIT_RADIUS, 0, 0)], '#a0c5e4', 0.19)
  spaceGuides.add(moonRay)

  const spaceLabels = new Set<THREE.Sprite>()
  function label(text: string, color: string, scale = 2.5, badge = true) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 128
    const texture = keepTexture(new THREE.CanvasTexture(c))
    texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(keepMaterial(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false, alphaTest: 0.02, toneMapped: false })))
    sprite.userData.labelBadge = badge
    sprite.userData.labelScale = scale
    if (badge) spaceLabels.add(sprite)
    sprite.scale.set(scale * 4, scale, 1)
    updateLabel(sprite, text, color)
    return sprite
  }
  function updateLabel(sprite: THREE.Sprite, text: string, color: string) {
    const signature = `${text}|${color}`
    if (sprite.userData.labelSignature === signature) return
    sprite.userData.labelSignature = signature
    const texture = sprite.material.map!
    const c = texture.image as HTMLCanvasElement
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const baseSize = sprite.userData.labelBadge ? 46 : 42
    ctx.font = `500 ${baseSize}px "Microsoft YaHei", sans-serif`
    const title = text.slice(0, 18)
    const fontSize = Math.min(baseSize, 432 / Math.max(ctx.measureText(title).width, 1) * baseSize)
    ctx.font = `500 ${fontSize}px "Microsoft YaHei", sans-serif`
    ctx.shadowBlur = 0
    if (sprite.userData.labelBadge) {
      const width = Math.min(484, ctx.measureText(title).width + 42)
      ctx.beginPath()
      ctx.roundRect((512 - width) / 2, 25, width, 78, 15)
      ctx.fillStyle = 'rgba(7, 17, 29, 0.78)'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1
    } else {
      ctx.shadowColor = '#000000'
      ctx.shadowBlur = 14
    }
    ctx.fillStyle = color
    ctx.fillText(title, 256, 64)
    texture.needsUpdate = true
  }
  const labelViewPosition = new THREE.Vector3()
  function updateSpaceLabelScales() {
    if (!drawnHeight) return
    orbitCamera.updateMatrixWorld()
    for (const sprite of spaceLabels) {
      sprite.getWorldPosition(labelViewPosition).applyMatrix4(orbitCamera.matrixWorldInverse)
      const depth = -labelViewPosition.z
      if (depth <= 0) continue
      // Retain the restrained world size from an overview, and cap close-up
      // badges at 22 CSS pixels high (36 pixels including transparent padding).
      const worldPerPixel = 2 * depth / (drawnHeight * orbitCamera.projectionMatrix.elements[5]!)
      const scale = Math.min(Number(sprite.userData.labelScale), 36 * worldPerPixel)
      sprite.scale.set(scale * 4, scale, 1)
    }
  }
  const earthLabel = label('地 球', '#c9dfe9', 2.1)
  earthLabel.position.set(0, -(EARTH_RADIUS + 1.2), 0)
  spaceGuides.add(earthLabel)
  const moonLabel = label('月 球', '#e4e8ed', 1.9)
  spaceGuides.add(moonLabel)
  const orbitNames = ['新月', '蛾眉月', '上弦月', '盈凸月', '满月', '亏凸月', '下弦月', '残月']
  orbitNames.forEach((name, i) => {
    const marker = label(name, i % 2 === 0 ? '#afc2d7' : '#99aec4', 1.65)
    const angle = i * Math.PI / 4
    marker.position.set(Math.cos(angle) * (ORBIT_RADIUS + 3), 0, -Math.sin(angle) * (ORBIT_RADIUS + 3))
    const stem = line([new THREE.Vector3(Math.cos(angle) * (ORBIT_RADIUS + 0.35), 0, -Math.sin(angle) * (ORBIT_RADIUS + 0.35)), new THREE.Vector3(Math.cos(angle) * (ORBIT_RADIUS + 1.65), 0, -Math.sin(angle) * (ORBIT_RADIUS + 1.65))], '#9bb5ce', 0.42)
    spaceGuides.add(marker, stem)
  })

  // The smaller angle at Earth is independent of both the accumulated phase
  // position (0–360°) and the observer's local horizon/parallax.
  const orbitAngleGuide = new THREE.Group()
  orbitAngleGuide.visible = false
  space.add(orbitAngleGuide)
  const angleColor = '#f0cb91'
  const angleRadius = EARTH_RADIUS + 3.2
  const angleSegments = 96
  const angleArcGeometry = keepGeometry(new THREE.BufferGeometry())
  const angleArcPositions = new THREE.BufferAttribute(new Float32Array((angleSegments + 1) * 3), 3).setUsage(THREE.DynamicDrawUsage)
  angleArcGeometry.setAttribute('position', angleArcPositions)
  angleArcGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), angleRadius)
  const angleArc = new THREE.Line(angleArcGeometry, keepMaterial(new THREE.LineBasicMaterial({ color: angleColor, transparent: true, opacity: 0.9, depthTest: true, depthWrite: false })))
  const angleSectorGeometry = keepGeometry(new THREE.BufferGeometry())
  const angleSectorPositions = new THREE.BufferAttribute(new Float32Array((angleSegments + 2) * 3), 3).setUsage(THREE.DynamicDrawUsage)
  angleSectorGeometry.setAttribute('position', angleSectorPositions)
  angleSectorGeometry.setIndex(Array.from({ length: angleSegments }, (_, index) => [0, index + 1, index + 2]).flat())
  angleSectorGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), angleRadius)
  const angleSector = new THREE.Mesh(angleSectorGeometry, keepMaterial(new THREE.MeshBasicMaterial({ color: angleColor, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthTest: true, depthWrite: false })))
  const angleBaseline = line([new THREE.Vector3(), new THREE.Vector3(ORBIT_RADIUS * 0.72, 0, 0)], angleColor, 0.68)
  const angleMoonRay = line([new THREE.Vector3(), new THREE.Vector3(ORBIT_RADIUS, 0, 0)], angleColor, 0.68)
  angleMoonRay.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), ORBIT_RADIUS)
  const angleLabel = label('日地月夹角 90.0°', angleColor, 2.4)
  const angleOriginLabel = label('太阳方向 · 0°', '#c9b99f', 1.65)
  angleOriginLabel.position.set(ORBIT_RADIUS * 0.72, 0, 1.6)
  orbitAngleGuide.add(angleSector, angleArc, angleBaseline, angleMoonRay, angleLabel, angleOriginLabel)
  let previousAngleSweep = Number.NaN
  function updateOrbitAngleGuide() {
    // Flight and reset can run while time is paused, so resolve visibility in
    // the render loop instead of relying on the simulation's state watcher.
    orbitAngleGuide.visible = Boolean(state.showOrbitAngle) && state.mode === 'orbit' && !surfaceView && !flight
    if (!orbitAngleGuide.visible) return
    const angle = phaseElongation(state.phase)
    const sweep = angle * RAD * (Math.sin(state.phase * RAD) < 0 ? -1 : 1)
    if (sweep === previousAngleSweep) return
    previousAngleSweep = sweep
    for (let index = 0; index <= angleSegments; index++) {
      const theta = sweep * index / angleSegments
      const x = Math.cos(theta) * angleRadius
      const z = -Math.sin(theta) * angleRadius
      angleArcPositions.setXYZ(index, x, 0, z)
      angleSectorPositions.setXYZ(index + 1, x, 0, z)
    }
    angleArcPositions.needsUpdate = angleSectorPositions.needsUpdate = true
    angleArc.visible = angleSector.visible = angle > 0.001
    const moonRayPositions = angleMoonRay.geometry.getAttribute('position') as THREE.BufferAttribute
    moonRayPositions.setXYZ(1, moon.position.x, moon.position.y, moon.position.z)
    moonRayPositions.needsUpdate = true
    // A fixed height separates the badge from coincident rays at new Moon
    // without jumping its angular position as the two rays approach each other.
    const labelAngle = sweep / 2
    angleLabel.position.set(Math.cos(labelAngle) * (angleRadius + 3), 1.8, -Math.sin(labelAngle) * (angleRadius + 3))
    updateLabel(angleLabel, `日地月夹角 ${angle.toFixed(1)}°`, angleColor)
  }

  const observerMarker = new THREE.Group()
  const markerDot = new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(0.15, 16, 12)), keepMaterial(new THREE.MeshBasicMaterial({ color: '#7af5d8', transparent: true, depthTest: true, depthWrite: false })))
  markerDot.position.y = 0.28
  const markerRing = new THREE.Mesh(keepGeometry(new THREE.RingGeometry(0.16, 0.23, 40)), keepMaterial(new THREE.MeshBasicMaterial({ color: '#7af5d8', side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthTest: true, depthWrite: false })))
  markerRing.rotation.x = -Math.PI / 2
  markerRing.position.y = 0.025
  const activeRipples = createRipples('#7af5d8')
  observerMarker.add(markerDot, markerRing, activeRipples.group, line([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.52, 0)], '#7af5d8', 0.8))
  observerMarker.renderOrder = 5
  spaceGuides.add(observerMarker)

  const observerLabel = label('观测点', '#9cead9', 2.2)
  const observerBackLabel = label('观测点（背面）', '#87b6bd', 2.2)
  const normalLabel = label('地表法线', '#88d4c4', 2)
  const sightlineLabel = label('观测连线', '#afd3ed', 2)
  for (const sprite of [observerLabel, observerBackLabel, normalLabel, sightlineLabel]) {
    sprite.material.depthTest = true
    sprite.material.alphaTest = 0.02
    sprite.renderOrder = 6
    spaceGuides.add(sprite)
  }
  const normalArrow = arrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 5, '#72d8bc', 0.85, 0.38)
  for (const material of [normalArrow.line.material, normalArrow.cone.material]) {
    material.depthTest = true
    material.depthWrite = false
    material.transparent = true
  }
  normalArrow.line.renderOrder = normalArrow.cone.renderOrder = 4
  spaceGuides.add(normalArrow)

  const sightlineMaterial = keepMaterial(new THREE.LineDashedMaterial({ color: '#acdafa', dashSize: 0.65, gapSize: 0.38, transparent: true, opacity: 0.6, depthWrite: false, depthTest: true }))
  const sightline = new THREE.Line(keepGeometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])), sightlineMaterial)
  sightline.renderOrder = 3
  spaceGuides.add(sightline)

  // This local tangent patch is parallel to the observer's geometric horizon.
  // Its disk, ring, labels and connecting lines all obey Earth/Moon depth.
  const tangentPatch = new THREE.Group()
  const tangentDisk = new THREE.Mesh(keepGeometry(new THREE.CircleGeometry(TANGENT_RADIUS, 64)), keepMaterial(new THREE.MeshBasicMaterial({ color: '#78cbbb', side: THREE.DoubleSide, transparent: true, opacity: 0.085, depthWrite: false })))
  tangentDisk.rotation.x = -Math.PI / 2
  const tangentRing = line(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2) * TANGENT_RADIUS, 0, Math.sin(i / 96 * Math.PI * 2) * TANGENT_RADIUS)), '#78cbbb', 0.45, true)
  tangentPatch.add(tangentDisk, tangentRing,
    line([new THREE.Vector3(-TANGENT_RADIUS, 0, 0), new THREE.Vector3(TANGENT_RADIUS, 0, 0)], '#78cbbb', 0.25),
    line([new THREE.Vector3(0, 0, -TANGENT_RADIUS), new THREE.Vector3(0, 0, TANGENT_RADIUS)], '#78cbbb', 0.25))
  spaceGuides.add(tangentPatch)

  const stationGroup = new THREE.Group()
  spaceGuides.add(stationGroup)
  const stationDotGeometry = keepGeometry(new THREE.SphereGeometry(0.13, 16, 10))
  const stationColors = ['#7fdac2', '#edbd88', '#b5a4f2', '#89b8ef', '#eda3bc', '#abd58c']
  function createStationGuides(color: string) {
    const group = new THREE.Group()
    const normal = arrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 5, color, 0.85, 0.38)
    for (const material of [normal.line.material, normal.cone.material]) {
      material.transparent = true
      material.opacity = 0.58
      material.depthTest = true
      material.depthWrite = false
    }
    normal.line.renderOrder = normal.cone.renderOrder = 4
    const normalName = label('地表法线', color, 1.8)
    const rayName = label('观测连线', color, 1.8)
    normalName.material.opacity = rayName.material.opacity = 0.7
    normalName.material.alphaTest = rayName.material.alphaTest = 0.02
    normalName.renderOrder = rayName.renderOrder = 6
    const ray = new THREE.Line(keepGeometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])), keepMaterial(new THREE.LineDashedMaterial({ color, dashSize: 0.65, gapSize: 0.38, transparent: true, opacity: 0.44, depthTest: true, depthWrite: false })))
    ray.renderOrder = 3
    const tangent = new THREE.Group()
    const disk = new THREE.Mesh(keepGeometry(new THREE.CircleGeometry(TANGENT_RADIUS, 64)), keepMaterial(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.06, depthTest: true, depthWrite: false })))
    disk.rotation.x = -Math.PI / 2
    tangent.add(disk,
      line(Array.from({ length: 96 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2) * TANGENT_RADIUS, 0, Math.sin(i / 96 * Math.PI * 2) * TANGENT_RADIUS)), color, 0.34, true),
      line([new THREE.Vector3(-TANGENT_RADIUS, 0, 0), new THREE.Vector3(TANGENT_RADIUS, 0, 0)], color, 0.2),
      line([new THREE.Vector3(0, 0, -TANGENT_RADIUS), new THREE.Vector3(0, 0, TANGENT_RADIUS)], color, 0.2))
    const localMark = new THREE.Group()
    const ring = new THREE.Mesh(keepGeometry(new THREE.RingGeometry(0.16, 0.23, 40)), keepMaterial(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.58, depthTest: true, depthWrite: false })))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.025
    const ripples = createRipples(color, 0.8)
    localMark.add(ring, ripples.group, line([new THREE.Vector3(), new THREE.Vector3(0, 0.52, 0)], color, 0.58))
    group.add(normal, normalName, ray, rayName, tangent, localMark)
    return { group, normal, normalName, ray, rayName, tangent, localMark, ripples, color }
  }
  const stationRecords = new Map<string, {
    group: THREE.Group
    dot: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>
    label: THREE.Sprite
    guides: ReturnType<typeof createStationGuides>
    station: SceneStation
  }>()
  let activeGuideColor = ''
  function disposeStationGroup(group: THREE.Group) {
    stationGroup.remove(group)
    const retiredGeometries = new Set<THREE.BufferGeometry>()
    const retiredMaterials = new Set<THREE.Material>()
    group.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite)) return
      if (object instanceof THREE.Sprite) spaceLabels.delete(object)
      if (!(object instanceof THREE.Sprite) && object.geometry !== stationDotGeometry && object.geometry !== rippleGeometry) retiredGeometries.add(object.geometry)
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
      objectMaterials.forEach(material => retiredMaterials.add(material))
    })
    retiredGeometries.forEach(geometry => { geometry.dispose(); geometries.delete(geometry) })
    retiredMaterials.forEach(material => {
      if (material instanceof THREE.SpriteMaterial && material.map) {
        material.map.dispose()
        textures.delete(material.map)
      }
      material.dispose()
      materials.delete(material)
    })
    group.clear()
  }
  function stationColor(station: SceneStation) {
    if (station.color && /^#[0-9a-fA-F]{6}$/.test(station.color)) return station.color
    let hash = 0
    for (const character of station.id) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0
    return stationColors[hash % stationColors.length]!
  }
  function updateStations() {
    const stations = state.stations ?? []
    const retainedIds = new Set(stations.map(station => station.id))
    for (const [id, record] of stationRecords) {
      if (retainedIds.has(id)) continue
      rippleSets.delete(record.guides.ripples)
      disposeStationGroup(record.group)
      stationRecords.delete(id)
    }
    for (const station of stations) {
      const color = stationColor(station)
      let record = stationRecords.get(station.id)
      if (!record) {
        const dot = new THREE.Mesh(stationDotGeometry, keepMaterial(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthTest: true, depthWrite: false })))
        dot.renderOrder = 5
        dot.userData.stationId = station.id
        const stationLabel = label(station.name, color, 1.8)
        stationLabel.material.alphaTest = 0.02
        stationLabel.renderOrder = 6
        const guides = createStationGuides(color)
        const group = new THREE.Group()
        group.add(dot, stationLabel, guides.group)
        record = { group, dot, label: stationLabel, guides, station }
        stationRecords.set(station.id, record)
        stationGroup.add(group)
      }
      record.station = station
      record.dot.material.color.set(color)
      updateLabel(record.label, station.name, color)
      const local = getObservation({ ...state, latitude: station.latitude, longitude: station.longitude })
      const up = new THREE.Vector3(local.up.x, local.up.y, local.up.z)
      const east = new THREE.Vector3(local.east.x, local.east.y, local.east.z)
      const anchor = up.clone().multiplyScalar(EARTH_RADIUS * 1.008)
      record.dot.position.copy(anchor).addScaledVector(up, 0.28)
      record.label.position.copy(up).multiplyScalar(EARTH_RADIUS + 0.48)
      record.label.position.addScaledVector(east, 2.45)
      record.dot.visible = record.label.visible = station.id !== state.activeStationId
      record.guides.group.visible = station.id !== state.activeStationId
      record.guides.normal.position.copy(anchor)
      record.guides.normal.setDirection(up)
      record.guides.normalName.position.copy(anchor).addScaledVector(up, 5.8)
      record.guides.rayName.position.copy(anchor).lerp(moon.position, 0.58).addScaledVector(up, 1.35)
      record.guides.tangent.position.copy(anchor).addScaledVector(up, 0.035)
      record.guides.tangent.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
      record.guides.localMark.position.copy(anchor)
      record.guides.localMark.quaternion.copy(record.guides.tangent.quaternion)
      const rayPositions = record.guides.ray.geometry.getAttribute('position') as THREE.BufferAttribute
      rayPositions.setXYZ(0, anchor.x, anchor.y, anchor.z)
      rayPositions.setXYZ(1, moon.position.x, moon.position.y, moon.position.z)
      rayPositions.needsUpdate = true
      record.guides.ray.computeLineDistances()
      record.guides.ray.geometry.computeBoundingSphere()
      if (record.guides.color !== color) {
        record.guides.color = color
        record.guides.normal.setColor(color)
        record.guides.group.traverse(object => {
          if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return
          const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of objectMaterials) if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.LineBasicMaterial) material.color.set(color)
        })
        updateLabel(record.guides.normalName, '地表法线', color)
        updateLabel(record.guides.rayName, '观测连线', color)
      }
    }
    const active = stations.find(station => station.id === state.activeStationId)
    const activeColor = active ? stationColor(active) : '#7af5d8'
    markerDot.material.color.set(activeColor)
    markerRing.material.color.set(activeColor)
    updateLabel(observerLabel, active?.name ?? '观测点', activeColor)
    updateLabel(observerBackLabel, `${active?.name ?? '观测点'}（背面）`, activeColor)
    if (activeGuideColor !== activeColor) {
      activeGuideColor = activeColor
      normalArrow.setColor(activeColor)
      sightlineMaterial.color.set(activeColor)
      for (const group of [observerMarker, tangentPatch]) group.traverse(object => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of objectMaterials) if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.LineBasicMaterial) material.color.set(activeColor)
      })
      updateLabel(normalLabel, '地表法线', activeColor)
      updateLabel(sightlineLabel, '观测连线', activeColor)
    }
  }

  // Space annotation sprites discard their transparent padding and test against
  // Earth/Moon depth. The independent local-sky cardinal labels are untouched.
  spaceGuides.traverse(object => {
    if (object instanceof THREE.Sprite) {
      object.material.depthTest = true
      object.material.depthWrite = false
      object.material.alphaTest = 0.02
    }
  })

  // A deterministic fallback remains visible when the large galaxy map is
  // unavailable. Positions are shared so both views have the same stars.
  let seed = 1857
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const starPositions = new Float32Array(2100 * 3)
  const starColors = new Float32Array(2100 * 3)
  for (let i = 0; i < 2100; i++) {
    const z = random() * 2 - 1
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(1 - z * z)
    starPositions.set([Math.cos(angle) * radius * 1000, z * 1000, Math.sin(angle) * radius * 1000], i * 3)
    const brightness = 0.22 + Math.pow(random(), 3) * 0.64
    starColors.set([brightness * (0.83 + random() * 0.17), brightness * (0.88 + random() * 0.12), brightness], i * 3)
  }
  const starGeometry = keepGeometry(new THREE.BufferGeometry())
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
  const starMaterial = keepMaterial(new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.78, depthWrite: false, toneMapped: false }))
  const localStarMaterial = keepMaterial(starMaterial.clone())
  localStarMaterial.size = 1
  const stars = new THREE.Points(starGeometry, starMaterial)
  const localStarGeometry = keepGeometry(starGeometry.clone())
  localStarGeometry.setDrawRange(0, 800)
  const localStars = new THREE.Points(localStarGeometry, localStarMaterial)
  stars.frustumCulled = localStars.frustumCulled = false
  stars.renderOrder = localStars.renderOrder = -900
  space.add(stars)
  groundScene.add(localStars)

  const skyGeometry = keepGeometry(new THREE.SphereGeometry(1200, 96, 64))
  const emptySky = solidTexture('#000000')
  function skyMaterial(local: boolean) {
    return keepMaterial(new THREE.ShaderMaterial({
      uniforms: { skyMap: { value: emptySky }, texelSize: { value: new THREE.Vector2(1 / 6000, 1 / 3000) }, exposure: { value: 0.14 }, hasMap: { value: 0 }, localSky: { value: local ? 1 : 0 }, daylight: { value: 0 }, twilight: { value: 0 }, moonCenter: { value: new THREE.Vector2() }, moonRadius: { value: 0 }, viewportSize: { value: new THREE.Vector2(1, 1) }, moonVisible: { value: 0 } },
      side: THREE.BackSide, depthTest: false, depthWrite: false, toneMapped: true,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vDirection;
        void main() {
          vUv = uv;
          vDirection = normalize(mat3(modelMatrix) * position);
          gl_Position = projectionMatrix * mat4(mat3(viewMatrix)) * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D skyMap;
        uniform vec2 texelSize;
        uniform float exposure;
        uniform float hasMap;
        uniform float localSky;
        uniform float daylight;
        uniform float twilight;
        uniform vec2 moonCenter;
        uniform float moonRadius;
        uniform vec2 viewportSize;
        uniform float moonVisible;
        varying vec2 vUv;
        varying vec3 vDirection;
        void main() {
          vec2 uv = vec2(1.0 - vUv.x, vUv.y);
          vec3 center = texture2D(skyMap, uv).rgb;
          vec3 neighbors = (texture2D(skyMap, uv + vec2(texelSize.x, 0.0)).rgb + texture2D(skyMap, uv - vec2(texelSize.x, 0.0)).rgb + texture2D(skyMap, uv + vec2(0.0, texelSize.y)).rgb + texture2D(skyMap, uv - vec2(0.0, texelSize.y)).rgb) * 0.25;
          vec2 moonOffset = gl_FragCoord.xy / viewportSize * 2.0 - 1.0 - moonCenter;
          moonOffset.x *= viewportSize.x / viewportSize.y;
          float discDistance = length(moonOffset);
          float edgeWidth = max(fwidth(discDistance), 0.000001);
          float moonDisk = (1.0 - smoothstep(moonRadius - edgeWidth, moonRadius + edgeWidth, discDistance)) * moonVisible * localSky;
          // The photographic galaxy is painted before the depth-only Moon.
          // Remove its stars/nebula behind the disk while retaining local air.
          vec3 color = vec3(0.0012, 0.0022, 0.0048) + max(center + (center - neighbors) * 1.65, 0.0) * exposure * hasMap * (1.0 - moonDisk);
          float horizon = pow(1.0 - max(normalize(vDirection).y, 0.0), 4.0);
          vec3 air = mix(vec3(0.025, 0.10, 0.24), vec3(0.22, 0.30, 0.40), horizon);
          color = color * (1.0 - daylight * 0.99 * localSky) + localSky * (air * daylight + vec3(0.036, 0.028, 0.046) * twilight * horizon + vec3(0.002, 0.006, 0.009) * horizon);
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }))
  }
  const galaxyMaterial = skyMaterial(false)
  const localGalaxyMaterial = skyMaterial(true)
  localGalaxyMaterial.uniforms.exposure!.value = 0.09
  const galaxy = new THREE.Mesh(skyGeometry, galaxyMaterial)
  const localGalaxy = new THREE.Mesh(skyGeometry, localGalaxyMaterial)
  galaxy.rotation.x = -0.4
  galaxy.frustumCulled = localGalaxy.frustumCulled = false
  galaxy.renderOrder = localGalaxy.renderOrder = -1000
  space.add(galaxy)
  groundScene.add(localGalaxy)
  loadTexture('milky-way-6k.jpg', texture => {
    texture.generateMipmaps = false
    texture.minFilter = THREE.LinearFilter
    const img = texture.image as HTMLImageElement
    for (const material of [galaxyMaterial, localGalaxyMaterial]) {
      material.uniforms.skyMap!.value = texture
      material.uniforms.hasMap!.value = 1
      material.uniforms.texelSize!.value.set(1 / Math.max(img.width, 1), 1 / Math.max(img.height, 1))
    }
    starMaterial.opacity = 0.3
  })

  const groundMaterial = keepMaterial(new THREE.ShaderMaterial({
    uniforms: { daylight: { value: 0 }, twilight: { value: 0 }, moonlight: { value: 0 } },
    vertexShader: `varying vec3 vWorldPosition; void main() { vec4 p = modelMatrix * vec4(position, 1.0); vWorldPosition = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
    fragmentShader: `
      varying vec3 vWorldPosition;
      uniform float daylight;
      uniform float twilight;
      uniform float moonlight;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        float distanceFromEye = length(vWorldPosition.xz);
        vec2 p = vWorldPosition.xz;
        float patches = noise(p * 0.023) * 0.58 + noise(p * 0.079) * 0.28 + noise(p * 0.27) * 0.14;
        float nearDetail = 1.0 - smoothstep(15.0, 110.0, distanceFromEye);
        float fineGrass = noise(p * vec2(5.0, 1.2)) * nearDetail;
        vec3 dayMeadow = mix(vec3(0.034, 0.056, 0.023), vec3(0.092, 0.126, 0.055), patches);
        dayMeadow *= 0.89 + fineGrass * 0.22;
        vec3 nightMeadow = mix(vec3(0.0023, 0.0046, 0.0042), vec3(0.0054, 0.0095, 0.0082), patches);
        nightMeadow += vec3(0.013, 0.018, 0.020) * moonlight * (0.72 + patches * 0.4);
        vec3 meadow = mix(nightMeadow, dayMeadow, daylight);
        float distanceHaze = smoothstep(65.0, 1050.0, distanceFromEye);
        vec3 haze = mix(vec3(0.005, 0.011, 0.017), vec3(0.18, 0.24, 0.255), daylight);
        haze += vec3(0.023, 0.016, 0.015) * twilight;
        haze += vec3(0.005, 0.006, 0.01) * moonlight;
        // Soft bands of distant meadow disappear into air without raising the
        // flat geometric horizon or covering a Moon just above it.
        float distantFields = sin(distanceFromEye * 0.014 + noise(p * 0.006) * 2.3) * 0.035;
        meadow *= 1.0 + distantFields * smoothstep(30.0, 200.0, distanceFromEye);
        gl_FragColor = vec4(mix(meadow, haze, distanceHaze * 0.88), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }))
  const ground = new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(7000, 7000)), groundMaterial)
  ground.rotation.x = -Math.PI / 2
  groundScene.add(ground)

  // Several thousand tapered blades share one buffer and one draw call. All
  // stay below eye height, preserving the lesson's level horizon geometry.
  const grassPositions: number[] = []
  const grassColors: number[] = []
  for (let i = 0; i < 4200; i++) {
    const angle = random() * Math.PI * 2
    const radius = 2.6 + Math.pow(random(), 0.72) * 108
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const bladeHeight = 0.09 + random() * 0.31
    const bladeWidth = 0.024 + random() * 0.048
    const bladeAngle = random() * Math.PI
    const dx = Math.cos(bladeAngle) * bladeWidth
    const dz = Math.sin(bladeAngle) * bladeWidth
    grassPositions.push(x - dx, 0.006, z - dz, x + dx, 0.006, z + dz, x + dx * 1.7, bladeHeight, z + dz * 1.7)
    const shade = 0.65 + random() * 0.6
    for (let vertex = 0; vertex < 3; vertex++) grassColors.push(0.08 * shade, 0.12 * shade, 0.047 * shade)
  }
  const grassGeometry = keepGeometry(new THREE.BufferGeometry())
  grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3))
  grassGeometry.setAttribute('color', new THREE.Float32BufferAttribute(grassColors, 3))
  const grassMaterial = keepMaterial(new THREE.ShaderMaterial({
    uniforms: { daylight: groundMaterial.uniforms.daylight!, moonlight: groundMaterial.uniforms.moonlight! },
    side: THREE.DoubleSide, vertexColors: true,
    vertexShader: `
      varying vec3 vGrassColor;
      varying float vDistance;
      varying float vHeight;
      void main() {
        vGrassColor = color;
        vDistance = length(position.xz);
        vHeight = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float daylight;
      uniform float moonlight;
      varying vec3 vGrassColor;
      varying float vDistance;
      varying float vHeight;
      void main() {
        vec3 grass = mix(vGrassColor * vec3(0.043, 0.058, 0.088), vGrassColor, daylight);
        grass += vGrassColor * vec3(0.14, 0.16, 0.24) * moonlight;
        grass *= 0.68 + min(vHeight, 0.4) * 0.8;
        vec3 air = mix(vec3(0.004, 0.008, 0.012), vec3(0.11, 0.155, 0.13), daylight);
        gl_FragColor = vec4(mix(grass, air, smoothstep(45.0, 125.0, vDistance) * 0.22), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }))
  groundScene.add(new THREE.Mesh(grassGeometry, grassMaterial))

  ;['北 N', '东 E', '南 S', '西 W'].forEach((name, i) => {
    const bearing = i * Math.PI / 2
    const mark = label(name, '#9daeb5', 8, false)
    mark.position.set(Math.sin(bearing) * 180, 6.7, -Math.cos(bearing) * 180)
    localGuides.add(mark)
  })

  const worldToLocal = new THREE.Matrix4()
  const worldToLocalQuaternion = new THREE.Quaternion()
  const earthFrameMatrix = new THREE.Matrix4()
  const earthFrameQuaternion = new THREE.Quaternion()
  const dailyRotation = new THREE.Quaternion()
  const skyTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.4)
  let observation = getObservation(state)
  const asVector = (value: { x: number; y: number; z: number }) => new THREE.Vector3(value.x, value.y, value.z)

  function updateObserverCamera() {
    heading = ((heading % 360) + 360) % 360
    pitch = THREE.MathUtils.clamp(pitch, surfaceView ? -89.8 : -80, surfaceView ? 89.8 : 85)
    const p = pitch * RAD
    const h = heading * RAD
    if (surfaceView) {
      const up = asVector(observation.up)
      const viewDirection = asVector(observation.east).multiplyScalar(Math.sin(h) * Math.cos(p))
        .addScaledVector(asVector(observation.north), Math.cos(h) * Math.cos(p))
        .addScaledVector(up, Math.sin(p))
      orbitCamera.position.copy(up).multiplyScalar(EARTH_RADIUS + SURFACE_EYE_HEIGHT)
      orbitCamera.up.copy(up)
      orbitCamera.lookAt(viewDirection.add(orbitCamera.position))
    } else {
      observerCamera.lookAt(Math.sin(h) * Math.cos(p), EYE_HEIGHT + Math.sin(p), -Math.cos(h) * Math.cos(p))
    }
    callbacks.onViewChange?.(heading, pitch)
  }

  function applyGeometry() {
    const phase = state.phase * RAD
    moon.position.set(Math.cos(phase) * ORBIT_RADIUS, 0, -Math.sin(phase) * ORBIT_RADIUS)
    moon.rotation.y = phase
    followFocusedBody()
    moonLabel.position.copy(moon.position).add(new THREE.Vector3(0, 3, 0))
    const rayAttribute = moonRay.geometry.getAttribute('position') as THREE.BufferAttribute
    rayAttribute.setXYZ(1, moon.position.x, 0, moon.position.z)
    rayAttribute.needsUpdate = true
    moonRay.geometry.computeBoundingSphere()
    // The same seasonal basis drives the texture, axis, markers and inverse
    // geographic picking. The Moon remains in the shared ecliptic XZ plane.
    const earthFrame = getEarthFrame(state.dayOfYear)
    earthFrameMatrix.makeBasis(asVector(earthFrame.equatorialNoon), asVector(earthFrame.axis), asVector(earthFrame.equatorialZ))
    earthFrameQuaternion.setFromRotationMatrix(earthFrameMatrix)
    dailyRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (state.utcHour - 12) * 15 * RAD)
    earth.quaternion.copy(earthFrameQuaternion).multiply(dailyRotation)
    equator.quaternion.copy(earthFrameQuaternion)
    axis.quaternion.copy(earthFrameQuaternion)
    observation = getObservation(state)
    const up = asVector(observation.up)
    const east = asVector(observation.east)
    const north = asVector(observation.north)
    observerMarker.position.copy(up).multiplyScalar(EARTH_RADIUS * 1.008)
    observerMarker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up)
    tangentPatch.position.copy(observerMarker.position).addScaledVector(up, 0.035)
    tangentPatch.quaternion.copy(observerMarker.quaternion)
    normalArrow.position.copy(observerMarker.position)
    normalArrow.setDirection(up)
    const observerLabelPosition = observerMarker.position.clone().addScaledVector(east, 3.2).addScaledVector(up, 0.35)
    observerLabel.position.copy(observerLabelPosition)
    observerBackLabel.position.copy(observerLabelPosition)
    normalLabel.position.copy(observerMarker.position).addScaledVector(up, 5.8)
    const sightAttribute = sightline.geometry.getAttribute('position') as THREE.BufferAttribute
    sightAttribute.setXYZ(0, observerMarker.position.x, observerMarker.position.y, observerMarker.position.z)
    sightAttribute.setXYZ(1, moon.position.x, moon.position.y, moon.position.z)
    sightAttribute.needsUpdate = true
    sightline.computeLineDistances()
    sightline.geometry.computeBoundingSphere()
    sightlineLabel.position.copy(observerMarker.position).lerp(moon.position, 0.58).addScaledVector(up, 1.35)
    worldToLocal.set(east.x, east.y, east.z, 0, up.x, up.y, up.z, 0, -north.x, -north.y, -north.z, 0, 0, 0, 0, 1)
    worldToLocalQuaternion.setFromRotationMatrix(worldToLocal)
    const moonDirection = asVector(observation.moonDirection).applyMatrix4(worldToLocal).normalize()
    localMoon.position.copy(moonDirection).multiplyScalar(SKY_MOON_DISTANCE)
    localMoon.position.y += EYE_HEIGHT
    localMoon.quaternion.copy(worldToLocalQuaternion).multiply(moon.quaternion)
    localMoonOccluder.position.copy(localMoon.position)
    localMoonOccluder.quaternion.copy(localMoon.quaternion)
    moonGlow.position.copy(localMoon.position)
    // The enlarged teaching disk must not peek above the horizon when its
    // physical center is below it; share the same criterion as the local UI.
    localMoon.visible = localMoonOccluder.visible = moonGlow.visible = observation.aboveHorizon
    localGalaxyMaterial.uniforms.moonVisible!.value = observation.aboveHorizon ? 1 : 0
    const localSunDirection = asVector(observation.sunDirection).applyMatrix4(worldToLocal).normalize()
    localMoonMaterial.uniforms.sunDirection!.value.copy(localSunDirection)
    localSunlight.position.copy(localSunDirection).multiplyScalar(1000)
    localSunlight.target.position.copy(localMoon.position)
    // Use a parallel light direction at the moon, independent of its sky position.
    localSunlight.position.add(localMoon.position)
    localGalaxy.quaternion.copy(worldToLocalQuaternion).multiply(skyTilt)
    localStars.quaternion.copy(worldToLocalQuaternion)
    const daylight = THREE.MathUtils.smoothstep(observation.sunAltitude, -8, 12)
    const twilight = (1 - Math.abs(THREE.MathUtils.clamp(observation.sunAltitude, -14, 14)) / 14)
    localGalaxyMaterial.uniforms.daylight!.value = daylight
    localGalaxyMaterial.uniforms.twilight!.value = twilight
    localMoonMaterial.uniforms.daylight!.value = daylight
    groundMaterial.uniforms.daylight!.value = daylight
    groundMaterial.uniforms.twilight!.value = twilight
    const litFraction = (1 - Math.cos(state.phase * RAD)) * 0.5
    groundMaterial.uniforms.moonlight!.value = observation.aboveHorizon
      ? Math.pow(litFraction, 1.2) * Math.sqrt(Math.max(Math.sin(observation.altitude * RAD), 0)) * (1 - daylight)
      : 0
    localStarMaterial.opacity = (1 - daylight) * 0.3
    spaceGuides.visible = state.showGuides && !surfaceView && !flight
    localGuides.visible = state.showGuides
    updateStations()
    if (surfaceView) updateObserverCamera()
  }

  const discCameraUp = new THREE.Vector3()
  const discTowardEye = new THREE.Vector3()
  const discRight = new THREE.Vector3()
  const discUp = new THREE.Vector3()
  const discProjected = new THREE.Vector3()
  const discViewPosition = new THREE.Vector3()
  const textureRotationMatrix = new THREE.Matrix4()
  function updateLocalMoonProjection() {
    observerCamera.updateMatrixWorld()
    discTowardEye.copy(observerCamera.position).sub(localMoon.position).normalize()
    discCameraUp.setFromMatrixColumn(observerCamera.matrixWorld, 1)
    discRight.crossVectors(discCameraUp, discTowardEye)
    if (discRight.lengthSq() < 1e-8) discRight.setFromMatrixColumn(observerCamera.matrixWorld, 0)
    discRight.normalize()
    discUp.crossVectors(discTowardEye, discRight).normalize()
    localMoonMaterial.uniforms.discRight!.value.copy(discRight)
    localMoonMaterial.uniforms.discUp!.value.copy(discUp)
    localMoonMaterial.uniforms.towardEye!.value.copy(discTowardEye)
    textureRotationMatrix.makeRotationFromQuaternion(localMoon.quaternion)
    localMoonMaterial.uniforms.textureRotation!.value.setFromMatrix4(textureRotationMatrix).transpose()
    discProjected.copy(localMoon.position).project(observerCamera)
    discViewPosition.copy(localMoon.position).applyMatrix4(observerCamera.matrixWorldInverse)
    const radius = localMoon.scale.x
    const projectedRadius = radius / Math.sqrt(Math.max(discViewPosition.lengthSq() - radius * radius, 0.001)) * observerCamera.projectionMatrix.elements[5]!
    localGalaxyMaterial.uniforms.moonCenter!.value.set(discProjected.x, discProjected.y)
    localGalaxyMaterial.uniforms.moonRadius!.value = projectedRadius
    localGalaxyMaterial.uniforms.viewportSize!.value.set(canvas.width, canvas.height)
    // A projected point behind the camera must never erase the opposite sky.
    localGalaxyMaterial.uniforms.moonVisible!.value = observation.aboveHorizon && discViewPosition.z < 0 ? 1 : 0
  }

  // ResizeObserver only queues the latest dimensions. Resizing a WebGL canvas
  // clears its drawing buffer, so allocation and rendering must happen together
  // in one animation frame instead of exposing an empty buffer between frames.
  function resize() {
    if (disposed) return
    const width = container.clientWidth
    const height = container.clientHeight
    hasSize = width > 0 && height > 0
    if (!hasSize) { visibilityChange(); return }
    resizePending = true
    visibilityChange()
  }

  function applyPendingResize() {
    if (!resizePending) return
    resizePending = false
    const width = container.clientWidth
    const height = container.clientHeight
    hasSize = width > 0 && height > 0
    // Preserve the previous drawing buffer through transient zero-size layouts.
    if (!hasSize) return
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    if (width === drawnWidth && height === drawnHeight && pixelRatio === drawnPixelRatio) return
    drawnWidth = width
    drawnHeight = height
    drawnPixelRatio = pixelRatio
    renderer.setDrawingBufferSize(width, height, pixelRatio)
    orbitCamera.aspect = observerCamera.aspect = width / height
    // Preserve a useful horizontal field of view on portrait displays so the
    // orbit remains inside the stage instead of being cropped at both sides.
    if (!surfaceView && !flight && !bodyFlight) orbitCamera.fov = overviewFov()
    orbitCamera.clearViewOffset()
    orbitCamera.updateProjectionMatrix()
    observerCamera.clearViewOffset()
    observerCamera.updateProjectionMatrix()
  }

  function overviewFov() {
    return 2 * Math.atan(Math.tan(23 * RAD) / Math.min(1, orbitCamera.aspect)) / RAD
  }

  function synchronizeControls() {
    controls.enabled = !isLocalControl() && !flight && !bodyFlight
    controls.enableRotate = controls.enabled
    canvas.style.cursor = isLocalControl() ? 'grab' : flight || bodyFlight ? 'progress' : 'default'
  }

  function leaveSurfaceView() {
    const wasActive = surfaceView
    surfaceView = false
    flight = null
    bodyFlight = null
    setMoonFollow(false)
    orbitCamera.near = 0.1
    orbitCamera.fov = overviewFov()
    orbitCamera.updateProjectionMatrix()
    activePointer = null
    synchronizeControls()
    spaceGuides.visible = state.showGuides
    atmosphere.visible = true
    if (wasActive) callbacks.onSurfaceViewChange?.(false)
  }

  function setLocalViewDefault() {
    heading = observation.azimuth
    pitch = Math.max(20, observation.altitude - 38)
    observerCamera.fov = 92
    observerCamera.updateProjectionMatrix()
    updateObserverCamera()
  }

  function defaultSurfaceAim() {
    const up = asVector(observation.up)
    const east = asVector(observation.east)
    const north = asVector(observation.north)
    const direction = moon.position.clone().addScaledVector(up, -(EARTH_RADIUS + SURFACE_EYE_HEIGHT)).normalize()
    const eastward = direction.dot(east)
    const northward = direction.dot(north)
    const azimuth = Math.hypot(eastward, northward) < 1e-8 ? observation.azimuth : Math.atan2(eastward, northward) / RAD
    const visualAltitude = Math.asin(THREE.MathUtils.clamp(direction.dot(up), -1, 1)) / RAD
    // The initial view remains useful when the Moon is below either the actual
    // local horizon or the illustrative globe's horizon. Free dragging is unchanged.
    const altitude = !observation.aboveHorizon || visualAltitude < 0 ? 3 : Math.min(visualAltitude, 89.8)
    const viewDirection = east.multiplyScalar(Math.sin(azimuth * RAD) * Math.cos(altitude * RAD))
      .addScaledVector(north, Math.cos(azimuth * RAD) * Math.cos(altitude * RAD))
      .addScaledVector(up, Math.sin(altitude * RAD))
    return { azimuth, altitude, viewDirection }
  }

  function aimSurfaceCameraAtMoon() {
    const aim = defaultSurfaceAim()
    heading = aim.azimuth
    pitch = aim.altitude
    updateObserverCamera()
  }

  function resetView() {
    if (disposed) return
    cancelSkyTurn()
    leaveSurfaceView()
    focusedBody = 'earth'
    controls.minDistance = 22
    if (state.mode === 'observer') { setLocalViewDefault(); setMoonFollowing(true); return }
    // Consume any remaining damping before placing a preset camera. Otherwise
    // a reset immediately after a drag can keep rotating the new view.
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = true
    controls.target.set(0, 0, 0)
    orbitCamera.up.set(0, 1, 0)
    controls.minPolarAngle = 0.02
    controls.maxPolarAngle = Math.PI - 0.02
    orbitCamera.position.set(0, 33, 55)
    controls.update()
  }

  /** Rotate an orbital overview toward the selected surface point. */
  function focusObserver() {
    if (disposed || state.mode !== 'orbit') return
    leaveSurfaceView()
    focusedBody = 'earth'
    controls.minDistance = 22
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = true
    controls.target.set(0, 0, 0)
    orbitCamera.up.set(0, 1, 0)
    // Keep a little obliqueness so the normal's length and tangent plane remain
    // readable instead of collapsing into a head-on dot at the chosen point.
    orbitCamera.position.copy(asVector(observation.up)).multiplyScalar(0.88)
      .addScaledVector(asVector(observation.east), 0.42)
      .addScaledVector(asVector(observation.north), 0.2).normalize().multiplyScalar(62)
    controls.update()
  }

  // Clearing OrbitControls inertia must not move an in-progress preset camera.
  function clearOrbitMomentum() {
    const position = orbitCamera.position.clone()
    const rotation = orbitCamera.quaternion.clone()
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = true
    orbitCamera.position.copy(position)
    orbitCamera.quaternion.copy(rotation)
  }

  /** Smoothly center the original space camera on Earth or the moving Moon. */
  function focusBody(body: 'earth' | 'moon') {
    if (disposed || state.mode !== 'orbit') return
    clearOrbitMomentum()
    const startPosition = orbitCamera.position.clone()
    const startRotation = orbitCamera.quaternion.clone()
    const startUp = orbitCamera.up.clone()
    const startFov = orbitCamera.fov
    const startTarget = surfaceView || flight
      ? orbitCamera.getWorldDirection(new THREE.Vector3()).multiplyScalar(12).add(startPosition)
      : controls.target.clone()
    const direction = startPosition.clone().sub(startTarget)
    if (direction.lengthSq() < 1e-8) direction.set(0, 0.52, 0.85)
    direction.normalize()
    // A tiny pole offset lets OrbitControls take over without an endpoint snap.
    if (Math.abs(direction.y) > Math.cos(0.02)) direction.set(0.025, Math.sign(direction.y), 0).normalize()
    leaveSurfaceView()
    focusedBody = body
    pickCandidate = null
    orbitPointers.clear()
    bodyFlight = { elapsed: 0, body, startPosition, startTarget, startRotation, startUp, startFov, endOffset: direction.multiplyScalar(body === 'earth' ? 62 : 14) }
    orbitCamera.near = 0.002
    orbitCamera.fov = startFov
    orbitCamera.updateProjectionMatrix()
    synchronizeControls()
    visibilityChange()
  }

  const followedOffset = new THREE.Vector3()
  function followFocusedBody() {
    if (focusedBody !== 'moon' || isLocalControl() || flight || bodyFlight) return
    // Translate both ends of the view together: phase playback must preserve
    // the distance, zoom, and orbit angle the user chose around the Moon.
    followedOffset.copy(moon.position).sub(controls.target)
    orbitCamera.position.add(followedOffset)
    controls.target.copy(moon.position)
  }

  const earthClearanceDirection = new THREE.Vector3()
  function keepOrbitCameraOutsideEarth() {
    if (focusedBody !== 'moon') return
    const clearance = EARTH_RADIUS + 0.35
    if (orbitCamera.position.lengthSq() >= clearance * clearance) return
    earthClearanceDirection.copy(orbitCamera.position)
    if (earthClearanceDirection.lengthSq() < 1e-8) earthClearanceDirection.copy(moon.position)
    orbitCamera.position.copy(earthClearanceDirection).normalize().multiplyScalar(clearance)
    orbitCamera.lookAt(controls.target)
  }

  const bodyCenter = new THREE.Vector3()
  const bodyDestination = new THREE.Vector3()
  const bodyStartDirection = new THREE.Vector3()
  const bodyEndDirection = new THREE.Vector3()
  const bodyArc = new THREE.Quaternion()
  const bodyRotation = new THREE.Quaternion()
  const bodyUpRotation = new THREE.Quaternion()
  const bodyLookMatrix = new THREE.Matrix4()
  function advanceBodyFlight(delta: number) {
    if (!bodyFlight) return
    bodyFlight.elapsed += delta
    const progress = reducedMotion ? 1 : Math.min(bodyFlight.elapsed / 1100, 1)
    const travel = ease(progress)
    bodyCenter.copy(bodyFlight.body === 'moon' ? moon.position : earth.position)
    bodyDestination.copy(bodyCenter).add(bodyFlight.endOffset)
    bodyStartDirection.copy(bodyFlight.startPosition).normalize()
    bodyEndDirection.copy(bodyDestination).normalize()
    if (bodyStartDirection.lengthSq() < 1e-8) bodyStartDirection.copy(bodyEndDirection)
    bodyArc.setFromUnitVectors(bodyStartDirection, bodyEndDirection)
    bodyRotation.identity().slerp(bodyArc, travel)
    const radius = THREE.MathUtils.lerp(bodyFlight.startPosition.length(), bodyDestination.length(), travel)
    // Follow an arc outside the globe, including when leaving a far-side station.
    orbitCamera.position.copy(bodyStartDirection).applyQuaternion(bodyRotation).multiplyScalar(Math.max(radius, EARTH_RADIUS + SURFACE_EYE_HEIGHT))
    controls.target.copy(bodyFlight.startTarget).lerp(bodyCenter, travel)
    bodyUpRotation.setFromUnitVectors(bodyFlight.startUp, new THREE.Vector3(0, 1, 0))
    bodyRotation.identity().slerp(bodyUpRotation, travel)
    orbitCamera.up.copy(bodyFlight.startUp).applyQuaternion(bodyRotation)
    bodyLookMatrix.lookAt(orbitCamera.position, controls.target, orbitCamera.up)
    bodyRotation.setFromRotationMatrix(bodyLookMatrix)
    orbitCamera.quaternion.copy(bodyFlight.startRotation).slerp(bodyRotation, travel)
    orbitCamera.fov = THREE.MathUtils.lerp(bodyFlight.startFov, overviewFov(), travel)
    orbitCamera.updateProjectionMatrix()
    spaceGuides.visible = state.showGuides && radius > EARTH_RADIUS * 1.2
    atmosphere.visible = radius > EARTH_RADIUS * 1.07
    if (progress >= 1) {
      orbitCamera.position.copy(bodyDestination)
      orbitCamera.up.set(0, 1, 0)
      controls.target.copy(bodyCenter)
      controls.minDistance = bodyFlight.body === 'moon' ? 4 : 22
      bodyFlight = null
      orbitCamera.near = 0.1
      orbitCamera.updateProjectionMatrix()
      controls.update()
      synchronizeControls()
      spaceGuides.visible = state.showGuides
      atmosphere.visible = true
    }
  }

  /** Move the original orbital camera onto the original Earth. The original
   * Moon stays in the same space scene and is occluded by Earth geometrically. */
  function flyToObserver() {
    if (disposed || state.mode !== 'orbit' || flight) return
    // A changed station starts its transfer in update(), before the surface
    // camera can attach to the new point. Re-selecting this same point just aims.
    if (surfaceView) { setMoonFollow(true); aimSurfaceCameraAtMoon(); return }
    beginObserverFlight(false)
  }

  function beginObserverFlight(transfer: boolean) {
    clearOrbitMomentum()
    const wasSurface = surfaceView
    surfaceView = false
    bodyFlight = null
    focusedBody = 'earth'
    activePointer = null
    flight = {
      elapsed: 0,
      startDirection: orbitCamera.position.clone().normalize(),
      startRadius: Math.max(orbitCamera.position.length(), EARTH_RADIUS + SURFACE_EYE_HEIGHT),
      startFov: orbitCamera.fov,
      approachDuration: transfer ? 2200 : 1650,
      // Lift transfers above the globe instead of skimming between surface eyes.
      arcLift: transfer ? EARTH_RADIUS * 1.4 : 0,
      startRotation: orbitCamera.quaternion.clone(),
      approachRotation: orbitCamera.quaternion.clone(),
      turnRotation: null,
      turnBlend: 0,
      followOnArrival: true,
    }
    orbitCamera.near = 0.002
    orbitCamera.updateProjectionMatrix()
    synchronizeControls()
    if (wasSurface) callbacks.onSurfaceViewChange?.(false)
    visibilityChange()
  }

  const flightArc = new THREE.Quaternion()
  const flightRotation = new THREE.Quaternion()
  const flightFrameRotation = new THREE.Quaternion()
  const inverseFlightFrame = new THREE.Quaternion()
  const landingRotation = new THREE.Quaternion()
  const landingMatrix = new THREE.Matrix4()
  const landingPosition = new THREE.Vector3()
  const flightUp = new THREE.Vector3()
  const flightForward = new THREE.Vector3()
  const flightLookDirection = new THREE.Vector3()
  const ease = (value: number) => value * value * (3 - 2 * value)
  function advanceFlight(delta: number) {
    if (!flight) return
    flight.elapsed += delta
    const progress = Math.min(flight.elapsed / flight.approachDuration, 1)
    // Keep the approach to the surface at its original speed. The second,
    // upward turn starts at the same moment but takes twice as long, continuing
    // gently after the camera has reached the ground instead of slowing both.
    const turnProgress = THREE.MathUtils.clamp((flight.elapsed - flight.approachDuration * 0.48) / 1720, 0, 1)
    const travel = ease(progress)
    flightUp.copy(asVector(observation.up))
    flightArc.setFromUnitVectors(flight.startDirection, flightUp)
    flightRotation.identity().slerp(flightArc, ease(Math.min(progress / 0.78, 1)))
    const distance = THREE.MathUtils.lerp(flight.startRadius, EARTH_RADIUS + SURFACE_EYE_HEIGHT, travel)
      + flight.arcLift * Math.sin(Math.PI * travel) ** 2
    orbitCamera.position.copy(flight.startDirection).applyQuaternion(flightRotation).multiplyScalar(distance)
    // Transport the approach orientation along the viewing direction. Looking
    // down at the ground with the surface normal as camera-up has no stable roll.
    if (!flight.turnRotation) {
      flightLookDirection.copy(flightUp).multiplyScalar(EARTH_RADIUS).sub(orbitCamera.position).normalize()
      flightForward.set(0, 0, -1).applyQuaternion(flight.approachRotation)
      flightRotation.setFromUnitVectors(flightForward, flightLookDirection)
      flight.approachRotation.premultiply(flightRotation).normalize()
      orbitCamera.quaternion.copy(flight.startRotation).slerp(flight.approachRotation, ease(Math.min(progress / 0.4, 1)))
    }
    if (turnProgress > 0) {
      // Keep the second turn in the observer's frame so Earth can keep rotating.
      // Its starting pose is captured once, never rebuilt from a downward lookAt.
      landingMatrix.makeBasis(asVector(observation.east), flightUp, asVector(observation.north).negate())
      flightFrameRotation.setFromRotationMatrix(landingMatrix)
      inverseFlightFrame.copy(flightFrameRotation).invert()
      if (!flight.turnRotation) flight.turnRotation = orbitCamera.quaternion.clone().premultiply(inverseFlightFrame)
      landingPosition.copy(flightUp).multiplyScalar(EARTH_RADIUS + SURFACE_EYE_HEIGHT)
      landingMatrix.lookAt(landingPosition, defaultSurfaceAim().viewDirection.add(landingPosition), flightUp)
      landingRotation.setFromRotationMatrix(landingMatrix).premultiply(inverseFlightFrame)
      const turnBlend = ease(turnProgress)
      // This equals a single eased slerp for a still Moon. Updating from the
      // previous pose also prevents a moving target from flipping the turn arc.
      const step = (turnBlend - flight.turnBlend) / Math.max(1 - flight.turnBlend, 1e-8)
      flight.turnRotation.slerp(landingRotation, THREE.MathUtils.clamp(step, 0, 1))
      flight.turnBlend = turnBlend
      orbitCamera.quaternion.copy(flightFrameRotation).multiply(flight.turnRotation)
    }
    orbitCamera.up.set(0, 1, 0).applyQuaternion(orbitCamera.quaternion)
    orbitCamera.fov = THREE.MathUtils.lerp(flight.startFov, 70, travel)
    orbitCamera.updateProjectionMatrix()
    spaceGuides.visible = state.showGuides && progress < 0.45 && distance > EARTH_RADIUS * 1.2
    // The atmosphere is a decorative outer shell, unsuitable for an eye inside
    // it. Earth and Moon keep their own materials and normal depth occlusion.
    atmosphere.visible = distance > EARTH_RADIUS * 1.07
    if (turnProgress >= 1) {
      const followOnArrival = flight.followOnArrival
      flight = null
      surfaceView = true
      setMoonFollow(followOnArrival)
      aimSurfaceCameraAtMoon()
      synchronizeControls()
      callbacks.onSurfaceViewChange?.(true)
    }
  }

  const cameraFromObserver = new THREE.Vector3()
  function updateObserverGuideVisibility() {
    if (!state.showGuides) return
    cameraFromObserver.copy(orbitCamera.position).sub(observerMarker.position)
    const backSide = cameraFromObserver.dot(observerMarker.position) < 0
    observerLabel.visible = !backSide
    observerBackLabel.visible = backSide
    observerBackLabel.material.opacity = 0.78
    markerDot.material.opacity = backSide ? 0.45 : 1
    markerRing.material.opacity = backSide ? 0.3 : 0.85
    normalArrow.line.material.opacity = normalArrow.cone.material.opacity = backSide ? 0.32 : 0.88
    normalLabel.material.opacity = backSide ? 0.48 : 0.9
    sightlineMaterial.opacity = backSide ? 0.3 : 0.65
    sightlineLabel.material.opacity = backSide ? 0.6 : 0.85
    for (const record of stationRecords.values()) {
      record.label.visible = record.dot.visible
    }
  }

  function cancelSkyTurn() {
    skyTurn = null
  }

  function setMoonFollow(active: boolean) {
    if (followingMoon === active) return
    followingMoon = active
    callbacks.onMoonFollowChange?.(active)
  }

  function startSkyTurn() {
    // Unwrapped azimuth preserves the short arc across north. Below the horizon
    // we still follow the lunar bearing at a low pitch, ready for its next rise.
    const headingDelta = ((observation.azimuth - heading + 180) % 360 + 360) % 360 - 180
    skyTurn = { elapsed: 0, duration: 1000, startHeading: heading, headingDelta, startPitch: pitch, endPitch: THREE.MathUtils.clamp(observation.altitude, 5, 85) }
    if (reducedMotion) advanceSkyTurn(0)
    visibilityChange()
  }

  /** Set the user's tracking intent; repeated enables do not restart a turn. */
  function setMoonFollowing(active: boolean) {
    if (disposed) return
    if (flight) flight.followOnArrival = active
    if (!active) { cancelSkyTurn(); setMoonFollow(false); return }
    if (followingMoon || (!isLocalControl() && !flight)) return
    setMoonFollow(true)
    if (isSkyView()) startSkyTurn()
    else visibilityChange()
  }

  function advanceMoonFollow(delta: number) {
    if (!followingMoon || skyTurn || flight || bodyFlight || !isLocalControl()) return
    const target = surfaceView ? defaultSurfaceAim() : {
      azimuth: observation.azimuth,
      altitude: THREE.MathUtils.clamp(observation.altitude, 5, 85),
    }
    const headingDelta = ((target.azimuth - heading + 180) % 360 + 360) % 360 - 180
    // A short easing tail keeps playback centered without snapping the camera
    // when the lunar azimuth wraps north or flips while crossing the zenith.
    const blend = reducedMotion ? 1 : 1 - Math.exp(-delta / 100)
    heading += headingDelta * blend
    pitch = THREE.MathUtils.lerp(pitch, target.altitude, blend)
    updateObserverCamera()
  }

  function advanceSkyTurn(delta: number) {
    if (!skyTurn) return
    if (!isSkyView()) { cancelSkyTurn(); return }
    // Playback may move the Moon during the turn. Unwrap each updated target
    // against the preceding target so crossing north never reverses the path.
    const previousTarget = skyTurn.startHeading + skyTurn.headingDelta
    const targetStep = ((observation.azimuth - previousTarget + 180) % 360 + 360) % 360 - 180
    if (!reducedMotion && Math.abs(targetStep) > 45) {
      // Crossing the zenith can flip azimuth by 180° despite only a tiny sky
      // movement. Restart from the current view so that flip cannot become a
      // one-frame rotation near the end of an otherwise smooth animation.
      skyTurn.duration = Math.max(350, skyTurn.duration - skyTurn.elapsed)
      skyTurn.elapsed = 0
      skyTurn.startHeading = heading
      skyTurn.headingDelta = ((observation.azimuth - heading + 180) % 360 + 360) % 360 - 180
      skyTurn.startPitch = pitch
    } else skyTurn.headingDelta += targetStep
    skyTurn.endPitch = THREE.MathUtils.clamp(observation.altitude, 5, 85)
    skyTurn.elapsed += delta
    const progress = reducedMotion ? 1 : Math.min(skyTurn.elapsed / skyTurn.duration, 1)
    const travel = ease(progress)
    heading = skyTurn.startHeading + skyTurn.headingDelta * travel
    pitch = THREE.MathUtils.lerp(skyTurn.startPitch, skyTurn.endPitch, travel)
    updateObserverCamera()
    if (progress >= 1) cancelSkyTurn()
  }

  function lookAtMoon() {
    if (disposed || flight) return
    if (surfaceView) { setMoonFollow(true); aimSurfaceCameraAtMoon(); return }
    if (isSkyView() && !observation.aboveHorizon) { cancelSkyTurn(); return }
    if (isSkyView()) {
      setMoonFollow(true)
      startSkyTurn()
    } else {
      focusBody('moon')
    }
  }

  function update(next: SceneState) {
    if (disposed) return
    const modeChanged = next.mode !== state.mode
    const stationChanged = next.activeStationId !== state.activeStationId || next.latitude !== state.latitude || next.longitude !== state.longitude
    if (modeChanged || stationChanged) {
      cancelSkyTurn()
      if (modeChanged) setMoonFollow(false)
    }
    // Capture the current pose before applyGeometry attaches a landed camera
    // to a new station. Rebase active flights here as well for rapid selections.
    if (!modeChanged && stationChanged && state.mode === 'orbit' && (surfaceView || flight)) beginObserverFlight(true)
    const previousObservation = observation
    state = { ...next }
    synchronizeControls()
    applyGeometry()
    if (!modeChanged && followingMoon && isSkyView()) {
      const oldAltitude = previousObservation.altitude * RAD
      const newAltitude = observation.altitude * RAD
      const separationCosine = Math.sin(oldAltitude) * Math.sin(newAltitude)
        + Math.cos(oldAltitude) * Math.cos(newAltitude) * Math.cos((observation.azimuth - previousObservation.azimuth) * RAD)
      // Preserve tracking intent through station edits and timeline changes.
      // Large changes start a fresh smooth turn from the current camera view;
      // ordinary playback continues updating the existing target every frame.
      if (stationChanged || separationCosine < Math.cos(45 * RAD)) startSkyTurn()
    }
    if (modeChanged) {
      activePointer = null
      pickCandidate = null
      orbitPointers.clear()
      resize()
      resetView()
    }
  }

  const observerRaycaster = new THREE.Raycaster()
  const pickPointer = new THREE.Vector2()
  function pickObserver(clientX: number, clientY: number) {
    if (!callbacks.onObserverPick || isLocalControl() || flight || bodyFlight) return
    const bounds = canvas.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return
    pickPointer.set((clientX - bounds.left) / bounds.width * 2 - 1, 1 - (clientY - bounds.top) / bounds.height * 2)
    orbitCamera.updateMatrixWorld()
    space.updateMatrixWorld(true)
    observerRaycaster.setFromCamera(pickPointer, orbitCamera)
    const earthHit = observerRaycaster.intersectObject(earth, false)[0]
    if (state.showGuides) {
      const markers = [markerDot, ...Array.from(stationRecords.values()).filter(record => record.dot.visible).map(record => record.dot)]
      const markerHit = observerRaycaster.intersectObjects(markers, false)[0]
      if (markerHit && (!earthHit || markerHit.distance < earthHit.distance)) {
        if (markerHit.object === markerDot) callbacks.onObserverPick(state.latitude, state.longitude)
        else {
          const selected = stationRecords.get(String(markerHit.object.userData.stationId))?.station
          if (selected) callbacks.onObserverPick(selected.latitude, selected.longitude)
        }
        return
      }
    }
    if (!earthHit) return
    // worldToLocal inverses the exact seasonal basis × UTC daily rotation used
    // by the Earth texture, so clicks and geographic markers cannot drift apart.
    const geographic = earth.worldToLocal(earthHit.point.clone()).normalize()
    const latitude = Math.asin(THREE.MathUtils.clamp(geographic.y, -1, 1)) / RAD
    const longitude = Math.atan2(-geographic.z, geographic.x) / RAD
    callbacks.onObserverPick(latitude, longitude)
  }

  function pointerDown(event: PointerEvent) {
    if (!isLocalControl() && !flight && !bodyFlight && event.button === 0) {
      orbitPointers.add(event.pointerId)
      pickCandidate = orbitPointers.size === 1 && event.isPrimary
        ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY, started: performance.now() }
        : null
      return
    }
    if (!isLocalControl() || event.button !== 0 || activePointer !== null) return
    activePointer = event.pointerId
    pointerX = event.clientX
    pointerY = event.clientY
    canvas.focus({ preventScroll: true })
    canvas.setPointerCapture(event.pointerId)
    canvas.style.cursor = 'grabbing'
  }
  function pointerMove(event: PointerEvent) {
    if (pickCandidate?.pointerId === event.pointerId && Math.hypot(event.clientX - pickCandidate.x, event.clientY - pickCandidate.y) > 5) pickCandidate = null
    if (!isLocalControl() || event.pointerId !== activePointer) return
    // A tap's tiny pointer jitter is not an intentional change of view.
    if (followingMoon && Math.hypot(event.clientX - pointerX, event.clientY - pointerY) < 5) return
    if (event.clientX !== pointerX || event.clientY !== pointerY) { cancelSkyTurn(); setMoonFollow(false) }
    const degreesPerPixel = (surfaceView ? orbitCamera.fov : observerCamera.fov) / Math.max(container.clientHeight, 1)
    heading -= (event.clientX - pointerX) * degreesPerPixel
    pitch += (event.clientY - pointerY) * degreesPerPixel
    pointerX = event.clientX
    pointerY = event.clientY
    updateObserverCamera()
  }
  function pointerUp(event: PointerEvent) {
    if (orbitPointers.has(event.pointerId) && event.type !== 'lostpointercapture') {
      orbitPointers.delete(event.pointerId)
      const candidate = pickCandidate
      pickCandidate = null
      if (event.type === 'pointerup' && candidate?.pointerId === event.pointerId && performance.now() - candidate.started < 650 && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) <= 5) {
        pickObserver(event.clientX, event.clientY)
      }
    }
    if (event.pointerId !== activePointer) return
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
    activePointer = null
    canvas.style.cursor = isLocalControl() ? 'grab' : 'default'
  }
  function keyDown(event: KeyboardEvent) {
    if (!isLocalControl()) return
    if (event.key === 'Escape' && surfaceView) { event.preventDefault(); resetView(); return }
    const change = event.shiftKey ? 10 : 3
    if (event.key === 'ArrowLeft') heading -= change
    else if (event.key === 'ArrowRight') heading += change
    else if (event.key === 'ArrowUp') pitch += change
    else if (event.key === 'ArrowDown') pitch -= change
    else if (event.key === 'Home') { event.preventDefault(); lookAtMoon(); return }
    else return
    cancelSkyTurn()
    setMoonFollow(false)
    event.preventDefault()
    updateObserverCamera()
  }
  function wheel(event: WheelEvent) {
    if (!isLocalControl()) return
    event.preventDefault()
    const camera = surfaceView ? orbitCamera : observerCamera
    camera.fov = THREE.MathUtils.clamp(camera.fov + event.deltaY * 0.025, 35, 100)
    camera.updateProjectionMatrix()
  }
  function contextLost(event: Event) {
    event.preventDefault()
    renderingLost = true
    cancelSkyTurn()
    cancelAnimationFrame(frame)
    frame = 0
    callbacks.onError?.('三维绘图连接已中断，请刷新页面恢复场景。')
  }
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointercancel', pointerUp)
  canvas.addEventListener('lostpointercapture', pointerUp)
  canvas.addEventListener('keydown', keyDown)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('webglcontextlost', contextLost)

  function animate(timestamp: number) {
    frame = 0
    if (disposed || renderingLost || document.hidden || !inViewport || !hasSize) return
    applyPendingResize()
    if (!hasSize) { visibilityChange(); return }
    const delta = lastFrameTime ? Math.min(timestamp - lastFrameTime, 64) : 16
    lastFrameTime = timestamp
    advanceFlight(delta)
    advanceBodyFlight(delta)
    advanceSkyTurn(delta)
    advanceMoonFollow(delta)
    updateOrbitAngleGuide()
    if (!isSkyView() && spaceGuides.visible) updateRipples(delta)
    if (!isLocalControl() && !flight && !bodyFlight) {
      controls.update()
      keepOrbitCameraOutsideEarth()
      updateObserverGuideVisibility()
    }
    if (!isSkyView()) updateSpaceLabelScales()
    if (isSkyView()) updateLocalMoonProjection()
    renderer.render(isSkyView() ? groundScene : space, isSkyView() ? observerCamera : orbitCamera)
    if (firstFrame || (!readyReported && settledTextures.size === 4)) {
      firstFrame = false
      settledAssetsRendered = settledTextures.size === 4
      reportLoadingProgress()
    }
    frame = requestAnimationFrame(animate)
  }
  function visibilityChange() {
    if (disposed || renderingLost) return
    if (document.hidden || !inViewport || !hasSize) { cancelSkyTurn(); cancelAnimationFrame(frame); frame = 0; lastFrameTime = 0 }
    else if (!frame) frame = requestAnimationFrame(animate)
  }
  document.addEventListener('visibilitychange', visibilityChange)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  const intersectionObserver = new IntersectionObserver(entries => {
    inViewport = entries.some(entry => entry.isIntersecting)
    visibilityChange()
  })
  intersectionObserver.observe(container)
  applyGeometry()
  resetView()
  resize()

  function dispose() {
    if (disposed) return
    disposed = true
    flight = null
    bodyFlight = null
    cancelSkyTurn()
    setMoonFollow(false)
    textureTimers.forEach(timeout => window.clearTimeout(timeout))
    textureTimers.clear()
    reducedMotionQuery.removeEventListener('change', reducedMotionChange)
    rippleSets.clear()
    spaceLabels.clear()
    pickCandidate = null
    orbitPointers.clear()
    cancelAnimationFrame(frame)
    resizeObserver.disconnect()
    intersectionObserver.disconnect()
    document.removeEventListener('visibilitychange', visibilityChange)
    canvas.removeEventListener('pointerdown', pointerDown)
    canvas.removeEventListener('pointermove', pointerMove)
    canvas.removeEventListener('pointerup', pointerUp)
    canvas.removeEventListener('pointercancel', pointerUp)
    canvas.removeEventListener('lostpointercapture', pointerUp)
    canvas.removeEventListener('keydown', keyDown)
    canvas.removeEventListener('wheel', wheel)
    canvas.removeEventListener('webglcontextlost', contextLost)
    controls.dispose()
    geometries.forEach(geometry => geometry.dispose())
    materials.forEach(material => material.dispose())
    textures.forEach(texture => texture.dispose())
    space.clear()
    groundScene.clear()
    renderer.dispose()
    renderer.forceContextLoss()
    canvas.remove()
  }

  return { update, resize, resetView, setMoonFollowing, focusBody, focusObserver, flyToObserver, lookAtMoon, dispose }
}
