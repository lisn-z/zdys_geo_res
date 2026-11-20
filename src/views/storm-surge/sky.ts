import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

/** The visible sky, water reflections and material lighting share one Sky. */
export function createSurgeSky(renderer:THREE.WebGLRenderer,sunDirection:THREE.Vector3){
  const sky=new Sky()
  sky.name='coastal-sky'
  sky.scale.setScalar(20000)
  sky.frustumCulled=false
  sky.renderOrder=-900
  sky.material.depthWrite=false
  sky.material.fog=false
  const uniforms=sky.material.uniforms
  uniforms.turbidity!.value=2.4
  uniforms.rayleigh!.value=2.0
  uniforms.mieCoefficient!.value=.002
  uniforms.mieDirectionalG!.value=.76
  ;(uniforms.sunPosition!.value as THREE.Vector3).copy(sunDirection).multiplyScalar(450000)
  if(uniforms.showSunDisc)uniforms.showSunDisc.value=.000025
  if(uniforms.cloudCoverage)uniforms.cloudCoverage.value=.32
  if(uniforms.cloudDensity)uniforms.cloudDensity.value=.36
  if(uniforms.cloudElevation)uniforms.cloudElevation.value=.28
  // Keep the existing scene exposure; attenuate only the physical sky radiance.
  uniforms.surgeSkyRadiance={value:.24}
  sky.material.fragmentShader='uniform float surgeSkyRadiance;\n'+sky.material.fragmentShader.replace(
    /#include\s*<tonemapping_fragment>/,
    'gl_FragColor.rgb *= surgeSkyRadiance;\n#include <tonemapping_fragment>',
  )
  const eye=new THREE.Vector3()
  sky.onBeforeRender=(_renderer,_scene,camera)=>{
    // Water renders with a reflected camera before the main camera.
    camera.getWorldPosition(eye)
    sky.position.copy(eye)
    sky.updateMatrixWorld()
  }

  const environmentScene=new THREE.Scene()
  const environmentDome=new THREE.Mesh(sky.geometry,sky.material)
  environmentDome.scale.copy(sky.scale)
  environmentDome.frustumCulled=false
  environmentScene.add(environmentDome)
  const generator=new THREE.PMREMGenerator(renderer)
  const disc=uniforms.showSunDisc,visibleDisc=disc?.value
  let environment:THREE.WebGLRenderTarget
  if(disc)disc.value=0
  try{
    // The sun is fixed in this lesson, so generate the environment only once.
    environment=generator.fromScene(environmentScene,.025,.1,20000)
  }catch(error){
    sky.geometry.dispose();sky.material.dispose()
    throw error
  }finally{
    if(disc)disc.value=visibleDisc
    environmentScene.clear();generator.dispose()
  }
  return {
    object:sky,environment:environment.texture,
    dispose(){environment.dispose();sky.geometry.dispose();sky.material.dispose()},
  }
}
