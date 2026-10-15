import * as THREE from 'three'

export type MaterialId = 'sphere' | 'axis' | 'N' | 'S' | 'equator' | 'latitude' | 'longitude' | 'tropics' | 'polarCircles' | 'map' | 'stand'

const DEG = Math.PI / 180
const TROPIC = 23 + 26 / 60
const TEXTURE_URL = '/geo-resources-folder/images/Material.002_diffuse.jpg'
const COLORS = { equator: '#ff4058', ordinary: '#a8fff6', tropics: '#ffd447', polar: '#66d9ff' }
let previews: Promise<Partial<Record<MaterialId, string>>> | undefined

/** One offscreen renderer produces real model thumbnails, then releases its context. */
export function getMaterialPreviews(): Promise<Partial<Record<MaterialId, string>>> {
  previews ??= renderPreviews()
  return previews
}

async function renderPreviews(): Promise<Partial<Record<MaterialId, string>>> {
  const result: Partial<Record<MaterialId, string>> = {}
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

    ball(contextBall)
    for (const angle of [-60, -30, 30, 60]) latitude(angle, COLORS.ordinary)
    snapshot('latitude')

    ball(contextBall)
    const meridianMaterial = material(new THREE.MeshBasicMaterial({ color: COLORS.ordinary }))
    for (let angle = 0; angle < 180; angle += 30) {
      const phi = angle * DEG
      curve(Array.from({ length: 97 }, (_, i) => {
        const theta = i / 96 * Math.PI * 2
        return new THREE.Vector3(1.025 * Math.sin(theta) * Math.cos(phi), 1.025 * Math.cos(theta), 1.025 * Math.sin(theta) * Math.sin(phi))
      }), meridianMaterial, 0.017)
    }
    snapshot('longitude')

    ball(contextBall)
    for (const angle of [-TROPIC, TROPIC]) latitude(angle, COLORS.tropics, true)
    snapshot('tropics')

    ball(contextBall)
    for (const angle of [TROPIC - 90, 90 - TROPIC]) latitude(angle, COLORS.polar, true)
    snapshot('polarCircles')

    // The support is empty: learners can recognise the part they are adding.
    rod(0.58, 0.12, -1.36)
    rod(0.12, 0.35, -1.17, brass)
    const tilt = TROPIC * DEG
    const support = new THREE.Group()
    model.add(support)
    const frame = new THREE.Mesh(geometry(new THREE.TorusGeometry(1.14, 0.052, 12, 80, Math.PI)), teal)
    frame.rotation.z = -Math.PI / 2
    support.add(frame)
    for (const direction of [-1, 1]) {
      const collar = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.073, 0.073, 0.16, 20)), brass)
      collar.position.y = direction * 1.09
      support.add(collar)
    }
    support.rotation.z = tilt
    model.rotation.y = -0.22
    snapshot('stand')

    // Never invent continents when the real map cannot be loaded.
    const texture = await loadEarthTexture()
    if (texture) {
      textures.add(texture)
      texture.colorSpace = THREE.SRGBColorSpace
      ball(material(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 })))
      model.rotation.y = -1.1
      snapshot('map')
    }
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

function loadEarthTexture(): Promise<THREE.Texture | null> {
  return new Promise(resolve => {
    const image = new Image()
    const finish = (texture: THREE.Texture | null) => {
      window.clearTimeout(timeout)
      image.onload = null
      image.onerror = null
      if (!texture) image.removeAttribute('src')
      resolve(texture)
    }
    const timeout = window.setTimeout(() => finish(null), 6000)
    image.onload = () => { const texture = new THREE.Texture(image); texture.needsUpdate = true; finish(texture) }
    image.onerror = () => finish(null)
    image.src = TEXTURE_URL
  })
}
