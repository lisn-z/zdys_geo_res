import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { calculateOutput } from './physics'
import type { Guide, Guides, PartId, PhotovoltaicScene, SceneState, ViewMode } from './types'

const PARTS: PartId[] = ['stand', 'panel', 'lamp', 'battery', 'positive', 'negative']
const DEG = Math.PI / 180
const PANEL_CENTER = new THREE.Vector3(0, 3.2, 0)
const LAMP_CENTER = new THREE.Vector3(0, 5.1, 0)
const BATTERY_CENTER = new THREE.Vector3(1.02, .36, .5)
const SUN_TEXTURE_URL = '/geo-resources-folder/images/sun.png'
const DIRECT_LIGHT_INTENSITY = 1.65
const SUN_RADIUS = .28

/** A low-voltage classroom apparatus; dimensions are illustrative. */
export function createPhotovoltaicScene(host: HTMLElement, onGuides: (guides: Guides) => void): PhotovoltaicScene {
  const scene = new THREE.Scene()
  let disposed = false
  scene.background = new THREE.Color('#bfc8bc')
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .9
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;'
  renderer.domElement.setAttribute('aria-label', '可旋转观察的简易光伏发电装置')
  host.appendChild(renderer.domElement)
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 180)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(.05, 2.65, 0)
  camera.position.set(8.3, 7, 9.8)
  controls.enableDamping = true
  controls.dampingFactor = .09
  controls.minDistance = 7.5
  controls.maxDistance = 22
  controls.minPolarAngle = .04
  controls.maxPolarAngle = Math.PI * .49
  controls.enablePan = false

  const hemisphere = new THREE.HemisphereLight('#f6f9ff', '#b7b19c', .8)
  scene.add(hemisphere)
  const sunlight = new THREE.DirectionalLight('#fff4dc', DIRECT_LIGHT_INTENSITY)
  sunlight.castShadow = true
  sunlight.shadow.mapSize.set(2048, 2048)
  sunlight.shadow.camera.left = -9
  sunlight.shadow.camera.right = 9
  sunlight.shadow.camera.top = 9
  sunlight.shadow.camera.bottom = -9
  sunlight.shadow.camera.near = .5
  sunlight.shadow.camera.far = 40
  sunlight.shadow.bias = -.00012
  sunlight.shadow.normalBias = .025
  sunlight.shadow.radius = 3
  scene.add(sunlight, sunlight.target)
  const fill = new THREE.DirectionalLight('#e5edff', .35)
  fill.position.set(-4, 8, -6)
  scene.add(fill)

  const materials = new Set<THREE.Material>()
  const geometries = new Set<THREE.BufferGeometry>()
  const textures = new Set<THREE.Texture>()
  function geometry<T extends THREE.BufferGeometry>(g: T) { geometries.add(g); return g }
  function material(options: THREE.MeshStandardMaterialParameters) {
    const m = new THREE.MeshStandardMaterial(options)
    materials.add(m)
    return m
  }
  function texture(canvas: HTMLCanvasElement) {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    textures.add(t)
    return t
  }
  function canvas(width: number, height: number) {
    const element = document.createElement('canvas')
    element.width = width; element.height = height
    return element
  }
  function mesh(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) {
    const result = new THREE.Mesh(geometry(g), m)
    result.position.set(x, y, z)
    result.castShadow = result.receiveShadow = true
    parent.add(result)
    return result
  }
  function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) {
    return mesh(parent, new THREE.BoxGeometry(w, h, d), m, x, y, z)
  }
  function cylinder(parent: THREE.Object3D, r: number, height: number, x: number, y: number, z: number, m: THREE.Material, segments = 32) {
    return mesh(parent, new THREE.CylinderGeometry(r, r, height, segments), m, x, y, z)
  }
  function rod(parent: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, radius: number, m: THREE.Material) {
    const direction = to.clone().sub(from)
    const result = cylinder(parent, radius, direction.length(), 0, 0, 0, m, 16)
    result.position.copy(from).add(to).multiplyScalar(.5)
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    return result
  }
  function flatLabel(text: string, width: number, depth: number, parent: THREE.Object3D, x: number, y: number, z: number, color = '#526b5c') {
    const mapCanvas = canvas(512, 128), ctx = mapCanvas.getContext('2d')!
    ctx.clearRect(0, 0, 512, 128)
    ctx.font = '500 44px "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color
    ctx.fillText(text, 256, 64)
    const mat = material({ map: texture(mapCanvas), transparent: true, depthWrite: false, roughness: .9 })
    const label = mesh(parent, new THREE.PlaneGeometry(width, depth), mat, x, y, z)
    label.rotation.x = -Math.PI / 2
    label.castShadow = false
    return label
  }
  const brushedCanvas = canvas(256, 256), brushed = brushedCanvas.getContext('2d')!
  brushed.fillStyle = '#d9dddc'; brushed.fillRect(0, 0, 256, 256)
  for (let y = 0; y < 256; y++) {
    brushed.fillStyle = `rgba(75,88,88,${.02 + (y * 17 % 19) / 260})`
    brushed.fillRect(0, y, 256, 1)
  }
  const aluminium = material({ map: texture(brushedCanvas), color: '#d6dcdb', metalness: .72, roughness: .31 })
  const brightMetal = material({ color: '#bfc7c5', metalness: .85, roughness: .25 })
  const charcoal = material({ color: '#293237', metalness: .16, roughness: .57 })
  const rubber = material({ color: '#292d29', roughness: .9 })
  const red = material({ color: '#bb4536', roughness: .53 })
  const black = material({ color: '#333c3c', roughness: .54 })
  const gold = material({ color: '#bf9b42', metalness: .75, roughness: .36 })
  const ceramic = material({ color: '#ecebdd', roughness: .4 })
  const green = material({ color: '#456c5a', roughness: .65 })
  const blue = material({ color: '#235d8f', roughness: .46, metalness: .08 })

  // The board surface and perforations are one texture, keeping the model inexpensive.
  const boardCanvas = canvas(1024, 768), boardCtx = boardCanvas.getContext('2d')!
  boardCtx.fillStyle = '#e8bf53'; boardCtx.fillRect(0, 0, 1024, 768)
  for (let row = 1; row < 20; row++) for (let col = 1; col < 27; col++) {
    const x = col * 36.5, y = row * 36.5
    boardCtx.fillStyle = '#b4a271'; boardCtx.beginPath(); boardCtx.arc(x, y, 4.2, 0, Math.PI * 2); boardCtx.fill()
    boardCtx.fillStyle = '#e9dfc5'; boardCtx.beginPath(); boardCtx.arc(x, y + 1, 2.5, 0, Math.PI * 2); boardCtx.fill()
  }
  const boardMat = material({ color: '#d9af40', roughness: .8 })
  const tableMat = material({ color: '#adb7a8', roughness: .95 })
  const table = box(scene, 150, .18, 150, 0, -.15, 0, tableMat)
  table.castShadow = false
  const board = new THREE.Group(); scene.add(board)
  for (const x of [-1.65, 1.65]) for (const z of [-1.18, 1.18]) {
    cylinder(board, .19, .14, x, .04, z, rubber)
  }
  box(board, 3.9, .24, 2.9, 0, .22, 0, boardMat)
  const top = mesh(board, new THREE.PlaneGeometry(3.78, 2.78), material({ map: texture(boardCanvas), roughness: .85 }), 0, .344, 0)
  top.rotation.x = -Math.PI / 2
  top.castShadow = false
  for (const x of [-1.8, 1.8]) for (const z of [-1.3, 1.3]) {
    cylinder(board, .075, .025, x, .36, z, brightMetal, 20)
    box(board, .085, .006, .014, x, .376, z, charcoal)
  }
  flatLabel('光伏发电实验', 1.4, .23, board, -.85, .349, 1.24)
  flatLabel('北 N', .73, .28, scene, 0, -.049, -1.88)
  flatLabel('南 S', .73, .28, scene, 0, -.049, 1.88)
  flatLabel('东 E', .73, .28, scene, 2.85, -.049, 0)
  flatLabel('西 W', .73, .28, scene, -2.85, -.049, 0)

  const models: Record<PartId, THREE.Group> = {
    stand: new THREE.Group(), panel: new THREE.Group(), lamp: new THREE.Group(), battery: new THREE.Group(), positive: new THREE.Group(), negative: new THREE.Group(),
  }
  scene.add(models.stand, models.lamp, models.battery, models.positive, models.negative)
  const yaw = new THREE.Group(); yaw.position.copy(PANEL_CENTER); scene.add(yaw)
  const panelHinge = new THREE.Group(); yaw.add(panelHinge); panelHinge.add(models.panel)
  const stand = models.stand
  cylinder(stand, .46, .13, 0, .415, 0, ceramic)
  mesh(stand, new THREE.CylinderGeometry(.17, .32, .22, 36), ceramic, 0, .59, 0)
  cylinder(stand, .105, 3.72, 0, 2.5, 0, blue)
  cylinder(stand, .14, .2, 0, 1.2, 0, blue)
  // Textbook arrangement: the two modules sit on either side of the blue pole.
  // All fixed shaft collars stay in the central gap, clear of both rotating plates.
  const yoke = new THREE.Group(); yaw.add(yoke)
  rod(yoke, new THREE.Vector3(-.69, 0, 0), new THREE.Vector3(.69, 0, 0), .062, brightMetal)
  for (const x of [-.3, .3]) {
    const collar = cylinder(yoke, .14, .34, x, 0, 0, ceramic)
    collar.rotation.z = Math.PI / 2
  }
  for (const x of [-.54, .54]) {
    const knob = cylinder(yoke, .14, .08, x, 0, 0, blue, 20)
    knob.rotation.z = Math.PI / 2
  }
  // Small circuit board and labelled mode badge are attached to the pole.
  box(stand, .43, .62, .07, 0, 1.65, .18, green)
  box(stand, .16, .17, .07, 0, 1.66, .245, charcoal)
  for (const x of [-.135, .135]) for (const y of [1.48, 1.82]) {
    box(stand, .065, .07, .04, x, y, .237, gold)
  }
  const controllerTerminal = {
    positive: new THREE.Vector3(-.13, 1.86, .285), negative: new THREE.Vector3(.13, 1.86, .285),
  }
  const controllerLower = {
    positive: new THREE.Vector3(-.13, 1.42, .285), negative: new THREE.Vector3(.13, 1.42, .285),
  }
  for (const id of ['positive', 'negative'] as const) for (const p of [controllerTerminal[id], controllerLower[id]]) {
    const post = cylinder(stand, .038, .07, p.x, p.y, p.z - .03, id === 'positive' ? red : black, 16)
    post.rotation.x = Math.PI / 2
  }
  box(stand, .98, .26, .035, 0, 1.07, .19, ceramic)
  const modeCanvas = canvas(512, 128), modeContext = modeCanvas.getContext('2d')!, modeMap = texture(modeCanvas)
  const modeLabel = mesh(stand, new THREE.PlaneGeometry(.92, .23), material({ map: modeMap, transparent: true, roughness: .9 }), 0, 1.07, .211)
  modeLabel.castShadow = false
  let renderedMode = ''
  const panel = models.panel
  const cellCanvas = canvas(1536, 1024), cc = cellCanvas.getContext('2d')!
  cc.fillStyle = '#151f2e'; cc.fillRect(0, 0, 1536, 1024)
  let seed = 1491
  function random() { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let row = 0; row < 4; row++) for (let col = 0; col < 6; col++) {
    const x = col * 256 + 6, y = row * 256 + 6
    const gradient = cc.createLinearGradient(x, y, x + 245, y + 245)
    gradient.addColorStop(0, '#1a3450'); gradient.addColorStop(.55, '#10283e'); gradient.addColorStop(1, '#25445d')
    cc.fillStyle = gradient
    cc.beginPath(); cc.moveTo(x + 18, y); cc.lineTo(x + 226, y); cc.lineTo(x + 244, y + 18); cc.lineTo(x + 244, y + 226)
    cc.lineTo(x + 226, y + 244); cc.lineTo(x + 18, y + 244); cc.lineTo(x, y + 226); cc.lineTo(x, y + 18); cc.closePath(); cc.fill()
    for (let i = 0; i < 200; i++) {
      cc.fillStyle = `rgba(122,160,185,${random() * .055})`
      const sx = x + 20 + random() * 204, sy = y + 20 + random() * 204
      cc.beginPath(); cc.moveTo(sx, sy); cc.lineTo(sx + 10, sy - 4); cc.lineTo(sx + 5, sy + 14); cc.closePath(); cc.fill()
    }
    cc.strokeStyle = '#63798c'; cc.lineWidth = .8
    for (let line = 12; line < 236; line += 7) { cc.beginPath(); cc.moveTo(x + 7, y + line); cc.lineTo(x + 237, y + line); cc.stroke() }
    cc.fillStyle = '#a4b0b7'
    for (const bus of [47, 121, 195]) cc.fillRect(x + bus, y + 3, 2.4, 238)
  }
  const cellMat = material({ map: texture(cellCanvas), metalness: .38, roughness: .24, color: '#d1e1ed' })
  const terminalLocal: Record<'positive' | 'negative', THREE.Vector3[]> = { positive: [], negative: [] }
  for (const side of [-1, 1]) {
    const cx = side * 1.55
    // Separate laminate, backsheet and frame volumes; no exposed coplanar faces.
    box(panel, 1.74, .116, 1.24, cx, .082, 0, charcoal)
    box(panel, 1.73, .035, 1.23, cx, .002, 0, aluminium)
    for (const x of [cx - .915, cx + .915]) box(panel, .07, .17, 1.4, x, .08, 0, charcoal)
    for (const z of [-.665, .665]) box(panel, 1.76, .17, .07, cx, .08, z, charcoal)
    const cells = mesh(panel, new THREE.PlaneGeometry(1.70, 1.20), cellMat, cx, .143, 0)
    cells.rotation.x = -Math.PI / 2; cells.castShadow = false
    for (const x of [cx - .915, cx + .915]) for (const z of [-.57, .57]) cylinder(panel, .018, .008, x, .169, z, brightMetal, 12)
    box(panel, .36, .09, .26, side * .95, -.08, .32, charcoal)
    for (const id of ['positive', 'negative'] as const) {
      const p = new THREE.Vector3(side * (id === 'positive' ? .86 : 1.04), -.205, .32)
      terminalLocal[id].push(p)
      cylinder(panel, .038, .09, p.x, -.155, p.z, id === 'positive' ? red : black, 16)
      cylinder(panel, .024, .025, p.x, -.197, p.z, gold, 12)
    }
  }
  function roundedRectangle(w: number, h: number, r: number) {
    const shape = new THREE.Shape(), left = -w / 2, right = w / 2, bottom = -h / 2, top = h / 2
    shape.moveTo(left + r, bottom); shape.lineTo(right - r, bottom)
    shape.quadraticCurveTo(right, bottom, right, bottom + r); shape.lineTo(right, top - r)
    shape.quadraticCurveTo(right, top, right - r, top); shape.lineTo(left + r, top)
    shape.quadraticCurveTo(left, top, left, top - r); shape.lineTo(left, bottom + r)
    shape.quadraticCurveTo(left, bottom, left + r, bottom)
    return shape
  }
  const lamp = models.lamp
  lamp.position.copy(LAMP_CENTER)
  mesh(lamp, new THREE.ExtrudeGeometry(roundedRectangle(.43, 1.5, .21), { depth: .18, bevelEnabled: false, curveSegments: 12 }), blue, 0, 0, -.09)
  const lampFaceMaterial = new THREE.MeshBasicMaterial({ color: '#454c47', toneMapped: false })
  materials.add(lampFaceMaterial)
  const lampFace = mesh(lamp, new THREE.ShapeGeometry(roundedRectangle(.31, 1.20, .13), 16), lampFaceMaterial, 0, 0, .095)
  lampFace.castShadow = false
  const lampLight = new THREE.PointLight('#ffe4aa', 0, 2.8, 2)
  lampLight.position.set(0, 0, .25); lamp.add(lampLight)
  const lampTerminal = {
    positive: LAMP_CENTER.clone().add(new THREE.Vector3(-.075, -.64, -.125)),
    negative: LAMP_CENTER.clone().add(new THREE.Vector3(.075, -.64, -.125)),
  }
  for (const id of ['positive', 'negative'] as const) {
    const p = lampTerminal[id].clone().sub(LAMP_CENTER)
    const post = cylinder(lamp, .028, .05, p.x, p.y, p.z + .01, id === 'positive' ? red : black, 12)
    post.rotation.x = Math.PI / 2
  }
  const battery = models.battery; battery.position.copy(BATTERY_CENTER)
  box(battery, .87, .07, 1.3, 0, .035, 0, charcoal)
  for (const x of [-.415, .415]) box(battery, .04, .27, 1.3, x, .17, 0, charcoal)
  for (const z of [-.61, .61]) box(battery, .79, .32, .08, 0, .16, z, charcoal)
  const cellBody = material({ color: '#b89b64', metalness: .45, roughness: .43 })
  for (const x of [-.205, .205]) {
    const cell = cylinder(battery, .155, 1.05, x, .235, 0, cellBody, 32); cell.rotation.x = Math.PI / 2
    for (const z of [-.54, .54]) { const cap = cylinder(battery, .12, .035, x, .235, z, brightMetal, 24); cap.rotation.x = Math.PI / 2 }
    box(battery, .1, .008, .62, x, .394, -.02, green)
    flatLabel('充电', .23, .13, battery, x, .403, -.03)
  }
  const batteryTerminal = {
    positive: BATTERY_CENTER.clone().add(new THREE.Vector3(-.21, .23, .69)),
    negative: BATTERY_CENTER.clone().add(new THREE.Vector3(.21, .23, .69)),
  }
  for (const id of ['positive', 'negative'] as const) {
    const p = batteryTerminal[id].clone().sub(BATTERY_CENTER)
    const post = cylinder(battery, .036, .07, p.x, p.y, p.z - .02, id === 'positive' ? red : black, 16)
    post.rotation.x = Math.PI / 2
  }
  flatLabel('充电电池', 1.12, .2, board, BATTERY_CENTER.x, .349, 1.32)
  const chargeSegments: THREE.Mesh[] = []
  const chargeOn = material({ color: '#90af75', emissive: '#587744', emissiveIntensity: .18 })
  const chargeOff = material({ color: '#414c43', roughness: .8 })
  for (let i = 0; i < 5; i++) chargeSegments.push(box(battery, .095, .045, .018, -.25 + i * .125, .09, .659, chargeOff))

  // Reuse the cable buffers when the panel rotates, instead of replacing geometries.
  const cableSegments = 140, cableSides = 10
  function dynamicCable(parent: THREE.Group, mat: THREE.Material) {
    const g = geometry(new THREE.BufferGeometry())
    const positions = new Float32Array((cableSegments + 1) * (cableSides + 1) * 3)
    const normals = new Float32Array(positions.length)
    const indices: number[] = []
    for (let i = 0; i < cableSegments; i++) for (let j = 0; j < cableSides; j++) {
      const a = i * (cableSides + 1) + j, b = a + cableSides + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(indices)
    const object = mesh(parent, g, mat); object.frustumCulled = false
    return (points: THREE.Vector3[]) => {
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
      const frames = curve.computeFrenetFrames(cableSegments, false)
      for (let i = 0; i <= cableSegments; i++) {
        const center = curve.getPointAt(i / cableSegments), normal = frames.normals[i]!, binormal = frames.binormals[i]!
        for (let j = 0; j <= cableSides; j++) {
          const angle = j / cableSides * Math.PI * 2
          const direction = normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(binormal, Math.sin(angle))
          const index = (i * (cableSides + 1) + j) * 3
          positions[index] = center.x + direction.x * .018
          positions[index + 1] = center.y + direction.y * .018
          positions[index + 2] = center.z + direction.z * .018
          normals[index] = direction.x; normals[index + 1] = direction.y; normals[index + 2] = direction.z
        }
      }
      g.attributes.position!.needsUpdate = true
      g.attributes.normal!.needsUpdate = true
      g.computeBoundingSphere()
    }
  }
  const cableWriters = {
    positive: Array.from({ length: 4 }, () => dynamicCable(models.positive, red)),
    negative: Array.from({ length: 4 }, () => dynamicCable(models.negative, black)),
  }
  const cableGuide = { positive: new THREE.Vector3(-.3, 1.65, .39), negative: new THREE.Vector3(.3, 1.65, .39) }
  let cablesReady = false
  function updateCables() {
    panelHinge.updateWorldMatrix(true, false)
    for (const id of ['positive', 'negative'] as const) {
      const lane = id === 'positive' ? 0 : 1, sign = id === 'positive' ? -1 : 1
      for (let module = 0; module < 2; module++) {
        const side = module === 0 ? -1 : 1
        const origin = terminalLocal[id][module]!.clone().applyMatrix4(panelHinge.matrixWorld)
        const under = new THREE.Vector3(side * (.86 + lane * .44), -.38, .32 - lane * .32).applyMatrix4(panelHinge.matrixWorld)
        const low = under.clone(); low.y = lane ? 2.12 : 2.36
        const localExit = new THREE.Vector3(side * (.86 + lane * .44), -.38, .32 - lane * .32).applyAxisAngle(new THREE.Vector3(1, 0, 0), state.tilt * DEG)
        let angle = Math.atan2(localExit.z, localExit.x)
        if (side < 0 && angle < 0) angle += Math.PI * 2
        angle += state.azimuth * DEG
        const turn = Math.PI / 2 - angle, count = Math.max(1, Math.ceil(Math.abs(turn) / (Math.PI / 12)))
        const arc: THREE.Vector3[] = []
        const radius = .60 + lane * .15
        const entry = new THREE.Vector3(Math.cos(angle) * radius, low.y, Math.sin(angle) * radius)
        const radialMiddle = low.clone().lerp(entry, .55)
        for (let i = 0; i <= count; i++) {
          const t = i / count, a = angle + turn * t
          arc.push(new THREE.Vector3(Math.cos(a) * radius, 2.0 + lane * .18, Math.sin(a) * radius))
        }
        const terminal = controllerTerminal[id]
        const exit = lane
          ? [new THREE.Vector3(0, 1.75, radius), new THREE.Vector3(.28, 1.76, .56), new THREE.Vector3(.13, 1.82, .42)]
          : [new THREE.Vector3(-.28, 2.0, .56), new THREE.Vector3(-.13, 1.99, .42)]
        cableWriters[id][module]!([origin, under, low, radialMiddle, entry, ...arc,
          ...exit, terminal.clone()])
      }
      const lampPin = lampTerminal[id], boardPin = controllerTerminal[id]
      const upper = new THREE.Vector3(sign * .17, .48, -.26).applyMatrix4(yaw.matrixWorld)
      const lower = new THREE.Vector3(sign * .17, -.48, -.26).applyMatrix4(yaw.matrixWorld)
      const lampStart = Math.atan2(lower.z, lower.x), lampEnd = Math.atan2(.16, sign * .31)
      const lampTurn = Math.atan2(Math.sin(lampEnd - lampStart), Math.cos(lampEnd - lampStart))
      const lampArc: THREE.Vector3[] = []
      for (let i = 0; i <= 8; i++) {
        const a = lampStart + lampTurn * i / 8, r = .36 + lane * .055
        lampArc.push(new THREE.Vector3(Math.cos(a) * r, 2.45 + lane * .11 - i * .02, Math.sin(a) * r))
      }
      cableWriters[id][2]!([lampPin.clone(), new THREE.Vector3(sign * .17, 4.2, -.21),
        upper, lower, ...lampArc, new THREE.Vector3(sign * .31, 2.08, .16),
        new THREE.Vector3(boardPin.x, 1.94, .39), boardPin.clone()])
      const batteryPin = batteryTerminal[id], lowerPin = controllerLower[id]
      cableWriters[id][3]!([batteryPin.clone(), new THREE.Vector3(batteryPin.x, .58, 1.36),
        new THREE.Vector3(.52 + lane * .25, .47, 1.22 + lane * .12),
        new THREE.Vector3(sign * .27, .47, .64 + lane * .14),
        new THREE.Vector3(sign * .27, 1.22, .43), new THREE.Vector3(lowerPin.x, 1.35, .38), lowerPin.clone()])
    }
    cablesReady = true
  }

  const ghostMaterial = material({ color: '#6a9875', transparent: true, opacity: .21, depthWrite: false, roughness: .8 })
  const ghostLineMaterial = new THREE.LineBasicMaterial({ color: '#557c5a', transparent: true, opacity: .72, depthWrite: false })
  materials.add(ghostLineMaterial)
  const ghosts = {} as Record<PartId, THREE.Group>
  for (const id of PARTS) {
    const source = models[id], ghost = source.clone(true)
    ghost.traverse(object => {
      if (object instanceof THREE.Mesh) { object.material = ghostMaterial; object.castShadow = false; object.receiveShadow = false }
      if (object instanceof THREE.Light) object.visible = false
    })
    if (id === 'panel') panelHinge.add(ghost)
    else scene.add(ghost)
    ghosts[id] = ghost
  }
  const targetRing = mesh(scene, new THREE.TorusGeometry(.35, .02, 8, 48), ghostMaterial)
  targetRing.rotation.x = -Math.PI / 2
  targetRing.castShadow = false
  // A few long parallel rays make the incoming direction legible in every view.
  const rays = new THREE.Group(); scene.add(rays)
  const rayMaterial = new THREE.LineBasicMaterial({ color: '#b99946', transparent: true, opacity: .56 })
  materials.add(rayMaterial)
  const rayLines: THREE.Line[] = [], rayHeads: THREE.Mesh[] = []
  for (let i = 0; i < 3; i++) {
    const g = geometry(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]))
    const line = new THREE.Line(g, rayMaterial); rays.add(line); rayLines.push(line)
    const head = mesh(rays, new THREE.ConeGeometry(.075, .22, 10), material({ color: '#bd9b46', emissive: '#a98a38', emissiveIntensity: .3 }))
    head.castShadow = false; rayHeads.push(head)
  }
  // Match the textured, emissive sun used in the sea-and-land-breezes lesson.
  const sunMaterial = material({ color: '#ffb53a', emissive: '#ff7918', emissiveIntensity: 2.6, roughness: .72, metalness: 0 })
  const sunTexture = new THREE.TextureLoader().load(SUN_TEXTURE_URL, loaded => {
    if (disposed) { loaded.dispose(); return }
    loaded.colorSpace = THREE.SRGBColorSpace
    loaded.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    sunMaterial.map = loaded; sunMaterial.emissiveMap = loaded; sunMaterial.needsUpdate = true
  }, undefined, () => { if (!disposed) console.warn('太阳纹理加载失败：', SUN_TEXTURE_URL) })
  sunTexture.colorSpace = THREE.SRGBColorSpace; textures.add(sunTexture)
  const sunOrb = mesh(rays, new THREE.SphereGeometry(SUN_RADIUS, 40, 28), sunMaterial)
  sunOrb.castShadow = false; sunOrb.receiveShadow = false
  const glowCanvas = canvas(128, 128), glowCtx = glowCanvas.getContext('2d')!
  const gradient = glowCtx.createRadialGradient(64, 64, 8, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255,236,163,.8)'); gradient.addColorStop(.3, 'rgba(255,222,134,.28)'); gradient.addColorStop(1, 'rgba(255,222,134,0)')
  glowCtx.fillStyle = gradient; glowCtx.fillRect(0, 0, 128, 128)
  const glowMaterial = new THREE.SpriteMaterial({ map: texture(glowCanvas), transparent: true, depthWrite: false, opacity: .48, blending: THREE.AdditiveBlending, toneMapped: false })
  materials.add(glowMaterial)
  const sunGlow = new THREE.Sprite(glowMaterial); sunGlow.scale.set(1.8, 1.8, 1); rays.add(sunGlow)
  // Keep the halo parallel to the diffuser: a camera-facing sprite can cut into
  // the blue housing when orbiting. Depth testing still hides it from behind.
  const lampGlowMaterial = new THREE.MeshBasicMaterial({ map: glowMaterial.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.FrontSide, opacity: 0 })
  materials.add(lampGlowMaterial)
  const lampGlow = mesh(lamp, new THREE.PlaneGeometry(1, 1), lampGlowMaterial, 0, 0, .108)
  lampGlow.castShadow = false; lampGlow.receiveShadow = false
  const lampOffColor = new THREE.Color('#454c47'), lampWarmColor = new THREE.Color('#b18945'), lampBrightColor = new THREE.Color('#fff7dc')
  const sunDirection = new THREE.Vector3(0, Math.sqrt(3) / 2, .5)
  let sunVisualLength = -1
  const sunSource = new THREE.Vector3(), sunLocal = new THREE.Vector3(), sunCameraPoint = new THREE.Vector3()
  const sunPanelInverse = new THREE.Matrix4(), sunYawInverse = new THREE.Matrix4()
  const sunLastCamera = new THREE.Matrix4(), sunLastProjection = new THREE.Matrix4(), sunLastPanel = new THREE.Matrix4()
  function distanceToBoxSquared(point: THREE.Vector3, left: number, right: number, bottom: number, top: number, back: number, front: number) {
    const x = Math.max(left - point.x, 0, point.x - right)
    const y = Math.max(bottom - point.y, 0, point.y - top)
    const z = Math.max(back - point.z, 0, point.z - front)
    return x * x + y * y + z * z
  }
  function sunClearsApparatus(radius: number) {
    // Include a visible air gap. Module boxes also include protruding screw heads;
    // the smaller boxes below cover the rear junction boxes and terminal posts.
    const clearanceSquared = (radius + .035) ** 2
    sunLocal.copy(sunSource).applyMatrix4(sunPanelInverse)
    for (const side of [-1, 1]) {
      const cx = side * 1.55, terminal = side * .95
      if (distanceToBoxSquared(sunLocal, cx - .95, cx + .95, -.0155, .173, -.7, .7) < clearanceSquared
        || distanceToBoxSquared(sunLocal, terminal - .18, terminal + .18, -.21, -.035, .19, .45) < clearanceSquared) return false
    }
    sunLocal.copy(sunSource).applyMatrix4(sunYawInverse)
    if (distanceToBoxSquared(sunLocal, -.69, .69, -.14, .14, -.14, .14) < clearanceSquared) return false
    const radial = Math.max(0, Math.hypot(sunSource.x, sunSource.z) - .105)
    const vertical = Math.max(.64 - sunSource.y, 0, sunSource.y - 4.36)
    if (radial * radial + vertical * vertical < clearanceSquared) return false
    return distanceToBoxSquared(sunSource, -.215, .215, 4.35, 5.85, -.15, .108) >= clearanceSquared
  }

  let state: SceneState = { installed: [], activePart: 'stand', dragStatus: null, tilt: 30, azimuth: 0, hour: 12, power: 0, lampPower: 0, batteryLevel: 0, supplyMode: 'direct', experimenting: false }
  let width = 1, height = 1, raf = 0, lastGuides = 0, hasFramed = false
  type Framing = { zoom: number; x: number; y: number }
  let cameraFlight: { start: number; progress: number; fromPosition: THREE.Vector3; fromTarget: THREE.Vector3; toPosition: THREE.Vector3; toTarget: THREE.Vector3; fromFrame: Framing; toFrame: Framing } | null = null
  let interactionLocked = false
  const targetLocations: Record<PartId, THREE.Vector3> = {
    stand: new THREE.Vector3(0, 1.35, 0),
    panel: PANEL_CENTER.clone().add(new THREE.Vector3(-1.55, .15, 0)),
    lamp: LAMP_CENTER.clone(),
    battery: BATTERY_CENTER.clone().add(new THREE.Vector3(0, .25, 0)),
    positive: cableGuide.positive,
    negative: cableGuide.negative,
  }
  const tiltWorld = new THREE.Vector3(), projected = new THREE.Vector3()
  // Fit every possible module orientation, rather than fitting only the initial tilt.
  // The workbench and all drop targets remain inside the uncovered scene area.
  const fitPoints: THREE.Vector3[] = []
  for (const x of [-1.95, 1.95]) for (const y of [.05, .36]) for (const z of [-1.45, 1.45]) fitPoints.push(new THREE.Vector3(x, y, z))
  fitPoints.push(new THREE.Vector3(-3.2, -.05, 0), new THREE.Vector3(3.2, -.05, 0), new THREE.Vector3(0, -.05, -2.02), new THREE.Vector3(0, -.05, 2.02))
  for (const x of [-.24, .24]) for (const y of [4.35, 5.85]) for (const z of [-.11, .13]) fitPoints.push(new THREE.Vector3(x, y, z))
  for (const beta of [0, 30, 60, 90]) for (const gamma of [-90, -45, 0, 45, 90]) {
    for (const x of [-2.62, 2.5]) for (const z of [-.7, .7]) {
      fitPoints.push(new THREE.Vector3(x, .16, z)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), beta * DEG)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), -gamma * DEG).add(PANEL_CENTER))
    }
  }
  function framingArea(width: number, height: number) {
    let left: number, right: number, top: number, bottom: number
    if (width <= 620) {
      // The lower controls occupy 419 px in the experiment phase. Use that same
      // reservation during assembly so targets never jump when the phase changes.
      left = 10; right = Math.max(left + 150, width - 124); top = 60; bottom = Math.max(225, height - 429)
    } else if (width <= 880) {
      left = 266; right = width - 17; top = 242; bottom = height - 230
      if (bottom - top < 240) top = 90
    } else {
      left = width <= 1150 ? 300 : width >= 1600 ? 364 : 342
      right = width - (width <= 1150 ? 172 : width >= 1600 ? 220 : 204)
      top = 65; bottom = height - (height > 722 ? 238 : 220)
    }
    return { left, right, top, bottom }
  }
  const testCamera = new THREE.PerspectiveCamera(36, 1, .1, 180), framingPoint = new THREE.Vector3()
  function calculateFraming(position: THREE.Vector3, target: THREE.Vector3, viewWidth = width, viewHeight = height): Framing {
    const width = viewWidth, height = viewHeight
    const { left, right, top, bottom } = framingArea(width, height)
    testCamera.aspect = width / height; testCamera.zoom = 1; testCamera.updateProjectionMatrix()
    testCamera.position.copy(position); testCamera.lookAt(target); testCamera.updateMatrixWorld()
    const bounds = () => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const point of fitPoints) {
        const p = framingPoint.copy(point).project(testCamera), x = (p.x * .5 + .5) * width, y = (-p.y * .5 + .5) * height
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y)
      }
      return { minX, maxX, minY, maxY }
    }
    const original = bounds()
    const zoom = Math.min((right - left) / (original.maxX - original.minX), (bottom - top) / (original.maxY - original.minY)) * .94
    testCamera.zoom = Math.max(.22, zoom); testCamera.updateProjectionMatrix()
    const fitted = bounds()
    return { zoom: testCamera.zoom, x: (fitted.minX + fitted.maxX - left - right) * .5, y: (fitted.minY + fitted.maxY - top - bottom) * .5 }
  }
  function applyFraming(framing: Framing) {
    camera.zoom = framing.zoom
    camera.setViewOffset(width, height, framing.x, framing.y, width, height)
    camera.updateProjectionMatrix()
  }
  function currentFraming(): Framing { return { zoom: camera.zoom, x: camera.view?.offsetX ?? 0, y: camera.view?.offsetY ?? 0 } }
  function updateSunVisual(force = false) {
    if (!rays.visible) return
    panelHinge.updateWorldMatrix(true, false)
    if (!force && sunLastCamera.equals(camera.matrixWorld) && sunLastProjection.equals(camera.projectionMatrix)
      && sunLastPanel.equals(panelHinge.matrixWorld)) return
    sunLastCamera.copy(camera.matrixWorld); sunLastProjection.copy(camera.projectionMatrix); sunLastPanel.copy(panelHinge.matrixWorld)
    sunPanelInverse.copy(panelHinge.matrixWorld).invert(); sunYawInverse.copy(yaw.matrixWorld).invert()
    // The marker stays on the true incoming direction. Search disconnected safe
    // intervals instead of assuming every shorter distance is visible or empty.
    const fits = (distance: number, radius: number) => {
      sunSource.copy(PANEL_CENTER).addScaledVector(sunDirection, distance)
      sunCameraPoint.copy(sunSource).applyMatrix4(camera.matrixWorldInverse)
      const depth = -sunCameraPoint.z
      if (depth - radius <= camera.near || depth + radius >= camera.far) return false
      // Exact tangent bounds of the sphere in camera space, including viewOffset.
      // Checking only its centre allowed the globe itself to be cropped by panels.
      const denominator = depth * depth - radius * radius, e = camera.projectionMatrix.elements
      const dx = radius * Math.sqrt(depth * depth + sunCameraPoint.x * sunCameraPoint.x - radius * radius)
      const dy = radius * Math.sqrt(depth * depth + sunCameraPoint.y * sunCameraPoint.y - radius * radius)
      const minX = ((e[0]! * (sunCameraPoint.x * depth - dx) / denominator - e[8]!) * .5 + .5) * width
      const maxX = ((e[0]! * (sunCameraPoint.x * depth + dx) / denominator - e[8]!) * .5 + .5) * width
      const minY = (.5 - (e[5]! * (sunCameraPoint.y * depth + dy) / denominator - e[9]!) * .5) * height
      const maxY = (.5 - (e[5]! * (sunCameraPoint.y * depth - dy) / denominator - e[9]!) * .5) * height
      const left = width <= 620 ? 22 : width <= 880 ? 275 : width <= 1150 ? 305 : width >= 1600 ? 366 : 347
      const right = width <= 620 ? (minY < 190 ? width - 127 : width - 22)
        : width <= 880 ? (minY < 250 ? width - 155 : width - 22)
          : minY < 280 ? width - (width <= 1150 ? 179 : 210) : width - 22
      const bottom = width <= 620 ? Math.max(225, height - 429) : width <= 880 ? height - 230 : height - 220
      return minX >= left && maxX <= right && minY >= 30 && maxY <= bottom && sunClearsApparatus(radius)
    }
    let length = -1, markerScale = 1
    for (const scale of [1, .72, .5]) {
      const radius = SUN_RADIUS * scale
      // Prefer the established distance; then allow either a shorter or a longer
      // safe distance, without pushing the sun through a tilted panel or the lamp.
      for (let step = 0; step <= 132 && length < 0; step++) {
        const nearer = 3.3 - step * .025, farther = 3.3 + step * .025
        if (nearer >= .65 && fits(nearer, radius)) length = nearer
        else if (step > 0 && farther <= 6.6 && fits(farther, radius)) length = farther
      }
      if (length >= 0) { markerScale = scale; break }
    }
    // Extreme zoom/orbit can leave no unobstructed screen region on this direction.
    // Omit the globe in that case and retain the truthful parallel incoming rays;
    // moving it sideways would falsely change the sun's bearing.
    const markerVisible = length >= 0
    sunOrb.visible = sunGlow.visible = markerVisible
    if (markerVisible) {
      sunSource.copy(PANEL_CENTER).addScaledVector(sunDirection, length)
      sunOrb.position.copy(sunSource); sunGlow.position.copy(sunSource)
      sunOrb.scale.setScalar(markerScale); sunGlow.scale.set(1.8 * markerScale, 1.8 * markerScale, 1)
    } else length = 3.3
    if (!force && Math.abs(sunVisualLength - length) < .001) return
    sunVisualLength = length
    const normal = new THREE.Vector3(0, 1, 0).transformDirection(panelHinge.matrixWorld)
    const incidenceCosine = normal.dot(sunDirection)
    const frontLit = incidenceCosine > 0
    // There is no isolated surface intersection when the incoming direction is
    // parallel to the panel. Keep the sun marker, but omit misleading hit arrows.
    const intersectsSurface = Math.abs(incidenceCosine) > .005
    const localSurfaceY = frontLit ? .143 + .004 : -.0155 - .004
    const headRadiusScale = Math.min(1, (.22 * Math.abs(incidenceCosine) + .002) * .8
      / (.075 * Math.sqrt(Math.max(.001, 1 - incidenceCosine * incidenceCosine))))
    for (let i = 0; i < 3; i++) {
      // Land on actual module-local surfaces. Backside hits use the clear upper
      // half of the backsheet, away from the hinge and electrical junction box.
      const destination = new THREE.Vector3([-1.55, 1.2, 1.9][i]!, localSurfaceY, frontLit ? 0 : -.45)
        .applyMatrix4(panelHinge.matrixWorld)
      const start = destination.clone().addScaledVector(sunDirection, Math.max(.65, length - .45))
      const end = destination.clone().addScaledVector(sunDirection, .22)
      const attr = rayLines[i]!.geometry.getAttribute('position') as THREE.BufferAttribute
      attr.setXYZ(0, start.x, start.y, start.z); attr.setXYZ(1, end.x, end.y, end.z); attr.needsUpdate = true
      rayLines[i]!.geometry.computeBoundingSphere()
      rayLines[i]!.visible = intersectsSurface
      const head = rayHeads[i]!
      // ConeGeometry points along +Y: after rotation its tip lands on the panel.
      // Slim grazing-angle heads so their sides also remain outside the panel.
      head.position.copy(destination).addScaledVector(sunDirection, .11)
      head.scale.set(headRadiusScale, 1, headRadiusScale)
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDirection.clone().negate())
      head.visible = intersectsSurface
    }
  }
  function project(world: THREE.Vector3, radius: number): Guide {
    projected.copy(world).project(camera)
    return { x: (projected.x * .5 + .5) * width, y: (-projected.y * .5 + .5) * height, radius,
      visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.05 && Math.abs(projected.y) < 1.05 }
  }
  function syncGuides(now: number, force = false) {
    if (!force && now - lastGuides < 32) return
    lastGuides = now
    const guides = {} as Guides
    for (const id of PARTS) guides[id] = project(targetLocations[id], id === 'positive' || id === 'negative' ? 42 : 54)
    tiltWorld.set(-2.62, .15, 0).applyMatrix4(panelHinge.matrixWorld)
    guides.tilt = project(tiltWorld, 32)
    onGuides(guides)
  }
  function update(next: SceneState) {
    const changedOrientation = state.tilt !== next.tilt || state.azimuth !== next.azimuth
    state = { ...next, installed: [...next.installed] }
    yaw.rotation.y = -state.azimuth * DEG
    panelHinge.rotation.x = state.tilt * DEG
    yaw.visible = state.installed.includes('stand') || state.activePart === 'panel'
    yoke.visible = state.installed.includes('stand')
    for (const id of PARTS) {
      models[id].visible = state.installed.includes(id)
      ghosts[id].visible = !models[id].visible && state.activePart === id
    }
    const feedback = state.dragStatus === 'invalid' ? '#bf6150' : state.dragStatus === 'valid' ? '#4e9d65' : '#6a9875'
    ghostMaterial.color.set(feedback)
    ghostMaterial.opacity = state.dragStatus ? .32 : .17
    ghostLineMaterial.color.set(feedback)
    if (changedOrientation || !cablesReady) updateCables()
    targetLocations.panel.set(-1.55, .15, 0).applyMatrix4(panelHinge.matrixWorld)
    const active = state.activePart
    targetRing.visible = !!active && !state.installed.includes(active)
    if (active) targetRing.position.copy(targetLocations[active])
    const complete = PARTS.every(id => state.installed.includes(id))
    const power = complete ? THREE.MathUtils.clamp(state.lampPower / 100, 0, 1) : 0
    if (power <= .3) lampFaceMaterial.color.copy(lampOffColor).lerp(lampWarmColor, power / .3)
    else lampFaceMaterial.color.copy(lampWarmColor).lerp(lampBrightColor, (power - .3) / .7)
    lampLight.intensity = power * 3.4
    lampGlowMaterial.opacity = Math.pow(power, 1.15) * .62
    lampGlow.scale.set(.55 + power * 1.3, 1.15 + power * 1.55, 1)
    lampGlow.visible = power > .005
    const level = THREE.MathUtils.clamp(state.batteryLevel, 0, 100)
    chargeSegments.forEach((segment, i) => { segment.material = level > i * 20 ? chargeOn : chargeOff })
    if (renderedMode !== state.supplyMode) {
      renderedMode = state.supplyMode
      modeContext.clearRect(0, 0, 512, 128); modeContext.fillStyle = '#355c50'
      modeContext.font = '500 48px "Microsoft YaHei",sans-serif'; modeContext.textAlign = 'center'; modeContext.textBaseline = 'middle'
      modeContext.fillText(state.supplyMode === 'battery' ? '控制板 · 储能' : '控制板 · 直连', 256, 64)
      modeMap.needsUpdate = true
    }
    const result = calculateOutput(state)
    const direction = new THREE.Vector3(...result.sun).normalize()
    sunlight.position.copy(direction).multiplyScalar(14).add(PANEL_CENTER)
    sunlight.target.position.copy(PANEL_CENTER)
    // The experiment holds incoming direct-beam intensity constant. The surface
    // brightness and calculated output then change with incidence alone.
    sunlight.intensity = DIRECT_LIGHT_INTENSITY
    rays.visible = state.experimenting && complete
    sunDirection.copy(direction)
    updateSunVisual(true)
    scene.updateMatrixWorld(true)
    syncGuides(performance.now(), true)
  }
  function resize() {
    if (disposed) return
    const w = Math.max(1, Math.round(host.clientWidth)), h = Math.max(1, Math.round(host.clientHeight))
    if (w === width && h === height) return
    const now = performance.now()
    const nextFit = calculateFraming(camera.position, controls.target, w, h)
    let nextFrame = nextFit
    if (hasFramed) {
      // Compare the SAME pose at both sizes. Refitting the current (possibly
      // dollied-in) pose outright would silently cancel the user's magnification.
      const oldFit = calculateFraming(camera.position, controls.target)
      const previous = currentFraming(), oldArea = framingArea(width, height), nextArea = framingArea(w, h)
      const anchorX = (width * .5 - previous.x - oldArea.left) / Math.max(1, oldArea.right - oldArea.left)
      const anchorY = (height * .5 - previous.y - oldArea.top) / Math.max(1, oldArea.bottom - oldArea.top)
      nextFrame = {
        zoom: previous.zoom * nextFit.zoom / oldFit.zoom,
        x: w * .5 - nextArea.left - anchorX * (nextArea.right - nextArea.left),
        y: h * .5 - nextArea.top - anchorY * (nextArea.bottom - nextArea.top),
      }
    }
    width = w; height = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    applyFraming(nextFrame)
    hasFramed = true
    if (cameraFlight) {
      const t = cameraFlight.progress, ease = t * t * (3 - 2 * t), remaining = Math.max(1e-8, 1 - ease)
      const destination = calculateFraming(cameraFlight.toPosition, cameraFlight.toTarget)
      // Keep the original flight clock and pose curve. Restarting the easing on
      // every ResizeObserver event would stall then snap during continuous resize.
      cameraFlight.fromFrame = {
        zoom: (nextFrame.zoom - destination.zoom * ease) / remaining,
        x: (nextFrame.x - destination.x * ease) / remaining,
        y: (nextFrame.y - destination.y * ease) / remaining,
      }
      cameraFlight.toFrame = destination
    }
    // setSize clears the drawing buffer synchronously. Paint before the browser
    // presents this ResizeObserver delivery, rather than showing a blank RAF gap.
    camera.lookAt(controls.target); camera.updateMatrixWorld(true)
    updateSunVisual(true)
    renderer.render(scene, camera)
    syncGuides(now, true)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(host)
  function clearControlInertia() {
    const position = camera.position.clone(), target = controls.target.clone(), zoom = camera.zoom
    const damping = controls.enableDamping
    // OrbitControls r184 clears its accumulated rotation/pan in update() when
    // damping is disabled. Consume them without rendering, then restore the exact
    // current pose and update again so unlocking cannot replay residual movement.
    controls.enableDamping = false
    controls.update()
    camera.position.copy(position); controls.target.copy(target); camera.zoom = zoom
    camera.updateProjectionMatrix()
    controls.update()
    controls.enableDamping = damping
    camera.updateMatrixWorld(true)
  }
  function setView(view: ViewMode) {
    clearControlInertia()
    const target = new THREE.Vector3(.05, 2.65, 0)
    const toPosition = view === 'top' ? new THREE.Vector3(.06, 15, .12)
      : view === 'front' ? new THREE.Vector3(.05, 5, 13.2)
      : new THREE.Vector3(8.3, 7, 9.8)
    cameraFlight = { start: performance.now(), progress: 0, fromPosition: camera.position.clone(), fromTarget: controls.target.clone(), toPosition, toTarget: target,
      fromFrame: currentFraming(), toFrame: calculateFraming(toPosition, target) }
    controls.enabled = false
  }
  const onControlStart = () => { cameraFlight = null }
  controls.addEventListener('start', onControlStart)
  function frame(now: number) {
    if (disposed) return
    if (cameraFlight) {
      const t = Math.min(1, (now - cameraFlight.start) / 680), ease = t * t * (3 - 2 * t)
      cameraFlight.progress = t
      camera.position.lerpVectors(cameraFlight.fromPosition, cameraFlight.toPosition, ease)
      controls.target.lerpVectors(cameraFlight.fromTarget, cameraFlight.toTarget, ease)
      applyFraming({ zoom: THREE.MathUtils.lerp(cameraFlight.fromFrame.zoom, cameraFlight.toFrame.zoom, ease),
        x: THREE.MathUtils.lerp(cameraFlight.fromFrame.x, cameraFlight.toFrame.x, ease), y: THREE.MathUtils.lerp(cameraFlight.fromFrame.y, cameraFlight.toFrame.y, ease) })
      if (t === 1) { cameraFlight = null; controls.enabled = !interactionLocked }
    }
    if (!interactionLocked) controls.update()
    camera.updateMatrixWorld(true)
    updateSunVisual()
    renderer.render(scene, camera)
    syncGuides(now)
    raf = requestAnimationFrame(frame)
  }
  update(state)
  controls.update()
  resize()
  raf = requestAnimationFrame(frame)
  return {
    update,
    setInteractionLocked(locked: boolean) {
      if (locked && !interactionLocked) {
        cameraFlight = null
        clearControlInertia()
        syncGuides(performance.now(), true)
      }
      interactionLocked = locked
      controls.enabled = !locked && !cameraFlight
    },
    setView,
    capture() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png') },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.removeEventListener('start', onControlStart)
      controls.dispose()
      sunlight.shadow.dispose()
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      textures.forEach(t => t.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    },
  }
}
