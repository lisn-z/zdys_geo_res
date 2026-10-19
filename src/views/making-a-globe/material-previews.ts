import * as THREE from 'three'
import { LAYER_PREVIEW_ICONS } from './layer-preview-icons'

export type MaterialId = 'sphere' | 'axis' | 'N' | 'S' | 'equator' | 'latitude' | 'longitude' | 'tropics' | 'polarCircles' | 'map' | 'stand' | 'grid'

const DEG = Math.PI / 180
const TROPIC = 23 + 26 / 60
const TEXTURE_URL = '/geo-resources-folder/images/Material.002_diffuse.jpg'
const COLORS = { equator: '#ff4058', ordinary: '#a8fff6', tropics: '#ffd447', polar: '#66d9ff' }
let previews: Promise<Partial<Record<MaterialId, string>>> | undefined

/** Flat map and vector icons accompany the rendered model-part thumbnails. */
export function getMaterialPreviews(): Promise<Partial<Record<MaterialId, string>>> {
  previews ??= renderPreviews()
  return previews
}

async function renderPreviews(): Promise<Partial<Record<MaterialId, string>>> {
  const result: Partial<Record<MaterialId, string>> = { ...LAYER_PREVIEW_ICONS, map: TEXTURE_URL }
  if (typeof document === 'undefined') return result
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  } catch {
    return result
  }
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => { geometries.add(value); return value }
  const material = <T extends THREE.Material>(value: T): T => { materials.add(value); return value }
  const scene = new THREE.Scene()
  const ratio = 160 / 112
  const camera = new THREE.OrthographicCamera(-1.56 * ratio, 1.56 * ratio, 1.56, -1.56, 0.1, 30)
  camera.position.set(3, 1.55, 5)
  camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight('#ffffff', '#7a9295', 2.6))
  const light = new THREE.DirectionalLight('#ffffff', 3)
  light.position.set(-3, 5, 4)
  scene.add(light)
  const model = new THREE.Group()
  scene.add(model)
  renderer.setSize(160, 112, false)
  renderer.setPixelRatio(1)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const ballGeometry = geometry(new THREE.SphereGeometry(1, 48, 32))
  const white = material(new THREE.MeshStandardMaterial({ color: '#f4f7f7', roughness: 0.67 }))
  const contextBall = material(new THREE.MeshStandardMaterial({ color: '#8ba4aa', roughness: 0.9 }))
  const teal = material(new THREE.MeshStandardMaterial({ color: '#225b62', metalness: 0.4, roughness: 0.38 }))
  const brass = material(new THREE.MeshStandardMaterial({ color: '#d5b474', metalness: 0.5, roughness: 0.36 }))
  const ball = (mat: THREE.Material = white) => model.add(new THREE.Mesh(ballGeometry, mat))
  const rod = (radius: number, height: number, y: number, mat: THREE.Material = teal) => {
    const mesh = new THREE.Mesh(geometry(new THREE.CylinderGeometry(radius, radius, height, 24)), mat)
    mesh.position.y = y
    model.add(mesh)
  }
  const curve = (points: THREE.Vector3[], mat: THREE.Material, width = 0.021) => {
    model.add(new THREE.Mesh(geometry(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(8, points.length * 2), width, 6, false)), mat))
  }
  const latitude = (angle: number, color: string, dashed = false) => {
    const radius = 1.025 * Math.cos(angle * DEG)
    const height = 1.025 * Math.sin(angle * DEG)
    const mat = material(new THREE.MeshBasicMaterial({ color }))
    const point = (a: number) => new THREE.Vector3(radius * Math.cos(a), height, radius * Math.sin(a))
    if (dashed) {
      // Visible physical dash segments remain legible at thumbnail size.
      for (let i = 0; i < 24; i++) {
        const start = i * Math.PI / 12
        curve(Array.from({ length: 5 }, (_, j) => point(start + j / 4 * Math.PI / 18)), mat)
      }
    } else {
      curve(Array.from({ length: 97 }, (_, i) => point(i / 96 * Math.PI * 2)), mat)
    }
  }
  const snapshot = (id: MaterialId) => {
    renderer.render(scene, camera)
    result[id] = renderer.domElement.toDataURL('image/png')
    model.clear()
    model.rotation.set(0, 0, 0)
  }

  try {
    ball()
    snapshot('sphere')

    ball()
    rod(0.034, 2.9, 0)
    for (const direction of [-1, 1]) rod(0.075, 0.12, 1.23 * direction, brass)
    const axisGuide = new THREE.Line(
      geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)])),
      material(new THREE.LineDashedMaterial({ color: '#225b62', dashSize: 0.085, gapSize: 0.06, depthTest: false })),
    )
    axisGuide.computeLineDistances()
    axisGuide.renderOrder = 3
    model.add(axisGuide)
    snapshot('axis')

    for (const label of ['N', 'S'] as const) {
      ball()
      const north = label === 'N'
      const pole = new THREE.Mesh(geometry(new THREE.SphereGeometry(0.08, 16, 12)), material(new THREE.MeshBasicMaterial({ color: north ? '#e45b43' : '#377b95', depthTest: false })))
      pole.position.y = north ? 1.02 : -1.02
      pole.renderOrder = 2
      model.add(pole)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 96
      const context = canvas.getContext('2d')
      if (context) {
        context.fillStyle = north ? '#e45b43' : '#377b95'
        context.beginPath()
        context.arc(48, 48, 43, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = '#ffffff'
        context.font = 'bold 61px Arial, sans-serif'
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(label, 48, 51)
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        textures.add(texture)
        const sprite = new THREE.Sprite(material(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })))
        sprite.position.set(0, north ? 1.35 : -1.35, 0)
        sprite.scale.setScalar(0.49)
        sprite.renderOrder = 3
        model.add(sprite)
      }
      snapshot(label)
    }

    ball(contextBall)
    latitude(0, COLORS.equator)
    snapshot('equator')

    const meridianMaterial = material(new THREE.MeshBasicMaterial({ color: COLORS.ordinary }))
    ball(contextBall)
    for (const angle of [-60, -30, 0, 30, 60]) latitude(angle, angle === 0 ? COLORS.equator : COLORS.ordinary)
    for (let angle = 0; angle < 180; angle += 30) {
      const phi = angle * DEG
      curve(Array.from({ length: 97 }, (_, i) => {
        const theta = i / 96 * Math.PI * 2
        return new THREE.Vector3(1.025 * Math.sin(theta) * Math.cos(phi), 1.025 * Math.cos(theta), 1.025 * Math.sin(theta) * Math.sin(phi))
      }), meridianMaterial, 0.017)
    }
    snapshot('grid')

    // Match the assembled globe: brass meridian frame and a tiered wooden base.
    // Leave the frame empty so learners can recognise the separate part.
    const woodDark = material(new THREE.MeshStandardMaterial({ color: '#4a1d21', roughness: 0.38 }))
    const woodWarm = material(new THREE.MeshStandardMaterial({ color: '#60292a', roughness: 0.36 }))
    const standCylinder = (top: number, bottom: number, height: number, y: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(geometry(new THREE.CylinderGeometry(top, bottom, height, 48)), mat)
      mesh.position.y = y
      model.add(mesh)
    }
    standCylinder(0.515, 0.525, 0.055, -1.44, woodDark)
    standCylinder(0.46, 0.5, 0.06, -1.385, woodWarm)
    standCylinder(0.41, 0.455, 0.045, -1.3325, woodDark)
    standCylinder(0.095, 0.115, 0.0175, -1.30125, brass)
    standCylinder(0.0475, 0.065, 0.115, -1.2425, brass)
    const support = new THREE.Group()
    support.position.y = 0.025
    support.rotation.z = -TROPIC * DEG
    model.add(support)
    const frameShape = new THREE.Shape()
    frameShape.absarc(0, 0, 1.24, -Math.PI / 2, Math.PI / 2, false)
    frameShape.absarc(0, 0, 1.18, Math.PI / 2, -Math.PI / 2, true)
    frameShape.closePath()
    const frame = new THREE.Mesh(geometry(new THREE.ExtrudeGeometry(frameShape, { depth: 0.06, bevelEnabled: false, curveSegments: 64 })), brass)
    frame.position.z = -0.03
    support.add(frame)
    const tickMaterial = material(new THREE.MeshBasicMaterial({ color: '#80652f' }))
    const tickPoints: THREE.Vector3[] = []
    for (let angle = -80; angle <= 80; angle += 10) {
      const a = angle * DEG
      for (const radius of [angle % 30 === 0 ? 1.185 : 1.2, 1.235]) {
        tickPoints.push(new THREE.Vector3(radius * Math.cos(a), radius * Math.sin(a), 0.031))
      }
    }
    support.add(new THREE.LineSegments(geometry(new THREE.BufferGeometry().setFromPoints(tickPoints)), tickMaterial))
    for (const direction of [-1, 1]) {
      const collar = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.049, 0.049, 0.14, 20)), brass)
      collar.position.y = direction * 1.13
      support.add(collar)
    }
    // Face the thumbnail towards the camera without changing its rightward lean.
    model.rotation.y = Math.atan2(camera.position.x, camera.position.z)
    snapshot('stand')

  } finally {
    geometries.forEach(value => value.dispose())
    materials.forEach(value => value.dispose())
    textures.forEach(value => value.dispose())
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
  return result
}

