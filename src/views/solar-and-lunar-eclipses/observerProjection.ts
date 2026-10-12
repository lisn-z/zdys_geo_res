import * as THREE from 'three'

export const OBSERVER_FOV = 92
export const OBSERVER_CLOSE_FOV = 8

/** 用真实地心视差计算出的视线投影，渲染距离不参与天文几何。 */
export function apparentBody(eye: THREE.Vector3, direction: THREE.Vector3, angularRadius: number, distance: number) {
  return {
    position: eye.clone().addScaledVector(direction, distance),
    radius: Math.sin(THREE.MathUtils.degToRad(angularRadius)) * distance,
  }
}

// 三个观测画面统一采用几何地平线；不混用未渲染的大气折射修正。
export function discAboveHorizon(altitude: number, angularRadius: number) {
  return altitude + angularRadius > 0
}

export function horizonScreenY(altitude: number, verticalFov: number) {
  return 0.5 + Math.tan(THREE.MathUtils.degToRad(altitude)) / (2 * Math.tan(THREE.MathUtils.degToRad(verticalFov) / 2))
}

/** 共用纹理、光照和月食色调，但每个视图保有自己的观测点/地平线。 */
export function createHorizonMaterial(source: THREE.ShaderMaterial) {
  return new THREE.ShaderMaterial({
    vertexShader: source.vertexShader,
    fragmentShader: source.fragmentShader.replace('void main() {', `
      uniform vec3 uObserverEye;
      uniform vec3 uObserverUp;
      uniform float uClipHorizon;
      void main() {
        if (uClipHorizon > 0.5 && dot(vWorldPosition - uObserverEye, uObserverUp) < 0.0) discard;
    `),
    uniforms: {
      ...source.uniforms,
      uOpacity: { value: 1 },
      uObserverEye: { value: new THREE.Vector3() },
      uObserverUp: { value: new THREE.Vector3(0, 1, 0) },
      uClipHorizon: { value: 1 },
    },
  })
}

export function updateHorizon(material: THREE.ShaderMaterial, eye: THREE.Vector3, up: THREE.Vector3, enabled = true) {
  material.uniforms.uObserverEye!.value.copy(eye)
  material.uniforms.uObserverUp!.value.copy(up)
  material.uniforms.uClipHorizon!.value = enabled ? 1 : 0
}
