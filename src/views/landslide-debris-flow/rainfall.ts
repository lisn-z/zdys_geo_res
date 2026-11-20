import * as THREE from 'three'

/** Two instanced draws: visible rain streaks and small, terrain-aligned impacts. */
export function createRainfall(scene: THREE.Scene, heightAt: (x: number, z: number) => number) {
  const root = new THREE.Group()
  root.name = 'rainfall'
  scene.add(root)

  let seed = 719
  const random = () => {
    seed += 0x6D2B79F5
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  const makeTexture = (splash: boolean) => {
    const size = 64, pixels = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = (x + .5) / size * 2 - 1, v = (y + .5) / size * 2 - 1
      const radius = Math.hypot(u, v), angle = Math.atan2(v, u)
      const ring = Math.exp(-(((radius - .66) / .07) ** 2))
      const brokenEdge = .65 + .35 * Math.sin(angle * 5 + .9) ** 2
      const alpha = splash
        ? ring * brokenEdge + .16 * Math.exp(-((radius / .18) ** 2))
        : Math.exp(-((u / .45) ** 2)) * Math.max(0, 1 - Math.abs(v)) ** .55
      const offset = (y * size + x) * 4
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255
      pixels[offset + 3] = Math.round(Math.min(1, alpha) * 255)
    }
    const texture = new THREE.DataTexture(pixels, size, size)
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter
    texture.needsUpdate = true
    return texture
  }

  const dropCount = 820, splashCount = 110
  const rainTexture = makeTexture(false), splashTexture = makeTexture(true)
  const rainMaterial = new THREE.MeshBasicMaterial({
    color: '#c2d8e2', map: rainTexture, transparent: true, opacity: .68,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  })
  const splashMaterial = new THREE.MeshBasicMaterial({
    color: '#c5d9df', map: splashTexture, transparent: true, opacity: .58,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  })
  const splashGeometry = new THREE.PlaneGeometry(1, 1)
  const impactOpacity = new THREE.InstancedBufferAttribute(new Float32Array(splashCount), 1)
  impactOpacity.setUsage(THREE.DynamicDrawUsage)
  splashGeometry.setAttribute('instanceOpacity', impactOpacity)
  splashMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float instanceOpacity; varying float vImpactOpacity;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvImpactOpacity = instanceOpacity;')
    shader.fragmentShader = 'varying float vImpactOpacity;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vImpactOpacity;')
  }
  splashMaterial.customProgramCacheKey = () => 'terrain-rain-impact-v1'
  const drops = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), rainMaterial, dropCount)
  const splashes = new THREE.InstancedMesh(splashGeometry, splashMaterial, splashCount)
  drops.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  splashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  drops.frustumCulled = splashes.frustumCulled = false
  drops.renderOrder = 3
  splashes.renderOrder = 2
  root.add(drops, splashes)

  const rainSeeds = Array.from({ length: dropCount }, () => ({
    x: random() * 55 - 27.5, z: random() * 63 - 31.5,
    phase: random() * 30, speed: 17 + random() * 9,
    length: 1.05 + random() * .85, width: .12 + random() * .05,
    ground: 0,
  }))
  const splashSeeds = Array.from({ length: splashCount }, () => ({
    x: random() * 54 - 27, z: random() * 62 - 31,
    phase: random(), duration: .65 + random() * .55,
    size: .65 + random() * .4, ground: 0,
    rotation: new THREE.Quaternion(),
  }))
  const dummy = new THREE.Object3D(), normal = new THREE.Vector3()
  const faceAxis = new THREE.Vector3(0, 0, 1)
  const cameraQuaternion = new THREE.Quaternion(), inverseCamera = new THREE.Quaternion()
  const streakRotation = new THREE.Quaternion(), localFall = new THREE.Vector3()
  const fallDirection = new THREE.Vector3(-.12, -1, .04).normalize()
  let intensity: 1 | 2 | 3 = 2
  function setIntensity(level: 1 | 2 | 3) {
    intensity = level
    drops.count = [0, 230, 520, dropCount][level]!
    splashes.count = [0, 30, 65, splashCount][level]!
    rainMaterial.opacity = [0, .5, .68, .8][level]!
  }

  // Terrain heights only change when the lesson switches between the two hazards.
  function refreshGround() {
    for (const drop of rainSeeds) drop.ground = heightAt(drop.x, drop.z)
    for (const splash of splashSeeds) {
      splash.ground = heightAt(splash.x, splash.z)
      const dx = (heightAt(splash.x + .2, splash.z) - heightAt(splash.x - .2, splash.z)) / .4
      const dz = (heightAt(splash.x, splash.z + .2) - heightAt(splash.x, splash.z - .2)) / .4
      normal.set(-dx, 1, -dz).normalize()
      splash.rotation.setFromUnitVectors(faceAxis, normal)
    }
  }

  function update(time: number, camera: THREE.Camera) {
    if (!root.visible) return
    const seconds = time * .001
    camera.getWorldQuaternion(cameraQuaternion)
    inverseCamera.copy(cameraQuaternion).invert()
    localFall.copy(fallDirection).applyQuaternion(inverseCamera)
    const projectedLength = Math.hypot(localFall.x, localFall.y)
    const angle = Math.atan2(-localFall.x, localFall.y)
    streakRotation.setFromAxisAngle(faceAxis, angle)
    dummy.quaternion.copy(cameraQuaternion).multiply(streakRotation)
    for (let i = 0; i < drops.count; i++) {
      const drop = rainSeeds[i]!
      const aboveGround = 30 - ((seconds * drop.speed * (.75 + intensity * .125) + drop.phase) % 30)
      dummy.position.set(drop.x, drop.ground + 1.05 + aboveGround, drop.z)
      // Near overhead, shorten the trail without collapsing it into invisible edge-on lines.
      dummy.scale.set(drop.width, drop.length * (.7 + intensity * .15) * Math.max(.32, projectedLength), 1)
      dummy.updateMatrix()
      drops.setMatrixAt(i, dummy.matrix)
    }
    for (let i = 0; i < splashes.count; i++) {
      const splash = splashSeeds[i]!, phase = (seconds / splash.duration + splash.phase) % 1
      const life = phase / .72, active = life < 1
      dummy.position.set(splash.x, splash.ground + .07, splash.z)
      dummy.quaternion.copy(splash.rotation)
      dummy.scale.setScalar(active ? splash.size * (.22 + life * .78) : 0)
      dummy.updateMatrix()
      splashes.setMatrixAt(i, dummy.matrix)
      impactOpacity.setX(i, active ? (1 - life) * Math.min(1, life * 8) : 0)
    }
    drops.instanceMatrix.needsUpdate = splashes.instanceMatrix.needsUpdate = true
    impactOpacity.needsUpdate = true
  }
  refreshGround()
  setIntensity(2)
  return {
    setEnabled(enabled: boolean) { root.visible = enabled },
    setIntensity,
    refreshGround,
    update,
    dispose() {
      scene.remove(root)
      drops.geometry.dispose()
      splashGeometry.dispose()
      rainMaterial.dispose()
      splashMaterial.dispose()
      rainTexture.dispose()
      splashTexture.dispose()
    },
  }
}
