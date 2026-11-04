import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createMaterialTexture } from './material-textures'

export interface MineralHouseModel {
  root: THREE.Group
  setCutaway(enabled: boolean): void
  highlight(id: number | null): void
  dispose(): void
}
type V3 = [number, number, number]
type Bucket = { group: THREE.Group; geometries: Map<THREE.MeshStandardMaterial, THREE.BufferGeometry[]>; feature?: number }

/** Figure 3-25 reconstructed as a habitable, metre-scale teaching model.
 * Surface layers overlap their supporting carcasses by a few millimetres.
 * Decorative details are merged per material, rather than rendered separately.
 */
export function createMineralHouseModel(): MineralHouseModel {
  const root = new THREE.Group()
  let disposed = false
  root.name = 'Mineral resources in our home — textbook figure 3-25'
  const buckets: Bucket[] = []
  const materials: THREE.MeshStandardMaterial[] = []
  const textures: THREE.Texture[] = []
  const closed: THREE.Group[] = []
  const opened: THREE.Group[] = []
  const features = new Map<number, THREE.MeshStandardMaterial[]>()
  const mat = (color: string, roughness = .7, metalness = 0) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materials.push(value)
    return value
  }
  const m = {
    plaster: mat('#e9e6df', .88), paint: mat('#d8d9cf', .86), white: mat('#f5f2e9', .54),
    concrete: mat('#b5b6af', .93), aggregate: mat('#90958f', .92), base: mat('#d4d5d0', .9),
    wood: mat('#cbbca6', .62), woodLight: mat('#e0d1b8', .65), woodDark: mat('#947756', .7),
    parquetA: mat('#ddd2be', .58), parquetB: mat('#e3dacb', .6), parquetC: mat('#d2c4b0', .58),
    tile: mat('#b9d3d0', .24), tileWhite: mat('#dae4dc', .3), grout: mat('#9eaaa3', .84),
    stone: mat('#ddd7c9', .46), stoneDark: mat('#514e46', .43), ceramic: mat('#f0f1e9', .22),
    red: mat('#902e26', .42), wine: mat('#713027', .44), black: mat('#242b2c', .45),
    steel: mat('#9faeaf', .28, .72), chrome: mat('#cad7d9', .15, .82), iron: mat('#586268', .48, .8),
    roof: mat('#4a5051', .79), roofLight: mat('#555c5f', .75), roofDark: mat('#383f42', .85),
    glass: mat('#9abec6', .12, .16), glassDark: mat('#243944', .19, .3),
    rubber: mat('#1b2021', .86), body: mat('#b82024', .22, .36), carTrim: mat('#651316', .3, .25),
    lamp: mat('#d8e5e1', .2, .15), brake: mat('#c5462a', .23), seat: mat('#bd8c38', .93),
    cushion: mat('#d4a74f', .96), pillow: mat('#e2b963', .97), seam: mat('#bcaa89', 1), rug: mat('#859a91', 1),
    rugEdge: mat('#b4b8a6', 1), page: mat('#e3d8ba', .91), book: mat('#4f6771', .83),
    foliage: mat('#3d6251', .93), soil: mat('#514337', 1), brass: mat('#b8a071', .35, .6),
    battery: mat('#344b4b', .43, .36), gypsum: mat('#f2ede1', .97), paper: mat('#bdb4a0', .9),
  }
  const surface = (keys: (keyof typeof m)[], kind: 'wood' | 'paint' | 'tile' | 'concrete', bump: number) => {
    const texture = createMaterialTexture(kind)
    texture.repeat.set(kind === 'wood' ? 1.2 : 2, kind === 'wood' ? 3.1 : 2)
    textures.push(texture)
    for (const key of keys) { m[key].map = texture; m[key].bumpMap = texture; m[key].bumpScale = bump }
  }
  surface(['wood', 'woodLight', 'woodDark', 'parquetA', 'parquetB', 'parquetC'], 'wood', .009)
  surface(['plaster', 'paint', 'white', 'gypsum'], 'paint', .004)
  surface(['concrete', 'aggregate', 'base'], 'concrete', .014)
  surface(['roof', 'roofLight', 'roofDark', 'stone'], 'tile', .006)
  // Photographic oak is optional: procedural grain remains until the image is
  // decoded. Feature materials clone this flag, so async completion updates both.
  for (const key of ['wood', 'woodLight', 'woodDark', 'parquetA', 'parquetB', 'parquetC'] as const) m[key].userData.photoOak = true
  if (typeof window !== 'undefined') {
    const oak = new THREE.TextureLoader().load('/geo-resources-folder/images/mineral-resources-house/oak-albedo.png', texture => {
      if (disposed) { texture.dispose(); return }
      for (const material of materials) if (material.userData.photoOak) {
        material.map = texture; material.needsUpdate = true
      }
      root.userData.onTextureReady?.()
    }, undefined, () => { /* Existing procedural surface remains usable offline. */ })
    oak.colorSpace = THREE.SRGBColorSpace
    oak.wrapS = oak.wrapT = THREE.RepeatWrapping
    oak.repeat.set(.6, 2)
    oak.anisotropy = 8
    textures.push(oak)
  }
  const bucket = (name: string, feature?: number, visibility?: 'closed' | 'opened'): Bucket => {
    const group = new THREE.Group(); group.name = name
    if (feature) group.userData.featureId = feature
    root.add(group)
    if (visibility === 'closed') closed.push(group)
    if (visibility === 'opened') opened.push(group)
    const b = { group, geometries: new Map<THREE.MeshStandardMaterial, THREE.BufferGeometry[]>(), feature }
    buckets.push(b); return b
  }
  const add = (b: Bucket, geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, p: V3, rotation?: V3) => {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry
    if (geo !== geometry) geometry.dispose()
    if (rotation) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation)))
    geo.translate(...p)
    if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2))
    const list = b.geometries.get(material) ?? []
    list.push(geo); b.geometries.set(material, list)
  }
  const box = (b: Bucket, material: THREE.MeshStandardMaterial, p: V3, s: V3, rotation?: V3) => add(b, new THREE.BoxGeometry(...s), material, p, rotation)
  const rounded = (b: Bucket, material: THREE.MeshStandardMaterial, p: V3, s: V3, radius = .06, rotation?: V3) => add(b, new RoundedBoxGeometry(...s, 3, Math.min(radius, Math.min(...s) * .45)), material, p, rotation)
  const cylinder = (b: Bucket, material: THREE.MeshStandardMaterial, p: V3, r: number, h: number, rotation?: V3, rt = r, segments = 20) => add(b, new THREE.CylinderGeometry(rt, r, h, segments), material, p, rotation)
  const sphere = (b: Bucket, material: THREE.MeshStandardMaterial, p: V3, s: V3) => {
    const g = new THREE.SphereGeometry(1, 16, 12); g.scale(...s); add(b, g, material, p)
  }
  const pipe = (b: Bucket, material: THREE.MeshStandardMaterial, a: V3, end: V3, r: number) => {
    const start = new THREE.Vector3(...a), stop = new THREE.Vector3(...end), direction = stop.clone().sub(start)
    const geo = new THREE.CylinderGeometry(r, r, direction.length(), 12)
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    add(b, geo, material, start.add(stop).multiplyScalar(.5).toArray() as V3)
  }
  const curve = (b: Bucket, material: THREE.MeshStandardMaterial, points: V3[], r: number) => {
    add(b, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 28, r, 8, false), material, [0, 0, 0])
  }
  const fixed = bucket('5 · Concrete foundations and projecting entrance', 5)
  const floors = bucket('Oak passage, dark kitchen floor and pale living room')
  const walls = bucket('Local walls and room boundaries')
  const paintedPartition = bucket('3 · Painted wall facing the washing machine', 3)
  const facade = bucket('Closed exterior panels', undefined, 'closed')
  const roof = bucket('Broad retained pitched roof wings', undefined, 'opened')
  const roofFill = bucket('Complete roof', undefined, 'closed')
  const trim = bucket('Frames, reveals and skirting')
  const bath = bucket('Tub, toilet and washer outside the bathroom')
  const tiles = bucket('1 · Bathroom ceramic tiles', 1)
  const glass = bucket('2 · Silica glass rear windows', 2)
  const kitchen = bucket('L-shaped kitchen, island and small dark table')
  const dining = bucket('Four ochre chairs behind the television')
  const storage = bucket('Rear utility cubbies and entry shoe shelves')
  const utilityShelf = bucket('Twelve open oak cubbies backed onto the left main wall')
  const shoeShelf = bucket('Entrance shoe shelf backed onto the inner partition')
  const washer = bucket('Washer beside the utility shelf, clear of the bath doorway')
  const cutRoofSupports = bucket('Closed wall tops beneath retained cutaway roof slopes', undefined, 'opened')
  const nails = bucket('4 · Iron nails in timber', 4)
  const gypsum = bucket('6 · Paper-faced gypsum boards and steel wall framing', 6)
  const gypsumCover = bucket('Intact gypsum observation opening in complete exterior', 6, 'closed')
  const lounge = bucket('Facing armchairs and sculptural coffee table')
  const rightSpeaker = bucket('Right television speaker hidden only for gypsum inspection')
  const charger = bucket('Background electric-car charging pedestal')
  const bathPaint = mat('#c1d8da', .86), greyTile = mat('#c7cdca', .7), ochre = mat('#c69445', .64)
  greyTile.userData.stoneTile = true
  const darkOak = mat('#806350', .7), lightStone = mat('#dce0db', .82)
  const honeyWood = mat('#e9c183', .62); honeyWood.userData.photoOak = true; honeyWood.map = m.wood.map; honeyWood.bumpMap = m.wood.bumpMap; honeyWood.bumpScale = .007
  darkOak.userData.photoOak = true; darkOak.map = m.wood.map; darkOak.bumpMap = m.wood.bumpMap; darkOak.bumpScale = .006
  for (const value of [greyTile, lightStone]) { value.map = m.concrete.map; value.bumpMap = m.concrete.bumpMap; value.bumpScale = .004 }
  box(fixed, m.concrete, [0, -.075, 0], [10.18, .45, 12.18])
  box(fixed, m.base, [0, .16, 0], [10.22, .08, 12.22])
  box(fixed, m.concrete, [3.65, -.075, 6.61], [2.9, .45, 1.25])
  box(fixed, lightStone, [3.65, .16, 6.61], [2.91, .08, 1.27])
  box(fixed, m.concrete, [5.16, -.075, -4.08], [.25, .45, 3.45])
  // The reference is a long house with an open central passage, not four equal rooms.
  // Cut boards at the kitchen boundary instead of colouring a whole staggered
  // board from its start point. The back join sits beneath the partition; the
  // side join continues straight from its end along the central passage.
  const kitchenFloorX = -1.1, kitchenFloorZ = -1.2
  for (let i = 0; i < 50; i++) {
    const x = -4.9 + i * .2, offset = (i % 3) * .6
    for (let j = -1; j < 8; j++) {
      const start = Math.max(-6, -6 + offset + j * 1.8), end = Math.min(6, -6 + offset + (j + 1) * 1.8)
      if (end - start < .01) continue
      const shade = (i * 13 + j * 7 + 29) % 7
      const passageMaterial = shade === 0 ? m.parquetB : shade === 1 ? m.parquetC : m.parquetA
      const xs = [x - .099, x + .099], zs = [start + .001, end - .001]
      if (xs[0]! < kitchenFloorX && xs[1]! > kitchenFloorX) xs.splice(1, 0, kitchenFloorX)
      if (zs[0]! < kitchenFloorZ && zs[1]! > kitchenFloorZ) zs.splice(1, 0, kitchenFloorZ)
      for (let a = 0; a < xs.length - 1; a++) for (let b = 0; b < zs.length - 1; b++) {
        const x0 = xs[a]!, x1 = xs[a + 1]!, z0 = zs[b]!, z1 = zs[b + 1]!
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
        const material = cx < kitchenFloorX && cz > kitchenFloorZ ? darkOak : passageMaterial
        const plank = new THREE.BoxGeometry(x1 - x0, .035, z1 - z0)
        const pos = plank.getAttribute('position'), normal = plank.getAttribute('normal'), uv = plank.getAttribute('uv')
        for (let v = 0; v < pos.count; v++) if (normal.getY(v) > .5) uv.setXY(v, (pos.getX(v) + cx) * .72, (pos.getZ(v) + cz) * .34)
        add(floors, plank, material, [cx, .216, cz])
      }
    }
  }
  box(floors, lightStone, [3.08, .249, 3.36], [3.84, .035, 5.28])
  // Meet the living-room slab at x=1.16; overlapping top faces flicker when moving.
  box(floors, lightStone, [-.96, .249, 5.68], [4.24, .035, .58])
  box(floors, lightStone, [3.65, .222, 6.61], [2.88, .035, 1.25])
  box(floors, greyTile, [3.08, .253, -4.15], [3.82, .04, 3.68])
  box(tiles, m.grout, [-.72, .248, -4.72], [3.22, .03, 2.5])
  for (let x = 0; x < 6; x++) for (let z = 0; z < 5; z++) box(tiles, greyTile, [-2.065 + x * .535, .269, -5.72 + z * .5], [.528, .015, .493])
  box(floors, greyTile, [-3.72, .247, -4.48], [2.42, .03, 2.92])
  for (let i = 0; i < 16; i++) box(floors, m.iron, [5.06, .279, -5.62 + i * .2], [.16, .009, .018])
  // Exterior and local interior walls. All sections meet the continuous slab.
  box(walls, m.plaster, [-5, 1.5, 0], [.18, 2.6, 12.12])
  // One shared aperture definition joins piers, sill and lintel to the actual
  // frame edges. Independent rounded dimensions previously left daylight gaps.
  const rearWindows = [{ x: -.7, width: 3.43 }, { x: 3, width: 2.4 }]
  const rearOpeningBottom = 1.1075, rearOpeningTop = 2.3325, rearFrameHalf = .0275
  const rearWallRect = (x0: number, x1: number, y0: number, y1: number) =>
    box(walls, m.plaster, [(x0 + x1) / 2, (y0 + y1) / 2, -6], [x1 - x0, y1 - y0, .18])
  rearWallRect(-5.06, 5.06, .2, rearOpeningBottom)
  rearWallRect(-5.06, 5.06, rearOpeningTop, 2.8)
  let rearPierStart = -5.06
  for (const window of rearWindows) {
    const left = window.x - window.width / 2 - rearFrameHalf
    const right = window.x + window.width / 2 + rearFrameHalf
    rearWallRect(rearPierStart, left, rearOpeningBottom, rearOpeningTop)
    rearPierStart = right
  }
  rearWallRect(rearPierStart, 5.06, rearOpeningBottom, rearOpeningTop)
  const backWindow = (x: number, width: number) => {
    box(glass, m.glass, [x, 1.72, -6.005], [width, 1.1, .02])
    for (const sx of [x - width / 2, x, x + width / 2]) box(trim, m.white, [sx, 1.72, -6.015], [.055, rearOpeningTop - rearOpeningBottom - .13, .23])
    for (const y of [1.14, 2.3]) box(trim, m.white, [x, y, -6.015], [width + .08, .065, .23])
    box(trim, m.white, [x, 1.1, -5.94], [width + .18, .065, .34])
  }
  rearWindows.forEach(window => backWindow(window.x, window.width))
  box(walls, bathPaint, [-.7, (.2 + rearOpeningBottom) / 2, -5.895], [3.37, rearOpeningBottom - .2, .025])
  box(walls, bathPaint, [-.7, (rearOpeningTop + 2.8) / 2, -5.895], [3.37, 2.8 - rearOpeningTop, .025])
  box(walls, bathPaint, [-2.4, 1.5, -4.72], [.18, 2.6, 2.56])
  box(walls, bathPaint, [1.05, .69, -4.74], [.18, .98, 2.52]); box(facade, bathPaint, [1.05, 1.99, -4.74], [.18, 1.62, 2.52])
  box(walls, bathPaint, [-.1, .6, -3.42], [2.3, .8, .18]); box(facade, bathPaint, [-.1, 1.9, -3.42], [2.3, 1.8, .18])
  for (const x of [-2.39, -1.25]) box(trim, m.white, [x, 1.25, -3.42], [.075, 2.1, .23])
  box(trim, m.white, [-1.82, 2.29, -3.42], [1.22, .08, .23])
  box(walls, bathPaint, [3.07, .61, -2.34], [3.96, .82, .18]); box(facade, bathPaint, [3.07, 1.92, -2.34], [3.96, 1.76, .18])
  box(walls, bathPaint, [1.05, 1.5, -5.1], [.18, 2.6, 1.8]); box(walls, bathPaint, [1.05, 1.5, -2.55], [.18, 2.6, .42]); box(walls, bathPaint, [1.05, 2.53, -3.47], [.18, .54, 1.45])
  // Exterior garage opening on +X; the living area is separated by a real wall.
  for (const z of [-5.86, -2.48]) box(trim, m.plaster, [5, 1.5, z], [.18, 2.6, .3])
  box(trim, m.plaster, [5, 2.59, -4.17], [.18, .42, 3.1])
  for (const z of [-5.68, -2.65]) box(trim, m.white, [5.01, 1.35, z], [.25, 2.3, .075])
  box(trim, m.white, [5.01, 2.47, -4.17], [.25, .08, 3.12])
  // The grooves between shutter slats are recessed into a continuous door,
  // never open slots. The backing also closes the join below the top frame.
  box(facade, m.steel, [5.01, 1.355, -4.17], [.04, 2.19, 2.97])
  for (let j = 0; j < 13; j++) box(facade, m.steel, [5.01, .26 + (j + .5) * 2.19 / 13, -4.17], [.055, 2.19 / 13 - .005, 2.97])
  box(walls, m.paint, [-2.48, 1.43, -.475], [.16, 2.46, 1.45]); box(paintedPartition, m.plaster, [-3.05, 1.43, -1.2], [3.9, 2.46, .16])
  // Paint is a thin finish on a solid substrate, not another thick wall panel.
  // Its edge remains visible at the uncoated wall reveal for close observation.
  const paintFinish = mat('#a8b6a8', .87)
  box(paintedPartition, paintFinish, [-3.05, 1.43, -1.2811], [3.86, 2.42, .002])
  box(trim, m.plaster, [5, .59, 1.83], [.18, .78, 8.36]); box(facade, m.plaster, [5, 1.89, 1.83], [.18, 1.82, 8.36])
  // The front wall is continuous up to the entry return; no 4 cm central slit.
  box(trim, m.plaster, [-1.38, .59, 6], [7.26, .78, .18])
  box(facade, m.plaster, [-1.38, 1.89, 6], [7.26, 1.82, .18])
  for (const x of [-4.5, -2.5]) box(glass, m.glass, [x, .93, 6.01], [1.45, .37, .015])
  box(glass, m.glass, [5.01, .96, 4.4], [.015, .45, 1.75])
  for (const z of [3.48, 5.3]) box(trim, m.steel, [5.02, .97, z], [.035, .55, .035])
  pipe(trim, m.steel, [5.02, 1.24, 3.48], [5.02, 1.24, 5.3], .017)
  // A single recessed door leaf sits inside a continuous framed opening.
  // Full-height side piers cannot mask the lower leaf into two offset shapes.
  box(trim, m.plaster, [2.23, .7, 6.6], [.17, 1, 1.35]); box(trim, m.plaster, [3.66, .7, 7.22], [2.98, 1, .17])
  box(facade, m.plaster, [2.23, 1.98, 6.6], [.17, 1.56, 1.35]); box(facade, m.plaster, [3.66, 1.98, 7.22], [2.98, 1.56, .17])
  box(trim, m.plaster, [5.08, 1.49, 6.04], [.17, 2.5, .13]); box(trim, m.plaster, [5.08, 1.49, 7.11], [.17, 2.5, .23])
  for (const z of [6.105, 6.995]) box(trim, m.white, [5.08, 1.31, z], [.23, 2.18, .06])
  box(trim, m.white, [5.08, 2.42, 6.55], [.23, .085, .95])
  box(trim, m.plaster, [5.08, 2.61, 6.55], [.17, .3, .95])
  box(trim, m.stone, [5.08, .245, 6.55], [.34, .04, 1.02])
  rounded(trim, m.black, [5.075, 1.31, 6.55], [.065, 2.08, .79], .008)
  for (const y of [.79, 1.76]) box(trim, m.iron, [5.112, y, 6.55], [.008, .63, .59])
  cylinder(trim, m.chrome, [5.126, 1.25, 6.83], .036, .018, [0, 0, Math.PI / 2])
  pipe(trim, m.chrome, [5.145, 1.25, 6.83], [5.145, 1.25, 6.66], .014)
  box(trim, m.plaster, [3.1, .95, 5.92], [.17, 1.5, 1.5]); box(trim, m.stoneDark, [3.1, 1.715, 5.92], [.23, .06, 1.55])
  box(trim, m.white, [-4.88, .29, 0], [.035, .18, 11.8]); box(trim, m.white, [0, .29, -5.88], [9.8, .18, .035])
  // Large real pitched roof wings, not flat thin strips. Full and cut roofs are
  // mutually exclusive so there are no intersecting or coplanar roof surfaces.
  const roofPanel = (b: Bucket, cx: number, cy: number, cz: number, width: number, depth: number, rx: number, rz: number) => {
    box(b, m.roofDark, [cx, cy, cz], [width, .1, depth], [rx, 0, rz])
    const transform = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz))
    for (let x = -width / 2 + .15, i = 0; x < width / 2 - .04; x += .31, i++)for (let z = -depth / 2 + .16, j = 0; z < depth / 2 - .04; z += .33, j++) {
      const pos = new THREE.Vector3(x, .063, z).applyMatrix4(transform).add(new THREE.Vector3(cx, cy, cz))
      box(b, (i + j * 3) % 7 ? m.roof : m.roofLight, pos.toArray() as V3, [.3, .032, .32], [rx, 0, rz])
    }
  }
  roofPanel(roof, -4.13, 3.63, 0, 2.92, 12.8, 0, -.46); roofPanel(roof, 1.32, 3.86, -4.98, 7.9, 3.04, .46, 0)
  box(roof, m.roofDark, [-5.43, 4.24, 0], [.15, .18, 12.9]); box(roof, m.roofDark, [1.32, 4.56, -6.3], [8.02, .18, .15])
  const roofEnd = (x0: number, x1: number, low: number, high: number, z: number) => {
    const shape = new THREE.Shape(); shape.moveTo(x0, high); shape.lineTo(x1, low); shape.lineTo(x0, low); shape.closePath()
    add(roof, new THREE.ExtrudeGeometry(shape, { depth: .07, bevelEnabled: false }), m.roofDark, [0, 0, z])
  }
  roofEnd(-5.4, -2.9, 2.79, 4.37, 6.32); roofEnd(-5.4, -2.9, 2.79, 4.37, -6.39)
  // The retained slopes face the viewer. The original outer walls therefore
  // need full-height infill up to their undersides, not a horizontal light gap.
  const roofSupport = (x0: number, x1: number, z0: number, z1: number, top: (x: number, z: number) => number) => {
    const corners: [[number, number], [number, number], [number, number], [number, number]] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
    const vertices: number[] = []
    for (const [x, z] of corners) vertices.push(x, 2.775, z)
    for (const [x, z] of corners) vertices.push(x, top(x, z), z)
    const indices = [0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]
    for (let i = 0; i < indices.length; i += 3) { const middle = indices[i + 1]!; indices[i + 1] = indices[i + 2]!; indices[i + 2] = middle }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals()
    add(cutRoofSupports, g, m.plaster, [0, 0, 0])
  }
  const leftRoofUnder = (x: number) => 3.63 - Math.tan(.46) * (x + 4.13) - .03
  const backRoofUnder = (_x: number, z: number) => 3.86 - Math.tan(.46) * (z + 4.98) - .03
  roofSupport(-5.09, -4.91, -6.09, 6.09, x => leftRoofUnder(x))
  roofSupport(-4.91, -2.63, -6.09, -5.91, x => leftRoofUnder(x))
  roofSupport(-2.63, 5.09, -6.09, -5.91, backRoofUnder)
  // Properly closed full appearance: pitched roof, gables, wall-top beams and
  // the attic walls over the projecting entry all meet the underside of roof.
  const fullSlope = Math.atan2(2.43, 5.25), fullWidth = Math.hypot(2.43, 5.25)
  roofPanel(roofFill, -2.625, 4.035, .6, fullWidth, 13.8, 0, fullSlope)
  roofPanel(roofFill, 2.625, 4.035, .6, fullWidth, 13.8, 0, -fullSlope)
  pipe(roofFill, m.roofDark, [0, 5.25, -6.32], [0, 5.25, 7.52], .085)
  for (const x of [-5, 5]) box(facade, m.plaster, [x, 2.855, 0], [.18, .19, 12.16])
  const atticWall = (points: [number, number][], z: number) => {
    const shape = new THREE.Shape(); points.forEach(([x, y], i) => { if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y) }); shape.closePath()
    add(facade, new THREE.ExtrudeGeometry(shape, { depth: .17, bevelEnabled: false }), m.plaster, [0, 0, z])
  }
  atticWall([[-5.08, 2.76], [-5.08, 2.89], [0, 5.2], [5.08, 2.89], [5.08, 2.76]], -6.1)
  atticWall([[-5.08, 2.76], [-5.08, 2.89], [0, 5.2], [5.08, 2.89], [5.08, 2.76]], 5.96)
  atticWall([[2.145, 2.74], [2.145, 4.23], [5.17, 2.83], [5.17, 2.74]], 7.14)
  box(facade, m.plaster, [2.23, 3.47, 6.6], [.17, 1.47, 1.35])
  box(facade, m.plaster, [5.08, 2.81, 6.6], [.17, .16, 1.35])
  // The tub is a hollow ceramic shell, with recessed basin and a connected tap.
  const tubProfile = [[0, 0], [.36, 0], [.43, .03], [.47, .1], [.5, .44], [.5, .49], [.475, .525], [.445, .515], [.43, .48], [.41, .22], [.34, .11], [0, .11]]
  const tubShell = new THREE.LatheGeometry(tubProfile.map(p => new THREE.Vector2(p[0]!, p[1]!)), 64)
  tubShell.scale(1.92, 1, .91); add(bath, tubShell, m.ceramic, [-.45, .28, -5.02]); cylinder(bath, m.chrome, [-.05, .398, -5.02], .034, .006)
  cylinder(bath, m.chrome, [-1.25, .535, -5.44], .035, .52)
  box(bath, m.chrome, [-1.25, .795, -5.44], [.4, .045, .11])
  curve(bath, m.chrome, [[-1.25, .79, -5.44], [-1.25, 1, -5.44], [-1.25, 1.06, -5.27], [-1.25, .98, -5.17]], .022)
  for (const x of [-1.38, -1.1]) cylinder(bath, m.chrome, [x, .83, -5.44], .03, .065)
  rounded(bath, m.ceramic, [-1.78, .54, -4.53], [.48, .54, .65], .14); rounded(bath, m.ceramic, [-1.78, .83, -4.83], [.48, .53, .2], .055); rounded(bath, m.white, [-1.78, .81, -4.45], [.45, .075, .56], .15)
  cylinder(bath, m.chrome, [-1.78, 1.102, -4.83], .025, .01)
  rounded(washer, m.white, [-2.1, .72, -2.93], [.76, .94, .7], .035); box(washer, m.steel, [-2.1, 1.07, -2.572], [.7, .15, .025])
  cylinder(washer, m.chrome, [-2.1, .66, -2.55], .245, .035, [Math.PI / 2, 0, 0]); cylinder(washer, m.glassDark, [-2.1, .66, -2.525], .196, .025, [Math.PI / 2, 0, 0]); cylinder(washer, m.white, [-1.85, 1.07, -2.54], .04, .035, [Math.PI / 2, 0, 0])
  const shelving = (x: number, y: number, z: number, width: number, height: number, depth: number, columns: number, rows: number, target: Bucket = storage) => {
    box(target, m.woodDark, [x, y + height / 2, z - depth / 2], [width, height, .04])
    for (let j = 0; j <= rows; j++)box(target, honeyWood, [x, y + height * j / rows, z], [width, .045, depth])
    for (let i = 0; i <= columns; i++)box(target, honeyWood, [x - width / 2 + width * i / columns, y + height / 2, z], [.045, height, depth])
  }
  shelving(-3.05, .24, -3.6, 1.46, 1.45, .52, 3, 4, utilityShelf); box(utilityShelf, greyTile, [-3.05, 1.73, -3.6], [1.53, .065, .59]); shelving(3.8, .34, 6.16, 1.08, .9, .33, 2, 3, shoeShelf)
  // The cabinet spans the 27 mm change between living and entrance flooring.
  // Two grounded plinth segments support the bottom board above both surfaces.
  const shoePlinthTop = .318
  box(shoeShelf, m.woodDark, [(3.2375 + 3.9) / 2, (.2385 + shoePlinthTop) / 2, 6.15], [3.9 - 3.2375, shoePlinthTop - .2385, .355])
  box(shoeShelf, m.woodDark, [(3.9 + 4.3625) / 2, (.2655 + shoePlinthTop) / 2, 6.15], [4.3625 - 3.9, shoePlinthTop - .2655, .355])
  box(trim, m.black, [4.63, .246, 6.55], [.58, .014, .74])
  // The shelf back touches x=-4.91 (inside the main left wall), front faces +X.
  utilityShelf.group.rotation.y = Math.PI / 2; utilityShelf.group.position.set(-1.05, 0, -7.55)
  washer.group.position.set(-2.3, 0, -.27)
  shoeShelf.group.rotation.y = Math.PI / 2; shoeShelf.group.position.set(-2.788, 0, 9.9)
  rounded(storage, m.woodLight, [-3.45, 1.16, -1.65], [1.15, 1.84, .52], .02)
  for (const x of [-3.73, -3.17]) { box(storage, m.wood, [x, 1.16, -1.373], [.54, 1.77, .035]); pipe(storage, m.chrome, [x, 1.1, -1.345], [x, 1.34, -1.345], .013) }
  // Red L-shaped base units; the extractor sits over the hob, clear of cabinets.
  // The carcass rests above a recessed plinth, rather than extending through it.
  // Both cabinet ends overhang by 5 cm so no black and wood end faces coincide.
  // The sink cabinet is hollow beneath the bowl; a solid carcass would fill it.
  for (const [start, end] of [[-1, 2.18], [2.98, 3.4]]) box(kitchen, m.woodDark, [-4.5, .735, (start! + end!) / 2], [.85, .73, end! - start!])
  box(kitchen, m.woodDark, [-4.5, .39, 2.58], [.85, .04, .8])
  for (const x of [-4.9075, -4.0925]) box(kitchen, m.woodDark, [x, .755, 2.58], [.035, .69, .8])
  box(kitchen, m.black, [-4.5, .30375, 1.2], [.75, .1425, 4.3])
  // The end bay is a blind corner behind the return unit, not a door through it.
  for (let i = 1; i < 6; i++) { const z = -.54 + i * .7; rounded(kitchen, m.red, [-4.05, .72, z], [.05, .73, .66], .012); pipe(kitchen, m.black, [-4.015, .88, z - .13], [-4.015, .88, z + .13], .013) }
  const roundedOutline = (width: number, depth: number, radius: number) => {
    const points: THREE.Vector2[] = []
    for (let corner = 0; corner < 4; corner++) {
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (width / 2 - radius)
      const cz = (corner < 2 ? 1 : -1) * (depth / 2 - radius)
      for (let step = 0; step <= 8; step++) {
        const angle = (corner + step / 8) * Math.PI / 2
        points.push(new THREE.Vector2(cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius))
      }
    }
    return points
  }
  // Extrude a single worktop with a real hole, so there is no cap across the sink.
  const worktop = new THREE.Shape()
  worktop.moveTo(-.495, -2.25); worktop.lineTo(.495, -2.25); worktop.lineTo(.495, 2.25); worktop.lineTo(-.495, 2.25); worktop.closePath()
  const sinkHole = new THREE.Path(roundedOutline(.66, .70, .045).map(p => new THREE.Vector2(p.x + .01, p.y - 1.38)))
  sinkHole.closePath(); worktop.holes.push(sinkHole)
  add(kitchen, new THREE.ExtrudeGeometry(worktop, { depth: .08, bevelEnabled: false }), m.steel, [-4.49, 1.10, 1.2], [-Math.PI / 2, 0, 0])
  // Continuous rolled rim, sloping inner walls and a recessed rounded basin.
  const basinProfile = [
    [.70, .76, 1.174, .065], [.74, .80, 1.185, .075], [.74, .80, 1.194, .075],
    [.62, .66, 1.194, .065], [.60, .64, 1.171, .065], [.56, .60, 1.02, .075], [.48, .52, .96, .085],
  ]
  const basinPositions: number[] = [], basinIndices: number[] = []
  const ringSize = 36
  for (const [width, depth, y, radius] of basinProfile) for (const p of roundedOutline(width!, depth!, radius!)) basinPositions.push(p.x, y!, p.y)
  for (let ring = 0; ring < basinProfile.length - 1; ring++) for (let i = 0; i < ringSize; i++) {
    const a = ring * ringSize + i, b = ring * ringSize + (i + 1) % ringSize, c = a + ringSize, d = b + ringSize
    basinIndices.push(a, c, b, b, c, d)
  }
  const centre = basinPositions.length / 3
  basinPositions.push(0, .95, 0)
  for (let i = 0; i < ringSize; i++) basinIndices.push((basinProfile.length - 1) * ringSize + i, centre, (basinProfile.length - 1) * ringSize + (i + 1) % ringSize)
  const basin = new THREE.BufferGeometry()
  basin.setAttribute('position', new THREE.Float32BufferAttribute(basinPositions, 3)); basin.setIndex(basinIndices); basin.computeVertexNormals()
  add(kitchen, basin, mat('#97aaad', .3, .7), [-4.48, 0, 2.58])
  cylinder(kitchen, m.chrome, [-4.48, .955, 2.58], .044, .006, undefined, .044, 32)
  cylinder(kitchen, m.black, [-4.48, .959, 2.58], .033, .002, undefined, .033, 32)
  cylinder(kitchen, m.steel, [-4.48, .961, 2.58], .027, .002, undefined, .027, 24)
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3
    cylinder(kitchen, m.black, [-4.48 + Math.cos(angle) * .017, .9625, 2.58 + Math.sin(angle) * .017], .003, .001, undefined, .003, 8)
  }
  cylinder(kitchen, m.chrome, [-4.84, 1.193, 2.58], .041, .026)
  curve(kitchen, m.chrome, [[-4.84, 1.2, 2.58], [-4.84, 1.52, 2.58], [-4.61, 1.57, 2.58], [-4.48, 1.44, 2.58]], .022); cylinder(kitchen, m.chrome, [-4.84, 1.26, 2.94], .032, .11)
  box(kitchen, m.black, [-4.48, 1.19, 1.11], [.73, .025, .86])
  for (const x of [-4.69, -4.27]) for (const z of [.87, 1.35]) { cylinder(kitchen, m.iron, [x, 1.21, z], .125, .025); cylinder(kitchen, m.black, [x, 1.23, z], .086, .017) }
  rounded(kitchen, m.white, [-4.53, 2.1, 1.1], [.84, .16, 1.08], .035); box(kitchen, m.white, [-4.83, 2.42, 1.1], [.22, .51, .35])
  // Both tops share y=1.18 and meet at the steel top's front edge x=-3.995.
  // Their footprints are disjoint; the wood top must not extend over the steel.
  const returnLeft = -4.075, returnRight = -2.525, topJoin = -3.995, topRight = -2.47
  box(kitchen, m.woodDark, [(returnLeft + returnRight) / 2, .735, -.65], [returnRight - returnLeft, .73, .67])
  box(kitchen, m.black, [(returnLeft + returnRight) / 2, .30375, -.65], [returnRight - returnLeft - .1, .1425, .57])
  box(kitchen, m.wood, [(topJoin + topRight) / 2, 1.14, -.65], [topRight - topJoin, .08, .77])
  // Leave a corner filler and a centre stile so the fronts and handles stay clear.
  for (const x of [-3.595, -2.9]) {
    box(kitchen, m.black, [x, .72, -.295], [.65, .65, .035])
    box(kitchen, m.glassDark, [x, .70, -.27], [.51, .4, .015])
    pipe(kitchen, m.chrome, [x - .23, .98, -.24], [x + .23, .98, -.24], .016)
  }
  rounded(kitchen, m.white, [-1.83, 1.2, -.65], [.69, 1.93, .75], .03); box(kitchen, m.black, [-1.83, 1.67, -.262], [.54, .19, .018]); cylinder(kitchen, m.glass, [-1.83, .91, -.247], .22, .027, [Math.PI / 2, 0, 0]); cylinder(kitchen, m.white, [-1.83, .91, -.22], .15, .015, [Math.PI / 2, 0, 0])
  box(kitchen, m.steel, [-3.24, .74, 2.78], [.72, 1, 1.33]); rounded(kitchen, m.stone, [-3.24, 1.285, 2.78], [.84, .09, 1.43], .025)
  for (const z of [2.51, 3.02]) cylinder(kitchen, m.ceramic, [-3.24, 1.36, z], .055, .1)
  box(kitchen, m.black, [-3.24, 1.337, 2.78], [.21, .01, .15])
  box(nails, m.wood, [-4.77, .85, 3.67], [.18, 1.22, .18]); box(nails, m.woodDark, [-4.67, 1.02, 3.67], [.05, .21, .51])
  for (const z of [3.49, 3.85]) { cylinder(nails, m.iron, [-4.636, 1.02, z], .029, .018, [0, 0, Math.PI / 2]); cylinder(nails, m.iron, [-4.69, 1.02, z], .011, .11, [0, 0, Math.PI / 2]) }
  const chair = (b: Bucket, x: number, z: number, yaw: number, material: THREE.MeshStandardMaterial) => {
    const p = (dx: number, y: number, dz: number): V3 => [x + dx * Math.cos(yaw) + dz * Math.sin(yaw), y, z - dx * Math.sin(yaw) + dz * Math.cos(yaw)]
    for (const dx of [-.21, .21]) for (const dz of [-.2, .2]) box(b, material, p(dx, .47, dz), [.045, .46, .045], [0, yaw, 0])
    rounded(b, material, p(0, .725, 0), [.5, .06, .49], .014, [0, yaw, 0])
    for (const dx of [-.21, .21]) box(b, material, p(dx, 1.02, .22), [.04, .59, .04], [0, yaw, 0])
    for (const y of [.91, 1.06, 1.21]) box(b, material, p(0, y, .22), [.46, .065, .035], [0, yaw, 0])
  }
  rounded(kitchen, m.woodDark, [-2.8, .98, 4.38], [1.65, .09, .77], .025)
  for (const x of [-3.48, -2.12]) for (const z of [4.1, 4.66]) box(kitchen, m.woodDark, [x, .6, z], [.065, .72, .065])
  for (const x of [-3.24, -2.38]) { chair(kitchen, x, 3.82, Math.PI, m.woodDark); chair(kitchen, x, 4.98, 0, m.woodDark) }
  cylinder(kitchen, m.ceramic, [-2.8, 1.04, 4.38], .12, .02)
  rounded(dining, m.stone, [3.06, 1.02, -.88], [1.02, .1, 1.88], .16)
  for (const x of [2.69, 3.43]) for (const z of [-1.6, -.16]) box(dining, m.wood, [x, .64, z], [.075, .76, .075])
  for (const z of [-1.38, -.38]) { chair(dining, 2.23, z, -Math.PI / 2, ochre); chair(dining, 3.9, z, Math.PI / 2, ochre) }
  // The TV divider is a framed wall. Paper is only a thin facing on the two
  // gypsum sheets; the wall cavity is genuinely empty around its steel studs.
  const boardCore = mat('#f3ecd9', .94), facingPaper = mat('#bfa889', .87), innerPaper = mat('#cbbda4', .94)
  const studMetal = mat('#849396', .46, .6), boardPaint = mat('#d8dbd0', .89)
  const wallX0 = 1.425, wallX1 = 4.795, cutX = 4.245
  // Back board: paper / gypsum core / paper. Dimensions deliberately retain
  // real layer thicknesses so the exposed right edge is not a solid paper block.
  box(gypsum, facingPaper, [3.11, .85, .6753], [3.37, 1.24, .0006])
  box(gypsum, boardCore, [3.11, .85, .682], [3.37, 1.24, .012])
  box(gypsum, innerPaper, [3.11, .85, .6883], [3.37, 1.24, .0006])
  const frontBoard = (b: Bucket, x: number, y: number, width: number, height: number) => {
    box(b, innerPaper, [x, y, .7923], [width, height, .0006])
    box(b, boardCore, [x, y, .799], [width, height, .012])
    box(b, facingPaper, [x, y, .8053], [width, height, .0006])
    box(b, boardPaint, [x, y, .8059], [width, height, .0006])
  }
  frontBoard(gypsum, (wallX0 + cutX) / 2, .85, cutX - wallX0, 1.24)
  frontBoard(gypsum, (cutX + wallX1) / 2, .375, wallX1 - cutX, .29)
  frontBoard(gypsum, (cutX + wallX1) / 2, 1.365, wallX1 - cutX, .21)
  // This panel is present only in the complete view; a 55 × 74 cm opening is
  // left in the teaching cutaway, with both paper facings visible at its edge.
  frontBoard(gypsumCover, (cutX + wallX1) / 2, .89, wallX1 - cutX, .74)
  box(gypsumCover, boardCore, [4.802, .85, .74], [.014, 1.24, .132])
  box(gypsumCover, facingPaper, [4.8095, .85, .74], [.001, 1.24, .132])
  // A concealed sill supports the U channel inside the cavity. Separate skirting
  // sits OUTSIDE each board face, following the two finished floor heights.
  // The former solid base shared z=.675 with the backing paper and flickered.
  box(gypsum, m.woodDark, [3.11, .25825, .741], [3.36, .0495, .102])
  box(gypsum, m.woodDark, [3.11, .27325, .6635], [3.38, .0805, .023])
  box(gypsum, m.woodDark, [3.11, .30625, .81805], [3.38, .0805, .0239])
  // Lower U channel, upper U channel and separate C studs.
  for (const y of [.286, 1.453]) {
    box(gypsum, studMetal, [3.11, y, .742], [3.37, .006, .106])
    const flangeY = y < 1 ? y + .024 : y - .024
    for (const z of [.69, .794]) box(gypsum, studMetal, [3.11, flangeY, z], [3.37, .045, .003])
  }
  for (const x of [1.48, 2.08, 2.68, 3.28, 3.88, 4.57]) {
    box(gypsum, studMetal, [x - .022, .87, .742], [.003, 1.158, .102])
    for (const z of [.692, .792]) box(gypsum, studMetal, [x, .87, z], [.047, 1.158, .003])
    for (const z of [.701, .783]) box(gypsum, studMetal, [x + .022, .87, z], [.003, 1.158, .018])
  }
  // Small recessed screw heads fasten the intact boards to the framing. Their
  // bases intersect the facing by 0.1 mm; there are no floating caps or decals.
  for (const y of [.4, 1.34]) for (const x of [4.15, 4.7]) cylinder(gypsum, studMetal, [x, y, .8071], .012, .002, [Math.PI / 2, 0, 0])
  rounded(lounge, m.red, [3.11, .49, 1.04], [2.32, .43, .34], .02)
  // The display rests on two short feet; its bezel clears the console top.
  // Bases contact y=.705, and each stem enters the bezel above its y=.83 edge.
  for (const x of [2.48, 3.74]) {
    rounded(lounge, m.black, [x, .716, 1.025], [.24, .022, .2], .006)
    pipe(lounge, m.black, [x, .726, 1.025], [x, .865, .985], .018)
  }
  box(lounge, m.black, [3.11, 1.32, .99], [2.34, .98, .09])
  const televisionMaterial = new THREE.MeshBasicMaterial({ color: '#16353d', toneMapped: false })
  const televisionScreen = new THREE.Mesh(new THREE.BoxGeometry(2.22, .87, .012), televisionMaterial)
  televisionScreen.name = 'Independent television display surface'
  televisionScreen.position.set(3.11, 1.32, 1.041)
  root.add(televisionScreen)
  root.userData.televisionScreen = televisionScreen
  for (const x of [1.73, 4.49]) { const group = x > 3 ? rightSpeaker : lounge; rounded(group, m.black, [x, .91, 1.02], [.22, 1.37, .28], .02); for (const y of [.55, 1.03]) cylinder(group, m.iron, [x, y, 1.167], .065, .009, [Math.PI / 2, 0, 0]) }
  const armchair = (x: number, z: number, yaw: number) => {
    const p = (dx: number, y: number, dz: number): V3 => [x + dx * Math.cos(yaw) + dz * Math.sin(yaw), y, z - dx * Math.sin(yaw) + dz * Math.cos(yaw)]
    for (const dx of [-.36, .36]) for (const dz of [-.33, .33]) box(lounge, m.woodDark, p(dx, .32, dz), [.065, .18, .065], [0, yaw, 0])
    rounded(lounge, m.seat, p(0, .49, 0), [1.04, .27, .94], .12, [0, yaw, 0]); rounded(lounge, m.cushion, p(0, .97, -.35), [1.03, .77, .24], .11, [-.08, yaw, 0])
    for (const dx of [-.435, .435]) rounded(lounge, m.cushion, p(dx, .78, .01), [.19, .47, .93], .09, [0, yaw, 0])
    rounded(lounge, m.cushion, p(0, .68, .07), [.68, .18, .67], .075, [0, yaw, 0]); rounded(lounge, m.pillow, p(0, 1.03, -.19), [.66, .43, .13], .085, [.1, yaw, 0])
  }
  armchair(1.91, 3.35, Math.PI / 2); armchair(4.29, 3.35, -Math.PI / 2)
  const tableOutline = new THREE.Shape(); tableOutline.moveTo(-.78, -.24); tableOutline.bezierCurveTo(-.92, -.6, -.26, -.57, -.05, -.25); tableOutline.bezierCurveTo(.15, -.01, .8, -.39, .83, .08); tableOutline.bezierCurveTo(.88, .53, .23, .48, .03, .25); tableOutline.bezierCurveTo(-.24, .01, -.65, .21, -.78, -.24)
  const tableTop = new THREE.ExtrudeGeometry(tableOutline, { depth: .045, bevelEnabled: true, bevelSegments: 3, bevelSize: .02, bevelThickness: .01, curveSegments: 28 }); tableTop.rotateX(-Math.PI / 2); tableTop.scale(.6, 1, .95); add(lounge, tableTop, m.glassDark, [3.1, .73, 3.35])
  for (const x of [2.83, 3.37]) sphere(lounge, m.black, [x, .48, 3.35], [.15, .25, .24])
  // Vase and flowers are supplied by the independent table-flowers module.
  rounded(lounge, m.black, [2.41, .32, 2.18], [.43, .1, .33], .12); rounded(lounge, m.white, [2.41, .375, 2.18], [.37, .035, .28], .1); rounded(lounge, m.book, [2.41, .403, 2.18], [.13, .025, .2], .025)
  // A grounded potted broad-leaf plant: open ceramic rim, visible soil, curved
  // woody branches and thin folded leaves instead of green spikes or ball clumps.
  const plant = bucket('Entrance broad-leaf plant with ceramic pot and visible soil')
  const potMaterial = mat('#c9bca4', .78), stemMaterial = mat('#71664d', .86)
  const leafMaterials = [mat('#355b42', .86), mat('#456b4a', .88), mat('#56774f', .9)]
  for (const material of leafMaterials) material.side = THREE.DoubleSide
  const veinMaterial = mat('#6b8456', .9)
  const potProfile = [[0, 0], [.13, 0], [.15, .035], [.20, .32], [.21, .34], [.21, .365], [.19, .375], [.175, .35], [.17, .305], [.12, .05], [0, .05]]
  add(plant, new THREE.LatheGeometry(potProfile.map(([r, y]) => new THREE.Vector2(r!, y!)), 48), potMaterial, [4.44, .267, 5.33])
  cylinder(plant, m.soil, [4.44, .565, 5.33], .169, .018)
  const branchOffsets: V3[] = [[.10, .63, .07], [-.11, .55, .06], [.05, .69, -.10], [-.06, .43, -.11]]
  for (let bi = 0; bi < branchOffsets.length; bi++) {
    const [bx, by, bz] = branchOffsets[bi]!
    const branch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(4.44, .566, 5.33),
      new THREE.Vector3(4.44 + bx * .22, .79, 5.33 + bz * .2),
      new THREE.Vector3(4.44 + bx * .73, .57 + by * .75, 5.33 + bz * .7),
      new THREE.Vector3(4.44 + bx, .57 + by, 5.33 + bz),
    ])
    add(plant, new THREE.TubeGeometry(branch, 24, .007, 8, false), stemMaterial, [0, 0, 0])
    const count = bi === 3 ? 3 : 4
    for (let li = 0; li < count; li++) {
      const node = branch.getPoint(.35 + li * .2), angle = bi * 1.73 + li * 2.32
      const dx = Math.cos(angle) * (Math.cos(angle) > 0 ? .15 : .23), dz = Math.sin(angle) * .235
      const base = node.clone().add(new THREE.Vector3(dx * .18, .025, dz * .18))
      pipe(plant, veinMaterial, node.toArray() as V3, base.toArray() as V3, .0035)
      const end = base.clone().add(new THREE.Vector3(dx, .08 + (li % 2) * .045, dz))
      const lateral = new THREE.Vector3(-dz, 0, dx).normalize()
      const width = .09 + (li % 3) * .013, rows = 11
      const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
      const centerline: THREE.Vector3[] = []
      for (let row = 0; row < rows; row++) {
        const t = row / (rows - 1), spread = Math.pow(Math.sin(Math.PI * t), .72) * width
        const center = base.clone().lerp(end, t)
        center.y += .045 * Math.sin(Math.PI * t) - .035 * t * t
        centerline.push(center.clone().add(new THREE.Vector3(0, .0035, 0)))
        for (const side of [-1, 0, 1]) {
          const point = center.clone().addScaledVector(lateral, spread * side)
          point.y += Math.abs(side) * (-.014 + .008 * Math.sin(t * Math.PI * 3)) * Math.sin(Math.PI * t)
          vertices.push(point.x, point.y, point.z); uvs.push((side + 1) / 2, t)
        }
      }
      for (let row = 0; row < rows - 1; row++)for (let col = 0; col < 2; col++) {
        const i = row * 3 + col; indices.push(i, i + 3, i + 1, i + 1, i + 3, i + 4)
      }
      const leaf = new THREE.BufferGeometry(); leaf.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); leaf.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); leaf.setIndex(indices); leaf.computeVertexNormals()
      add(plant, leaf, leafMaterials[(bi + li) % leafMaterials.length]!, [0, 0, 0])
      add(plant, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(centerline), 12, .0018, 5, false), veinMaterial, [0, 0, 0])
      for (const t of [.28, .47, .66]) {
        const center = base.clone().lerp(end, t); center.y += .045 * Math.sin(Math.PI * t) - .035 * t * t + .003
        const spread = Math.pow(Math.sin(Math.PI * t), .72) * width * .8
        for (const side of [-1, 1]) {
          const edge = base.clone().lerp(end, t + .12).addScaledVector(lateral, spread * side)
          edge.y += .045 * Math.sin(Math.PI * (t + .12)) - .035 * (t + .12) * (t + .12) - .006
          pipe(plant, veinMaterial, center.toArray() as V3, edge.toArray() as V3, .0009)
        }
      }
    }
  }

  // Small black charger stays a secondary background object on a real jamb.
  rounded(charger, m.black, [4.85, 1.28, -5.8], [.15, .65, .32], .06)
  box(charger, m.foliage, [4.768, 1.43, -5.8], [.012, .065, .23])
  box(charger, m.glassDark, [4.767, 1.26, -5.8], [.014, .17, .16])
  curve(charger, m.rubber, [[4.81, 1.02, -5.8], [4.77, .45, -5.72], [4.49, .33, -5.39], [4.15, .69, -4.94]], .021)
  rounded(charger, m.black, [4.15, .69, -4.94], [.13, .09, .13], .025)

  // Merge geometries within each semantic group. A separate material clone per
  // feature permits an unobtrusive highlight without recolouring the entire home.
  for (const b of buckets) {
    for (const [material, geometries] of b.geometries) {
      const merged = mergeGeometries(geometries, false)
      for (const geometry of geometries) geometry.dispose()
      if (!merged) continue
      let assigned = material
      if (b.feature) {
        assigned = material.clone(); materials.push(assigned)
        const list = features.get(b.feature) ?? []; list.push(assigned); features.set(b.feature, list)
      }
      const mesh = new THREE.Mesh(merged, assigned)
      mesh.name = `${b.group.name} / ${material.color.getHexString()}`
      mesh.castShadow = true; mesh.receiveShadow = true
      if (b.feature) mesh.userData.featureId = b.feature
      b.group.add(mesh)
    }
    b.geometries.clear()
  }
  root.userData.featureAnchors = {
    1: [.58, .3, -4.65], 2: [-1.5, 1.72, -5.98], 3: [-2.0, 1.45, -1.29],
    4: [-4.636, 1.02, 3.67], 5: [.5, .1, 6.08], 6: [4.53, .95, .8],
    7: [3.55, 1, -4.12], 8: [4.07, .94, -4.12],
  }
  let highlightedId: number | null = null
  let isCutaway = true
  const setCutaway = (enabled: boolean) => {
    isCutaway = enabled
    rightSpeaker.group.visible = !enabled || highlightedId !== 6
    closed.forEach(group => { group.visible = !enabled })
    opened.forEach(group => { group.visible = enabled })
  }
  setCutaway(true)
  return {
    root,
    setCutaway,
    highlight(id) {
      highlightedId = id
      rightSpeaker.group.visible = !isCutaway || id !== 6
      for (const [key, values] of features) for (const material of values) {
        material.emissive.set(key === id ? '#8c663c' : '#000000')
        material.emissiveIntensity = key === id ? (id === 6 ? .07 : .15) : 0
      }
    },
    dispose() {
      disposed = true
      root.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
      televisionMaterial.dispose()
      materials.forEach(material => material.dispose())
      textures.forEach(texture => texture.dispose())
      root.clear()
    },
  }
}
