import * as THREE from 'three'

/** 当地切平面交点，用于验证近景与地平线使用同一个投影。 */
export function surfaceGroundPoint(eye: THREE.Vector3, direction: THREE.Vector3, up: THREE.Vector3, radius: number) {
  const vertical = direction.dot(up)
  if (vertical >= 0) return null
  const height = Math.max(eye.dot(up) - radius, 0.00001)
  return eye.clone().addScaledVector(direction, height / -vertical)
}

export function earthSurfaceUv(point: THREE.Vector3, orientation: THREE.Quaternion) {
  const local = point.clone().applyQuaternion(orientation.clone().invert()).normalize()
  return new THREE.Vector2(
    Math.atan2(-local.z, local.x) / (2 * Math.PI) + 0.5,
    Math.asin(THREE.MathUtils.clamp(local.y, -1, 1)) / Math.PI + 0.5,
  )
}

/**
 * 按屏幕视线绘制完整的当地地面，复用地球贴图与昼夜光照。
 * 不再使用巨型世界空间补片，避免远裁剪、三角面插值与球体叠绘接缝。
 */
export function createSurfaceGround(source: THREE.ShaderMaterial) {
  const uniforms = {
    ...source.uniforms,
    uOpacity: { value: 1 },
    uGroundUp: { value: new THREE.Vector3(0, 1, 0) },
    uGroundRadius: { value: 1 },
    uWorldToEarth: { value: new THREE.Matrix3() },
    uViewToWorld: { value: new THREE.Matrix3() },
    uInverseProjection: { value: new THREE.Matrix4() },
  }
  const fragmentShader = source.fragmentShader
    .replace(/varying vec3 vBodyNormal;/, 'vec3 vBodyNormal = vec3(0.0, 1.0, 0.0);')
    .replace(/varying vec2 vUv;/, 'vec2 vUv;')
    .replace(/varying vec3 vWorldNormal;/, 'vec3 vWorldNormal;')
    .replace(/varying vec3 vWorldPosition;/, 'vec3 vWorldPosition;')
    .replace('void main() {', `
      varying vec2 vGroundNdc;
      uniform vec3 uGroundUp;
      uniform float uGroundRadius;
      uniform mat3 uWorldToEarth;
      uniform mat3 uViewToWorld;
      uniform mat4 uInverseProjection;
      void main() {
        vec4 viewPoint = uInverseProjection * vec4(vGroundNdc, 1.0, 1.0);
        vec3 ray = normalize(uViewToWorld * (viewPoint.xyz / viewPoint.w));
        float vertical = dot(ray, uGroundUp);
        if (vertical >= 0.0) discard;

        float height = max(dot(cameraPosition, uGroundUp) - uGroundRadius, 0.00001);
        float distanceToGround = height / max(-vertical, 0.000001);
        vWorldPosition = cameraPosition + ray * distanceToGround;
        vWorldNormal = uGroundUp;
        // 非线性球面投影必须逐像素计算，不能在补片四角计算后插值。
        vec3 localPoint = normalize(uWorldToEarth * vWorldPosition);
        vUv = vec2(atan(-localPoint.z, localPoint.x) / 6.28318530718 + 0.5,
          asin(clamp(localPoint.y, -1.0, 1.0)) / 3.14159265359 + 0.5);
    `)
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vGroundNdc;
      void main() {
        vGroundNdc = position.xy;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: source.toneMapped,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
  mesh.name = 'surface-ground'
  mesh.frustumCulled = false
  mesh.renderOrder = 100
  mesh.visible = false
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    uniforms.uViewToWorld.value.setFromMatrix4(camera.matrixWorld)
    uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse)
  }
  const inverseOrientation = new THREE.Quaternion()
  const rotationMatrix = new THREE.Matrix4()
  return {
    mesh,
    update(up: THREE.Vector3, radius: number, orientation: THREE.Quaternion, visible: boolean) {
      mesh.visible = visible
      uniforms.uGroundUp.value.copy(up)
      uniforms.uGroundRadius.value = radius
      inverseOrientation.copy(orientation).invert()
      uniforms.uWorldToEarth.value.setFromMatrix4(rotationMatrix.makeRotationFromQuaternion(inverseOrientation))
    },
    dispose() {
      mesh.removeFromParent()
      mesh.geometry.dispose()
      material.dispose()
    },
  }
}
