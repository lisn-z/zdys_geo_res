import * as THREE from 'three'
import { DOMAIN, clamp, evolution, fieldHeight, hash, lerp, riverPoints, shortcutPoints, smooth, type ChannelPoint, type Evolution, type Field } from './fluvial-model'
import { PADDY_DISTRICTS, paddyWorld as world, paddyLocal, paddyWaterLevel, type PaddyDistrict as District } from './fluvial-irrigation'

type Point = { x: number; z: number }
type Rect = { u0: number; u1: number; v0: number; v1: number }
type SurfaceKind = 'rice' | 'bank' | 'canal'
type Surface = { polygon: Point[]; kind: SurfaceKind; wet: number; seed: number; color: THREE.Color; district: District }
type VertexData = { positions: number[]; uv: number[]; colors: number[]; detail: number[]; offsets: number[]; waterLevels: number[] }

export interface PaddyLandscape {
  group: THREE.Group
  update(state: Evolution): void
  contains(x: number, z: number): boolean
  dispose(): void
}

/** Farming follows the completion of grading and gravity-fed irrigation works. */
export const paddyGrowth = (state: Evolution) => smooth(.80, .90, state.p)

function polygon(d: District, r: Rect): Point[] {
  return [world(d, r.u0, r.v0), world(d, r.u1, r.v0), world(d, r.u1, r.v1), world(d, r.u0, r.v1)]
}

/** Reserve both banks across the entire migration, including the future oxbow. */
function waterEnvelope() {
  const cell = .25, nx = 176, nz = 260, blocked = new Uint8Array(nx * nz)
  function reserve(points: ChannelPoint[]) {
    for (let n = 1; n < points.length; n++) {
      const a = points[n - 1]!, b = points[n]!, radius = Math.max(a.width, b.width) + .72 + cell * Math.SQRT2
      const x0 = clamp(Math.floor((Math.min(a.x, b.x) - radius - DOMAIN.x0) / cell), 0, nx - 1)
      const x1 = clamp(Math.ceil((Math.max(a.x, b.x) + radius - DOMAIN.x0) / cell), 0, nx - 1)
      const z0 = clamp(Math.floor((Math.min(a.z, b.z) - radius - DOMAIN.z0) / cell), 0, nz - 1)
      const z1 = clamp(Math.ceil((Math.max(a.z, b.z) + radius - DOMAIN.z0) / cell), 0, nz - 1)
      const dx = b.x - a.x, dz = b.z - a.z, ll = dx * dx + dz * dz
      for (let j = z0; j <= z1; j++) for (let i = x0; i <= x1; i++) {
        const k = j * nx + i
        if (blocked[k]) continue
        const x = DOMAIN.x0 + (i + .5) * cell, z = DOMAIN.z0 + (j + .5) * cell
        const t = ll > .000001 ? clamp(((x - a.x) * dx + (z - a.z) * dz) / ll) : 0
        if ((x - a.x - t * dx) ** 2 + (z - a.z - t * dz) ** 2 <= radius * radius) blocked[k] = 1
      }
    }
  }
  const snapshots = new Set([0, .3, .7, .76, .84, .94, 1])
  for (let p = .48; p <= .761; p += .02) snapshots.add(p)
  snapshots.forEach(p => reserve(riverPoints(evolution(p))))
  reserve(shortcutPoints(evolution(1)))
  return (x: number, z: number) => {
    const i = Math.floor((x - DOMAIN.x0) / cell), j = Math.floor((z - DOMAIN.z0) / cell)
    return i < 0 || i >= nx || j < 0 || j >= nz || blocked[j * nx + i] === 1
  }
}

/** Convex polygon clipping preserves the terrain mesh's exact triangular planes. */
function clip(subject: Point[], triangle: Point[]) {
  let out = subject
  for (let i = 0; i < triangle.length && out.length; i++) {
    const a = triangle[i]!, b = triangle[(i + 1) % triangle.length]!, input = out
    out = []
    const side = (p: Point) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x)
    let last = input[input.length - 1]!, lastSide = side(last)
    for (const current of input) {
      const currentSide = side(current)
      if ((currentSide >= -1e-9) !== (lastSide >= -1e-9)) {
        const t = lastSide / (lastSide - currentSide)
        out.push({ x: lerp(last.x, current.x, t), z: lerp(last.z, current.z, t) })
      }
      if (currentSide >= -1e-9) out.push(current)
      last = current; lastSide = currentSide
    }
  }
  return out
}

function fieldSurfaces(): Surface[] {
  const surfaces: Surface[] = []
  const pending: Array<Omit<Surface, 'polygon'> & { rect: Rect }> = []
  const districts = PADDY_DISTRICTS
  const palette = ['#62723d', '#718047', '#536c3b', '#7c8951', '#526a42', '#8c8450', '#637949']
  function surface(d: District, rect: Rect, kind: SurfaceKind, seed: number, wet = 0) {
    if (rect.u1 - rect.u0 < .015 || rect.v1 - rect.v0 < .015) return
    const color = new THREE.Color(kind === 'canal' ? '#315856' : kind === 'bank' ? '#797555' : palette[Math.floor(hash(seed, 803) * palette.length)]!)
    pending.push({ rect, district: d, kind, wet, seed, color })
  }
  for (const d of districts) {
    const trunkHalf = d.seed === 71 ? .17 : .135, tributaryHalf = .068
    const first = d.rows[0]!, last = d.rows[d.rows.length - 1]!
    // Each bank has its own irregular envelope, leaving meadow pockets rather
    // than two continuous rectangular outer borders.
    const leftInsets = d.seed === 71 ? [1.05, .13, .94, .30, 1.31] : [.77, .13, .97, .48]
    const rightInsets = d.seed === 71 ? [1.30, .61, .14, 1.17, .64] : [.38, 1.05, .16, .82]
    const rowExtent = (row: number, side: number) => {
      const safeRow = clamp(row, 0, d.rows.length - 2)
      return (side < 0 ? -d.left : d.right) - (side < 0 ? leftInsets[safeRow]! : rightInsets[safeRow]!)
    }
    // One full-length carrier and abutting lateral branches share boundaries;
    // there are never two water faces at a junction.
    surface(d, { u0: -trunkHalf, u1: trunkHalf, v0: first - tributaryHalf, v1: last + tributaryHalf }, 'canal', d.seed)
    for (let row = 0; row < d.rows.length; row++) {
      const v = d.rows[row]!
      const left = Math.max(rowExtent(row - 1, -1), rowExtent(row, -1))
      const right = Math.max(rowExtent(row - 1, 1), rowExtent(row, 1))
      surface(d, { u0: -left, u1: -trunkHalf, v0: v - tributaryHalf, v1: v + tributaryHalf }, 'canal', d.seed + row)
      surface(d, { u0: trunkHalf, u1: right, v0: v - tributaryHalf, v1: v + tributaryHalf }, 'canal', d.seed + row)
    }
    for (let row = 0; row < d.rows.length - 1; row++) for (const side of [-1, 1]) {
      const rowSeed = d.seed + row * 31 + side * 4
      const lower = d.rows[row]! + tributaryHalf, upper = d.rows[row + 1]! - tributaryHalf
      const near = trunkHalf, far = rowExtent(row, side)
      const split = lerp(near, far, .43 + hash(rowSeed, 2) * .19), ditchHalf = .033
      const edges = [near, split - ditchHalf, split + ditchHalf, far]
      const ordered = (a: number, b: number): [number, number] => side < 0 ? [-b, -a] : [a, b]
      const [du0, du1] = ordered(split - ditchHalf, split + ditchHalf)
      surface(d, { u0: du0, u1: du1, v0: lower, v1: upper }, 'canal', rowSeed + 9)
      for (let column = 0; column < 2; column++) {
        const [u0, u1] = ordered(edges[column * 2]!, edges[column * 2 + 1]!)
        const seed = rowSeed + column * 11, bund = .052
        const wet = hash(seed, 91) > .77 ? 1 : 0
        const outer = { u0, u1, v0: lower, v1: upper }
        const inner = { u0: u0 + bund, u1: u1 - bund, v0: lower + bund, v1: upper - bund }
        surface(d, inner, 'rice', seed, wet)
        // Four non-overlapping narrow earth margins surround each cultivated bed.
        surface(d, { ...outer, u1: inner.u0 }, 'bank', seed)
        surface(d, { ...outer, u0: inner.u1 }, 'bank', seed)
        surface(d, { u0: inner.u0, u1: inner.u1, v0: lower, v1: inner.v0 }, 'bank', seed)
        surface(d, { u0: inner.u0, u1: inner.u1, v0: inner.v1, v1: upper }, 'bank', seed)
      }
    }
  }
  // Split every rectangle at the same local cross-sections. The curved axis
  // is piecewise affine, so adjacent canals, banks and beds share their exact
  // edge vertices, without introducing gaps or overlapping water junctions.
  for (const d of districts) {
    const members = pending.filter(item => item.district === d)
    const breaks = new Set<number>(members.flatMap(item => [item.rect.v0, item.rect.v1]))
    for (let v = -8; v <= 8; v += .4) breaks.add(v)
    const ordered = [...breaks].sort((a, b) => a - b)
    for (const { rect, ...item } of members) {
      const cuts = ordered.filter(v => v >= rect.v0 - 1e-9 && v <= rect.v1 + 1e-9)
      for (let n = 1; n < cuts.length; n++) {
        if (cuts[n]! - cuts[n - 1]! < 1e-8) continue
        surfaces.push({ ...item, polygon: polygon(d, { ...rect, v0: cuts[n - 1]!, v1: cuts[n]! }) })
      }
    }
  }
  return surfaces
}

function makeMaterial(kind: SurfaceKind, growth: { value: number }) {
  const material = new THREE.MeshStandardMaterial({
    name: `江南田园 / ${kind}`, color: 0xffffff, vertexColors: true, roughness: kind === 'canal' ? .33 : .93,
    metalness: 0, envMapIntensity: kind === 'canal' ? .48 : .18,
    transparent: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  })
  material.onBeforeCompile = shader => {
    shader.uniforms.uPaddyGrowth = growth
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nattribute vec2 aDetail; varying vec2 vPaddyDetail; varying vec2 vPaddyUv;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvPaddyDetail=aDetail; vPaddyUv=uv;`)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', /* glsl */ `
      #include <common>
      uniform float uPaddyGrowth;
      varying vec2 vPaddyDetail;
      varying vec2 vPaddyUv;
      float paddyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float paddyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(paddyHash(i),paddyHash(i+vec2(1,0)),f.x),mix(paddyHash(i+vec2(0,1)),paddyHash(i+vec2(1,1)),f.x),f.y);}
    `).replace('#include <color_fragment>', /* glsl */ `
      #include <color_fragment>
      vec2 local=vPaddyUv;
      float mottling=paddyNoise(local*5.8+vPaddyDetail.y);
      float fine=paddyNoise(local*48.);
      float detail=1.-smoothstep(.04,.18,max(fwidth(local.x),fwidth(local.y)));
      float rowPhase=abs(fract(local.x*11.4+sin(local.y*3.4)*.027)-.5);
      float rows=(1.-smoothstep(.08,.24,rowPhase))*detail;
      float clumps=smoothstep(.23,.61,paddyNoise(vec2(local.x*29.,local.y*34.)));
      ${kind === 'rice' ? `
        vec3 rice=diffuseColor.rgb*(.79+mottling*.30+fine*.13);
        rice*=1.-rows*(.19+vPaddyDetail.x*.18);
        rice+=diffuseColor.rgb*clumps*detail*.105;
        vec3 mud=vec3(.095,.120,.075)*( .90 + mottling*.20 );
        vec3 wetMud=mix(mud,vec3(.068,.130,.114),.44);
        rice=mix(rice,mix(wetMud,rice,rows*.84+clumps*.10),vPaddyDetail.x*.71);
        diffuseColor.rgb=mix(mud,rice,uPaddyGrowth);
      ` : kind === 'canal' ? `
        float ripple=sin(local.y*68.+sin(local.x*27.)*.5)*detail;
        diffuseColor.rgb*=.83+mottling*.24+ripple*.038;
      ` : `
        diffuseColor.rgb*=.79+mottling*.28+fine*.15;
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.76,.88,.62),clumps*.34);
      `}
      // A stable screen-door reveal keeps every layer depth-tested without
      // transparent-order flicker while cultivation establishes on the plain.
      if(paddyHash(floor(gl_FragCoord.xy))>smoothstep(0.,.16,uPaddyGrowth))discard;
    `)
    if (kind === 'rice') shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(.91,.37,vPaddyDetail.x*(1.-rows*.75));')
  }
  material.customProgramCacheKey = () => `fluvial-paddy-${kind}-1`
  return material
}

export function createPaddyLandscape(field: Field): PaddyLandscape {
  const group = new THREE.Group()
  group.name = '江南水乡 · 灌溉水网与稻田'
  group.visible = false
  const growth = { value: 0 }, reserved = waterEnvelope()
  const kinds: SurfaceKind[] = ['rice', 'bank', 'canal']
  const emptyData = (): VertexData => ({ positions: [], uv: [], colors: [], detail: [], offsets: [], waterLevels: [] })
  const data: Record<SurfaceKind, VertexData> = { rice: emptyData(), bank: emptyData(), canal: emptyData() }
  const cell = .25, nx = 176, nz = 260, occupied = new Uint8Array(nx * nz)
  const usedPlots = new Set<number>()
  let area = 0
  for (const surface of fieldSurfaces()) {
    const minX = Math.min(...surface.polygon.map(p => p.x)), maxX = Math.max(...surface.polygon.map(p => p.x))
    const minZ = Math.min(...surface.polygon.map(p => p.z)), maxZ = Math.max(...surface.polygon.map(p => p.z))
    const i0 = clamp(Math.floor((minX - DOMAIN.x0) / field.dx), 0, field.nx - 1), i1 = clamp(Math.floor((maxX - DOMAIN.x0) / field.dx), 0, field.nx - 1)
    const j0 = clamp(Math.floor((minZ - DOMAIN.z0) / field.dz), 0, field.nz - 1), j1 = clamp(Math.floor((maxZ - DOMAIN.z0) / field.dz), 0, field.nz - 1)
    const target = data[surface.kind]
    const offset = surface.kind === 'bank' ? .10 : surface.kind === 'canal' ? 0 : .07
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = DOMAIN.x0 + i * field.dx, z = DOMAIN.z0 + j * field.dz
      const a = { x, z }, b = { x: x + field.dx, z }, cc = { x, z: z + field.dz }, d = { x: x + field.dx, z: z + field.dz }
      for (const triangle of [[a, b, cc], [d, cc, b]]) {
        const piece = clip(surface.polygon, triangle)
        if (piece.length < 3) continue
        const center = { x: piece.reduce((n, p) => n + p.x, 0) / piece.length, z: piece.reduce((n, p) => n + p.z, 0) / piece.length }
        if (piece.some(p => reserved(p.x, p.z)) || reserved(center.x, center.z)) continue
        // These explicit districts are graded before cultivation. Testing the
        // evolving slope here would permanently punch holes beside canal beds
        // and make their topology depend on the initial playback position.
        for (let n = 1; n < piece.length - 1; n++) {
          // Reverse x/z polygon winding to give upward-facing ground normals.
          const vertices = [piece[0]!, piece[n + 1]!, piece[n]!]
          const [v0, v1, v2] = vertices
          const triangleArea = Math.abs((v1!.x - v0!.x) * (v2!.z - v0!.z) - (v1!.z - v0!.z) * (v2!.x - v0!.x)) * .5
          if (triangleArea < 1e-9) continue
          area += triangleArea
          if (surface.kind === 'rice') usedPlots.add(surface.seed)
          for (const p of vertices) {
            const local = paddyLocal(surface.district, p.x, p.z)
            const level = paddyWaterLevel(surface.district, local.u, local.v)
            target.positions.push(p.x, surface.kind === 'canal' ? level : fieldHeight(field, p.x, p.z) + offset, p.z)
            target.offsets.push(offset)
            target.waterLevels.push(level)
            target.uv.push(local.u, local.v)
            target.colors.push(surface.color.r, surface.color.g, surface.color.b)
            target.detail.push(surface.wet, surface.seed)
          }
        }
        // Conservative .25-unit coverage makes frequent forest queries constant time.
        const ix0 = clamp(Math.floor((Math.min(...piece.map(p => p.x)) - DOMAIN.x0) / cell), 0, nx - 1)
        const ix1 = clamp(Math.floor((Math.max(...piece.map(p => p.x)) - DOMAIN.x0) / cell), 0, nx - 1)
        const iz0 = clamp(Math.floor((Math.min(...piece.map(p => p.z)) - DOMAIN.z0) / cell), 0, nz - 1)
        const iz1 = clamp(Math.floor((Math.max(...piece.map(p => p.z)) - DOMAIN.z0) / cell), 0, nz - 1)
        for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) occupied[iz * nx + ix] = 1
      }
    }
  }
  const meshes = kinds.map(kind => {
    const source = data[kind], geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(source.positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(source.uv, 2))
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(source.colors, 3))
    geometry.setAttribute('aDetail', new THREE.Float32BufferAttribute(source.detail, 2))
    geometry.computeVertexNormals(); geometry.computeBoundingSphere()
    const mesh = new THREE.Mesh(geometry, makeMaterial(kind, growth))
    mesh.name = kind === 'rice' ? '错落稻田与浅水秧田' : kind === 'bank' ? '低矮泥土田埂' : '相连灌溉干渠与田间支渠'
    mesh.receiveShadow = true
    mesh.userData.surfaceKind = kind
    group.add(mesh)
    return mesh
  })
  group.userData.plotCount = usedPlots.size
  group.userData.cultivatedArea = area
  group.userData.drawCalls = meshes.length
  let disposed = false
  return {
    group,
    contains(x, z) {
      const i = Math.floor((x - DOMAIN.x0) / cell), j = Math.floor((z - DOMAIN.z0) / cell)
      return i >= 0 && i < nx && j >= 0 && j < nz && occupied[j * nx + i] === 1
    },
    update(state) {
      if (disposed) return
      growth.value = paddyGrowth(state)
      group.visible = growth.value > .001
      if (!group.visible) return
      for (let n = 0; n < meshes.length; n++) {
        const mesh = meshes[n]!, positions = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
        const kind = kinds[n]!, source = data[kind]
        mesh.visible = kind !== 'canal' || state.p >= .80
        // Canal water follows the supplied hydraulic grade, not bumps in the
        // soil. Only cultivated beds and low bunds track the graded terrain.
        for (let i = 0; i < positions.count; i++) positions.setY(i, kind === 'canal'
          ? source.waterLevels[i]!
          : fieldHeight(field, positions.getX(i), positions.getZ(i)) + source.offsets[i]!)
        positions.needsUpdate = true
        mesh.geometry.computeVertexNormals()
        mesh.geometry.computeBoundingSphere()
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      group.removeFromParent()
      for (const mesh of meshes) { mesh.geometry.dispose(); mesh.material.dispose() }
      group.clear()
    },
  }
}
