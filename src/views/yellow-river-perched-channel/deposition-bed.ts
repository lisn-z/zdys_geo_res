import * as THREE from 'three'
import { riverHeights, SAND_X_STEPS as NX, SAND_Z_STEPS as NZ,
  sandGridX, sandGridZ, sandGridThickness, sandCoverThickness as fullThickness } from './river-bed-profile'
export { depositionSurfaceHeight } from './river-bed-profile'
const hash=(x:number,y:number)=>{
  const value=Math.sin(x*127.1+y*311.7)*43758.5453
  return value-Math.floor(value)
}

function makeTexture(pixel:(x:number,y:number)=>number[],color=true) {
  const size=256,data=new Uint8Array(size*size*4)
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const value=pixel(x,y),i=(y*size+x)*4
    data[i]=value[0]??0;data[i+1]=value[1]??0;data[i+2]=value[2]??0;data[i+3]=255
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter
  texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true
  return texture
}

function geometry(positions:number[],uv:number[],indices:number[]) {
  const result=new THREE.BufferGeometry()
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  result.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2))
  result.setIndex(indices);result.computeVertexNormals()
  // Conservative fixed bounds include the full progress range and avoid per-frame scans.
  result.boundingBox=new THREE.Box3(new THREE.Vector3(-5,-1.4,-16),new THREE.Vector3(5,4.43,16))
  result.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1.5,0),17.3)
  return result
}

export function createDepositionBed() {
  const root=new THREE.Group()
  root.name='贴底细沙盖层与低缓沙纹'
  root.userData.explanation='湿沙盖层随沉积增长；纵向低缓沙脊及前侧细密层理为过程示意。'
  const sand=makeTexture((x,y)=>{
    const fine=hash(x,y),larger=hash(Math.floor(x/3),Math.floor(y/3))
    const value=192+fine*43+larger*9
    return[value,value*.989,value*.958]
  })
  const grainHeight=(x:number,y:number)=>{
    const xx=(x+256)%256,yy=(y+256)%256
    return hash(xx,yy)*.10+.035*Math.sin(xx/256*Math.PI*14+.45*Math.sin(yy/256*Math.PI*4))
  }
  const normal=makeTexture((x,y)=>{
    const dx=grainHeight(x+1,y)-grainHeight(x-1,y),dy=grainHeight(x,y+1)-grainHeight(x,y-1)
    const n=new THREE.Vector3(-dx*2,-dy*2,1).normalize()
    return[(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255]
  },false)
  const bedding=makeTexture((x,y)=>{
    const warp=Math.sin(x/256*Math.PI*4)*.8+Math.sin(x/256*Math.PI*2)*1.1
    const line=Math.sin((y+warp)/256*Math.PI*24)*5+Math.sin((y+warp)/256*Math.PI*62)*2
    const value=216+line+hash(x,y)*9
    return[value,value*.984,value*.952]
  })
  const topMaterial=new THREE.MeshStandardMaterial({
    color:0x9a8c71,map:sand,normalMap:normal,normalScale:new THREE.Vector2(.19,.19),
    roughness:.98,metalness:0,vertexColors:true,
    polygonOffset:false,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  })
  const edgeMaterial=new THREE.MeshStandardMaterial({color:0xa08b66,map:bedding,roughness:1,metalness:0})
  const bottomMaterial=new THREE.MeshStandardMaterial({color:0x8c7c60,roughness:1})

  const positions:number[]=[],uv:number[]=[],indices:number[]=[],colors:number[]=[]
  const unitThickness:number[]=[],gradientX:number[]=[],gradientZ:number[]=[]
  for(let iz=0;iz<=NZ;iz++)for(let ix=0;ix<=NX;ix++) {
    const x=sandGridX(ix),z=sandGridZ(iz)
    const thickness=sandGridThickness(ix,iz)
    positions.push(x,thickness,z);uv.push(x/1.4,z/1.4);unitThickness.push(thickness)
    const delta=.025
    gradientX.push((fullThickness(x+delta,z)-fullThickness(x-delta,z))/(delta*2))
    gradientZ.push((fullThickness(x,z+delta)-fullThickness(x,z-delta))/(delta*2))
    // Restrained mottling follows the sand texture; no bright detached pebbles.
    const shade=.94+.035*Math.sin(x*1.3+z*.24)+.018*Math.cos(z*.43-x*.7)
    colors.push(shade,shade,shade*.994)
    if(ix<NX&&iz<NZ) {
      const a=iz*(NX+1)+ix,b=a+1,c=a+NX+1,d=c+1
      indices.push(a,c,b,b,c,d)
    }
  }
  const topGeometry=geometry(positions,uv,indices)
  topGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  ;(topGeometry.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage)
  ;(topGeometry.getAttribute('normal') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage)
  const top=new THREE.Mesh(topGeometry,topMaterial)
  top.name='沿流向拉长的贴底低缓沙脊';top.receiveShadow=true;root.add(top)

  // The full front/back/side perimeter shares the exact top-grid samples.
  const perimeter:[number,number][]=[]
  for(let i=0;i<=NX;i++)perimeter.push([sandGridX(i),16])
  for(let i=NZ-1;i>=0;i--)perimeter.push([5,sandGridZ(i)])
  for(let i=NX-1;i>=0;i--)perimeter.push([sandGridX(i),-16])
  for(let i=1;i<=NZ;i++)perimeter.push([-5,sandGridZ(i)])
  const edgePositions:number[]=[],edgeUV:number[]=[],edgeIndices:number[]=[],edgeThickness:number[]=[]
  let distance=0
  perimeter.forEach(([x,z],i)=>{
    if(i>0){const prev=perimeter[i-1]!;distance+=Math.hypot(x-prev[0],z-prev[1])}
    const thickness=fullThickness(x,z);edgeThickness.push(thickness)
    edgePositions.push(x,0,z,x,thickness,z)
    edgeUV.push(distance/4,0,distance/4,thickness/.25)
    if(i<perimeter.length-1){const a=i*2;edgeIndices.push(a,a+2,a+1,a+1,a+2,a+3)}
  })
  const edgeGeometry=geometry(edgePositions,edgeUV,edgeIndices)
  ;(edgeGeometry.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage)
  ;(edgeGeometry.getAttribute('uv') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage)
  const edge=new THREE.Mesh(edgeGeometry,edgeMaterial)
  edge.name='前后断面的细密微倾沉积层理';edge.receiveShadow=true;root.add(edge)

  const bottomPositions=[0,0,0],bottomUV=[0,0],bottomIndices:number[]=[]
  perimeter.forEach(([x,z],i)=>{
    bottomPositions.push(x,0,z);bottomUV.push(x/4,z/4)
    if(i<perimeter.length-1)bottomIndices.push(0,i+2,i+1)
  })
  const bottomGeometry=geometry(bottomPositions,bottomUV,bottomIndices)
  ;(bottomGeometry.getAttribute('position') as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage)
  const bottom=new THREE.Mesh(bottomGeometry,bottomMaterial)
  bottom.name='与原河床严密贴合的沙盖底面';root.add(bottom)

  let current=Number.NaN,disposed=false
  const n=new THREE.Vector3()
  function update(progress:number) {
    if(disposed)return
    const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0))
    if(p===current)return
    current=p;root.visible=p>0
    // Only the sub-millimetre startup cap needs an offset against the original flat bed.
    // The front/back interfaces are geometrically disjoint and never use polygon offset.
    topMaterial.polygonOffset=p>0&&p<.005
    const bed=riverHeights(p).bed
    const tp=topGeometry.getAttribute('position') as THREE.BufferAttribute
    const tn=topGeometry.getAttribute('normal') as THREE.BufferAttribute
    for(let i=0;i<tp.count;i++) {
      tp.setY(i,bed+unitThickness[i]!*p)
      n.set(-gradientX[i]!*p,1,-gradientZ[i]!*p).normalize();tn.setXYZ(i,n.x,n.y,n.z)
    }
    tp.needsUpdate=true;tn.needsUpdate=true
    const ep=edgeGeometry.getAttribute('position') as THREE.BufferAttribute
    const eu=edgeGeometry.getAttribute('uv') as THREE.BufferAttribute
    perimeter.forEach((_,i)=>{
      ep.setY(i*2,bed);ep.setY(i*2+1,bed+edgeThickness[i]!*p)
      eu.setY(i*2+1,edgeThickness[i]!*p/.25)
    })
    ep.needsUpdate=true;eu.needsUpdate=true
    const bp=bottomGeometry.getAttribute('position') as THREE.BufferAttribute
    for(let i=0;i<bp.count;i++)bp.setY(i,bed)
    bp.needsUpdate=true
  }
  update(0)
  return {
    root,update,
    // A sediment toggle changes emphasis, never removes the physical water/ground interface.
    setVisible(visible:boolean){
      root.userData.highlightEnabled=visible
      root.visible=current>0
      topMaterial.color.setHex(visible?0x9a8c71:0x827b65)
      edgeMaterial.color.setHex(visible?0xa08b66:0x8f826b)
      edgeMaterial.map=visible?bedding:sand
    },
    dispose(){
      if(disposed)return
      disposed=true
      ;[topGeometry,edgeGeometry,bottomGeometry].forEach(g=>g.dispose())
      ;[topMaterial,edgeMaterial,bottomMaterial].forEach(m=>m.dispose())
      ;[sand,normal,bedding].forEach(t=>t.dispose())
      root.clear()
    },
  }
}
