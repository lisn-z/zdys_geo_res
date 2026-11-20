import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { createHazardHouse } from '@/views/landslide-debris-flow/hazard-assets'
import { COAST_BOUNDS, HOUSES, houseBaseHeight, terrainHeight, type House } from './experiment'

/** Forty buildings share a small material palette and static geometry batches.
 * All buildings, paved parcels and foundations fit between the road centrelines.
 * Doorways, window recesses, floor bands, balconies and roof equipment provide
 * architectural scale rather than representing the city as coloured boxes.
 */
export function createCoastalCity(houses: readonly House[] = HOUSES) {
  const group = new THREE.Group(); group.name = 'coastal-city'
  const template = createHazardHouse(37); template.updateMatrixWorld(true)
  const templateBounds=new THREE.Box3().setFromObject(template),templateSize=templateBounds.getSize(new THREE.Vector3()),templateCenter=templateBounds.getCenter(new THREE.Vector3())
  const templateMaterials = new Map<string, THREE.MeshStandardMaterial>()
  const originalGeometries = new Set<THREE.BufferGeometry>()
  template.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return
    originalGeometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (material instanceof THREE.MeshStandardMaterial) templateMaterials.set(material.name, material)
    }
  })
  const wall = templateMaterials.get('walls')!, roof = templateMaterials.get('roof-tiles')!
  const stone = templateMaterials.get('foundation-and-sills')!, timber = templateMaterials.get('timber')!
  const glass = templateMaterials.get('window-glass')!, trim = templateMaterials.get('window-frames')!
  const walls = ['#c9c4b6', '#b9b9ad', '#c1b09c'].map(color => { const material = wall.clone(); material.color.set(color); return material })
  const roofs = ['#727975', '#76685c'].map(color => { const material = roof.clone(); material.color.set(color); return material })
  const concrete = stone.clone(); concrete.color.set('#b2b4a9'); concrete.normalScale.set(.21, .21)
  const paving = stone.clone(); paving.color.set('#9d9e90'); paving.normalScale.set(.14, .14)
  const rail = new THREE.MeshStandardMaterial({ color: '#56625f', metalness: .42, roughness: .57 })
  const equipment = new THREE.MeshStandardMaterial({ color: '#a6ada8', metalness: .34, roughness: .63 })
  const materials = new Set<THREE.Material>([...templateMaterials.values(), ...walls, ...roofs, concrete, paving, rail, equipment])
  const textures = new Set<THREE.Texture>()
  for (const material of materials) for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1), cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 12)
  const matrix = new THREE.Matrix4(), dummy = new THREE.Object3D()
  let originX = 0, originY = 0, originZ = 0
  function add(source: THREE.BufferGeometry, material: THREE.Material, transform: THREE.Matrix4) {
    let geometry = source.clone().applyMatrix4(transform)
    if (geometry.index) { const unpacked = geometry.toNonIndexed(); geometry.dispose(); geometry = unpacked }
    const parts = batches.get(material) ?? []; parts.push(geometry); batches.set(material, parts)
  }
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
    dummy.position.set(originX + x, originY + y, originZ + z)
    dummy.rotation.set(0, 0, 0); dummy.scale.set(w, h, d); dummy.updateMatrix()
    add(boxGeometry, material, dummy.matrix)
  }
  function cylinder(radius: number, height: number, x: number, y: number, z: number, material: THREE.Material) {
    dummy.position.set(originX + x, originY + y, originZ + z)
    dummy.rotation.set(0, 0, 0); dummy.scale.set(radius, height, radius); dummy.updateMatrix()
    add(cylinderGeometry, material, dummy.matrix)
  }
  function roofGeometry(width: number, depth: number, y: number, rise: number) {
    const w = width / 2, d = depth / 2, g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      -w,y,-d, -w,y,d, 0,y+rise,d, 0,y+rise,-d,
      0,y+rise,-d, 0,y+rise,d, w,y,d, w,y,-d,
    ],3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,0,2,1,2,1,0,0,0,0,2,1,2,1,0],2))
    g.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]); g.computeVertexNormals(); return g
  }
  function gables(width: number, depth: number, y: number, rise: number) {
    const w=width/2,d=depth/2,g=new THREE.BufferGeometry()
    g.setAttribute('position',new THREE.Float32BufferAttribute([-w,y,-d,0,y+rise,-d,w,y,-d,-w,y,d,0,y+rise,d,w,y,d],3))
    g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,.5,.5,1,0,0,0,.5,.5,1,0],2))
    g.setIndex([0,1,2,3,5,4]);g.computeVertexNormals();return g
  }
  function pavedParcel(house: House) {
    const x0=house.x-6.5,x1=house.x+6.5,z0=Math.max(COAST_BOUNDS.minZ+.2,house.z-8),z1=Math.min(COAST_BOUNDS.maxZ-.2,house.z+8)
    const p:number[]=[],uv:number[]=[],idx:number[]=[]
    for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){const x=x0+(x1-x0)*i/4,z=z0+(z1-z0)*j/4;p.push(x,terrainHeight(x,z)+.024,z);uv.push(i/2,j/2)}
    for(let j=0;j<4;j++)for(let i=0;i<4;i++){const a=j*5+i;idx.push(a,a+5,a+1,a+1,a+5,a+6)}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals()
    add(g,paving,matrix.identity());g.dispose()
  }
  for (let index = 0; index < houses.length; index++) {
    const house = houses[index]!, foundation = houseBaseHeight(house)
    pavedParcel(house)
    originX = house.x; originY = foundation; originZ = house.z
    const footW = house.width + .2, footD = house.depth + .2
    let low = Infinity
    for(let i=0;i<=6;i++)for(let j=0;j<=6;j++)low=Math.min(low,terrainHeight(house.x-footW/2+footW*i/6,house.z-footD/2+footD*j/6))
    low -= .12
    box(footW,foundation-low,footD,0,(low-foundation)/2,0,concrete)
    const wallMaterial=walls[index%walls.length]!,roofMaterial=roofs[index%roofs.length]!
    if (house.style === 'coastal') {
      const transform=new THREE.Matrix4().compose(new THREE.Vector3(house.x,foundation,house.z),new THREE.Quaternion(),new THREE.Vector3(house.width/templateSize.x,1.4,house.depth/templateSize.z))
      transform.multiply(new THREE.Matrix4().makeTranslation(-templateCenter.x,0,-templateCenter.z))
      template.traverse(object=>{
        if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return
        const material=object.material===wall?wallMaterial:object.material===roof?roofMaterial:object.material
        add(object.geometry,material,new THREE.Matrix4().multiplyMatrices(transform,object.matrixWorld))
      })
      continue
    }
    const floorHeight=3.15,height=house.storeys*floorHeight,bodyW=7.25,bodyD=8.7
    box(bodyW,height,bodyD,0,height/2,0,wallMaterial)
    box(bodyW+.10,.25,bodyD+.10,0,.125,0,stone)
    for(let floor=0;floor<house.storeys;floor++){
      const base=floor*floorHeight
      if(floor>0)box(bodyW+.18,.13,bodyD+.18,0,base+.04,0,concrete)
      for(const sign of [-1,1])for(const x of [-2.35,0,2.35]){
        const entrance=floor===0&&sign===1&&x===0
        const balcony=house.style==='apartment'&&floor>0&&x!==0
        const windowHeight=entrance?2.25:balcony?2.05:1.45
        const windowY=base+(entrance?1.18:balcony?1.31:1.7),windowWidth=entrance?1.5:1.3,z=sign*(bodyD/2+.035)
        box(windowWidth+.18,windowHeight+.18,.09,x,windowY,z,trim)
        box(windowWidth,windowHeight,.10,x,windowY,z+sign*.055,entrance?timber:glass)
        box(.055,windowHeight,.115,x,windowY,z+sign*.115,rail)
        if(!entrance){
          box(windowWidth,.055,.12,x,windowY-.12,z+sign*.12,rail)
          box(windowWidth+.25,.09,.27,x,windowY-windowHeight/2-.10,z+sign*.08,concrete)
        }
        if(balcony){
          const edge=sign*4.96,deck=base+.22
          box(2.18,.14,.66,x,deck,sign*4.65,concrete)
          box(2.16,.055,.055,x,deck+.88,edge,rail)
          for(const dx of [-.96,-.48,0,.48,.96])box(.04,.80,.04,x+dx,deck+.45,edge,rail)
          for(const dx of [-1.02,1.02])box(.045,.055,.64,x+dx,deck+.88,sign*4.64,rail)
        }
      }
      for(const sign of [-1,1])for(const z of [-2.7,0,2.7]){
        const x=sign*(bodyW/2+.035),y=base+1.7
        box(.09,1.6,1.34,x,y,z,trim);box(.10,1.42,1.16,x+sign*.055,y,z,glass)
        box(.12,1.42,.05,x+sign*.11,y,z,rail)
        box(.26,.09,1.44,x+sign*.08,y-.82,z,concrete)
      }
    }
    if(house.style==='block'){
      const roofShape=roofGeometry(8,10,height+.04,1.2),gable=gables(bodyW,bodyD,height,1.17)
      matrix.makeTranslation(house.x,foundation,house.z);add(roofShape,roofMaterial,matrix);add(gable,wallMaterial,matrix);roofShape.dispose();gable.dispose()
      box(.18,.12,10,0,height+1.28,0,roofMaterial)
      for(const sign of [-1,1])box(.10,.12,10,sign*3.97,height-.02,0,rail)
    }else{
      box(7.65,.19,9.1,0,height+.06,0,concrete)
      for(const sign of [-1,1]){box(7.65,.52,.16,0,height+.37,sign*4.48,concrete);box(.16,.52,8.8,sign*3.74,height+.37,0,concrete)}
      box(2.15,1.65,2.6,-1.65,height+.97,-1.6,wallMaterial)
      box(2.35,.17,2.8,-1.65,height+1.87,-1.6,concrete)
      box(.72,1.25,.08,-1.65,height+.80,-.26,timber)
      cylinder(.65,1.3,1.5,height+1.06,-1.8,equipment)
      cylinder(.70,.09,1.5,height+1.75,-1.8,rail)
      for(const x of [1.0,2.0])box(.08,.48,.08,x,height+.42,-1.8,rail)
      box(1.25,.64,.80,1.7,height+.46,1.9,equipment)
      for(let i=0;i<5;i++)box(.92,.035,.035,1.7,height+.24+i*.095,2.31,rail)
    }
    // An entrance canopy and steps meet the paved parcel, not the road itself.
    box(2.0,.13,.85,0,2.58,4.64,concrete)
    box(1.9,.12,.45,0,.06,4.72,stone)
  }
  boxGeometry.dispose();cylinderGeometry.dispose();originalGeometries.forEach(geometry=>geometry.dispose())
  let triangles=0
  for(const [material,parts] of batches){
    const geometry=mergeGeometries(parts,false);parts.forEach(part=>part.dispose())
    if(!geometry)continue
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`city-${material.name||material.type}`
    mesh.castShadow=material!==paving;mesh.receiveShadow=true;group.add(mesh)
    triangles+=geometry.getAttribute('position').count/3
  }
  group.userData.buildingCount=houses.length;group.userData.drawCalls=group.children.length;group.userData.triangles=triangles
  let disposed=false
  return { group, dispose(){
    if(disposed)return;disposed=true;group.removeFromParent()
    group.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose()})
    materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose())
  } }
}
