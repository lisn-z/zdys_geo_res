import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createBuilding, createLandscape, createRoad } from './landscape'
import { createSettlementSky } from './sky'
import { copyPlacements, getSettlementStats, snapCoordinate, validatePlacement } from './placement'
import type { CameraView, Landscape, Placement, SceneLabel, SceneOptions, SettlementScene, StudyMode, Tool } from './types'

type LandscapeModel = ReturnType<typeof createLandscape>
type LayoutState = { placements: Placement[]; history: Placement[][] }
type PointerSession = { pointerId: number; startX: number; startY: number; objectId: string | null; moved: boolean }
type CameraTransition = { from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3; started: number }

function disposeObject(object: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points)) return
    geometries.add(child.geometry)
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  geometries.forEach(geometry => geometry.dispose())
  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
}

export function createSettlementScene(host: HTMLElement, options: SceneOptions): SettlementScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#b8d7e8')
  scene.fog = new THREE.Fog('#d6e4ea', 115, 260)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 280)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  scene.environmentIntensity = 0.3
  const canvas = renderer.domElement
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;outline:none;'
  canvas.setAttribute('aria-label', '可旋转、缩放和布置聚落的三维地理场景')
  canvas.tabIndex = 0
  host.appendChild(canvas)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.09
  controls.minDistance = 2.5
  controls.maxDistance = 160
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minPolarAngle = 0.01
  controls.enablePan = true
  controls.screenSpacePanning = false
  controls.target.set(0, 1, 0)

  // Low, warm afternoon sun, with cool sky fill to keep the shaded houses legible.
  scene.add(new THREE.HemisphereLight('#dbe5f0', '#b1a58e', 1.45))
  const sun = new THREE.DirectionalLight('#ffdab0', 1.65)
  sun.position.set(-44, 12, 30)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 28, bottom: -28, near: 1, far: 110 })
  sun.shadow.normalBias = 0.02
  sun.shadow.bias = -0.00025
  sun.shadow.radius = 3
  sun.target.position.set(0, 0, 0)
  scene.add(sun, sun.target)
  const sky = createSettlementSky(renderer, sun)
  scene.add(sky.object)
  scene.environment = sky.update(0)

  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#d5e3e5', roughness: 1, transparent: true, opacity: 0.2, depthWrite: false })
  floorMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 vSettlementFloorDistance;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSettlementFloorDistance = position.xy / vec2(24.0, 18.0);')
    shader.fragmentShader = 'varying vec2 vSettlementFloorDistance;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>', `
      #include <alphamap_fragment>
      diffuseColor.a *= 1.0 - smoothstep(1.02, 1.7, length(vSettlementFloorDistance));
      if (diffuseColor.a < 0.005) discard;
    `)
  }
  floorMaterial.customProgramCacheKey = () => 'settlement-soft-ground-island-v1'
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(96, 72), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.22
  floor.receiveShadow = true
  scene.add(floor)
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 128
  const shadowContext = shadowCanvas.getContext('2d')
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(64, 64, 12, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(76,66,49,0.34)')
    gradient.addColorStop(0.65, 'rgba(76,66,49,0.17)')
    gradient.addColorStop(1, 'rgba(76,66,49,0)')
    shadowContext.fillStyle = gradient
    shadowContext.fillRect(0, 0, 128, 128)
  }
  const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(48, 35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }))
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.y = -1.205
  scene.add(contactShadow)

  const examples = new THREE.Group()
  const buildings = new THREE.Group()
  scene.add(examples, buildings)
  const selection = new THREE.Mesh(new THREE.RingGeometry(0.93, 1.01, 40), new THREE.MeshBasicMaterial({ color: '#b36c37', transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false }))
  selection.rotation.x = -Math.PI / 2
  selection.visible = false
  scene.add(selection)

  const layouts: Record<Landscape, LayoutState> = {
    plain: { placements: [], history: [] }, valley: { placements: [], history: [] },
    river: { placements: [], history: [] }, coast: { placements: [], history: [] },
    dubai: { placements: [], history: [] },
  }
  let landscapeId: Landscape = 'plain'
  let landscape: LandscapeModel = createLandscape(landscapeId)
  scene.add(landscape.group)
  let mode: StudyMode = 'observe'
  let tool: Tool = 'orbit'
  let view: CameraView = 'perspective'
  let growth = 1
  let labelVisible = false
  let constraintVisible = false
  let selectedId: string | null = null
  let nextRotation = 0
  let pointer: PointerSession | null = null
  let ghost: THREE.Group | null = null
  let ghostKind: 'house' | 'road' | null = null
  let ghostPlacement: Placement | null = null
  let transition: CameraTransition | null = null
  let disposed = false
  let frameId = 0
  let lastTime = 0
  let elapsedTime = 0
  let labelsTime = 0
  let previousLabels = ''
  let idCounter = 0
  let ready = false
  let width = 1
  let height = 1
  let resizePending = true
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const cameraDirection = new THREE.Vector3()
  const toLabel = new THREE.Vector3()
  const projected = new THREE.Vector3()
  const exampleEntries: { placement: Placement; object: THREE.Group }[] = []
  const manualObjects = new Map<string, THREE.Group>()
  const roadOriginalPositions = new WeakMap<THREE.BufferGeometry, Float32Array>()

  const layout = () => layouts[landscapeId]
  const activeItems = () => mode === 'build' ? layout().placements : exampleEntries.filter(entry => entry.object.visible).map(entry => entry.placement)
  const reportStats = () => options.onStats(getSettlementStats(activeItems(), landscape.site))
  const saveHistory = () => {
    layout().history.push(copyPlacements(layout().placements))
    if (layout().history.length > 80) layout().history.shift()
  }

  function hideGhost(): void {
    if (ghost) ghost.visible = false
    ghostPlacement = null
  }

  function clearGroup(group: THREE.Group): void {
    for (const child of [...group.children]) {
      group.remove(child)
      disposeObject(child)
    }
  }

  function createPlacedObject(placement: Placement): THREE.Group {
    const variant = [...placement.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const object = placement.kind === 'house' ? createBuilding(landscapeId, variant) : createRoad()
    positionObject(object, placement)
    object.userData.placementId = placement.id
    object.traverse(child => { child.userData.placementId = placement.id })
    return object
  }

  function positionObject(object: THREE.Group, placement: Placement): void {
    const base = placement.kind === 'road' ? landscape.heightAt(placement.x, placement.z) : landscape.site(placement.x, placement.z).height
    object.position.set(placement.x, base - (placement.kind === 'house' ? 0.005 : 0), placement.z)
    object.rotation.y = placement.rotation
    if (placement.kind !== 'road') return
    const cosine = Math.cos(placement.rotation)
    const sine = Math.sin(placement.rotation)
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      const position = child.geometry.getAttribute('position')
      let original = roadOriginalPositions.get(child.geometry)
      if (!original) {
        original = new Float32Array(position.array)
        roadOriginalPositions.set(child.geometry, original)
      }
      for (let index = 0; index < position.count; index++) {
        const localX = original[index * 3]! + child.position.x
        const localZ = original[index * 3 + 2]! + child.position.z
        const x = placement.x + localX * cosine + localZ * sine
        const z = placement.z - localX * sine + localZ * cosine
        position.setY(index, original[index * 3 + 1]! + landscape.heightAt(x, z) - base - 0.004)
      }
      position.needsUpdate = true
      child.geometry.computeVertexNormals()
      child.geometry.computeBoundingBox()
      child.geometry.computeBoundingSphere()
    })
  }

  function updateSelection(): void {
    const selected = mode === 'build' ? layout().placements.find(item => item.id === selectedId) : undefined
    selection.visible = Boolean(selected) && tool !== 'orbit'
    if (selected) selection.position.set(selected.x, landscape.heightAt(selected.x, selected.z) + 0.08, selected.z)
  }

  function rebuildBuildings(): void {
    const activeIds = new Set(layout().placements.map(item => item.id))
    for (const [id, object] of manualObjects) {
      if (activeIds.has(id)) continue
      buildings.remove(object)
      disposeObject(object)
      manualObjects.delete(id)
    }
    for (const placement of layout().placements) {
      let object = manualObjects.get(placement.id)
      if (!object) {
        object = createPlacedObject(placement)
        manualObjects.set(placement.id, object)
        buildings.add(object)
      }
      positionObject(object, placement)
    }
    buildings.visible = mode === 'build'
    updateSelection()
    reportStats()
  }

  function applyGrowth(): void {
    const counts = {
      house: exampleEntries.filter(entry => entry.placement.kind === 'house').length,
      road: exampleEntries.filter(entry => entry.placement.kind === 'road').length,
    }
    const seen = { house: 0, road: 0 }
    for (const entry of exampleEntries) {
      const kind = entry.placement.kind
      const initialCount = kind === 'road' ? counts.road : 0
      entry.object.visible = seen[kind]++ < Math.round(initialCount + (counts[kind] - initialCount) * growth)
    }
    if (mode === 'observe') reportStats()
  }

  function rebuildExamples(): void {
    clearGroup(examples)
    exampleEntries.length = 0
    const ordered = [...landscape.samples].sort((a, b) => a.kind === 'road' && b.kind === 'road'
      ? a.x * a.x + a.z * a.z - b.x * b.x - b.z * b.z : 0)
    for (const placement of ordered) {
      const object = createPlacedObject(placement)
      exampleEntries.push({ placement, object })
      examples.add(object)
    }
    examples.visible = mode === 'observe'
    applyGrowth()
  }

  function syncControls(): void {
    const enabled = mode === 'observe' || tool === 'orbit'
    if (controls.enabled && !enabled) {
      // Clear residual orbit damping without changing the view at lock time.
      const position = camera.position.clone(), target = controls.target.clone()
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      camera.position.copy(position); controls.target.copy(target)
      controls.update()
      controls.enableDamping = damping
    }
    controls.enabled = enabled
    canvas.style.cursor = controls.enabled ? 'grab' : tool === 'erase' ? 'crosshair' : 'copy'
    updateSelection()
  }

  function rayAtClient(clientX: number, clientY: number): boolean {
    const bounds = canvas.getBoundingClientRect()
    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom || bounds.width <= 0 || bounds.height <= 0) return false
    ndc.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1)
    camera.updateMatrixWorld()
    raycaster.setFromCamera(ndc, camera)
    return true
  }

  function placementAtClient(clientX: number, clientY: number, kind: 'house' | 'road', id = '', rotation = nextRotation): Placement | null {
    if (!rayAtClient(clientX, clientY)) return null
    const hit = raycaster.intersectObject(landscape.terrain, true)[0]
    if (!hit) return null
    return { id, kind, x: snapCoordinate(hit.point.x), z: snapCoordinate(hit.point.z), rotation }
  }

  function pickedId(clientX: number, clientY: number): string | null {
    if (!rayAtClient(clientX, clientY)) return null
    const hit = raycaster.intersectObjects(buildings.children, true)[0]
    return hit?.object.userData.placementId as string | undefined ?? null
  }

  function ensureGhost(kind: 'house' | 'road'): THREE.Group {
    if (ghost && ghostKind === kind) return ghost
    if (ghost) { scene.remove(ghost); disposeObject(ghost) }
    ghost = kind === 'house' ? createBuilding(landscapeId, 0) : createRoad()
    // Dispose original materials before substituting the transparent preview materials.
    const oldMaterials = new Set<THREE.Material>()
    ghost.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) oldMaterials.add(material)
      child.material = new THREE.MeshStandardMaterial({ color: '#65a487', transparent: true, opacity: 0.52, roughness: 0.8, depthWrite: false })
      child.castShadow = false
      child.receiveShadow = false
    })
    const oldTextures = new Set<THREE.Texture>()
    for (const material of oldMaterials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) oldTextures.add(value)
    oldMaterials.forEach(material => material.dispose())
    oldTextures.forEach(texture => texture.dispose())
    const tile = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.72), new THREE.MeshBasicMaterial({ color: '#65a487', transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }))
    tile.rotation.x = -Math.PI / 2
    tile.position.y = 0.035
    ghost.add(tile)
    ghostKind = kind
    scene.add(ghost)
    return ghost
  }

  function showGhost(clientX: number, clientY: number, kind: 'house' | 'road', moving?: Placement): void {
    const candidate = placementAtClient(clientX, clientY, kind, moving?.id, moving?.rotation ?? nextRotation)
    if (!candidate) { hideGhost(); return }
    const result = validatePlacement(candidate, layout().placements, landscape.site, moving?.id)
    const object = ensureGhost(kind)
    ghostPlacement = candidate
    object.visible = true
    object.position.set(candidate.x, Math.max(result.height, 0.25) + 0.055, candidate.z)
    object.rotation.y = candidate.rotation
    object.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) material.color.set(result.valid ? '#5b9e7b' : '#d55d4e')
      }
    })
  }

  function place(candidate: Placement): void {
    const result = validatePlacement(candidate, layout().placements, landscape.site)
    if (!result.valid) { options.onFeedback(result.reason || '这里不适合建设，请选择平缓的陆地。', false); return }
    saveHistory()
    candidate.id = `manual-${landscapeId}-${++idCounter}`
    layout().placements.push(candidate)
    selectedId = candidate.id
    rebuildBuildings()
    options.onFeedback(candidate.kind === 'house' ? '房屋已落位。试着观察邻近水源与地形的关系。' : '道路已铺设。继续连接相邻的空格。', true)
  }

  function endPointer(): void {
    if (pointer && canvas.hasPointerCapture(pointer.pointerId)) canvas.releasePointerCapture(pointer.pointerId)
    pointer = null
    hideGhost()
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || !event.isPrimary || mode !== 'build' || tool === 'orbit') return
    event.preventDefault()
    pointer = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, objectId: pickedId(event.clientX, event.clientY), moved: false }
    canvas.setPointerCapture(event.pointerId)
    canvas.focus({ preventScroll: true })
  }

  function onPointerMove(event: PointerEvent): void {
    if (mode !== 'build' || tool === 'orbit' || tool === 'erase' || !event.isPrimary) return
    if (pointer && pointer.pointerId !== event.pointerId) return
    if (pointer && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 6) pointer.moved = true
    const moving = pointer?.objectId ? layout().placements.find(item => item.id === pointer?.objectId) : undefined
    if (moving && !pointer?.moved) { hideGhost(); return }
    showGhost(event.clientX, event.clientY, moving?.kind ?? tool, moving)
  }

  function onPointerUp(event: PointerEvent): void {
    if (!pointer || pointer.pointerId !== event.pointerId) return
    const session = pointer
    const moved = session.moved || Math.hypot(event.clientX - session.startX, event.clientY - session.startY) > 6
    if (mode !== 'build' || tool === 'orbit') { endPointer(); return }
    if (tool === 'erase') {
      if (!moved && session.objectId) {
        saveHistory()
        layout().placements = layout().placements.filter(item => item.id !== session.objectId)
        if (selectedId === session.objectId) selectedId = null
        rebuildBuildings()
        options.onFeedback('已移除，可点击撤销恢复。', true)
      }
    } else if (session.objectId) {
      const original = layout().placements.find(item => item.id === session.objectId)
      if (original && moved) {
        const candidate = placementAtClient(event.clientX, event.clientY, original.kind, original.id, original.rotation)
        if (candidate) {
          const result = validatePlacement(candidate, layout().placements, landscape.site, original.id)
          if (!result.valid) options.onFeedback(result.reason || '无法移动到这里，请选择平缓的空地。', false)
          else if (candidate.x !== original.x || candidate.z !== original.z) {
            saveHistory()
            Object.assign(original, candidate)
            selectedId = original.id
            rebuildBuildings()
            options.onFeedback('位置已调整。', true)
          }
        }
      } else if (original) {
        selectedId = original.id
        nextRotation = original.rotation
        updateSelection()
        options.onFeedback('已选中。可以拖动移动，或点击旋转调整朝向。', true)
      }
    } else if (!moved && (tool === 'house' || tool === 'road')) {
      const candidate = placementAtClient(event.clientX, event.clientY, tool)
      if (candidate) place(candidate)
      else options.onFeedback('请在地形范围内选择建设位置。', false)
    }
    endPointer()
  }

  function onPointerLeave(): void { if (!pointer) hideGhost() }
  function preventContext(event: Event): void { event.preventDefault() }
  function cancelTransition(): void { transition = null }
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', endPointer)
  canvas.addEventListener('lostpointercapture', endPointer)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('contextmenu', preventContext)
  canvas.addEventListener('selectstart', preventContext)
  controls.addEventListener('start', cancelTransition)

  function cameraPose(nextView: CameraView): { position: THREE.Vector3; target: THREE.Vector3 } {
    if (nextView === 'ground') return { position: new THREE.Vector3(15, 5.8, 27), target: new THREE.Vector3(0, 1.2, -3) }
    const framingPoints: THREE.Vector3[] = []
    function appendBox(box: THREE.Box3, matrix?: THREE.Matrix4): void {
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z)
        if (matrix) point.applyMatrix4(matrix)
        framingPoints.push(point)
      }
    }
    if (landscapeId === 'dubai') {
      // A single box puts the landmark's 9.5-unit height at every corner of the
      // 36 x 24 terrain. Fit each real mesh instead, including unrevealed future
      // architecture: construction clips shaders without scaling its geometry.
      const excluded = new Set(['persistent-final-evolution-framing-bounds', 'progress-driven-construction', 'sequential-building-foundations'])
      function collect(object: THREE.Object3D): void {
        if (excluded.has(object.name) || object.userData.evolution?.kind === 'ship') return
        if (object instanceof THREE.InstancedMesh) appendBox(new THREE.Box3().setFromObject(object))
        else if (object instanceof THREE.Mesh) {
          if (!object.geometry.boundingBox) object.geometry.computeBoundingBox()
          if (object.geometry.boundingBox) appendBox(object.geometry.boundingBox, object.matrixWorld)
        }
        // Do not skip invisible objects: future buildings must frame identically
        // at progress 0 and 1. Temporary scaffolding and the old proxy are excluded above.
        for (const child of object.children) collect(child)
      }
      landscape.group.updateWorldMatrix(true, true)
      collect(landscape.group)
      const placements = mode === 'observe' ? examples : buildings
      placements.updateWorldMatrix(true, true)
      collect(placements)
    } else {
      const landscapeBounds = new THREE.Box3().setFromObject(landscape.group)
      landscapeBounds.expandByObject(mode === 'observe' ? examples : buildings)
      appendBox(landscapeBounds)
    }
    const bounds = new THREE.Box3().setFromPoints(framingPoints)
    const target = bounds.getCenter(new THREE.Vector3())
    const aspect = Math.max(camera.aspect, 0.4)
    const tangent = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const direction = nextView === 'overhead' ? new THREE.Vector3(0, 1, 0.0001).normalize() : new THREE.Vector3(0.22, 0.65, 1).normalize()
    const right = new THREE.Vector3(direction.z, 0, -direction.x).normalize()
    const up = new THREE.Vector3().crossVectors(direction, right)
    const corners: { horizontal: number; vertical: number; depth: number }[] = []
    for (const point of framingPoints) {
      const corner = point.clone().sub(target)
      corners.push({ horizontal: corner.dot(right), vertical: corner.dot(up), depth: corner.dot(direction) })
    }
    // Solve distance and screen centering together. Keeping the target fixed above
    // the terrain leaves a large empty sky while only the near front edge touches
    // the viewport. This uses the current landscape's real bounds and all the host.
    function fitIntervals(distance: number) {
      let left = -Infinity, right = Infinity, bottom = -Infinity, top = Infinity
      for (const corner of corners) {
        const halfHeight = (distance - corner.depth) * tangent * 0.95
        const halfWidth = halfHeight * aspect
        left = Math.max(left, corner.horizontal - halfWidth)
        right = Math.min(right, corner.horizontal + halfWidth)
        bottom = Math.max(bottom, corner.vertical - halfHeight)
        top = Math.min(top, corner.vertical + halfHeight)
      }
      return { left, right, bottom, top, fits: left <= right && bottom <= top }
    }
    let near = Math.max(controls.minDistance, ...corners.map(corner => corner.depth + 0.2))
    let far = controls.maxDistance
    for (let step = 0; step < 36; step++) {
      const mid = (near + far) / 2
      if (fitIntervals(mid).fits) far = mid
      else near = mid
    }
    const distance = far
    const interval = fitIntervals(distance)
    target.addScaledVector(right, (interval.left + interval.right) / 2)
    target.addScaledVector(up, (interval.bottom + interval.top) / 2)
    return { position: direction.multiplyScalar(distance).add(target), target }
  }

  function moveCamera(nextView: CameraView, immediate = false): void {
    const pose = cameraPose(nextView)
    if (immediate) {
      transition = null
      camera.position.copy(pose.position)
      controls.target.copy(pose.target)
      controls.update()
      return
    }
    transition = { from: camera.position.clone(), to: pose.position, targetFrom: controls.target.clone(), targetTo: pose.target, started: performance.now() }
    hideGhost()
  }

  function applyViewportSize(): void {
    if (disposed || !resizePending) return
    resizePending = false
    const nextWidth = Math.max(1, host.clientWidth)
    const nextHeight = Math.max(1, host.clientHeight)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const ratioChanged = renderer.getPixelRatio() !== pixelRatio
    if (width === nextWidth && height === nextHeight && !ratioChanged) return
    width = nextWidth
    height = nextHeight
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (ratioChanged) renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    previousLabels = ''
  }
  function resize(): void {
    if (disposed) return
    // A ResizeObserver must not clear the drawing buffer between animation frames.
    // Coalesce resize bursts; update size, projection and pixels in the next render.
    resizePending = true
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  window.addEventListener('resize', resize)
  applyViewportSize()
  moveCamera(view, true)

  function emitLabels(): void {
    const labels: SceneLabel[] = []
    if (labelVisible) {
      camera.getWorldDirection(cameraDirection)
      for (const label of landscape.labels) {
        toLabel.copy(label.position).sub(camera.position)
        projected.copy(label.position).project(camera)
        const visible = toLabel.dot(cameraDirection) > 0 && projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 0.94 && Math.abs(projected.y) < 0.92
        labels.push({ id: label.id, text: label.text, x: Math.round((projected.x + 1) * width / 2), y: Math.round((1 - projected.y) * height / 2), visible })
      }
    }
    const signature = JSON.stringify(labels)
    if (signature !== previousLabels) { previousLabels = signature; options.onLabels(labels) }
  }

  function animate(now: number): void {
    frameId = 0
    if (disposed || document.hidden) return
    applyViewportSize()
    const delta = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now
    elapsedTime += delta
    if (transition) {
      const progress = Math.min(1, (now - transition.started) / 750)
      const smooth = progress * progress * (3 - 2 * progress)
      camera.position.lerpVectors(transition.from, transition.to, smooth)
      controls.target.lerpVectors(transition.targetFrom, transition.targetTo, smooth)
      if (progress === 1) transition = null
    }
    controls.update()
    scene.environment = sky.update(elapsedTime)
    landscape.update(elapsedTime)
    renderer.render(scene, camera)
    if (now - labelsTime >= 100) { labelsTime = now; emitLabels() }
    if (!ready) { ready = true; options.onReady() }
    frameId = requestAnimationFrame(animate)
  }

  function onVisibilityChange(): void {
    lastTime = 0
    if (document.hidden) {
      if (frameId) cancelAnimationFrame(frameId)
      frameId = 0
      if (transition) {
        transition.from.copy(camera.position)
        transition.targetFrom.copy(controls.target)
      }
    } else {
      resizePending = true
      if (transition) transition.started = performance.now()
      if (!frameId) frameId = requestAnimationFrame(animate)
    }
  }
  function onContextLost(event: Event): void {
    event.preventDefault()
    options.onError('三维绘图暂时中断，请稍后重试或刷新页面。')
  }
  function onContextRestored(): void { options.onReady() }
  document.addEventListener('visibilitychange', onVisibilityChange)
  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)
  landscape.constraints.visible = constraintVisible
  rebuildExamples()
  rebuildBuildings()
  syncControls()
  frameId = requestAnimationFrame(animate)

  return {
    setLandscape(id) {
      if (disposed || id === landscapeId) return
      endPointer()
      scene.remove(landscape.group)
      landscape.dispose()
      clearGroup(buildings)
      manualObjects.clear()
      landscapeId = id
      if (ghost) { scene.remove(ghost); disposeObject(ghost); ghost = null; ghostKind = null }
      landscape = createLandscape(id)
      scene.add(landscape.group)
      landscape.constraints.visible = constraintVisible
      selectedId = null
      rebuildExamples()
      rebuildBuildings()
      moveCamera(view)
      previousLabels = ''
      emitLabels()
    },
    setMode(nextMode) {
      if (disposed) return
      endPointer()
      mode = nextMode
      examples.visible = mode === 'observe'
      buildings.visible = mode === 'build'
      syncControls()
      reportStats()
    },
    setTool(nextTool) {
      if (disposed) return
      endPointer()
      tool = nextTool
      selectedId = null
      syncControls()
    },
    setView(nextView) {
      if (disposed) return
      endPointer()
      view = nextView
      moveCamera(view)
    },
    focusLabel(id) {
      if (disposed || landscapeId !== 'dubai') return
      const label = landscape.labels.find(item => item.id === id)
      if (!label) return
      endPointer(); hideGhost()
      const distance = id === 'caravan' ? 8.5 : 4.2
      const target = label.position.clone()
      const direction = new THREE.Vector3(.55, .52, 1).normalize()
      view = 'ground'
      transition = { from: camera.position.clone(), to: target.clone().addScaledVector(direction, distance), targetFrom: controls.target.clone(), targetTo: target, started: performance.now() }
    },
    setLabels(visible) { labelVisible = visible; emitLabels() },
    setConstraints(visible) { constraintVisible = visible; landscape.constraints.visible = visible },
    setGrowth(value) {
      growth = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 1, 0, 1)
      landscape.setGrowth?.(growth)
      applyGrowth()
      emitLabels()
    },
    placeAtClient(x, y, kind) {
      if (disposed || mode !== 'build') return
      endPointer()
      const candidate = placementAtClient(x, y, kind)
      if (candidate) place(candidate)
      else options.onFeedback('请把建筑拖到地形范围内。', false)
    },
    rotatePlacement() {
      if (disposed || mode !== 'build') return
      const selected = layout().placements.find(item => item.id === selectedId)
      if (selected) {
        saveHistory()
        selected.rotation = (selected.rotation + Math.PI / 2) % (Math.PI * 2)
        nextRotation = selected.rotation
        rebuildBuildings()
        options.onFeedback('已旋转 90°。', true)
      } else {
        nextRotation = (nextRotation + Math.PI / 2) % (Math.PI * 2)
        if (ghost && ghostPlacement) { ghost.rotation.y = nextRotation; ghostPlacement.rotation = nextRotation }
        options.onFeedback('下一栋建筑的朝向已旋转 90°。', true)
      }
    },
    undo() {
      if (disposed || mode !== 'build') return
      const prior = layout().history.pop()
      if (!prior) { options.onFeedback('还没有可以撤销的操作。', false); return }
      endPointer()
      layout().placements = prior
      selectedId = null
      rebuildBuildings()
      options.onFeedback('已撤销上一步。', true)
    },
    clear() {
      if (disposed || mode !== 'build' || layout().placements.length === 0) return
      endPointer()
      saveHistory()
      layout().placements = []
      selectedId = null
      rebuildBuildings()
      options.onFeedback('当前地形的布局已清空，可点击撤销恢复。', true)
    },
    reset() { if (!disposed) { view = 'perspective'; moveCamera(view) } },
    zoom(direction) {
      if (disposed || !Number.isFinite(direction)) return
      transition = null
      const offset = camera.position.clone().sub(controls.target)
      offset.setLength(THREE.MathUtils.clamp(offset.length() * (direction > 0 ? 0.82 : 1.22), controls.minDistance, controls.maxDistance))
      camera.position.copy(controls.target).add(offset)
      controls.update()
    },
    dispose() {
      if (disposed) return
      disposed = true
      endPointer()
      if (frameId) cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', endPointer)
      canvas.removeEventListener('lostpointercapture', endPointer)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('contextmenu', preventContext)
      canvas.removeEventListener('selectstart', preventContext)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      controls.removeEventListener('start', cancelTransition)
      controls.dispose()
      scene.remove(landscape.group)
      landscape.dispose()
      scene.remove(sky.object)
      disposeObject(scene)
      sun.shadow.dispose()
      scene.environment = null
      sky.dispose()
      renderer.renderLists.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
