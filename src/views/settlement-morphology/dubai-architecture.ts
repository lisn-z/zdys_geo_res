import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Architectural interpretation of textbook p.122, not a surveyed reconstruction. */
const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n) }
type Surface = 'plaster' | 'stone' | 'wood' | 'cloth' | 'glass'
type TextureSet = { map: THREE.DataTexture; normalMap: THREE.DataTexture; roughnessMap: THREE.DataTexture }
const sourceTextures = new Map<string, TextureSet>()

function textures(kind: Surface, seed = 0): TextureSet {
  seed = Math.abs(seed) % 3
  const key = `${kind}:${seed}`
  let source = sourceTextures.get(key)
  if (!source) {
    const size = 256, albedo = new Uint8Array(size * size * 4), normal = new Uint8Array(albedo.length), roughness = new Uint8Array(albedo.length), relief = new Float32Array(size * size)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, p = i * 4, grain = hash(x + seed * 71, y + 13)
      const broad = Math.sin(x * Math.PI / 64) * Math.cos(y * Math.PI / 128)
      let value = 218 + broad * 7 + (grain - .5) * 21, height = grain * .09, rough = 229
      if (kind === 'plaster') {
        const course = y % 27 < 1 && hash(Math.floor(x / 38), Math.floor(y / 27)) > .74
        value -= course ? 19 : 0; height += course ? -.08 : 0
      } else if (kind === 'stone') {
        const fissure = Math.pow(Math.abs(Math.sin(x * .036 + y * .051 + broad * .9)), 28)
        value += broad * 11 - fissure * 20; height += broad * .12 - fissure * .16
      } else if (kind === 'wood') {
        const fibres = Math.sin(x * Math.PI / 4 + Math.sin(y * Math.PI / 128) * 1.7)
        const joint = x % 43 < 2
        value = 207 + broad * 12 + fibres * 12 + (grain - .5) * 12 - (joint ? 35 : 0)
        height = fibres * .06 + grain * .035 - (joint ? .12 : 0)
      } else if (kind === 'cloth') {
        const weave = (x % 3 === 0 ? -9 : 3) + (y % 3 === 0 ? -7 : 3)
        value = 231 + weave + broad * 5 + (grain - .5) * 8; height = weave * .003
      } else {
        const frame = x % 32 < 1 || y % 20 < 1
        const pane = hash(Math.floor(x / 32), Math.floor(y / 20) + seed * 19)
        value = frame ? 178 : 215 + pane * 28; height = frame ? -.015 : 0; rough = 210 + pane * 20
      }
      albedo[p] = albedo[p + 1] = albedo[p + 2] = value; albedo[p + 3] = 255
      roughness[p] = roughness[p + 1] = roughness[p + 2] = rough; roughness[p + 3] = 255; relief[i] = height
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const h = (dx: number, dy: number) => relief[((y + dy + size) % size) * size + (x + dx + size) % size]!
      const dx = (h(-1, 0) - h(1, 0)) * 2, dy = (h(0, -1) - h(0, 1)) * 2, inverse = 1 / Math.hypot(dx, dy, 1), p = (y * size + x) * 4
      normal[p] = (dx * inverse * .5 + .5) * 255; normal[p + 1] = (dy * inverse * .5 + .5) * 255; normal[p + 2] = (inverse * .5 + .5) * 255; normal[p + 3] = 255
    }
    const make = (data: Uint8Array, color: boolean) => {
      const texture = new THREE.DataTexture(data, size, size)
      texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter
      texture.generateMipmaps = true; texture.anisotropy = 8; texture.needsUpdate = true; return texture
    }
    source = { map: make(albedo, true), normalMap: make(normal, false), roughnessMap: make(roughness, false) }; sourceTextures.set(key, source)
  }
  // Cloned Texture objects share immutable Source pixels, not disposal ownership.
  return { map: source.map.clone(), normalMap: source.normalMap.clone(), roughnessMap: source.roughnessMap.clone() }
}

function palette(seed: number) {
  return {
    plaster: new THREE.MeshStandardMaterial({ color: ['#d8c8a6', '#d6cdb9', '#c9b58f'][Math.abs(seed) % 3]!, ...textures('plaster', seed), roughness: .96, normalScale: new THREE.Vector2(.33, .33) }),
    trim: new THREE.MeshStandardMaterial({ color: '#e0d8c6', ...textures('stone'), roughness: .87, normalScale: new THREE.Vector2(.3, .3) }),
    dark: new THREE.MeshStandardMaterial({ color: '#424b4b', roughness: .71 }),
    wood: new THREE.MeshStandardMaterial({ color: '#826549', ...textures('wood', seed), roughness: .92, normalScale: new THREE.Vector2(.45, .45) }),
    glass: new THREE.MeshPhysicalMaterial({ color: ['#8ca4ad', '#8eaaa9', '#adb7b7'][Math.abs(seed) % 3]!, ...textures('glass', seed), roughness: .24, metalness: .12, envMapIntensity: 1.25, clearcoat: .25, normalScale: new THREE.Vector2(.05, .05) }),
    metal: new THREE.MeshStandardMaterial({ color: '#bec9cb', metalness: .64, roughness: .32 }),
    cloth: new THREE.MeshStandardMaterial({ color: '#e2d6b5', ...textures('cloth'), roughness: .97, normalScale: new THREE.Vector2(.18, .18), side: THREE.DoubleSide }),
  }
}
type Palette = ReturnType<typeof palette>

class Model {
  private bins = new Map<THREE.Material, THREE.BufferGeometry[]>()
  constructor(private materials: THREE.Material[]) {}
  add(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0, rotationY = 0): void {
    geometry.rotateY(rotationY); geometry.translate(x, y, z)
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
    if (!geometry.getAttribute('uv')) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 2), 2))
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry
    if (normalized !== geometry) geometry.dispose()
    const list = this.bins.get(material) ?? []; list.push(normalized); this.bins.set(material, list)
  }
  box(material: THREE.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0, angle = 0): void { this.add(new THREE.BoxGeometry(w, h, d), material, x, y, z, angle) }
  rod(material: THREE.Material, start: THREE.Vector3, end: THREE.Vector3, radius: number, endRadius = radius, capped = true): void {
    const direction = end.clone().sub(start)
    const geometry = new THREE.CylinderGeometry(endRadius, radius, direction.length(), 6, 1, !capped)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    this.add(geometry, material, (start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2)
  }
  tube(material: THREE.Material, points: THREE.Vector3[], radius: number, segments = 24): void { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 5, false), material) }
  finish(name: string): THREE.Group {
    const group = new THREE.Group(); group.name = name
    for (const [material, parts] of this.bins) {
      const geometry = mergeGeometries(parts, false)!
      parts.forEach(part => part.dispose())
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh)
    }
    for (const material of this.materials) if (!this.bins.has(material)) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose()
      material.dispose()
    }
    group.userData.resourceOwnership = 'independent-materials-geometries-texture-instances'
    return group
  }
}

function capsule(length: number, width: number, height: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(), r = width / 2, l = length / 2
  shape.moveTo(-l + r, -r); shape.lineTo(l - r, -r)
  shape.absarc(l - r, 0, r, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(-l + r, r); shape.absarc(-l + r, 0, r, Math.PI / 2, Math.PI * 1.5, false)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 7 })
  geometry.rotateX(-Math.PI / 2); return geometry
}

type PlanWing = { length: number; width: number; center: number }

/** One exterior outline for the union of the core and three rounded wings.
 * Each convex wing contains the origin, so each radial slice is contiguous.
 * A single extrusion avoids overlapping coplanar caps at every wing junction.
 */
function yPlan(core: number, wings: PlanWing[], height: number, expansion = 0): THREE.BufferGeometry {
  const shape = new THREE.Shape(), segments = 120
  const inside = (radius: number, angle: number) => {
    if (radius <= core + expansion) return true
    return wings.some((wing, i) => {
      const relative = angle - i * Math.PI * 2 / 3
      const x = radius * Math.cos(relative) - wing.center, z = radius * Math.sin(relative)
      const straightHalf = (wing.length - wing.width) / 2
      return Math.hypot(Math.max(Math.abs(x) - straightHalf, 0), z) <= wing.width / 2 + expansion
    })
  }
  for (let i = 0; i < segments; i++) {
    const angle = i / segments * Math.PI * 2
    let low = 0, high = 2
    for (let n = 0; n < 22; n++) { const middle = (low + high) / 2; if (inside(middle, angle)) low = middle; else high = middle }
    const x = Math.cos(angle) * (low + high) / 2, z = Math.sin(angle) * (low + high) / 2
    if (i === 0) shape.moveTo(x, z); else shape.lineTo(x, z)
  }
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2); return geometry
}

function arch(width: number, height: number, depth: number): THREE.BufferGeometry {
  const r = width / 2, shape = new THREE.Shape()
  shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, height - r)
  shape.absarc(0, height - r, r, 0, Math.PI, false); shape.lineTo(-r, 0)
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 7 })
}

function oldWindow(model: Model, p: Palette, x: number, y: number, z: number, side: number, width = .115): void {
  model.box(p.trim, width + .038, .195, .022, x, y, z)
  model.box(p.dark, width, .158, .027, x, y, z + side * .014)
  for (const dx of [-width * .23, width * .23]) model.box(p.wood, .009, .155, .033, x + dx, y, z + side * .02)
  model.box(p.wood, width, .009, .033, x, y + .014, z + side * .02)
  model.box(p.trim, width + .06, .025, .055, x, y - .111, z + side * .012)
}

export function createOldTownBuilding(variant: number, storeys: 1 | 2 | 3): THREE.Group {
  const k = Math.abs(Math.floor(variant)), p = palette(k), model = new Model(Object.values(p))
  const width = .94 + hash(k, 1) * .18, depth = .82 + hash(k, 2) * .12, h = storeys * .45
  model.box(p.trim, width + .055, .045, depth + .055, 0, .0225)
  model.box(p.plaster, width, h - .03, depth, 0, (h + .03) / 2)
  model.box(p.trim, width + .035, .035, depth + .035, 0, h + .012)
  for (const side of [-1, 1]) {
    model.box(p.plaster, width + .04, .075, .045, 0, h + .057, side * depth / 2)
    model.box(p.plaster, .045, .075, depth, side * width / 2, h + .057)
    for (let floor = 0; floor < storeys; floor++) {
      for (const x of [-width * .28, width * .28]) oldWindow(model, p, x, .265 + floor * .45, side * (depth / 2 + .012), side)
      model.box(p.trim, .022, .197, .155, side * (width / 2 + .011), .265 + floor * .45)
      model.box(p.dark, .029, .158, .116, side * (width / 2 + .025), .265 + floor * .45)
    }
  }
  model.add(arch(.22, .30, .022), p.trim, 0, .025, depth / 2 + .015)
  model.add(arch(.166, .263, .025), p.wood, 0, .025, depth / 2 + .029)
  model.box(p.dark, .009, .22, .012, 0, .14, depth / 2 + .058)
  model.box(p.metal, .014, .022, .015, .045, .155, depth / 2 + .065)
  model.box(p.trim, .27, .027, .13, 0, .0135, depth / 2 + .045)
  if (k % 3 === 0) {
    // Barjeel wind tower: open apertures between four piers, not a solid roof box.
    const tx = -.22, tz = -.15, bottom = h + .033, towerH = .39
    model.box(p.trim, .33, .035, .33, tx, bottom + .0175, tz)
    model.box(p.dark, .225, .25, .225, tx, bottom + .18, tz)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) model.box(p.plaster, .047, towerH, .047, tx + sx * .127, bottom + towerH / 2, tz + sz * .127)
    for (const side of [-1, 1]) {
      model.box(p.plaster, .29, .037, .04, tx, bottom + .11, tz + side * .135)
      model.box(p.plaster, .04, .037, .29, tx + side * .135, bottom + .11, tz)
      model.box(p.trim, .016, .255, .025, tx, bottom + .23, tz + side * .146)
      model.box(p.trim, .025, .255, .016, tx + side * .146, bottom + .23, tz)
    }
    model.box(p.trim, .335, .035, .335, tx, bottom + towerH + .008, tz)
  } else if (k % 3 === 1) {
    model.box(p.plaster, .36, .20, .34, -.23, h + .115, -.16)
    model.box(p.trim, .395, .027, .375, -.23, h + .225, -.16)
    model.box(p.wood, .112, .155, .018, -.23, h + .11, .018)
  }
  if (k % 2 === 0) {
    const porchZ = depth / 2 + .105
    for (const x of [-.32, .32]) model.box(p.wood, .024, .32, .024, x, .16, porchZ)
    model.box(p.wood, .71, .024, .15, 0, .326, porchZ - .035)
    model.box(p.cloth, .70, .008, .16, 0, .341, porchZ - .035)
  }
  return model.finish(`dubai-old-town-${storeys}f-${k}`)
}

function rectangularFacade(model: Model, p: Palette, width: number, height: number, depth: number, x: number, y: number, z: number): void {
  model.box(p.glass, width, height, depth, x, y + height / 2, z)
  const floors = Math.max(5, Math.round(height / .18))
  for (let floor = 1; floor <= floors; floor++) {
    const h = y + floor / floors * height
    model.box(p.metal, width + .014, .009, depth + .014, x, h, z)
  }
  for (const side of [-1, 1]) {
    for (let ix = 1; ix < 4; ix++) model.box(p.metal, .012, height - .004, .018, x + (ix / 4 - .5) * width, y + height / 2, z + side * (depth / 2 + .008))
    for (let iz = 1; iz < 3; iz++) model.box(p.metal, .018, height - .004, .012, x + side * (width / 2 + .008), y + height / 2, z + (iz / 3 - .5) * depth)
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) model.box(p.metal, .024, height - .004, .024, x + sx * (width / 2 + .004), y + height / 2, z + sz * (depth / 2 + .004))
}

const officeGlazingSources = new Map<number, THREE.DataTexture>()
function officeGlazing(variant: number): THREE.DataTexture {
  const style = variant % 3
  let source = officeGlazingSources.get(style)
  if (!source) {
    const width = 256, height = 512, pixels = new Uint8Array(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const column = Math.floor(x / 32), floor = Math.floor(y / 16), pane = hash(column + style * 11, floor)
      const frame = x % 32 < 1 || y % 16 < 1, spandrel = y % 16 < 4
      const reflection = Math.sin(x / width * Math.PI * 3 + style * .6) * 13 + Math.cos(y / height * Math.PI) * 8
      const value = frame ? 167 : spandrel ? 185 + pane * 12 : 218 + pane * 22 + reflection, at = (y * width + x) * 4
      const occupied = !frame && !spandrel && pane > .965
      pixels[at] = Math.min(255, value); pixels[at + 1] = Math.min(255, value * (occupied ? .93 : 1)); pixels[at + 2] = Math.min(255, value * (occupied ? .78 : 1)); pixels[at + 3] = 255
    }
    source = new THREE.DataTexture(pixels, width, height); source.colorSpace = THREE.SRGBColorSpace
    source.wrapS = source.wrapT = THREE.RepeatWrapping; source.generateMipmaps = true; source.minFilter = THREE.LinearMipmapLinearFilter; source.magFilter = THREE.LinearFilter; source.anisotropy = 8; source.needsUpdate = true
    officeGlazingSources.set(style, source)
  }
  return source.clone()
}

export function createModernBuilding(variant: number): THREE.Group {
  const k = Math.abs(Math.floor(variant)), p = palette(k), model = new Model(Object.values(p))
  const h = 1.95 + hash(k, 31) * 2.55, kind = k % 5
  p.glass.map?.dispose(); p.glass.map = officeGlazing(k)
  p.glass.color.set(['#638693', '#66868e', '#85959b', '#9aafb3', '#698d9a'][kind]!)
  p.glass.roughness = .20; p.glass.metalness = .20; p.glass.envMapIntensity = 1.5
  p.trim.color.set('#d8d8ce'); p.trim.roughness = .70; p.metal.color.set('#cbd3d6')
  model.box(p.trim, 1.25, .10, 1.10, 0, .05)
  model.box(p.dark, .93, .20, .82, 0, .20)
  if (kind === 0) {
    const sections = [{ w: 1.06, d: .88, h: h * .50, x: 0 }, { w: .83, d: .75, h: h * .29, x: -.09 }, { w: .57, d: .55, h: h * .21, x: -.14 }]
    let y = .10
    for (const s of sections) { rectangularFacade(model, p, s.w, s.h, s.d, s.x, y, 0); model.box(p.trim, s.w + .035, .025, s.d + .035, s.x, y + s.h); y += s.h }
    model.box(p.glass, .31, .105, .31, -.14, h + .165, 0)
    for (const x of [-.315, -.14, .035]) model.box(p.metal, .016, .145, .35, x, h + .185)
  } else if (kind === 1) {
    const body = new THREE.CylinderGeometry(1, 1, h, 40); body.scale(.50, 1, .405); model.add(body, p.glass, 0, h / 2 + .10)
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; model.rod(p.metal, new THREE.Vector3(Math.cos(a) * .503, .1, Math.sin(a) * .408), new THREE.Vector3(Math.cos(a) * .503, h + .1, Math.sin(a) * .408), .006, .006, false) }
    for (let y = .28; y < h + .1; y += .18) { const ring = new THREE.CylinderGeometry(1, 1, .009, 40); ring.scale(.506, 1, .411); model.add(ring, p.metal, 0, y) }
    const crown = new THREE.CylinderGeometry(.85, 1, .16, 40); crown.scale(.51, 1, .415); model.add(crown, p.metal, 0, h + .18)
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, blade = .055 + (Math.cos(a) + 1) * .018; model.box(p.trim, .018, blade, .035, Math.cos(a) * .405, h + .24 + blade / 2, Math.sin(a) * .326, -a) }
  } else if (kind === 2) {
    const body = new THREE.CylinderGeometry(.43, .61, h, 8); body.scale(1, 1, .86); model.add(body, p.glass, 0, h / 2 + .1, 0, Math.PI / 8)
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8
      model.rod(p.metal, new THREE.Vector3(Math.cos(a) * .615, .1, Math.sin(a) * .615 * .86), new THREE.Vector3(Math.cos(a) * .435, h + .1, Math.sin(a) * .435 * .86), .009)
    }
    for (let y = .28; y < h + .1; y += .18) { const r = THREE.MathUtils.lerp(.61, .43, (y - .1) / h); const band = new THREE.CylinderGeometry(r + .005, r + .005, .009, 8); band.scale(1, 1, .86); model.add(band, p.metal, 0, y, 0, Math.PI / 8) }
    const crown = new THREE.CylinderGeometry(.025, .43, .27, 8); crown.scale(1, 1, .86); model.add(crown, p.metal, 0, h + .235, 0, Math.PI / 8)
  } else if (kind === 3) {
    for (const side of [-1, 1]) {
      const towerH = side < 0 ? h : h * .81
      model.add(capsule(.79, .46, towerH), p.glass, side * .34, .10, 0, Math.PI / 2)
      for (let floor = .27; floor < towerH + .1; floor += .18) model.add(capsule(.805, .474, .009), p.metal, side * .34, floor, 0, Math.PI / 2)
      for (const x of [-.15, .15]) model.rod(p.metal, new THREE.Vector3(side * .34 + x, .1, .355), new THREE.Vector3(side * .34 + x, towerH + .1, .355), .008)
      model.add(capsule(.82, .49, .04), p.trim, side * .34, towerH + .1, 0, Math.PI / 2)
      model.box(p.glass, .16, .095, .30, side * .34, towerH + .1875)
      for (const x of [-.15, .15]) model.box(p.metal, .018, .13, .34, side * .34 + x, towerH + .205)
    }
    model.box(p.glass, .25, .18, .42, 0, h * .62)
    model.box(p.metal, .25, .018, .44, 0, h * .62 + .10)
  } else {
    const vertices: number[] = [], uv: number[] = [], indices: number[] = [], levels = 22, corners = 8
    const ring = (j: number, i: number) => {
      const t = j / levels, a = i / corners * Math.PI * 2 + Math.PI / 8 + t * .43, r = .54 * (1 - t * .16)
      return new THREE.Vector3(Math.cos(a) * r, .1 + t * h, Math.sin(a) * r * .85)
    }
    for (let j = 0; j <= levels; j++) for (let i = 0; i <= corners; i++) {
      const v = ring(j, i); vertices.push(v.x, v.y, v.z); uv.push(i / corners, j / levels * h * .8)
      if (j < levels && i < corners) { const a = j * (corners + 1) + i, b = a + corners + 1; indices.push(a, b, a + 1, a + 1, b, b + 1) }
    }
    const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); shell.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); shell.setIndex(indices); shell.computeVertexNormals(); model.add(shell, p.glass)
    for (let i = 0; i < corners; i++) model.tube(p.metal, Array.from({ length: levels + 1 }, (_, j) => ring(j, i)), .0075, 30)
    for (let j = 0; j <= levels; j++) model.tube(p.metal, Array.from({ length: corners + 1 }, (_, i) => ring(j, i)), .006, 24)
    const crown = new THREE.CylinderGeometry(.45, .45, .028, 8); crown.scale(1, 1, .85); model.add(crown, p.trim, 0, h + .1, 0, Math.PI / 8 + .43)
  }
  // A connected glazed commercial vestibule provides a readable street level.
  // Its sill, glazing, posts and canopy use distinct depths, not layered decals.
  model.box(p.trim, .78, .018, .12, 0, .109, .51)
  model.box(p.dark, .73, .215, .10, 0, .220, .48)
  for (const x of [-.22, 0, .22]) model.box(p.glass, .19, .19, .015, x, .219, .543)
  for (const x of [-.34, -.11, .11, .34]) model.box(p.metal, .012, .206, .014, x, .221, .554)
  model.box(p.metal, .80, .024, .18, 0, .337, .47)
  for (const x of [-.36, .36]) model.box(p.trim, .020, .225, .020, x, .2125, .535)
  return model.finish(`dubai-modern-${kind}-${k}`)
}

export function createDubaiLandmark(): THREE.Group {
  const p = palette(1), model = new Model(Object.values(p))
  p.glass.color.set('#a6bec5'); p.glass.roughness = .20; p.metal.color.set('#d0d8da')
  model.add(new THREE.CylinderGeometry(1.48, 1.54, .10, 72), p.trim, 0, .05)
  const podium = Array.from({ length: 3 }, () => ({ length: 1.40, width: .88, center: .55 }))
  const lobby = Array.from({ length: 3 }, () => ({ length: 1.25, width: .74, center: .55 }))
  // Contiguous vertical tiers, each with one Y-shaped cap; no stacked colour
  // surfaces share the same outward-facing plane.
  model.add(yPlan(.59, podium, .13), p.trim, 0, .10)
  model.add(yPlan(.53, lobby, .105), p.glass, 0, .23)
  model.add(yPlan(.53, lobby, .015, .012), p.trim, 0, .335)
  const sections = 13, sectionHeight = .55
  for (let section = 0; section < sections; section++) {
    const y = .35 + section * sectionHeight, scale = 1 - section * .055, core = .215 * scale + .035
    const wings = Array.from({ length: 3 }, (_, wing) => {
      const length = Math.max(.17, .84 - Math.floor((section + wing) / 3) * .13)
      return { length, width: .29 * scale + .025, center: length / 2 - .045 }
    })
    model.add(yPlan(core, wings, sectionHeight + .003), p.glass, 0, y)
    for (let floor = 1; floor <= 7; floor++) model.add(yPlan(core, wings, .006, .0035), p.metal, 0, y + floor / 7 * sectionHeight - .006)
    for (let wing = 0; wing < 3; wing++) {
      const angle = wing * Math.PI * 2 / 3, { length, width, center } = wings[wing]!
      for (const side of [-1, 1]) for (const along of [.18, .42, .68]) {
        const lx = -length / 2 + length * along + center, lz = side * width / 2
        const x = lx * Math.cos(angle) + lz * Math.sin(angle), z = -lx * Math.sin(angle) + lz * Math.cos(angle)
        model.rod(p.metal, new THREE.Vector3(x, y - .002, z), new THREE.Vector3(x, y + sectionHeight - .002, z), .0035, .0035, false)
      }
    }
  }
  // Continuous tapering crown and needle; every section overlaps its support.
  model.add(new THREE.CylinderGeometry(.066, .106, .35, 24), p.metal, 0, 7.675)
  model.add(new THREE.CylinderGeometry(.027, .066, .35, 20), p.metal, 0, 8.025)
  model.add(new THREE.CylinderGeometry(.001, .027, 1.30, 12), p.metal, 0, 8.85)
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3
    model.box(p.dark, .25, .19, .016, Math.cos(angle) * 1.08, .195, -Math.sin(angle) * 1.08, angle + Math.PI / 2)
  }
  return model.finish('dubai-y-plan-stepped-landmark')
}

export function createDhow(variant: number): THREE.Group {
  const k = Math.abs(Math.floor(variant)), p = palette(k), model = new Model(Object.values(p))
  p.wood.color.set(k % 2 ? '#916a45' : '#806144'); p.trim.color.set('#baa17c')
  const stations = [-.80, -.64, -.36, 0, .36, .64, .83]
  const widths = [.055, .18, .262, .285, .25, .145, .008]
  const rails = [.18, .115, .092, .085, .105, .16, .255]
  const keels = [-.085, -.16, -.20, -.21, -.175, -.10, .075]
  const vertices: number[] = [], uv: number[] = [], indices: number[] = [], across = 12
  for (let j = 0; j < stations.length; j++) for (let i = 0; i <= across; i++) {
    const angle = i / across * Math.PI, side = Math.cos(angle)
    vertices.push(widths[j]! * side, keels[j]! + (rails[j]! - keels[j]!) * Math.pow(Math.abs(side), .78), stations[j]!)
    uv.push(i / across * 2, j / (stations.length - 1) * 3)
    if (j < stations.length - 1 && i < across) { const a = j * (across + 1) + i, b = a + across + 1; indices.push(a, a + 1, b, a + 1, b + 1, b) }
  }
  for (let i = 1; i < across; i++) {
    indices.push(0, i + 1, i)
    const end = (stations.length - 1) * (across + 1); indices.push(end, end + i, end + i + 1)
  }
  const hull = new THREE.BufferGeometry(); hull.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); hull.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); hull.setIndex(indices); hull.computeVertexNormals(); p.wood.side = THREE.DoubleSide; model.add(hull, p.wood)
  const deck: number[] = [], deckUv: number[] = [], deckIndices: number[] = []
  for (let j = 0; j < stations.length; j++) {
    const y = .045 + Math.max(0, rails[j]! - .1) * .55
    deck.push(-widths[j]! * .92, y, stations[j]!, widths[j]! * .92, y, stations[j]!); deckUv.push(0, j / 2, 1, j / 2)
    if (j < stations.length - 1) { const a = j * 2; deckIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  }
  const deckGeo = new THREE.BufferGeometry(); deckGeo.setAttribute('position', new THREE.Float32BufferAttribute(deck, 3)); deckGeo.setAttribute('uv', new THREE.Float32BufferAttribute(deckUv, 2)); deckGeo.setIndex(deckIndices); deckGeo.computeVertexNormals(); model.add(deckGeo, p.trim)
  for (const side of [-1, 1]) model.tube(p.wood, stations.map((z, i) => new THREE.Vector3(side * widths[i]!, rails[i]!, z)), .009, 38)
  model.box(p.wood, .30, .045, .17, 0, .075, -.48)
  model.box(p.wood, .20, .13, .23, 0, .115, .30)
  model.box(p.trim, .23, .018, .26, 0, .19, .30)
  const mastBase = new THREE.Vector3(0, .05, -.08), mastTop = new THREE.Vector3(0, 1.16, -.08)
  model.rod(p.wood, mastBase, mastTop, .014, .008)
  const yardA = new THREE.Vector3(.012, 1.18, -.59), yardB = new THREE.Vector3(.012, .63, .69), clew = new THREE.Vector3(.10, .27, -.43)
  model.rod(p.wood, yardA, yardB, .009, .006)
  const sailPoints: number[] = [], sailUv: number[] = [], sailIndices: number[] = [], divisions = 10
  const rowStarts: number[] = []
  for (let row = 0; row <= divisions; row++) {
    rowStarts.push(sailPoints.length / 3)
    for (let column = 0; column <= divisions - row; column++) {
      const u = row / divisions, v = column / divisions, w = 1 - u - v
      const point = yardA.clone().multiplyScalar(w).addScaledVector(yardB, u).addScaledVector(clew, v)
      point.x += Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * Math.sin(Math.PI * w) * .16
      sailPoints.push(point.x, point.y, point.z); sailUv.push(u, v)
    }
  }
  for (let row = 0; row < divisions; row++) for (let column = 0; column < divisions - row; column++) {
    const a = rowStarts[row]! + column, b = rowStarts[row + 1]! + column
    sailIndices.push(a, b, a + 1)
    if (column < divisions - row - 1) sailIndices.push(a + 1, b, b + 1)
  }
  const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute(sailPoints, 3)); sail.setAttribute('uv', new THREE.Float32BufferAttribute(sailUv, 2)); sail.setIndex(sailIndices); sail.computeVertexNormals(); model.add(sail, p.cloth)
  const stays = [[mastTop, new THREE.Vector3(-.24, .10, .36)], [mastTop, new THREE.Vector3(.24, .10, .36)], [mastTop, new THREE.Vector3(0, .17, -.73)], [clew, new THREE.Vector3(.16, .09, -.56)], [yardB, new THREE.Vector3(0, .20, .73)]]
  for (const pair of stays) model.rod(p.dark, pair[0]!, pair[1]!, .0015)
  model.box(p.wood, .026, .22, .11, 0, -.04, -.78)
  return model.finish(`dubai-wooden-lateen-dhow-${k}`)
}

export function createMarketStall(variant: number): THREE.Group {
  const k = Math.abs(Math.floor(variant)), p = palette(k)
  const produce = [new THREE.MeshStandardMaterial({ color: '#b79052', roughness: .93 }), new THREE.MeshStandardMaterial({ color: '#929267', roughness: .93 })]
  const model = new Model([...Object.values(p), ...produce])
  for (const x of [-.46, .46]) for (const z of [-.30, .30]) model.rod(p.wood, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, .57, z), .014, .011)
  for (const z of [-.30, .30]) model.box(p.wood, .96, .026, .026, 0, .565, z)
  for (const x of [-.46, .46]) model.box(p.wood, .026, .026, .64, x, .565)
  const canopy = new THREE.PlaneGeometry(1, .70, 14, 8); canopy.rotateX(-Math.PI / 2)
  const positions = canopy.getAttribute('position')
  for (let i = 0; i < positions.count; i++) { const x = positions.getX(i), z = positions.getZ(i); positions.setY(i, .59 - Math.sin((x + .5) * Math.PI) * .035 - Math.max(0, z - .27) * .45) }
  canopy.computeVertexNormals(); model.add(canopy, p.cloth)
  model.box(p.wood, .86, .045, .40, 0, .25, .03)
  for (const x of [-.35, .35]) for (const z of [-.10, .17]) model.box(p.wood, .025, .23, .025, x, .115, z)
  for (let crate = 0; crate < 3; crate++) {
    const x = -.27 + crate * .27
    model.box(p.wood, .235, .023, .27, x, .28, .03)
    for (const sign of [-1, 1]) { model.box(p.wood, .015, .08, .27, x + sign * .11, .31, .03); model.box(p.wood, .23, .08, .014, x, .31, .03 + sign * .127) }
    for (let i = 0; i < 9; i++) {
      const fruit = new THREE.SphereGeometry(.028, 7, 5); fruit.scale(1, .8 + hash(i, k) * .3, 1)
      model.add(fruit, produce[(crate + k) % 2]!, x + (i % 3 - 1) * .061, .321 + hash(i, crate) * .018, .03 + (Math.floor(i / 3) - 1) * .066)
    }
  }
  return model.finish(`dubai-shaded-market-stall-${k}`)
}
