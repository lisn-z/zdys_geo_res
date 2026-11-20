import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Guides, Guide, InstrumentState, PartId, ViewMode } from './types'

const SCALE = .32
const PAPER_Y = .405
const PAPER_SPEED = .22
const PARTS: PartId[] = ['frame', 'mass', 'pen', 'paper']

/** A tabletop apparatus: all distances are illustrative rather than measured. */
export function createSeismographScene(host: HTMLElement, onGuides: (guides: Guides) => void) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f2f1e8')
  scene.fog = new THREE.Fog('#f2f1e8', 24, 50)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.12
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;'
  renderer.domElement.setAttribute('aria-label', '可旋转观察的简易地震仪模型')
  host.appendChild(renderer.domElement)
  const camera = new THREE.PerspectiveCamera(36, 1, .05, 90)
  camera.position.set(11.3, 7.2, 6.7)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 2.05, .2)
  controls.enableDamping = true
  controls.dampingFactor = .09
  controls.minDistance = 7
  controls.maxDistance = 23
  controls.maxPolarAngle = Math.PI * .49
  controls.enablePan = true
  const ambient = new THREE.HemisphereLight('#fffef6', '#a5a68e', 2.1)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight('#fff8e9', 3)
  sun.position.set(-6, 11, 8)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -10; sun.shadow.camera.right = 10
  sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -10
  sun.shadow.normalBias = .025
  sun.shadow.bias = -.0001
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#e5f3ff', 1)
  fill.position.set(7, 5, -8)
  scene.add(fill)

  const textures = new Set<THREE.Texture>()
  const materials = new Set<THREE.Material>()
  const geometries = new Set<THREE.BufferGeometry>()
  function material(options: THREE.MeshStandardMaterialParameters) {
    const m = new THREE.MeshStandardMaterial(options)
    materials.add(m)
    return m
  }
  function grain(base: string, lines: string, horizontal = false) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512)
    let seed = 87
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let i = 0; i < 1800; i++) {
      ctx.globalAlpha = .025 + random() * .055
      ctx.fillStyle = lines
      const x = random() * 512, y = random() * 512
      ctx.fillRect(x, y, horizontal ? 40 + random() * 150 : 1 + random() * 3, horizontal ? 1 : 6 + random() * 70)
    }
    ctx.globalAlpha = 1
    const map = new THREE.CanvasTexture(canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    textures.add(map)
    return map
  }
  function kraftPaper() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
    const ctx = canvas.getContext('2d')!, pixels = ctx.createImageData(512, 512)
    let seed = 193
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const offset = (y * 512 + x) * 4
      const noise = (random() - .5) * 14 + 1.7 * Math.sin(x * .073) * Math.sin(y * .081)
      pixels.data[offset] = 173 + noise; pixels.data[offset + 1] = 133 + noise
      pixels.data[offset + 2] = 83 + noise; pixels.data[offset + 3] = 255
    }
    ctx.putImageData(pixels, 0, 0)
    // Short, directionless recycled-paper fibres, without the long wood-grain streaks.
    ctx.lineWidth = .65
    for (let i = 0; i < 9000; i++) {
      const x = random() * 512, y = random() * 512, angle = random() * Math.PI * 2, length = 1 + random() * 4
      ctx.strokeStyle = i % 2 ? 'rgba(77,55,30,.15)' : 'rgba(225,202,159,.18)'
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length); ctx.stroke()
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.add(map)
    return map
  }
  function cutPaperEdge(vertical: boolean) {
    const canvas = document.createElement('canvas'); canvas.width = vertical ? 64 : 512; canvas.height = vertical ? 512 : 64
    const ctx = canvas.getContext('2d')!
    if (vertical) { ctx.translate(64, 0); ctx.rotate(Math.PI / 2) }
    ctx.fillStyle = '#b69868'; ctx.fillRect(0, 0, 512, 64)
    ctx.strokeStyle = '#715433'; ctx.lineWidth = 2
    for (const y of [7, 56]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke() }
    ctx.strokeStyle = '#8b6a41'; ctx.lineWidth = 2.2; ctx.beginPath()
    for (let x = 0; x <= 512; x++) {
      const y = 31.5 + Math.sin(x * Math.PI / 9) * 22
      if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(vertical ? 1 : 2, vertical ? 2 : 1)
    map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.add(map)
    return material({ map, roughness: .98 })
  }
  const wood = material({ map: grain('#ceb38c', '#6c4d2d'), roughness: .86, color: '#f8ecd4' })
  const darkWood = material({ map: grain('#ad8b5a', '#5c4025', true), roughness: .92 })
  const cardboard = material({ map: kraftPaper(), roughness: .98, side: THREE.DoubleSide })
  const cutVertical = cutPaperEdge(true), cutHorizontal = cutPaperEdge(false)
  const graphite = material({ color: '#26342f', roughness: .55 })
  const tape = material({ color: '#d7cfad', roughness: .95, transparent: true, opacity: .87 })
  const green = material({ color: '#255c4a', roughness: .48 })
  const cream = material({ color: '#efeee5', roughness: .84 })
  const threadMat = material({ color: '#b3482e', roughness: .9 })
  const ghostMat = material({ color: '#6e9c7c', transparent: true, opacity: .14, depthWrite: false, roughness: .5 })
  const ghostEdge = new THREE.LineBasicMaterial({ color: '#488b64', transparent: true, opacity: .62, depthWrite: false })
  materials.add(ghostEdge)
  function geom<T extends THREE.BufferGeometry>(g: T): T { geometries.add(g); return g }
  function mesh(g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geom(g), m)
    object.position.set(x, y, z); object.castShadow = object.receiveShadow = true
    parent.add(object); return object
  }
  function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material | THREE.Material[]) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z)
  }
  function cylinder(parent: THREE.Object3D, top: number, bottom: number, h: number, x: number, y: number, z: number, mat: THREE.Material, segments = 40) {
    return mesh(new THREE.CylinderGeometry(top, bottom, h, segments), mat, parent, x, y, z)
  }
  const table = box(scene, 200, .25, 200, 0, -.24, 0, material({ color: '#e8e5d8', roughness: .97 }))
  table.castShadow = false
  const movingBase = new THREE.Group(); scene.add(movingBase)
  box(movingBase, 4.55, .24, 6.2, 0, .14, 0, wood)
  box(movingBase, 4.58, .045, 6.23, 0, .27, 0, darkWood)
  box(movingBase, 4.38, .1, 6.0, 0, .345, 0, cardboard)
  // A fixed scale is useful for seeing the base move relative to the suspended pen.
  for (let i = -8; i <= 8; i++) box(movingBase, .018, .007, i % 4 ? .08 : .16, i * .23, .297, 3.02, graphite)
  const models: Record<PartId, THREE.Group> = { frame: new THREE.Group(), mass: new THREE.Group(), pen: new THREE.Group(), paper: new THREE.Group() }
  movingBase.add(models.frame, models.paper)
  scene.add(models.mass, models.pen)
  // Textbook construction: a cardboard box, cut out on its +x face.
  // The z sidewalls contain real slots so the paper can pass through both sides.
  box(models.frame, .11, 4.02, 6.0, -2.13, 2.36, 0, cardboard)
  const roofMaterial = cardboard.clone(); materials.add(roofMaterial)
  roofMaterial.transparent = true
  box(models.frame, 4.38, .12, 6.0, 0, 4.43, 0, roofMaterial)
  for (const z of [-2.94, 2.94]) {
    box(models.frame, 4.38, 3.72, .11, 0, 2.51, z, [cardboard, cardboard, cardboard, cutHorizontal, cardboard, cardboard])
    for (const x of [-1.83, 1.83]) box(models.frame, .72, .35, .11, x, .475, z, cardboard)
    box(models.frame, .12, 3.98, .31, 2.13, 2.36, z * .94,
      [cardboard, cardboard, cardboard, cardboard, z < 0 ? cutVertical : cardboard, z > 0 ? cutVertical : cardboard])
  }
  box(models.frame, .12, .32, 5.75, 2.13, .48, 0, [cardboard, cardboard, cutVertical, cardboard, cardboard, cardboard])
  box(models.frame, .12, .32, 5.75, 2.13, 4.25, 0, [cardboard, cardboard, cardboard, cutVertical, cardboard, cardboard])
  // Fold seams and a small piece of packing tape remain on the cardboard.
  box(models.frame, .012, 3.65, .014, -2.067, 2.48, 0, darkWood)
  box(models.frame, .015, .7, .36, -2.195, 2.8, 1.3, tape)
  box(models.frame, .6, .01, .34, -.9, 4.497, -2.2, tape)
  const holes = material({ color: '#503e2b', roughness: .95 })
  for (const z of [-.6, .6]) cylinder(models.frame, .055, .055, .008, 0, 4.497, z, holes, 16)
  const topTie = cylinder(models.frame, .018, .018, 1.2, 0, 4.51, 0, threadMat, 10)
  topTie.rotation.x = Math.PI / 2
  const cupMaterial = material({ map: grain('#f2efdf', '#908a76'), color: '#fffdf1', roughness: .93, side: THREE.DoubleSide })
  mesh(new THREE.CylinderGeometry(.72, .48, 1.5, 56, 1, true), cupMaterial, models.mass, 0, 1.95, 0)
  const cupBottom = mesh(new THREE.RingGeometry(.082, .475, 56), cupMaterial, models.mass, 0, 1.215, 0)
  cupBottom.rotation.x = -Math.PI / 2
  const cupRim = mesh(new THREE.TorusGeometry(.72, .034, 10, 64), cupMaterial, models.mass, 0, 2.70, 0)
  cupRim.rotation.x = Math.PI / 2
  const cupFoot = mesh(new THREE.TorusGeometry(.48, .019, 8, 48), cupMaterial, models.mass, 0, 1.20, 0)
  cupFoot.rotation.x = Math.PI / 2
  const fillingMat = material({ color: '#b1a180', roughness: 1 })
  cylinder(models.mass, .65, .61, .1, 0, 2.49, 0, fillingMat)
  const grainMaterials = ['#b2a18a','#c5b69c','#918673','#ded3bb'].map(color => material({ color, roughness: .97 }))
  const grainGeometry = geom(new THREE.IcosahedronGeometry(.055, 0))
  for (let i = 0; i < 160; i++) {
    const angle = i * 2.399963, radius = .61 * Math.sqrt((i + .5) / 160)
    const pellet = new THREE.Mesh(grainGeometry, grainMaterials[i%4])
    pellet.position.set(Math.cos(angle)*radius, 2.55 + .02*Math.sin(i*7), Math.sin(angle)*radius)
    pellet.scale.set(1, .6, .75); pellet.rotation.set(i*.4, i*.8, 0); pellet.castShadow = true
    models.mass.add(pellet)
  }
  // A sharpened pencil passes through the cup bottom; the exposed tip touches paper.
  cylinder(models.pen, .075, .075, 1.85, 0, 1.56, 0, green, 6)
  cylinder(models.pen, .073, .015, .2, 0, .535, 0, wood, 6)
  cylinder(models.pen, .016, .002, .034, 0, PAPER_Y+.017, 0, graphite, 12)
  const threadGeom = geom(new THREE.CylinderGeometry(.018, .018, 1, 10))
  const threads = [-1, 1].map(sign => {
    const t = new THREE.Mesh(threadGeom, threadMat); t.castShadow = true
    t.position.set(0, 3.535, sign*.65); t.scale.y = 1.713
    models.mass.add(t); return t
  })

  const paperCanvas = document.createElement('canvas'); paperCanvas.width = 512; paperCanvas.height = 1536
  const paperContext = paperCanvas.getContext('2d')!
  const paperMap = new THREE.CanvasTexture(paperCanvas); paperMap.colorSpace = THREE.SRGBColorSpace
  paperMap.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); textures.add(paperMap)
  const paperGeometry = new THREE.PlaneGeometry(2.65, 7.6, 1, 72)
  const paperPositions = paperGeometry.attributes.position!
  for (let i = 0; i < paperPositions.count; i++) {
    const z = .5 - paperPositions.getY(i), outside = Math.max(0, Math.abs(z) - 3.02)
    paperPositions.setZ(i, -Math.min(.21, outside * outside * .15))
  }
  paperGeometry.computeVertexNormals()
  const paperSurface = mesh(paperGeometry, material({ map: paperMap, roughness: .97, side: THREE.DoubleSide }), models.paper, 0, PAPER_Y, .5)
  paperSurface.rotation.x = -Math.PI / 2; paperSurface.castShadow = false
  // A plain long paper strip is pulled through the slots, without a drum or roller.
  // A lifted exit edge: the drawn tape visibly continues beyond the apparatus.
  const exitEdge = box(models.paper, 2.65, .012, .025, 0, PAPER_Y-.21, 4.3, cream)
  exitEdge.rotation.x = -.1

  const ghosts = {} as Record<PartId, THREE.Group>
  for (const part of PARTS) {
    const clone = models[part].clone(true)
    clone.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return
      object.material = ghostMat; object.castShadow = false; object.receiveShadow = false
      const edge = new THREE.LineSegments(geom(new THREE.EdgesGeometry(object.geometry, 30)), ghostEdge)
      object.add(edge)
    })
    ghosts[part] = clone
    if (part === 'frame' || part === 'paper') movingBase.add(clone)
    else scene.add(clone)
  }

  let state: InstrumentState = { installed: [], penGap: .34, base: 0, mass: 0, paperTravel: 0, trace: [], activePart: 'frame', phase: 'assembly' }
  let disposed = false, frameId = 0, width = 1, height = 1, locked = false
  let lastGuides = '', previews: Record<PartId, string> | null = null
  let lastPaperSignature = '', lastTrace: InstrumentState['trace'] | null = null
  let lastDragStatus: 'valid' | 'invalid' | null = null
  let flight: { start: number; from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3 } | null = null
  const point = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  const threadStart = new THREE.Vector3(), threadEnd = new THREE.Vector3(), threadDirection = new THREE.Vector3()
  // Include the moving base, exposed tape, and suspension, not the infinite desk.
  // A fitted perspective distance is required when the host becomes tall/narrow.
  const framingTarget = new THREE.Vector3(0, 2.1, .4)
  const framingCorners: THREE.Vector3[] = []
  for (const x of [-3.05, 3.05]) for (const y of [-.12, 4.65]) for (const z of [-3.15, 3.15]) {
    framingCorners.push(new THREE.Vector3(x, y, z).sub(framingTarget))
  }
  // The extended tape is low and narrow; treating it as a full-height box
  // unnecessarily shrinks the apparatus. Still include its full travel width.
  for (const x of [-2.05, 2.05]) for (const y of [.15, .45]) for (const z of [-3.4, 4.4]) {
    framingCorners.push(new THREE.Vector3(x, y, z).sub(framingTarget))
  }
  function fittedDistance(direction: THREE.Vector3) {
    const right = new THREE.Vector3().crossVectors(up, direction).normalize()
    if (right.lengthSq() < .0001) right.set(0, 0, -1)
    const vertical = new THREE.Vector3().crossVectors(direction, right).normalize()
    const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanX = tanY * camera.aspect
    // Keep room around the actual apparatus for DOM targets and the shake handle.
    const usableX = Math.max(.4, 1 - 2 * Math.min(90, width * .13) / width)
    const usableY = Math.max(.4, 1 - 2 * Math.min(80, height * .14) / height)
    let distance = 7
    for (const corner of framingCorners) {
      const near = corner.dot(direction)
      distance = Math.max(distance,
        Math.abs(corner.dot(right)) / (tanX * usableX) + near,
        Math.abs(corner.dot(vertical)) / (tanY * usableY) + near)
    }
    return distance + .35
  }
  function fitCurrentView() {
    const direction = camera.position.clone().sub(controls.target).normalize()
    const distance = fittedDistance(direction)
    controls.target.copy(framingTarget)
    camera.position.copy(framingTarget).addScaledVector(direction, distance)
    updateDistanceLimits(distance)
    controls.update(); camera.updateMatrixWorld()
  }
  function updateDistanceLimits(distance: number) {
    controls.minDistance = Math.max(6, distance * .6)
    controls.maxDistance = Math.max(30, distance * 2.1)
    camera.far = Math.max(90, distance * 3.5); camera.updateProjectionMatrix()
    if (scene.fog instanceof THREE.Fog) { scene.fog.near = distance * 2; scene.fog.far = distance * 4 }
  }

  function drawPaper() {
    const last = state.trace[state.trace.length - 1]
    const signature = `${state.trace.length}:${last?.t ?? 0}:${last?.mark ?? 0}:${state.paperTravel}`
    if (signature === lastPaperSignature && lastTrace === state.trace) return
    lastPaperSignature = signature; lastTrace = state.trace
    const ctx = paperContext, w = paperCanvas.width, h = paperCanvas.height
    ctx.fillStyle = '#fffef8'; ctx.fillRect(0, 0, w, h)
    // Plane UV has its top at z=-3.3 and bottom at z=4.3.
    const toY = (z: number) => (z + 3.3) / 7.6 * h
    const toX = (x: number) => (x / 2.65 + .5) * w
    ctx.lineWidth = 1; ctx.strokeStyle = '#e5e8df'
    for (let x = -1.2; x <= 1.21; x += .2) { ctx.beginPath(); ctx.moveTo(toX(x), 0); ctx.lineTo(toX(x), h); ctx.stroke() }
    const offset = (state.paperTravel * PAPER_SPEED) % .25
    for (let z = -3.55 + offset; z < 4.55; z += .25) { ctx.beginPath(); ctx.moveTo(0, toY(z)); ctx.lineTo(w, toY(z)); ctx.stroke() }
    ctx.strokeStyle = '#b9c8bc'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke()
    ctx.strokeStyle = '#235b4a'; ctx.lineWidth = 3.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    let started = false
    ctx.beginPath()
    for (const sample of state.trace) {
      const z = (state.paperTravel - sample.t) * PAPER_SPEED
      if (z > 4.4 || z < -.2) { started = false; continue }
      const x = toX(sample.mark * SCALE), y = toY(z)
      if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
    }
    ctx.stroke(); paperMap.needsUpdate = true
  }

  function syncState() {
    const dragStatus = state.activePart ? state.dragStatus ?? null : null
    if (dragStatus !== lastDragStatus) {
      lastDragStatus = dragStatus
      ghostMat.color.set(dragStatus === 'valid' ? '#2d9e56' : dragStatus === 'invalid' ? '#cb4738' : '#6e9c7c')
      ghostEdge.color.set(dragStatus === 'valid' ? '#217c43' : dragStatus === 'invalid' ? '#b33c30' : '#488b64')
      ghostMat.opacity = dragStatus ? .24 : .14
      ghostEdge.opacity = dragStatus ? .95 : .62
    }
    const base = state.base * SCALE, mass = state.mass * SCALE
    movingBase.position.x = base
    models.mass.position.x = ghosts.mass.position.x = mass
    models.pen.position.set(mass, Math.max(0, state.penGap), 0)
    ghosts.pen.position.copy(models.pen.position)
    for (const part of PARTS) {
      models[part].visible = state.installed.includes(part)
      ghosts[part].visible = !models[part].visible && state.activePart === part
    }
    threads.forEach((thread, i) => {
      const sign = i ? 1 : -1
      thread.visible = state.installed.includes('mass') && state.installed.includes('frame')
      threadStart.set(base-mass, 4.39, sign*.6); threadEnd.set(0, 2.68, sign*.70)
      threadDirection.subVectors(threadEnd, threadStart)
      thread.position.copy(threadStart).add(threadEnd).multiplyScalar(.5)
      thread.scale.y = threadDirection.length()
      thread.quaternion.setFromUnitVectors(up, threadDirection.normalize())
    })
    drawPaper()
  }

  function project(x: number, y: number, z: number, radius = .65): Guide {
    point.set(x, y, z).project(camera)
    const visible = point.z > -1 && point.z < 1
    const edgeX = Math.min(72, width * .18), edgeY = Math.min(64, height * .16)
    const px = THREE.MathUtils.clamp((point.x + 1) * width / 2, edgeX, width - edgeX)
    const py = THREE.MathUtils.clamp((1 - point.y) * height / 2, edgeY, height - edgeY)
    const distance = camera.position.distanceTo(new THREE.Vector3(x, y, z))
    const pixels = radius * height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance)
    return { x: px, y: py, radius: Math.max(25, Math.min(70, pixels)), visible }
  }
  function updateGuides() {
    const bx = state.base * SCALE, mx = state.mass * SCALE
    const guides: Guides = {
      frame: project(bx+2.2, 4.08, 0, .9), mass: project(mx, 2.0, 0),
      pen: project(mx, .83 + state.penGap, 0, .55), paper: project(bx, PAPER_Y, 3.4, .9),
      adjust: project(mx, PAPER_Y + state.penGap, 0, .4), shake: project(bx+2.2, .5, 1.8, .75),
    }
    const key = Object.values(guides).map(g => `${g.x.toFixed(1)},${g.y.toFixed(1)},${g.radius.toFixed(1)},${g.visible}`).join('|')
    if (key !== lastGuides) { lastGuides = key; onGuides(guides) }
  }
  function resize() {
    width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight)
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix()
    flight = null; controls.enabled = !locked
    fitCurrentView()
    updateGuides()
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host)
  function animate(now: number) {
    if (disposed) return
    frameId = requestAnimationFrame(animate)
    if (flight) {
      const t = Math.min(1, (now - flight.start) / 650), eased = t * t * (3 - 2 * t)
      camera.position.lerpVectors(flight.from, flight.to, eased)
      controls.target.lerpVectors(flight.targetFrom, flight.targetTo, eased)
      if (t >= 1) { flight = null; controls.enabled = !locked }
    }
    controls.update(); camera.updateMatrixWorld(); updateGuides(); renderer.render(scene, camera)
  }
  function setView(view: ViewMode) {
    roofMaterial.opacity = view === 'top' ? .08 : 1
    roofMaterial.depthWrite = view !== 'top'
    const direction = (view === 'front' ? new THREE.Vector3(14.5, 1.75, .01)
      : view === 'top' ? new THREE.Vector3(.01, 15, .015)
      : new THREE.Vector3(11.3, 5.15, 6.5)).normalize()
    const distance = fittedDistance(direction)
    const to = framingTarget.clone().addScaledVector(direction, distance)
    updateDistanceLimits(distance)
    flight = { start: performance.now(), from: camera.position.clone(), to, targetFrom: controls.target.clone(), targetTo: framingTarget.clone() }
    controls.enabled = false
  }
  function getPreviews(): Record<PartId, string> {
    if (previews) return previews
    const thumb = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
    thumb.setSize(320, 240); thumb.setPixelRatio(1); thumb.outputColorSpace = THREE.SRGBColorSpace
    thumb.toneMapping = THREE.ACESFilmicToneMapping; thumb.toneMappingExposure = 1.2
    const previewScene = new THREE.Scene()
    previewScene.add(new THREE.HemisphereLight('#fff8e9', '#8d998b', 2.7))
    const light = new THREE.DirectionalLight('#ffffff', 3); light.position.set(-4, 7, 6); previewScene.add(light)
    const previewCamera = new THREE.PerspectiveCamera(32, 320/240, .01, 100)
    const result = {} as Record<PartId, string>
    for (const part of PARTS) {
      const clone = models[part].clone(true); clone.visible = true; clone.position.set(0, 0, 0)
      previewScene.add(clone)
      const bounds = new THREE.Box3().setFromObject(clone), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3())
      const distance = Math.max(size.y, size.x / (320/240), size.z * .7) / (2 * Math.tan(THREE.MathUtils.degToRad(16))) * 1.35
      const direction = part === 'paper' ? new THREE.Vector3(.6, 1.6, 1).normalize() : new THREE.Vector3(1, .35, .45).normalize()
      previewCamera.position.copy(center).addScaledVector(direction, distance)
      previewCamera.lookAt(center); thumb.render(previewScene, previewCamera)
      result[part] = thumb.domElement.toDataURL('image/png')
      previewScene.remove(clone)
    }
    thumb.dispose(); thumb.forceContextLoss(); previews = result
    return result
  }
  syncState(); resize(); controls.update(); frameId = requestAnimationFrame(animate)
  return {
    setState(next: InstrumentState) { if (disposed) return; state = next; syncState(); updateGuides() },
    setView,
    setInteractionLocked(value: boolean) { locked = value; controls.enabled = !value && !flight },
    capture() { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png') },
    getPreviews,
    dispose() {
      if (disposed) return; disposed = true
      cancelAnimationFrame(frameId); resizeObserver.disconnect(); controls.dispose()
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose())
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
      scene.clear()
    },
  }
}
