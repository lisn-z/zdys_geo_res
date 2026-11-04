import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createHydrateModel, getSeafloorHeight, getSeafloorSamples } from './model'
import { createOceanSideGeometries, createOceanSurface } from './water'
import type { CameraView, FeatureId, LessonStep, SceneCallbacks, SceneController } from './types'

export function createHydrateScene(host: HTMLElement, callbacks: SceneCallbacks): SceneController {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .98
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '半潜式平台、连续井筒与海底含水合物沉积层三维示意')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const surfaceBackground = new THREE.Color('#f3f5f2')
  scene.background = surfaceBackground.clone()
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 250)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = .08
  controls.minDistance = 3
  controls.maxDistance = 130
  controls.maxPolarAngle = Math.PI * .8
  controls.target.set(0, -5, 0)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, .04)
  room.dispose()
  scene.environment = environment.texture
  scene.environmentIntensity = .32
  scene.add(new THREE.HemisphereLight('#dcecf5', '#555b58', 1.6))
  const sun = new THREE.DirectionalLight('#fff5e7', 2.35)
  sun.position.set(-18, 35, 28)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -23, right: 23, top: 23, bottom: -23, near: 1, far: 100 })
  sun.shadow.bias = -.0002
  sun.shadow.normalBias = .04
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#b8dbe8', .95)
  fill.position.set(15, 4, -18)
  scene.add(fill)

  const model = createHydrateModel()
  scene.add(model.group)
  const surfaceGeometry = new THREE.PlaneGeometry(30, 16, 1, 1)
  surfaceGeometry.rotateX(-Math.PI / 2)
  const surface = createOceanSurface(surfaceGeometry)
  scene.add(surface.water)
  // The lesson retains its light backdrop; only the ocean reflector sees the
  // same ocean-and-sky reference used by the ocean-atmosphere lesson.
  let reflectionReady = false
  const reflectionSky = new THREE.TextureLoader().load('/geo-resources-folder/images/ocean-atmosphere/ocean-atmosphere-backdrop.png', texture => {
    if (disposed) { texture.dispose(); return }
    texture.colorSpace = THREE.SRGBColorSpace; reflectionReady = true
  }, undefined, () => { /* Muted blue sky remains as the reflection fallback. */ })
  reflectionSky.colorSpace = THREE.SRGBColorSpace
  const reflectionFallback = new THREE.Color('#81a9c3')
  const renderOceanReflection = surface.water.onBeforeRender.bind(surface.water)
  surface.water.onBeforeRender = (activeRenderer, activeScene, activeCamera, geometry, material, group) => {
    const background = activeScene.background
    activeScene.background = reflectionReady ? reflectionSky : reflectionFallback
    try { renderOceanReflection(activeRenderer, activeScene, activeCamera, geometry, material, group) }
    finally { activeScene.background = background }
  }
  const sideMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    uniforms: { uOpacity: { value: .14 } },
    vertexShader: 'varying float vDepth; void main(){vDepth=clamp(-position.y/10.0,0.0,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform float uOpacity; varying float vDepth; void main(){vec3 c=mix(vec3(.23,.62,.72),vec3(.035,.25,.38),vDepth);gl_FragColor=vec4(c,uOpacity);}',
  })
  const waterSideGeometries = createOceanSideGeometries(getSeafloorHeight, getSeafloorSamples)
  const waterSides = new THREE.Group()
  waterSides.name = 'Ocean column walls with shared sediment boundary'
  waterSideGeometries.forEach((geometry, index) => {
    const wall = new THREE.Mesh(geometry, sideMaterial)
    wall.name = `Ocean column wall ${index + 1}`
    wall.renderOrder = 1
    waterSides.add(wall)
  })
  scene.add(waterSides)

  // Reference marks belong to the conceptual water column, not to an actual well site.
  const depthRuler = new THREE.Group()
  const rulerMaterial = new THREE.LineBasicMaterial({ color: '#4b8497', transparent: true, opacity: .65 })
  const ticks: THREE.Vector3[] = [new THREE.Vector3(14.9, 0, 8.05), new THREE.Vector3(14.9, -10, 8.05)]
  for (let k = 0; k <= 4; k++) ticks.push(new THREE.Vector3(14.25, -k * 2.5, 8.05), new THREE.Vector3(14.9, -k * 2.5, 8.05))
  depthRuler.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), rulerMaterial))
  scene.add(depthRuler)

  let width = 1, height = 1, frame = 0, disposed = false, resizePending = true
  let step: LessonStep = 'resource', view: CameraView = 'overview'
  let depth = 800, progress = 0, playing = false
  let elapsed = 0, previous = performance.now(), labelClock = 0
  let userNavigated = false
  controls.addEventListener('start', () => { userNavigated = true })
  let flight: { start: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 } | null = null
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const scratch = new THREE.Vector3()

  function viewPose(next: CameraView) {
    const portrait = width <= 1050 && window.innerWidth <= window.innerHeight
    const fit = Math.max(1.08, (portrait ? 1.6 : 1.15) / (width / height))
    if (next === 'platform') return { eye: new THREE.Vector3(10, 10, 16).multiplyScalar(Math.max(1, fit * .75)), target: new THREE.Vector3(-4, 3, 0) }
    if (next === 'section') return { eye: new THREE.Vector3(0, -4, 51 * fit), target: new THREE.Vector3(0, -5, 0) }
    if (next === 'dive') {
      const target = new THREE.Vector3(-3.5, -.5 - depth / 1600 * 9, 0)
      const eye = new THREE.Vector3(7, -1.2 - depth / 1600 * 7.6, 6)
      if (width < 600) eye.sub(target).multiplyScalar(1.25).add(target)
      return { eye, target }
    }
    const target = new THREE.Vector3(0, -8.1, 0)
    return { eye: new THREE.Vector3(30, 25.2, 36).multiplyScalar(fit).add(target), target }
  }
  function transition(eye: THREE.Vector3, target: THREE.Vector3, immediate = false) {
    controls.enabled = false
    const damping = controls.enableDamping
    controls.enableDamping = false
    const oldEye = camera.position.clone(), oldTarget = controls.target.clone()
    controls.update()
    camera.position.copy(oldEye); controls.target.copy(oldTarget)
    controls.enableDamping = damping
    if (reducedMotion || immediate) {
      flight = null; camera.position.copy(eye); controls.target.copy(target); camera.lookAt(target); controls.enabled = true; controls.update()
    } else flight = { start: performance.now(), from: camera.position.clone(), to: eye, fromTarget: controls.target.clone(), toTarget: target }
  }
  function chooseView(next: CameraView, immediate = false) {
    view = next; userNavigated = false
    model.setSection(next === 'section' || step === 'extraction')
    renderer.shadowMap.needsUpdate = true
    const pose = viewPose(next)
    transition(pose.eye, pose.target, immediate)
  }
  function resize() {
    const box = host.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return
    const first = width === 1
    width = box.width; height = box.height
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    // Reserve a little screen space for the floating teaching card on wide displays.
    const portrait = width <= 1050 && window.innerWidth <= window.innerHeight
    camera.setViewOffset(width, height, width > 1050 ? width * .105 : 0, portrait ? height * .17 : 0, width, height)
    camera.updateProjectionMatrix()
    if (first) chooseView('overview', true)
    else if (!userNavigated && view !== 'dive') { const pose = viewPose(view); transition(pose.eye, pose.target, true) }
  }
  function markers() {
    camera.updateMatrixWorld()
    const ids = Object.keys(model.anchors) as FeatureId[]
    callbacks.onMarkers(ids.map(id => {
      scratch.copy(model.anchors[id]).project(camera)
      return { id, x: (scratch.x * .5 + .5) * width, y: (-scratch.y * .5 + .5) * height, visible: scratch.z > -1 && scratch.z < 1 && Math.abs(scratch.x) < .96 && Math.abs(scratch.y) < .94 }
    }))
  }
  function animate(now: number) {
    if (disposed) return
    frame = requestAnimationFrame(animate)
    const dt = Math.min((now - previous) / 1000, .05)
    previous = now
    if (document.hidden) return
    if (resizePending) { resizePending = false; resize() }
    elapsed += dt
    if (flight) {
      const t = THREE.MathUtils.clamp((now - flight.start) / 950, 0, 1)
      const ease = t * t * t * (t * (t * 6 - 15) + 10)
      camera.position.lerpVectors(flight.from, flight.to, ease)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease)
      camera.lookAt(controls.target)
      if (t === 1) { flight = null; controls.enabled = true; controls.update() }
    } else controls.update()
    if (playing && step === 'extraction') {
      progress = Math.min(1, progress + dt / 26)
      callbacks.onProgress(progress)
      if (progress === 1) playing = false
    }
    model.update(elapsed, progress, step === 'extraction', depth)
    const insideOcean = Math.abs(camera.position.x) < 15 && Math.abs(camera.position.z) < 8
    const submerged = insideOcean && camera.position.y < -.1
    surface.update(dt, submerged ? 1 : 0)
    const targetAlpha = view === 'section' || step === 'extraction' ? .18 : submerged ? .16 : .96
    surface.water.material.uniforms.uAlpha!.value = THREE.MathUtils.damp(surface.water.material.uniforms.uAlpha!.value, targetAlpha, 10, dt)
    sideMaterial.uniforms.uOpacity!.value = THREE.MathUtils.damp(sideMaterial.uniforms.uOpacity!.value, view === 'dive' ? .055 : .19, 10, dt)
    const underwater = insideOcean ? THREE.MathUtils.smoothstep(-camera.position.y, .1, 4) : 0
    ;(scene.background as THREE.Color).copy(surfaceBackground).lerp(new THREE.Color('#527e89'), underwater * .85)
    renderer.render(scene, camera)
    labelClock += dt
    if (labelClock > .05 || flight) { labelClock = 0; markers() }
  }
  const observer = new ResizeObserver(() => { resizePending = true })
  observer.observe(host)
  function onLost(event: Event) { event.preventDefault(); callbacks.onError('三维场景暂时中断，请重新加载课件。') }
  renderer.domElement.addEventListener('webglcontextlost', onLost)
  resize()
  renderer.shadowMap.needsUpdate = true
  model.update(0, progress, false, depth)
  renderer.render(scene, camera)
  frame = requestAnimationFrame(animate)
  callbacks.onReady()

  return {
    setStep(next) {
      step = next; playing = false
      if (next === 'resource') chooseView('overview')
      else if (next === 'pressure') chooseView('dive')
      else if (next === 'extraction') chooseView('section')
      else chooseView('overview')
    },
    setView: chooseView,
    setDepth(value) { depth = THREE.MathUtils.clamp(value, 0, 1600); renderer.shadowMap.needsUpdate = true; if (view === 'dive') { const pose = viewPose(view); transition(pose.eye, pose.target) } },
    setProgress(value) { progress = THREE.MathUtils.clamp(value, 0, 1); callbacks.onProgress(progress) },
    setPlaying(value) { if (value && progress >= 1) { progress = 0; callbacks.onProgress(0) } playing = value && step === 'extraction' },
    setWaterVisible(value) { surface.water.visible = waterSides.visible = value; model.setWaterVisible(value) },
    focus(id, detail = false) {
      userNavigated = true
      const target = model.anchors[id].clone()
      if (id === 'platform') {
        if (detail) transition(new THREE.Vector3(10, 2.8, 18), new THREE.Vector3(-4, -3.1, 0))
        else chooseView('platform')
        return
      }
      const offset = id === 'hydrate' || id === 'sediment' ? new THREE.Vector3(8, 4, 17)
        : id === 'rov' || id === 'monitor' ? new THREE.Vector3(3.5, 2.1, 5.2) : new THREE.Vector3(7, 3, 10)
      transition(target.clone().add(offset), target)
    },
    reset() { playing = false; progress = 0; depth = 800; callbacks.onProgress(0); surface.water.visible = waterSides.visible = true; model.setWaterVisible(true); chooseView(step === 'pressure' ? 'dive' : step === 'extraction' ? 'section' : 'overview') },
    zoom(direction) { userNavigated = true; flight = null; controls.enabled = true; camera.position.sub(controls.target).multiplyScalar(direction > 0 ? .86 : 1.16).add(controls.target); controls.update() },
    dispose() {
      if (disposed) return
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', onLost)
      model.dispose(); surface.dispose(); surfaceGeometry.dispose(); waterSideGeometries.forEach(geometry => geometry.dispose()); sideMaterial.dispose()
      depthRuler.traverse(obj => { if (obj instanceof THREE.LineSegments) obj.geometry.dispose() }); rulerMaterial.dispose()
      sun.shadow.map?.dispose(); environment.dispose(); pmrem.dispose(); reflectionSky.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
