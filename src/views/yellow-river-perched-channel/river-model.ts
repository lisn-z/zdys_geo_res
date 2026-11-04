import * as THREE from 'three'
import { createRiverMaterials } from './river-materials'
import { riverHeights, riverSurfaceHeight as surface, SAND_X_STEPS, SAND_Z_STEPS, sandGridX, sandGridZ, sandGridThickness, type LeveeScenario } from './river-bed-profile'
import { createOverflowWater } from './overflow-water'
export { riverHeights } from './river-bed-profile'

const X = 24, Z = 16, BOTTOM = -5, X_STEPS = 192, Z_STEPS = 48
const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0))
const mix = THREE.MathUtils.lerp
function waterWidth(progress: number) {
  const target = riverHeights(progress).water
  let lo = 5, hi = 5.75
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) * .5
    if (surface(mid, progress) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) * .5
}

function indexedGeometry(vertices: number[], indices: number[], uvs: number[]) {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function prismRoof() {
  // A closed gabled roof, with no open back or underside when orbiting the model.
  const p = [-.68,0,-.93, .68,0,-.93, 0,.34,-.93, -.68,0,.93, .68,0,.93, 0,.34,.93]
  const indexed = indexedGeometry(p, [0,2,1, 3,4,5, 0,3,5,0,5,2, 1,2,5,1,5,4, 0,1,4,0,4,3],
    [0,0, 1,0, .5,1, 0,0, 1,0, .5,1])
  const result = indexed.toNonIndexed()
  indexed.dispose(); result.computeVertexNormals()
  return result
}

/** Closed eight-sided cornice/roof profile; thin stepped eaves, not stacked circular cones. */
function octagonalProfile(profile: [number,number][]) {
  const p:number[]=[], uv:number[]=[], idx:number[]=[]
  profile.forEach(([radius,height],row)=>{
    for(let side=0;side<=8;side++) {
      const theta=side/8*Math.PI*2+Math.PI/8
      p.push(Math.sin(theta)*radius,height,Math.cos(theta)*radius)
      uv.push(side/8,height*5)
      if(row<profile.length-1&&side<8) {
        const a=row*9+side,b=a+9
        idx.push(a,a+1,b,a+1,b+1,b)
      }
    }
  })
  const base=p.length/3; p.push(0,profile[0]![1],0,0,profile[profile.length-1]![1],0);uv.push(.5,.5,.5,.5)
  for(let side=0;side<8;side++) {
    idx.push(base,side+1,side)
    const a=(profile.length-1)*9+side;idx.push(base+1,a,a+1)
  }
  return indexedGeometry(p,idx,uv)
}

function pointedOpening(frame=false) {
  const outline=[[-.5,-.5],[.5,-.5],[.5,.2],[0,.5],[-.5,.2]]
  const shape=new THREE.Shape()
  outline.forEach((p,i)=>{const x=p[0]!*(frame?1.3:1),y=p[1]!*(frame?1.13:1);if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y)})
  shape.closePath()
  if(frame) {
    const hole=new THREE.Path()
    ;[...outline].reverse().forEach((p,i)=>{if(i===0)hole.moveTo(p[0]!,p[1]!);else hole.lineTo(p[0]!,p[1]!)})
    hole.closePath();shape.holes.push(hole)
  }
  return new THREE.ShapeGeometry(shape)
}

export function createRiverModel() {
  const root = new THREE.Group()
  root.name = '黄河下游地上河 · 示意模型'
  const materials = createRiverMaterials()
  let currentScenario:LeveeScenario='raised'
  const waterGroup = new THREE.Group(), details = new THREE.Group()
  waterGroup.name = '连续封闭水体'; details.name = '两岸平原生活景观'
  root.add(waterGroup, details)
  const ownedGeometries = new Set<THREE.BufferGeometry>()
  const own = <T extends THREE.BufferGeometry>(g: T): T => { ownedGeometries.add(g); return g }
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, group = root) => {
    own(geometry)
    const item = new THREE.Mesh(geometry, material)
    item.receiveShadow = true
    group.add(item)
    return item
  }

  // Top surface shares its perimeter samples with all four layers of the closed cutaway.
  const topPositions: number[] = [], topUV: number[] = [], topIndices: number[] = [], colors: number[] = []
  const green = new THREE.Color(0x7f8a6a), silt = new THREE.Color(0xa48e67), wet = new THREE.Color(0x716a4e)
  for (let iz = 0; iz <= Z_STEPS; iz++) for (let ix = 0; ix <= X_STEPS; ix++) {
    const x = -X + ix / X_STEPS * X * 2, z = -Z + iz / Z_STEPS * Z * 2
    topPositions.push(x, surface(x, 0), z)
    topUV.push(x / 5, z / 5)
    const color = Math.abs(x) >= 12 ? green.clone() : silt.clone()
    if (Math.abs(x) < 5.75) color.lerp(wet, .7)
    if (Math.abs(x) > 10 && Math.abs(x) < 12) color.lerp(green, (Math.abs(x) - 10) / 2)
    const mottling = 1 + .025 * Math.sin(x * 2.7 + z * 3.3) + .018 * Math.cos(x * 5.3 - z * 1.6)
    colors.push(color.r * mottling, color.g * mottling, color.b * mottling)
    if (ix < X_STEPS && iz < Z_STEPS) {
      const a = iz * (X_STEPS + 1) + ix, b = a + 1, c = a + X_STEPS + 1, d = c + 1
      topIndices.push(a, c, b, b, c, d)
    }
  }
  const topGeometry = indexedGeometry(topPositions, topIndices, topUV)
  topGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  mesh(topGeometry, materials.ground).name = '地表：河床—内坡—堤顶—外坡—平原'

  // Clockwise perimeter viewed from above; quad winding points outwards.
  const perimeter: [number, number][] = []
  for (let i = 0; i <= X_STEPS; i++) perimeter.push([-X + i / X_STEPS * X * 2, Z])
  for (let i = Z_STEPS - 1; i >= 0; i--) perimeter.push([X, -Z + i / Z_STEPS * Z * 2])
  for (let i = X_STEPS - 1; i >= 0; i--) perimeter.push([-X + i / X_STEPS * X * 2, -Z])
  for (let i = 1; i <= Z_STEPS; i++) perimeter.push([-X, -Z + i / Z_STEPS * Z * 2])
  type HeightFn = (x: number, p: number) => number
  const layers: { geo: THREE.BufferGeometry; low: HeightFn; high: HeightFn; object: THREE.Mesh }[] = []
  function layer(name: string, low: HeightFn, high: HeightFn, material: THREE.Material) {
    const vertices: number[] = [], uv: number[] = [], indices: number[] = []
    let distance = 0
    for (let i = 0; i < perimeter.length; i++) {
      const [x, z] = perimeter[i]!
      if (i > 0) { const prev = perimeter[i - 1]!; distance += Math.hypot(x - prev[0], z - prev[1]) }
      vertices.push(x, low(x, 0), z, x, high(x, 0), z)
      uv.push(distance / 16, low(x, 0) / 4, distance / 16, high(x, 0) / 4)
      if (i < perimeter.length - 1) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
    }
    const geo = indexedGeometry(vertices, indices, uv), object = mesh(geo, material)
    object.name = name
    layers.push({ geo, low, high, object })
    return object
  }
  layer('深层冲积土', () => BOTTOM, () => -3.25, materials.lower)
  layer('早期冲积土', () => -3.25, () => -1.4, materials.middle)
  layer('初始河床与原有堤岸', () => -1.4, x => surface(x, 0), materials.original)
  const sediment = layer('新增泥沙沉积与加高堤岸', x => surface(x, 0), (x,p)=>surface(x,p,currentScenario), materials.deposited)
  const bottomVertices = [0, BOTTOM, 0], bottomUVs = [0, 0], bottomIndices: number[] = []
  perimeter.forEach(([x,z],i) => {
    bottomVertices.push(x,BOTTOM,z); bottomUVs.push(x/8,z/8)
    if (i < perimeter.length-1) bottomIndices.push(0,i+2,i+1)
  })
  const bottom = indexedGeometry(bottomVertices,bottomIndices,bottomUVs)
  mesh(bottom, materials.bottom).name = '完整底部封口'

  // Water and deposited sand use the identical grid and diagonal orientation.
  // Additional bank samples preserve exact contact with the quarter-unit terrain mesh.
  const waterInnerXs = [-5.25,...Array.from({length:SAND_X_STEPS+1},(_,i)=>sandGridX(i)),5.25]
  const waterSteps = waterInnerXs.length + 1
  const waterX = (i:number, width:number) => i === 0 ? -width : i === waterSteps ? width : waterInnerXs[i-1]!
  const initialWaterWidth=waterWidth(0)
  function waterFloor(i:number,row:number,p:number,width:number) {
    const h=riverHeights(p)
    if(i===0||i===waterSteps)return h.water
    if(i>=2&&i<=SAND_X_STEPS+2)return h.bed+sandGridThickness(i-2,row)*p
    return surface(waterX(i,width),p)
  }
  // A planar fan keeps the surface light while sharing every boundary vertex with the floor.
  const waterPerimeter:[number,number][]=[]
  for(let i=0;i<=waterSteps;i++)waterPerimeter.push([i,SAND_Z_STEPS])
  for(let row=SAND_Z_STEPS-1;row>=0;row--)waterPerimeter.push([waterSteps,row])
  for(let i=waterSteps-1;i>=0;i--)waterPerimeter.push([i,0])
  for(let row=1;row<=SAND_Z_STEPS;row++)waterPerimeter.push([0,row])
  const waterTopVertices:number[]=[0,riverHeights(0).water,0],waterTopUVs:number[]=[1.05,3.75],waterTopIndices:number[]=[]
  waterPerimeter.forEach(([i,row],index)=>{
    const width=initialWaterWidth,x=waterX(i,width),z=sandGridZ(row)
    waterTopVertices.push(x,riverHeights(0).water,z)
    waterTopUVs.push((x/width+1)*1.05,(z+Z)/(Z*2)*7.5)
    if(index<waterPerimeter.length-1)waterTopIndices.push(0,index+1,index+2)
  })
  const waterSurface = indexedGeometry(waterTopVertices, waterTopIndices, waterTopUVs)
  const containedSurface=mesh(waterSurface, materials.water, waterGroup)
  containedSurface.name = '流动含沙水面'
  const waterBodyVertices: number[] = [], waterBodyUVs: number[] = [], waterBodyIndices: number[] = []
  for(let row=0;row<=SAND_Z_STEPS;row++)for(let i=0;i<=waterSteps;i++) {
    const width=initialWaterWidth,x=waterX(i,width),z=sandGridZ(row)
    waterBodyVertices.push(x,waterFloor(i,row,0,width),z);waterBodyUVs.push(x/8,z/8)
    if(row<SAND_Z_STEPS&&i<waterSteps) {
      const a=row*(waterSteps+1)+i,b=a+1,c=a+waterSteps+1,d=c+1
      // Exact reverse of the shared sand-cap triangles (a,c,b) and (b,c,d).
      waterBodyIndices.push(a,b,c,b,d,c)
    }
  }
  const capOffset=waterBodyVertices.length/3
  // End caps occupy only the water column ABOVE the sand, with no coplanar face overlap.
  for(let i=0;i<=waterSteps;i++) {
    const width=initialWaterWidth,x=waterX(i,width),top=riverHeights(0).water
    const back=waterFloor(i,0,0,width),front=waterFloor(i,SAND_Z_STEPS,0,width)
    waterBodyVertices.push(x,back,-Z,x,top,-Z,x,front,Z,x,top,Z)
    waterBodyUVs.push(x/8,back/4,x/8,top/4,x/8,front/4,x/8,top/4)
    if(i<waterSteps) {
      const a=capOffset+i*4,b=a+4
      waterBodyIndices.push(a,a+1,b,a+1,b+1,b,a+2,b+2,a+3,a+3,b+2,b+3)
    }
  }
  const waterBody = indexedGeometry(waterBodyVertices, waterBodyIndices, waterBodyUVs)
  const containedBody=mesh(waterBody, materials.waterEdge, waterGroup)
  containedBody.name = '河水前后断面及贴合河床的底面'
  const overflow=createOverflowWater(materials)
  overflow.root.visible=false;waterGroup.add(overflow.root)
  root.userData.overflowGroup=overflow.root

  // Fixed-height floodplain agriculture, with patches and fine parallel crop rows.
  const fieldGeometry = own(new THREE.PlaneGeometry(1, 1))
  fieldGeometry.rotateX(-Math.PI / 2)
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3()
  function instances(g: THREE.BufferGeometry, m: THREE.Material, transforms: { x:number; y:number; z:number; sx:number; sy:number; sz:number; ry?:number; rx?:number }[], group = details) {
    own(g)
    const item = new THREE.InstancedMesh(g, m, transforms.length)
    transforms.forEach((t, i) => {
      position.set(t.x, t.y, t.z); scale.set(t.sx, t.sy, t.sz)
      quaternion.setFromEuler(new THREE.Euler(t.rx??0,t.ry??0,0,'YXZ'))
      matrix.compose(position, quaternion, scale); item.setMatrixAt(i, matrix)
    })
    item.instanceMatrix.needsUpdate = true; item.castShadow = true; item.receiveShadow = true
    group.add(item); return item
  }
  const fieldPatches: { x:number; y:number; z:number; sx:number; sy:number; sz:number }[][] = Array.from({length:5}, () => [])
  for (const side of [-1,1]) for (let col = 0; col < 3; col++) for (let row = 0; row < 6; row++) {
    // Reserve the near-left tower square and a far-right village plot.
    if (side === -1 && col >= 1 && (row === 3 || row === 4)) continue
    if (side === 1 && col >= 1 && row <= 1) continue
    fieldPatches[(col + row * 2 + (side + 1)) % 5]!.push({
      x: side * (14.15 + col * 3.2), y: .012, z: -13.5 + row * 5.3,
      sx: 2.9, sy: 1, sz: 4.95,
    })
  }
  fieldPatches.forEach((p, i) => { instances(fieldGeometry, materials.fields[i]!, p).name = '黄河平原农田' })
  instances(fieldGeometry, materials.path, [-1,1].flatMap(side => [
    {x:side*12.65, y:.014, z:0, sx:.34,sy:1,sz:32},
    {x:side*18, y:.015, z:2.1, sx:10.5,sy:1,sz:.3},
  ])).name = '平原乡道'

  const homes = [
    {x:17.1,z:-12.2,r:0}, {x:19.5,z:-12.2,r:0}, {x:21.7,z:-12.2,r:0},
    {x:17.1,z:-9.3,r:Math.PI}, {x:19.5,z:-9.3,r:Math.PI}, {x:21.7,z:-9.3,r:Math.PI},
  ]
  instances(new THREE.BoxGeometry(1.16,.72,1.65), materials.wall,
    homes.map(h => ({x:h.x,y:.36,z:h.z,sx:1,sy:1,sz:1,ry:h.r}))).name = '平原村落房屋'
  instances(prismRoof(), materials.roof,
    homes.map(h => ({x:h.x,y:.72,z:h.z,sx:1,sy:1,sz:1,ry:h.r}))).name = '村落坡屋顶'
  const openings = homes.flatMap(h => [-.31,.31].map(dx => ({
    x:h.x + dx, y:.43, z:h.z + (h.r === 0 ? .828 : -.828), sx:.23, sy:.25, sz:1, ry:h.r,
  })))
  instances(new THREE.PlaneGeometry(1,1), materials.windows, openings).name = '屋窗'
  instances(fieldGeometry, materials.path, [{x:19.2,y:.015,z:-10.75,sx:7.7,sy:1,sz:.9}]).name = '村道'

  const trees = [{x:15.8,z:-13.1},{x:15.8,z:-8.6},{x:22.7,z:-10.8},{x:-16.7,z:2.75},
    {x:-21,z:3.4},{x:-21,z:9.4},{x:12.8,z:9},{x:-12.8,z:-8},{x:12.8,z:-2}]
  instances(new THREE.CylinderGeometry(.035,.065,.65,7), materials.trunk,
    trees.map(t=>({x:t.x,y:.325,z:t.z,sx:1,sy:1,sz:1}))).name = '树干'
  const crowns = trees.flatMap((t,i) => [
    {x:t.x,y:.92,z:t.z,sx:.45+(i%3)*.04,sy:.68,sz:.42},
    {x:t.x-.18,y:.81,z:t.z+.08,sx:.34,sy:.42,sz:.36},
    {x:t.x+.19,y:.82,z:t.z-.07,sx:.32,sy:.46,sz:.34},
  ])
  instances(new THREE.IcosahedronGeometry(1,2), materials.tree,crowns).name = '低饱和树冠'

  // Kaifeng's Iron Pagoda: thirteen octagonal storeys, firmly seated on the plain.
  const tower = new THREE.Group(); tower.name = '开封铁塔位置示意'; root.add(tower)
  tower.position.set(-18.25,0,6.2)
  tower.scale.setScalar(2.5)
  mesh(new THREE.CylinderGeometry(.94,.98,.08,8,1,false,Math.PI/8),materials.path,tower).position.y=.04
  mesh(new THREE.CylinderGeometry(.72,.82,.08,8,1,false,Math.PI/8),materials.towerTrim,tower).position.y=.12
  const towerWalls = [], towerEaves = [], towerWindows = [], towerFrames = [], towerBrackets = []
  let floorBase=.16
  for (let i = 0; i < 13; i++) {
    const radius=.60*Math.pow(.95,i), floorHeight=i===0?.5:.265, eaveHeight=i===0?.065:.055, wallHeight=floorHeight-eaveHeight
    towerWalls.push({x:0,y:floorBase+wallHeight/2,z:0,sx:radius,sy:wallHeight,sz:radius})
    towerEaves.push({x:0,y:floorBase+wallHeight,z:0,sx:radius,sy:eaveHeight,sz:radius})
    const slope=.05*radius*Math.cos(Math.PI/8)/wallHeight
    for(let side=0;side<8;side++) {
      const angle=side*Math.PI/4, normalX=Math.sin(angle),normalZ=Math.cos(angle)
      if(side%2===0) {
        const windowHeight=i===0?.32:.132, windowWidth=(i===0?.13:.093)*(radius/.6)
        const localY=i===0?windowHeight/2+.013:wallHeight*.51
        const distance=radius*(1-.05*localY/wallHeight)*Math.cos(Math.PI/8)+.0015
        const transform={x:normalX*distance,y:floorBase+localY,z:normalZ*distance,
          sx:windowWidth,sy:windowHeight,sz:1,ry:angle,rx:-Math.atan(slope)}
        towerWindows.push(transform)
        towerFrames.push({...transform,x:normalX*(distance+.0005),z:normalZ*(distance+.0005)})
      }
      // Six short corbel blocks per face reproduce the dense eave-support rhythm.
      const wallDistance=radius*.95*Math.cos(Math.PI/8), faceWidth=radius*.95*Math.sin(Math.PI/8)*2
      for(let bracket=0;bracket<6;bracket++) {
        const tangent=(bracket/5-.5)*faceWidth*.82, outward=wallDistance+.014*radius/.6
        towerBrackets.push({x:normalX*outward+normalZ*tangent,y:floorBase+wallHeight-.014,z:normalZ*outward-normalX*tangent,
          sx:.025*radius/.6,sy:.028,sz:.032*radius/.6,ry:angle})
      }
    }
    floorBase+=floorHeight
  }
  instances(new THREE.CylinderGeometry(.95,1,1,8,1,false,Math.PI/8),materials.towerBrick,towerWalls,tower).name='十三层八角琉璃砖塔身'
  instances(octagonalProfile([[.95,0],[.99,.12],[.99,.25],[1.045,.25],[1.045,.42],[1.105,.42],[1.105,.60],[1.08,.7],[1.01,.88],[.95,1]]),
    materials.towerTrim,towerEaves,tower).name='十三层收分叠涩挑檐'
  instances(pointedOpening(),materials.towerOpening,towerWindows,tower).name='贴合八角塔面的圭形门与塔窗'
  instances(pointedOpening(true),materials.towerBrick,towerFrames,tower).name='门窗叠涩尖拱边框'
  instances(new THREE.BoxGeometry(1,1,1),materials.towerTrim,towerBrackets,tower).name='檐下细部斗栱'
  const topRadius=.6*Math.pow(.95,13)
  const roofTop=mesh(octagonalProfile([[topRadius,0],[topRadius*1.1,.025],[topRadius*.75,.075],[.07,.13]]),materials.towerTrim,tower)
  roofTop.position.y=floorBase;roofTop.castShadow=true
  const spire=mesh(octagonalProfile([[.055,0],[.075,.02],[.064,.055],[.027,.09],[.027,.13],[.062,.135],
    [.062,.15],[.024,.16],[.024,.20],[.048,.205],[.048,.22],[.020,.23],[.020,.27],[.038,.28],[.03,.31],[.008,.35],[0,.368]]),materials.towerTrim,tower)
  spire.position.y=floorBase+.13;spire.castShadow=true

  let current = Number.NaN, section = false, sedimentVisible = true, disposed = false
  const anchors: Record<string,[number,number,number]> = {}
  root.userData.anchors = anchors
  root.userData.waterGroup = waterGroup
  root.userData.sectionBehavior = '前侧 z=16 断面保持不动；剖面模式隐藏两岸农田、房屋和树木，保留平原铁塔作为高程参照。'

  function update(progress:number,scenario:LeveeScenario='raised',visualProgress=progress) {
    if (disposed) return
    const next=clamp(progress),changed=next!==current||scenario!==currentScenario
    current=next;currentScenario=scenario
    containedSurface.visible=containedBody.visible=scenario==='raised'
    overflow.root.visible=scenario==='fixed'
    if(scenario==='fixed')overflow.update(current,visualProgress)
    if(!changed)return
    const h = riverHeights(current,currentScenario), width = waterWidth(current)
    const top = topGeometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < top.count; i++) top.setY(i, surface(top.getX(i), current,currentScenario))
    top.needsUpdate = true; topGeometry.computeVertexNormals(); topGeometry.computeBoundingSphere()
    layers.forEach(({geo,low,high,object}, index) => {
      const positions = geo.getAttribute('position') as THREE.BufferAttribute
      const uvs = geo.getAttribute('uv') as THREE.BufferAttribute
      perimeter.forEach(([x],i) => {
        const a=low(x,current), b=high(x,current)
        positions.setY(i*2,a); positions.setY(i*2+1,b)
        uvs.setY(i*2,a/4); uvs.setY(i*2+1,b/4)
      })
      positions.needsUpdate=true; uvs.needsUpdate=true
      geo.computeVertexNormals(); geo.computeBoundingSphere()
      if (index === 3) object.visible = current > .00001
    })
    if(scenario==='raised') {
    const ws = waterSurface.getAttribute('position') as THREE.BufferAttribute
    const wb = waterBody.getAttribute('position') as THREE.BufferAttribute
    const wbUV = waterBody.getAttribute('uv') as THREE.BufferAttribute
    ws.setY(0,h.water)
    waterPerimeter.forEach(([i],index)=>{ws.setX(index+1,waterX(i,width));ws.setY(index+1,h.water)})
    for(let row=0;row<=SAND_Z_STEPS;row++)for(let i=0;i<=waterSteps;i++) {
      const index=row*(waterSteps+1)+i
      wb.setX(index,waterX(i,width));wb.setY(index,waterFloor(i,row,current,width))
    }
    for(let i=0;i<=waterSteps;i++) {
      const x=waterX(i,width)
      const back=waterFloor(i,0,current,width),front=waterFloor(i,SAND_Z_STEPS,current,width)
      for(let k=0;k<4;k++) {
        const index=capOffset+i*4+k,y=k%2===1?h.water:k===0?back:front
        wb.setX(index,x);wb.setY(index,y);wbUV.setY(index,y/4)
      }
    }
    ws.needsUpdate=true; wb.needsUpdate=true; wbUV.needsUpdate=true
    waterSurface.computeBoundingSphere(); waterBody.computeVertexNormals(); waterBody.computeBoundingSphere()
    }
    anchors.bed = [0,h.bed,Z+.03]
    anchors.water = [0,h.water,5]
    anchors.levee = [7.25,h.levee,9]
    anchors.plain = [16.3,.04,11]
    anchors.sediment = [-1.6,mix(-1.4,h.bed,.5),Z+.04]
    anchors.tower = [-18.25,10.845,6.2]
  }
  update(0)
  return {
    root, update,
    updateWater(elapsed: number) { if (!disposed) {const time=Number.isFinite(elapsed)?elapsed:0;materials.updateWater(time);overflow.updateWater(time)} },
    setSection(enabled: boolean) { section = enabled; details.visible = !section },
    setWaterVisible(enabled: boolean) { waterGroup.visible = enabled },
    // The geometric layer remains closed when its teaching highlight is disabled.
    setSedimentVisible(enabled: boolean) {
      sedimentVisible = enabled
      sediment.material = sedimentVisible ? materials.deposited : materials.original
      materials.setDepositionReveal(enabled)
      overflow.setReveal(enabled)
    },
    dispose() {
      if (disposed) return
      disposed = true
      root.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose() })
      overflow.dispose();ownedGeometries.forEach(g=>g.dispose()); materials.dispose(); root.clear()
    },
  }
}
