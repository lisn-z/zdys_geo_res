import * as THREE from 'three'
import { apparentBody, createHorizonMaterial, discAboveHorizon, updateHorizon, OBSERVER_FOV, OBSERVER_CLOSE_FOV } from './observerProjection'

export interface ObserverSkyState {
  observerUp: THREE.Vector3
  localNorth: THREE.Vector3
  sunDirection: THREE.Vector3
  moonDirection: THREE.Vector3
  moonToSunDirection: THREE.Vector3
  sunAltitude: number
  moonAltitude: number
  sunAzimuth: number
  moonAzimuth: number
  sunAngularRadius: number
  moonAngularRadius: number
  mode: 'solar' | 'lunar'
  moonOrientation: THREE.Quaternion
  sunOrientation: THREE.Quaternion
  skyTexture: THREE.Texture | null
}

/** 与“月相”页一致的当地东—天顶—北坐标、站立高度、拖动与方向键环顾。 */
export function createObserverScene(
  canvas: HTMLCanvasElement,
  moonSource: THREE.ShaderMaterial,
  sunSource: THREE.ShaderMaterial,
  onViewChange: (heading: number, pitch: number, following: boolean, closeUp: boolean) => void,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  const scene = new THREE.Scene()
  const eyeHeight = 1.7
  const camera = new THREE.PerspectiveCamera(OBSERVER_FOV, 1, 0.1, 4000)
  camera.position.set(0, eyeHeight, 0)
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const textures: THREE.Texture[] = []
  const keepGeometry = <T extends THREE.BufferGeometry>(g: T) => { geometries.push(g); return g }
  const keepMaterial = <T extends THREE.Material>(m: T) => { materials.push(m); return m }
  const skyUniforms = {
    skyMap: { value: null as THREE.Texture | null },
    hasMap: { value: 0 },
    daylight: { value: 0 },
    twilight: { value: 0 },
    localToWorld: { value: new THREE.Matrix3() },
  }
  const sky = new THREE.Mesh(keepGeometry(new THREE.SphereGeometry(1500, 64, 40)),
    keepMaterial(new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: `varying vec3 vDirection;
        void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D skyMap;
        uniform float hasMap, daylight, twilight;
        uniform mat3 localToWorld;
        varying vec3 vDirection;
        void main() {
          vec3 d = normalize(vDirection);
          vec3 w = localToWorld * d;
          vec2 uv = vec2(atan(w.z, w.x) / 6.2831853 + 0.5, asin(clamp(w.y, -1.0, 1.0)) / 3.14159265 + 0.5);
          vec3 stars = hasMap > 0.5 ? texture2D(skyMap, uv).rgb * 0.14 : vec3(0.002, 0.004, 0.009);
          float horizon = pow(1.0 - max(d.y, 0.0), 4.0);
          vec3 air = mix(vec3(0.025, 0.10, 0.24), vec3(0.22, 0.30, 0.40), horizon);
          vec3 color = stars * (1.0 - daylight * 0.998) + air * daylight;
          color += vec3(0.036, 0.028, 0.046) * twilight * horizon;
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })))
  sky.position.copy(camera.position)
  scene.add(sky)

  // 采用“月相”页的程序化草地层次与远景雾化，不需要新增贴图。
  const ground = new THREE.Mesh(keepGeometry(new THREE.PlaneGeometry(7000, 7000)),
    keepMaterial(new THREE.ShaderMaterial({
      uniforms: { daylight: skyUniforms.daylight, twilight: skyUniforms.twilight },
      vertexShader: `varying vec3 vPosition;
        void main() { vec4 p = modelMatrix * vec4(position, 1.0); vPosition = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `
        varying vec3 vPosition;
        uniform float daylight, twilight;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        void main() {
          vec2 p = vPosition.xz;
          float distanceFromEye = length(p);
          float patches = noise(p * 0.023) * 0.58 + noise(p * 0.079) * 0.28 + noise(p * 0.27) * 0.14;
          float detail = noise(p * vec2(5.0, 1.2)) * (1.0 - smoothstep(15.0, 110.0, distanceFromEye));
          vec3 day = mix(vec3(0.034, 0.056, 0.023), vec3(0.092, 0.126, 0.055), patches) * (0.89 + detail * 0.22);
          vec3 night = mix(vec3(0.0023, 0.0046, 0.0042), vec3(0.0054, 0.0095, 0.0082), patches);
          vec3 haze = mix(vec3(0.005, 0.011, 0.017), vec3(0.18, 0.24, 0.255), daylight);
          haze += vec3(0.023, 0.016, 0.015) * twilight;
          gl_FragColor = vec4(mix(mix(night, day, daylight), haze, smoothstep(65.0, 1050.0, distanceFromEye) * 0.88), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })))
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const directionMarks: THREE.Sprite[] = []
  for (const [index, name] of ['北 N', '东 E', '南 S', '西 W'].entries()) {
    const image = document.createElement('canvas')
    image.width = 160; image.height = 48
    const ctx = image.getContext('2d')!
    ctx.font = '500 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#c1d6df'
    ctx.fillText(name, 80, 33)
    const map = new THREE.CanvasTexture(image)
    textures.push(map)
    const mark = new THREE.Sprite(keepMaterial(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false })))
    mark.position.set(Math.sin(index * Math.PI / 2) * 180, 6.7, -Math.cos(index * Math.PI / 2) * 180)
    mark.scale.set(15, 4.5, 1)
    directionMarks.push(mark)
    scene.add(mark)
  }

  function bodyMaterial(source: THREE.ShaderMaterial) {
    const material = createHorizonMaterial(source)
    // 只转换光线到当地坐标系；纹理、月食色调继续共用。
    material.uniforms.uLightDirection = { value: new THREE.Vector3() }
    return keepMaterial(material)
  }
  const moonMaterial = bodyMaterial(moonSource)
  const sunMaterial = bodyMaterial(sunSource)
  const sphere = keepGeometry(new THREE.SphereGeometry(1, 96, 64))
  const moon = new THREE.Mesh(sphere, moonMaterial)
  const sun = new THREE.Mesh(sphere, sunMaterial)
  scene.add(sun, moon)

  const frameMatrix = new THREE.Matrix4()
  const worldToLocal = new THREE.Quaternion()
  let heading = 180
  let pitch = 20
  let following = true
  let initialized = false
  let state: ObserverSkyState | null = null
  let width = 0
  let height = 0
  let pointer: { id: number; x: number; y: number } | null = null
  let lastTime = 0

  function report() { onViewChange(heading, pitch, following, camera.fov < 30) }
  function aim() {
    heading = (heading % 360 + 360) % 360
    pitch = THREE.MathUtils.clamp(pitch, -80, 89.8)
    const h = THREE.MathUtils.degToRad(heading), p = THREE.MathUtils.degToRad(pitch)
    camera.lookAt(Math.sin(h) * Math.cos(p), eyeHeight + Math.sin(p), -Math.cos(h) * Math.cos(p))
    report()
  }
  function target() {
    const solar = state?.mode === 'solar'
    return { heading: (solar ? state?.sunAzimuth : state?.moonAzimuth) ?? 180,
      pitch: (solar ? state?.sunAltitude : state?.moonAltitude) ?? 20 }
  }
  function resetView() {
    const desired = target()
    heading = desired.heading
    pitch = Math.max(20, desired.pitch - 38)
    camera.fov = OBSERVER_FOV; camera.updateProjectionMatrix()
    following = true; aim()
  }
  function toggleFollow() { following = !following; report() }
  function locate() {
    following = true
    camera.fov = camera.fov < 30 ? OBSERVER_FOV : OBSERVER_CLOSE_FOV
    camera.updateProjectionMatrix(); report()
  }

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || pointer) return
    canvas.focus({ preventScroll: true })
    canvas.setPointerCapture(event.pointerId)
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY }
    following = false; report()
  }
  function pointerMove(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return
    const sensitivity = camera.fov / Math.max(height, 200)
    heading -= (event.clientX - pointer.x) * sensitivity
    pitch += (event.clientY - pointer.y) * sensitivity
    pointer.x = event.clientX; pointer.y = event.clientY; aim()
  }
  function pointerUp(event: PointerEvent) {
    if (pointer?.id !== event.pointerId) return
    pointer = null
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
  }
  function wheel(event: WheelEvent) {
    event.preventDefault()
    camera.fov = THREE.MathUtils.clamp(camera.fov * Math.exp(event.deltaY * 0.001), 2, 100)
    camera.updateProjectionMatrix(); report()
  }
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Home') { event.preventDefault(); resetView(); return }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault(); following = false
    const step = event.shiftKey ? 8 : 2
    if (event.key === 'ArrowLeft') heading -= step
    if (event.key === 'ArrowRight') heading += step
    if (event.key === 'ArrowUp') pitch += step
    if (event.key === 'ArrowDown') pitch -= step
    aim()
  }
  canvas.addEventListener('pointerdown', pointerDown)
  canvas.addEventListener('pointermove', pointerMove)
  canvas.addEventListener('pointerup', pointerUp)
  canvas.addEventListener('pointercancel', pointerUp)
  canvas.addEventListener('lostpointercapture', pointerUp)
  canvas.addEventListener('wheel', wheel, { passive: false })
  canvas.addEventListener('keydown', keydown)

  function render(next: ObserverSkyState, time: number) {
    state = next
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) { lastTime = 0; return }
    const w = Math.round(rect.width), h = Math.round(rect.height)
    if (w !== width || h !== height) {
      width = w; height = h; renderer.setSize(w, h, false)
      camera.aspect = w / h; camera.updateProjectionMatrix()
    }
    const up = next.observerUp, north = next.localNorth
    const east = new THREE.Vector3().crossVectors(north, up).normalize()
    frameMatrix.set(east.x, east.y, east.z, 0, up.x, up.y, up.z, 0,
      -north.x, -north.y, -north.z, 0, 0, 0, 0, 1)
    worldToLocal.setFromRotationMatrix(frameMatrix)
    skyUniforms.localToWorld.value.setFromMatrix4(frameMatrix).transpose()
    skyUniforms.skyMap.value = next.skyTexture
    skyUniforms.hasMap.value = next.skyTexture ? 1 : 0
    skyUniforms.daylight.value = THREE.MathUtils.smoothstep(next.sunAltitude, -8, 12)
    skyUniforms.twilight.value = 1 - Math.abs(THREE.MathUtils.clamp(next.sunAltitude, -14, 14)) / 14
    // 保留真实角直径和遮挡关系，近看通过缩小相机视场实现。
    const moonBody = apparentBody(camera.position, next.moonDirection.clone().applyQuaternion(worldToLocal), next.moonAngularRadius, 450)
    const sunBody = apparentBody(camera.position, next.sunDirection.clone().applyQuaternion(worldToLocal), next.sunAngularRadius, 1000)
    moon.position.copy(moonBody.position); moon.scale.setScalar(moonBody.radius)
    sun.position.copy(sunBody.position); sun.scale.setScalar(sunBody.radius)
    moon.quaternion.copy(worldToLocal).multiply(next.moonOrientation)
    sun.quaternion.copy(worldToLocal).multiply(next.sunOrientation)
    moon.visible = discAboveHorizon(next.moonAltitude, next.moonAngularRadius)
    sun.visible = discAboveHorizon(next.sunAltitude, next.sunAngularRadius)
    updateHorizon(moonMaterial, camera.position, camera.up)
    updateHorizon(sunMaterial, camera.position, camera.up)
    moonMaterial.uniforms.uLightDirection!.value.copy(next.moonToSunDirection).applyQuaternion(worldToLocal)
    sunMaterial.uniforms.uLightDirection!.value.copy(next.sunDirection).applyQuaternion(worldToLocal)
    if (!initialized) { resetView(); initialized = true }
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0
    lastTime = time
    if (following) {
      const desired = target()
      const delta = ((desired.heading - heading + 540) % 360) - 180
      const blend = 1 - Math.exp(-dt * 5)
      heading += delta * blend
      pitch = THREE.MathUtils.lerp(pitch, THREE.MathUtils.clamp(desired.pitch, camera.fov < 30 ? 0 : 5, 89.8), blend)
    }
    // 镜头放大不同时放大方位文字。
    const labelScale = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / Math.tan(THREE.MathUtils.degToRad(OBSERVER_FOV) / 2)
    directionMarks.forEach(mark => mark.scale.set(15 * labelScale, 4.5 * labelScale, 1))
    aim()
    renderer.render(scene, camera)
  }

  function dispose() {
    canvas.removeEventListener('pointerdown', pointerDown)
    canvas.removeEventListener('pointermove', pointerMove)
    canvas.removeEventListener('pointerup', pointerUp)
    canvas.removeEventListener('pointercancel', pointerUp)
    canvas.removeEventListener('lostpointercapture', pointerUp)
    canvas.removeEventListener('wheel', wheel)
    canvas.removeEventListener('keydown', keydown)
    materials.forEach(material => material.dispose())
    geometries.forEach(geometry => geometry.dispose())
    textures.forEach(texture => texture.dispose())
    renderer.dispose(); scene.clear()
  }
  return { render, resetView, toggleFollow, locate, dispose }
}
