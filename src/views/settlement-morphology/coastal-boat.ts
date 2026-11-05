import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Small open wooden fishing boat. Local y=0 is the loaded waterline. */
export function createCoastalBoat(index: number): THREE.Group {
  const group = new THREE.Group()
  group.name = `coastal-open-fishing-boat-${index}`
  const color = ['#536d74', '#a45b45', '#b59c60', '#56766a'][index % 4]!
  const paint = new THREE.MeshStandardMaterial({ color, roughness: .68, metalness: .04, side: THREE.DoubleSide })
  const cream = new THREE.MeshStandardMaterial({ color: '#d9d1b8', roughness: .9, side: THREE.DoubleSide })
  const data = new Uint8Array(128 * 128 * 4)
  for (let y=0;y<128;y++) for(let x=0;x<128;x++) {
    const n = Math.sin(x * 18.19 + y * 81.77) * 43758.5
    const v = 196 + 20 * Math.sin(x * .4 + Math.sin(y * .06)) + 12 * (n - Math.floor(n))
    const offset=(y*128+x)*4
    data[offset]=v;data[offset+1]=v;data[offset+2]=v;data[offset+3]=255
  }
  const texture = new THREE.DataTexture(data,128,128)
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.needsUpdate=true
  const wood = new THREE.MeshStandardMaterial({ color:'#a78b65',map:texture,roughness:.94 })
  const dark = new THREE.MeshStandardMaterial({ color:'#343f3d',roughness:.72,metalness:.15 })
  const rope = new THREE.MeshStandardMaterial({ color:'#bca985',roughness:1 })
  const pieces = new Map<THREE.Material, THREE.BufferGeometry[]>()
  function add(geometry:THREE.BufferGeometry, material:THREE.Material, position?:THREE.Vector3, rotation?:THREE.Euler) {
    const matrix = new THREE.Matrix4().compose(position ?? new THREE.Vector3(),new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler()),new THREE.Vector3(1,1,1))
    const transformed=geometry.index?geometry.toNonIndexed():geometry.clone()
    transformed.applyMatrix4(matrix)
    if(!transformed.getAttribute('uv')) transformed.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(transformed.getAttribute('position').count*2),2))
    const list=pieces.get(material)??[];list.push(transformed);pieces.set(material,list);geometry.dispose()
  }
  function box(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material) { add(new THREE.BoxGeometry(w,h,d),material,new THREE.Vector3(x,y,z)) }
  function tube(points:THREE.Vector3[],radius:number,material:THREE.Material) { add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(12,points.length*3),radius,6,false),material) }
  const rings=32, cross=16
  function width(t:number) { return .315*Math.pow(Math.sin(Math.PI*t),.68)*(1.08-.2*t) }
  function rim(t:number) { return .14+.13*Math.pow(Math.abs(t*2-1),3) }
  function insideY(x:number,z:number) {
    const t=(z+.82)/1.64,w=width(t)-.018,depth=.31*Math.sin(Math.PI*t)-.003
    return rim(t)-depth*Math.sqrt(Math.max(0,1-(x/w)**2))
  }
  function insideWidth(y:number,z:number) {
    const t=(z+.82)/1.64,depth=.31*Math.sin(Math.PI*t)-.003
    return (width(t)-.018)*Math.sqrt(Math.max(0,1-((rim(t)-y)/depth)**2))
  }
  function hull(inner:boolean) {
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[]
    for(let i=0;i<=rings;i++) {
      const t=.006+i/rings*.988,w=width(t),z=-.82+t*1.64,top=rim(t)
      for(let j=0;j<=cross;j++) {
        const a=-Math.PI/2+j/cross*Math.PI
        vertices.push((w-(inner?.018:0))*Math.sin(a),top-(.31*Math.sin(Math.PI*t)+.02-(inner?.023:0))*Math.cos(a),z)
        uv.push(j/cross,t*2)
      }
    }
    for(let i=0;i<rings;i++)for(let j=0;j<cross;j++) { const a=i*(cross+1)+j,b=a+cross+1;indices.push(a,a+1,b,a+1,b+1,b) }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals()
    add(geometry,inner?cream:paint)
  }
  hull(false);hull(true)
  for(const side of [-1,1]) {
    const points=Array.from({length:25},(_,i)=>{const t=.006+i/24*.988;return new THREE.Vector3(width(t)*side,rim(t)+.004,-.82+t*1.64)})
    tube(points,.018,wood)
    tube(points.map(p=>new THREE.Vector3(p.x*.98,p.y-.04,p.z)),.008,cream)
  }
  for(const t of [.006,.994]) {
    const z=-.82+t*1.64,w=width(t),top=rim(t),depth=.31*Math.sin(Math.PI*t)+.02
    tube([new THREE.Vector3(-w,top+.004,z),new THREE.Vector3(0,top+.007,z),new THREE.Vector3(w,top+.004,z)],.018,wood)
    const vertices=[0,top,z],indices:number[]=[]
    for(let j=0;j<=cross;j++){const a=-Math.PI/2+j/cross*Math.PI;vertices.push(w*Math.sin(a),top-depth*Math.cos(a),z);if(j<cross)indices.push(0,j+1,j+2)}
    const cap=new THREE.BufferGeometry();cap.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));cap.setIndex(indices);cap.computeVertexNormals();add(cap,paint)
  }
  // Transverse seats, narrow floorboards and ribs leave the open hull readable.
  for(const z of [-.43,.13,.47]) {
    const y=rim((z+.82)/1.64)-.055
    const half=Math.min(...[-.0575,0,.0575].map(dz=>insideWidth(y-.0175,z+dz)))-.004
    box(half*2,.035,.115,0,y,z,wood)
  }
  // Curved planks follow the rising inner hull instead of slicing through its ends.
  for(const x of [-.11,-.055,0,.055,.11]) {
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[],segments=28
    for(let i=0;i<=segments;i++) {
      const z=-.4+i/segments*.82
      for(const dy of [.026,.008])for(const side of [-1,1]) {
        const xx=x+side*.0245
        vertices.push(xx,insideY(xx,z)+dy,z);uv.push(side<0?0:1,i/segments*2)
      }
      if(i<segments){const a=i*4,b=a+4;indices.push(a,a+1,b,a+1,b+1,b,a+2,b+2,a+3,a+3,b+2,b+3,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1)}
    }
    indices.push(0,2,1,1,2,3)
    const end=segments*4;indices.push(end,end+1,end+2,end+1,end+3,end+2)
    // The top faces upward; wood is single-sided in the actual WebGL material.
    for(let i=0;i<indices.length;i+=3){const index=indices[i+1]!;indices[i+1]=indices[i+2]!;indices[i+2]=index}
    const plank=new THREE.BufferGeometry();plank.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));plank.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));plank.setIndex(indices);plank.computeVertexNormals();add(plank,wood)
  }
  for(const z of [-.3,.33]) {
    const w=width((z+.82)/1.64)-.031
    tube(Array.from({length:17},(_,i)=>{const x=w*Math.sin(-Math.PI/2+i/16*Math.PI);return new THREE.Vector3(x,insideY(x,z)+.013,z)}),.011,wood)
  }
  // A pair of oars resting across the gunwale; metal rowlocks meet the rim.
  for(const side of [-1,1]) {
    const t=(.07+.82)/1.64,lock=new THREE.Vector3(side*(width(t)+.003),rim(t)+.035,.07)
    const grip=new THREE.Vector3(side*.08,.13,-.45),tip=new THREE.Vector3(side*.48,.20,.66)
    tube([grip,lock,tip],.011,wood)
    const blade=new THREE.SphereGeometry(1,10,6);blade.scale(.031,.011,.13);add(blade,wood,new THREE.Vector3(side*.51,.205,.74),new THREE.Euler(0,Math.atan2(side*.03,.08),0))
    const lockRotation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),tip.clone().sub(grip).normalize()))
    add(new THREE.TorusGeometry(.027,.007,5,10),dark,lock,lockRotation)
    box(.018,.035,.018,lock.x,rim(t)+.0175,lock.z,dark)
  }
  // Coiled mooring rope and a small fish crate, never a slab covering the boat.
  const ropeY=rim((-.43+.82)/1.64)-.055+.0175+.006
  for(let ring=0;ring<3;ring++) add(new THREE.TorusGeometry(.032+ring*.013,.005,5,20),rope,new THREE.Vector3(.02,ropeY,-.43),new THREE.Euler(Math.PI/2,0,0))
  const crateZ=.30,crateBase=Math.max(...[-.06,.08].flatMap(x=>[-.09,.09].map(dz=>insideY(x,crateZ+dz))))+.028
  for(const x of [-.045,.065])for(const dz of [-.07,.07]) {
    const bottom=insideY(x,crateZ+dz)+.026,h=Math.max(.006,crateBase-bottom)
    box(.018,h,.018,x,bottom+h/2,crateZ+dz,wood)
  }
  box(.14,.08,.18,.01,crateBase+.04,crateZ,wood)
  box(.125,.008,.16,.01,crateBase+.084,crateZ,dark)
  for(let i=0;i<3;i++) {
    const fish=new THREE.SphereGeometry(1,8,5);fish.scale(.016,.009,.05);add(fish,cream,new THREE.Vector3(-.03+i*.035,crateBase+.096,crateZ+i*.012),new THREE.Euler(0,.3,0))
  }
  if(index%2===0) {
    box(.07,.10,.07,0,.15,-.77,dark)
    box(.027,.25,.035,0,-.025,-.8,dark)
    box(.08,.014,.025,0,-.16,-.82,dark)
  }
  for(const [material,geometries] of pieces) {
    const geometry=mergeGeometries(geometries,false)!
    geometries.forEach(part=>part.dispose());geometry.computeBoundingSphere()
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)
  }
  return group
}
