import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Sky } from 'three/addons/objects/Sky.js'
import { createArchitecturalMaterials } from './materials'
import type { RoofKind, RoofScene, SceneState, ScreenPoint, ViewMode } from './types'

const DEG = Math.PI / 180
type Surface = { root: THREE.Group; width: number; depth: number; low: number; angle: number; x: number; z: number; yaw: number; tiles: THREE.InstancedMesh; rafters: THREE.InstancedMesh; trim: THREE.Mesh[]; slab: THREE.Mesh; rows: number; columns: number }
type Building = { root: THREE.Group; surfaces: Surface[]; paths: THREE.Vector3[][]; bounds: THREE.Box3; target: THREE.Vector3 }

/** Same-origin OSS resource forwarding keeps scene captures readable by canvas. */
export function createRoofScene(host: HTMLElement, onHandle?: (point: ScreenPoint) => void): RoofScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#e3e8df')
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;user-select:none;-webkit-user-select:none;'
  renderer.domElement.setAttribute('aria-label', '民居屋顶、降雨和排水路径三维场景')
  host.appendChild(renderer.domElement)
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 160)
  camera.position.set(15, 12, 18)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 2, 0); controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .09
  controls.minDistance = 9; controls.maxDistance = 40; controls.minPolarAngle = .045; controls.maxPolarAngle = Math.PI * .48
  scene.add(new THREE.HemisphereLight('#f7fbff', '#b9b096', 1.3))
  const sun = new THREE.DirectionalLight('#fff4d9', 3.0); sun.position.set(-9, 17, 11); sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -13; sun.shadow.camera.right = 13
  sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -13; sun.shadow.camera.near = 1; sun.shadow.camera.far = 50
  sun.shadow.normalBias = .035; sun.shadow.bias = -.00008; scene.add(sun, sun.target)
  const sky = new Sky(); sky.scale.setScalar(120); scene.add(sky)
  sky.material.uniforms.turbidity!.value = 8; sky.material.uniforms.rayleigh!.value = .65
  sky.material.uniforms.mieCoefficient!.value = .01; sky.material.uniforms.mieDirectionalG!.value = .75
  sky.material.uniforms.sunPosition!.value.copy(sun.position).normalize()

  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
  geometries.add(sky.geometry); materials.add(sky.material)
  const geometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.add(g); return g }
  const mat = (params: THREE.MeshStandardMaterialParameters) => { const m = new THREE.MeshStandardMaterial(params); materials.add(m); return m }
  function mesh(parent: THREE.Object3D, g: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry(g), material); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m
  }
  function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
    const g = new THREE.BoxGeometry(w, h, d), p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = g.getAttribute('uv')
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(n.getY(i)) > .5) uv.setXY(i, p.getX(i) + w / 2, p.getZ(i) + d / 2)
      else if (Math.abs(n.getX(i)) > .5) uv.setXY(i, p.getZ(i) + d / 2, p.getY(i) + h / 2)
      else uv.setXY(i, p.getX(i) + w / 2, p.getY(i) + h / 2)
    }
    return mesh(parent, g, material, x, y, z)
  }
  function scaledBoxUV(g: THREE.BufferGeometry, sx: number, sy: number, sz: number) {
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), uv = g.getAttribute('uv')
    for (let i = 0; i < p.count; i++) {
      if (Math.abs(n.getY(i)) > .5) uv.setXY(i, p.getX(i) * sx, p.getZ(i) * sz)
      else if (Math.abs(n.getX(i)) > .5) uv.setXY(i, p.getZ(i) * sz, p.getY(i) * sy)
      else uv.setXY(i, p.getX(i) * sx, p.getY(i) * sy)
    }
    uv.needsUpdate = true
  }
  function rod(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, material: THREE.Material) {
    const m = mesh(parent, new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), material)
    m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); return m
  }
  const rng = (n: number) => { const f = Math.sin(n * 127.1 + 311.7) * 43758.5453; return f - Math.floor(f) }
  let disposed = false
  const { cream, brick, earth, stone, timber, dark, ceramic, windowMat, tileMat, groundMat, stageMat } =
    createArchitecturalMaterials(renderer, textures, materials, () => disposed)
  const waterMat = mat({ color: '#829fa3', transparent: true, opacity: .42, roughness: .24, metalness: .05, depthWrite: false })
  const gutterWaterMat = mat({ color: '#9eb7b9', transparent: true, opacity: .48, roughness: .22, depthWrite: false })
  const groundGeometry = new THREE.CircleGeometry(90, 96), groundUV = groundGeometry.getAttribute('uv'), groundPosition = groundGeometry.getAttribute('position')
  for (let i = 0; i < groundPosition.count; i++) groundUV.setXY(i, groundPosition.getX(i), groundPosition.getY(i))
  const ground = mesh(scene, groundGeometry, groundMat, 0, -.13, 0)
  ground.rotation.x = -Math.PI / 2; ground.castShadow = false
  const stage = box(scene, 15, .22, 13, 0, -.01, 0, stageMat)
  stage.receiveShadow = true
  const labels: { sprite: THREE.Sprite; pixels: number }[] = []
  function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width = 1.3) {
    const pixels = Math.max(72, [...text].reduce((sum, character) => sum + (character.charCodeAt(0) > 255 ? 14 : 8), 24))
    const c = document.createElement('canvas'); c.width = pixels * 4; c.height = 112; const ctx = c.getContext('2d')!
    ctx.fillStyle = 'rgba(251,249,235,.94)'; ctx.beginPath(); ctx.roundRect(3, 3, c.width - 6, 106, 18); ctx.fill()
    ctx.fillStyle = '#234a39'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 56px "Microsoft YaHei",sans-serif'; ctx.fillText(text, c.width / 2, 57)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; textures.add(t)
    const m = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, sizeAttenuation: false }); materials.add(m)
    const sprite = new THREE.Sprite(m); sprite.position.set(x, y, z); sprite.scale.set(width, width / 4, 1); parent.add(sprite); labels.push({ sprite, pixels }); return sprite
  }
  function makeBuilding(): Building { const root = new THREE.Group(); scene.add(root); return { root, surfaces: [], paths: [], bounds: new THREE.Box3(new THREE.Vector3(-6, .1, -5), new THREE.Vector3(6, 6, 5)), target: new THREE.Vector3(0, 2, 0) } }
  const houses: Record<RoofKind, Building> = { shanxi: makeBuilding(), anhui: makeBuilding(), xinjiang: makeBuilding() }
  const experiment = makeBuilding()

  // A short fired-clay tile shell: tapered head, curved face, 9 mm lip, and
  // a raised downstream end. Each course overlaps the next with real clearance.
  const tilePositions: number[] = [], tileIndices: number[] = [], tileUV: number[] = []
  for (let layer = 0; layer < 2; layer++) for (let row = 0; row < 3; row++) for (let i = 0; i <= 8; i++) {
    const a = i / 8 * Math.PI, t = row / 2
    tilePositions.push(Math.cos(a) * .5 * (.94 + t * .06), Math.sin(a) * .024 + t * .014 - layer * .009, t - .5)
    tileUV.push(i / 8 * .25, t * .32)
  }
  for (let layer = 0; layer < 2; layer++) for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) {
    const a = layer * 27 + row * 9 + i
    if (!layer) tileIndices.push(a, a + 1, a + 9, a + 1, a + 10, a + 9)
    else tileIndices.push(a, a + 9, a + 1, a + 1, a + 9, a + 10)
  }
  for (let i = 0; i < 8; i++) { tileIndices.push(i, i + 27, i + 1, i + 1, i + 27, i + 28); const a = 18 + i; tileIndices.push(a, a + 1, a + 27, a + 1, a + 28, a + 27) }
  for (let row = 0; row < 2; row++) for (const i of [0, 8]) {
    const a = row * 9 + i
    if (i === 0) tileIndices.push(a, a + 9, a + 27, a + 9, a + 36, a + 27)
    else tileIndices.push(a, a + 27, a + 9, a + 9, a + 27, a + 36)
  }
  const tileGeometry = geometry(new THREE.BufferGeometry()); tileGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tilePositions, 3)); tileGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(tileUV, 2)); tileGeometry.setIndex(tileIndices); tileGeometry.computeVertexNormals()
  const dummy = new THREE.Object3D(), tileColor = new THREE.Color()
  function setSurface(s: Surface, angle: number) {
    s.angle = angle; const radians = angle * DEG, length = s.depth / Math.cos(radians)
    s.root.position.set(s.x, s.low + s.depth / 2 * Math.tan(radians), s.z); s.root.rotation.set(radians, s.yaw, 0, 'YXZ')
    s.slab.scale.set(s.width, 1, length)
    scaledBoxUV(s.slab.geometry, s.width, 1, length)
    for (let row = 0; row < s.rows; row++) for (let col = 0; col < s.columns; col++) {
      const pitch = length / s.rows, edgeOffset = row === 0 ? pitch * .06 : row === s.rows - 1 ? -pitch * .06 : 0
      dummy.position.set((col + .5) / s.columns * s.width - s.width / 2, .004 + rng(row * 29 + col + 67) * .001,
        (row + .5) * pitch - length / 2 + edgeOffset + (row > 0 && row < s.rows - 1 ? (rng(col + 11) - .5) * .004 : 0))
      dummy.rotation.set(0, 0, 0); dummy.scale.set(s.width / s.columns * .985, 1, pitch * 1.12); dummy.updateMatrix()
      s.tiles.setMatrixAt(row * s.columns + col, dummy.matrix)
    }
    s.tiles.instanceMatrix.needsUpdate = true; s.tiles.computeBoundingSphere()
    for (let i = 0; i < s.rafters.count; i++) {
      dummy.position.set((i + .5) / s.rafters.count * s.width - s.width / 2, -.18, 0); dummy.scale.set(.075, .10, length - .035); dummy.updateMatrix(); s.rafters.setMatrixAt(i, dummy.matrix)
    }
    s.rafters.instanceMatrix.needsUpdate = true; s.rafters.computeBoundingSphere()
    scaledBoxUV(s.rafters.geometry, .075, .10, length - .035)
    s.trim.forEach((piece, i) => {
      if (i < 2) { piece.position.set((i ? 1 : -1) * (s.width / 2 + .025), -.09, 0); piece.scale.set(.055, .14, length) }
      else { piece.position.set(0, -.265, (i === 2 ? -1 : 1) * (length / 2 - .22)); piece.scale.set(s.width - .04, .13, .13) }
      scaledBoxUV(piece.geometry, piece.scale.x, piece.scale.y, piece.scale.z)
    })
  }
  function roof(b: Building, x: number, z: number, width: number, depth: number, low: number, angle: number, yaw = 0, tiled = true) {
    const root = new THREE.Group(); b.root.add(root)
    const slab = mesh(root, new THREE.BoxGeometry(1, .12, 1), tiled ? ceramic : earth, 0, -.07, 0)
    const columns = Math.ceil(width / .25), rows = Math.ceil(depth / .30)
    const tiles = new THREE.InstancedMesh(tileGeometry, tileMat, rows * columns); tiles.castShadow = tiles.receiveShadow = true; tiles.visible = tiled; root.add(tiles)
    for (let i = 0; i < rows * columns; i++) { tileColor.setScalar(.80 + rng(i + 8) * .18); tiles.setColorAt(i, tileColor) }
    const rafters = new THREE.InstancedMesh(geometry(new THREE.BoxGeometry(1, 1, 1)), timber, Math.ceil(width / .53)); rafters.castShadow = rafters.receiveShadow = true; rafters.visible = tiled; root.add(rafters)
    const trim = Array.from({ length: 4 }, () => { const piece = box(root, 1, 1, 1, 0, 0, 0, timber); piece.visible = tiled; return piece })
    const result = { root, width, depth, low, angle, x, z, yaw, tiles, rafters, trim, slab, rows, columns }; b.surfaces.push(result); setSurface(result, angle); return result
  }
  function surfacePoint(s: Surface, across: number, downslope: number, lift = .045) {
    return new THREE.Vector3(across * s.width / 2, lift, downslope * s.depth / (2 * Math.cos(s.angle * DEG))).applyEuler(s.root.rotation).add(s.root.position)
  }
  function walls(parent: THREE.Object3D, w: number, d: number, low: number, slope: number, material: THREE.Material) {
    const g = geometry(new THREE.BufferGeometry()), wall = new THREE.Mesh(g, material); wall.castShadow = wall.receiveShadow = true; parent.add(wall)
    const update = (angle: number) => {
      const high = low + d * Math.tan(angle * DEG)
      const p = new Float32Array([-w/2,.12,-d/2, w/2,.12,-d/2, w/2,.12,d/2, -w/2,.12,d/2, -w/2,high,-d/2, w/2,high,-d/2, w/2,low,d/2, -w/2,low,d/2])
      const indices = [0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0,4,7,6,4,6,5,0,1,2,0,2,3]
      const vertices = new Float32Array(108), uv = new Float32Array(72)
      for (let i = 0; i < indices.length; i++) {
        const k = indices[i]! * 3, face = Math.floor(i / 6)
        vertices.set(p.subarray(k, k + 3), i * 3)
        uv[i * 2] = face === 1 || face === 3 ? p[k + 2]! : p[k]!
        uv[i * 2 + 1] = face >= 4 ? p[k + 2]! : p[k + 1]!
      }
      if (g.getAttribute('position')) {
        (g.getAttribute('position') as THREE.BufferAttribute).array.set(vertices); g.getAttribute('position').needsUpdate = true;
        (g.getAttribute('uv') as THREE.BufferAttribute).array.set(uv); g.getAttribute('uv').needsUpdate = true
      } else { g.setAttribute('position', new THREE.BufferAttribute(vertices, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)) }
      g.computeVertexNormals(); g.computeBoundingSphere()
    }
    update(slope); return update
  }
  function door(parent: THREE.Object3D, x: number, y: number, z: number, w = .9, h = 1.6, isWindow = false, surround: THREE.Material = stone) {
    // Recessed dark backing, projecting stone reveals and a separate timber frame
    // create actual shadow depth instead of a black rectangle pasted on a wall.
    box(parent, w + .035, h + .025, .025, x, y + h / 2, z + .015, isWindow ? windowMat : dark)
    for (const side of [-1, 1]) {
      box(parent, .12, h + .20, .23, x + side * (w / 2 + .085), y + h / 2, z + .03, surround)
      box(parent, .055, h, .085, x + side * (w / 2 - .025), y + h / 2, z + .079, timber)
    }
    box(parent, w + .29, .13, .25, x, y + h + .08, z + .04, surround)
    box(parent, w + .31, .12, .34, x, y - .04, z + .09, surround)
    for (const yy of [y + .025, y + h - .025]) box(parent, w, .05, .085, x, yy, z + .079, timber)
    if (isWindow) {
      for (const dx of [-.30, -.10, .10, .30]) box(parent, .025, h - .07, .036, x + dx * w, y + h / 2, z + .103, timber)
      for (const fraction of [.25, .5, .75]) box(parent, w - .07, .026, .036, x, y + h * fraction, z + .103, timber)
    } else {
      for (const side of [-1, 1]) {
        const leafX = x + side * w * .245
        box(parent, w * .465, h * .75, .035, leafX, y + h * .395, z + .056, timber)
        for (const dy of [.18, .56]) box(parent, w * .365, h * .27, .018, leafX, y + h * dy, z + .084, timber)
        for (const dy of [.10, .71]) box(parent, w * .42, .033, .025, leafX, y + h * dy, z + .099, dark)
        const ring = mesh(parent, new THREE.TorusGeometry(.032, .008, 6, 12), dark, x + side * .09, y + h * .43, z + .118); ring.castShadow = false
      }
      box(parent, .04, h - .06, .06, x, y + h / 2, z + .09, timber)
      box(parent, w - .08, .045, .065, x, y + h * .80, z + .087, timber)
      for (const dx of [-.3, -.1, .1, .3]) box(parent, .026, h * .15, .034, x + dx * w, y + h * .895, z + .105, timber)
      box(parent, w + .42, .12, .52, x, y - .15, z + .15, surround)
    }
  }
  const drainageWalls: { parent: THREE.Object3D; a: THREE.Vector3; b: THREE.Vector3; thickness: number; height: number }[] = []
  function channel(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, width = .20) {
    const root = new THREE.Group(); root.position.copy(a).add(b).multiplyScalar(.5); root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z); parent.add(root)
    const length = a.distanceTo(b); box(root, width, .05, length, 0, -.025, 0, stone)
    const offset = new THREE.Vector3(b.z - a.z, 0, a.x - b.x).normalize().multiplyScalar(width / 2)
    for (const side of [-1, 1]) {
      const first = a.clone().addScaledVector(offset, side), last = b.clone().addScaledVector(offset, side); first.y += .03; last.y += .03
      drainageWalls.push({ parent, a: first, b: last, thickness: .035, height: .12 })
    }
  }
  const poolWaters: THREE.Mesh[] = []
  function pool(parent: THREE.Object3D, x: number, z: number, width: number, depth: number) {
    box(parent, width, .10, depth, x, .14, z, dark)
    for (const xx of [x - width / 2, x + width / 2]) drainageWalls.push({ parent, a: new THREE.Vector3(xx, .24, z - (depth + .13) / 2), b: new THREE.Vector3(xx, .24, z + (depth + .13) / 2), thickness: .13, height: .24 })
    for (const zz of [z - depth / 2, z + depth / 2]) drainageWalls.push({ parent, a: new THREE.Vector3(x - width / 2, .24, zz), b: new THREE.Vector3(x + width / 2, .24, zz), thickness: .13, height: .24 })
    const water = mesh(parent, new THREE.PlaneGeometry(width - .13, depth - .13), waterMat, x, .207, z); water.rotation.x = -Math.PI / 2; water.castShadow = false
    poolWaters.push(water)
  }
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  // Shanxi: three single-pitch wings face the courtyard, collecting rain inward.
  {
    const b = houses.shanxi; b.bounds.set(V(-5.7, .1, -5.2), V(5.7, 5, 5.45)); b.target.set(0, 1.9, 0)
    box(b.root, 10.5, .12, 10, 0, .12, 0, stone)
    const wings = [{ x: 0, z: -3.5, w: 9.8, d: 2.8, yaw: 0 }, { x: -3.7, z: .9, w: 6.0, d: 2.8, yaw: Math.PI / 2 }, { x: 3.7, z: .9, w: 6.0, d: 2.8, yaw: -Math.PI / 2 }]
    for (const wing of wings) {
      const structure = new THREE.Group(); structure.position.set(wing.x, 0, wing.z); structure.rotation.y = wing.yaw; b.root.add(structure)
      walls(structure, wing.w - .25, wing.d - .6, 2.4, 22, brick)
      box(structure, wing.w - .19, .27, wing.d - .52, 0, .29, 0, stone)
      box(structure, wing.w - .18, .075, wing.d - .50, 0, .46, 0, stone)
      const facade = wing.d / 2 - .285
      if (wing.w > 8) {
        door(structure, 0, .27, facade, 1.0, 1.80)
        for (const x of [-3.65, -1.85, 1.85, 3.65]) door(structure, x, 1.00, facade, 1.05, 1.03, true)
      } else {
        door(structure, -.70, .27, facade, .88, 1.78)
        door(structure, 1.35, 1.02, facade, 1.30, 1.01, true)
        door(structure, -2.12, 1.10, facade, .68, .91, true)
      }
      // Continuous eaves lintel and spaced masonry piers read as a building frame.
      box(structure, wing.w - .16, .13, .16, 0, 2.24, facade + .04, timber)
      for (const x of [-wing.w / 2 + .25, wing.w / 2 - .25]) box(structure, .19, 1.83, .16, x, 1.37, facade + .035, brick)
      const s = roof(b, wing.x, wing.z, wing.w, wing.d, 2.42, 22, wing.yaw)
      const a = surfacePoint(s, -1, 1), c = surfacePoint(s, 1, 1); a.y = c.y = .23
      channel(b.root, a, c, .26)
      const junction = surfacePoint(s, 0, 1); junction.y = .24
      channel(b.root, junction, V(0, .24, .7), .23)
      for (let i = -3; i <= 3; i++) {
        // The rear wing's outer eaves meet the side wings. Show drip paths over
        // the open courtyard, rather than drawing through that roof junction.
        const across = wing.w > 8 ? i / 3 * 2.0 / (s.width / 2) : i / 4
        const top = surfacePoint(s, across, -.94), edge = surfacePoint(s, across, 1)
        const landing = edge.clone(); landing.y = .24
        b.paths.push([top, edge, landing, junction.clone(), V(0, .24, .7)])
      }
    }
    pool(b.root, 0, .7, 1.35, 1.35); label(b.root, '天井集水', 0, .82, .7, 1.55)
    // Entry enclosure remains low enough for the courtyard drainage to be visible.
    for (const x of [-3.25, 3.25]) {
      box(b.root, 3.84, 1.05, .19, x, .70, 4.9, brick)
      box(b.root, 3.90, .075, .27, x, 1.26, 4.9, ceramic)
      box(b.root, 3.87, .17, .25, x, .25, 4.9, stone)
    }
    for (const x of [-1.19, 1.19]) {
      box(b.root, .31, 2.08, .37, x, 1.25, 4.9, brick)
      box(b.root, .42, .23, .47, x, .285, 4.9, stone)
      box(b.root, .40, .12, .46, x, 2.29, 4.9, brick)
    }
    box(b.root, 2.48, .14, .25, 0, 2.31, 4.9, timber)
    roof(b, 0, 4.84, 2.80, .98, 2.40, 18, Math.PI)
  }
  // Anhui: double pitched roof, stepped firebreak gables, and a receiving ditch.
  {
    const b = houses.anhui; b.bounds.set(V(-5.4, .1, -4.8), V(5.4, 6.2, 4.8)); b.target.set(0, 2.4, 0)
    box(b.root, 8.2, 3.15, 5.8, 0, 1.7, 0, cream)
    box(b.root, 8.3, .42, 5.9, 0, .40, 0, stone)
    door(b.root, 0, .24, 2.96, 1.25, 2.0); door(b.root, -2.5, 1.2, 2.96, 1.0, 1.15, true); door(b.root, 2.5, 1.2, 2.96, 1.0, 1.15, true)
    const front = roof(b, 0, 1.6, 8.65, 3.2, 3.3, 31), rear = roof(b, 0, -1.6, 8.65, 3.2, 3.3, 31, Math.PI)
    const ridge = 3.3 + 3.2 * Math.tan(31 * DEG)
    box(b.root, 8.85, .07, .18, 0, ridge + .025, 0, ceramic)
    const ridgeTiles = new THREE.InstancedMesh(tileGeometry, tileMat, 30); ridgeTiles.castShadow = ridgeTiles.receiveShadow = true; b.root.add(ridgeTiles)
    for (let i = 0; i < 30; i++) { dummy.position.set((i + .5) * 8.85 / 30 - 4.425, ridge + .055, 0); dummy.rotation.set(0, Math.PI / 2, 0); dummy.scale.set(.35, 2.0, .33); dummy.updateMatrix(); ridgeTiles.setMatrixAt(i, dummy.matrix) }
    const outline = [[-3.27,3.05],[-3.27,4.23],[-1.90,4.23],[-1.90,4.96],[-.75,4.96],[-.75,5.66],[.75,5.66],[.75,4.96],[1.90,4.96],[1.90,4.23],[3.27,4.23],[3.27,3.05]]
    for (const x of [-4.17, 4.17]) {
      // One continuous plaster wall with three broad levels, not separate teeth.
      const shape = new THREE.Shape(); outline.forEach(([z, y], i) => { if (i) shape.lineTo(z!, y!); else shape.moveTo(z!, y!) }); shape.closePath()
      const g = new THREE.ExtrudeGeometry(shape, { depth: .24, bevelEnabled: false }); g.rotateY(Math.PI / 2); g.translate(-.12, 0, 0); mesh(b.root, g, cream, x, 0, 0)
      for (const [z, length, y] of [[-2.585,1.37,4.23],[-1.325,1.15,4.96],[0,1.5,5.66],[1.325,1.15,4.96],[2.585,1.37,4.23]]) {
        const cap = new THREE.Shape(); cap.moveTo(-.19, 0); cap.lineTo(-.19, .035); cap.lineTo(0, .08); cap.lineTo(.19, .035); cap.lineTo(.19, 0); cap.closePath()
        mesh(b.root, new THREE.ExtrudeGeometry(cap, { depth: length!, bevelEnabled: false }), ceramic, x, y! + .01, z! - length! / 2)
      }
      const side = new THREE.Group(); side.position.set(x + Math.sign(x) * .135, 0, 0); side.rotation.y = Math.sign(x) * Math.PI / 2; b.root.add(side)
      door(side, 0, 4.15, 0, .58, .60, true, cream)
    }
    box(b.root, 8.19, .075, .12, 0, 3.06, 2.96, cream)
    box(b.root, 1.62, .13, .30, 0, 2.43, 3.0, stone)
    for (const s of [front, rear]) {
      const sign = s.z > 0 ? 1 : -1, zz = sign * 3.28
      channel(b.root, V(-4.48, .22, zz), V(4.48, .22, zz), .30)
      for (let i = -4; i <= 4; i++) { const start = surfacePoint(s, i / 5, -.95), edge = surfacePoint(s, i / 5, 1); b.paths.push([start, edge, V(edge.x, .25, zz), V(4.47, .25, zz), V(4.47, .25, 3.85)]) }
    }
    channel(b.root, V(4.47, .22, -3.28), V(4.47, .22, 3.85), .30)
    pool(b.root, 4.47, 4.1, .65, .65); label(b.root, '檐下排水沟', 2.6, .72, 3.7, 1.85)
  }
  // Xinjiang: a gently graded earthen roof, low parapets, and a real scupper.
  {
    const b = houses.xinjiang; b.bounds.set(V(-4.8, .1, -4.3), V(4.8, 4.7, 4.3)); b.target.set(0, 1.9, 0)
    walls(b.root, 7.5, 5.2, 3.3, 2, earth)
    const s = roof(b, 0, 0, 7.8, 5.5, 3.31, 2, 0, false)
    const high = 3.31 + 5.5 * Math.tan(2 * DEG)
    box(b.root, 7.58, .27, 5.28, 0, .29, 0, stone)
    box(b.root, 7.8, .34, .18, 0, high + .13, -2.75, earth)
    box(b.root, 7.92, .075, .27, 0, high + .335, -2.75, earth)
    for (const x of [-3.8, 3.8]) {
      box(s.root, .18, .32, 5.5 / Math.cos(2 * DEG), x, .13, 0, earth)
      box(s.root, .27, .075, 5.5 / Math.cos(2 * DEG), x, .335, 0, earth)
    }
    box(b.root, 6.4, .32, .18, -.7, 3.46, 2.75, earth)
    box(b.root, .84, .32, .18, 3.45, 3.46, 2.75, earth)
    box(b.root, 6.43, .075, .27, -.715, 3.66, 2.75, earth)
    box(b.root, .87, .075, .27, 3.465, 3.66, 2.75, earth)
    // The deliberate gap at x=2.7 is an open scupper, not a solid parapet.
    channel(b.root, V(2.7, 3.29, 2.65), V(2.7, 3.29, 3.2), .27)
    door(b.root, -.5, .25, 2.66, 1.05, 1.95, false, earth)
    door(b.root, -2.6, 1.12, 2.66, .80, 1.05, true, earth); door(b.root, 1.65, 1.12, 2.66, .80, 1.05, true, earth)
    for (let i = 0; i < 11; i++) {
      const x = -3.45 + i * .69
      box(b.root, .11, .13, .43, x, 3.16 + (rng(i) - .5) * .012, 2.70, timber)
    }
    box(b.root, 7.3, .09, .12, 0, 3.00, 2.67, timber)
    // One modest reed-like drying mat, lying on the graded roof rather than floating.
    box(s.root, 1.35, .015, .72, -2.0, .012, -1.2, timber)
    for (let i = 0; i < 19; i++) box(s.root, .012, .006, .70, -2.63 + i * .07, .023, -1.2, timber)
    for (let i = -4; i <= 4; i++) {
      const innerEdge = surfacePoint(s, i / 5, .90, .025)
      // Stay behind the parapet until directly aligned with its open scupper.
      b.paths.push([surfacePoint(s, i / 5, -.90, .025), innerEdge, V(2.7, innerEdge.y, innerEdge.z), V(2.7, 3.34, 2.7), V(2.7, 3.32, 3.22), V(2.7, .26, 3.22), V(4.0, .26, 3.22)])
    }
    channel(b.root, V(2.7, .23, 3.22), V(4.0, .23, 3.22), .30); pool(b.root, 4.05, 3.22, .65, .65)
    label(b.root, '排水口', 2.7, 3.85, 3.15, 1.3)
  }

  const experimentBody = new THREE.Group(); experiment.root.add(experimentBody)
  const updateExperimentWalls = walls(experimentBody, 5.8, 3.8, 1.85, 15, cream)
  const experimentalRoof = roof(experiment, 0, 0, 6, 4, 1.9, 15)
  experiment.bounds.set(V(-3.25, .1, -2.25), V(4.65, 5.45, 2.9)); experiment.target.set(.3, 2.1, .2)
  box(experiment.root, 5.86, .21, 3.86, 0, .245, 0, stone)
  door(experiment.root, -.85, .24, 1.94, .76, 1.37); door(experiment.root, 1.25, .80, 1.94, .88, .68, true)
  channel(experiment.root, V(-3.15, 1.84, 2.12), V(3.22, 1.84, 2.12), .25)
  const outletGate = box(experiment.root, .08, .25, .23, 2.98, 2.02, 2.12, mat({ color: '#9e5647', roughness: .6 }))
  channel(experiment.root, V(3.15, 1.84, 2.12), V(3.62, 1.84, 2.12), .20)
  pool(experiment.root, 4.0, 2.12, 1.2, 1.2)
  channel(experiment.root, V(2.65, .23, 2.60), V(3.75, .23, 2.60), .23)
  const gutterWater = box(experiment.root, 6.1, .018, .18, -.05, 1.86, 2.12, gutterWaterMat); gutterWater.castShadow = false
  // Narrow tapered wet traces sit in the valleys between tile columns. A broad
  // translucent slab on a pitched roof looked like a suspended rectangular pool.
  const wetGeometry = geometry(new THREE.BufferGeometry())
  wetGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, -.15,0,-.5, .15,0,-.5, .5,0,-.2, .42,0,.38, .10,0,.5, -.35,0,.35, -.5,0,-.1], 3))
  wetGeometry.setIndex([0,2,1,0,3,2,0,4,3,0,5,4,0,6,5,0,7,6,0,1,7]); wetGeometry.computeVertexNormals()
  const wetMaterial = mat({ color: '#6b9fa9', transparent: true, opacity: .27, roughness: .18, metalness: .12, depthWrite: false })
  const waterFilm = new THREE.InstancedMesh(wetGeometry, wetMaterial, experimentalRoof.columns - 1); waterFilm.receiveShadow = true; experimentalRoof.root.add(waterFilm)
  let filmLength = -1
  label(experiment.root, '6 m × 4 m', -.6, .65, 2.65, 1.8); label(experiment.root, '集水槽', 4.0, .82, 2.12, 1.3)
  function experimentPaths() {
    experiment.paths.length = 0
    for (let i = -5; i <= 5; i++) {
      const start = surfacePoint(experimentalRoof, i / 6, -.95), edge = surfacePoint(experimentalRoof, i / 6, 1)
      experiment.paths.push([start, edge, V(edge.x, 1.88, 2.12), V(2.87, 1.88, 2.12)])
    }
    experiment.paths.push([V(3.15, 1.88, 2.12), V(3.64, 1.88, 2.12), V(3.68, .23, 2.12)])
    experiment.paths.push([V(2.65, 1.96, 2.12), V(2.65, 1.96, 2.28), V(2.65, .26, 2.60), V(3.75, .26, 2.60)])
  }
  experimentPaths()

  // Build real openings where a displayed water route crosses a channel or pool
  // wall. This also opens T/L junctions; intersecting complete troughs would leave
  // solid cross-walls across their otherwise continuous centreline. The outlet
  // gate is a separate solid and is deliberately not part of this wall builder.
  for (const wall of drainageWalls) {
    const owner = [...Object.values(houses), experiment].find(building => building.root === wall.parent)
    const paths = owner?.paths ?? [], direction = wall.b.clone().sub(wall.a), length = Math.hypot(direction.x, direction.z)
    const tx = direction.x / length, tz = direction.z / length, center = wall.a.clone().add(wall.b).multiplyScalar(.5)
    const gaps: [number, number][] = []
    for (const path of paths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!, b = path[i]!
      const u0 = (a.x - center.x) * tx + (a.z - center.z) * tz, u1 = (b.x - center.x) * tx + (b.z - center.z) * tz
      const v0 = (a.x - center.x) * tz - (a.z - center.z) * tx, v1 = (b.x - center.x) * tz - (b.z - center.z) * tx
      let first = 0, last = 1
      const clip = (from: number, to: number, low: number, high: number) => {
        const delta = to - from
        if (Math.abs(delta) < 1e-8) return from >= low && from <= high
        const left = (low - from) / delta, right = (high - from) / delta
        first = Math.max(first, Math.min(left, right)); last = Math.min(last, Math.max(left, right)); return first <= last
      }
      if (!clip(v0, v1, -wall.thickness / 2 - .005, wall.thickness / 2 + .005)
        || !clip(a.y, b.y, center.y - wall.height / 2 - .002, center.y + wall.height / 2 + .002)
        || !clip(u0, u1, -length / 2, length / 2)) continue
      const entry = THREE.MathUtils.lerp(u0, u1, first), exit = THREE.MathUtils.lerp(u0, u1, last)
      gaps.push([Math.max(-length / 2, Math.min(entry, exit) - .17), Math.min(length / 2, Math.max(entry, exit) + .17)])
    }
    gaps.sort((a, b) => a[0] - b[0])
    const addWall = (from: number, to: number) => {
      if (to - from < .04) return
      const middle = (from + to) / 2, piece = box(wall.parent, wall.thickness, wall.height, to - from, center.x + tx * middle, center.y, center.z + tz * middle, stone)
      piece.rotation.y = Math.atan2(tx, tz)
    }
    let cursor = -length / 2
    for (const [from, to] of gaps) { if (from > cursor) addWall(cursor, from); cursor = Math.max(cursor, to) }
    addWall(cursor, length / 2)
  }

  // Consolidate immutable house details by material. Window bars, stepped gables
  // and courtyard channels then add detail without adding hundreds of draw calls.
  const dynamicDetails = new Set<THREE.Object3D>([...experimentBody.children, outletGate])
  const rainCatchers = new Map<Building, THREE.Object3D[]>()
  for (const building of [...Object.values(houses), experiment]) {
    building.root.updateMatrixWorld(true)
    const catchers: THREE.Object3D[] = []; rainCatchers.set(building, catchers)
    const batches = new Map<THREE.Material, THREE.Mesh[]>()
    building.root.traverse(object => {
      if (!(object instanceof THREE.Mesh) || !object.visible || object instanceof THREE.InstancedMesh || Array.isArray(object.material) || object.material.transparent) return
      if (building === experiment) {
        if (dynamicDetails.has(object)) return
        let ancestor: THREE.Object3D | null = object
        while (ancestor && ancestor !== experimentalRoof.root) ancestor = ancestor.parent
        if (ancestor === experimentalRoof.root) return
      }
      const meshes = batches.get(object.material) ?? []; meshes.push(object); batches.set(object.material, meshes)
    })
    for (const [material, meshes] of batches) {
      const positions: number[] = [], normals: number[] = [], uvs: number[] = []
      for (const object of meshes) {
        // Keep the original small-object bounds for occasional vertical queries.
        // Raycasting the large merged material meshes would test too many triangles.
        object.geometry.computeBoundingBox(); object.geometry.computeBoundingSphere(); catchers.push(object)
        const clone = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()
        clone.applyMatrix4(object.matrixWorld)
        const position = clone.getAttribute('position'), normal = clone.getAttribute('normal'), uv = clone.getAttribute('uv')
        for (let i = 0; i < position.count; i++) {
          positions.push(position.getX(i), position.getY(i), position.getZ(i)); normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
          uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0)
        }
        clone.dispose(); object.removeFromParent()
      }
      const merged = new THREE.BufferGeometry(); merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
      merged.computeBoundingSphere(); mesh(building.root, merged, material).userData.rainBatched = true
    }
  }

  // Camera-facing tapered rain ribbons remain neutral in both sunlight and shade.
  // Every droplet still falls vertically to the previously verified cached solid.
  const rainCount = 560, rainGeometry = geometry(new THREE.PlaneGeometry(1, 1))
  const rainOpacity = new Float32Array(rainCount)
  for (let i = 0; i < rainCount; i++) rainOpacity[i] = .30 + rng(i + 193) * .42
  rainGeometry.setAttribute('dropOpacity', new THREE.InstancedBufferAttribute(rainOpacity, 1))
  const rainMaterial = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color('#e0e9eb') } },
    vertexShader: `
      attribute float dropOpacity;
      varying vec2 vUv; varying float vOpacity;
      void main() {
        vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec3 axis = (modelViewMatrix * instanceMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
        vec2 lateral = vec2(axis.y, -axis.x);
        lateral = length(lateral) > 0.00001 ? normalize(lateral) : vec2(1.0, 0.0);
        float ribbonWidth = length(instanceMatrix[0].xyz);
        center.xyz += axis * position.y + vec3(lateral * position.x * ribbonWidth, 0.0);
        gl_Position = projectionMatrix * center;
        vUv = uv; vOpacity = dropOpacity;
      }
    `,
    fragmentShader: `
      uniform vec3 tint; varying vec2 vUv; varying float vOpacity;
      void main() {
        float side = pow(max(0.0, 1.0 - abs(vUv.x * 2.0 - 1.0)), 1.65);
        float ends = smoothstep(0.0, 0.18, vUv.y) * (1.0 - smoothstep(0.48, 1.0, vUv.y));
        gl_FragColor = vec4(tint, side * ends * vOpacity);
        #include <colorspace_fragment>
      }
    `, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }); materials.add(rainMaterial)
  const rain = new THREE.InstancedMesh(rainGeometry, rainMaterial, rainCount); rain.frustumCulled = false; scene.add(rain)
  const splashCount = 60, splashGeometry = geometry(new THREE.PlaneGeometry(1, 1)), splashAge = new Float32Array(splashCount)
  const splashAgeAttribute = new THREE.InstancedBufferAttribute(splashAge, 1).setUsage(THREE.DynamicDrawUsage)
  splashGeometry.setAttribute('dropAge', splashAgeAttribute)
  const splashMaterial = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color('#d1e0df') } },
    vertexShader: `
      attribute float dropAge; varying vec2 vUv; varying float vAge;
      void main() { vUv = uv; vAge = dropAge; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform vec3 tint; varying vec2 vUv; varying float vAge;
      void main() {
        float r = length(vUv - 0.5) * 2.0;
        float ring = exp(-pow((r - 0.72) * 20.0, 2.0));
        float softCenter = exp(-r * 7.0) * 0.18;
        float fade = max(0.0, 1.0 - vAge);
        gl_FragColor = vec4(tint, (ring + softCenter) * fade * fade * 0.38);
        #include <colorspace_fragment>
      }
    `, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }); materials.add(splashMaterial)
  const splash = new THREE.InstancedMesh(splashGeometry, splashMaterial, splashCount); splash.frustumCulled = false; scene.add(splash)

  // Soft rivulets use the exact checked polyline, including every channel corner.
  // Their highlights travel along distance; positions change only when the roof does.
  const flowVertexCapacity = 4096, flowGeometry = geometry(new THREE.BufferGeometry())
  const flowPositions = new Float32Array(flowVertexCapacity * 3), flowSides = new Float32Array(flowVertexCapacity * 3)
  const flowUv = new Float32Array(flowVertexCapacity * 2), flowInfo = new Float32Array(flowVertexCapacity * 4)
  flowGeometry.setAttribute('position', new THREE.BufferAttribute(flowPositions, 3).setUsage(THREE.DynamicDrawUsage))
  flowGeometry.setAttribute('rivuletSide', new THREE.BufferAttribute(flowSides, 3).setUsage(THREE.DynamicDrawUsage))
  flowGeometry.setAttribute('uv', new THREE.BufferAttribute(flowUv, 2).setUsage(THREE.DynamicDrawUsage))
  flowGeometry.setAttribute('rivuletInfo', new THREE.BufferAttribute(flowInfo, 4).setUsage(THREE.DynamicDrawUsage))
  const flowMaterial = new THREE.ShaderMaterial({
    uniforms: { phase: { value: 0 }, outlet: { value: 0 }, outflow: { value: 0 }, tint: { value: new THREE.Color('#afc6c8') } },
    vertexShader: `
      attribute vec3 rivuletSide; attribute vec4 rivuletInfo;
      varying vec2 vUv; varying vec4 vInfo;
      void main() {
        vec3 side = rivuletSide;
        if (dot(side, side) < 0.000001) {
          vec3 look = cameraPosition - position;
          side = normalize(vec3(look.z, 0.0, -look.x) + vec3(0.00001, 0.0, 0.0));
        }
        float width = 0.055 + 0.016 * sin(rivuletInfo.z * 17.0 + uv.y * 2.8);
        vec3 p = position + side * (uv.x - 0.5) * width;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        vUv = uv; vInfo = rivuletInfo;
      }
    `,
    fragmentShader: `
      uniform float phase; uniform float outlet; uniform float outflow; uniform vec3 tint;
      varying vec2 vUv; varying vec4 vInfo;
      void main() {
        if (vInfo.w > 0.5 && (outflow < 0.5 || abs(outlet - vInfo.w) > 0.1)) discard;
        float crossFlow = abs(vUv.x * 2.0 - 1.0);
        float softEdge = pow(max(0.0, 1.0 - crossFlow), 1.5);
        float travel = fract(vUv.y / 2.25 - phase * 0.57 + vInfo.z);
        float glint = smoothstep(0.0, 0.20, travel) * (1.0 - smoothstep(0.20, 0.52, travel));
        float ends = smoothstep(0.0, 0.13, vUv.y) * smoothstep(0.0, 0.16, vInfo.x - vUv.y);
        float shimmer = 0.88 + 0.12 * sin(vUv.y * 19.0 - phase * 8.0 + vInfo.z * 13.0);
        float alpha = softEdge * ends * (0.065 + glint * 0.62) * shimmer;
        vec3 color = mix(tint, vec3(0.83, 0.92, 0.94), glint * pow(max(0.0, 1.0 - crossFlow), 4.0) * 0.5);
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }
    `, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }); materials.add(flowMaterial)
  const flows = new THREE.Mesh(flowGeometry, flowMaterial); flows.frustumCulled = false; scene.add(flows)
  const flowSide = new THREE.Vector3()
  function rebuildRivulets(building: Building) {
    let vertex = 0
    building.paths.forEach((path, index) => {
      let total = 0
      for (let j = 1; j < path.length; j++) total += path[j]!.distanceTo(path[j - 1]!)
      let distance = 0
      const outletKind = building === experiment && index >= building.paths.length - 2 ? index === building.paths.length - 2 ? 1 : 2 : 0
      const seed = rng(index + 817)
      for (let j = 1; j < path.length; j++) {
        const a = path[j - 1]!, b = path[j]!, length = a.distanceTo(b)
        if (length < .0001) continue
        flowSide.set(b.z - a.z, 0, a.x - b.x)
        if (flowSide.lengthSq() > .000001) flowSide.normalize()
        for (let corner = 0; corner < 6; corner++) {
          if (vertex >= flowVertexCapacity) throw new Error('Rivulet vertex capacity exceeded')
          const end = corner === 2 || corner === 4 || corner === 5, right = corner === 1 || corner === 3 || corner === 5
          const point = end ? b : a
          flowPositions.set([point.x, point.y, point.z], vertex * 3)
          flowSides.set([flowSide.x, flowSide.y, flowSide.z], vertex * 3)
          flowUv[vertex * 2] = right ? 1 : 0; flowUv[vertex * 2 + 1] = distance + (end ? length : 0)
          flowInfo.set([total, 0, seed, outletKind], vertex * 4); vertex++
        }
        distance += length
      }
    })
    for (const name of ['position', 'rivuletSide', 'uv', 'rivuletInfo']) flowGeometry.getAttribute(name).needsUpdate = true
    flowGeometry.setDrawRange(0, vertex)
  }
  const projected = new THREE.Vector3(), handle = new THREE.Vector3()
  let state: SceneState = { mode: 'explore', roof: 'shanxi', slope: 15, intensity: 30, outlet: 'open', running: false, time: 0, water: { time: 0, rainVolume: 0, drained: 0, retained: 0, peakRetained: 0, rainActive: false, outflowRate: 0 }, showFlow: true }
  let current = houses.shanxi, locked = false, raf = 0, width = 1, height = 1, hasFramed = false, phase = 0, lastTime = 0, lastHandle = 0
  type Framing = { zoom: number; x: number; y: number }
  let flight: { start: number; progress: number; from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; fromFrame: Framing; toFrame: Framing } | null = null
  type RainLandings = { x: Float32Array; z: Float32Array; fixed: Float32Array; variants: Map<string, Float32Array> }
  const rainLandingCache = new Map<Building, RainLandings>(), landingRay = new THREE.Raycaster()
  const landingOrigin = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0)

  function roofHeight(x: number, z: number) {
    let result = .22
    for (const s of current.surfaces) {
      const dx = x - s.x, dz = z - s.z, lx = dx * Math.cos(s.yaw) - dz * Math.sin(s.yaw), lz = dx * Math.sin(s.yaw) + dz * Math.cos(s.yaw)
      const radians = s.angle * DEG
      // Raised curved tile lips extend slightly beyond the horizontal eave line.
      // Include that projection instead of letting those drops fall to the ground.
      if (Math.abs(lx) <= s.width / 2 && lz >= -s.depth / 2 - .008 * Math.sin(radians) && lz <= s.depth / 2 + .045 * Math.sin(radians)) {
        result = Math.max(result, s.low + (s.depth / 2 - lz) * Math.tan(radians) + .045 / Math.cos(radians) + .010)
      }
    }
    return result
  }
  function getRainLandings() {
    const boundsFor = (objects: THREE.Object3D[]) => objects.map(object => {
      const mesh = object as THREE.Mesh
      let box: THREE.Box3
      if (mesh instanceof THREE.InstancedMesh) { mesh.computeBoundingBox(); box = mesh.boundingBox!.clone() }
      else { if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox(); box = mesh.geometry.boundingBox!.clone() }
      return { object, box: box.applyMatrix4(mesh.matrixWorld) }
    })
    const candidates: THREE.Object3D[] = []
    const select = (bounds: { object: THREE.Object3D; box: THREE.Box3 }[], x: number, z: number) => {
      candidates.length = 0
      for (const entry of bounds) if (x >= entry.box.min.x - 1e-6 && x <= entry.box.max.x + 1e-6 && z >= entry.box.min.z - 1e-6 && z <= entry.box.max.z + 1e-6) candidates.push(entry.object)
      return candidates
    }
    let cache = rainLandingCache.get(current)
    if (!cache) {
      cache = { x: new Float32Array(rainCount), z: new Float32Array(rainCount), fixed: new Float32Array(rainCount), variants: new Map() }
      const fixedSolids: THREE.Object3D[] = [...(rainCatchers.get(current) ?? [])], roofTiles = new Set(current.surfaces.map(surface => surface.tiles))
      current.root.updateWorldMatrix(true, true)
      current.root.traverseVisible(object => {
        if (!(object instanceof THREE.Mesh) || object.userData.rainBatched || Array.isArray(object.material) || object.material.transparent || roofTiles.has(object as THREE.InstancedMesh)) return
        if (current === experiment) {
          if (object === outletGate) return
          let ancestor: THREE.Object3D | null = object
          while (ancestor) { if (ancestor === experimentalRoof.root || ancestor === experimentBody) return; ancestor = ancestor.parent }
        }
        fixedSolids.push(object)
      })
      const fixedBounds = boundsFor(fixedSolids)
      const area = current.bounds, w = area.max.x - area.min.x, d = area.max.z - area.min.z
      for (let i = 0; i < rainCount; i++) {
        const x = area.min.x + rng(i + 101) * w, z = area.min.z + rng(i + 701) * d
        cache.x[i] = x; cache.z[i] = z; landingOrigin.set(x, 20, z); landingRay.set(landingOrigin, down); landingRay.far = 21
        const hit = landingRay.intersectObjects(select(fixedBounds, x, z), false)[0]
        cache.fixed[i] = hit ? hit.point.y + .008 : .22
      }
      rainLandingCache.set(current, cache)
    }
    const key = current === experiment ? `${experimentalRoof.angle}:${state.outlet}` : 'fixed'
    let heights = cache.variants.get(key)
    if (!heights) {
      heights = new Float32Array(rainCount)
      const movingSolids: THREE.Object3D[] = []
      if (current === experiment) {
        current.root.updateWorldMatrix(true, true)
        for (const root of [experimentalRoof.root, experimentBody]) root.traverseVisible(object => {
          if (object instanceof THREE.Mesh && object !== experimentalRoof.tiles && !Array.isArray(object.material) && !object.material.transparent) movingSolids.push(object)
        })
        if (outletGate.visible) movingSolids.push(outletGate)
      }
      const movingBounds = boundsFor(movingSolids)
      for (let i = 0; i < rainCount; i++) {
        const x = cache.x[i]!, z = cache.z[i]!
        let height = Math.max(cache.fixed[i]!, roofHeight(x, z))
        if (movingSolids.length) {
          landingOrigin.set(x, 20, z); landingRay.set(landingOrigin, down)
          const hit = landingRay.intersectObjects(select(movingBounds, x, z), false)[0]
          if (hit) height = Math.max(height, hit.point.y + .008)
        }
        heights[i] = height
      }
      cache.variants.set(key, heights)
    }
    return { x: cache.x, z: cache.z, heights }
  }
  function updateWeather() {
    const raining = state.water.rainActive && state.time > 0
    const wet = raining || state.water.retained > .02 || state.water.outflowRate > .005
    rain.visible = splash.visible = raining
    rain.count = Math.round(160 + THREE.MathUtils.clamp(state.intensity / 60, 0, 1) * 400)
    if (raining) {
      // Geometry raycasts occur only for an unseen house / slope / gate state.
      // Animation frames merely read these cached landing points.
      const landings = getRainLandings()
      for (let i = 0; i < rain.count; i++) {
        const x = landings.x[i]!, z = landings.z[i]!, floor = landings.heights[i]!
        const speed = 1.12 + rng(i + 473) * .55, t = (rng(i + 941) + phase * speed) % 1
        const length = .18 + rng(i + 397) * .28, thickness = .015 + rng(i + 619) * .017
        const bottom = floor + .018 + (1 - t) * 7
        dummy.position.set(x, bottom + length / 2, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(thickness, length, 1); dummy.updateMatrix(); rain.setMatrixAt(i, dummy.matrix)
      }
      rain.instanceMatrix.needsUpdate = true
      for (let i = 0; i < splashCount; i++) {
        const speed = 1.12 + rng(i + 473) * .55, t = (rng(i + 941) + phase * speed) % 1, age = t / .24
        const diameter = age < 1 ? .035 + age * (.16 + rng(i + 229) * .08) : 0
        dummy.position.set(landings.x[i]!, landings.heights[i]! + .012, landings.z[i]!); dummy.rotation.set(-Math.PI / 2, 0, 0)
        dummy.scale.set(diameter, diameter, 1); dummy.updateMatrix(); splash.setMatrixAt(i, dummy.matrix); splashAge[i] = Math.min(1, age)
      }
      splash.instanceMatrix.needsUpdate = true; splashAgeAttribute.needsUpdate = true
    }
    flows.visible = state.showFlow && wet
    flowMaterial.uniforms.phase!.value = phase
    flowMaterial.uniforms.outlet!.value = state.outlet === 'open' ? 1 : 2
    flowMaterial.uniforms.outflow!.value = state.water.outflowRate > .005 ? 1 : 0
  }

  const framingCamera = new THREE.PerspectiveCamera(37, 1, .1, 160), probe = new THREE.Vector3()
  function viewport(w: number, h: number) {
    if (w <= 700) return { left: 18, right: w - 18, top: 65, bottom: Math.max(220, h - 260) }
    const bottomSpace = current === experiment ? (w <= 1000 ? 260 : 192) : 150
    return { left: w <= 950 ? 280 : 335, right: w - 32, top: 55, bottom: Math.max(220, h - bottomSpace) }
  }
  function framing(position: THREE.Vector3, target: THREE.Vector3, w = width, h = height): Framing {
    const area = viewport(w, h); framingCamera.aspect = w / h; framingCamera.zoom = 1; framingCamera.position.copy(position); framingCamera.lookAt(target); framingCamera.updateProjectionMatrix(); framingCamera.updateMatrixWorld()
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const x of [current.bounds.min.x, current.bounds.max.x]) for (const y of [current.bounds.min.y, current.bounds.max.y]) for (const z of [current.bounds.min.z, current.bounds.max.z]) {
      probe.set(x, y, z).project(framingCamera); const px = (probe.x * .5 + .5) * w, py = (.5 - probe.y * .5) * h
      minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py)
    }
    const zoom = Math.max(.18, Math.min((area.right - area.left) / (maxX - minX), (area.bottom - area.top) / (maxY - minY)) * (current === experiment ? .96 : .93))
    return { zoom, x: (w / 2 + ((minX + maxX) / 2 - w / 2) * zoom) - (area.left + area.right) / 2, y: (h / 2 + ((minY + maxY) / 2 - h / 2) * zoom) - (area.top + area.bottom) / 2 }
  }
  function currentFrame(): Framing { return { zoom: camera.zoom, x: camera.view?.offsetX ?? 0, y: camera.view?.offsetY ?? 0 } }
  function applyFrame(f: Framing) { camera.zoom = f.zoom; camera.setViewOffset(width, height, f.x, f.y, width, height); camera.updateProjectionMatrix() }
  function syncLabels() {
    const e = camera.projectionMatrix.elements
    for (const { sprite, pixels } of labels) sprite.scale.set(pixels * 2 / (e[0]! * width), 28 * 2 / (e[5]! * height), 1)
  }
  function syncHandle(now: number, force = false) {
    if (!onHandle || (!force && now - lastHandle < 30)) return
    lastHandle = now; handle.copy(surfacePoint(experimentalRoof, 0, -1, .15)); projected.copy(handle).project(camera)
    onHandle({ x: (projected.x * .5 + .5) * width, y: (.5 - projected.y * .5) * height, visible: current === experiment && projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 })
  }
  function clearInertia() {
    const p = camera.position.clone(), t = controls.target.clone(); const damping = controls.enableDamping
    controls.enableDamping = false; controls.update(); camera.position.copy(p); controls.target.copy(t); controls.update(); controls.enableDamping = damping
  }
  function setView(view: ViewMode) {
    clearInertia(); const toTarget = current.target.clone(), span = current === houses.shanxi ? 1.2 : 1
    const direction = view === 'top' ? V(.06, 24 * span, .12) : view === 'drainage' ? V(14 * span, 8 * span, 14 * span) : V(15 * span, 12 * span, 18 * span)
    const to = direction.add(toTarget)
    flight = { start: performance.now(), progress: 0, from: camera.position.clone(), to, fromTarget: controls.target.clone(), toTarget, fromFrame: currentFrame(), toFrame: framing(to, toTarget) }; controls.enabled = false
  }
  function update(next: SceneState) {
    const selectionChanged = state.mode !== next.mode || state.roof !== next.roof
    const slopeChanged = state.slope !== next.slope
    state = { ...next, water: { ...next.water } }; current = state.mode === 'explore' ? houses[state.roof] : experiment
    for (const b of [...Object.values(houses), experiment]) b.root.visible = b === current
    stage.scale.set(current === experiment ? 10.4 / 15 : 1, 1, current === experiment ? 7.6 / 13 : 1); stage.position.x = current === experiment ? .5 : 0
    if (slopeChanged) { setSurface(experimentalRoof, THREE.MathUtils.clamp(state.slope, 2, 40)); updateExperimentWalls(state.slope); experimentPaths() }
    if (selectionChanged || slopeChanged || flowGeometry.drawRange.count === Infinity) rebuildRivulets(current)
    outletGate.visible = state.outlet === 'blocked'
    for (const water of poolWaters) water.visible = state.time > 0 && state.water.drained > .01
    const length = 4 / Math.cos(experimentalRoof.angle * DEG)
    if (Math.abs(length - filmLength) > .0001) {
      filmLength = length
      for (let i = 0; i < waterFilm.count; i++) {
        const fraction = .35 + rng(i + 37) * .58
        dummy.position.set(-3 + (i + 1) * 6 / experimentalRoof.columns, .034, (rng(i + 71) - .5) * length * (1 - fraction)); dummy.rotation.set(0, 0, 0)
        dummy.scale.set(.035, 1, length * fraction); dummy.updateMatrix(); waterFilm.setMatrixAt(i, dummy.matrix)
      }
      waterFilm.instanceMatrix.needsUpdate = true; waterFilm.computeBoundingSphere()
    }
    waterFilm.visible = current === experiment && state.time > 0 && (state.water.rainActive || state.water.retained > .02)
    const gutterDepth = THREE.MathUtils.clamp(state.water.retained / 96, 0, 1) * .09
    gutterWater.position.y = 1.86 + gutterDepth / 2; gutterWater.scale.y = 1 + gutterDepth / .018; gutterWater.visible = waterFilm.visible
    if (state.time === 0 && !state.running) phase = 0
    updateWeather(); scene.updateMatrixWorld(true)
    if (selectionChanged && hasFramed) setView('perspective')
    syncHandle(performance.now(), true)
  }
  function resize() {
    if (disposed) return
    const w = Math.max(1, Math.round(host.clientWidth)), h = Math.max(1, Math.round(host.clientHeight)); if (w === width && h === height) return
    let next = framing(camera.position, controls.target, w, h)
    if (hasFramed) {
      const old = framing(camera.position, controls.target), prior = currentFrame(), a = viewport(width, height), b = viewport(w, h)
      const rx = (width / 2 - prior.x - a.left) / Math.max(1, a.right - a.left), ry = (height / 2 - prior.y - a.top) / Math.max(1, a.bottom - a.top)
      next = { zoom: prior.zoom * next.zoom / old.zoom, x: w / 2 - b.left - rx * (b.right - b.left), y: h / 2 - b.top - ry * (b.bottom - b.top) }
    }
    width = w; height = h; renderer.setSize(w, h, false); camera.aspect = w / h; applyFrame(next); hasFramed = true
    if (flight) {
      const t = flight.progress, ease = t * t * (3 - 2 * t), rest = Math.max(1e-8, 1 - ease), to = framing(flight.to, flight.toTarget)
      flight.fromFrame = { zoom: (next.zoom - to.zoom * ease) / rest, x: (next.x - to.x * ease) / rest, y: (next.y - to.y * ease) / rest }; flight.toFrame = to
    }
    camera.lookAt(controls.target); camera.updateMatrixWorld(true); syncLabels(); renderer.render(scene, camera); syncHandle(performance.now(), true)
  }
  const observer = new ResizeObserver(resize); observer.observe(host)
  const onStart = () => { flight = null }; controls.addEventListener('start', onStart)
  function frame(now: number) {
    if (disposed) return
    const dt = lastTime ? Math.min(.05, (now - lastTime) / 1000) : 0; lastTime = now
    if (state.running) { phase += dt; updateWeather() }
    if (flight) {
      const t = Math.min(1, (now - flight.start) / 680), ease = t * t * (3 - 2 * t); flight.progress = t
      camera.position.lerpVectors(flight.from, flight.to, ease); controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease)
      applyFrame({ zoom: THREE.MathUtils.lerp(flight.fromFrame.zoom, flight.toFrame.zoom, ease), x: THREE.MathUtils.lerp(flight.fromFrame.x, flight.toFrame.x, ease), y: THREE.MathUtils.lerp(flight.fromFrame.y, flight.toFrame.y, ease) })
      if (t === 1) { flight = null; controls.enabled = !locked }
    }
    if (!locked) controls.update(); camera.updateMatrixWorld(true); syncLabels(); renderer.render(scene, camera); syncHandle(now); raf = requestAnimationFrame(frame)
  }
  update(state); controls.update(); resize(); raf = requestAnimationFrame(frame)
  return {
    update, setView,
    setInteractionLocked(value) { if (value && !locked) { flight = null; clearInertia() }; locked = value; controls.enabled = !value && !flight },
    capture() { syncLabels(); renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png') },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); controls.removeEventListener('start', onStart); controls.dispose(); sun.shadow.dispose()
      rainLandingCache.clear()
      rainCatchers.clear()
      scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose() })
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove()
    },
  }
}
