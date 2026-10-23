import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  LANDFORMS,
  PALETTE,
  WORLD,
  landformAt,
  landformById,
  type LandformId,
} from './seafloor-data.ts'
import {
  createCutFacesGeometry,
  createTerrainGeometry,
  createWaterGeometry,
  terrainHeight,
} from './seafloor-geometry.ts'

export type ViewId = 'oblique' | 'section' | 'dive'

export interface OverlayItem {
  id: string
  x: number
  y: number
  visible: boolean
}

export interface SeafloorCallbacks {
  onOverlay?: (items: OverlayItem[]) => void
  onUserInteract?: () => void
}

export interface SeafloorController {
  setView(view: ViewId): void
  flyToStop(fx: number | null, durationMs: number): void
  setSelected(id: LandformId | null): void
  setLabelsVisible(visible: boolean): void
  setRulerVisible(visible: boolean): void
  pick(clientX: number, clientY: number, rect: DOMRect): LandformId | null
  resize(width: number, height: number): void
  dispose(): void
}

const RULER_FX = 0.045
const RULER_POINTS: ReadonlyArray<readonly [string, number]> = [
  ['ruler-top', 1.6],
  ['ruler-shelf', -0.6],
  ['ruler-ridge', -2.2],
  ['ruler-slope', -3.0],
  ['ruler-trench', -7.5],
  ['ruler-bottom', WORLD.bottom],
]

const DEFAULT_EYE = new THREE.Vector3(WORLD.length * 0.5 - 8, 11, 24)
const DEFAULT_TARGET = new THREE.Vector3(WORLD.length * 0.52, -2.2, 0)
const SECTION_EYE = new THREE.Vector3(WORLD.length * 0.5, -1.2, 34)
const SECTION_TARGET = new THREE.Vector3(WORLD.length * 0.5, -3, 0)
const DIVE_OFFSET = new THREE.Vector3(2.6, 2.1, 4.4)
const OBLIQUE_STOP_OFFSET = new THREE.Vector3(-6.5, 7.5, 14)
const FOG_NEAR_SURFACE = 40
const FOG_FAR_SURFACE = 110
const FOG_NEAR_UNDER = 16
const FOG_FAR_UNDER = 55
const WATER_OPACITY_SURFACE = 0.34
const WATER_OPACITY_UNDER = 0.18
const LABEL_LIFT = 0.6

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

interface Flight {
  elapsed: number
  duration: number
  fromEye: THREE.Vector3
  toEye: THREE.Vector3
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
}

export function createSeafloorScene(
  host: HTMLElement,
  callbacks: SeafloorCallbacks = {},
): SeafloorController {
  const scene = new THREE.Scene()
  const fog = new THREE.Fog(PALETTE.fog, FOG_NEAR_SURFACE, FOG_FAR_SURFACE)
  scene.fog = fog

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 220)
  camera.position.copy(DEFAULT_EYE)

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.06
  renderer.setClearColor(PALETTE.fog, 1)
  host.appendChild(renderer.domElement)

  let contextLost = false
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    contextLost = true
  })
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false
  })

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 4
  controls.maxDistance = 80
  controls.target.copy(DEFAULT_TARGET)
  camera.lookAt(DEFAULT_TARGET)

  scene.add(new THREE.HemisphereLight(0xbfe3ef, 0x2a2018, 0.9))
  const rake = new THREE.DirectionalLight(0xfff2d8, 1.7)
  rake.position.set(-16, 5, 9)
  scene.add(rake)
  const fill = new THREE.DirectionalLight(0x88aacc, 0.35)
  fill.position.set(10, 12, -8)
  scene.add(fill)

  const terrainMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
  })
  const terrain = new THREE.Mesh(createTerrainGeometry(), terrainMaterial)
  scene.add(terrain)

  const cut = new THREE.Mesh(
    createCutFacesGeometry(),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  )
  scene.add(cut)

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    transparent: true,
    opacity: WATER_OPACITY_SURFACE,
    roughness: 0.18,
    metalness: 0.05,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const water = new THREE.Mesh(createWaterGeometry(), waterMaterial)
  water.position.y = WORLD.waterY
  scene.add(water)

  const boat = new THREE.Group()
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.32, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.7 }),
  )
  hull.position.y = 0.16
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.34),
    new THREE.MeshStandardMaterial({ color: 0xb9483f, roughness: 0.6 }),
  )
  cabin.position.set(-0.2, 0.45, 0)
  boat.add(hull, cabin)
  boat.position.set(WORLD.length * 0.72, WORLD.waterY, -WORLD.width * 0.28)
  scene.add(boat)

  const highlight = new THREE.Mesh(
    new THREE.BoxGeometry(1, 10, WORLD.width),
    new THREE.MeshBasicMaterial({
      color: 0x7ec3e0,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    }),
  )
  highlight.visible = false
  scene.add(highlight)

  let view: ViewId = 'oblique'
  let selected: LandformId | null = null
  let labelsVisible = true
  let rulerVisible = true
  let flight: Flight | null = null
  let underwaterMix = 0
  let viewWidth = 1
  let viewHeight = 1
  let frameId = 0
  let disposed = false
  let lastTime = performance.now()

  const fogSurface = new THREE.Color(PALETTE.fog)
  const fogUnder = new THREE.Color(PALETTE.underwater)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const scratch = new THREE.Vector3()

  const labelAnchors = LANDFORMS.map(
    (def) =>
      new THREE.Vector3(
        def.anchorFx * WORLD.length,
        terrainHeight(def.anchorFx, def.anchorFz) + LABEL_LIFT,
        def.anchorFz * (WORLD.width / 2),
      ),
  )

  function focusPoint(fx: number | null): THREE.Vector3 {
    if (fx === null) {
      return new THREE.Vector3(WORLD.length * WORLD.shoreFx, 0.3, 0)
    }
    return new THREE.Vector3(fx * WORLD.length, terrainHeight(fx, 0) + 0.5, 0)
  }

  function selectedFx(): number {
    return selected ? landformById(selected).anchorFx : landformById('trench').anchorFx
  }

  function beginFlight(toEye: THREE.Vector3, toTarget: THREE.Vector3, durationMs: number): void {
    flight = {
      elapsed: 0,
      duration: Math.max(1, durationMs),
      fromEye: camera.position.clone(),
      toEye,
      fromTarget: controls.target.clone(),
      toTarget,
    }
  }

  function applyView(durationMs: number): void {
    if (view === 'section') {
      controls.minDistance = 4
      beginFlight(SECTION_EYE.clone(), SECTION_TARGET.clone(), durationMs)
      return
    }
    if (view === 'dive') {
      controls.minDistance = 1.2
      const fxF = selectedFx()
      const target = focusPoint(fxF)
      target.y = terrainHeight(fxF, 0) + LABEL_LIFT
      beginFlight(target.clone().add(DIVE_OFFSET), target, durationMs)
      return
    }
    controls.minDistance = 4
    beginFlight(DEFAULT_EYE.clone(), DEFAULT_TARGET.clone(), durationMs)
  }

  controls.addEventListener('start', () => {
    flight = null
    callbacks.onUserInteract?.()
  })

  function pushOverlay(): void {
    if (!callbacks.onOverlay) {
      return
    }
    camera.updateMatrixWorld()
    const items: OverlayItem[] = []
    const project = (id: string, x: number, y: number, z: number, gate: boolean): void => {
      scratch.set(x, y, z).project(camera)
      const inFront = scratch.z > -1 && scratch.z < 1 && Math.abs(scratch.x) < 1.05 && Math.abs(scratch.y) < 1.05
      items.push({
        id,
        x: (scratch.x + 1) * viewWidth / 2,
        y: (1 - scratch.y) * viewHeight / 2,
        visible: gate && inFront,
      })
    }
    for (let i = 0; i < LANDFORMS.length; i++) {
      const def = LANDFORMS[i]!
      const anchor = labelAnchors[i]!
      project('label-' + def.id, anchor.x, anchor.y, anchor.z, labelsVisible)
    }
    for (const [id, y] of RULER_POINTS) {
      project(id, RULER_FX * WORLD.length, y, WORLD.width / 2 + 0.05, rulerVisible)
    }
    callbacks.onOverlay(items)
  }

  function frame(now: number): void {
    if (disposed) {
      return
    }
    frameId = requestAnimationFrame(frame)
    const dt = Math.min(0.1, (now - lastTime) / 1000)
    lastTime = now

    if (contextLost) {
      return
    }

    if (flight) {
      flight.elapsed += dt * 1000
      const k = easeInOut(Math.min(1, flight.elapsed / flight.duration))
      camera.position.lerpVectors(flight.fromEye, flight.toEye, k)
      controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k)
      if (flight.elapsed >= flight.duration) {
        flight = null
      }
    }

    const fx = THREE.MathUtils.clamp(camera.position.x / WORLD.length, 0, 1)
    const fz = THREE.MathUtils.clamp(camera.position.z / (WORLD.width / 2), -1, 1)
    const floor = terrainHeight(fx, fz) + 0.35
    if (camera.position.y < floor) {
      camera.position.y = floor
      camera.lookAt(controls.target)
    }

    controls.update()

    controls.target.x = THREE.MathUtils.clamp(controls.target.x, 0, WORLD.length)
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, WORLD.bottom, 2)
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -WORLD.width / 2, WORLD.width / 2)

    if (viewWidth < 2 || viewHeight < 2) {
      return
    }

    const under =
      camera.position.y < WORLD.waterY && camera.position.x > WORLD.length * WORLD.shoreFx
        ? 1
        : 0
    underwaterMix += (under - underwaterMix) * Math.min(1, dt * 4)
    if (Math.abs(underwaterMix - under) < 0.002) {
      underwaterMix = under
    }
    fog.color.copy(fogSurface).lerp(fogUnder, underwaterMix)
    fog.near = FOG_NEAR_SURFACE - (FOG_NEAR_SURFACE - FOG_NEAR_UNDER) * underwaterMix
    fog.far = FOG_FAR_SURFACE - (FOG_FAR_SURFACE - FOG_FAR_UNDER) * underwaterMix
    renderer.setClearColor(fog.color, 1)
    waterMaterial.opacity =
      WATER_OPACITY_SURFACE - (WATER_OPACITY_SURFACE - WATER_OPACITY_UNDER) * underwaterMix

    renderer.render(scene, camera)
    pushOverlay()
  }

  function sizeFromHost(): void {
    const rect = host.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      resize(rect.width, rect.height)
    }
  }

  function resize(width: number, height: number): void {
    if (disposed) {
      return
    }
    if (width <= 0 || height <= 0) {
      return
    }
    if (Math.round(width) === viewWidth && Math.round(height) === viewHeight) {
      return
    }
    viewWidth = Math.round(width)
    viewHeight = Math.round(height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(viewWidth, viewHeight, false)
    camera.aspect = viewWidth / viewHeight
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }

  sizeFromHost()
  frameId = requestAnimationFrame(frame)

  return {
    setView(next) {
      if (disposed) {
        return
      }
      view = next
      applyView(1100)
    },
    flyToStop(fx, durationMs) {
      if (disposed) {
        return
      }
      if (view === 'section') {
        return
      }
      if (view === 'dive') {
        const fxF = fx ?? selectedFx()
        const target = focusPoint(fxF)
        target.y = terrainHeight(fxF, 0) + LABEL_LIFT
        beginFlight(target.clone().add(DIVE_OFFSET), target, durationMs)
        return
      }
      const target = focusPoint(fx)
      beginFlight(target.clone().add(OBLIQUE_STOP_OFFSET), target, durationMs)
    },
    setSelected(id) {
      if (disposed) {
        return
      }
      selected = id
      if (!id) {
        highlight.visible = false
        return
      }
      const def = landformById(id)
      highlight.scale.x = (def.x1 - def.x0) * WORLD.length
      highlight.position.set(((def.x0 + def.x1) / 2) * WORLD.length, -4, 0)
      highlight.visible = true
    },
    setLabelsVisible(visible) {
      if (disposed) {
        return
      }
      labelsVisible = visible
    },
    setRulerVisible(visible) {
      if (disposed) {
        return
      }
      rulerVisible = visible
    },
    pick(clientX, clientY, rect) {
      if (disposed) {
        return null
      }
      if (rect.width < 1 || rect.height < 1) {
        return null
      }
      pointer.set(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObject(terrain, false)[0]
      if (!hit) {
        return null
      }
      return landformAt(hit.point.x / WORLD.length)
    },
    resize,
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      cancelAnimationFrame(frameId)
      controls.dispose()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) {
          mesh.geometry.dispose()
        }
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose())
        } else {
          material?.dispose()
        }
      })
      renderer.dispose()
      renderer.forceContextLoss()
      if (renderer.domElement.parentElement === host) {
        host.removeChild(renderer.domElement)
      }
    },
  }
}
