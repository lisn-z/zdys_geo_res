import * as THREE from 'three'
import { apparentBody, createHorizonMaterial, discAboveHorizon, updateHorizon } from './observerProjection'
import { createSurfaceGround } from './surfaceGround'

interface SkyGeometry {
  observerUp: THREE.Vector3
  sunDirection: THREE.Vector3
  moonDirection: THREE.Vector3
  sunAltitude: number
  moonAltitude: number
  sunAngularRadius: number
  moonAngularRadius: number
}

/** 地表镜头的角尺度渲染层，不改动上帝视角/轨道/光锥使用的教学模型。 */
export function createSurfaceBodies(scene: THREE.Scene, sunSource: THREE.Mesh, moonSource: THREE.Mesh, earthSource: THREE.Mesh) {
  const sphere = new THREE.SphereGeometry(1, 96, 64)
  const sun = new THREE.Mesh(sphere, createHorizonMaterial(sunSource.material as THREE.ShaderMaterial))
  const moon = new THREE.Mesh(sphere, createHorizonMaterial(moonSource.material as THREE.ShaderMaterial))
  sun.visible = moon.visible = false
  const ground = createSurfaceGround(earthSource.material as THREE.ShaderMaterial)
  scene.add(sun, moon, ground.mesh)

  function update(eye: THREE.Vector3, sky: SkyGeometry, blend: number, sunRadius: number, moonRadius: number) {
    const localView = blend > 0
    const landed = blend >= 1 - 1e-8
    sunSource.visible = moonSource.visible = !localView
    const earthRadius = (earthSource.geometry as THREE.SphereGeometry).parameters.radius
    ground.update(sky.observerUp, earthRadius, earthSource.quaternion, landed)
    for (const [mesh, source, direction, angularRadius, altitude, distance, radius] of [
      [sun, sunSource, sky.sunDirection, sky.sunAngularRadius, sky.sunAltitude, 200, sunRadius],
      [moon, moonSource, sky.moonDirection, sky.moonAngularRadius, sky.moonAltitude, 80, moonRadius],
    ] as const) {
      const body = apparentBody(eye, direction, angularRadius, distance)
      mesh.position.copy(source.position).lerp(body.position, blend)
      mesh.scale.setScalar(THREE.MathUtils.lerp(radius, body.radius, blend))
      mesh.quaternion.copy(source.quaternion)
      mesh.visible = localView && (!landed || discAboveHorizon(altitude, angularRadius))
      updateHorizon(mesh.material, eye, sky.observerUp, landed)
    }
  }

  function dispose() {
    scene.remove(sun, moon)
    sphere.dispose(); sun.material.dispose(); moon.material.dispose()
    ground.dispose()
    sunSource.visible = moonSource.visible = true
  }
  return { update, dispose }
}
