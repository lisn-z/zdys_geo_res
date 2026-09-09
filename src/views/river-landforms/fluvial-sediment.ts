import * as THREE from 'three'
import { FAN, FAN_ATLAS, fanTraceDepth } from './fluvial-fan'
import { clamp, evolution, fanAmount, fieldHeight, hash, lerp, smooth, type Evolution, type Field } from './fluvial-model'

/** Low, partly buried gravel, with coarser clasts toward the mountain mouth. */
export function createFanSediment(field: Field) {
  const group=new THREE.Group()
  group.name='冲积扇砂砾'
  const complete=evolution(1)
  const locations:Array<{x:number;z:number;size:number;angle:number;stretch:number}>=[]
  for(let i=0;i<4300;i++){
    const x=FAN_ATLAS.x+hash(i,204)*FAN_ATLAS.width,z=FAN.z+hash(i,632)*FAN.length
    if(fanAmount(x,z,complete)<.24)continue
    const gravelBelt=clamp(fanTraceDepth(x,z)*16)
    if(hash(i,831)>.25+gravelBelt*.72)continue
    const downstream=clamp((z-FAN.z)/FAN.length)
    const size=lerp(.02,.072,hash(i,136)**2)*lerp(1.18,.58,downstream)
    locations.push({x,z,size,angle:hash(i,458)*Math.PI*2,stretch:.75+hash(i,37)*.65})
  }
  const geometry=new THREE.IcosahedronGeometry(1,1)
  const position=geometry.getAttribute('position')
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i)
    // Deterministic coordinate noise keeps duplicated face vertices together.
    const irregular=.87+.16*Math.sin(x*6.2+y*3.4+z*5.7)
    position.setXYZ(i,x*irregular,y*irregular,z*irregular)
  }
  geometry.computeVertexNormals()
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.98,metalness:0,envMapIntensity:.15})
  const mesh=new THREE.InstancedMesh(geometry,material,locations.length)
  mesh.name='贴地砂砾颗粒'
  mesh.receiveShadow=true
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled=false
  const transform=new THREE.Object3D(),color=new THREE.Color()
  const palette=['#71675a','#958574','#b5a58c','#5f625b','#c6b79e','#867966']
  locations.forEach((_,i)=>{
    color.set(palette[Math.floor(hash(i,837)*palette.length)]!).multiplyScalar(.78+hash(i,974)*.36)
    mesh.setColorAt(i,color)
  })
  group.add(mesh)
  function update(state:Evolution){
    group.visible=state.fan>.01
    if(!group.visible)return
    locations.forEach((stone,i)=>{
      const amount=fanAmount(stone.x,stone.z,state)
      const ix=Math.round(clamp((stone.x+22)/field.dx,0,field.nx))
      const iz=Math.round(clamp((stone.z+33)/field.dz,0,field.nz)),k=iz*(field.nx+1)+ix
      const dry=field.wet[k]!<.01||field.distance[k]!>field.width[k]!+.15
      const y=fieldHeight(field,stone.x,stone.z)
      const slopeX=(fieldHeight(field,stone.x+.1,stone.z)-fieldHeight(field,stone.x-.1,stone.z))/.2
      const slopeZ=(fieldHeight(field,stone.x,stone.z+.1)-fieldHeight(field,stone.x,stone.z-.1))/.2
      const size=dry&&Math.hypot(slopeX,slopeZ)<.82?stone.size*smooth(.06,.34,amount):0
      // Half-buried stones sit on the actual evolving triangular surface.
      transform.position.set(stone.x,y+size*.10,stone.z)
      transform.rotation.set(Math.atan(slopeZ)*.55,stone.angle,-Math.atan(slopeX)*.55)
      transform.scale.set(size*stone.stretch,size*.48,size*.84)
      transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix)
    })
    mesh.instanceMatrix.needsUpdate=true
  }
  return {group,update,dispose(){mesh.dispose();geometry.dispose();material.dispose();group.clear()}}
}
