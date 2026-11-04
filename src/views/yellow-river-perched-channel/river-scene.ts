import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createRiverModel } from './river-model'
import { createCameraTransition } from './camera-transition'
import { riverHeights, scenarioProgress, type LeveeScenario } from './river-bed-profile'
import { createSedimentParticles } from './sediment-particles'
import { createDepositionBed, depositionSurfaceHeight } from './deposition-bed'

export type ViewMode = 'perspective' | 'section' | 'overhead'
export type ProjectedLabel = { id: string; x: number; y: number; anchorX: number; anchorY: number; visible: boolean }
export interface RiverSceneController {
  setPlaying(value: boolean): void
  setProgress(value: number): void
  setScenario(value: LeveeScenario): void
  setView(mode: ViewMode): void
  setWaterVisible(enabled: boolean): void
  setSedimentVisible(enabled: boolean): void
  setGuidesVisible(enabled: boolean): void
  focusFeature(id: string): void
  reset(): void
  zoom(delta: number): void
  dispose(): void
}

export function createRiverScene(host: HTMLElement, callbacks: {
  onLabels?: (labels: ProjectedLabel[]) => void
  onSelect?: (id: string) => void
  onProgress?: (progress: number) => void
  onReady?: () => void
  onError?: (message: string) => void
}): RiverSceneController {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.94
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '黄河地上河三维模型，展示河床、大堤与两岸地面的高度关系')
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none'
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f5f3ed')
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, 0.04)
  room.dispose()
  scene.environment = environment.texture
  scene.environmentIntensity = 0.32
  scene.add(new THREE.HemisphereLight('#e9f2f4', '#8b7754', 1.2))
  const sun = new THREE.DirectionalLight('#fff0d7', 2.3)
  sun.position.set(-24, 48, 26)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 36, bottom: -36, near: 1, far: 120 })
  sun.shadow.bias = -0.00025
  sun.shadow.normalBias = 0.04
  sun.shadow.radius = 3
  scene.add(sun)
  const model = createRiverModel()
  scene.add(model.root)
  const sedimentParticles = createSedimentParticles()
  scene.add(sedimentParticles.root)
  const depositionBed = createDepositionBed()
  scene.add(depositionBed.root)

  const perspective = new THREE.PerspectiveCamera(38, 1, 0.2, 320)
  const orthographic = new THREE.OrthographicCamera(-30, 30, 20, -20, 0.2, 320)
  let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera = perspective
  const orbit = new OrbitControls(perspective, renderer.domElement)
  const orthoOrbit = new OrbitControls(orthographic, renderer.domElement)
  for (const controls of [orbit, orthoOrbit]) {
    controls.enableDamping = true
    controls.dampingFactor = 0.085
    controls.panSpeed = 0.65
    controls.zoomSpeed = 0.7
  }
  orbit.minDistance = 17
  orbit.maxDistance = 135
  orbit.maxPolarAngle = Math.PI * 0.485
  orthoOrbit.enableRotate = false
  orthoOrbit.minZoom = 0.6
  orthoOrbit.maxZoom = 3
  orthoOrbit.enabled = false
  let mode: ViewMode = 'perspective'
  let progress = 1
  let scenario: LeveeScenario = 'raised'
  let width = 1, height = 1, disposed = false, hidden = document.hidden
  let previousFit = 1
  let resizePending = false
  let waterVisible = true, guidesVisible = true
  let playing = false
  let flight: { transition: ReturnType<typeof createCameraTransition>; elapsed: number; duration: number; fromProgress?: number } | null = null
  let preservedProjection: THREE.Matrix4 | null = null

  const guide = new THREE.Group()
  guide.name = 'height-comparison'
  scene.add(guide)
  const lineMat = new THREE.LineBasicMaterial({ color: '#966d39', depthTest: false, transparent: true, opacity: 0.85 })
  const guidePositions = new Float32Array(36)
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(guidePositions, 3))
  const bracket = new THREE.LineSegments(lineGeo, lineMat)
  bracket.renderOrder = 25
  guide.add(bracket)
  const baselineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-23.8, 0, 16.08), new THREE.Vector3(23.8, 0, 16.08)])
  const baselineMat = new THREE.LineDashedMaterial({ color: '#f9f1df', dashSize: 0.48, gapSize: 0.29, transparent: true, opacity: 0.94, depthTest: false })
  const baseline = new THREE.Line(baselineGeo, baselineMat)
  baseline.computeLineDistances()
  baseline.renderOrder = 25
  guide.add(baseline)

  const heightCaption = document.createElement('div')
  heightCaption.style.cssText = 'position:absolute;pointer-events:none;padding:7px 11px;border-radius:5px;border:1px solid #c9b696;background:#fffaf0ed;color:#77572e;font:500 14px/1.5 "Microsoft YaHei",sans-serif;white-space:nowrap;transform:translate(-50%,-50%)'
  host.appendChild(heightCaption)
  const captionAnchor = new THREE.Vector3()

  function updateGuides() {
    const physicalProgress = scenarioProgress(progress, scenario)
    const bed = depositionSurfaceHeight(0, 16, physicalProgress)
    const heights = riverHeights(physicalProgress, scenario)
    const lower = scenario === 'fixed' ? heights.levee : 0
    const upper = scenario === 'fixed' ? heights.water : bed
    const z = 16.18, x = 10.8
    const points = [0, upper, z, x + 0.5, upper, z,
      x, lower, z, x, upper, z,
      x - 0.5, lower, z, x + 0.5, lower, z,
      x - 0.5, upper, z, x + 0.5, upper, z]
    guidePositions.fill(0)
    guidePositions.set(points)
    lineGeo.setDrawRange(0, 8)
    lineGeo.attributes.position!.needsUpdate = true
    lineGeo.computeBoundingSphere()
    captionAnchor.set(17.1, Math.max(1.3, (lower + upper) * 0.5), 16.5)
    heightCaption.textContent = scenario === 'fixed'
      ? heights.water > heights.levee + .01 ? '水面超过原堤顶 · 漫溢' : heights.water > heights.levee - .15 ? '水面接近原堤顶' : '水面低于原堤顶'
      : bed > .2 ? '河床高于两岸地面' : bed < -.2 ? '河床低于两岸地面' : '河床接近两岸地面'
    guide.visible = guidesVisible && mode !== 'overhead' && (scenario !== 'fixed' || waterVisible)
  }

  function size() {
    const nextWidth = Math.max(1, host.clientWidth)
    const nextHeight = Math.max(1, host.clientHeight)
    const changed = width !== nextWidth || height !== nextHeight
    width = nextWidth
    height = nextHeight
    if (changed) renderer.setSize(width, height, false)
    const oldAspect = perspective.aspect
    perspective.aspect = width / height
    if (preservedProjection) preservedProjection.elements[0]! *= oldAspect / perspective.aspect
    const nextFit = Math.max(1, 1.4 / perspective.aspect)
    orbit.maxDistance = 135 * nextFit
    perspective.position.sub(orbit.target).multiplyScalar(nextFit / previousFit).add(orbit.target)
    previousFit = nextFit
    perspective.updateProjectionMatrix()
    const aspect = width / height
    const halfWidth = Math.max(27.2, (mode === 'overhead' ? 19.5 : 12.8) * aspect)
    const halfHeight = halfWidth / aspect
    orthographic.left = -halfWidth; orthographic.right = halfWidth
    orthographic.top = halfHeight; orthographic.bottom = -halfHeight
    orthographic.updateProjectionMatrix()
  }
  // A canvas resize clears its drawing buffer. Do it inside the render frame,
  // immediately before drawing, never between the RAF and the browser's paint.
  const observer = new ResizeObserver(() => { resizePending = true })
  observer.observe(host)

  function clearInertia(controls: OrbitControls) {
    const controlled = controls.object as THREE.PerspectiveCamera | THREE.OrthographicCamera
    const position = controlled.position.clone(), rotation = controlled.quaternion.clone()
    const target = controls.target.clone(), zoom = controlled.zoom
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = true
    controlled.position.copy(position)
    controlled.quaternion.copy(rotation)
    controlled.zoom = zoom
    controlled.updateProjectionMatrix()
    controls.target.copy(target)
  }

  function setView(next: ViewMode) {
    stopFlight()
    preservedProjection = null
    orbit.maxPolarAngle = Math.PI * 0.485
    perspective.up.set(0, 1, 0)
    clearInertia(orbit); clearInertia(orthoOrbit)
    mode = next
    size()
    model.setSection(next === 'section')
    orbit.enabled = next === 'perspective'
    orthoOrbit.enabled = next !== 'perspective'
    if (next === 'perspective') {
      camera = perspective
      const aspect = width / height
      const fit = Math.max(1, 1.4 / aspect)
      perspective.position.set(-31 * fit, 24 * fit, 46 * fit)
      orbit.target.set(0, -5.2, 0)
      orbit.update()
    } else {
      camera = orthographic
      orthographic.zoom = 1
      orthographic.up.set(0, next === 'section' ? 1 : 0, next === 'section' ? 0 : -1)
      orthographic.position.set(0, next === 'section' ? 1.2 : 90, next === 'section' ? 90 : 0)
      orthoOrbit.target.set(0, next === 'section' ? 1.2 : 0, 0)
      orthoOrbit.update()
      orthographic.updateProjectionMatrix()
    }
    updateGuides()
    renderer.shadowMap.needsUpdate = true
  }

  const vector = new THREE.Vector3()
  const offsets: Record<string, [number, number]> = {
    bed: [-72, 62], water: [-52, -70], levee: [62, -65], plain: [-60, 42], sediment: [-45, 48], tower: [46, -48],
  }
  function projectLabels() {
    camera.updateMatrixWorld()
    vector.copy(captionAnchor).project(camera)
    const captionX = (vector.x + 1) * width / 2
    const captionY = (1 - vector.y) * height / 2
    const captionVisible = guide.visible && vector.z > -1 && vector.z < 1
    const anchors = model.root.userData.anchors as Record<string, [number, number, number]> | undefined
    const labels: ProjectedLabel[] = []
    for (const [id, position] of Object.entries(anchors || {})) {
      vector.set(...position).project(camera)
      const anchorX = (vector.x + 1) * width / 2
      const anchorY = (1 - vector.y) * height / 2
      const offset = offsets[id] || [0, -45]
      const visible = vector.z > -1 && vector.z < 1 && anchorX > 4 && anchorX < width - 4 && anchorY > 4 && anchorY < height - 4 && (id !== 'water' || waterVisible) && (id !== 'sediment' || progress > 0.015)
      labels.push({ id, anchorX, anchorY, x: THREE.MathUtils.clamp(anchorX + offset[0], 80, width - 90), y: THREE.MathUtils.clamp(anchorY + offset[1], 32, height - 38), visible })
    }
    // Separate captions in screen space without moving their physical attachment points.
    for (let iteration = 0; iteration < 4; iteration++) {
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i]!, b = labels[j]!
        if (!a.visible || !b.visible || Math.abs(a.x - b.x) > 130 || Math.abs(a.y - b.y) > 38) continue
        const delta = (40 - Math.abs(a.y - b.y)) / 2
        if (a.y < b.y) { a.y -= delta; b.y += delta } else { a.y += delta; b.y -= delta }
        a.y = THREE.MathUtils.clamp(a.y, 30, height - 32)
        b.y = THREE.MathUtils.clamp(b.y, 30, height - 32)
      }
    }
    // Keep the height explanation clear of the interactive structure labels too.
    const captionPlacement = captionVisible ? [[0, 0], [0, -48], [0, 48], [-100, 0], [100, 0], [0, -96], [0, 96]]
      .map(([dx, dy]) => ({ x: captionX + dx!, y: captionY + dy! }))
      .find(point => point.x > 90 && point.x < width - 90 && point.y > 24 && point.y < height - 24 &&
        labels.every(label => !label.visible || Math.abs(label.x - point.x) > 145 || Math.abs(label.y - point.y) > 45)) : undefined
    heightCaption.style.display = captionPlacement ? 'block' : 'none'
    if (captionPlacement) {
      heightCaption.style.left = `${captionPlacement.x}px`
      heightCaption.style.top = `${captionPlacement.y}px`
    }
    callbacks.onLabels?.(labels)
  }

  function stopFlight() {
    if (!flight) return
    flight = null
    // Keep the current lens and roll when the user takes over mid-transition.
    // OrbitControls may update its native lens on wheel input; reapply this lens
    // immediately before rendering until the next explicit view transition.
    preservedProjection = perspective.projectionMatrix.clone()
    perspective.up.set(0, 1, 0).applyQuaternion(perspective.quaternion)
    orbit.maxPolarAngle = Math.PI / 2
  }
  function finishFlight() {
    flight = null
    preservedProjection = null
    perspective.up.set(0, 1, 0)
    orbit.maxPolarAngle = Math.PI * 0.485
    perspective.updateProjectionMatrix()
    orbit.update()
  }
  function updateProgress(value: number) {
    progress = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1)
    const physicalProgress = scenarioProgress(progress, scenario)
    model.update(physicalProgress, scenario, progress)
    depositionBed.update(physicalProgress)
    model.root.userData.anchors.bed[1] = depositionSurfaceHeight(0, 16, physicalProgress)
    updateGuides()
  }
  function startFlight(target: THREE.Vector3, destination: THREE.PerspectiveCamera, fromProgress?: number) {
    const previousCamera = camera.clone()
    const previousTarget = (mode === 'perspective' ? orbit : orthoOrbit).target.clone()
    clearInertia(orbit); clearInertia(orthoOrbit)
    const transition = createCameraTransition(previousCamera, previousTarget, destination, target)
    preservedProjection = null
    mode = 'perspective'
    camera = perspective
    orbit.enabled = true; orthoOrbit.enabled = false
    model.setSection(false)
    updateGuides()
    flight = { transition, duration: 1.05, elapsed: 0, fromProgress }
    transition.sample(camera, orbit.target, 0)
    renderer.shadowMap.needsUpdate = true
    if (reducedMotion.matches) {
      transition.sample(camera, orbit.target, 1)
      if (fromProgress !== undefined) { updateProgress(1); callbacks.onProgress?.(1) }
      finishFlight()
    }
  }
  orbit.addEventListener('start', stopFlight)
  orthoOrbit.addEventListener('start', stopFlight)
  function visibilityChanged() { hidden = document.hidden; last = performance.now() }
  document.addEventListener('visibilitychange', visibilityChanged)
  function contextLost(event: Event) {
    event.preventDefault()
    callbacks.onError?.('三维场景暂时中断，请重新加载场景。')
  }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  let last = performance.now(), elapsed = 0, labelTimer = 0, frame = 0
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  function animate(now: number) {
    if (disposed) return
    frame = requestAnimationFrame(animate)
    const dt = Math.min((now - last) / 1000, 0.06)
    last = now
    if (hidden) return
    if (resizePending) {
      if (width !== host.clientWidth || height !== host.clientHeight) stopFlight()
      size()
      resizePending = false
      labelTimer = 1
    }
    if (flight) {
      flight.elapsed += dt
      const t = Math.min(flight.elapsed / flight.duration, 1)
      const ease = flight.transition.sample(camera, orbit.target, t)
      if (flight.fromProgress !== undefined && progress !== 1) {
        updateProgress(THREE.MathUtils.lerp(flight.fromProgress, 1, ease))
        callbacks.onProgress?.(progress)
      }
      if (t === 1) finishFlight()
    } else (mode === 'perspective' ? orbit : orthoOrbit).update()
    if (preservedProjection) {
      perspective.projectionMatrix.copy(preservedProjection)
      perspective.projectionMatrixInverse.copy(preservedProjection).invert()
    }
    if (!reducedMotion.matches || playing) elapsed += dt
    model.updateWater(elapsed)
    sedimentParticles.update(elapsed, scenarioProgress(progress, scenario), playing, waterVisible)
    labelTimer += dt
    if (labelTimer > 1 / 24) { projectLabels(); labelTimer = 0 }
    renderer.render(scene, camera)
  }
  size(); updateProgress(progress); setView('perspective'); projectLabels()
  renderer.shadowMap.needsUpdate = true
  frame = requestAnimationFrame(animate)
  queueMicrotask(() => { if (!disposed) callbacks.onReady?.() })

  return {
    setPlaying(value) { if (value) stopFlight(); playing = value },
    setProgress(value) {
      stopFlight()
      updateProgress(value)
    },
    setScenario(value) {
      stopFlight()
      scenario = value
      updateProgress(0)
      projectLabels()
    },
    setView,
    setWaterVisible(enabled) { waterVisible = enabled; model.setWaterVisible(enabled); updateGuides(); projectLabels() },
    setSedimentVisible(enabled) { model.setSedimentVisible(enabled); sedimentParticles.setVisible(enabled); depositionBed.setVisible(enabled) },
    setGuidesVisible(enabled) { guidesVisible = enabled; updateGuides() },
    focusFeature(id) {
      const anchor = model.root.userData.anchors?.[id] as [number, number, number] | undefined
      if (!anchor) return
      const controls = mode === 'perspective' ? orbit : orthoOrbit
      const target = new THREE.Vector3(...anchor)
      if (mode !== 'perspective') {
        // Keep the complete height comparison visible in the teaching section.
        return
      }
      if (id === 'tower') target.y *= 0.5
      const direction = camera.position.clone().sub(controls.target).normalize()
      const end = target.clone().addScaledVector(direction, id === 'tower' ? 25 : 32)
      const destination = perspective.clone()
      destination.position.copy(end)
      destination.up.set(0, 1, 0)
      destination.lookAt(target)
      destination.updateProjectionMatrix()
      startFlight(target, destination)
    },
    reset() {
      playing = false
      const fit = Math.max(1, 1.4 / (width / height))
      const target = new THREE.Vector3(0, -5.2, 0)
      const destination = perspective.clone()
      destination.position.set(-31 * fit, 24 * fit, 46 * fit)
      destination.up.set(0, 1, 0)
      destination.lookAt(target)
      destination.updateProjectionMatrix()
      startFlight(target, destination, progress)
    },
    zoom(delta) {
      stopFlight()
      if (mode === 'perspective') {
        const distance = perspective.position.distanceTo(orbit.target)
        const length = THREE.MathUtils.clamp(distance * Math.exp(-delta * 0.15), orbit.minDistance, orbit.maxDistance)
        perspective.position.sub(orbit.target).setLength(length).add(orbit.target)
      } else {
        orthographic.zoom = THREE.MathUtils.clamp(orthographic.zoom * Math.exp(delta * 0.15), 0.6, 3)
        orthographic.updateProjectionMatrix()
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibilityChanged)
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      orbit.dispose(); orthoOrbit.dispose(); model.dispose(); sedimentParticles.dispose(); depositionBed.dispose()
      lineGeo.dispose(); lineMat.dispose(); baselineGeo.dispose(); baselineMat.dispose()
      heightCaption.remove()
      sun.shadow.map?.dispose()
      environment.dispose(); pmrem.dispose(); renderer.dispose()
      renderer.domElement.remove()
      callbacks.onLabels?.([])
    },
  }
}
