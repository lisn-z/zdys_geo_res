import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { FeatureId, HydrateModel } from './types'

type V3 = [number, number, number]

const cutLeft = -5.3, cutRight = -2.7, cutBack = -.55

/** Shared geometric contact for the sediment roof and the water-column walls. */
export function getSeafloorHeight(x: number, z: number) {
  return -10 + .10 * Math.sin(x * .57 + z * .29) + .055 * Math.cos(z * 1.5 - x * .25) + .04 * Math.sin(x * 1.35 + z * .7)
}

/** Shared nodes, including cutaway corners, keep both sides on one polyline. */
export function getSeafloorSamples(a: number, c: number) {
  const result = [a]
  for (let i = Math.ceil(a * 4); i <= Math.floor(c * 4); i++) {
    const p = i / 4
    if (p > a + .00001 && p < c - .00001) result.push(p)
  }
  for (const p of [cutLeft, cutRight, cutBack]) if (p > a + .00001 && p < c - .00001 && !result.includes(p)) result.push(p)
  result.push(c); return result.sort((x, y) => x - y)
}

/** A connected, deliberately exaggerated engineering cutaway; distances are diagrammatic. */
export function createHydrateModel(): HydrateModel {
  const terrain = getSeafloorHeight
  const group = new THREE.Group()
  group.name = 'Deep sea hydrate engineering cutaway'
  const textures = new Set<THREE.Texture>()
  const materials = new Set<THREE.Material>()
  const material = (color: string, roughness = .65, metalness = .2) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materials.add(m)
    return m
  }
  const steel = material('#aebcc0', .42, .72)
  const darkSteel = material('#394d55', .52, .55)
  const white = material('#e3e7df', .65, .24)
  const red = material('#a8342e', .5, .38)
  const black = material('#24363b', .74, .32)
  const yellow = material('#ddb845', .48, .3)
  const cableMat = material('#3b4646', .79, .15)
  const green = material('#427f78', .72, .12)
  const pipeMat = material('#c6cbbf', .46, .55)
  const glowMat = material('#fbf2c1', .4, .12)
  glowMat.emissive.set('#f8e7a5'); glowMat.emissiveIntensity = 1.2
  const gasMat = material('#ffda65', .4, .1)
  gasMat.emissive.set('#ffc751'); gasMat.emissiveIntensity = .8

  // Small engineering pieces are merged by material: no hundreds of rail draw calls.
  class Batch {
    target: THREE.Group
    parts = new Map<THREE.Material, THREE.BufferGeometry[]>()
    constructor(target: THREE.Group) { this.target = target }
    add(geometry: THREE.BufferGeometry, mat: THREE.Material, position: V3 = [0, 0, 0], rotation?: THREE.Quaternion) {
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), rotation || new THREE.Quaternion(), new THREE.Vector3(1, 1, 1))
      geometry.applyMatrix4(matrix)
      const list = this.parts.get(mat) || []
      list.push(geometry); this.parts.set(mat, list)
    }
    box(size: V3, pos: V3, mat: THREE.Material, rotation?: THREE.Quaternion) {
      this.add(new THREE.BoxGeometry(...size), mat, pos, rotation)
    }
    tube(a: V3, b: V3, r: number, mat: THREE.Material, segments = 8) {
      const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b)
      const d = q.clone().sub(p)
      if (d.length() < .00001) return
      this.add(new THREE.CylinderGeometry(r, r, d.length(), segments), mat, p.add(q).multiplyScalar(.5).toArray() as V3,
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()))
    }
    cylinder(r: number, height: number, pos: V3, mat: THREE.Material, segments = 20) {
      this.add(new THREE.CylinderGeometry(r, r, height, segments), mat, pos)
    }
    sphere(r: number, pos: V3, mat: THREE.Material) { this.add(new THREE.SphereGeometry(r, 12, 8), mat, pos) }
    flush() {
      for (const [mat, parts] of this.parts) {
        const merged = mergeGeometries(parts, false)
        for (const part of parts) part.dispose()
        if (!merged) continue
        const mesh = new THREE.Mesh(merged, mat)
        mesh.castShadow = true; mesh.receiveShadow = true
        this.target.add(mesh)
      }
      this.parts.clear()
    }
  }
  const b = new Batch(group)
  let seed = 48317
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
    const context = canvas.getContext('2d')!
    paint(context)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    textures.add(texture)
    return texture
  }

  // Subtle marine paint, abrasion and non-slip steel: detail is in shared maps,
  // not hundreds of individual bolts or a glossy plastic-looking base color.
  let paintSeed = 7319
  const paintRandom = () => { paintSeed = (paintSeed * 1664525 + 1013904223) >>> 0; return paintSeed / 4294967296 }
  const paintMap = canvasTexture(256, 256, ctx => {
    const pixels = ctx.createImageData(256, 256)
    for (let i = 0; i < pixels.data.length; i += 4) {
      const v = 234 + Math.floor(paintRandom() * 17)
      pixels.data[i] = v; pixels.data[i + 1] = v; pixels.data[i + 2] = v; pixels.data[i + 3] = 255
    }
    ctx.putImageData(pixels, 0, 0)
    ctx.strokeStyle = 'rgba(102,108,101,.07)'; ctx.lineWidth = .6
    for (let i = 0; i < 80; i++) {
      const x = paintRandom() * 256, y = paintRandom() * 256
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 + paintRandom() * 13, y + paintRandom() * 2); ctx.stroke()
    }
  })
  paintMap.wrapS = paintMap.wrapT = THREE.RepeatWrapping
  const paintBump = paintMap.clone(); paintBump.colorSpace = THREE.NoColorSpace; textures.add(paintBump)
  const paintRoughness = canvasTexture(256, 256, ctx => {
    const pixels = ctx.createImageData(256, 256)
    for (let i = 0; i < pixels.data.length; i += 4) {
      const v = 210 + Math.floor(paintRandom() * 35)
      pixels.data[i] = v; pixels.data[i + 1] = v; pixels.data[i + 2] = v; pixels.data[i + 3] = 255
    }
    ctx.putImageData(pixels, 0, 0)
  })
  paintRoughness.colorSpace = THREE.NoColorSpace
  paintRoughness.wrapS = paintRoughness.wrapT = THREE.RepeatWrapping
  const marinePaint = (color: string, roughness = .84, metalness = .18) => {
    const mat = material(color, roughness, metalness)
    mat.map = paintMap; mat.bumpMap = paintBump; mat.bumpScale = .005; mat.roughnessMap = paintRoughness
    return mat
  }
  const platformSteel = marinePaint('#9aa5a5', .64, .55)
  const platformDark = marinePaint('#4d5959', .84, .26)
  const platformWhite = marinePaint('#c9c9bc', .87, .12)
  const platformRail = marinePaint('#b3b7ad', .73, .32)
  const platformRed = marinePaint('#8b4b3c', .85, .18)
  const platformHull = marinePaint('#694439', .9, .13)
  const platformBlack = marinePaint('#384747', .86, .22)
  const platformYellow = marinePaint('#bda45e', .82, .12)
  const platformGlass = material('#263e46', .29, .38)
  const deckMap = canvasTexture(512, 512, ctx => {
    ctx.fillStyle = '#bfc0b5'; ctx.fillRect(0, 0, 512, 512)
    const pixels = ctx.getImageData(0, 0, 512, 512)
    for (let i = 0; i < pixels.data.length; i += 4) {
      const v = Math.floor(paintRandom() * 15) - 7
      pixels.data[i]! += v; pixels.data[i + 1]! += v; pixels.data[i + 2]! += v
    }
    ctx.putImageData(pixels, 0, 0)
    // Welded plate seams and very fine non-slip ribs, intentionally low contrast.
    ctx.strokeStyle = 'rgba(72,81,75,.20)'; ctx.lineWidth = 1.5
    for (let i = 0; i <= 512; i += 128) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(240,239,222,.16)'; ctx.lineWidth = 1
    for (let y = 6; y < 512; y += 10) for (let x = 4; x < 512; x += 13) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y + 3); ctx.stroke()
    }
  })
  deckMap.wrapS = deckMap.wrapT = THREE.RepeatWrapping; deckMap.repeat.set(3, 3)
  const deckBump = deckMap.clone(); deckBump.colorSpace = THREE.NoColorSpace; textures.add(deckBump)
  const platformDeck = material('#8b9186', .95, .14)
  platformDeck.map = deckMap; platformDeck.bumpMap = deckBump; platformDeck.bumpScale = .009; platformDeck.roughnessMap = paintRoughness
  const platformWalkway = marinePaint('#8d9587', .94, .12)

  // Pontoons, columns and diagonal members all meet structural attachment points.
  function pontoon(height: number) {
    const shape = new THREE.Shape()
    shape.moveTo(-3.7, -.65); shape.lineTo(3.5, -.65)
    shape.bezierCurveTo(4.08, -.65, 4.52, -.3, 4.58, -.08)
    shape.quadraticCurveTo(4.64, 0, 4.58, .08)
    shape.bezierCurveTo(4.52, .3, 4.08, .65, 3.5, .65)
    shape.lineTo(-3.7, .65); shape.quadraticCurveTo(-4.35, .65, -4.47, .15)
    shape.quadraticCurveTo(-4.53, 0, -4.47, -.15); shape.quadraticCurveTo(-4.35, -.65, -3.7, -.65)
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: true, bevelSize: .045, bevelThickness: .045, bevelSegments: 2, curveSegments: 8 })
    geometry.rotateX(-Math.PI / 2)
    // Extrusion is non-indexed; normalize this geometry for the shared hull batch.
    return geometry
  }
  for (const z of [-2.55, 2.55]) {
    const lower = pontoon(.65), upper = pontoon(.3)
    // Unique batches avoid mixing indexed cylinder geometries with extrusion faces.
    const lowerMesh = new THREE.Mesh(lower, platformHull), upperMesh = new THREE.Mesh(upper, platformBlack)
    lowerMesh.position.set(-4, -1.355, z); upperMesh.position.set(-4, -.705, z)
    lowerMesh.castShadow = upperMesh.castShadow = true
    lowerMesh.receiveShadow = upperMesh.receiveShadow = true
    group.add(lowerMesh, upperMesh)
    for (const x of [-7, -1]) {
      b.cylinder(.62, 2.7, [x, .64, z], platformBlack, 32)
      b.cylinder(.65, .25, [x, -.62, z], platformHull, 32)
      b.cylinder(.67, .12, [x, 1.9, z], platformDark, 32)
      for (const y of [-.25, .8]) b.cylinder(.626, .028, [x, y, z], platformDark, 32)
    }
    b.tube([-6.8, -.3, z], [-1.2, 1.9, z], .095, platformDark)
    b.tube([-1.2, -.3, z], [-6.8, 1.9, z], .095, platformDark)
  }
  for (const x of [-7, -1]) {
    b.tube([x, -.2, -2.45], [x, 1.9, 2.45], .09, platformDark)
    b.tube([x, -.2, 2.45], [x, 1.9, -2.45], .09, platformDark)
  }
  // Four structural deck slabs leave a real moonpool around the continuous riser.
  for (const z of [-1.93, 1.93]) b.box([9.5, .28, 3.14], [-4, 2.06, z], platformDeck)
  for (const x of [-6.555, -1.445]) b.box([4.39, .28, .72], [x, 2.06, 0], platformDeck)
  for (const z of [-3.5, 3.5]) {
    b.box([9.65, .26, .13], [-4, 1.96, z], platformDark)
    b.box([9.65, .045, .2], [-4, 1.81, z], platformSteel)
  }
  for (const x of [-8.75, .75]) b.box([.13, .26, 7], [x, 1.96, 0], platformDark)
  for (const x of [-7, -4.65, -3.35, -1]) b.box([.14, .36, 6.6], [x, 1.72, 0], platformDark)
  for (const z of [-.65, .65]) b.box([9.3, .24, .12], [-4, 1.67, z], platformDark)
  // Continuous access route, painted deck margins and flush drainage grates.
  for (const z of [-3.05, 3.05]) {
    b.box([8.9, .012, .38], [-4, 2.206, z], platformWalkway)
    for (const dz of [-.23, .23]) b.box([8.9, .015, .025], [-4, 2.208, z + dz], platformYellow)
  }
  for (const x of [-8.3, -1.9, .25]) {
    b.box([.23, .012, .5], [x, 2.207, 2.8], platformDark)
    for (let i = 0; i < 6; i++) b.box([.23, .018, .018], [x, 2.213, 2.59 + i * .084], platformSteel)
  }

  function railing(from: V3, to: V3, height = .42, mat: THREE.Material = platformRail) {
    const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to)
    for (const h of [height, height * .51]) b.tube([from[0], from[1] + h, from[2]], [to[0], to[1] + h, to[2]], .015, mat, 6)
    const n = Math.ceil(start.distanceTo(end) / .55)
    for (let i = 0; i <= n; i++) {
      const p = start.clone().lerp(end, i / n)
      b.tube(p.toArray() as V3, [p.x, p.y + height, p.z], .019, mat, 6)
    }
  }
  railing([-8.6, 2.2, 3.4], [.6, 2.2, 3.4])
  railing([-8.6, 2.2, -3.4], [.6, 2.2, -3.4])
  railing([-8.6, 2.2, -3.4], [-8.6, 2.2, 3.4])
  railing([.6, 2.2, -3.4], [.6, 2.2, 3.4])

  // Accommodation decks, recessed dark window strips and individual mullions.
  // The lower wall has an actual shallow intake recess below the window row.
  // Split only its outer 0.12 shell; the rest of the accommodation block is intact.
  b.box([2.53, 1.05, 4.6], [-6.99, 2.74, -.25], platformWhite)
  b.box([.12, .625, 4.6], [-8.315, 2.9525, -.25], platformWhite)
  b.box([.12, .105, 4.6], [-8.315, 2.2675, -.25], platformWhite)
  b.box([.12, .32, 1.37], [-8.315, 2.48, -1.865], platformWhite)
  b.box([.12, .32, 2.63], [-8.315, 2.48, .735], platformWhite)
  b.box([2.43, .95, 4.4], [-7.05, 3.74, -.25], platformWhite)
  b.box([2.55, .13, 4.55], [-7.05, 4.28, -.25], platformDeck)
  b.box([2.78, .14, 4.8], [-7.05, 3.28, -.25], platformDeck)
  for (const [level, y] of [2.91, 3.84].entries()) {
    const rightX = level === 0 ? -5.714 : -5.824
    const leftX = level === 0 ? -8.383 : -8.274
    const frontZ = level === 0 ? 2.06 : 1.96
    const backZ = level === 0 ? -2.56 : -2.46
    for (let i = 0; i < 8; i++) {
      const z = -2.12 + i * .52
      b.box([.018, .38, .37], [rightX, y, z], platformSteel)
      b.box([.018, .38, .37], [leftX, y, z], platformSteel)
      b.box([.035, .33, .32], [rightX, y, z], platformGlass)
      b.box([.035, .33, .32], [leftX, y, z], platformGlass)
    }
    for (let i = 0; i < 5; i++) {
      const x = -8.05 + i * .5
      b.box([.36, .38, .018], [x, y, frontZ], platformSteel)
      b.box([.36, .38, .018], [x, y, backZ], platformSteel)
      b.box([.31, .33, .035], [x, y, frontZ], platformGlass)
      b.box([.31, .33, .035], [x, y, backZ], platformGlass)
    }
  }
  b.box([.035, .65, .37], [-5.708, 2.56, 1.68], platformDark)
  b.box([.02, .57, .31], [-5.684, 2.56, 1.68], platformWhite)
  b.box([.024, .15, .2], [-5.67, 2.72, 1.68], platformGlass)
  b.tube([-5.649, 2.48, 1.78], [-5.649, 2.61, 1.78], .012, platformSteel, 6)
  b.box([.32, .045, .51], [-5.62, 2.2225, 1.68], platformSteel)
  // Upper door lands on the stair platform; no floating stair landing.
  b.box([.025, .65, .38], [-5.82, 3.63, .85], platformDark)
  b.box([.028, .58, .32], [-5.8, 3.63, .85], platformWhite)
  b.tube([-5.777, 3.52, .96], [-5.777, 3.64, .96], .012, platformSteel, 6)
  b.box([1.3, .55, 1.8], [-7.25, 4.62, -.5], platformWhite)
  b.box([.035, .23, 1.5], [-6.58, 4.65, -.5], platformGlass)
  // The service room ends at z=0.4. Both complete HVAC assemblies sit beyond
  // it: first housing starts at z=0.545, second ends at z=1.705, before the rail.
  // Move housings, fan rings, hubs and blades together to preserve their joints.
  for (const z of [.8, 1.45]) {
    b.box([.69, .22, .51], [-7.37, 4.455, z], platformDark)
    b.cylinder(.195, .065, [-7.37, 4.5975, z], platformSteel, 20)
    b.cylinder(.16, .015, [-7.37, 4.6375, z], platformBlack, 20)
    b.cylinder(.042, .018, [-7.37, 4.652, z], platformSteel, 12)
    for (let blade = 0; blade < 3; blade++) b.box([.27, .012, .034], [-7.37, 4.651, z], platformSteel,
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), blade * Math.PI / 3))
  }
  for (const z of [-1.65, -1.98]) {
    b.tube([-7.8, 4.345, z], [-7.8, 4.95, z], .063, platformSteel, 12)
    b.cylinder(.091, .045, [-7.8, 4.963, z], platformDark, 12)
  }
  b.box([.14, .07, 4.1], [-8.1, 4.37, -.2], platformDark)
  // Framed intake, y=2.30..2.66, stays below the window frames (bottom=2.72).
  // Louver ends seat inside both jambs; the dark back lies inside the recess.
  b.box([.008, .32, .6], [-8.257, 2.48, -.88], platformBlack)
  for (const y of [2.315, 2.645]) b.box([.1, .03, .64], [-8.355, y, -.88], platformSteel)
  for (const z of [-1.185, -.575]) b.box([.1, .3, .03], [-8.355, 2.48, z], platformSteel)
  const louverTilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), .28)
  for (let i = 0; i < 6; i++) b.box([.085, .014, .596], [-8.324, 2.355 + i * .05, -.88], platformDark, louverTilt)
  b.cylinder(.17, .12, [-7.3, 4.95, -.72], platformDark, 20)
  b.sphere(.25, [-7.3, 5.17, -.72], platformWhite)
  // Communications mast has its own roof-corner mount, away from both fans.
  // Its feeder follows a low tray around the equipment rather than crossing it.
  const mastX = -6.12, mastZ = 1.6
  b.box([1.98, .045, .06], [-7.11, 4.365, 1.82], platformDark)
  b.box([.06, .045, .22], [mastX, 4.365, 1.71], platformDark)
  b.box([.26, .045, .26], [mastX, 4.3675, mastZ], platformSteel)
  b.cylinder(.08, .065, [mastX, 4.4225, mastZ], platformDark, 16)
  for (const dx of [-.1, .1]) for (const dz of [-.1, .1]) b.cylinder(.014, .025, [mastX + dx, 4.4015, mastZ + dz], platformSteel, 6)
  b.tube([mastX, 4.39, mastZ], [mastX, 5.8, mastZ], .023, platformSteel, 12)
  b.cylinder(.032, .1, [mastX, 5.76, mastZ], platformDark, 12)
  b.add(new THREE.CylinderGeometry(.006, .012, .34, 8), platformWhite, [mastX, 5.97, mastZ])
  railing([-8.25, 4.36, 1.95], [-5.85, 4.36, 1.95])
  railing([-5.85, 4.36, -2.4], [-5.85, 4.36, 1.95])

  // A proper stair flight with stringers, treads and connected handrails.
  const stairX = -5.35
  b.tube([stairX - .23, 2.23, 2.75], [stairX - .23, 3.31, 1.03], .035, platformSteel)
  b.tube([stairX + .23, 2.23, 2.75], [stairX + .23, 3.31, 1.03], .035, platformSteel)
  for (let i = 0; i < 9; i++) b.box([.5, .055, .23], [stairX, 2.23 + i * .135, 2.75 - i * .215], platformSteel)
  for (const dx of [-.26, .26]) {
    b.tube([stairX + dx, 2.7, 2.75], [stairX + dx, 3.8, 1.03], .024, platformWhite)
    for (let i = 0; i <= 4; i++) b.tube([stairX + dx, 2.23 + i * .27, 2.75 - i * .43], [stairX + dx, 2.7 + i * .27, 2.75 - i * .43], .022, platformWhite)
  }
  b.box([.75, .1, .6], [-5.5, 3.29, .85], platformSteel)

  // Tapered drilling derrick, four legs, braces and cross ties at every level.
  const towerBottom = 2.5, towerTop = 8.65, towerLevels = 7
  const towerHalf = (level: number) => 1.07 - level / towerLevels * .7
  const towerY = (level: number) => towerBottom + (towerTop - towerBottom) * level / towerLevels
  for (const z of [-.765, .765]) b.box([2.5, .3, .97], [-4, 2.35, z], platformDark)
  for (const x of [-4.765, -3.235]) b.box([.97, .3, .56], [x, 2.35, 0], platformDark)
  for (let level = 0; level < towerLevels; level++) {
    const w = towerHalf(level), v = towerHalf(level + 1), y = towerY(level), h = towerY(level + 1)
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.tube([-4 + sx * w, y, sz * w], [-4 + sx * v, h, sz * v], .055, platformSteel)
      b.tube([-4 + sx * w, y, sz * w], [-4 - sx * w, y, sz * w], .034, platformSteel)
      b.tube([-4 + sx * w, y, sz * w], [-4 + sx * w, y, -sz * w], .034, platformSteel)
      b.tube([-4 + sx * w, y, sz * w], [-4 - sx * v, h, sz * v], .026, platformSteel)
      b.tube([-4 + sx * w, y, sz * w], [-4 + sx * v, h, -sz * v], .026, platformSteel)
    }
  }
  b.box([.95, .15, .95], [-4, towerTop, 0], platformSteel)
  b.box([.6, .17, .5], [-4, towerTop + .16, 0], platformDark)
  for (const x of [-4.18, -4, -3.82]) b.add(new THREE.CylinderGeometry(.12, .12, .09, 16), platformSteel,
    [x, towerTop + .29, 0], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2))
  b.tube([-4, 2.65, 0], [-4, towerTop, 0], .032, cableMat)
  b.box([.32, .6, .32], [-4, 5.9, 0], platformYellow)
  for (const x of [-4.18, -3.82]) b.box([.035, .65, .35], [x, 5.9, 0], platformSteel)
  b.tube([-4, 2.6, 0], [-4, 5.6, 0], .075, platformDark)
  // Service ladder welded to one face, with a small observation landing.
  for (const x of [-4.32, -4.05]) b.tube([x, 2.55, -1.1], [x, 7.72, -.52], .023, platformSteel)
  for (let i = 0; i < 24; i++) {
    const t = i / 24
    b.tube([-4.32, 2.55 + t * 5.17, -1.1 + t * .58], [-4.05, 2.55 + t * 5.17, -1.1 + t * .58], .018, platformSteel, 6)
  }
  b.box([1.4, .08, .5], [-4, 6.85, -.83], platformSteel)
  railing([-4.7, 6.9, -1.04], [-3.3, 6.9, -1.04], .35)

  // Two lattice cranes. Main boom angles outwards, cable hangs vertically to hook.
  function crane(base: V3, tip: V3) {
    b.cylinder(.33, .45, [base[0], base[1] + .22, base[2]], platformDark)
    const p: V3 = [base[0], base[1] + .8, base[2]]
    b.box([.68, .7, .6], [base[0], base[1] + .78, base[2]], platformRed)
    b.box([.39, .27, .65], [base[0] - .45, base[1] + .91, base[2]], platformDark)
    b.cylinder(.38, .08, [base[0], base[1] + .49, base[2]], platformSteel, 24)
    b.box([.3, .42, .5], [base[0] + .48, base[1] + .91, base[2]], platformWhite)
    b.box([.035, .24, .38], [base[0] + .64, base[1] + 1, base[2]], platformGlass)
    for (const sign of [-1, 1]) b.box([.21, .24, .018], [base[0] + .49, base[1] + 1, base[2] + sign * .256], platformGlass)
    b.add(new THREE.CylinderGeometry(.13, .13, .38, 16), platformBlack,
      [base[0] - .12, base[1] + 1.2, base[2]], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))
    for (const dz of [-.15, .15]) for (const dy of [-.13, .13]) {
      b.tube([p[0], p[1] + dy, p[2] + dz], [tip[0], tip[1] + dy, tip[2] + dz], .033, platformRed)
    }
    const from = new THREE.Vector3(...p), to = new THREE.Vector3(...tip)
    for (let i = 0; i < 10; i++) {
      const a = from.clone().lerp(to, i / 10), c = from.clone().lerp(to, (i + 1) / 10)
      for (const dz of [-.15, .15]) b.tube([a.x, a.y - .13, a.z + dz], [c.x, c.y + .13, c.z + dz], .019, platformRed, 6)
      b.tube([a.x, a.y + .13, a.z - .15], [a.x, a.y + .13, a.z + .15], .022, platformRed, 6)
    }
    // Sheave axle joins the four boom chords; hoist cable attaches to this axle.
    for (const dy of [-.13, .13]) b.tube([tip[0], tip[1] + dy, tip[2] - .15], [tip[0], tip[1] + dy, tip[2] + .15], .024, platformRed, 6)
    for (const dz of [-.15, .15]) b.tube([tip[0], tip[1] - .13, tip[2] + dz], [tip[0], tip[1] + .13, tip[2] + dz], .024, platformRed, 6)
    b.tube([tip[0], tip[1], tip[2] - .17], [tip[0], tip[1], tip[2] + .17], .065, platformDark, 12)
    b.tube([p[0] - .3, p[1], p[2]], [p[0] - .3, p[1] + .9, p[2]], .035, platformRed)
    b.tube([p[0] - .3, p[1] + .9, p[2]], tip, .014, cableMat, 5)
    b.tube(tip, [tip[0], tip[1] - 1.6, tip[2]], .014, cableMat, 5)
    b.cylinder(.1, .2, [tip[0], tip[1] - 1.7, tip[2]], platformBlack, 8)
    b.add(new THREE.TorusGeometry(.09, .022, 6, 16, Math.PI * 1.7), platformSteel,
      [tip[0], tip[1] - 1.89, tip[2]], new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), .7))
  }
  crane([-1.15, 2.2, 2.2], [2.1, 5.7, 2.6])
  // Keep the complete aft crane clear of the accommodation, including its
  // counterweight and the projecting window frames / floor-edge fascias.
  // Its leftmost part is x=-5.195; the fascia ends at x=-5.66 (0.465 clearance).
  // The pedestal also clears the painted rear walkway and the process pipe rack.
  // Moving both pivots preserves every boom, hoist and counterweight connection.
  const aftCraneBase: V3 = [-4.55, 2.2, -2.44]
  crane(aftCraneBase, [aftCraneBase[0] + 2.5, aftCraneBase[1] + 3.3, aftCraneBase[2] - 1.2])

  // Circular cantilever helideck, with load-bearing underside braces.
  const pad: V3 = [-.5, 2.66, -3.6]
  b.cylinder(1.62, .13, pad, platformDark, 64)
  b.tube([-1.2, 1.85, -2.5], [-.5, 2.59, -4.8], .085, platformSteel)
  b.tube([0, 1.85, -2.5], [.6, 2.59, -4.5], .085, platformSteel)
  b.tube([-1.5, 2.2, -2.8], [-1.5, 2.59, -4.2], .06, platformSteel)
  const helipadTexture = canvasTexture(512, 512, ctx => {
    ctx.fillStyle = '#4c655d'; ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = '#c4cebd'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(256, 256, 232, 0, Math.PI * 2); ctx.stroke()
    ctx.strokeStyle = '#baaa73'; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(256, 256, 155, 0, Math.PI * 2); ctx.stroke()
    ctx.fillStyle = '#d3d6c6'; ctx.font = 'bold 235px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', 256, 269)
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1
    for (let x = 0; x < 512; x += 18) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke() }
    for (let i = 0; i < 4200; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(24,35,28,.06)' : 'rgba(209,211,187,.055)'
      ctx.fillRect(paintRandom() * 512, paintRandom() * 512, 1 + paintRandom() * 3, 1)
    }
  })
  const padMat = new THREE.MeshStandardMaterial({ map: helipadTexture, roughness: .8, metalness: .1 })
  padMat.bumpMap = paintBump; padMat.bumpScale = .006; padMat.roughnessMap = paintRoughness
  materials.add(padMat)
  const padTop = new THREE.CircleGeometry(1.59, 64); padTop.rotateX(-Math.PI / 2)
  b.add(padTop, padMat, [-.5, 2.731, -3.6])
  // Deck-to-pad access is connected, with a low stair and clear handrails.
  for (let i = 0; i < 4; i++) b.box([.53, .13, .22], [-.5, 2.265 + i * .13, -1.45 - i * .21], platformDeck)
  for (const x of [-.79, -.21]) {
    b.tube([x, 2.21, -1.32], [x, 2.72, -2.1], .027, platformSteel)
    b.tube([x, 2.64, -1.32], [x, 3.15, -2.1], .018, platformRail, 6)
    b.tube([x, 2.21, -1.32], [x, 2.64, -1.32], .019, platformRail, 6)
    b.tube([x, 2.72, -2.1], [x, 3.15, -2.1], .019, platformRail, 6)
  }
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2
    b.cylinder(.038, .04, [pad[0] + Math.cos(a) * 1.58, 2.75, pad[2] + Math.sin(a) * 1.58], platformDark, 8)
    b.sphere(.023, [pad[0] + Math.cos(a) * 1.58, 2.777, pad[2] + Math.sin(a) * 1.58], glowMat)
  }
  // Exposed process equipment: pipe rack, separator tanks and fire-water line.
  for (let i = 0; i < 3; i++) {
    const x = -2.1 + i * .55
    b.box([.4, .07, .44], [x, 2.235, -.9], platformDark)
    b.cylinder(.18, .67, [x, 2.72, -.9], platformWhite)
    b.sphere(.18, [x, 3.055, -.9], platformWhite)
    b.sphere(.18, [x, 2.385, -.9], platformWhite)
    for (const dz of [-.11, .11]) b.box([.05, .19, .05], [x, 2.36, -.9 + dz], platformSteel)
    for (const y of [2.46, 2.97]) b.cylinder(.184, .025, [x, y, -.9], platformSteel, 20)
    b.tube([x, 2.73, -.9], [x, 2.73, -.63], .025, platformSteel, 8)
    b.add(new THREE.TorusGeometry(.065, .009, 5, 14), platformRed, [x, 2.73, -.62])
    b.tube([x, 2.3, -.9], [x, 2.3, -1.75], .04, platformSteel)
    b.tube([x, 2.3, -1.75], [-3.1, 2.3, -1.75], .04, platformSteel)
  }
  b.box([1.5, .48, .7], [-2.05, 2.46, .4], platformWhite)
  for (const x of [-2.68, -1.42]) b.box([.13, .04, .8], [x, 2.22, .4], platformDark)
  for (let i = 0; i < 9; i++) b.box([.06, .32, .02], [-2.65 + i * .15, 2.48, .76], platformDark)
  b.box([.8, .5, .7], [-7.6, 2.46, 2.7], platformRed)
  for (let i = 0; i < 3; i++) b.tube([-5.2, 2.3 + i * .12, -2], [-2.4, 2.3 + i * .12, -2], .035, platformSteel)
  for (const x of [-5, -3.8, -2.6]) b.tube([x, 2.2, -2], [x, 2.7, -2], .03, platformDark)

  // Riser section is continuous from the drilling floor to seabed wellhead.
  b.tube([-4, 2.35, 0], [-4, -9.55, 0], .13, pipeMat, 20)
  b.tube([-4.19, 1.8, .03], [-4.19, -9.55, .03], .027, darkSteel)
  for (let y = -8.8; y <= 1.7; y += 1.05) b.cylinder(.18, .08, [-4, y, 0], darkSteel, 16)
  for (let y = -.7; y < .6; y += .18) b.cylinder(.23, .12, [-4, y, 0], darkSteel, 16)
  b.cylinder(.35, .45, [-4, -9.35, 0], yellow, 16)

  // Each mooring seat follows the actual local seabed slope. Its lower face is
  // lightly embedded; the cable terminates on its exposed padeye, not at a fixed Y.
  const moorings: [number, number, number, number][] = [[-7, 2.6, -12, 6.8], [-1, 2.6, 7, 6.2], [-7, -2.6, -12, -6.9], [-1, -2.6, 6.5, -6.7]]
  for (const [x, z, ex, ez] of moorings) {
    const ground = new THREE.Vector3(ex, terrain(ex, ez), ez)
    const sample = .03
    const slopeX = (terrain(ex + sample, ez) - terrain(ex - sample, ez)) / (sample * 2)
    const slopeZ = (terrain(ex, ez + sample) - terrain(ex, ez - sample)) / (sample * 2)
    const normal = new THREE.Vector3(-slopeX, 1, -slopeZ).normalize()
    const forward = new THREE.Vector3(x - ex, 0, z - ez).projectOnPlane(normal).normalize()
    const right = normal.clone().cross(forward).normalize()
    const rotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, normal, forward))
    const anchorPoint = (point: V3) => new THREE.Vector3(...point).applyQuaternion(rotation).add(ground)
    const cableEnd = anchorPoint([0, .27, 0])
    b.box([.62, .16, .46], anchorPoint([0, .06, 0]).toArray() as V3, darkSteel, rotation)
    b.box([.22, .05, .23], anchorPoint([0, .145, 0]).toArray() as V3, steel, rotation)
    b.add(new THREE.TorusGeometry(.065, .014, 6, 16), steel, anchorPoint([0, .205, 0]).toArray() as V3, rotation)
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, -.7, z), new THREE.Vector3((x + ex) / 2, -6.6, (z + ez) / 2), cableEnd)
    b.add(new THREE.TubeGeometry(curve, 24, .017, 5, false), cableMat)
  }

  // Closed, stratified sediment body. A narrow cutaway follows the real well axis.
  const layerDepths = [0, 1.8, 3.8, 4.2, 5.15, 6.7, 8]
  // Adjacent mud/silt units differ subtly; hydrate-bearing sediment is cool gray,
  // rather than a saturated blue band resembling a slab of exposed ice.
  const layerColors = ['#9b9384', '#8c8579', '#877f74', '#999f98', '#827e73', '#777368']
  const sedimentGroup = new THREE.Group(); sedimentGroup.name = 'Stratified sediment with closed well cutaway'; group.add(sedimentGroup)
  const fillGroup = new THREE.Group(); fillGroup.name = 'Sediment window infill'; group.add(fillGroup); fillGroup.visible = false
  const cutGroup = new THREE.Group(); cutGroup.name = 'Exposed cutaway walls'; sedimentGroup.add(cutGroup)
  function boundary(x: number, z: number, layer: number) {
    const base = -10 - layerDepths[layer]!
    if (layer === 0) return terrain(x, z)
    if (layer === layerDepths.length - 1) return -18
    // One shared deformation field keeps every contact continuous and noncrossing.
    return base + .14 * Math.sin(x * .38 + z * .21) + .055 * Math.sin(x * 1.13 + z * .48)
  }
  function sedimentMaps(top = false) {
    const size = 1024, height = top ? 1024 : 768
    const albedoCanvas = document.createElement('canvas'), reliefCanvas = document.createElement('canvas')
    albedoCanvas.width = reliefCanvas.width = size; albedoCanvas.height = reliefCanvas.height = height
    const albedoContext = albedoCanvas.getContext('2d')!, reliefContext = reliefCanvas.getContext('2d')!
    const albedo = albedoContext.createImageData(size, height), relief = reliefContext.createImageData(size, height)
    const hash = (x: number, y: number, salt: number) => {
      let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ salt
      h = Math.imul(h ^ (h >>> 13), 1274126177)
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295
    }
    const noise = (u: number, v: number, nx: number, ny: number, salt: number) => {
      const x = u * nx, y = v * ny, ix = Math.floor(x), iy = Math.floor(y)
      let fx = x - ix, fy = y - iy
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
      const wrapped = (n: number, period: number) => ((n % period) + period) % period
      const x0 = wrapped(ix, nx), x1 = wrapped(ix + 1, nx), y0 = wrapped(iy, ny), y1 = wrapped(iy + 1, ny)
      const a = hash(x0, y0, salt), b = hash(x1, y0, salt), c = hash(x0, y1, salt), d = hash(x1, y1, salt)
      return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < size; x++) {
      const u = x / size, v = y / height
      const macro = noise(u, v, 5, 5, 173)
      const cloud = noise(u, v, 19, 21, 389)
      const grit = noise(u, v, 113, 127, 997)
      const fine = hash(x, y, 5311)
      // Fine horizontal deposition, gently warped by broad variations. On the
      // seabed itself this becomes soft mottling, not wooden-looking stripes.
      const bedding = top ? noise(u, v, 31, 29, 751) : noise(u + .025 * cloud, v + .013 * macro, 9, 97, 751)
      const darkGrain = fine < .075 ? (fine / .075 - 1) * 18 : 0
      const lightGrain = fine > .965 ? (fine - .965) / .035 * 14 : 0
      const shade = 185 + (macro - .5) * 40 + (cloud - .5) * 25 + (grit - .5) * 18 + (bedding - .5) * (top ? 11 : 25) + darkGrain + lightGrain
      const index = (y * size + x) * 4
      albedo.data[index] = Math.min(255, shade * 1.035)
      albedo.data[index + 1] = Math.min(255, shade * 1.015)
      albedo.data[index + 2] = shade * .98
      albedo.data[index + 3] = 255
      const reliefValue = 170 + (grit - .5) * 48 + (fine - .5) * 22 + (bedding - .5) * (top ? 14 : 35)
      relief.data[index] = relief.data[index + 1] = relief.data[index + 2] = reliefValue
      relief.data[index + 3] = 255
    }
    albedoContext.putImageData(albedo, 0, 0); reliefContext.putImageData(relief, 0, 0)
    const map = new THREE.CanvasTexture(albedoCanvas), bump = new THREE.CanvasTexture(reliefCanvas)
    map.colorSpace = THREE.SRGBColorSpace
    for (const texture of [map, bump]) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4; textures.add(texture)
    }
    return { map, bump }
  }
  // Shared world-aligned texture fields stay continuous across the layer contacts.
  const wallMaps = sedimentMaps()
  const sedimentMaterials = layerColors.map((color, index) => {
    const mat = new THREE.MeshStandardMaterial({ color, map: wallMaps.map, bumpMap: wallMaps.bump, bumpScale: .11, roughnessMap: wallMaps.bump, roughness: 1, metalness: 0 })
    // A modest lightness change identifies the target layer without making it glow.
    if (index === 3) mat.bumpScale = .08
    materials.add(mat); return mat
  })
  const topMaps = sedimentMaps(true)
  const topMat = new THREE.MeshStandardMaterial({ color: '#aaa190', map: topMaps.map, bumpMap: topMaps.bump, bumpScale: .12, roughnessMap: topMaps.bump, roughness: 1 })
  materials.add(topMat)
  const samples = getSeafloorSamples
  function surface(xa: number, xb: number, za: number, zb: number, layer: number, mat: THREE.Material, parent: THREE.Group, bottom = false) {
    const xs = samples(xa, xb), zs = samples(za, zb)
    const nx = xs.length - 1, nz = zs.length - 1
    const positions: number[] = [], uv: number[] = [], indices: number[] = []
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const x = xs[ix]!, z = zs[iz]!
      positions.push(x, boundary(x, z, layer), z); uv.push((x + 15) / 18, (z + 8) / 18)
    }
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const a = iz * (nx + 1) + ix, c = a + nx + 1
      if (bottom) indices.push(a, a + 1, c, a + 1, c + 1, c)
      else indices.push(a, c, a + 1, a + 1, c, c + 1)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; parent.add(mesh)
  }
  function wall(a: [number, number], c: [number, number], layer: number, parent: THREE.Group, inward = false) {
    const axis = a[0] === c[0] ? 1 : 0
    const points = samples(Math.min(a[axis]!, c[axis]!), Math.max(a[axis]!, c[axis]!))
    if (a[axis]! > c[axis]!) points.reverse()
    const count = points.length - 1
    const positions: number[] = [], uv: number[] = [], indices: number[] = []
    for (let i = 0; i <= count; i++) {
      const t = (points[i]! - a[axis]!) / (c[axis]! - a[axis]!)
      const x = a[0] + (c[0] - a[0]) * t, z = a[1] + (c[1] - a[1]) * t
      const top = boundary(x, z, layer), bottom = boundary(x, z, layer + 1)
      const along = (axis === 0 ? x + 15 : z + 8) / 24
      positions.push(x, top, z, x, bottom, z); uv.push(along, (top + 18) / 8, along, (bottom + 18) / 8)
      if (i < count) {
        const n = i * 2
        if (inward) indices.push(n, n + 1, n + 2, n + 2, n + 1, n + 3)
        else indices.push(n, n + 2, n + 1, n + 2, n + 3, n + 1)
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(indices); geometry.computeVertexNormals()
    const mesh = new THREE.Mesh(geometry, sedimentMaterials[layer]); mesh.receiveShadow = true; parent.add(mesh)
  }
  // The perimeter follows a clockwise polygon, including the recessed window.
  const outline: [number, number][] = [[-15, -8], [15, -8], [15, 8], [cutRight, 8], [cutRight, cutBack], [cutLeft, cutBack], [cutLeft, 8], [-15, 8]]
  for (let layer = 0; layer < 6; layer++) {
    for (let edge = 0; edge < outline.length; edge++) {
      const isCut = edge >= 3 && edge <= 5
      wall(outline[edge]!, outline[(edge + 1) % outline.length]!, layer, isCut ? cutGroup : sedimentGroup)
    }
    wall([cutRight, 8], [cutLeft, 8], layer, fillGroup)
  }
  for (const layer of [0, 6]) {
    const mat = layer === 0 ? topMat : sedimentMaterials[5]!
    surface(-15, cutLeft, -8, cutBack, layer, mat, sedimentGroup, layer === 6)
    surface(cutLeft, cutRight, -8, cutBack, layer, mat, sedimentGroup, layer === 6)
    surface(cutRight, 15, -8, cutBack, layer, mat, sedimentGroup, layer === 6)
    surface(-15, cutLeft, cutBack, 8, layer, mat, sedimentGroup, layer === 6)
    surface(cutRight, 15, cutBack, 8, layer, mat, sedimentGroup, layer === 6)
    surface(cutLeft, cutRight, cutBack, 8, layer, mat, fillGroup, layer === 6)
  }

  // Small clasts settle into the same continuous seabed, away from the open window.
  const pebble = material('#7f867b', .98, 0)
  for (let i = 0; i < 100; i++) {
    const x = random() * 29 - 14.5, z = random() * 15 - 7.5
    if (x > cutLeft - .15 && x < cutRight + .15 && z > cutBack - .15) continue
    const size = .025 + random() * .085
    const geo = new THREE.IcosahedronGeometry(size, 0); geo.scale(1.6, .38, 1)
    b.add(geo, pebble, [x, terrain(x, z) + size * .15, z])
  }

  // Subsea tree, protective frame, valve wheels and flanged piping.
  const wellY = terrain(-4, 0)
  b.box([1.45, .13, 1.35], [-4, wellY + .16, 0], darkSteel)
  for (const x of [-4.6, -3.4]) for (const z of [-.52, .52]) {
    b.tube([x, terrain(x, z) - .06, z], [x, wellY + .2, z], .075, darkSteel)
  }
  b.cylinder(.27, .85, [-4, wellY + .56, 0], yellow, 20)
  b.cylinder(.38, .12, [-4, wellY + .18, 0], steel, 20)
  b.cylinder(.32, .12, [-4, wellY + .91, 0], steel, 20)
  b.tube([-4, wellY + .65, 0], [-3.35, wellY + .65, 0], .12, yellow)
  b.tube([-4, wellY + .4, 0], [-4, wellY + .4, .6], .12, yellow)
  for (const x of [-4.6, -3.4]) for (const z of [-.52, .52]) b.tube([x, wellY + .2, z], [x, wellY + 1.1, z], .045, yellow)
  for (const z of [-.52, .52]) b.tube([-4.6, wellY + 1.1, z], [-3.4, wellY + 1.1, z], .045, yellow)
  for (const x of [-4.6, -3.4]) b.tube([x, wellY + 1.1, -.52], [x, wellY + 1.1, .52], .045, yellow)
  const wheel = new THREE.TorusGeometry(.16, .025, 6, 16)
  b.add(wheel, red, [-4, wellY + .4, .74])
  b.tube([-4.16, wellY + .4, .74], [-3.84, wellY + .4, .74], .02, red)
  b.tube([-4, wellY + .24, .74], [-4, wellY + .56, .74], .02, red)

  // Exposed steel casing terminates inside the hydrate-bearing sediment, not ice.
  const downhole = new THREE.Group(); downhole.name = 'Cutaway downhole completion'; group.add(downhole)
  const db = new Batch(downhole)
  db.tube([-4, wellY + .15, 0], [-4, -15.07, 0], .18, darkSteel, 20)
  db.tube([-4, wellY + .15, .146], [-4, -14.94, .146], .082, pipeMat, 16)
  for (let y = -14.88; y < -14.15; y += .12) {
    db.cylinder(.195, .035, [-4, y, 0], steel, 16)
    db.box([.11, .04, .02], [-4, y, .187], black)
  }
  db.cylinder(.24, .13, [-4, -15.07, 0], steel, 16)
  db.flush()

  // Formation pressure halo is local and submerged in the cut surface.
  const pressureMaterial = new THREE.MeshBasicMaterial({ color: '#eac979', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  materials.add(pressureMaterial)
  const pressureHalo = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), pressureMaterial)
  pressureHalo.position.set(-4, -14.6, .03); pressureHalo.scale.set(1.05, .48, .65); pressureHalo.visible = false; downhole.add(pressureHalo)
  const pressureRingMat = new THREE.MeshBasicMaterial({ color: '#f4d98a', transparent: true, opacity: 0, depthWrite: false })
  materials.add(pressureRingMat)
  const pressureRings: THREE.Mesh[] = []
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.38, .014, 5, 48), pressureRingMat)
    ring.position.set(-4, -14.6, .57); ring.scale.y = .58; downhole.add(ring); pressureRings.push(ring)
  }
  // Pale small lenses embedded in the thin layer: not exposed blue ice boulders.
  const hydrateLens = material('#c0c6bd', .97, 0)
  for (let i = 0; i < 44; i++) {
    const x = -14.5 + random() * 29
    if (x > cutLeft && x < cutRight) continue
    const z = 8.008, y = -14.45 - random() * .49 + .07 * Math.sin(x * .38)
    const geo = new THREE.SphereGeometry(1, 8, 5); geo.scale(.045 + random() * .11, .009 + random() * .014, .012)
    b.add(geo, hydrateLens, [x, y, z])
  }

  // Seabed monitoring station: tripod, pressure probe, sampler and data cable.
  const monitorPos: V3 = [5.1, terrain(5.1, 1.3), 1.3]
  for (const [dx, dz] of [[-.5, -.35], [.5, -.35], [0, .55]] as const) {
    const x = monitorPos[0] + dx, z = monitorPos[2] + dz
    const sample = .01
    const slopeX = (terrain(x + sample, z) - terrain(x - sample, z)) / (sample * 2)
    const slopeZ = (terrain(x, z + sample) - terrain(x, z - sample)) / (sample * 2)
    const normal = new THREE.Vector3(-slopeX, 1, -slopeZ).normalize()
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
    const seat = new THREE.Vector3(x, terrain(x, z), z)
    // Fit the whole 0.23-square sole, not only its centre, to the local slope.
    // A shallow 0.003 seating allowance also covers the tessellated seabed surface.
    let greatestGap = 0
    for (let ix = 0; ix <= 8; ix++) for (let iz = 0; iz <= 8; iz++) {
      const point = new THREE.Vector3(-.115 + ix * .23 / 8, 0, -.115 + iz * .23 / 8).applyQuaternion(rotation).add(seat)
      greatestGap = Math.max(greatestGap, point.y - terrain(point.x, point.z))
    }
    seat.y -= greatestGap + .003
    const padCentre = seat.clone().addScaledVector(normal, .02)
    const legSeat = seat.clone().addScaledVector(normal, .03)
    b.box([.23, .04, .23], padCentre.toArray() as V3, darkSteel, rotation)
    // The leg enters the top of its own tilted pad by 0.01: no detached endpoint.
    b.tube(legSeat.toArray() as V3, [monitorPos[0], monitorPos[1] + 1, monitorPos[2]], .04, yellow)
  }
  b.cylinder(.22, .55, [5.1, monitorPos[1] + .66, 1.3], white)
  b.cylinder(.23, .1, [5.1, monitorPos[1] + .98, 1.3], yellow)
  b.tube([5.1, monitorPos[1] + .9, 1.3], [5.1, monitorPos[1] + 1.5, 1.3], .025, steel)
  b.sphere(.055, [5.1, monitorPos[1] + 1.5, 1.3], green)
  // The separate probe seats at its own location; its bottom clears no part of
  // the small circular footprint, and its cable follows the adjusted probe head.
  const probeX = 5.75, probeZ = 1.35, probeRadius = .065, probeHeight = .6
  const probeNormal = new THREE.Vector3(
    -(terrain(probeX + .01, probeZ) - terrain(probeX - .01, probeZ)) / .02,
    1,
    -(terrain(probeX, probeZ + .01) - terrain(probeX, probeZ - .01)) / .02,
  ).normalize()
  const probeRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), probeNormal)
  const probeSeat = new THREE.Vector3(probeX, terrain(probeX, probeZ), probeZ)
  let probeGreatestGap = 0
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2
    const point = new THREE.Vector3(Math.cos(angle) * probeRadius, 0, Math.sin(angle) * probeRadius).applyQuaternion(probeRotation).add(probeSeat)
    probeGreatestGap = Math.max(probeGreatestGap, point.y - terrain(point.x, point.z))
  }
  probeSeat.y -= probeGreatestGap + .003
  const probeCentre = probeSeat.clone().addScaledVector(probeNormal, probeHeight / 2)
  const probeHead = probeSeat.clone().addScaledVector(probeNormal, probeHeight)
  // The short probe lead plugs into the instrument housing and the probe head.
  const probeLead = new THREE.CatmullRomCurve3([
    new THREE.Vector3(5.30, monitorPos[1] + .52, 1.35),
    new THREE.Vector3(5.43, monitorPos[1] + .61, 1.35),
    new THREE.Vector3(5.64, monitorPos[1] + .61, 1.35),
    probeHead,
  ])
  b.add(new THREE.TubeGeometry(probeLead, 18, .014, 8, false), cableMat)
  b.add(new THREE.CylinderGeometry(probeRadius, probeRadius, probeHeight, 20), steel, probeCentre.toArray() as V3, probeRotation)
  const monitorCableStart = new THREE.Vector3(4.75, monitorPos[1] + .54, 1.3)
  const monitorCableEnd = new THREE.Vector3(-3.15, wellY + .17, .3)
  const connectorAxis = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0))
  // Both metal glands overlap their real housings; strain reliefs terminate at the curve endpoints.
  b.tube([4.90, monitorCableStart.y, 1.3], [4.80, monitorCableStart.y, 1.3], .035, steel, 12)
  b.add(new THREE.CylinderGeometry(.045, .045, .018, 12), steel, [4.87, monitorCableStart.y, 1.3], connectorAxis)
  b.tube([4.82, monitorCableStart.y, 1.3], [4.75, monitorCableStart.y, 1.3], .027, cableMat, 12)
  b.tube([-3.31, monitorCableEnd.y, .3], [-3.20, monitorCableEnd.y, .3], .04, steel, 12)
  b.add(new THREE.CylinderGeometry(.048, .048, .018, 12), steel, [-3.28, monitorCableEnd.y, .3], connectorAxis)
  b.tube([-3.22, monitorCableEnd.y, .3], [-3.15, monitorCableEnd.y, .3], .027, cableMat, 12)
  // Interpolate only X/Z. Interpolating four control-point elevations cuts through the
  // undulating seabed even when every control point itself is above it.
  const monitorCablePlan = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.75, 0, 1.3), new THREE.Vector3(4.32, 0, 1.3),
    new THREE.Vector3(2, 0, 2), new THREE.Vector3(-1.5, 0, 1.5),
    new THREE.Vector3(-2.70, 0, .3), new THREE.Vector3(-3.15, 0, .3),
  ])
  const cableRadius = .02, cableCenterClearance = .045
  const startLift = monitorCableStart.y - terrain(monitorCableStart.x, monitorCableStart.z) - cableCenterClearance
  const endLift = monitorCableEnd.y - terrain(monitorCableEnd.x, monitorCableEnd.z) - cableCenterClearance
  const monitorCable = new class extends THREE.Curve<THREE.Vector3> {
    constructor() { super() }
    getPoint(t: number, target = new THREE.Vector3()) {
      monitorCablePlan.getPoint(t, target)
      const startEase = 1 - THREE.MathUtils.smoothstep(t, 0, .18)
      const endEase = THREE.MathUtils.smoothstep(t, .82, 1)
      target.y = terrain(target.x, target.z) + cableCenterClearance + startLift * startEase + endLift * endEase
      return target
    }
  }()
  monitorCable.arcLengthDivisions = 800
  b.add(new THREE.TubeGeometry(monitorCable, 160, cableRadius, 8, false), cableMat)
  b.flush()

  // Work-class ROV: a continuous load frame carries buoyancy, pressure cans,
  // open propulsion ducts and pinned hydraulic arms. Layout informed by WHOI Jason.
  const rov = new THREE.Group(); rov.name = 'Work class ROV'; group.add(rov)
  const rb = new Batch(rov)
  const rovPaint = marinePaint('#b2a167', .79, .14)
  const rovMetal = marinePaint('#8c9691', .59, .65)
  const rovDark = marinePaint('#354445', .65, .55)
  const rovLens = material('#12262b', .11, .36)
  const rvec = (p: V3) => new THREE.Vector3(...p)
  const rarray = (p: THREE.Vector3): V3 => p.toArray() as V3
  const raxis = (axis: V3) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rvec(axis).normalize())
  const rring = (radius: number, width: number, p: V3, axis: V3, mat: THREE.Material) => {
    rb.add(new THREE.TorusGeometry(radius, width, 6, 32), mat, p,
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), rvec(axis).normalize()))
  }
  const rcan = (radius: number, length: number, p: V3, axis: V3, mat: THREE.Material, segments = 24) => {
    rb.add(new THREE.CylinderGeometry(radius, radius, length, segments), mat, p, raxis(axis))
  }
  // Indexed rounded housings can share the same material batch as cylinders and tubes.
  function rbox(size: V3, p: V3, bevel: number, mat: THREE.Material, rotation?: THREE.Quaternion) {
    const geometry = new THREE.BoxGeometry(...size, 4, 4, 4)
    const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal')
    const core = rvec(size).multiplyScalar(.5).addScalar(-bevel)
    const vertex = new THREE.Vector3(), nearest = new THREE.Vector3(), normal = new THREE.Vector3()
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i)
      nearest.set(THREE.MathUtils.clamp(vertex.x, -core.x, core.x), THREE.MathUtils.clamp(vertex.y, -core.y, core.y), THREE.MathUtils.clamp(vertex.z, -core.z, core.z))
      normal.copy(vertex).sub(nearest).normalize(); vertex.copy(nearest).addScaledVector(normal, bevel)
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z); normals.setXYZ(i, normal.x, normal.y, normal.z)
    }
    rb.add(geometry, mat, p, rotation)
  }
  const rhose = (points: V3[], radius = .012) => {
    rb.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(rvec)), 24, radius, 6, false), cableMat)
  }
  const rbeam = (a: V3, c: V3, width: number, depth: number, mat: THREE.Material) => {
    const start = rvec(a), end = rvec(c), axis = end.clone().sub(start)
    rbox([width, axis.length(), depth], rarray(start.add(end).multiplyScalar(.5)), Math.min(width, depth) * .16, mat, raxis(rarray(axis)))
  }
  const rbolts = (center: V3, radius: number, axis: V3, count = 8, size = .007) => {
    const orientation = raxis(axis), origin = rvec(center)
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count
      const pos = new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyQuaternion(orientation).add(origin)
      rcan(size, .009, rarray(pos), axis, steel, 6)
    }
  }
  // Slim rectangular members meet the same eight corners; skids attach to all lower posts.
  for (const x of [-.57, .57]) for (const z of [-.47, .47]) {
    rbeam([x, -.39, z], [x, .265, z], .045, .045, rovMetal)
    rbox([.072, .12, .065], [x, -.31, z], .008, rovDark)
    rcan(.012, .074, [x, -.30, z], [0, 0, 1], steel, 6)
  }
  for (const y of [-.35, .265]) {
    for (const z of [-.47, .47]) rbeam([-.57, y, z], [.57, y, z], .05, .05, rovMetal)
    for (const x of [-.57, .57]) rbeam([x, y, -.47], [x, y, .47], .05, .05, rovMetal)
  }
  for (const x of [-.57, .57]) {
    const skid = new THREE.CatmullRomCurve3([rvec([x, -.31, -.69]), rvec([x, -.42, -.61]), rvec([x, -.45, -.38]), rvec([x, -.45, .42]), rvec([x, -.41, .65]), rvec([x, -.32, .71])])
    rb.add(new THREE.TubeGeometry(skid, 30, .037, 8, false), rovDark)
    rb.tube([x, -.35, -.47], [x, -.45, -.47], .029, rovMetal)
    rb.tube([x, -.35, .47], [x, -.45, .47], .029, rovMetal)
    rb.tube([x, -.33, -.44], [x, .23, -.13], .019, rovMetal)
    rb.tube([x, -.33, .44], [x, .23, .13], .019, rovMetal)
    // Two separate syntactic-foam buoyancy blocks leave a real central service channel.
    rbox([.38, .22, 1.08], [x * .72, .375, 0], .055, rovPaint)
    for (const z of [-.31, .31]) {
      rbox([.395, .016, .042], [x * .72, .491, z], .004, rovDark)
      rb.box([.02, .20, .042], [x * .72 - .185, .391, z], rovDark)
      rb.box([.02, .20, .042], [x * .72 + .185, .391, z], rovDark)
      rcan(.009, .012, [x * .72, .506, z], [0, 1, 0], steel, 6)
    }
  }
  // Bottom equipment tray, cross bearers and a through-frame tether termination.
  rbox([.91, .035, .77], [0, -.315, -.035], .008, rovDark)
  for (const z of [-.24, .25]) rbeam([-.57, -.265, z], [.57, -.265, z], .045, .045, rovMetal)
  rbeam([-.57, .265, 0], [.57, .265, 0], .04, .04, rovMetal)
  rcan(.062, .12, [0, .338, 0], [0, 1, 0], rovDark)
  rcan(.041, .075, [0, .431, 0], [0, 1, 0], steel)
  rcan(.025, .075, [0, .479, 0], [0, 1, 0], cableMat)
  for (let i = 0; i < 4; i++) rring(.028 - i * .002, .004, [0, .449 + i * .015, 0], [0, 1, 0], rovDark)
  // Electronics pressure vessels have bolted end flanges and actual cradle supports.
  for (const x of [-.225, .225]) {
    rcan(.132, .55, [x, -.062, -.035], [0, 0, 1], rovMetal, 32)
    for (const z of [-.315, .245]) {
      rcan(.146, .025, [x, -.062, z], [0, 0, 1], steel, 32)
      rcan(.125, .033, [x, -.062, z], [0, 0, 1], rovDark, 32)
      rbolts([x, -.062, z + (z > 0 ? .018 : -.018)], .134, [0, 0, 1])
    }
    for (const z of [-.21, .17]) {
      rbox([.24, .065, .065], [x, -.232, z], .012, rovMetal)
      rring(.135, .011, [x, -.062, z], [0, 0, 1], rovDark)
    }
    rcan(.027, .07, [x, -.06, -.369], [0, 0, 1], steel, 12)
    rhose([[x, -.06, -.403], [x, -.13, -.43], [x * 1.8, -.17, -.37], [x * 1.8, -.20, .16], [x * 1.65, -.24, .41]], .013)
  }
  function rthruster(center: V3, axis: V3, radius: number, length: number) {
    const q = raxis(axis), origin = rvec(center)
    const local = (x: number, y: number, z: number): V3 => rarray(new THREE.Vector3(x, y, z).applyQuaternion(q).add(origin))
    const profile = [[radius - .019, -length / 2], [radius, -length / 2], [radius + .006, -length * .32], [radius + .006, length * .32], [radius, length / 2], [radius - .019, length / 2], [radius - .023, 0], [radius - .019, -length / 2]]
    rb.add(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r!, y!)), 32), rovDark, center, q)
    for (const side of [-1, 1]) rring(radius - .003, .008, local(0, side * length / 2, 0), axis, rovMetal)
    rcan(radius * .27, length * .68, center, axis, rovMetal)
    // Thin stator struts attach hub to duct at the rear, leaving an open water path.
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3
      rb.tube(local(0, -.065, 0), local(Math.cos(angle) * (radius - .015), -.065, Math.sin(angle) * (radius - .015)), .006, rovMetal, 6)
    }
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5
      const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      const pitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), .33)
      rbox([radius * .29, .012, radius * .67], local(Math.sin(angle) * radius * .58, .013, Math.cos(angle) * radius * .58), .004, rovMetal, q.clone().multiply(turn).multiply(pitch))
    }
    rbolts(local(0, length / 2 + .006, 0), radius - .009, axis, 6, .005)
  }
  // Four horizontal vectored thrusters are bolted to rails, plus two unobstructed vertical ducts.
  for (const side of [-1, 1]) for (const fore of [-1, 1]) {
    const center: V3 = [side * .635, -.025, fore * .29]
    const axis: V3 = [side * .64, 0, fore * .77]
    rthruster(center, axis, .142, .19)
    rbeam([side * .57, -.25, fore * .38], [side * .635, -.147, fore * .29], .038, .04, rovMetal)
    rbeam([side * .57, .22, fore * .38], [side * .635, .097, fore * .29], .038, .04, rovMetal)
    rcan(.025, .041, [side * .635, .128, fore * .29], [0, 1, 0], steel)
    rhose([[side * .635, .147, fore * .29], [side * .54, .19, fore * .25], [side * .37, .14, fore * .24], [side * .225, .07, fore * .21]], .009)
  }
  for (const z of [-.32, .32]) {
    rthruster([0, .25, z], [0, 1, 0], .128, .16)
    for (const x of [-.57, .57]) rbeam([x, .265, z], [x > 0 ? .12 : -.12, .25, z], .033, .035, rovMetal)
    rhose([[.10, .19, z], [.17, .15, z], [.22, .08, z > 0 ? .21 : -.21]], .009)
  }
  // A pan/tilt camera pressure can is fixed to a front cross member, with a recessed dark lens.
  rbeam([-.57, .04, .47], [.57, .04, .47], .041, .041, rovMetal)
  rcan(.052, .075, [0, .058, .47], [0, 1, 0], rovDark)
  rcan(.085, .18, [0, .102, .51], [0, 0, 1], rovMetal)
  rcan(.092, .022, [0, .102, .598], [0, 0, 1], rovDark)
  rcan(.069, .012, [0, .102, .613], [0, 0, 1], rovLens)
  rring(.077, .007, [0, .102, .621], [0, 0, 1], steel)
  rbolts([0, .102, .614], .084, [0, 0, 1], 8, .005)
  rhose([[0, .10, .418], [.08, .075, .36], [.22, -.02, .268]], .011)
  for (const x of [-.43, .43]) {
    rb.tube([x, .265, .44], [x, .25, .51], .021, rovMetal)
    rcan(.066, .14, [x, .25, .51], [0, 0, 1], rovDark)
    rring(.063, .008, [x, .25, .583], [0, 0, 1], steel)
    rcan(.052, .009, [x, .25, .585], [0, 0, 1], glowMat)
    rhose([[x, .25, .439], [x * .8, .18, .38], [x * .52, .07, .24]], .009)
  }
  // Pin axes, hydraulic pistons and routed hoses all terminate on physical arm joints.
  const rjoint = (p: V3, radius: number) => {
    rcan(radius, .085, p, [1, 0, 0], rovDark)
    for (const side of [-1, 1]) {
      const end: V3 = [p[0] + side * .047, p[1], p[2]]
      rcan(radius * 1.02, .014, end, [1, 0, 0], rovMetal)
      rcan(radius * .34, .024, end, [1, 0, 0], steel, 6)
    }
  }
  const rpiston = (a: V3, c: V3) => {
    const mid = rvec(a).lerp(rvec(c), .64)
    rb.tube(a, rarray(mid), .022, rovDark, 12)
    rb.tube(rarray(mid), c, .010, steel, 10)
    rjoint(a, .023); rjoint(c, .023)
  }
  for (const side of [-1, 1]) {
    const base: V3 = [side * .37, -.235, .43]
    const shoulder: V3 = [side * .40, -.20, .54]
    const elbow: V3 = side < 0 ? [-.59, -.36, .83] : [.58, -.18, .81]
    const wrist: V3 = side < 0 ? [-.42, -.28, 1.08] : [.47, -.38, 1.055]
    rbox([.18, .035, .18], [side * .37, -.314, .43], .006, rovMetal)
    rcan(.068, .135, base, [0, 1, 0], rovMetal)
    rbeam(base, shoulder, .075, .064, rovMetal)
    rjoint(shoulder, .061); rjoint(elbow, .052); rjoint(wrist, .041)
    rbeam(shoulder, elbow, .058, .063, rovPaint)
    rbeam(elbow, wrist, .052, .055, rovMetal)
    const upperCylinder: V3 = [shoulder[0], shoulder[1] - .075, shoulder[2] + .015]
    const upperRod: V3 = [elbow[0], elbow[1] - .045, elbow[2] - .035]
    rb.tube(shoulder, upperCylinder, .017, rovMetal)
    rb.tube(elbow, upperRod, .017, rovMetal); rpiston(upperCylinder, upperRod)
    const foreCylinder: V3 = [elbow[0], elbow[1] + .045, elbow[2] + .02]
    const foreRod: V3 = [wrist[0], wrist[1] + .045, wrist[2] - .03]
    rb.tube(elbow, foreCylinder, .016, rovMetal); rb.tube(wrist, foreRod, .016, rovMetal); rpiston(foreCylinder, foreRod)
    rhose([[side * .37, -.22, .18], base, [shoulder[0] + side * .055, shoulder[1] + .02, shoulder[2]], [elbow[0] + side * .055, elbow[1] + .04, elbow[2] - .03], [wrist[0] + side * .035, wrist[1] + .02, wrist[2]]], .009)
    const tool: V3 = [wrist[0], wrist[1] -.015, wrist[2] + .095]
    rbeam(wrist, tool, .052, .052, rovDark)
    rcan(.035, .07, tool, [0, 0, 1], steel)
    for (const jaw of [-1, 1]) {
      const pivot: V3 = [tool[0] + jaw * .028, tool[1], tool[2] + .028]
      const knuckle: V3 = [tool[0] + jaw * .058, tool[1] - .025, tool[2] + .085]
      const tip: V3 = [tool[0] + jaw * .021, tool[1] - .035, tool[2] + .139]
      rb.tube(pivot, knuckle, .012, rovMetal, 8); rb.tube(knuckle, tip, .010, rovMetal, 8)
      rcan(.017, .025, pivot, [0, 1, 0], steel)
      rbox([.023, .028, .032], tip, .004, cableMat)
    }
  }
  rb.flush()
  // Resolve the descent from the real solid model, before adding non-physical light cones.
  // Sampling the entire rotated footprint also covers terrain between the skids and arm tips.
  const rovHeading = -.5, rovSiteX = 3.4, rovSiteZ = 3.6
  const rovBodyBounds = new THREE.Box3().setFromObject(rov)
  const rovFootprint = rovBodyBounds.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(rovHeading))
  rovFootprint.translate(new THREE.Vector3(rovSiteX, 0, rovSiteZ))
  const sampleX = Math.ceil((rovFootprint.max.x - rovFootprint.min.x) / .05)
  const sampleZ = Math.ceil((rovFootprint.max.z - rovFootprint.min.z) / .05)
  let rovSeabedCeiling = -Infinity
  for (let ix = 0; ix <= sampleX; ix++) for (let iz = 0; iz <= sampleZ; iz++) {
    const x = THREE.MathUtils.lerp(rovFootprint.min.x, rovFootprint.max.x, ix / sampleX)
    const z = THREE.MathUtils.lerp(rovFootprint.min.z, rovFootprint.max.z, iz / sampleZ)
    rovSeabedCeiling = Math.max(rovSeabedCeiling, terrain(x, z))
  }
  // Five centimetres below the nominal surface; 14 cm above the sampled seabed leaves
  // a 2 cm reserve for interpolation between samples while guaranteeing the 12 cm gap.
  const rovSurfaceY = -rovBodyBounds.max.y - .05
  const rovHoverY = rovSeabedCeiling + .14 - rovBodyBounds.min.y
  const rovBeamMat = new THREE.MeshBasicMaterial({ color: '#cae8c9', transparent: true, opacity: .065, depthWrite: false, side: THREE.DoubleSide })
  materials.add(rovBeamMat)
  for (const x of [-.43, .43]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.7, 2.8, 24, 1, true), rovBeamMat)
    cone.rotation.x = -Math.PI / 2; cone.position.set(x, .25, 1.98); rov.add(cone)
  }
  const umbilicalGeometry = new THREE.BufferGeometry()
  const cablePositions = new Float32Array(49 * 3)
  umbilicalGeometry.setAttribute('position', new THREE.BufferAttribute(cablePositions, 3))
  const rovUmbilicalMaterial = new THREE.LineBasicMaterial({ color: '#838b58' }); materials.add(rovUmbilicalMaterial)
  const umbilical = new THREE.Line(umbilicalGeometry, rovUmbilicalMaterial); umbilical.frustumCulled = false; group.add(umbilical)

  // Surface tracers indicate transport through the sealed well; they are not gas escaping into the sea.
  const gas = new THREE.InstancedMesh(new THREE.SphereGeometry(.052, 8, 6), gasMat, 28)
  gas.instanceMatrix.setUsage(THREE.DynamicDrawUsage); gas.frustumCulled = false; group.add(gas)
  gas.visible = false
  const tracerMatrix = new THREE.Matrix4(), tracerPosition = new THREE.Vector3(), tracerQuaternion = new THREE.Quaternion()
  const anchors: Record<FeatureId, THREE.Vector3> = {
    platform: new THREE.Vector3(-5, 3.6, 2.6),
    riser: new THREE.Vector3(-4, -4.5, .2),
    wellhead: new THREE.Vector3(-4, wellY + .9, .5),
    hydrate: new THREE.Vector3(-9, -14.55, 8.05),
    sediment: new THREE.Vector3(10, -11.9, 8.04),
    rov: new THREE.Vector3(3.4, -5.9, 3.6),
    monitor: new THREE.Vector3(5.1, monitorPos[1] + 1.1, 1.3),
  }
  let sectionVisible = true
  let lastProgress = -1
  let lastDepth = -1
  function update(elapsed: number, progress: number, extracting: boolean, depth: number) {
    const t = THREE.MathUtils.clamp(progress, 0, 1)
    const d = THREE.MathUtils.clamp(depth, 0, 1600)
    rov.position.set(rovSiteX, THREE.MathUtils.lerp(rovSurfaceY, rovHoverY, d / 1600), rovSiteZ)
    // Depth changes continuously in the diagram; the sensor depth remains unmodified.
    rov.rotation.y = rovHeading
    anchors.rov.copy(rov.position).add(new THREE.Vector3(0, .5, 0))
    if (lastDepth !== d) {
      const start = new THREE.Vector3(.4, 2.25, 2.6), end = rov.position.clone().add(new THREE.Vector3(0, .5, 0))
      const curve = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(2.2, Math.min(-1, end.y * .55), 3.4), end)
      for (let i = 0; i <= 48; i++) curve.getPoint(i / 48).toArray(cablePositions, i * 3)
      umbilicalGeometry.attributes.position!.needsUpdate = true; lastDepth = d
    }
    // Progress is the sole time source for extraction, so pause and 0 are exact.
    const pressure = THREE.MathUtils.smoothstep(t, .14, .4)
    pressureHalo.visible = extracting && sectionVisible && pressure > 0
    pressureMaterial.opacity = pressure * .10
    const haloScale = .7 + pressure * .45
    pressureHalo.scale.set(haloScale, .48, haloScale * .65)
    pressureRingMat.opacity = pressure * .32
    for (let i = 0; i < pressureRings.length; i++) {
      const r = pressureRings[i]!, scale = 1 + ((t * 6 + i / 3) % 1) * 1.9
      r.visible = extracting && sectionVisible && pressure > 0; r.scale.set(scale, scale * .58, 1)
    }
    const transport = THREE.MathUtils.smoothstep(t, .34, .63)
    gas.visible = extracting && t > .34
    if (lastProgress !== t) {
      for (let i = 0; i < 28; i++) {
        const fraction = (t * 3.8 + i / 28) % 1
        const y = -14.65 + fraction * 17
        const isBuried = y < wellY
        const visible = transport > 0 && (!isBuried || sectionVisible) && fraction < Math.min(1, (t - .34) * 4)
        tracerPosition.set(-4 + Math.sin(i * 1.9) * .035, y, isBuried ? .245 : .145)
        tracerMatrix.compose(tracerPosition, tracerQuaternion, new THREE.Vector3(visible ? .72 : 0, visible ? 1.7 : 0, visible ? .72 : 0))
        gas.setMatrixAt(i, tracerMatrix)
      }
      gas.instanceMatrix.needsUpdate = true; lastProgress = t
    }
    // Beam opacity gently falls at the surface; illumination remains legible at depth.
    rovBeamMat.opacity = .018 + d / 1600 * .052
    void elapsed
  }
  function setSection(enabled: boolean) {
    sectionVisible = enabled; fillGroup.visible = !enabled; cutGroup.visible = enabled; downhole.visible = enabled
    lastProgress = -1
  }
  update(0, 0, false, 950)
  return {
    group, anchors, update, setSection,
    setWaterVisible: (visible: boolean) => { rovBeamMat.opacity = visible ? .05 : .025 },
    dispose: () => {
      const geometries = new Set<THREE.BufferGeometry>()
      group.traverse(object => {
        const renderable = object as THREE.Mesh
        if (renderable.geometry) geometries.add(renderable.geometry)
      })
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(m => m.dispose()); textures.forEach(texture => texture.dispose())
      group.clear()
    },
  }
}
