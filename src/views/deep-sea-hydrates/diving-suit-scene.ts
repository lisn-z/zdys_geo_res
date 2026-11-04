import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export type SuitPart = 'helmet' | 'shell' | 'joint' | 'life'
export interface SuitMarker { id: SuitPart; x: number; y: number; visible: boolean }
export interface DivingSuitScene {
  setSection(value: boolean): void
  setPressure(value: boolean): void
  focus(part: SuitPart): void
  reset(): void
  dispose(): void
}

/** Generic atmospheric diving suit: educational construction, not a rated engineering design. */
export function createDivingSuitScene(host: HTMLElement, callbacks: {
  onMarkers(markers: SuitMarker[]): void
  onError(): void
}): DivingSuitScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .96
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.shadowMap.autoUpdate = false
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none'
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '具有刚性外壳、厚观察窗、耐压关节和生命支持系统的常压潜水服三维模型')
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#e9ece8')
  const camera = new THREE.PerspectiveCamera(35, 1, .04, 40)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = .08
  controls.enablePan = false; controls.minDistance = 1.7; controls.maxDistance = 10
  controls.minPolarAngle = .12; controls.maxPolarAngle = Math.PI * .64
  controls.target.set(0, 1.43, 0)
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, .04); room.dispose()
  scene.environment = environment.texture; scene.environmentIntensity = .85
  scene.add(new THREE.HemisphereLight('#f5f8f7', '#727970', 1.15))
  const light = new THREE.DirectionalLight('#fff8e8', 3); light.position.set(-3, 6, 5)
  light.castShadow = true; light.shadow.mapSize.set(1024, 1024)
  Object.assign(light.shadow.camera, { left: -2.3, right: 2.3, top: 3.4, bottom: -1.3, near: .1, far: 13 })
  light.shadow.bias = -.00015; light.shadow.normalBias = .006; scene.add(light)
  const rimLight = new THREE.DirectionalLight('#d7e3e6', 1.5); rimLight.position.set(3, 3, -3); scene.add(rimLight)
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const root = new THREE.Group(); scene.add(root)
  const mat = <T extends THREE.Material>(m: T): T => { materials.add(m); return m }
  // Fine directional tool marks belong to the cast/machined metal, not a large noisy colour texture.
  const finishCanvas = document.createElement('canvas'); finishCanvas.width = 256; finishCanvas.height = 256
  const finishContext = finishCanvas.getContext('2d')!
  const finishPixels = finishContext.createImageData(256, 256)
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const grain = Math.sin(y * 2.4) * 5 + Math.sin(y * .29 + Math.sin(x * .13)) * 3
    const value = Math.round(183 + grain + Math.sin(x * 13.7 + y * 31.1) * 2)
    const offset = (y * 256 + x) * 4
    finishPixels.data[offset] = value; finishPixels.data[offset + 1] = value; finishPixels.data[offset + 2] = value; finishPixels.data[offset + 3] = 255
  }
  finishContext.putImageData(finishPixels, 0, 0)
  const metalFinish = new THREE.CanvasTexture(finishCanvas)
  metalFinish.wrapS = metalFinish.wrapT = THREE.RepeatWrapping; metalFinish.repeat.set(3, 2)
  metalFinish.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(metalFinish)
  const paint = mat(new THREE.MeshStandardMaterial({ color: '#c4c8c2', metalness: .72, roughness: .47, roughnessMap: metalFinish, bumpMap: metalFinish, bumpScale: .0007 }))
  const edge = mat(new THREE.MeshStandardMaterial({ color: '#bcc3c1', metalness: .92, roughness: .33, roughnessMap: metalFinish }))
  const rubber = mat(new THREE.MeshStandardMaterial({ color: '#171d1e', metalness: .02, roughness: .78 }))
  const darkMetal = mat(new THREE.MeshStandardMaterial({ color: '#424c4e', metalness: .84, roughness: .4 }))
  const brass = mat(new THREE.MeshStandardMaterial({ color: '#a58a55', metalness: .75, roughness: .31 }))
  const warning = mat(new THREE.MeshStandardMaterial({ color: '#a02b2d', metalness: .48, roughness: .32 }))
  const glass = mat(new THREE.MeshPhysicalMaterial({ color: '#9daeb0', metalness: 0, roughness: .065, transmission: .48, thickness: .055, ior: 1.49, transparent: true, opacity: .77, clearcoat: 1, clearcoatRoughness: .035 }))
  const darkGlass = mat(new THREE.MeshPhysicalMaterial({ color: '#141c1f', metalness: .2, roughness: .13, clearcoat: 1 }))
  const lensMat = mat(new THREE.MeshPhysicalMaterial({ color: '#d8e2da', metalness: .2, roughness: .17, emissive: '#eee8cf', emissiveIntensity: .06 }))
  const linerMat = mat(new THREE.MeshStandardMaterial({ color: '#485251', metalness: .08, roughness: .86, side: THREE.BackSide }))
  const seatMat = mat(new THREE.MeshStandardMaterial({ color: '#465b5a', roughness: .94 }))
  const interiorMat = mat(new THREE.MeshStandardMaterial({ color: '#728b8a', roughness: .9 }))
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, pos: THREE.Vector3, parent: THREE.Object3D = root) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.copy(pos)
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const sphere = (radius: number, material: THREE.Material, x: number, y: number, z: number, scale = v(1, 1, 1), parent = root) => {
    const m = add(new THREE.SphereGeometry(radius, 36, 24), material, v(x, y, z), parent); m.scale.copy(scale); return m
  }
  const cylinder = (rt: number, rb: number, length: number, material: THREE.Material, x: number, y: number, z: number, parent = root) => add(new THREE.CylinderGeometry(rt, rb, length, 36), material, v(x, y, z), parent)
  const box = (sx: number, sy: number, sz: number, material: THREE.Material, x: number, y: number, z: number, parent = root) => add(new THREE.BoxGeometry(sx, sy, sz), material, v(x, y, z), parent)
  const housing = (sx: number, sy: number, sz: number, radius: number, material: THREE.Material, pos: THREE.Vector3, parent = root) => add(new RoundedBoxGeometry(sx, sy, sz, 3, radius), material, pos, parent)
  const tube = (a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material, parent = root) => {
    const d = b.clone().sub(a)
    const mesh = add(new THREE.CylinderGeometry(radius, radius, d.length(), 18), material, a.clone().add(b).multiplyScalar(.5), parent)
    mesh.quaternion.setFromUnitVectors(v(0, 1, 0), d.normalize()); return mesh
  }
  const ring = (radius: number, thickness: number, pos: THREE.Vector3, axis: THREE.Vector3, material: THREE.Material, parent = root) => {
    const m = add(new THREE.TorusGeometry(radius, thickness, 10, 48), material, pos, parent)
    m.quaternion.setFromUnitVectors(v(0, 0, 1), axis.clone().normalize()); return m
  }
  const boltCircle = (center: THREE.Vector3, radius: number, axis: THREE.Vector3, count: number, parent = root, size = .01) => {
    const q = new THREE.Quaternion().setFromUnitVectors(v(0, 0, 1), axis.clone().normalize())
    for (let i = 0; i < count; i++) {
      const t = i / count * Math.PI * 2
      const p = v(Math.cos(t) * radius, Math.sin(t) * radius, 0).applyQuaternion(q).add(center)
      const washer = add(new THREE.CylinderGeometry(size * 1.45, size * 1.45, .004, 18), darkMetal, p.clone().addScaledVector(axis, -.004), parent)
      washer.quaternion.setFromUnitVectors(v(0, 1, 0), axis.clone().normalize())
      const m = add(new THREE.CylinderGeometry(size, size, .011, 6), edge, p, parent)
      m.quaternion.setFromUnitVectors(v(0, 1, 0), axis.clone().normalize())
    }
  }
  const hose = (points: THREE.Vector3[], radius: number, material: THREE.Material) => {
    const path = new THREE.CatmullRomCurve3(points)
    return add(new THREE.TubeGeometry(path, 64, radius, 10, false), material, v(0, 0, 0))
  }
  const axialCylinder = (radius: number, length: number, pos: THREE.Vector3, axis: THREE.Vector3, material: THREE.Material, parent = root) => {
    const m = cylinder(radius, radius, length, material, pos.x, pos.y, pos.z, parent)
    m.quaternion.setFromUnitVectors(v(0, 1, 0), axis.clone().normalize()); return m
  }
  const castSection = (a: THREE.Vector3, b: THREE.Vector3, r1: number, r2: number, parent = root) => {
    const length = a.distanceTo(b), axis = b.clone().sub(a).normalize()
    const points = [[r1, 0], [r1, .04], [r1 * 1.025, .10], [r1 * .98, .24], [r2 * 1.025, .78], [r2, .94], [r2, 1]].map(([r, t]) => new THREE.Vector2(r!, (t! - .5) * length))
    const g = new THREE.LatheGeometry(points, 48), m = add(g, paint, a.clone().add(b).multiplyScalar(.5), parent)
    m.quaternion.setFromUnitVectors(v(0, 1, 0), axis)
    // The machined collars overlap the hollow cast section at each end, with a narrow visible gasket.
    return m
  }
  const bearing = (pos: THREE.Vector3, axis: THREE.Vector3, radius: number, parent = root, bolted = false) => {
    const d = axis.clone().normalize()
    axialCylinder(radius, .085, pos, d, rubber, parent)
    axialCylinder(radius + .008, .038, pos, d, warning, parent)
    for (const side of [-1, 1]) {
      axialCylinder(radius + .012, .018, pos.clone().addScaledVector(d, side * .042), d, edge, parent)
      ring(radius + .007, .004, pos.clone().addScaledVector(d, side * .055), d, darkMetal, parent)
    }
    if (bolted) boltCircle(pos.clone().addScaledVector(d, .053), radius * .86, d, 8, parent, .009)
  }
  function ovalBand(rx: number, ry: number, innerX: number, innerY: number, depth: number, center: THREE.Vector3, material: THREE.Material, parent = root) {
    const vertices: number[] = [], indices: number[] = [], segments = 72
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle)
      vertices.push(rx * c, ry * s, -depth / 2, rx * c, ry * s, depth / 2, innerX * c, innerY * s, -depth / 2, innerX * c, innerY * s, depth / 2)
      if (i < segments) {
        const a = i * 4, b = a + 4
        indices.push(a, b, a + 1, a + 1, b, b + 1, a + 2, a + 3, b + 2, a + 3, b + 3, b + 2,
          a + 1, b + 1, a + 3, a + 3, b + 1, b + 3, a, a + 2, b, a + 2, b + 2, b)
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
    return add(geometry, material, center, parent)
  }
  function convexViewport(rx: number, ry: number, sag: number, center: THREE.Vector3) {
    const vertices: number[] = [], indices: number[] = [], rings = 14, segments = 72
    for (let j = 0; j <= rings; j++) {
      const radius = j / rings
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2
        vertices.push(rx * radius * Math.cos(angle), ry * radius * Math.sin(angle), sag * (1 - radius * radius))
        if (j < rings && i < segments) { const a = j * (segments + 1) + i, b = a + segments + 1; indices.push(a, b, a + 1, b, b + 1, a + 1) }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
    const viewport = add(geometry, glass, center); viewport.castShadow = false
    return viewport
  }
  const plaque = (text: string, sx: number, sy: number, pos: THREE.Vector3, parent = root) => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128
    const context = canvas.getContext('2d')!
    context.fillStyle = '#d7dbd4'; context.fillRect(0, 0, 512, 128)
    context.strokeStyle = '#57615e'; context.lineWidth = 7; context.strokeRect(9, 9, 494, 110)
    context.fillStyle = '#35413e'; context.font = '600 40px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 256, 65, 470)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture)
    const material = mat(new THREE.MeshStandardMaterial({ map: texture, metalness: .25, roughness: .58 }))
    const m = add(new THREE.PlaneGeometry(sx, sy), material, pos, parent); m.castShadow = false; return m
  }

  // Engineering proportions and articulated cast sections follow WHOI's Exosuit photographs.
  // This remains a generic instructional model: no manufacturer name or depth rating is implied.
  const profile: Array<[number, number]> = [[.285, -.49], [.32, -.45], [.355, -.34], [.395, -.19], [.43, .10], [.435, .28], [.36, .43], [.24, .54]]
  const shellCenter = v(0, 1.73, 0)
  const shellProfile = profile.map(([r, y]) => new THREE.Vector2(r, y))
  const fixedShell = add(new THREE.LatheGeometry(shellProfile, 72, Math.PI / 2, Math.PI * 1.5), paint, shellCenter)
  fixedShell.scale.z = .80
  const removable = new THREE.Group(); root.add(removable)
  const frontQuarter = add(new THREE.LatheGeometry(shellProfile, 28, 0, Math.PI / 2), paint, shellCenter, removable); frontQuarter.scale.z = .80
  const cutGroup = new THREE.Group(); root.add(cutGroup); cutGroup.visible = false
  const inner = add(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r - .044, y)), 72, Math.PI / 2, Math.PI * 1.5), linerMat, shellCenter, cutGroup); inner.scale.z = .80
  for (const phi of [0, Math.PI / 2]) {
    const vertices: number[] = [], indices: number[] = []
    for (let i = 0; i < profile.length; i++) {
      const [r, y] = profile[i]!
      for (const rr of [r, r - .044]) vertices.push(Math.sin(phi) * rr, y, Math.cos(phi) * rr * .80)
      if (i < profile.length - 1) { const q = i * 2; indices.push(q, q + 1, q + 2, q + 1, q + 3, q + 2) }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals()
    add(g, mat(new THREE.MeshStandardMaterial({ color: '#bcaa7b', roughness: .42, metalness: .6, side: THREE.DoubleSide })), shellCenter, cutGroup)
  }
  // A real interior seat/harness remains inside the retained shell, rather than a transparent ghost suit.
  housing(.30, .07, .27, .025, seatMat, v(0, 1.29, -.015), cutGroup)
  housing(.30, .52, .065, .026, seatMat, v(0, 1.64, -.19), cutGroup)
  const seatedTorso = sphere(.23, interiorMat, 0, 1.70, -.015, v(.7, 1.45, .60), cutGroup); seatedTorso.castShadow = false
  for (const x of [-.11, .11]) tube(v(x, 1.96, .08), v(x * .65, 1.47, .11), .018, rubber, cutGroup)
  box(.05, .045, .025, brass, 0, 1.48, .135, cutGroup)
  // Opening flange at the torso. Continuous gasket, flange and screws physically touch each other.
  const waistAxis = v(0, 1, 0)
  axialCylinder(.302, .085, v(0, 1.245, 0), waistAxis, rubber)
  axialCylinder(.314, .027, v(0, 1.275, 0), waistAxis, edge)
  axialCylinder(.314, .027, v(0, 1.215, 0), waistAxis, edge)
  ring(.307, .006, v(0, 1.245, 0), waistAxis, warning)
  boltCircle(v(0, 1.294, 0), .29, waistAxis, 16, root, .011)
  const pelvis = add(new THREE.LatheGeometry([
    new THREE.Vector2(.20, -.12), new THREE.Vector2(.265, -.09), new THREE.Vector2(.305, .04), new THREE.Vector2(.302, .12),
  ], 56), paint, v(0, 1.10, 0)); pelvis.scale.z = .89
  // The pressure head has an actual front aperture and a convex thick viewport, not an opaque blue disk.
  const helmetCenter = v(0, 2.48, .015), apertureAngle = .85
  const helmetGeometry = new THREE.SphereGeometry(.335, 64, 40, 0, Math.PI * 2, apertureAngle, Math.PI - apertureAngle)
  helmetGeometry.rotateX(Math.PI / 2)
  const helmet = add(helmetGeometry, paint, helmetCenter); helmet.scale.set(1.03, 1.17, 1)
  helmet.name = 'Rigid pressure head with recessed viewport'
  const helmetInnerGeometry = new THREE.SphereGeometry(.307, 64, 36, 0, Math.PI * 2, apertureAngle, Math.PI - apertureAngle)
  helmetInnerGeometry.rotateX(Math.PI / 2)
  const headLiner = add(helmetInnerGeometry, linerMat, helmetCenter); headLiner.scale.set(1.03, 1.17, 1)
  // Empty headrest and communications pads can be seen through the optical element.
  housing(.21, .24, .055, .025, rubber, v(0, 2.49, -.18))
  for (const side of [-1, 1]) housing(.045, .14, .11, .02, seatMat, v(side * .195, 2.46, -.04))
  const port = v(0, 2.48, .244)
  ovalBand(.276, .319, .237, .278, .067, port, darkMetal)
  ovalBand(.271, .314, .248, .291, .028, port.clone().add(v(0, 0, .034)), warning)
  ovalBand(.249, .292, .235, .277, .018, port.clone().add(v(0, 0, .049)), edge)
  ovalBand(.239, .281, .231, .273, .034, port.clone().add(v(0, 0, .044)), rubber)
  convexViewport(.234, .276, .078, port.clone().add(v(0, 0, .051)))
  // Visible inner wall gives the acrylic port real thickness at grazing angles.
  ovalBand(.234, .276, .229, .271, .046, port.clone().add(v(0, 0, .026)), glass)
  for (let i = 0; i < 14; i++) {
    const angle = i / 14 * Math.PI * 2
    const at = port.clone().add(v(Math.cos(angle) * .259, Math.sin(angle) * .302, .055))
    axialCylinder(.0095, .010, at, v(0, 0, 1), edge)
  }
  // Folded mount and optical camera above the port. The housing attaches to the pressure head.
  housing(.105, .055, .16, .012, darkMetal, v(-.225, 2.78, .025))
  tube(v(-.225, 2.77, .025), v(-.225, 2.84, .085), .021, edge)
  axialCylinder(.058, .15, v(-.225, 2.85, .125), v(0, 0, 1), darkMetal)
  axialCylinder(.046, .014, v(-.225, 2.85, .206), v(0, 0, 1), darkGlass)
  ring(.051, .006, v(-.225, 2.85, .210), v(0, 0, 1), edge)
  // Small bolted flanges, latch dogs and twin work lights make the torso an equipment housing.
  for (const side of [-1, 1]) {
    const lampParent = side < 0 ? root : removable
    const lamp = housing(.084, .22, .045, .027, darkMetal, v(side * .112, 1.76, .345), lampParent)
    housing(.064, .196, .014, .022, lensMat, v(side * .112, 1.76, .373), lampParent)
    for (let j = 0; j < 5; j++) {
      axialCylinder(.012, .005, v(side * .112, 1.685 + j * .038, .383), v(0, 0, 1), brass, lampParent)
    }
    for (const y of [1.67, 1.85]) {
      axialCylinder(.007, .008, v(side * .144, y, .373), v(0, 0, 1), edge, lampParent)
    }
    lamp.name = 'Bolted work light'
    housing(.05, .09, .045, .008, darkMetal, v(side * .284, 1.285, .157))
    axialCylinder(.012, .055, v(side * .284, 1.287, .177), v(1, 0, 0), edge)
  }
  plaque('PRESSURE SHELL', .22, .055, v(-.085, 1.53, .313), removable)
  // Multiple sealed rotary bearings replace spherical toy joints. Arms are slightly bent forward.
  for (const side of [-1, 1]) {
    const shoulder = v(side * .39, 2.075, .015)
    const upperEnd = v(side * .67, 1.72, .13)
    const foreStart = v(side * .70, 1.58, .245)
    const wrist = v(side * .58, 1.31, .415)
    const upperAxis = upperEnd.clone().sub(shoulder).normalize(), foreAxis = wrist.clone().sub(foreStart).normalize()
    castSection(shoulder.clone().addScaledVector(upperAxis, -.055), upperEnd, .206, .163)
    bearing(shoulder.clone().addScaledVector(upperAxis, .055), upperAxis, .215, root, true)
    bearing(shoulder.clone().lerp(upperEnd, .66), upperAxis, .178)
    // An enclosed cast elbow bridges the two oblique bearing planes without exposed ball joints.
    hose([upperEnd.clone().addScaledVector(upperAxis, -.055), upperEnd, v(side * .715, 1.65, .17), foreStart], .158, paint)
    bearing(upperEnd.clone().addScaledVector(upperAxis, -.012), upperAxis, .167)
    bearing(foreStart, foreAxis, .166)
    castSection(foreStart, wrist, .158, .117)
    bearing(wrist, foreAxis, .123, root, true)
    const handBase = wrist.clone().addScaledVector(foreAxis, .12)
    castSection(wrist, handBase, .111, .076)
    const wristMount = housing(.12, .12, .10, .015, edge, handBase.clone().add(v(0, -.025, .03)))
    wristMount.rotation.z = side * .15
    // Mechanical two-jaw gripper with pivot pins, links and contact pads.
    for (const jaw of [-1, 1]) {
      const pivot = handBase.clone().add(v(jaw * .044, -.055, .038))
      const elbow = pivot.clone().add(v(jaw * .035, -.08, .075))
      const tip = elbow.clone().add(v(-jaw * .042, -.045, .055))
      tube(pivot, elbow, .019, edge); tube(elbow, tip, .017, edge)
      axialCylinder(.025, .031, pivot, v(0, 0, 1), darkMetal)
      axialCylinder(.011, .037, pivot, v(0, 0, 1), edge)
      housing(.031, .052, .025, .006, rubber, tip)
      tube(pivot.clone().add(v(-jaw * .014, .025, -.02)), elbow.clone().add(v(-jaw * .014, .014, -.02)), .008, darkMetal)
    }
    const hip = v(side * .176, 1.10, -.005)
    const knee = v(side * .235, .675, .015)
    const ankle = v(side * .245, .215, .025)
    const thighAxis = knee.clone().sub(hip).normalize(), calfAxis = ankle.clone().sub(knee).normalize()
    castSection(hip.clone().addScaledVector(thighAxis, -.055), knee, .184, .160)
    bearing(hip.clone().addScaledVector(thighAxis, .045), v(side * .40, -.92, .03), .185, root, true)
    bearing(hip.clone().lerp(knee, .52), v(-side * .30, -.95, .03), .177)
    bearing(knee.clone().addScaledVector(thighAxis, -.025), v(side * .24, -.96, .12), .166)
    castSection(knee, ankle, .157, .133)
    bearing(knee.clone().lerp(ankle, .28), v(-side * .25, -.96, .11), .161)
    bearing(ankle, calfAxis, .140, root, true)
    // A metal boot casting and attached dark tread rest directly on the plinth.
    housing(.272, .15, .40, .048, paint, v(side * .245, .135, .10))
    housing(.281, .045, .41, .018, rubber, v(side * .245, .052, .104))
    for (let j = 0; j < 5; j++) box(.258, .016, .022, darkMetal, side * .245, .026, -.044 + j * .073)
    for (const dz of [-.065, .23]) for (const dx of [-.10, .10]) axialCylinder(.008, .008, v(side * .245 + dx, .087, dz), v(0, 1, 0), edge)
    // Low raised casting ribs along the calf and forearm, joined to their body surfaces.
    const calfRib = new THREE.CatmullRomCurve3([v(side * .245, .55, .169), v(side * .255, .43, .173), v(side * .245, .28, .162)])
    add(new THREE.TubeGeometry(calfRib, 14, .008, 6, false), edge, v(0, 0, 0))
  }
  // Rear service frame, two joined gas vessels, protected valves and continuous ribbed hoses.
  housing(.51, .66, .24, .035, darkMetal, v(0, 1.80, -.445))
  housing(.55, .075, .275, .014, edge, v(0, 2.145, -.445))
  housing(.55, .075, .275, .014, edge, v(0, 1.455, -.445))
  for (const side of [-1, 1]) {
    tube(v(side * .24, 1.445, -.62), v(side * .24, 2.15, -.62), .018, edge)
    tube(v(side * .24, 1.445, -.62), v(side * .22, 1.43, -.28), .019, edge)
    const x = side * .13
    cylinder(.08, .08, .47, paint, x, 1.80, -.635)
    sphere(.08, paint, x, 2.035, -.635, v(1, .63, 1))
    sphere(.08, paint, x, 1.565, -.635, v(1, .63, 1))
    cylinder(.027, .027, .08, brass, x, 2.10, -.635)
    axialCylinder(.035, .025, v(x, 2.14, -.635), v(1, 0, 0), darkMetal)
    for (const y of [1.65, 1.96]) ring(.084, .014, v(x, y, -.635), v(0, 1, 0), rubber)
    for (const y of [1.65, 1.96]) box(.04, .031, .025, edge, x + side * .05, y, -.709)
    const points = [v(x, 2.14, -.635), v(side * .34, 2.24, -.63), v(side * .37, 2.45, -.38), v(side * .255, 2.49, -.188)]
    hose(points, .022, rubber)
    const path = new THREE.CatmullRomCurve3(points)
    for (let j = 1; j < 38; j++) ring(.022, .004, path.getPoint(j / 38), path.getTangent(j / 38), darkMetal)
    axialCylinder(.032, .06, v(side * .255, 2.49, -.188), v(side, 0, -.5), brass)
    // Compact side propulsion shrouds: open ducts, hub and blades rather than solid disks.
    const pod = v(side * .56, 1.77, -.43)
    tube(v(side * .23, 1.88, -.46), pod.clone().add(v(0, .08, 0)), .024, edge)
    tube(v(side * .23, 1.58, -.46), pod.clone().add(v(0, -.08, 0)), .024, edge)
    const outer = ovalBand(.145, .145, .118, .118, .19, pod, darkMetal)
    outer.name = 'Open propulsion duct'
    ovalBand(.149, .149, .119, .119, .016, pod.clone().add(v(0, 0, .098)), edge)
    ovalBand(.149, .149, .119, .119, .016, pod.clone().add(v(0, 0, -.098)), edge)
    axialCylinder(.036, .095, pod, v(0, 0, 1), edge)
    for (let j = 0; j < 5; j++) {
      const angle = j / 5 * Math.PI * 2
      const blade = housing(.041, .083, .013, .008, darkMetal, pod.clone().add(v(Math.cos(angle) * .069, Math.sin(angle) * .069, -.004)))
      blade.rotation.z = angle - Math.PI / 2; blade.rotation.y = .28
    }
    boltCircle(pod.clone().add(v(0, 0, .111)), .132, v(0, 0, 1), 8, root, .006)
  }
  const backLabel = plaque('LIFE SUPPORT', .29, .07, v(0, 1.80, -.732)); backLabel.rotation.y = Math.PI
  // Low plinth and a contact shadow keep the boots grounded.
  const plinthMat = mat(new THREE.MeshStandardMaterial({ color: '#c5d0c8', roughness: .8, metalness: .1 }))
  cylinder(.9, .94, .11, plinthMat, 0, -.036, 0)
  const ground = add(new THREE.CircleGeometry(8, 80), mat(new THREE.MeshStandardMaterial({ color: '#e3e9e3', roughness: 1 })), v(0, -.092, 0), scene)
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false
  const arrows = new THREE.Group(); scene.add(arrows); arrows.visible = false
  const arrowPairs: Array<[THREE.Vector3, THREE.Vector3]> = [
    [v(-1.18, 1.78, .1), v(-.48, 1.78, .1)], [v(1.18, 1.78, .1), v(.48, 1.78, .1)],
    [v(0, 1.76, 1.05), v(0, 1.76, .38)], [v(0, 1.76, -1.21), v(0, 1.76, -.67)],
    [v(0, 3.35, 0), v(0, 2.91, 0)], [v(0, .61, .37), v(0, 1.10, .37)],
    [v(-.91, .65, .08), v(-.42, .65, .08)], [v(.91, .65, .08), v(.42, .65, .08)],
  ]
  for (const [a, b] of arrowPairs) {
    const d = b.clone().sub(a); const arrow = new THREE.ArrowHelper(d.clone().normalize(), a, d.length(), '#458a98', .075, .045)
    arrows.add(arrow)
  }
  const anchors: Record<SuitPart, THREE.Vector3> = {
    helmet: v(-.13, 2.73, .31), shell: v(-.36, 1.91, .25), joint: v(.71, 1.67, .22), life: v(-.25, 2.12, -.65),
  }
  let width = 1, height = 1, raf = 0, disposed = false, resizePending = true, manual = false
  let flight: { start: number; from: THREE.Vector3; to: THREE.Vector3; targetFrom: THREE.Vector3; targetTo: THREE.Vector3 } | null = null
  const motionReduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  controls.addEventListener('start', () => { manual = true; flight = null; controls.enabled = true })
  function pose() { const fit = Math.max(1, .95 / (width / height)); return { target: v(0, 1.44, 0), eye: v(3.1, .80, 4.5).multiplyScalar(fit).add(v(0, 1.44, 0)) } }
  function fly(eye: THREE.Vector3, target: THREE.Vector3, instant = false) {
    const eyeBefore = camera.position.clone(), targetBefore = controls.target.clone()
    controls.enableDamping = false; controls.update(); controls.enableDamping = true
    camera.position.copy(eyeBefore); controls.target.copy(targetBefore)
    if (instant || motionReduced) { flight = null; camera.position.copy(eye); controls.target.copy(target); camera.lookAt(target); controls.enabled = true; controls.update() }
    else { controls.enabled = false; flight = { start: performance.now(), from: eyeBefore, to: eye, targetFrom: targetBefore, targetTo: target } }
  }
  function resize() {
    const rect = host.getBoundingClientRect(); if (rect.width < 1 || rect.height < 1) return
    width = rect.width; height = rect.height; renderer.setSize(width, height, false)
    camera.aspect = width / height; camera.updateProjectionMatrix()
    if (!manual) { const p = pose(); fly(p.eye, p.target, true) }
  }
  const projected = new THREE.Vector3()
  function markers() {
    camera.updateMatrixWorld()
    callbacks.onMarkers((Object.keys(anchors) as SuitPart[]).map(id => {
      projected.copy(anchors[id]).project(camera)
      const facing = id !== 'life' || camera.position.z < .45
      return { id, x: (projected.x * .5 + .5) * width, y: (-projected.y * .5 + .5) * height,
        visible: facing && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .9 && Math.abs(projected.y) < .9 }
    }))
  }
  let labelTime = 0
  function animate(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(animate)
    if (document.hidden) return
    if (resizePending) { resize(); resizePending = false }
    if (flight) {
      const t = THREE.MathUtils.clamp((now - flight.start) / 850, 0, 1), e = t * t * (3 - 2 * t)
      camera.position.lerpVectors(flight.from, flight.to, e); controls.target.lerpVectors(flight.targetFrom, flight.targetTo, e); camera.lookAt(controls.target)
      if (t === 1) { flight = null; controls.enabled = true; controls.update() }
    } else controls.update()
    renderer.render(scene, camera)
    if (now - labelTime > 60 || flight) { labelTime = now; markers() }
  }
  const observer = new ResizeObserver(() => { resizePending = true }); observer.observe(host)
  const lost = (event: Event) => { event.preventDefault(); callbacks.onError() }
  renderer.domElement.addEventListener('webglcontextlost', lost)
  resize(); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); raf = requestAnimationFrame(animate)
  return {
    setSection(value) { removable.visible = !value; cutGroup.visible = value; renderer.shadowMap.needsUpdate = true; if (value) { manual = true; fly(v(2.0, 2.05, 2.9), v(0, 1.69, 0)) } },
    setPressure(value) { arrows.visible = value },
    focus(id) { manual = true; const target = anchors[id].clone(); const offset = id === 'life' ? v(-1.45, .35, -2.2) : id === 'helmet' ? v(.95, .25, 1.65) : id === 'joint' ? v(1.3, .25, 1.8) : v(1.8, .30, 2.5); fly(target.clone().add(offset), target) },
    reset() { manual = false; const p = pose(); fly(p.eye, p.target) },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(raf); observer.disconnect(); controls.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      const geometries = new Set<THREE.BufferGeometry>()
      scene.traverse(obj => { const mesh = obj as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(m) })
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); light.shadow.map?.dispose()
      environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove(); scene.clear()
    },
  }
}
