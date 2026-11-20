import * as THREE from 'three'

// Adapted from settlement-morphology/landscape.ts. Every returned group owns its
// GPU resources; only source canvas pixels are cached between calls.
const clamp = THREE.MathUtils.clamp
const mix = THREE.MathUtils.lerp
const hash = (x: number, z: number) => {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}
const smooth = (v: number) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t) }
type SurfaceKind = 'wall' | 'roof' | 'rock' | 'wood'
type SurfaceImages = { albedo: HTMLCanvasElement; normal: HTMLCanvasElement; roughness: HTMLCanvasElement }
const surfaceImages = new Map<string, SurfaceImages>()

function surfaceTexture(kind: SurfaceKind, seed = 0) {
  seed = Math.abs(Math.floor(seed)) % 5
  const key = `${kind}:${seed}`
  let images = surfaceImages.get(key)
  if (!images) {
    const size = 256
    const canvas = () => { const c = document.createElement('canvas'); c.width = c.height = size; return c }
    images = { albedo: canvas(), normal: canvas(), roughness: canvas() }
    const colorCtx = images.albedo.getContext('2d')!, normalCtx = images.normal.getContext('2d')!, roughCtx = images.roughness.getContext('2d')!
    const colors = colorCtx.createImageData(size, size), normals = normalCtx.createImageData(size, size), roughs = roughCtx.createImageData(size, size)
    const heights = new Float32Array(size * size)
    const periodic = (u: number, v: number, cells: number) => {
      const px = u * cells, py = v * cells, ix = Math.floor(px), iy = Math.floor(py)
      const fx = smooth(px - ix), fy = smooth(py - iy)
      const at = (x: number, y: number) => hash((x % cells) + seed * 11, (y % cells) + seed * 7)
      return mix(mix(at(ix, iy), at(ix + 1, iy), fx), mix(at(ix, iy + 1), at(ix + 1, iy + 1), fx), fy)
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size, index = y * size + x, p = index * 4
      const broad = periodic(u, v, 4), grain = periodic(u, v, 32), speck = hash(x + seed * 31, y + 7)
      let value = .76, relief = .5, rough = .9, warmth = 0
      if (kind === 'wall') {
        const row = Math.floor(v * 11), brickX = (u * 6 + (row % 2) * .5) % 1
        const mortar = Math.min(brickX, 1 - brickX) < .024 || (v * 11) % 1 < .06
        const exposed = broad < .47 || seed === 2
        const brick = hash(Math.floor(u * 6 + (row % 2) * .5), row + seed * 3)
        value = .84 + (broad - .5) * .17 + (speck - .5) * .075
        if (exposed) { value += mortar ? .08 : (brick - .5) * .17 - .065; relief = mortar ? .18 : .62 + grain * .09 }
        else relief = grain * .11 + speck * .045
        value -= Math.pow(periodic(u, v * .15, 16), 5) * .11
        rough = exposed ? .9 : .82; warmth = exposed && !mortar ? .015 : 0
      } else if (kind === 'roof') {
        const row = Math.floor(v * 9), tileX = (u * 12 + (row % 2) * .04) % 1, tileY = (v * 9) % 1
        const gutter = tileX < .045 || tileY < .075, tile = hash(Math.floor(u * 12), row + seed * 7)
        const curve = Math.pow(Math.sin(tileX * Math.PI), .7)
        relief = gutter ? .09 : .35 + curve * .4 + tileY * .12 + grain * .04
        value = .64 + curve * .14 + tile * .16 + (speck - .5) * .07 - (gutter ? .21 : 0)
        rough = .77 + tile * .13; warmth = .015
      } else if (kind === 'rock') {
        const strata = Math.sin(v * Math.PI * 28 + broad * 4)
        const fissure = Math.pow(Math.abs(Math.sin(u * 24 + v * 19 + broad * 6)), 26)
        relief = .5 + (broad - .5) * .35 + (grain - .5) * .3 + strata * .055 - fissure * .15
        value = .75 + (broad - .5) * .27 + (grain - .5) * .19 + (speck - .5) * .09 + strata * .035 - fissure * .08
        rough = .86 + grain * .11; warmth = .008
      } else {
        const fibres = Math.sin((u + periodic(u, v, 4) * .015) * Math.PI * 94)
        value = .73 + fibres * .08 + (grain - .5) * .08 + (broad - .5) * .19
        relief = fibres * .12 + grain * .08; rough = .82; warmth = .03
      }
      heights[index] = relief
      colors.data[p] = clamp((value + warmth) * 255, 0, 255)
      colors.data[p + 1] = clamp(value * 255, 0, 255)
      colors.data[p + 2] = clamp((value - warmth * 1.3) * 255, 0, 255); colors.data[p + 3] = 255
      const r = clamp((rough + (speck - .5) * .055) * 255, 0, 255)
      roughs.data[p] = roughs.data[p + 1] = roughs.data[p + 2] = r; roughs.data[p + 3] = 255
    }
    const strength = kind === 'roof' ? 2.3 : kind === 'rock' ? 5 : kind === 'wall' ? 2.4 : 3
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const at = (dx: number, dy: number) => heights[((y + dy + size) % size) * size + (x + dx + size) % size]!
      const dx = (at(-1, 0) - at(1, 0)) * strength, dy = (at(0, -1) - at(0, 1)) * strength
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1), p = (y * size + x) * 4
      normals.data[p] = (dx * inv * .5 + .5) * 255; normals.data[p + 1] = (dy * inv * .5 + .5) * 255
      normals.data[p + 2] = (inv * .5 + .5) * 255; normals.data[p + 3] = 255
    }
    colorCtx.putImageData(colors, 0, 0); normalCtx.putImageData(normals, 0, 0); roughCtx.putImageData(roughs, 0, 0)
    surfaceImages.set(key, images)
  }
  const texture = (canvas: HTMLCanvasElement, color = false) => {
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4
    return t
  }
  return { map: texture(images.albedo, true), normalMap: texture(images.normal), roughnessMap: texture(images.roughness) }
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true
  return mesh
}

// Merge triangle attributes locally, avoiding imports from the larger landscape.
function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const unpacked = parts.map(part => part.index ? part.toNonIndexed() : part.clone())
  const merged = new THREE.BufferGeometry()
  for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]] as const) {
    const length = unpacked.reduce((sum, g) => sum + g.getAttribute(name).array.length, 0)
    const values = new Float32Array(length)
    let offset = 0
    for (const g of unpacked) { const a = g.getAttribute(name).array; values.set(a, offset); offset += a.length }
    merged.setAttribute(name, new THREE.BufferAttribute(values, size))
  }
  unpacked.forEach(g => g.dispose()); parts.forEach(g => g.dispose())
  merged.computeBoundingSphere()
  return merged
}

function batchGroup(group: THREE.Group) {
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  for (const object of [...group.children]) {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) continue
    object.updateMatrix()
    const batch = batches.get(object.material) ?? []
    batch.push(object.geometry.clone().applyMatrix4(object.matrix)); batches.set(object.material, batch)
    object.geometry.dispose(); group.remove(object)
  }
  for (const [material, parts] of batches) {
    const mesh = new THREE.Mesh(mergeParts(parts), material)
    mesh.name = material.name; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh)
  }
}

/** Wall footprint 2.8 × 3.2; eaves 3.16 × 3.54; height 3.172 including chimney.
 * Ground pivot is y=0. The separate `roof` group pivots at eave height y=2.35.
 */
export function createHazardHouse(variant: number): THREE.Group {
  const group = new THREE.Group(); group.name = 'hazard-house'
  const k = Math.floor(hash(Math.abs(Math.floor(variant)), 27) * 10007)
  const wall = new THREE.MeshStandardMaterial({ color: ['#d8d0bc', '#c7c1b2', '#c8b8a1'][k % 3]!, ...surfaceTexture('wall', k), normalScale: new THREE.Vector2(.48, .48), roughness: .95 })
  const roof = new THREE.MeshStandardMaterial({ color: ['#77756e', '#898378', '#7b7d79', '#8b6c57'][k % 4]!, ...surfaceTexture('roof', k), normalScale: new THREE.Vector2(.9, .9), roughness: .95, side: THREE.DoubleSide })
  const stone = new THREE.MeshStandardMaterial({ color: '#a59e8e', ...surfaceTexture('rock', 2), normalScale: new THREE.Vector2(.45, .45), roughness: 1 })
  const wood = new THREE.MeshStandardMaterial({ color: '#77705e', ...surfaceTexture('wood', k), normalScale: new THREE.Vector2(.3, .3), roughness: .94 })
  const glass = new THREE.MeshStandardMaterial({ color: '#32434a', roughness: .2, metalness: .15 })
  const trim = new THREE.MeshStandardMaterial({ color: '#d7d0bb', ...surfaceTexture('wall', 0), normalScale: new THREE.Vector2(.18, .18), roughness: .89 })
  for (const [material, name] of [[wall, 'walls'], [roof, 'roof-tiles'], [stone, 'foundation-and-sills'], [wood, 'timber'], [glass, 'window-glass'], [trim, 'window-frames']] as const) material.name = name
  const width = 2.8, depth = 3.2, height = 2.35, rise = .72, eave = 1.58, end = 1.77
  group.add(box(width + .08, .22, depth + .08, stone, 0, .11))
  group.add(box(width, height - .22, depth, wall, 0, (height + .22) / 2))
  const roofGroup = new THREE.Group(); roofGroup.name = 'roof'; roofGroup.position.y = height
  const roofGeo = new THREE.BufferGeometry()
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -eave, 0, -end, -eave, 0, end, 0, rise, end, 0, rise, -end,
    0, rise, -end, 0, rise, end, eave, 0, end, eave, 0, -end,
  ], 3))
  roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0], 2))
  roofGeo.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]); roofGeo.computeVertexNormals()
  roofGroup.add(new THREE.Mesh(roofGeo, roof))
  roofGroup.add(box(.15, .09, end * 2, roof, 0, rise + .015))
  roofGroup.add(box(eave * 2 - .03, .10, end * 2 - .03, wood, 0, -.025))
  // Chimney emerges through the roof, with a dark inset opening beneath its cap.
  roofGroup.add(box(.3, .68, .34, wall, .74, .43, -.7))
  roofGroup.add(box(.35, .08, .39, stone, .74, .77, -.7))
  roofGroup.add(box(.20, .012, .24, glass, .74, .816, -.7))
  batchGroup(roofGroup); group.add(roofGroup)
  const gable = new THREE.BufferGeometry()
  gable.setAttribute('position', new THREE.Float32BufferAttribute([-width / 2, height, -depth / 2, 0, height + rise - .025, -depth / 2, width / 2, height, -depth / 2, -width / 2, height, depth / 2, 0, height + rise - .025, depth / 2, width / 2, height, depth / 2], 3))
  gable.setAttribute('uv', new THREE.Float32BufferAttribute([0, .1, .5, .4, 1, .1, 0, .1, .5, .4, 1, .1], 2))
  gable.setIndex([0, 1, 2, 3, 5, 4]); gable.computeVertexNormals(); group.add(new THREE.Mesh(gable, wall))
  for (const sign of [-1, 1]) for (const x of [-.87, .87]) {
    const y = 1.42, z = sign * (depth / 2 + .027)
    group.add(box(.64, .84, .046, trim, x, y, z))
    group.add(box(.52, .70, .05, glass, x, y, z + sign * .029))
    group.add(box(.038, .71, .06, wood, x, y, z + sign * .056))
    group.add(box(.53, .034, .06, wood, x, y - .06, z + sign * .058))
    group.add(box(.72, .065, .20, stone, x, y - .46, z + sign * .045))
  }
  for (const sign of [-1, 1]) for (const z of [-.75, .75]) {
    group.add(box(.046, .84, .67, trim, sign * (width / 2 + .027), 1.42, z))
    group.add(box(.05, .70, .55, glass, sign * (width / 2 + .055), 1.42, z))
    group.add(box(.06, .71, .038, wood, sign * (width / 2 + .08), 1.42, z))
    group.add(box(.20, .065, .75, stone, sign * (width / 2 + .06), .96, z))
  }
  group.add(box(.70, 1.77, .065, trim, 0, 1.105, depth / 2 + .033))
  group.add(box(.59, 1.64, .07, wood, 0, 1.04, depth / 2 + .075))
  group.add(box(.035, .09, .035, stone, .20, 1.02, depth / 2 + .13))
  group.add(box(.82, .14, .40, stone, 0, .07, depth / 2 + .10))
  group.add(box(.75, .08, .27, stone, 0, .18, depth / 2 + .075))
  batchGroup(group)
  group.userData.footprint = { width: 2.8, depth: 3.2 }
  group.userData.roofPivotY = height
  return group
}

let foliageCanvas: HTMLCanvasElement | undefined
function foliageTexture() {
  if (!foliageCanvas) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')!, data = context.createImageData(256, 256)
    const paint = (x: number, y: number, r: number, g: number, b: number, alpha: number) => {
      x = Math.round(x); y = Math.round(y)
      if (x < 0 || x > 255 || y < 0 || y > 255) return
      const p = (y * 256 + x) * 4
      if (alpha < data.data[p + 3]!) return
      data.data[p] = r; data.data[p + 1] = g; data.data[p + 2] = b; data.data[p + 3] = alpha
    }
    const line = (ax: number, ay: number, bx: number, by: number) => {
      const length = Math.ceil(Math.hypot(bx - ax, by - ay) * 2)
      for (let i = 0; i <= length; i++) for (const dx of [-1, 0, 1]) paint(mix(ax, bx, i / length) + dx, mix(ay, by, i / length), 127, 131, 92, 255)
    }
    line(129, 244, 122, 22)
    for (let row = 0; row < 8; row++) for (const side of [-1, 1]) {
      const junctionY = 46 + row * 23, spread = 26 + hash(row, side + 3) * 30
      const cx = 125 + side * spread, cy = junctionY - 11 + hash(row, side + 7) * 4
      const angle = side < 0 ? -.6 : -2.5, major = 19 + hash(row, side + 1) * 6, minor = 8 + hash(row, side + 9) * 2
      line(125, junctionY, cx, cy)
      const cos = Math.cos(angle), sin = Math.sin(angle)
      for (let py = Math.floor(cy - major - 2); py <= cy + major + 2; py++) for (let px = Math.floor(cx - major - 2); px <= cx + major + 2; px++) {
        const dx = px - cx, dy = py - cy, u = dx * cos + dy * sin, v = -dx * sin + dy * cos
        const radius = u * u / (major * major) + v * v / (minor * minor)
        if (radius > 1) continue
        const vein = Math.abs(v) < .65 ? 13 : 0, variation = (hash(px, py) - .5) * 10
        const value = 187 + (1 - radius) * 22 + vein + variation + v / minor * 11
        paint(px, py, value - 8, value + 5, value - 26, clamp((1 - radius) * 1300, 0, 255))
      }
    }
    context.putImageData(data, 0, 0); foliageCanvas = canvas
  }
  const map = new THREE.CanvasTexture(foliageCanvas)
  map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4
  return map
}

/** Branched broadleaf tree, 4.3–4.8 high and 2.5 across; base pivot y=0.
 * Two draw calls: one merged trunk/branches mesh and one alpha-tested leaf mesh.
 */
export function createHazardTree(seed: number): THREE.Group {
  const group = new THREE.Group(); group.name = 'hazard-tree'
  seed = Math.abs(Math.floor(seed))
  const bark = new THREE.MeshStandardMaterial({ color: '#6d6554', ...surfaceTexture('wood', seed), normalScale: new THREE.Vector2(.7, .7), roughness: 1 })
  const leaves = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(.23 + hash(seed, 10) * .035, .27, .40), map: foliageTexture(), alphaTest: .45, side: THREE.DoubleSide, roughness: .96 })
  leaves.forceSinglePass = true
  const branches: THREE.BufferGeometry[] = [], cards: THREE.BufferGeometry[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const branch = (start: THREE.Vector3, end: THREE.Vector3, bottom: number, top: number) => {
    const direction = end.clone().sub(start)
    const geo = new THREE.CylinderGeometry(top, bottom, direction.length(), 7)
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()))
    geo.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2); branches.push(geo)
  }
  const crown = (center: THREE.Vector3, angle: number, id: number) => {
    for (let c = 0; c < 4; c++) {
      const card = new THREE.PlaneGeometry(.74 + hash(id + c, seed) * .25, 1.02 + hash(id, c + seed) * .2)
      card.rotateX((hash(id + c, 59) - .5) * .9)
      card.rotateY(angle + c * Math.PI / 4); card.rotateZ((hash(id + c, 60) - .5) * .6)
      card.translate(center.x + Math.cos(angle + c) * .08, center.y, center.z + Math.sin(angle + c) * .08); cards.push(card)
    }
  }
  const trunkTop = new THREE.Vector3(.11, 3.92, -.06)
  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(.035, 2.3, -.02), .155, .075)
  branch(new THREE.Vector3(.035, 2.3, -.02), trunkTop, .075, .018)
  for (let i = 0; i < 11; i++) {
    const angle = i * 2.39996 + hash(seed, 41) * Math.PI * 2
    const y = 1.55 + i * .185, spread = .96 - i * .037 + hash(i, seed + 13) * .12
    const start = new THREE.Vector3(.03, y, 0)
    const end = new THREE.Vector3(Math.cos(angle) * spread, y + .72 + hash(seed, i + 21) * .21, Math.sin(angle) * spread)
    branch(start, end, .053 - i * .0024, .012)
    crown(end, angle, i * 7 + seed)
    const fork = end.clone().lerp(start, .35)
    const tip = new THREE.Vector3(end.x + Math.cos(angle + .9) * .26, end.y + .16, end.z + Math.sin(angle + .9) * .26)
    branch(fork, tip, .019, .006); crown(tip, angle + 1.1, i * 7 + seed + 3)
  }
  crown(trunkTop.clone().add(new THREE.Vector3(0, .06, 0)), .4, seed + 101)
  const trunkMesh = new THREE.Mesh(mergeParts(branches), bark); trunkMesh.name = 'trunk-and-branches'
  const leafMesh = new THREE.Mesh(mergeParts(cards), leaves); leafMesh.name = 'leaf-cards'
  trunkMesh.castShadow = trunkMesh.receiveShadow = leafMesh.castShadow = leafMesh.receiveShadow = true
  group.add(trunkMesh, leafMesh); group.updateMatrixWorld(true)
  const bounds = new THREE.Box3().setFromObject(group), size = bounds.getSize(new THREE.Vector3())
  const height = 4.3 + hash(seed, 38) * .5, horizontal = 2.5 / Math.max(size.x, size.z)
  for (const mesh of [trunkMesh, leafMesh]) {
    mesh.geometry.translate(0, -bounds.min.y, 0)
    mesh.geometry.scale(horizontal, height / size.y, horizontal)
    mesh.geometry.computeBoundingSphere()
  }
  group.userData.height = height; group.userData.crownWidth = 2.5
  return group
}
