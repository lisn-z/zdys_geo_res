import * as THREE from 'three'
import { GLACIER, fieldHeight, glacierWidth, hash, lerp, noise, profile, smooth, upperX, type Field } from './fluvial-model'

/** A grounded ice tongue: broad snow accumulation, fissured blue ablation ice,
 * debris bands and a closed terminus directly above the headwater channel. */
export function createValleyGlacier(field:Field){
  const group=new THREE.Group();group.name='Grounded valley glacier'
  const rows=240,cols=64,positions:number[]=[],colors:number[]=[],indices:number[]=[]
  const lightSnow=new THREE.Color('#edf0e8'),bareIce=new THREE.Color('#9dbdc0'),deepIce=new THREE.Color('#527e89'),debris=new THREE.Color('#73766e')
  const c=new THREE.Color()
  const fractures=Array.from({length:32},(_,i)=>({t:.26+hash(i,61)*.69,u:(hash(i,52)-.5)*1.3,
    half:.22+hash(i,11)*.46,skew:(hash(i,48)-.5)*.11,width:.0022+hash(i,76)*.0025,depth:.065+hash(i,35)*.10}))
  function sample(u:number,t:number){
    const z=lerp(GLACIER.startZ,GLACIER.endZ,t),x=upperX(z)+u*glacierWidth(t)
    // Cross-flow fractures are real depressions with shaded walls. Their ends
    // taper out irregularly, instead of drawing straight stripes on white ice.
    let fissure=0,cutDepth=0
    for(const crack of fractures){
      const transverse=u-crack.u,axis=crack.t+crack.skew*transverse+.005*Math.sin(u*15+crack.t*27)
      const amount=Math.exp(-(((t-axis)/crack.width)**2))*(1-smooth(crack.half*.62,crack.half,Math.abs(transverse)))
      fissure=Math.max(fissure,amount);cutDepth=Math.max(cutDepth,amount*crack.depth)
    }
    const thickness=lerp(.94,.39,smooth(.1,1,t))*Math.pow(Math.max(0,1-u*u),.58)
    const rough=(noise(x*8,z*11)-.5)*.075+(noise(x*29,z*31)-.5)*.018
    // Crevasses may cut deeply, but the exposed central tongue must retain a
    // visible ice thickness over the actual triangulated valley bed.  Keep the
    // margins free to merge into rock so the glacier does not read as a slab.
    const shapedY=profile(z)+.20+thickness+rough-cutDepth
    // Reserve enough clearance for the small headwater-bank lift that appears
    // after meltwater starts flowing; the top mesh itself remains stationary.
    const coreFloor=fieldHeight(field,x,z)+.065*(1-smooth(.60,.86,Math.abs(u)))
    const coreBlend=1-smooth(.60,.86,Math.abs(u))
    const y=Math.max(shapedY+.018*coreBlend,coreFloor)
    const moraine=smooth(.70,.96,Math.abs(u))*.58*smooth(.2,.7,t)
      +Math.exp(-(((u-.27-.05*Math.sin(t*8))/.028)**2))*smooth(.46,.76,t)*.28
    return {x,y,z,fissure,moraine}
  }
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const t=j/rows,u=i/cols*2-1,p=sample(u,t)
    positions.push(p.x,p.y,p.z)
    c.copy(lightSnow).lerp(bareIce,smooth(.19,.83,t)*.9).lerp(deepIce,p.fissure*.56).lerp(debris,p.moraine)
    c.multiplyScalar(.94+noise(p.x*12,p.z*16)*.12);colors.push(c.r,c.g,c.b)
    if(j<rows&&i<cols){const k=j*(cols+1)+i;indices.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2)}
  }
  const topGeometry=new THREE.BufferGeometry()
  topGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));topGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  topGeometry.setIndex(indices);topGeometry.computeVertexNormals()
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0,side:THREE.DoubleSide})
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vIcePosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvIcePosition=position;')
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vIcePosition;
      float iceGrain(vec3 p){return fract(sin(dot(floor(p),vec3(127.1,311.7,74.7)))*43758.5453);}`)
      .replace('#include <color_fragment>',`#include <color_fragment>
        float resolved=1.0-smoothstep(.015,.08,length(fwidth(vIcePosition)));
        float grain=iceGrain(vIcePosition*110.0)-.5;
        float foliation=sin(vIcePosition.y*49.0+sin(vIcePosition.z*3.2)*1.2);
        diffuseColor.rgb*=1.0+grain*.075*resolved+foliation*.012;`)
  }
  material.customProgramCacheKey=()=> 'grounded-fractured-glacier-1'
  const top=new THREE.Mesh(topGeometry,material);top.castShadow=true;top.receiveShadow=true;group.add(top)
  const rim:number[]=[]
  for(let i=0;i<=cols;i++)rim.push(i)
  for(let j=1;j<=rows;j++)rim.push(j*(cols+1)+cols)
  for(let i=cols-1;i>=0;i--)rim.push(rows*(cols+1)+i)
  for(let j=rows-1;j>0;j--)rim.push(j*(cols+1))
  const sideGeometry=new THREE.BufferGeometry(),sideColors:number[]=[],sideIndices:number[]=[]
  const sidePositions=new Float32Array(rim.length*6)
  rim.forEach((k,i)=>{
    c.setRGB(colors[k*3]!,colors[k*3+1]!,colors[k*3+2]!)
    sideColors.push(c.r,c.g,c.b,c.r*.66,c.g*.78,c.b*.82)
    const a=i*2,b=((i+1)%rim.length)*2;sideIndices.push(a,b,a+1,a+1,b,b+1)
  })
  sideGeometry.setAttribute('position',new THREE.BufferAttribute(sidePositions,3).setUsage(THREE.DynamicDrawUsage))
  sideGeometry.setAttribute('color',new THREE.Float32BufferAttribute(sideColors,3));sideGeometry.setIndex(sideIndices)
  const sides=new THREE.Mesh(sideGeometry,material);sides.castShadow=true;sides.receiveShadow=true;group.add(sides)
  // Irregular stones carried along the ice margins give the ablation zone scale.
  const stoneGeometry=new THREE.DodecahedronGeometry(1,0),stoneMaterial=new THREE.MeshStandardMaterial({color:'#75786c',roughness:1})
  const stones=new THREE.InstancedMesh(stoneGeometry,stoneMaterial,110),dummy=new THREE.Object3D()
  for(let i=0;i<110;i++){
    const t=.27+hash(i,32)*.71,u=(i%2?1:-1)*lerp(.77,.97,hash(i,17)),p=sample(u,t),size=lerp(.022,.075,hash(i,87))
    dummy.position.set(p.x,p.y+size*.17,p.z);dummy.rotation.set(hash(i,12)*2,hash(i,19)*6,hash(i,26)*2);dummy.scale.set(size,size*.55,size*1.36);dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix)
  }
  stones.castShadow=true;stones.receiveShadow=true;group.add(stones)
  function update(){
    const attribute=sideGeometry.attributes.position as THREE.BufferAttribute
    rim.forEach((k,i)=>{
      const x=positions[k*3]!,y=positions[k*3+1]!,z=positions[k*3+2]!
      attribute.setXYZ(i*2,x,y,z);attribute.setXYZ(i*2+1,x,Math.min(y-.035,fieldHeight(field,x,z)-.03),z)
    })
    attribute.needsUpdate=true;sideGeometry.computeVertexNormals();sideGeometry.computeBoundingSphere()
  }
  update()
  return {group,update,dispose(){topGeometry.dispose();sideGeometry.dispose();stoneGeometry.dispose();material.dispose();stoneMaterial.dispose();stones.dispose()}}
}
