import * as THREE from 'three'
import { ROTATION_CUTAWAY_HALF_ANGLE } from './rotation-speed-demo'

export const rotationCutawayUniforms = {
  showRotationCutaway: { value: 0 },
  cutawayDirection: { value: new THREE.Vector3(0, 0, 1) },
  cutawayAxis: { value: new THREE.Vector3(0, 1, 0) },
  cutawayCenter: { value: new THREE.Vector3() },
  cutawayCosHalfAngle: { value: Math.cos(ROTATION_CUTAWAY_HALF_ANGLE) },
}

export const rotationCutawayShader = /* glsl */ `
  uniform float showRotationCutaway;
  uniform vec3 cutawayDirection;
  uniform vec3 cutawayAxis;
  uniform vec3 cutawayCenter;
  uniform float cutawayCosHalfAngle;
  bool insideRotationCutaway(vec3 direction) {
    vec3 equatorial = direction - cutawayAxis * dot(direction, cutawayAxis);
    return showRotationCutaway > 0.5
      && dot(equatorial, cutawayDirection) > length(equatorial) * cutawayCosHalfAngle;
  }
`

/** Clip the same wedge from graticules, labels, zones and markers as from the surface. */
export function applySurfaceCutaway(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (material instanceof THREE.ShaderMaterial || material.userData.rotationCutaway) return
      material.userData.rotationCutaway = true
      const sprite = object instanceof THREE.Sprite
      material.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
        Object.assign(shader.uniforms, rotationCutawayUniforms)
        shader.vertexShader = 'varying vec3 vCutawayWorldPosition;\n' + shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace('void main() {', `void main() {
          vCutawayWorldPosition = ${sprite ? 'modelMatrix[3].xyz' : '(modelMatrix * vec4(position, 1.0)).xyz'};
        `)
        shader.fragmentShader = rotationCutawayShader + '\nvarying vec3 vCutawayWorldPosition;\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace('void main() {', `void main() {
          if (insideRotationCutaway(vCutawayWorldPosition - cutawayCenter)) discard;
        `)
      }
      material.customProgramCacheKey = () => `earth-motion-cutaway-${sprite ? 'sprite' : 'surface'}-v1`
      material.needsUpdate = true
    })
  })
}

export function isInsideRotationCutaway(pointFromEarthCenter: THREE.Vector3) {
  if (!rotationCutawayUniforms.showRotationCutaway.value) return false
  const equatorial = pointFromEarthCenter.clone().addScaledVector(rotationCutawayUniforms.cutawayAxis.value, -pointFromEarthCenter.dot(rotationCutawayUniforms.cutawayAxis.value))
  return equatorial.dot(rotationCutawayUniforms.cutawayDirection.value) > equatorial.length() * rotationCutawayUniforms.cutawayCosHalfAngle.value
}
