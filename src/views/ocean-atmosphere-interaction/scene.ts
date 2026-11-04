import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import { createWorldTerrain, geoToWorld, worldToGeo, WORLD_WIDTH, WORLD_DEPTH, WORLD_LON_START } from './world'
import { oceanAsset, sampleField, type ClimateField, type ClimateSnapshot } from './data'
import type { LessonStep, LayerMode, Scenario, ViewMode, Effect } from './lessons'
import { oceanCurrents, currentVisibleInMonth } from './currents'
import { createFieldContours } from './contours'
import { createTeachingEffects } from './teaching-effects'

export const layerStyles = {
  sst: { title: '海表温度', unit: '℃', min: -2, max: 32, colors: ['#283c88', '#237cbe', '#3ac5ca', '#92d7a9', '#f0de81', '#f4a05c', '#cf4c40'] },
  pressure: { title: '海平面气压', unit: 'hPa', min: 980, max: 1040, colors: ['#5558a5', '#5398c8', '#87d4df', '#e9e8cf', '#edc880', '#db9253', '#b45443'] },
  anomaly: { title: '海温距平', unit: '℃', min: -4, max: 4, colors: ['#244c9a', '#368bc5', '#a0d3e3', '#f2f2e8', '#f0c496', '#e58357', '#b93d36'] },
} as const

export interface Probe { lon: number; lat: number; value: number | null; layer: LayerMode }
type Flow = {
  mesh: THREE.Mesh<THREE.TubeGeometry, THREE.ShaderMaterial>
  arrow: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial> | null
  curve: THREE.CatmullRomCurve3
  phase: number
  speed: number
  elapsed: number
  ensoSensitive: boolean
}
type EffectGroup = { group: THREE.Group; amount: number; target: number }
const WATER_NORMALS_URL = '/geo-resources-folder/images/waternormals.jpg'
const SUN_TEXTURE_URL = '/geo-resources-folder/images/sun.png'

// Display-only coastal padding: preserve every valid original sample, while
// extending a neighbouring source-cell color under the exact land silhouette.
// A missing cell is eligible only if its footprint intersects actual land.
// Probes/labels continue to use sampleField directly, including its nulls.
function createCoastalDisplaySampler(field: ClimateField, isLand: (lon: number, lat: number) => boolean) {
  const cyclic = Math.abs(Math.abs(field.lonStep) * field.width - 360) < .001
  const coastalSupport = new Map<number, number[]>()
  return (lon: number, lat: number): number | null => {
    const original = sampleField(field, lon, lat)
    if (original !== null && Number.isFinite(original)) return original
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null
    let x = (lon - field.lonStart) / field.lonStep
    const y = (lat - field.latStart) / field.latStep
    if (cyclic) x = ((x % field.width) + field.width) % field.width
    if (y < 0 || y > field.height - 1 || (!cyclic && (x < 0 || x > field.width - 1))) return null
    const column = cyclic ? Math.round(x) % field.width : Math.round(x); const row = Math.round(y)
    const index = row * field.width + column
    let candidates = coastalSupport.get(index)
    if (!candidates) {
      candidates = []
      const cellLon = field.lonStart + column * field.lonStep; const cellLat = field.latStart + row * field.latStep
      let touchesLand = false
      // Cache by the native 2°/2.5° cell, not the 0.25° display pixel. Detailed
      // polygon tests therefore run once per missing source cell.
      for (const dy of [-.5, 0, .5]) for (const dx of [-.5, 0, .5]) {
        if (isLand(cellLon + dx * field.lonStep, cellLat + dy * field.latStep)) touchesLand = true
      }
      if (touchesLand) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const candidateRow = row + dy; let candidateColumn = column + dx
        if (candidateRow < 0 || candidateRow >= field.height) continue
        if (cyclic) candidateColumn = (candidateColumn + field.width) % field.width
        else if (candidateColumn < 0 || candidateColumn >= field.width) continue
        const candidate = candidateRow * field.width + candidateColumn; const value = field.values[candidate]
        if (value != null && Number.isFinite(value)) candidates.push(candidate)
      }
      coastalSupport.set(index, candidates)
    }
    let closest = 1.5 ** 2; let value: number | null = null
    for (const candidate of candidates) {
      const candidateColumn = candidate % field.width; const candidateRow = Math.floor(candidate / field.width)
      let dx = Math.abs(x - candidateColumn); if (cyclic) dx = Math.min(dx, field.width - dx)
      const distance = dx * dx + (y - candidateRow) ** 2
      if (distance < closest) { closest = distance; value = field.values[candidate] ?? null }
    }
    return value
  }
}

function label(text: string, color = '#c7f3ee', width = 5) {
  const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!
  const fontSize = 56; const font = `600 ${fontSize}px "Microsoft YaHei",sans-serif`
  ctx.font = font; canvas.width = Math.ceil(ctx.measureText(text).width + 56); canvas.height = 108
  ctx.fillStyle = 'rgba(5,25,42,.91)'; ctx.beginPath(); ctx.roundRect(3, 3, canvas.width - 6, canvas.height - 6, 21); ctx.fill()
  ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke()
  ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
  ctx.fillStyle = color; ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, depthTest: false, transparent: true, toneMapped: false })
  const sprite = new THREE.Sprite(material); sprite.scale.set(width, width * canvas.height / canvas.width, 1); sprite.renderOrder = 24
  sprite.userData.sceneLabel = { baseWidth: width, aspect: canvas.height / canvas.width, minPixels: Math.max(68, Math.min(480, canvas.width / fontSize * 14)) }
  return sprite
}

// Ocean names read like map typography, with no dark card behind the water.
function oceanNameLabel(text: string, vertical = false) {
  const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!
  const characters = [...text]; const spacing = vertical ? 84 : 92
  canvas.width = vertical ? 104 : characters.length * spacing + 30
  canvas.height = vertical ? characters.length * spacing + 30 : 104
  ctx.font = '500 60px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f1f0dc'; ctx.shadowColor = 'rgba(7,35,50,.6)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 2
  characters.forEach((character, index) => ctx.fillText(character, vertical ? 52 : 15 + spacing * (index + .5), vertical ? 15 + spacing * (index + .5) : 52))
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const width = vertical ? 2.5 : 8.8
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * canvas.height / canvas.width), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false, opacity: .94, side: THREE.DoubleSide }))
  mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 15
  return mesh
}

function softTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!; const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 63)
  gradient.addColorStop(0, 'rgba(255,255,255,.9)'); gradient.addColorStop(.45, 'rgba(255,255,255,.5)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(canvas)
}

// Rasterize distance and along-route progress onto one flat field. Offset-strip
// geometry folds when a route's bend radius is smaller than its visual width;
// a distance field retains broad, rounded bends without any inverted triangles.
function createCurrentField(curve: THREE.CatmullRomCurve3, halfWidth: number) {
  const length = curve.getLength(); const segments = Math.max(72, Math.ceil(length * 8))
  const points = curve.getSpacedPoints(segments)
  let minX = Infinity; let maxX = -Infinity; let minZ = Infinity; let maxZ = -Infinity
  for (const point of points) { minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x); minZ = Math.min(minZ, point.z); maxZ = Math.max(maxZ, point.z) }
  const padding = halfWidth * 1.12
  minX -= padding; maxX += padding; minZ -= padding; maxZ += padding
  const spanX = maxX - minX; const spanZ = maxZ - minZ
  const width = THREE.MathUtils.clamp(Math.ceil(spanX * 20), 32, 1536)
  const height = THREE.MathUtils.clamp(Math.ceil(spanZ * 20), 32, 768)
  const data = new Uint8Array(width * height * 4)
  const nearest = new Float32Array(width * height); nearest.fill(Infinity)
  const progress = new Float32Array(width * height)
  const widthSquared = halfWidth * halfWidth
  for (let segment = 0; segment < segments; segment++) {
    const start = points[segment]!; const end = points[segment + 1]!
    const dx = end.x - start.x; const dz = end.z - start.z; const squared = dx * dx + dz * dz
    if (squared < 1e-10) continue
    const left = Math.max(0, Math.floor((Math.min(start.x, end.x) - halfWidth - minX) / spanX * width))
    const right = Math.min(width - 1, Math.ceil((Math.max(start.x, end.x) + halfWidth - minX) / spanX * width))
    const bottom = Math.max(0, Math.floor((maxZ - Math.max(start.z, end.z) - halfWidth) / spanZ * height))
    const top = Math.min(height - 1, Math.ceil((maxZ - Math.min(start.z, end.z) + halfWidth) / spanZ * height))
    for (let row = bottom; row <= top; row++) {
      const z = maxZ - (row + .5) / height * spanZ
      for (let col = left; col <= right; col++) {
        const x = minX + (col + .5) / width * spanX
        const projection = ((x - start.x) * dx + (z - start.z) * dz) / squared
        const along = projection < 0 ? 0 : projection > 1 ? 1 : projection
        const ex = x - start.x - dx * along; const ez = z - start.z - dz * along
        const distanceSquared = ex * ex + ez * ez; const index = row * width + col
        if (distanceSquared > widthSquared || distanceSquared >= nearest[index]!) continue
        nearest[index] = distanceSquared; progress[index] = (segment + along) / segments
      }
    }
  }
  const sqrt = Math.sqrt; const distanceScale = 255 / halfWidth
  for (let index = 0; index < nearest.length; index++) {
    // Empty texels are outside the band, not at its centre. Keeping their
    // distance at one prevents bilinear filtering from drawing a bright rim.
    if (nearest[index] === Infinity) { data[index * 4 + 1] = 255; continue }
    data[index * 4] = progress[index]! * 255 + .5
    data[index * 4 + 1] = sqrt(nearest[index]!) * distanceScale + .5
    data[index * 4 + 3] = 255
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat)
  texture.minFilter = texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true
  const geometry = new THREE.PlaneGeometry(spanX, spanZ)
  geometry.rotateX(-Math.PI / 2); geometry.translate((minX + maxX) * .5, 0, (minZ + maxZ) * .5)
  geometry.computeBoundingSphere()
  return { geometry, texture, length }
}

// The same density-volume approach used by the water-recycle teaching scene:
// overlapping cumulus lobes, two scales of noise, and a short ray march.
function cloudDensityTexture() {
  const size = 56; const bytes = new Uint8Array(size ** 3); const noise = new ImprovedNoise()
  const lobes = [[0, -.13, 0, .94, .42, .72], [-.43, -.11, .08, .57, .38, .55], [.4, -.07, -.05, .6, .43, .57], [-.13, .22, .02, .48, .61, .5], [.31, .16, -.08, .43, .49, .45]]
  let index = 0
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = x / (size - 1) * 2 - 1; const py = y / (size - 1) * 2 - 1; const pz = z / (size - 1) * 2 - 1
    let envelope = 0
    for (const [cx, cy, cz, sx, sy, sz] of lobes as [number, number, number, number, number, number][]) {
      envelope = Math.max(envelope, 1 - Math.hypot((px - cx) / sx, (py - cy) / sy, (pz - cz) / sz))
    }
    const broad = noise.noise(x * .05, y * .064, z * .05)
    const detail = noise.noise(x * .17 + 11.7, y * .19 - 4.2, z * .17 + 7.4)
    bytes[index++] = THREE.MathUtils.clamp((177 + broad * 68 + detail * 36) * Math.pow(envelope, 1.12), 0, 255)
  }
  const texture = new THREE.Data3DTexture(bytes, size, size, size)
  texture.format = THREE.RedFormat; texture.minFilter = texture.magFilter = THREE.LinearFilter
  texture.unpackAlignment = 1; texture.needsUpdate = true
  return texture
}

function volumeCloud(texture: THREE.Data3DTexture, x: number, y: number, z: number, scale: number) {
  const material = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, side: THREE.BackSide, transparent: true, depthWrite: false, toneMapped: false,
    uniforms: { map: { value: texture }, cameraPos: { value: new THREE.Vector3() }, uAlpha: { value: 0 } },
    vertexShader: `precision highp float;
      in vec3 position; uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix; uniform vec3 cameraPos;
      out vec3 vOrigin; out vec3 vDirection;
      void main(){vOrigin=vec3(inverse(modelMatrix)*vec4(cameraPos,1.));vDirection=position-vOrigin;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `precision highp float; precision highp sampler3D;
      uniform sampler3D map;uniform float uAlpha;in vec3 vOrigin;in vec3 vDirection;out vec4 outColor;
      vec2 hitBox(vec3 origin,vec3 direction){vec3 inv=1./direction;vec3 lo=(-.5-origin)*inv,hi=(.5-origin)*inv;vec3 a=min(lo,hi),b=max(lo,hi);return vec2(max(a.x,max(a.y,a.z)),min(b.x,min(b.y,b.z)));}
      void main(){
        vec3 direction=normalize(vDirection);vec2 bounds=hitBox(vOrigin,direction);if(bounds.x>bounds.y)discard;
        bounds.x=max(bounds.x,0.);float stepSize=(bounds.y-bounds.x)/44.;
        float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
        vec3 point=vOrigin+(bounds.x+jitter*stepSize)*direction;vec4 sum=vec4(0.);
        vec3 lightDir=normalize(vec3(.65,.8,-.5));
        for(int i=0;i<44;i++){
          vec3 p=point+.5;float raw=texture(map,p).r;
          float density=smoothstep(.095,.27,raw)*.17;
          float above=texture(map,p+lightDir*.045).r;
          float light=clamp(.66+(raw-above)*2.8+point.y*.32,.32,1.);
          vec3 tint=mix(vec3(.36,.49,.63),vec3(.97,.985,1.),light);
          sum.rgb+=(1.-sum.a)*density*tint;sum.a+=(1.-sum.a)*density;
          if(sum.a>.98)break;point+=direction*stepSize;
        }
        if(sum.a<.012)discard;outColor=vec4(sum.rgb/max(sum.a,.001),sum.a*uAlpha);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
  mesh.position.set(x, y, z); mesh.scale.set(7 * scale, 4.5 * scale, 4.2 * scale); mesh.renderOrder = 9
  mesh.onBeforeRender = (_renderer, _scene, activeCamera) => { activeCamera.getWorldPosition(material.uniforms.cameraPos!.value) }
  return mesh
}

export async function createOceanScene(
  host: HTMLElement, worldData: { countries: any; elevation: any },
  climate: Record<Scenario, ClimateSnapshot>, onProbe: (probe: Probe | null) => void,
) {
  const terrain = await createWorldTerrain(worldData.countries, worldData.elevation)
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#6f98ad')
  scene.fog = new THREE.Fog('#6f98ad', 130, 250)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(260, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: { zenith: { value: new THREE.Color('#456c85') }, horizon: { value: new THREE.Color('#6f98ad') }, nadir: { value: new THREE.Color('#547d91') } },
    vertexShader: 'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDirection;uniform vec3 zenith,horizon,nadir;
      void main(){float h=normalize(vDirection).y;vec3 c=mix(horizon,zenith,smoothstep(0.,.82,h));c=mix(c,nadir,smoothstep(0.,.65,-h));gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`,
  }))
  sky.renderOrder = -100; scene.add(sky)
  const camera = new THREE.PerspectiveCamera(43, 1, .1, 400)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95
  // Coarse DEM relief sits millimetres above the coastline cap. Self-shadowing
  // these two surfaces causes coastal acne; relief lighting supplies the shape.
  renderer.shadowMap.enabled = false
  host.appendChild(renderer.domElement)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = 15; controls.maxDistance = 150
  controls.maxPolarAngle = Math.PI * .48
  const world = new THREE.Group(); scene.add(world); world.add(terrain.group)
  const sceneLabels: THREE.Sprite[] = []
  terrain.group.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = false; object.receiveShadow = false } })
  const hemi = new THREE.HemisphereLight('#cfe8f6', '#213b4d', 1.75); scene.add(hemi)
  const sunPosition = new THREE.Vector3(4, 14, -10)
  const light = new THREE.DirectionalLight('#f5e8cf', 1.65); light.position.copy(sunPosition); scene.add(light)

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(WORLD_WIDTH + .7, .65, WORLD_DEPTH + .7), new THREE.MeshBasicMaterial({ color: '#2b7ba4', toneMapped: false }))
  pedestal.position.y = -7.9; world.add(pedestal)
  const oceanBlockGeometry = new THREE.BoxGeometry(WORLD_WIDTH, 7.5, WORLD_DEPTH)
  const blockPositions = oceanBlockGeometry.getAttribute('position'); const blockNormals = oceanBlockGeometry.getAttribute('normal')
  const blockColors = new Float32Array(blockPositions.count * 3)
  const blockTop = new THREE.Color('#48a7cb'); const blockBottom = new THREE.Color('#3285af'); const blockColor = new THREE.Color()
  for (let index = 0; index < blockPositions.count; index++) {
    const height = THREE.MathUtils.clamp((blockPositions.getY(index) + 3.75) / 7.5, 0, 1)
    const faceShade = blockNormals.getY(index) < -.5 ? .9 : Math.abs(blockNormals.getX(index)) > .5 ? .96 : 1
    blockColor.copy(blockBottom).lerp(blockTop, height).multiplyScalar(faceShade)
    blockColor.toArray(blockColors, index * 3)
  }
  oceanBlockGeometry.setAttribute('color', new THREE.BufferAttribute(blockColors, 3))
  // Ocean-blue sides retain depth through a gentle vertical gradient rather
  // than turning black when a box face points away from the scene light.
  const oceanSideMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
  const oceanFrontMaterial = oceanSideMaterial.clone()
  // BoxGeometry groups are +X, -X, +Y, -Y, +Z, -Z. Only the +Z face
  // meets the teaching section, so all other faces remain opaque at all times.
  const oceanBlock = new THREE.Mesh(oceanBlockGeometry, [oceanSideMaterial, oceanSideMaterial, oceanSideMaterial, oceanSideMaterial, oceanFrontMaterial, oceanSideMaterial])
  oceanBlock.position.y = -3.8; world.add(oceanBlock)
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(oceanBlock.geometry), new THREE.LineBasicMaterial({ color: '#66c8e5', transparent: true, opacity: .29 }))
  frame.position.copy(oceanBlock.position); world.add(frame)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH), new THREE.MeshBasicMaterial({ color: '#3286b0', toneMapped: false }))
  floor.rotation.x = -Math.PI / 2; floor.position.y = -7.51; world.add(floor)
  const loader = new THREE.TextureLoader()
  let backgroundTexture: THREE.Texture | null = null
  function updateBackdropCover() {
    const image = backgroundTexture?.image as { width?: number; height?: number } | undefined
    if (!backgroundTexture || !image?.width || !image.height || !host.clientHeight) return
    const imageAspect = image.width / image.height; const viewportAspect = host.clientWidth / host.clientHeight
    backgroundTexture.repeat.set(Math.min(1, viewportAspect / imageAspect), Math.min(1, imageAspect / viewportAspect))
    backgroundTexture.offset.set((1 - backgroundTexture.repeat.x) * .5, (1 - backgroundTexture.repeat.y) * .5)
    backgroundTexture.updateMatrix()
  }
  backgroundTexture = loader.load(oceanAsset('ocean-atmosphere-backdrop.png'), (texture) => {
    if (disposed) { texture.dispose(); return }
    texture.colorSpace = THREE.SRGBColorSpace
    scene.background = texture; sky.visible = false; updateBackdropCover()
  }, undefined, () => { /* The muted procedural sky remains available offline. */ })
  backgroundTexture.colorSpace = THREE.SRGBColorSpace
  const normals = loader.load(WATER_NORMALS_URL); normals.wrapS = normals.wrapT = THREE.RepeatWrapping
  normals.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
  const water = new Water(new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH), {
    textureWidth: 1024, textureHeight: 1024, waterNormals: normals, sunDirection: sunPosition.clone().normalize(),
    sunColor: 0xb8cad6, waterColor: 0x0576b5, distortionScale: 2.8, fog: true,
  })
  water.rotation.x = -Math.PI / 2; water.position.y = .015; world.add(water)
  const waterMaterial = water.material as THREE.ShaderMaterial
  waterMaterial.uniforms.size!.value = 13
  waterMaterial.uniforms.sunColor!.value.multiplyScalar(.48)
  const windWaterPhase = { value: 0 }; const windWaterStrength = { value: 0 }; const windWaterWeakening = { value: 0 }
  const windWaterBounds = { value: new THREE.Vector2(geoToWorld(140, 0).x, geoToWorld(270, 0).x) }
  const windOceanMask = { value: null as THREE.Texture | null }
  const windWaterUniforms = { windWaterPhase, windWaterStrength, windWaterWeakening, windWaterBounds, windOceanMask }
  const warmWaterProgress = { value: 0 }; const warmWaterPhase = { value: 0 }; const warmWaterStrength = { value: 0 }
  const warmWaterBounds = { value: new THREE.Vector3(geoToWorld(130, 0).x, geoToWorld(175, 0).x, geoToWorld(260, 0).x) }
  const warmWaterMode = { value: 1 }; const warmWaterFront = { value: warmWaterBounds.value.y }
  const warmWaterAccumulationStart = geoToWorld(230, 0).x
  const warmWaterAccumulationWestStart = geoToWorld(155, 0).x
  const warmWaterWest = { value: warmWaterBounds.value.x }
  const warmWaterUniforms = {
    warmWaterProgress, warmWaterPhase, warmWaterStrength, warmWaterBounds, warmWaterMode, warmWaterFront, warmWaterWest,
    warmWaterCore: { value: new THREE.Color('#fa8c4d') }, warmWaterEdge: { value: new THREE.Color('#f5c77e') },
  }
  const windWaterShader = `
    uniform float windWaterPhase,windWaterStrength,windWaterWeakening;
    uniform vec2 windWaterBounds;uniform sampler2D windOceanMask;
    float windWaterCoverage(vec2 p){
      float equatorial=1.-smoothstep(1.6,3.2,abs(p.y));
      float basin=smoothstep(windWaterBounds.x-1.,windWaterBounds.x+2.,p.x)*(1.-smoothstep(windWaterBounds.y-2.,windWaterBounds.y+1.,p.x));
      if(equatorial*basin<.001||windWaterStrength<.001)return 0.;
      return equatorial*basin*smoothstep(.55,.9,texture2D(windOceanMask,vec2(p.x/72.+.5,.5-p.y/36.)).r)*windWaterStrength;
    }
    vec4 windWaterRipples(vec2 p,sampler2D normalMap){
      // Increasing phase transports every crest westward; ENSO changes the
      // magnitude, never the sign. The stored climate field is not advected.
      vec2 translated=vec2(p.x+windWaterPhase,p.y);
      float density=mix(1.,.48,windWaterWeakening);
      vec3 detail=texture2D(normalMap,translated*vec2(.20,1.8)*density).rgb*2.-1.;
      // Continuous curved crests remain readable from the classroom camera.
      // Both the curved crests and elongated surface texture travel together.
      float angle=translated.x*2.35*density+sin(p.y*2.6*density)*.75+detail.r*.55;
      float body=sin(angle);
      float breakup=.45+.55*smoothstep(-.65,.65,detail.g);
      float crest=smoothstep(.48,.96,body)*breakup*mix(1.,.78,windWaterWeakening);
      float streak=sin(p.y*8.*density+detail.r*2.2+sin(translated.x*.7*density)*.8);
      return vec4(cos(angle)*.88+detail.r*.18,detail.g*.24,crest,body*.72+streak*.28);
    }`
  const warmWaterShader = `
    uniform float warmWaterProgress,warmWaterPhase,warmWaterStrength,warmWaterMode,warmWaterFront,warmWaterWest;
    uniform vec3 warmWaterBounds,warmWaterCore,warmWaterEdge;
    float warmWaterCoverage(vec2 p){
      if(warmWaterStrength<.001)return 0.;
      float eastness=clamp((p.x-warmWaterBounds.x)/(warmWaterBounds.z-warmWaterBounds.x),0.,1.);
      float front=warmWaterFront;
      float center=sin((p.x-warmWaterBounds.x)*.32)*.12;
      float halfWidth=mix(2.9,1.75,eastness);
      // Westward accumulation concentrates the warm footprint in the west.
      // Its core color remains unchanged: concentration is not extra heating.
      if(warmWaterMode<0.)halfWidth+=.45*warmWaterProgress*(1.-smoothstep(.1,.65,eastness));
      float latitude=1.-smoothstep(.42,1.22,abs(p.y-center)/halfWidth);
      float longitude=smoothstep(warmWaterWest-1.2,warmWaterWest+1.6,p.x)*(1.-smoothstep(front-1.6,front+1.6,p.x));
      float ocean=smoothstep(.55,.9,texture2D(windOceanMask,vec2(p.x/72.+.5,.5-p.y/36.)).r);
      return latitude*longitude*ocean*warmWaterStrength;
    }
    vec3 warmWaterRipples(vec2 p,sampler2D normalMap){
      // Signed integrated phase carries water east in the expansion lesson or
      // west in accumulation; the warm pool never becomes a rigid moving blob.
      vec2 transported=vec2(p.x-warmWaterPhase,p.y);
      vec3 detail=texture2D(normalMap,transported*vec2(.23,1.25)).rgb*2.-1.;
      float phase=transported.x*2.05+sin(p.y*2.7)*.48+detail.r*.52;
      return vec3(cos(phase)*.62+detail.r*.16,detail.g*.18,sin(phase)*(.55+.22*detail.b));
    }`
  Object.assign(waterMaterial.uniforms, windWaterUniforms, warmWaterUniforms)
  waterMaterial.fragmentShader = windWaterShader + warmWaterShader + waterMaterial.fragmentShader.replace(
    'vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
    `vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );
     float drivenWater=windWaterCoverage(worldPosition.xz);
     if(drivenWater>.001){vec4 directedRipples=windWaterRipples(worldPosition.xz,normalSampler);
       surfaceNormal.xz*=1.-clamp(drivenWater*.42,0.,.58);
       surfaceNormal=normalize(surfaceNormal+vec3(directedRipples.x,0.,directedRipples.y)*drivenWater*.62);}
     float warmWater=warmWaterCoverage(worldPosition.xz);
     if(warmWater>.001){vec3 warmRipples=warmWaterRipples(worldPosition.xz,normalSampler);
       surfaceNormal.xz*=1.-warmWater*.38;
       surfaceNormal=normalize(surfaceNormal+vec3(warmRipples.x,0.,warmRipples.y)*warmWater*.5);}`,
  ).replace('vec3 outgoingLight = albedo;', `vec3 outgoingLight = albedo;
     if(drivenWater>.001){
       vec4 surfaceFlow=windWaterRipples(worldPosition.xz,normalSampler);
       outgoingLight*=1.+surfaceFlow.a*drivenWater*.18;
       outgoingLight=mix(outgoingLight,vec3(.22,.66,.76),clamp(surfaceFlow.b*drivenWater*.30,0.,.46));
     }
     if(warmWater>.001){
       vec3 warmRipples=warmWaterRipples(worldPosition.xz,normalSampler);
       vec3 warmth=mix(warmWaterEdge,warmWaterCore,smoothstep(.18,.82,warmWater));
       // This is a mechanism illustration, never a replacement SST sample.
       // Preserve the underlying water relief and avoid white luminous blocks.
       outgoingLight=mix(outgoingLight,warmth*(.92+warmRipples.z*.16),warmWater*.79);
     }`)

  // Data colors must read against the legend without water sheen, lighting,
  // fog or translucent sea color changing the represented value.
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH), new THREE.MeshBasicMaterial({ transparent: true, opacity: 1, depthWrite: false, toneMapped: false, fog: false }))
  overlay.rotation.x = -Math.PI / 2; overlay.position.y = .03; overlay.renderOrder = 4; world.add(overlay)
  let mapTexture: THREE.CanvasTexture | null = null
  let currentLayer: LayerMode = 'none'; let currentScenario: Scenario = 'normal'
  const oceanMask = new Uint8Array(360 * 180)
  for (let row = 0; row < 180; row++) for (let col = 0; col < 360; col++) oceanMask[row * 360 + col] = terrain.isLand(WORLD_LON_START + col + .5, 89.5 - row) ? 0 : 1
  const textureCache = new Map<string, THREE.CanvasTexture>()
  const fieldFor = (layer: LayerMode) => layer === 'none' ? null : climate[currentScenario][layer === 'sst' ? 'sst' : layer === 'pressure' ? 'pressure' : 'anomaly'] ?? null
  let contoursEnabled = false; let activeContours: THREE.Group | null = null
  const contourCache = new Map<string, THREE.Group>()
  function updateContours() {
    if (activeContours) activeContours.visible = false
    const field = fieldFor(currentLayer)
    if (!contoursEnabled || !field || currentLayer === 'none') return
    const key = `${currentScenario}-${currentLayer}`
    let group = contourCache.get(key)
    if (!group) {
      group = createFieldContours(field, currentLayer, terrain.isLand)
      contourCache.set(key, group); world.add(group)
      group.traverse((object) => { if (object instanceof THREE.Sprite && object.userData.sceneLabel) sceneLabels.push(object) })
    }
    group.visible = true; activeContours = group
  }
  function setContours(enabled: boolean) { contoursEnabled = enabled; updateContours() }
  const sampleMarkerGroup = new THREE.Group(); world.add(sampleMarkerGroup)
  const sampleSites = [
    { lon: 150, lat: 0, name: '西侧', basin: 'pacific', focus: true },
    { lon: 250, lat: 0, name: '东侧', basin: 'pacific', focus: true },
    { lon: 220, lat: 30, name: '', basin: 'pacific' },
    { lon: 180, lat: 45, name: '', basin: 'pacific' },
    { lon: 200, lat: -30, name: '', basin: 'pacific' },
    { lon: 250, lat: -25, name: '', basin: 'pacific' },
    { lon: 325, lat: 35, name: '', basin: 'atlantic' },
    { lon: 330, lat: 0, name: '', basin: 'atlantic' },
    { lon: 340, lat: -30, name: '', basin: 'atlantic' },
    { lon: 75, lat: 10, name: '', basin: 'indian' },
    { lon: 85, lat: -30, name: '', basin: 'indian' },
    { lon: 180, lat: 75, name: '', basin: 'polar' },
    { lon: 210, lat: -55, name: '', basin: 'polar' },
  ]
  const sampleMarkers = sampleSites.filter((point) => !terrain.isLand(point.lon, point.lat)).map((point, index) => {
    const color = point.focus ? point.name === '西侧' ? '#ffd29a' : '#a5e7ff' : '#d4e9ee'
    const location = geoToWorld(point.lon, point.lat); location.y = .16
    const marker = new THREE.Mesh(new THREE.RingGeometry(point.focus ? .16 : .11, point.focus ? .23 : .17, 24), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }))
    marker.rotation.x = -Math.PI / 2; marker.position.copy(location); marker.renderOrder = 18
    const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([location, location.clone()]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .55, depthTest: false, depthWrite: false }))
    const sprite = label(point.name || '读数', color, point.focus ? 5.5 : 4); sprite.position.copy(location); sprite.userData.dataMarker = true
    leader.frustumCulled = false; leader.renderOrder = 18
    sampleMarkerGroup.add(marker, leader, sprite)
    return { ...point, color, index, location, marker, leader, sprite, available: false }
  })
  sampleMarkerGroup.visible = false
  function updateSampleMarkers(layer: LayerMode) {
    const field = fieldFor(layer); sampleMarkerGroup.visible = !!field
    if (!field || layer === 'none') return
    for (const point of sampleMarkers) {
      const value = sampleField(field, point.lon, point.lat)
      point.available = value !== null
      const reading = value === null ? '无资料' : `${layer === 'anomaly' && value > 0 ? '+' : ''}${value.toFixed(1)} ${layer === 'pressure' ? 'hPa' : '℃'}`
      const refreshed = label(point.name ? `${point.name} ${reading}` : reading, point.color, point.focus ? 5.5 : 4)
      point.sprite.material.map?.dispose()
      point.sprite.material.map = refreshed.material.map
      point.sprite.material.needsUpdate = true
      point.sprite.userData.sceneLabel = refreshed.userData.sceneLabel
      refreshed.material.dispose()
    }
  }
  function setLayer(layer: LayerMode) {
    currentLayer = layer; const field = fieldFor(layer)
    syncWarmWaterExpansion()
    updateSampleMarkers(layer); updateContours()
    overlay.visible = !!field; if (!field || layer === 'none') return
    const cacheKey = `${currentScenario}-${layer}`
    mapTexture = textureCache.get(cacheKey) ?? null
    if (!mapTexture) {
      const displayWidth = 1440; const displayHeight = 720
      const canvas = document.createElement('canvas'); canvas.width = displayWidth; canvas.height = displayHeight
      const ctx = canvas.getContext('2d')!; const pixels = ctx.createImageData(displayWidth, displayHeight)
      const displaySample = createCoastalDisplaySampler(field, terrain.isLand)
      // CSS gradients interpolate the supplied sRGB stops. Interpolate those
      // same components here, then let the sRGB texture decode during render.
      const style = layerStyles[layer]; const colors = style.colors.map((value) => new THREE.Color(value).convertLinearToSRGB())
      const color = new THREE.Color()
      // Do not cut this surface with the old 1° center-point ocean mask. It
      // reaches below the terrain (including y=.045 islands), whose precise
      // coastline and depth buffer supply the visible coast without blue gaps.
      for (let row = 0; row < displayHeight; row++) for (let col = 0; col < displayWidth; col++) {
        const index = row * displayWidth + col
        const lon = WORLD_LON_START + (col + .5) * 360 / displayWidth; const lat = 90 - (row + .5) * 180 / displayHeight
        const value = displaySample(lon, lat)
        if (value === null || !Number.isFinite(value)) {
          // Source gaps are not natural blue sea and must never look like a
          // measured temperature. Cover them with the legend's neutral hatch;
          // exact land geometry still occludes this plane, and probes stay null.
          const stripe = (col + row) % 16 < 2
          pixels.data[index * 4] = stripe ? 147 : 204
          pixels.data[index * 4 + 1] = stripe ? 163 : 214
          pixels.data[index * 4 + 2] = stripe ? 175 : 222
          pixels.data[index * 4 + 3] = 255
          continue
        }
        const f = THREE.MathUtils.clamp((value - style.min) / (style.max - style.min), 0, 1) * (colors.length - 1)
        const band = Math.floor(f); color.copy(colors[band]!).lerp(colors[Math.min(band + 1, colors.length - 1)]!, f - band)
        pixels.data[index * 4] = Math.round(color.r * 255); pixels.data[index * 4 + 1] = Math.round(color.g * 255); pixels.data[index * 4 + 2] = Math.round(color.b * 255); pixels.data[index * 4 + 3] = 255
      }
      ctx.putImageData(pixels, 0, 0); mapTexture = new THREE.CanvasTexture(canvas)
      mapTexture.minFilter = mapTexture.magFilter = THREE.NearestFilter; mapTexture.generateMipmaps = false
      mapTexture.colorSpace = THREE.SRGBColorSpace; textureCache.set(cacheKey, mapTexture)
    }
    overlay.material.map = mapTexture; overlay.material.needsUpdate = true
  }

  const effects = new Map<Effect, EffectGroup>(); const flows: Flow[] = []
  const effect = (key: Effect) => {
    let value = effects.get(key)
    if (!value) { value = { group: new THREE.Group(), amount: 0, target: 0 }; effects.set(key, value); world.add(value.group) }
    return value.group
  }
  // This effect drives the official Water shader directly, adding no geometry.
  effect('windDrivenWater')
  const warmWaterGroup = effect('warmWaterExpansion')
  const warmWaterLabel = label('暖水东扩 · 过程示意', '#ffd09a', 7.5)
  warmWaterLabel.position.set(geoToWorld(210, 0).x, .5, 4.7); warmWaterGroup.add(warmWaterLabel)
  const warmAccumulationGroup = effect('warmWaterAccumulation')
  const warmAccumulationLabel = label('暖水西聚 · 过程示意', '#ffd09a', 7.5)
  warmAccumulationLabel.position.set(geoToWorld(178, 0).x, .5, 4.7); warmAccumulationGroup.add(warmAccumulationLabel)
  const arrowShape = new THREE.Shape()
  arrowShape.moveTo(-.8, -.14); arrowShape.lineTo(.12, -.14); arrowShape.lineTo(.12, -.4); arrowShape.lineTo(1.02, 0); arrowShape.lineTo(.12, .4); arrowShape.lineTo(.12, .14); arrowShape.lineTo(-.8, .14); arrowShape.closePath()
  const arrowGeometry = new THREE.ShapeGeometry(arrowShape); arrowGeometry.rotateX(-Math.PI / 2)
  function flow(parent: THREE.Group, points: THREE.Vector3[], color: string, speed = 1, strands = 11) {
    const ensoSensitive = (['wind', 'rise', 'sink', 'return', 'upwelling'] as const)
      .some((key) => effects.get(key)?.group === parent)
    const baseCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .5)
    const samples = 160; const frames = baseCurve.computeFrenetFrames(samples, false)
    const strandCount = Math.max(9, strands)
    // Port the sea-and-land-breezes smoke: two faint haze layers surrounding
    // closely packed fine filaments with rotating offsets and noisy pulses.
    for (let i = -2; i < strandCount; i++) {
      const haze = i < 0; const phase = (i + 2) * .618
      const angle = Math.max(0, i) / strandCount * Math.PI * 2
      const spread = haze ? .02 : .12 + (i % 4) * .035
      const offsets: THREE.Vector3[] = []
      for (let j = 0; j <= samples; j++) {
        const t = j / samples; const curl = Math.sin(t * Math.PI * 2 * 1.15 + phase * .63)
        const twist = phase + t * Math.PI * 2 * 2.35 + curl * .46
        const breathing = .58 + .3 * Math.sin(t * Math.PI * 4.2 + phase) + .12 * Math.sin(t * Math.PI * 10.4 - phase)
        const amplitude = (haze ? .08 : .12) * Math.sin(Math.PI * t)
        offsets.push(baseCurve.getPointAt(t).addScaledVector(frames.normals[j]!, Math.cos(angle) * spread + Math.cos(twist) * amplitude * breathing)
          .addScaledVector(frames.binormals[j]!, Math.sin(angle) * spread + Math.sin(twist) * amplitude * breathing))
      }
      const path = new THREE.CatmullRomCurve3(offsets, false, 'centripetal', .5)
      const material = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uReveal: { value: 0 }, uColor: { value: new THREE.Color(color) }, uPhase: { value: phase }, uBaseOpacity: { value: haze ? .035 : .22 + (i % 3) * .025 }, uHaze: { value: haze ? 1 : 0 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
        vertexShader: `varying vec2 vUv;varying float vFacing;void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.);vec3 wn=normalize(mat3(modelMatrix)*normal);vFacing=1.-abs(dot(wn,normalize(cameraPosition-wp.xyz)));gl_Position=projectionMatrix*viewMatrix*wp;}`,
        fragmentShader: `uniform float uTime,uAlpha,uReveal,uPhase,uBaseOpacity,uHaze;uniform vec3 uColor;varying vec2 vUv;varying float vFacing;
          float hash(float n){return fract(sin(n)*43758.5453123);}float noise(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(hash(i),hash(i+1.),f);}
          void main(){float flow=fract(vUv.x*8.-uTime*.19+uPhase);float pulse=.46+.54*smoothstep(.05,.54,sin(flow*6.28318)*.5+.5);float drift=.58+.42*noise(vUv.x*24.-uTime*1.3+uPhase*31.);float edge=mix(.45+vFacing*.55,.22+vFacing*.78,uHaze);float visible=1.-smoothstep(uReveal-.025,uReveal+.005,vUv.x);float alpha=uAlpha*uBaseOpacity*pulse*drift*edge*visible;if(alpha<.003)discard;gl_FragColor=vec4(uColor*mix(1.05,.78,uHaze),alpha);
          #include <colorspace_fragment>
          }`,
      })
      const radius = haze ? .18 + (i + 2) * .05 : .013 + (i % 5) * .0025
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, samples, radius, haze ? 7 : 5, false), material); mesh.renderOrder = haze ? 6 : 7; parent.add(mesh)
      const arrow = i === 0 || i === Math.floor(strandCount / 2)
        ? new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .82, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }))
        : null
      if (arrow) { parent.add(arrow); arrow.renderOrder = 8; arrow.scale.setScalar(.68) }
      flows.push({ mesh, arrow, curve: baseCurve, phase: Math.max(0, i) / strandCount, speed, elapsed: 0, ensoSensitive })
    }
  }
  const gp = (lon: number, lat: number, y = .52) => { const point = geoToWorld(lon, lat); point.y = y; return point }
  const oceans = effect('oceans')
  for (const [name, lon, lat, vertical] of [['太平洋', 184, 10, true], ['大西洋', 315, 15, true], ['印度洋', 75, -20, false], ['北冰洋', 180, 75, false]] as [string, number, number, boolean][]) {
    const item = oceanNameLabel(name, vertical); item.position.copy(gp(lon, lat, .24)); oceans.add(item)
  }
  const equator = effect('equator')
  equator.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-36, .16, 0), new THREE.Vector3(36, .16, 0)]), new THREE.LineBasicMaterial({ color: '#f56c68', toneMapped: false })))
  const equatorLabel = label('赤道 · 0°', '#ffaaa1', 4); equatorLabel.position.copy(gp(100, 0, .65)); equator.add(equatorLabel)
  const tropicLatitude = 23 + 26 / 60
  for (const [latitude, text] of [[tropicLatitude, '北回归线 · 23°26′N'], [-tropicLatitude, '南回归线 · 23°26′S']] as const) {
    const z = geoToWorld(0, latitude).z
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-36, .16, z), new THREE.Vector3(36, .16, z)]), new THREE.LineDashedMaterial({ color: '#efd185', dashSize: .7, gapSize: .4, toneMapped: false }))
    line.computeLineDistances(); equator.add(line)
    const textLabel = label(text, '#f3dba0', 6.8); textLabel.position.copy(gp(100, latitude, .65)); equator.add(textLabel)
  }

  const currents = effect('currents')
  const maskPixels = new Uint8Array(360 * 180 * 4)
  for (let row = 0; row < 180; row++) for (let col = 0; col < 360; col++) {
    const pixel = ((179 - row) * 360 + col) * 4
    maskPixels[pixel] = maskPixels[pixel + 1] = maskPixels[pixel + 2] = oceanMask[row * 360 + col]! * 255; maskPixels[pixel + 3] = 255
  }
  const oceanMaskTexture = new THREE.DataTexture(maskPixels, 360, 180); oceanMaskTexture.needsUpdate = true
  oceanMaskTexture.minFilter = oceanMaskTexture.magFilter = THREE.LinearFilter
  windOceanMask.value = oceanMaskTexture
  const currentMaterials: THREE.ShaderMaterial[] = []
  // Broad, soft thermal transport ribbons use the exact geographic route data
  // from the atmospheric-circulation lesson. These are mechanisms, not SST data.
  oceanCurrents.filter((route) => currentVisibleInMonth(route, 12)).forEach((route, routeIndex) => {
    const routePoints = route.monsoon ? route.points.slice().reverse() : route.points
    const warm = route.seasonalTemperature ? true : route.warm
    const points: THREE.Vector3[] = []
    for (const [lat, lon] of routePoints) {
      const p = gp(lon, lat, .105)
      if (points.length) { const previousX = points[points.length - 1]!.x; while (p.x - previousX > 36) p.x -= 72; while (p.x - previousX < -36) p.x += 72 }
      points.push(p)
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .5)
    const halfWidth = route.name.includes('赤道') ? .9 : route.basin === 'all' ? 1.0 : .65
    const field = createCurrentField(curve, halfWidth); const geometry = field.geometry
    geometry.translate(0, .035 + routeIndex * .0001, 0)
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { uAlpha: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 }, uLength: { value: field.length }, uField: { value: field.texture }, uDataLayer: { value: 0 }, uPhase: { value: routeIndex * .37 }, uMask: { value: oceanMaskTexture }, uNormal: { value: normals }, uColor: { value: new THREE.Color(warm ? '#f58a45' : '#3ec8ff') }, uCore: { value: new THREE.Color(warm ? '#ffebad' : '#d5faff') } },
      vertexShader: 'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
      fragmentShader: `varying vec2 vUv;varying vec3 vWorld;uniform sampler2D uMask,uNormal,uField;uniform float uAlpha,uReveal,uTime,uLength,uPhase,uDataLayer;uniform vec3 uColor,uCore;
        void main(){vec2 mapUv=vec2(vWorld.x/72.+.5,.5-vWorld.z/36.);if(any(lessThan(mapUv,vec2(0.)))||any(greaterThan(mapUv,vec2(1.))))discard;float mask=texture2D(uMask,mapUv).r;if(mask<.55)discard;
        vec4 field=texture2D(uField,vUv);if(field.a<.1)discard;
        float along=field.r;float lateral=field.g;float feather=exp(-2.5*lateral*lateral)*(1.-smoothstep(.65,1.,lateral));
        float alongDistance=along*uLength;float endFade=clamp(uLength*.16,1.2,3.8);
        float ends=smoothstep(0.,endFade,alongDistance)*(1.-smoothstep(uLength-endFade,uLength,alongDistance));float reveal=1.-smoothstep(uReveal-.06,uReveal+.01,along);
        float cycle=fract((along*uLength-uTime*.91+uPhase+lateral*lateral*.5)/6.0);
        float pulse=exp(-pow((cycle-.5)/.22,2.));
        float wave=texture2D(uNormal,mapUv*vec2(10.,5.)+vec2(uTime*.006,-uTime*.004)).g;
        vec3 color=mix(uColor,uCore,pulse*.22*(1.-lateral*.6));color*=.90+.12*wave;
        float a=uAlpha*field.a*feather*ends*reveal*(.60+.18*pulse)*mix(1.,.62,uDataLayer);if(a<.004)discard;gl_FragColor=vec4(color,a);
        #include <colorspace_fragment>
        }`,
    })
    currentMaterials.push(material)
    for (const wrap of [-72, 0, 72]) { const mesh = new THREE.Mesh(geometry, material); mesh.position.x = wrap; mesh.name = `thermal-transport-${route.name}`; mesh.renderOrder = 5; currents.add(mesh) }
  })
  const west = geoToWorld(150, 0).x; const east = geoToWorld(270, 0).x; const pacificCenter = (west + east) * .5
  flow(effect('wind'), [new THREE.Vector3(east, 2.6, 0), new THREE.Vector3(east - 1.1, 1.3, 0), new THREE.Vector3(pacificCenter, 1.1, 0), new THREE.Vector3(west + 1.1, 1.3, 0), new THREE.Vector3(west, 2.6, 0)], '#66dce9', 1.1, 11)
  flow(effect('rise'), [new THREE.Vector3(west, 1.25, 0), new THREE.Vector3(west - .2, 4.2, 0), new THREE.Vector3(west, 9, 0)], '#ff653b', .8, 11)
  flow(effect('sink'), [new THREE.Vector3(east, 9, 0), new THREE.Vector3(east + .2, 5.1, 0), new THREE.Vector3(east, 1.25, 0)], '#62cfff', .7, 11)
  flow(effect('return'), [new THREE.Vector3(west, 7.6, 0), new THREE.Vector3(west + 1.1, 9, 0), new THREE.Vector3(pacificCenter - 2, 9.8, 0), new THREE.Vector3(east - 1.1, 9, 0), new THREE.Vector3(east, 7.6, 0)], '#a99ce9', .9, 11)
  const pressureGroup = effect('pressure')
  const pWest = label('相对低压 · 西太平洋', '#ffc18a', 6); pWest.position.set(west, .8, 3.5)
  const pEast = label('相对高压 · 东太平洋', '#a4dfff', 6); pEast.position.set(east, .8, 3.5); pressureGroup.add(pWest, pEast)

  const mistTexture = softTexture(); const clouds = effect('clouds'); const cloudTexture = cloudDensityTexture()
  const cloudBodies = [volumeCloud(cloudTexture, west - 1.45, 7.6, -.55, 1), volumeCloud(cloudTexture, west + 1.65, 7.05, .5, .83)]
  const cloudBaseScales = cloudBodies.map((cloud) => cloud.scale.clone())
  clouds.add(...cloudBodies)
  const convectionLabels = (['normal', 'elnino', 'lanina'] as const).map((scenario) => {
    const text = scenario === 'normal' ? '典型对流与雨区 · 正常示意' : scenario === 'elnino' ? '对流雨区向东移 · 典型示意' : '西侧对流增强 · 典型示意'
    const sprite = label(text, '#d8edf8', 10); sprite.position.set(west, 10.8, 0); clouds.add(sprite)
    return { scenario, sprite }
  })
  // Each drop creates a brief, thin pair of ripples only after reaching water.
  const rain = effect('rain'); const rainCount = 112
  const rainPositions = new THREE.BufferAttribute(new Float32Array(rainCount * 6), 3)
  rainPositions.setUsage(THREE.DynamicDrawUsage)
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', rainPositions)
  const rainDrops = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#c2eaff', transparent: true, opacity: .78, depthWrite: false, toneMapped: false }))
  const rippleGeometry = new THREE.PlaneGeometry(.76, .76)
  const rippleAges = new THREE.InstancedBufferAttribute(new Float32Array(rainCount), 1)
  rippleAges.setUsage(THREE.DynamicDrawUsage); rippleGeometry.setAttribute('aImpactAge', rippleAges)
  const rippleMaterial = new THREE.ShaderMaterial({
    uniforms: { uAlpha: { value: 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: `attribute float aImpactAge; varying vec2 vUv; varying float vAge;
      void main(){vUv=uv;vAge=aImpactAge;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uAlpha; varying vec2 vUv; varying float vAge;
      void main(){
        if(vAge<0.||vAge>=1.)discard;
        float r=length(vUv*2.-1.);float radius=.08+.78*sqrt(vAge);
        float lineWidth=max(.024,fwidth(r)*.75);
        float outer=exp(-pow((r-radius)/lineWidth,2.));
        float inner=exp(-pow((r-max(.0,radius-.19))/lineWidth,2.))*.42*smoothstep(.16,.34,vAge);
        float fade=smoothstep(.0,.07,vAge)*pow(1.-vAge,1.7);
        float alpha=(outer+inner)*fade*uAlpha*.58;
        if(alpha<.004)discard;gl_FragColor=vec4(.67,.87,.96,alpha);
      }`,
  })
  const rainRipples = new THREE.InstancedMesh(rippleGeometry, rippleMaterial, rainCount)
  rainRipples.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  rainDrops.frustumCulled = rainRipples.frustumCulled = false
  rainDrops.renderOrder = rainRipples.renderOrder = 8; rain.add(rainDrops, rainRipples)
  const rainDummy = new THREE.Object3D()
  const rainSeeds = Array.from({ length: rainCount }, (_, i) => ({ x: west + Math.sin(i * 77.1) * 2.75, z: Math.sin(i * 13.1) * 1.55, offset: (i * .61803399) % 1, scale: .8 + (i % 5) * .12 }))
  function updateRain(elapsed: number) {
    // Density/development are qualitative cues. Drop speed is held constant
    // across scenarios and is never used as a measurement of rainfall.
    const activeCount = Math.round(76 + Math.max(0, -scenarioBlend) * 32 + Math.max(0, scenarioBlend) * 6)
    rainGeometry.setDrawRange(0, activeCount * 2); rainRipples.count = activeCount
    for (let i = 0; i < rainCount; i++) {
      const drop = rainSeeds[i]!; const phase = (drop.offset + elapsed * (.28 + drop.scale * .06)) % 1
      const falling = phase < .82; const impact = (phase - .82) / .18
      const headY = falling ? 6.8 - phase / .82 * 6.745 : .055
      const tailY = falling ? Math.min(6.8, headY + .54 * drop.scale) : headY
      rainPositions.setXYZ(i * 2, drop.x, headY, drop.z)
      rainPositions.setXYZ(i * 2 + 1, drop.x + (falling ? .055 : 0), tailY, drop.z + (falling ? .015 : 0))
      rainDummy.position.set(drop.x, .055, drop.z); rainDummy.rotation.set(-Math.PI / 2, 0, 0); rainDummy.scale.setScalar(drop.scale)
      rainDummy.updateMatrix(); rainRipples.setMatrixAt(i, rainDummy.matrix)
      rippleAges.setX(i, falling ? -1 : impact)
    }
    rainPositions.needsUpdate = true; rainRipples.instanceMatrix.needsUpdate = true
    rippleAges.needsUpdate = true
  }
  for (let i = 0; i < 5; i++) flow(effect('evaporation'), [new THREE.Vector3(west - 2 + i, .3, 1), new THREE.Vector3(west - 2.1 + i, 2.5, 1), new THREE.Vector3(west - 1.5 + i, 4.8, 1)], '#ef6654', .5, 3)
  const vaporLabel = label('水汽携能上输 · 示意', '#ffb5a9', 6.5); vaporLabel.position.set(west, 4.9, 3); effect('evaporation').add(vaporLabel)
  const evaporationLossLabel = label('蒸发吸热 → 海面失热', '#ffb5a9', 7); evaporationLossLabel.position.set(west, .65, 4.2); effect('evaporation').add(evaporationLossLabel)

  // Radiation waves, an air plume and water-vapour arrows distinguish energy
  // exchange mechanisms; their staggered reveal is a teaching sequence.
  const heatExchange = effect('heatExchange')
  // The local exchange lesson uses open equatorial water near 190° E. Keep
  // its teaching patch separate from the western ENSO reference at 150° E.
  const exchangeOffset = geoToWorld(190, 0).x - west
  heatExchange.position.x = exchangeOffset
  const exchangeStages = [0, 3.2, 6.4].map((start) => { const group = new THREE.Group(); heatExchange.add(group); return { group, start } })
  const processArrows: { mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>; from: THREE.Vector3; to: THREE.Vector3; phase: number; waviness: number }[] = []
  function energyArrow(parent: THREE.Group, from: THREE.Vector3, to: THREE.Vector3, color: string, scale: number, phase: number, waviness = 0) {
    const mesh = new THREE.Mesh(arrowGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }))
    mesh.scale.setScalar(scale); mesh.renderOrder = 9; parent.add(mesh); processArrows.push({ mesh, from, to, phase, waviness })
  }
  const radiation = exchangeStages[0]!.group; const sensible = exchangeStages[1]!.group; const latent = exchangeStages[2]!.group
  const exchangeAirFields: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = []
  const airFieldVertexShader = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
  function airField(parent: THREE.Group, material: THREE.ShaderMaterial, width: number, height: number, x: number, z: number) {
    // Stage-owned uniforms must not be overwritten by the generic effect fade.
    material.userData.heatExchangeStage = true
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
    mesh.position.set(x, .3 + height * .5, z); mesh.renderOrder = 9
    parent.add(mesh); exchangeAirFields.push(mesh); return mesh
  }
  function radiativeWaves(x: number, direction: number, color: string) {
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false,
      uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 }, uDirection: { value: direction }, uColor: { value: new THREE.Color(color) } },
      vertexShader: airFieldVertexShader,
      fragmentShader: `varying vec2 vUv;uniform float uAlpha,uTime,uDirection;uniform vec3 uColor;
        void main(){
          float y=vUv.y;float x=(vUv.x-.5)*2.;
          // Positive phase velocity carries the wave upward; the second lane
          // has the opposite sign and carries atmospheric radiation downward.
          float phase=y*18.84956-uDirection*uTime*3.1;
          float bend=.30*sin(phase)+.055*sin(phase*2.+.7);
          float distance=min(abs(x-bend-.22),abs(x-bend+.22));
          float aa=max(fwidth(distance),.012);
          float core=1.-smoothstep(.05,.05+aa,distance);
          float halo=exp(-distance*distance/.022);
          float travel=.62+.38*cos(y*8.-uDirection*uTime*2.4);
          float ends=smoothstep(.015,.13,y)*(1.-smoothstep(.85,.995,y));
          float edge=1.-smoothstep(.78,1.,abs(x));
          float alpha=uAlpha*ends*edge*(core*.70+halo*.25)*travel;
          if(alpha<.004)discard;
          vec3 tint=mix(uColor,vec3(.96,.91,1.),core*.21);
          gl_FragColor=vec4(tint,alpha);
          #include <colorspace_fragment>
        }`,
    })
    return airField(radiation, material, 1.8, 5.15, x, -1.6)
  }
  radiativeWaves(west - 6, 1, '#b692fa')
  radiativeWaves(west - 3.6, -1, '#d7c2ff')
  const sensibleMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false,
    uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 }, uWarm: { value: new THREE.Color('#e99e59') }, uLight: { value: new THREE.Color('#ffe0ab') } },
    vertexShader: airFieldVertexShader,
    fragmentShader: `varying vec2 vUv;uniform float uAlpha,uTime;uniform vec3 uWarm,uLight;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float n=.55*noise(p);n+=.28*noise(p*2.03+4.7);n+=.17*noise(p*4.07-2.3);return n;}
      void main(){
        float y=vUv.y;float x=(vUv.x-.5)*2.;
        // A narrow heated-air source expands and disperses as it rises. The
        // drifting density is a qualitative heat plume, not smoke or rain.
        float sway=(.055+.12*y)*sin(y*7.-uTime*.8)+.035*sin(y*17.-uTime*1.3);
        float width=.17+.57*pow(y,.78);float lateral=(x-sway)/width;
        float broad=fbm(vec2(lateral*2.1,y*4.2-uTime*.42));
        float detail=fbm(vec2(lateral*4.+broad,y*8.5-uTime*.78));
        float envelope=exp(-lateral*lateral*2.6);
        float wisps=smoothstep(.24,.80,broad*.64+detail*.36);
        float thread=exp(-pow((lateral-.35*sin(y*11.-uTime*1.5+broad*4.))/.23,2.));
        float ends=smoothstep(.0,.07,y)*(1.-smoothstep(.64,1.,y));
        float alpha=uAlpha*ends*envelope*(.24+wisps*.60+thread*.17);
        if(alpha<.004)discard;
        vec3 tint=mix(uWarm,uLight,clamp(y*.62+wisps*.28,0.,1.));
        gl_FragColor=vec4(tint,alpha);
        #include <colorspace_fragment>
      }`,
  })
  airField(sensible, sensibleMaterial, 4.2, 5.05, west + .4, .2)
  for (let i = 0; i < 3; i++) energyArrow(latent, new THREE.Vector3(west + 5.6, .7, 1.5), new THREE.Vector3(west + 6, 5.1, 1.5), '#ef6654', .47, i / 3)
  const radiativeUpLabel = label('海面长波辐射 ↑', '#dcc7ff', 5.8); radiativeUpLabel.position.set(west - 6, 6.5, -1.8)
  const radiativeDownLabel = label('大气逆辐射 ↓', '#c5ceff', 5.1); radiativeDownLabel.position.set(west - 3.6, .4, -.5)
  radiation.add(radiativeUpLabel, radiativeDownLabel)
  const sensibleLabel = label('显热传递 · 海暖气凉时', '#ffdbab', 7.6); sensibleLabel.position.set(west + .4, 6.5, .2); sensible.add(sensibleLabel)
  const latentLabel = label('水汽携带潜热 ↑', '#ffb5a9', 6.1); latentLabel.position.set(west + 5.7, 8.3, 1.5)
  const latentLossLabel = label('蒸发使海面失热', '#ffb5a9', 5.8); latentLossLabel.position.set(west + 5.8, .5, 3); latent.add(latentLabel, latentLossLabel)

  const condensationCue = new THREE.Group(); clouds.add(condensationCue)
  const condensationLabel = label('凝结放热 → 周围空气增温', '#ffdcad', 9)
  condensationLabel.position.set(west + 1.5, 7.2, 4.2); condensationCue.add(condensationLabel)
  // A broad, slowly expanding warmth field surrounds the condensation zone.
  // It is separate from cloud density and does not recolor or animate droplets.
  const condensationMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false,
    uniforms: { uAlpha: { value: 0 }, uTime: { value: 0 }, uWarm: { value: new THREE.Color('#e7ad72') }, uLight: { value: new THREE.Color('#ffe0b2') } },
    vertexShader: airFieldVertexShader,
    fragmentShader: `varying vec2 vUv;uniform float uAlpha,uTime;uniform vec3 uWarm,uLight;
      void main(){
        vec2 p=(vUv-.5)*2.;p.y*=1.08;
        float r=length(p);float angle=atan(p.y,p.x);
        float distance=r+.025*sin(angle*3.+uTime*.13)+.018*sin(angle*5.-uTime*.09);
        float spread=0.;
        for(int i=0;i<2;i++){
          float phase=fract(uTime*.085+float(i)*.5);
          float radius=.27+phase*.69;
          float fade=smoothstep(.0,.16,phase)*(1.-smoothstep(.55,1.,phase));
          spread+=exp(-pow((distance-radius)/.21,2.))*fade;
        }
        float ambient=exp(-pow((r-.53)/.34,2.));
        float edge=(1.-smoothstep(.79,1.06,r))*smoothstep(.16,.34,r);
        float alpha=uAlpha*edge*(ambient*.12+spread*.27);
        if(alpha<.004)discard;
        vec3 tint=mix(uWarm,uLight,smoothstep(.3,.94,r)*.62);
        gl_FragColor=vec4(tint,alpha);
        #include <colorspace_fragment>
      }`,
  })
  const condensationHalo = new THREE.Mesh(new THREE.PlaneGeometry(12, 7.2), condensationMaterial)
  condensationHalo.position.set(west, 7.55, 0); condensationHalo.renderOrder = 8; condensationCue.add(condensationHalo)

  const sun = effect('sun'); const sunTexture = loader.load(SUN_TEXTURE_URL); sunTexture.colorSpace = THREE.SRGBColorSpace
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 36, 24), new THREE.MeshBasicMaterial({ map: sunTexture, color: '#ffd28e' }))
  sunMesh.position.copy(sunPosition); sun.add(sunMesh)
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTexture, color: '#ffe2a3', blending: THREE.AdditiveBlending, transparent: true, opacity: .4, depthWrite: false }))
  glow.position.copy(sunPosition); glow.scale.set(6, 6, 1); sun.add(glow)
  const beamTarget = new THREE.Vector3(west, .2, 0); const beamDirection = beamTarget.clone().sub(sunPosition)
  const beamBaseLength = beamDirection.length()
  const beamMaterial = new THREE.ShaderMaterial({ uniforms: { uAlpha: { value: 0 }, uReveal: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;uniform float uAlpha,uReveal;void main(){float d=1.-vUv.y;float a=uAlpha*(1.-smoothstep(uReveal-.05,uReveal+.01,d))*(.25+.4*sin(vUv.x*3.14159));gl_FragColor=vec4(1.,.78,.43,a*.12);}',
  })
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, 3, beamBaseLength, 40, 1, true), beamMaterial)
  beam.position.copy(sunPosition).add(beamTarget).multiplyScalar(.5); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDirection.clone().normalize().negate()); sun.add(beam)
  // The local warming cue is a mechanism animation, separate from all measured
  // climate fields. Hide it when a historical data layer is selected.
  const heatingGroup = new THREE.Group(); sun.add(heatingGroup)
  const heatingMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uAlpha: { value: 0 }, uHeat: { value: 0 }, uTime: { value: 0 }, uMask: { value: oceanMaskTexture }, uNormal: { value: normals } },
    vertexShader: 'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
    fragmentShader: `varying vec2 vUv;varying vec3 vWorld;uniform float uAlpha,uHeat,uTime;uniform sampler2D uMask,uNormal;
      void main(){vec2 mapUv=vec2(vWorld.x/72.+.5,.5-vWorld.z/36.);if(texture2D(uMask,mapUv).r<.55)discard;
        vec2 p=(vUv-.5)*2.;float wave=texture2D(uNormal,mapUv*vec2(10.,5.)+vec2(uTime*.006,-uTime*.003)).g;
        float r=length(p+vec2(sin(p.y*7.+uTime*.35),cos(p.x*6.-uTime*.25))*.035);float reach=mix(.28,1.,uHeat);float heat=exp(-3.*r*r/(reach*reach))*(1.-smoothstep(.82,1.,r));
        float rings=0.;for(int i=0;i<3;i++){float progress=fract(uTime*.14+float(i)/3.);float ring=exp(-pow((r-progress*.96)/.012,2.));rings+=ring*(1.-progress)*smoothstep(.04,.18,progress);}
        vec3 warm=mix(vec3(1.,.63,.17),vec3(1.,.20,.06),heat*uHeat);warm*=.88+.2*wave;float a=uAlpha*uHeat*(heat*.54+rings*.15);if(a<.004)discard;gl_FragColor=vec4(mix(warm,vec3(1.,.87,.48),min(.45,rings*.25)),a);
        #include <colorspace_fragment>
      }`,
  })
  const heatingSurface = new THREE.Mesh(new THREE.PlaneGeometry(13, 8), heatingMaterial); heatingSurface.rotation.x = -Math.PI / 2
  heatingSurface.position.set(west, .13, 0); heatingSurface.renderOrder = 6; heatingGroup.add(heatingSurface)
  const heatingLabel = label('水面吸热 · 升温示意', '#ffd398', 7); heatingLabel.position.set(west, .6, 4.4); heatingGroup.add(heatingLabel)

  const section = effect('section')
  const sectionMaterial = new THREE.ShaderMaterial({ uniforms: { uTilt: { value: .24 }, uDepth: { value: .37 }, uAlpha: { value: 0 }, uTime: { value: 0 }, uReference: { value: 0 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    // A smooth illustrative vertical temperature profile, not an extrapolation
    // of the observed SST product. The logistic midpoint is chosen so that the
    // highlighted thermocline proxy remains the 20 °C isotherm.
    fragmentShader: `varying vec2 vUv;uniform float uTilt,uDepth,uAlpha,uTime,uReference;
      void main(){
        float depth=1.-vUv.y;float thermocline=uDepth+uTilt*(.5-vUv.x);
        float temperature=5.+24./(1.+exp((depth-thermocline)*8.-.5108256));
        vec3 color=mix(vec3(.08,.22,.34),vec3(.24,.48,.59),smoothstep(5.,16.,temperature));
        color=mix(color,vec3(.46,.66,.64),smoothstep(13.,23.,temperature));
        color=mix(color,vec3(.88,.69,.43),smoothstep(21.,29.,temperature));
        float drift=sin(vUv.x*38.+depth*9.-uTime*.22)*sin(depth*24.+vUv.x*7.+uTime*.09);
        color*=1.+drift*.014;
        float reference=.37+.24*(.5-vUv.x);
        float dash=step(.40,fract(vUv.x*28.));
        float referenceLine=exp(-pow((depth-reference)/.009,2.))*dash*uReference;
        color=mix(color,vec3(.66,.83,.94),referenceLine*.8);
        float contour=exp(-pow((depth-thermocline)/.009,2.));color=mix(color,vec3(.98,.91,.66),contour*.65);
        gl_FragColor=vec4(color,uAlpha*.94);
        #include <colorspace_fragment>
      }`,
  })
  const sectionPlane = new THREE.Mesh(new THREE.PlaneGeometry(34, 7.2, 1, 1), sectionMaterial)
  const sectionCenter = pacificCenter - 2
  sectionPlane.position.set(sectionCenter, -3.6, 18.08); sectionPlane.renderOrder = 10; section.add(sectionPlane)
  // Replace only the window occupied by the section, not the entire ocean
  // block. These opaque front-face strips meet the original edges exactly.
  const sectionOpeningFrame = new THREE.Group(); sectionOpeningFrame.visible = false; world.add(sectionOpeningFrame)
  const sectionLeft = sectionCenter - 17; const sectionRight = sectionCenter + 17
  const blockBottomY = oceanBlock.position.y - 3.75; const blockTopY = oceanBlock.position.y + 3.75
  const sectionBottomY = sectionPlane.position.y - 3.6
  for (const [left, right, bottom, top] of [
    [-WORLD_WIDTH / 2, sectionLeft, blockBottomY, blockTopY],
    [sectionRight, WORLD_WIDTH / 2, blockBottomY, blockTopY],
    [sectionLeft, sectionRight, blockBottomY, sectionBottomY],
  ] as [number, number, number, number][]) {
    if (right <= left || top <= bottom) continue
    const geometry = new THREE.PlaneGeometry(right - left, top - bottom)
    geometry.translate((left + right) * .5, (bottom + top) * .5, WORLD_DEPTH / 2)
    const vertices = geometry.getAttribute('position'); const colors = new Float32Array(vertices.count * 3)
    for (let index = 0; index < vertices.count; index++) {
      const height = THREE.MathUtils.clamp((vertices.getY(index) - blockBottomY) / 7.5, 0, 1)
      blockColor.copy(blockBottom).lerp(blockTop, height).toArray(colors, index * 3)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    sectionOpeningFrame.add(new THREE.Mesh(geometry, oceanSideMaterial))
  }
  let thermoclineLabel: THREE.Sprite | undefined
  for (const [text, x, y, color, width] of [['西太平洋', -8, .7, '#ffd4a5', 5], ['东太平洋', 17, .7, '#ffd4a5', 5], ['表层暖水', 3, -1.1, '#ffe5b4', 4], ['20 ℃ 线 · 位置参考', 4, -3, '#c4e8e5', 7], ['深层冷水', 4, -5.7, '#b6def4', 4]] as [string, number, number, string, number][]) {
    const textSprite = label(text, color, width); textSprite.position.set(sectionCenter + x - 4, y, 18.3); section.add(textSprite)
    if (text.startsWith('20 ℃')) thermoclineLabel = textSprite
  }
  const sectionTitle = label('赤道太平洋剖面（前缘放大示意）', '#b8e8ec', 13); sectionTitle.position.set(sectionCenter, -7.6, 18.3); section.add(sectionTitle)
  const sectionComparison = new THREE.Group(); sectionComparison.visible = false; section.add(sectionComparison)
  const referenceLabel = label('虚线：正常位置', '#b9e1f5', 5.5)
  referenceLabel.position.set(sectionCenter - 10.5, -4.35, 18.34); sectionComparison.add(referenceLabel)
  const eastDisplacementX = east - 1.5
  const displacementShape = new THREE.Shape()
  displacementShape.moveTo(-.085, 0); displacementShape.lineTo(.085, 0); displacementShape.lineTo(.085, .68)
  displacementShape.lineTo(.26, .68); displacementShape.lineTo(0, 1); displacementShape.lineTo(-.26, .68); displacementShape.lineTo(-.085, .68); displacementShape.closePath()
  const displacementArrow = new THREE.Mesh(new THREE.ShapeGeometry(displacementShape), new THREE.MeshBasicMaterial({ color: '#ffc584', transparent: true, opacity: 0, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }))
  displacementArrow.position.set(eastDisplacementX, 0, 18.42); displacementArrow.renderOrder = 23; sectionComparison.add(displacementArrow)
  const deeperLabel = label('东部加深', '#ffc584', 3.6); const shallowerLabel = label('东部变浅', '#a3e2ff', 3.6)
  sectionComparison.add(deeperLabel, shallowerLabel)
  flow(effect('upwelling'), [new THREE.Vector3(east - 1, -6.3, 18.5), new THREE.Vector3(east, -3.3, 18.5), new THREE.Vector3(east, -.5, 18.5), new THREE.Vector3(east - 7, -.5, 18.5)], '#a9eeff', .6, 7)

  let disposed = false; let moving = true; let time = 0; let frameId = 0; let previous = 0
  let transition = 1; let followCamera = true; let scenarioBlend = 0; let targetBlend = 0; let heatingElapsed = 0; let heatExchangeElapsed = 0; let windWaterElapsed = 0; let currentLessonId = ''
  updateRain(0)
  function updateHeatExchange(elapsed: number) {
    const amount = effects.get('heatExchange')?.amount ?? 0
    if (moving && (effects.get('heatExchange')?.target ?? 0) > 0) heatExchangeElapsed += elapsed
    for (const stage of exchangeStages) {
      const alpha = amount * THREE.MathUtils.smoothstep(heatExchangeElapsed, stage.start, stage.start + .9)
      stage.group.visible = alpha > .005
      stage.group.traverse((object) => {
        const material = (object as THREE.Mesh).material
        if (!material || Array.isArray(material)) return
        if (material instanceof THREE.ShaderMaterial && material.userData.heatExchangeStage) {
          material.uniforms.uAlpha!.value = alpha
          material.uniforms.uTime!.value = Math.max(0, heatExchangeElapsed - stage.start)
        } else material.opacity = (material.userData.baseOpacity ?? .9) * alpha
      })
    }
  }
  let sectionEvolutionElapsed = 0; let sectionBlend = 0
  function syncSectionEvolution() {
    const comparing = currentLessonId === 'elnino-thermocline' || currentLessonId === 'lanina-thermocline'
    // These two lessons start from the same neutral cross-section even when the
    // preceding page has already reached its ENSO atmosphere/wind state.
    sectionBlend = comparing ? targetBlend * THREE.MathUtils.smoothstep(sectionEvolutionElapsed, 1, 8) : scenarioBlend
    const tilt = .24 - sectionBlend * .2
    // A smaller mean-depth shift permits the western Pacific to shoal in
    // El Nino (deepen in La Nina), while the eastern side changes oppositely.
    const depth = .37 + sectionBlend * .03
    sectionMaterial.uniforms.uTilt!.value = tilt; sectionMaterial.uniforms.uDepth!.value = depth
    sectionMaterial.uniforms.uReference!.value = comparing ? 1 : 0
    if (thermoclineLabel) {
      const labelU = (thermoclineLabel.position.x - sectionCenter) / 34 + .5
      thermoclineLabel.position.y = -7.2 * (depth + tilt * (.5 - labelU))
    }
    sectionComparison.visible = comparing && (effects.get('section')?.target ?? 0) > 0
    const referenceDepth = .37 + .24 * (.5 - ((eastDisplacementX - sectionCenter) / 34 + .5))
    const currentDepth = depth + tilt * (.5 - ((eastDisplacementX - sectionCenter) / 34 + .5))
    const referenceY = -7.2 * referenceDepth; const currentY = -7.2 * currentDepth
    const displacement = currentY - referenceY
    displacementArrow.position.y = referenceY; displacementArrow.scale.y = displacement
    const arrowVisible = comparing && Math.abs(displacement) > .035
    displacementArrow.visible = arrowVisible
    displacementArrow.material.color.set(sectionBlend >= 0 ? '#ffc584' : '#a3e2ff')
    displacementArrow.material.opacity = THREE.MathUtils.smoothstep(Math.abs(displacement), .035, .2) * .92
    referenceLabel.material.opacity = comparing ? 1 : 0
    deeperLabel.visible = arrowVisible && sectionBlend > 0; shallowerLabel.visible = arrowVisible && sectionBlend < 0
    for (const marker of [deeperLabel, shallowerLabel]) {
      marker.position.set(eastDisplacementX - 4, (referenceY + currentY) * .5, 18.4)
      marker.material.opacity = displacementArrow.material.opacity
    }
  }
  function updateSectionEvolution(elapsed: number) {
    const comparing = currentLessonId === 'elnino-thermocline' || currentLessonId === 'lanina-thermocline'
    if (moving && comparing) sectionEvolutionElapsed = Math.min(8, sectionEvolutionElapsed + Math.min(Math.max(elapsed, 0), 1))
    syncSectionEvolution()
  }
  let warmExpansionElapsed = 0
  function syncWarmWaterExpansion() {
    const expanding = (effects.get('warmWaterExpansion')?.target ?? 0) > 0
    const accumulating = (effects.get('warmWaterAccumulation')?.target ?? 0) > 0
    const enabled = (expanding || accumulating) && currentLayer === 'none'
    warmWaterMode.value = accumulating ? -1 : 1
    warmWaterProgress.value = THREE.MathUtils.smoothstep(warmExpansionElapsed, 1.5, 12)
    warmWaterFront.value = THREE.MathUtils.lerp(accumulating ? warmWaterAccumulationStart : warmWaterBounds.value.y, accumulating ? warmWaterBounds.value.y : warmWaterBounds.value.z, warmWaterProgress.value)
    warmWaterWest.value = accumulating ? THREE.MathUtils.lerp(warmWaterAccumulationWestStart, warmWaterBounds.value.x, warmWaterProgress.value) : warmWaterBounds.value.x
    warmWaterStrength.value = enabled ? THREE.MathUtils.smoothstep(warmExpansionElapsed, 0, .65) : 0
    warmWaterGroup.visible = enabled && expanding && warmWaterStrength.value > .005
    warmAccumulationGroup.visible = enabled && accumulating && warmWaterStrength.value > .005
    warmWaterLabel.material.opacity = warmWaterStrength.value
    warmAccumulationLabel.material.opacity = warmWaterStrength.value
  }
  function updateWarmWaterExpansion(elapsed: number) {
    // Viewing a measured data layer parks this mechanism demonstration. Pause,
    // layer changes and replay therefore never turn into hidden time jumps.
    const accumulating = (effects.get('warmWaterAccumulation')?.target ?? 0) > 0
    if (moving && ((effects.get('warmWaterExpansion')?.target ?? 0) > 0 || accumulating) && currentLayer === 'none') {
      const step = Math.min(Math.max(elapsed, 0), 1)
      warmExpansionElapsed = Math.min(12, warmExpansionElapsed + step)
      warmWaterPhase.value += step * (accumulating ? -.96 : .72)
    }
    syncWarmWaterExpansion()
  }
  const teaching = createTeachingEffects({ effect, label, terrain: terrain.group, amount: (key) => effects.get(key)?.amount ?? 0 })
  const chinaFocus = geoToWorld(112, 34).setY(1)
  const positions: Record<ViewMode, [THREE.Vector3, THREE.Vector3]> = {
    world: [new THREE.Vector3(0, 38, 47), new THREE.Vector3(0, -1.3, 0)],
    pacific: [new THREE.Vector3(pacificCenter, 23, 34), new THREE.Vector3(sectionCenter, 1.4, 0)],
    section: [new THREE.Vector3(sectionCenter + 1, 12, 48), new THREE.Vector3(sectionCenter, -1.3, 9)],
    surface: [new THREE.Vector3(sectionCenter - 2, 23, 38), new THREE.Vector3(sectionCenter - 5, 4, 0)],
    'exchange-side': [new THREE.Vector3(west + exchangeOffset + 14, 19, 29), new THREE.Vector3(west + exchangeOffset, 4.5, .7)],
    'water-cycle': [new THREE.Vector3(2, 20, 26), new THREE.Vector3(-.1, 2.5, 3.4)],
    'walker-west': [new THREE.Vector3(west + 6, 14, 21), new THREE.Vector3(west, 4.2, 0)],
    'walker-east': [new THREE.Vector3(east - 6, 14, 21), new THREE.Vector3(east, 4.2, 0)],
    china: [chinaFocus.clone().add(new THREE.Vector3(2, 13, 20)), chinaFocus],
  }
  const exchangeFramingCamera = new THREE.PerspectiveCamera(43, 1, .1, 400)
  const exchangeFrameLabels = [radiativeUpLabel, radiativeDownLabel, sensibleLabel, latentLabel, latentLossLabel, vaporLabel, evaporationLossLabel, condensationLabel]
  function fitExchangeView(width: number, height: number) {
    if (!width || !height) return
    // Frame the local lesson in the open area between the course panel and the
    // collapsed right panels. The same composition serves the first 3 pages.
    const left = width >= 1000 ? 360 : width >= 760 ? width * .31 + 22 : 24
    const right = width - (width >= 1000 ? 210 : 24)
    const top = Math.max(150, height * .24); const bottom = Math.max(top + 260, height - 155)
    const centerX = (left + right) / width - 1; const centerY = 1 - (top + bottom) / height
    const focus = new THREE.Vector3(west + exchangeOffset + .5, 4.5, .7)
    const direction = new THREE.Vector3(.08, .28, 1).normalize()
    const rightAxis = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize()
    const upAxis = new THREE.Vector3().crossVectors(direction, rightAxis).normalize()
    const halfFov = Math.tan(THREE.MathUtils.degToRad(43 * .5)); const aspect = width / height
    exchangeFramingCamera.aspect = aspect; exchangeFramingCamera.updateProjectionMatrix()
    const projected = new THREE.Vector3(); const aim = new THREE.Vector3(); const eye = new THREE.Vector3()
    for (let distance = 26; distance <= 85; distance += .5) {
      aim.copy(focus).addScaledVector(rightAxis, -centerX * distance * halfFov * aspect).addScaledVector(upAxis, -centerY * distance * halfFov)
      eye.copy(aim).addScaledVector(direction, distance)
      exchangeFramingCamera.position.copy(eye); exchangeFramingCamera.lookAt(aim); exchangeFramingCamera.updateMatrixWorld()
      const fits = exchangeFrameLabels.every((sprite) => {
        projected.copy(sprite.position); projected.x += exchangeOffset; projected.project(exchangeFramingCamera)
        const spec = sprite.userData.sceneLabel; const halfWidth = spec.minPixels * .6 + 8; const halfHeight = halfWidth * spec.aspect + 8
        const x = (projected.x + 1) * width * .5; const y = (1 - projected.y) * height * .5
        return x - halfWidth >= left && x + halfWidth <= right && y - halfHeight >= top && y + halfHeight <= bottom
      })
      if (fits || distance === 85) { positions['exchange-side'][0].copy(eye); positions['exchange-side'][1].copy(aim); break }
    }
  }
  const pacificDefault = positions.pacific.map((position) => position.clone())
  function fitRegionalView(width: number, height: number) {
    positions.pacific[0].copy(pacificDefault[0]!); positions.pacific[1].copy(pacificDefault[1]!)
    if (!width || !height || !(effects.get('regionalImpacts')?.target)) return
    const signs = teaching.regionalSignPositions()
    const focus = new THREE.Box3().setFromPoints(signs).getCenter(new THREE.Vector3()); focus.y = 2.4
    const direction = new THREE.Vector3(0, .56, .83).normalize()
    const frameCamera = new THREE.PerspectiveCamera(43, width / height, .1, 400)
    const projected = new THREE.Vector3()
    for (let distance = 40; distance <= 120; distance += 1) {
      frameCamera.position.copy(focus).addScaledVector(direction, distance)
      frameCamera.lookAt(focus); frameCamera.updateMatrixWorld()
      const fits = signs.every((position) => {
        projected.copy(position).project(frameCamera)
        const x = (projected.x + 1) * width / 2, y = (1 - projected.y) * height / 2
        return x > 120 && x < width - 120 && y > 225 && y < height - 190
      })
      if (fits || distance === 120) {
        positions.pacific[0].copy(frameCamera.position); positions.pacific[1].copy(focus); break
      }
    }
  }
  let currentView: ViewMode = 'world'; camera.position.copy(positions.world[0]); controls.target.copy(positions.world[1]); controls.update()
  controls.addEventListener('start', () => { followCamera = false })
  function setView(view: ViewMode) { if (view === 'exchange-side') fitExchangeView(host.clientWidth, host.clientHeight); fitRegionalView(host.clientWidth, host.clientHeight); currentView = view; followCamera = true }
  function setLesson(step: LessonStep, layer: LayerMode = step.layer, options: { preserveView?: boolean } = {}) {
    const hadWindDrivenWater = (effects.get('windDrivenWater')?.target ?? 0) > 0
    currentScenario = step.scenario; targetBlend = currentScenario === 'elnino' ? 1 : currentScenario === 'lanina' ? -1 : 0
    effects.forEach((item, key) => { item.target = step.effects.includes(key) ? 1 : 0 })
    if (!hadWindDrivenWater || !step.effects.includes('windDrivenWater') || step.id === currentLessonId) {
      windWaterElapsed = 0; windWaterPhase.value = 0; windWaterStrength.value = 0
    }
    warmExpansionElapsed = 0; warmWaterPhase.value = 0; warmWaterProgress.value = 0; warmWaterStrength.value = 0
    const warmExpansion = effects.get('warmWaterExpansion')!
    warmExpansion.amount = warmExpansion.target; warmWaterGroup.visible = false
    const warmAccumulation = effects.get('warmWaterAccumulation')!
    warmAccumulation.amount = warmAccumulation.target; warmAccumulationGroup.visible = false
    currentLessonId = step.id
    sectionEvolutionElapsed = 0
    // Pressure text describes the normal reference only; ENSO pages use the selected pressure field.
    if (currentScenario !== 'normal') effects.get('pressure')!.target = 0
    transition = 0; heatingElapsed = 0; heatExchangeElapsed = 0
    // Choosing a page while paused shows its complete static teaching state.
    // Comparison likewise changes only the scenario, without re-revealing all
    // effects or moving the camera. Resume continues from this shown state.
    if (!moving || options.preserveView) {
      effects.forEach((item) => { item.amount = item.target })
      scenarioBlend = targetBlend; transition = 1; heatingElapsed = 8.2; heatExchangeElapsed = 8
      sectionEvolutionElapsed = 8; warmExpansionElapsed = 12; windWaterElapsed = 2.6
      windWaterWeakening.value = Math.max(0, scenarioBlend)
      const windResponse = scenarioBlend > 0 ? 1 - scenarioBlend * .72 : 1 - scenarioBlend * .38
      windWaterStrength.value = (effects.get('windDrivenWater')?.target ?? 0) * windResponse
      updateRain(time)
    }
    teaching.setLesson(step, !moving || Boolean(options.preserveView))
    syncSectionEvolution(); setLayer(layer)
    if (options.preserveView) followCamera = false
    else setView(step.view)
  }
  let resizePending = true; let renderedWidth = 0; let renderedHeight = 0
  function resize() {
    if (!resizePending || disposed) return
    resizePending = false
    const width = host.clientWidth; const height = host.clientHeight; if (!width || !height || disposed) return
    if (width === renderedWidth && height === renderedHeight) return
    renderedWidth = width; renderedHeight = height
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix()
    updateBackdropCover()
    fitExchangeView(width, height)
    fitRegionalView(width, height)
    // The whole-world page must retain all coastlines, even beside a wide lesson
    // panel. Pacific lessons use their closer preset instead of this fit.
    const direction = new THREE.Vector3(0, .642, .767).normalize()
    const right = new THREE.Vector3(1, 0, 0); const up = new THREE.Vector3().crossVectors(direction, right)
    const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)); const offset = new THREE.Vector3()
    let distance = 0
    for (const x of [-36.5, 36.5]) for (const y of [-8.4, 4]) for (const z of [-18.5, 18.5]) {
      offset.set(x, y, z).sub(positions.world[1])
      distance = Math.max(distance, offset.dot(direction) + Math.max(Math.abs(offset.dot(right)) / (halfFov * camera.aspect * .92), Math.abs(offset.dot(up)) / (halfFov * .9)))
    }
    positions.world[0].copy(positions.world[1]).addScaledVector(direction, distance + .8)
    if (!previous && currentView === 'world') camera.position.copy(positions.world[0])
  }
  // ResizeObserver runs after animation callbacks. Resizing its canvas there
  // clears the just-rendered frame before paint, exposing an empty canvas.
  // Coalesce notifications and resize only in the frame that redraws it.
  const observer = new ResizeObserver(() => { resizePending = true }); observer.observe(host)
  const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); const intersection = new THREE.Vector3()
  function probe(event: PointerEvent) {
    if (event.buttons || currentLayer === 'none') { onProbe(null); return }
    const rect = renderer.domElement.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(plane, intersection) || Math.abs(intersection.x) > 36 || Math.abs(intersection.z) > 18) { onProbe(null); return }
    const { lon, lat } = worldToGeo(intersection.x, intersection.z)
    if (terrain.isLand(lon, lat)) { onProbe(null); return }
    const field = fieldFor(currentLayer); onProbe({ lon, lat, value: field ? sampleField(field, lon, lat) : null, layer: currentLayer })
  }
  const clearProbe = () => onProbe(null)
  renderer.domElement.addEventListener('pointermove', probe); renderer.domElement.addEventListener('pointerleave', clearProbe)
  const v = new THREE.Vector3(); const tangent = new THREE.Vector3(); const forward = new THREE.Vector3(1, 0, 0)
  const arrowNormal = new THREE.Vector3(); const arrowSide = new THREE.Vector3(); const arrowBasis = new THREE.Matrix4()
  const labelPosition = new THREE.Vector3()
  world.traverse((object) => { if (object instanceof THREE.Sprite && object.userData.sceneLabel) sceneLabels.push(object) })
  const sampleProjection = new THREE.Vector3(); const sampleLabelPosition = new THREE.Vector3()
  const sampleOffsets = [[0, -27], [0, 27], [-58, -12], [58, -12], [-48, 33], [48, 33], [0, -55]] as const
  function layoutSampleMarkers(viewHeightFactor: number) {
    if (!sampleMarkerGroup.visible) return
    const width = Math.max(1, host.clientWidth); const height = Math.max(1, host.clientHeight)
    const occupied: { left: number; right: number; top: number; bottom: number }[] = []
    const limit = currentView === 'world' ? 13 : currentView === 'pacific' ? 8 : currentView === 'section' ? 4 : 6
    // Preserve legibility beside pressure, section and transparent ocean names.
    for (const sprite of sceneLabels) {
      if (sprite.userData.dataMarker || sprite.material.opacity < .15) continue
      let visible = true; let parent: THREE.Object3D | null = sprite
      while (parent) { if (!parent.visible) { visible = false; break }; parent = parent.parent }
      if (!visible) continue
      sprite.getWorldPosition(sampleLabelPosition); sampleProjection.copy(sampleLabelPosition).project(camera)
      labelPosition.copy(sampleLabelPosition).applyMatrix4(camera.matrixWorldInverse)
      if (labelPosition.z >= 0 || sampleProjection.z < -1 || sampleProjection.z > 1) continue
      const pixelScale = height / (-labelPosition.z * viewHeightFactor)
      const halfWidth = sprite.scale.x * pixelScale * .5 + 5; const halfHeight = sprite.scale.y * pixelScale * .5 + 5
      const x = (sampleProjection.x + 1) * width * .5; const y = (1 - sampleProjection.y) * height * .5
      occupied.push({ left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight })
    }
    let placed = 0
    for (const point of sampleMarkers) {
      point.sprite.visible = point.marker.visible = point.leader.visible = false
      if (!point.available || placed >= limit || (currentView !== 'world' && point.basin !== 'pacific' && point.basin !== 'polar')) continue
      sampleProjection.copy(point.location).project(camera)
      if (sampleProjection.z < -1 || sampleProjection.z > 1 || Math.abs(sampleProjection.x) > .98 || Math.abs(sampleProjection.y) > .97) continue
      const x = (sampleProjection.x + 1) * width * .5; const y = (1 - sampleProjection.y) * height * .5
      const spec = point.sprite.userData.sceneLabel
      const labelWidth = spec.minPixels; const labelHeight = labelWidth * spec.aspect
      for (const [dx, dy] of sampleOffsets) {
        const cx = x + dx; const cy = y + dy
        const bounds = { left: cx - labelWidth * .5 - 4, right: cx + labelWidth * .5 + 4, top: cy - labelHeight * .5 - 4, bottom: cy + labelHeight * .5 + 4 }
        if (bounds.left < 24 || bounds.right > width - 24 || bounds.top < 82 || bounds.bottom > height - 104) continue
        if (occupied.some((rect) => bounds.left < rect.right && bounds.right > rect.left && bounds.top < rect.bottom && bounds.bottom > rect.top)) continue
        occupied.push(bounds); placed++
        sampleLabelPosition.set(cx / width * 2 - 1, 1 - cy / height * 2, sampleProjection.z).unproject(camera)
        point.sprite.position.copy(sampleLabelPosition)
        labelPosition.copy(sampleLabelPosition).applyMatrix4(camera.matrixWorldInverse)
        const worldWidth = labelWidth * Math.max(.1, -labelPosition.z) * viewHeightFactor / height
        point.sprite.scale.set(worldWidth, worldWidth * spec.aspect, 1)
        const positions = point.leader.geometry.getAttribute('position')
        positions.setXYZ(1, sampleLabelPosition.x, sampleLabelPosition.y, sampleLabelPosition.z); positions.needsUpdate = true
        point.sprite.visible = point.marker.visible = point.leader.visible = true
        break
      }
    }
  }
  function animate(now: number) {
    if (disposed) return
    resize()
    const frameElapsed = Math.max(0, (now - (previous || now)) / 1000)
    const delta = Math.min(.25, frameElapsed); previous = now
    if (moving) time += delta
    if (moving) {
      transition = Math.min(1, transition + delta / 2.2)
      scenarioBlend = THREE.MathUtils.damp(scenarioBlend, targetBlend, 2, delta)
    }
    effects.forEach((item) => {
      if (moving) item.amount = THREE.MathUtils.damp(item.amount, item.target, 4, delta)
      item.group.visible = item.amount > .005
      item.group.traverse((obj) => {
        const mat = (obj as THREE.Mesh).material
        if (!mat || Array.isArray(mat)) return
        if (mat.userData.teachingStage) return
        if (mat instanceof THREE.ShaderMaterial) {
          if (mat.userData.heatExchangeStage) return
          if (mat.uniforms.uAlpha) mat.uniforms.uAlpha.value = item.amount
          if (mat.uniforms.uReveal) mat.uniforms.uReveal.value = transition
        } else if ('opacity' in mat) {
          if (mat.userData.baseOpacity === undefined) mat.userData.baseOpacity = mat.opacity
          mat.transparent = true; mat.opacity = mat.userData.baseOpacity * item.amount
        }
      })
    })
    teaching.update(delta, moving)
    updateHeatExchange(frameElapsed)
    const drivenWater = effects.get('windDrivenWater')!
    if (moving) {
      if (drivenWater.target > 0) windWaterElapsed += frameElapsed
      const windResponse = scenarioBlend > 0 ? 1 - scenarioBlend * .72 : 1 - scenarioBlend * .38
      windWaterWeakening.value = Math.max(0, scenarioBlend)
      const waterOnset = THREE.MathUtils.smoothstep(windWaterElapsed, .8, 2.6)
      windWaterStrength.value = drivenWater.amount * waterOnset * windResponse
      // Phase integration avoids jumps when the strength/scenario changes and
      // remains completely frozen while paused. Speed is a teaching cue.
      if (windWaterStrength.value > .001) windWaterPhase.value += Math.min(frameElapsed, 1) * .95 * windResponse
    } else if (drivenWater.target === 0) windWaterStrength.value = 0
    updateWarmWaterExpansion(frameElapsed)
    if (moving && (effects.get('sun')?.target ?? 0) > 0) heatingElapsed += frameElapsed
    const exchangeLesson = currentLessonId.startsWith('exchange-')
    // Heat-exchange pages use the sun as environmental context. An orange
    // warming patch under evaporation would incorrectly imply latent heating
    // of the sea, while a data layer must retain its literal sampled colors.
    heatingGroup.visible = currentLayer === 'none' && !exchangeLesson && (effects.get('sun')?.amount ?? 0) > .005
    beam.visible = currentLayer === 'none'
    beamMaterial.uniforms.uAlpha!.value = (effects.get('sun')?.amount ?? 0) * (exchangeLesson ? .12 : 1)
    beamTarget.x = west + (exchangeLesson ? exchangeOffset : 0)
    beamDirection.copy(beamTarget).sub(sunPosition)
    beam.scale.y = beamDirection.length() / beamBaseLength
    beam.position.copy(sunPosition).add(beamTarget).multiplyScalar(.5)
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDirection.normalize().negate())
    heatingMaterial.uniforms.uHeat!.value = THREE.MathUtils.smoothstep(heatingElapsed, 2.2, 8.2)
    heatingMaterial.uniforms.uTime!.value = heatingElapsed
    heatingLabel.material.opacity = (effects.get('sun')?.amount ?? 0) * THREE.MathUtils.smoothstep(heatingElapsed, 2.8, 4.5)
    currentMaterials.forEach((material) => { material.uniforms.uTime!.value = time; material.uniforms.uDataLayer!.value = currentLayer === 'none' ? 0 : 1 })
    currents.visible = currentLayer === 'none' && (effects.get('currents')?.amount ?? 0) > .005
    const shift = exchangeLesson ? exchangeOffset : Math.max(0, scenarioBlend) * 15 + Math.min(0, scenarioBlend) * 1.6
    effect('clouds').position.x = shift; effect('rain').position.x = shift; effect('rise').position.x = shift
    effect('evaporation').position.x = exchangeLesson ? exchangeOffset : 0
    const laNinaDevelopment = Math.max(0, -scenarioBlend)
    cloudBodies.forEach((cloud, index) => {
      cloud.scale.copy(cloudBaseScales[index]!)
      cloud.scale.x *= 1 + laNinaDevelopment * .1; cloud.scale.z *= 1 + laNinaDevelopment * .08
      cloud.scale.y *= 1 + laNinaDevelopment * .2
    })
    convectionLabels.forEach(({ scenario, sprite }) => { sprite.visible = !exchangeLesson && currentScenario === scenario })
    condensationCue.visible = exchangeLesson && (effects.get('clouds')?.target ?? 0) > 0
    condensationMaterial.uniforms.uTime!.value = time
    // Keep the eastern sinking branch in the eastern Pacific. Both horizontal
    // branches meet the eastward-shifting ascent; scaling around x=0 alone would
    // leave visible gaps and suggest disconnected circulation cells.
    const circulationWidth = (east - west - shift) / (east - west)
    const circulationOffset = east * (1 - circulationWidth)
    for (const key of ['wind', 'return'] as const) {
      effect(key).scale.x = circulationWidth
      effect(key).position.x = circulationOffset
    }
    updateSectionEvolution(frameElapsed)
    sectionMaterial.uniforms.uTime!.value = time
    section.visible = (effects.get('section')?.amount ?? 0) > .005
    oceanFrontMaterial.visible = !section.visible
    sectionOpeningFrame.visible = section.visible
    flows.forEach((runtime) => {
      // Integrate velocity rather than multiply elapsed time by a changing
      // ENSO factor: the latter makes tracers jump backward on scenario changes.
      if (moving) runtime.elapsed += delta * runtime.speed * (runtime.ensoSensitive ? 1 - scenarioBlend * .35 : 1)
      runtime.mesh.material.uniforms.uTime!.value = runtime.elapsed
      if (!runtime.arrow) return
      const t = (runtime.elapsed * .055 + runtime.phase) % 1
      runtime.curve.getPoint(t, v); runtime.curve.getTangent(t, tangent)
      tangent.normalize(); runtime.arrow.position.copy(v)
      if (Math.abs(tangent.y) > .45) {
        // A horizontal arrow rotated only from +X to +Y becomes edge-on to the
        // default camera. Face vertical arrows toward the camera while keeping
        // their forward axis aligned with the actual ascending/descending flow.
        const parent = runtime.arrow.parent!
        arrowNormal.copy(camera.position).sub(parent.position).divide(parent.scale).sub(v)
        arrowNormal.addScaledVector(tangent, -arrowNormal.dot(tangent))
        if (arrowNormal.lengthSq() < .0001) arrowNormal.set(0, 0, 1)
        arrowNormal.normalize(); arrowSide.crossVectors(tangent, arrowNormal).normalize()
        arrowBasis.makeBasis(tangent, arrowNormal, arrowSide)
        runtime.arrow.quaternion.setFromRotationMatrix(arrowBasis)
      } else {
        runtime.arrow.quaternion.setFromUnitVectors(forward, tangent)
        // Preserve a readable arrow length when the El Nino cell contracts.
        runtime.arrow.scale.x = .68 / runtime.arrow.parent!.scale.x
      }
      runtime.arrow.visible = t < transition
    })
    processArrows.forEach((runtime) => {
      const parent = runtime.mesh.parent!
      const elapsed = parent.parent === heatExchange ? heatExchangeElapsed : time
      const t = (elapsed * .16 + runtime.phase) % 1
      v.lerpVectors(runtime.from, runtime.to, t); v.x += Math.sin(t * Math.PI * 2) * runtime.waviness
      tangent.subVectors(runtime.to, runtime.from); tangent.x += Math.cos(t * Math.PI * 2) * runtime.waviness * Math.PI * 2; tangent.normalize()
      runtime.mesh.position.copy(v)
      // Keep the remaining flat water-vapour arrows readable while orbiting.
      parent.updateWorldMatrix(true, false)
      arrowNormal.copy(camera.position); parent.worldToLocal(arrowNormal); arrowNormal.sub(v)
      arrowNormal.addScaledVector(tangent, -arrowNormal.dot(tangent))
      if (arrowNormal.lengthSq() < .0001) arrowNormal.set(0, 0, 1)
      arrowNormal.normalize(); arrowSide.crossVectors(tangent, arrowNormal).normalize()
      arrowBasis.makeBasis(tangent, arrowNormal, arrowSide); runtime.mesh.quaternion.setFromRotationMatrix(arrowBasis)
    })
    exchangeAirFields.forEach((mesh) => {
      // Cylindrical billboarding keeps the radiation and heat plume upright
      // over the water, while preventing a side view from hiding the planes.
      mesh.getWorldPosition(v)
      mesh.rotation.y = Math.atan2(camera.position.x - v.x, camera.position.z - v.z)
    })
    condensationHalo.quaternion.copy(camera.quaternion)
    if (moving) {
      waterMaterial.uniforms.time!.value += delta * .45; sunMesh.rotation.y += delta * .025
      updateRain(time)
    }
    if (followCamera) {
      const flightSpeed = ['walker-west', 'walker-east', 'china'].includes(currentView) ? 1.35 : 2.3
      camera.position.lerp(positions[currentView][0], 1 - Math.exp(-delta * flightSpeed)); controls.target.lerp(positions[currentView][1], 1 - Math.exp(-delta * flightSpeed))
      if (camera.position.distanceTo(positions[currentView][0]) < .025 && controls.target.distanceTo(positions[currentView][1]) < .025) followCamera = false
    }
    controls.update(); camera.updateMatrixWorld()
    const pixelsPerHeight = Math.max(1, host.clientHeight)
    const viewHeightFactor = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5))
    for (const sprite of sceneLabels) {
      if (sprite.userData.dataMarker) continue
      sprite.getWorldPosition(labelPosition); labelPosition.applyMatrix4(camera.matrixWorldInverse)
      const spec = sprite.userData.sceneLabel
      const pixelWorldSize = Math.max(.1, -labelPosition.z) * viewHeightFactor / pixelsPerHeight
      const width = THREE.MathUtils.clamp(spec.baseWidth, spec.minPixels * pixelWorldSize, spec.minPixels * 1.15 * pixelWorldSize)
      sprite.scale.set(width, width * spec.aspect, 1)
    }
    teaching.layoutLabels(camera, host.clientWidth, host.clientHeight)
    layoutSampleMarkers(viewHeightFactor)
    renderer.render(scene, camera); frameId = requestAnimationFrame(animate)
  }
  frameId = requestAnimationFrame(animate)
  return {
    setLesson, setLayer, setView, setContours, resetView: () => setView(currentView), setMotion: (value: boolean) => { moving = value },
    dispose() {
      if (disposed) return
      disposed = true; cancelAnimationFrame(frameId); observer.disconnect(); controls.dispose()
      renderer.domElement.removeEventListener('pointermove', probe); renderer.domElement.removeEventListener('pointerleave', clearProbe)
      terrain.dispose(); light.shadow.dispose()
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>()
      if (backgroundTexture) textures.add(backgroundTexture)
      scene.traverse((obj) => { if (obj instanceof THREE.InstancedMesh) obj.dispose(); const mesh = obj as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((mat) => materials.add(mat)) })
      materials.forEach((mat) => { Object.values(mat).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value) }); if (mat instanceof THREE.ShaderMaterial) Object.values(mat.uniforms).forEach((uniform) => { if (uniform.value instanceof THREE.Texture) textures.add(uniform.value) }); mat.dispose() })
      geometries.forEach((geometry) => geometry.dispose()); textureCache.forEach((texture) => textures.add(texture)); textures.forEach((texture) => texture.dispose())
      // Water's official helper keeps its reflection WebGLRenderTarget private.
      // Its sampler texture is released above; clearing this owned WebGL context
      // also releases the helper's otherwise inaccessible framebuffer resources.
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
