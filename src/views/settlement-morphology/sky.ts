import * as THREE from 'three'
import { Sky } from 'three/addons/objects/Sky.js'

/** Official Three Sky, following flying-into-space/flying/sky-compat.ts. */
export function createSettlementSky(renderer: THREE.WebGLRenderer, sun: THREE.DirectionalLight): {
  object: Sky
  update(elapsed: number): THREE.Texture | null
  dispose(): void
} {
  const sky = new Sky()
  sky.name = 'official-late-afternoon-sky'
  sky.scale.setScalar(1400)
  sky.frustumCulled = false
  sky.castShadow = false
  sky.receiveShadow = false
  sky.renderOrder = -900
  sky.material.depthWrite = false
  sky.material.depthTest = true
  const uniforms = sky.material.uniforms
  uniforms.turbidity!.value = 2.0
  uniforms.rayleigh!.value = 2.2
  uniforms.mieCoefficient!.value = 0.003
  uniforms.mieDirectionalG!.value = 0.8
  // The physical HDR disc overwhelms this close-range teaching diorama.
  // Dim only the disc, preserving the blue sky and warm horizon illumination.
  if (uniforms.showSunDisc) uniforms.showSunDisc.value = 0.000025
  if (uniforms.cloudCoverage) uniforms.cloudCoverage.value = 0.09
  if (uniforms.cloudDensity) uniforms.cloudDensity.value = 0.11
  if (uniforms.cloudElevation) uniforms.cloudElevation.value = 0.28
  uniforms.settlementSkyRadiance = { value: 0.24 }
  // Scale radiance before the public tone-mapping chunk, independently of Sky's
  // internal variable names. The official scattering stays intact above the horizon.
  // A cutaway teaching island has no infinite ground below it: softly continue
  // the warm late-afternoon haze into that otherwise uniform lower hemisphere.
  sky.material.fragmentShader = 'uniform float settlementSkyRadiance;\n' + sky.material.fragmentShader.replace(
    /#include\s*<tonemapping_fragment>/,
    `gl_FragColor.rgb *= settlementSkyRadiance;
     vec3 settlementViewRay = normalize(vWorldPosition - cameraPosition);
     float settlementSunward = pow(max(0.0, dot(
       normalize(settlementViewRay.xz + vec2(0.00001)),
       normalize(vSunDirection.xz + vec2(0.00001))
     )), 2.0);
     vec3 settlementHaze = mix(vec3(0.38, 0.66, 1.00), vec3(1.05, 0.78, 0.49),
       settlementSunward * exp(-abs(settlementViewRay.y) / 0.15) * 0.64);
     float settlementLowerAir = 1.0 - smoothstep(-0.20, 0.075, settlementViewRay.y);
     gl_FragColor.rgb = mix(gl_FragColor.rgb, settlementHaze, settlementLowerAir);
     #include <tonemapping_fragment>`,
  )
  sky.material.needsUpdate = true
  const eye = new THREE.Vector3()
  sky.onBeforeRender = (_renderer, _scene, camera) => {
    camera.getWorldPosition(eye)
    sky.position.copy(eye)
    sky.updateMatrixWorld()
  }

  // The visible dome and PMREM share the same official shader and uniforms.
  // No independently painted environment can tint the water a different sky colour.
  const environmentScene = new THREE.Scene()
  const environmentDome = new THREE.Mesh(sky.geometry, sky.material)
  environmentDome.scale.copy(sky.scale)
  environmentDome.frustumCulled = false
  environmentScene.add(environmentDome)
  const generator = new THREE.PMREMGenerator(renderer)
  let environment: THREE.WebGLRenderTarget | null = null
  let disposed = false
  const direction = new THREE.Vector3()
  const targetPosition = new THREE.Vector3()
  const previousDirection = new THREE.Vector3(Infinity, Infinity, Infinity)

  function update(elapsed: number): THREE.Texture | null {
    if (disposed) return null
    if (uniforms.time) uniforms.time.value = Number.isFinite(elapsed) ? elapsed : 0
    sun.getWorldPosition(direction)
    sun.target.getWorldPosition(targetPosition)
    direction.sub(targetPosition).normalize()
    if (direction.distanceToSquared(previousDirection) > 1e-8) {
      previousDirection.copy(direction)
      ;(uniforms.sunPosition!.value as THREE.Vector3).copy(direction).multiplyScalar(450000)
      const disc = uniforms.showSunDisc
      const priorDisc = disc?.value
      if (disc) disc.value = 0 // Direct sunlight supplies the sharp highlight without PMREM fireflies.
      try {
        const nextEnvironment = generator.fromScene(environmentScene, 0.025, 0.1, 2000)
        environment?.dispose()
        environment = nextEnvironment
      } catch {
        // The official visible sky and direct sunlight still render without PMREM.
      } finally {
        if (disc) disc.value = priorDisc
      }
    }
    return environment?.texture ?? null
  }
  return {
    object: sky,
    update,
    dispose() {
      if (disposed) return
      disposed = true
      environment?.dispose()
      generator.dispose()
      environmentScene.clear()
      sky.geometry.dispose()
      sky.material.dispose()
    },
  }
}
