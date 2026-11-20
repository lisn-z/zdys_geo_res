import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { createWorldTerrain, geoToWorld, worldToGeo, WORLD_WIDTH, WORLD_DEPTH, WORLD_LON_START } from './world'
import { sampleField, type GridField, type PropertyKey } from './data'
import { extractContours, getContourLevels } from './contours'

export interface PropertyStyle {
  label: string
  unit: string
  min: number
  max: number
  /** Legend ticks; colours are spaced uniformly across the fixed min/max. */
  stops: number[]
  colors: string[]
}

export const propertyStyles: Record<PropertyKey, PropertyStyle> = {
  temperature: {
    label: '温度', unit: '°C', min: -2, max: 32,
    stops: [0, 5, 10, 15, 20, 25, 30],
    colors: ['#334c9b', '#287eb4', '#35b8ce', '#75d2c2', '#c4df9b', '#f4d674', '#ed9b52', '#cf5146'],
  },
  salinity: {
    label: '盐度', unit: 'PSS-78', min: 28, max: 40,
    stops: [30, 32, 34, 35, 36, 38],
    colors: ['#bce1e3', '#78c7d8', '#3d9fbe', '#4379ac', '#6c66a6', '#975b9a', '#b04f75'],
  },
  density: {
    label: '参考密度', unit: 'kg/m³', min: 1018, max: 1030,
    stops: [1020, 1022, 1024, 1026, 1027, 1028],
    colors: ['#f3df9c', '#bcd799', '#77c3ae', '#3fabae', '#398bb3', '#4368a4', '#574988'],
  },
}

export type SceneView = 'world' | 'top' | 'pacific' | 'atlantic'
export interface SeawaterScene {
  setField: (field: GridField | null, property: PropertyKey, surfaceField?: GridField, depth?: number) => void
  setView: (view: SceneView) => void
  setMotion: (moving: boolean) => void
  setLatitudeLines: (visible: boolean) => void
  setContours: (visible: boolean) => void
  setProbe: (lon: number, lat: number) => void
  dispose: () => void
}

// Extend the display one original grid cell beyond the surface data's edge.
// WOA's land mask and the vector coastline differ: a source cell can cover a
// small island absent from the simplified map, so vector point-in-land tests
// must not gate that first ring. Wider coastal mismatches can use original
// values within 3 grid-cell widths when land is detected nearby. Land meshes
// cover extended colours.
// Deep-only gaps remain missing. Use original neighbours only (no propagation),
// and never change the source arrays, probe values or numeric map labels.
function createCoastalDisplaySampler(field: GridField, isLand: (lon: number, lat: number) => boolean, surfaceField?: GridField) {
  const cyclic = Math.abs(Math.abs(field.lonStep) * field.width - 360) < .001
  const coastalSupport = new Map<number, number[]>()
  return (lon: number, lat: number): number | null => {
    const original = sampleField(field, lon, lat)
    if (original !== null && Number.isFinite(original)) return original
    if (!surfaceField || sampleField(surfaceField, lon, lat) !== null || !Number.isFinite(lon) || !Number.isFinite(lat)) return null
    let x = (lon - field.lonStart) / field.lonStep
    const y = (lat - field.latStart) / field.latStep
    if (cyclic) x = ((x % field.width) + field.width) % field.width
    if (y < 0 || y > field.height - 1 || (!cyclic && (x < 0 || x > field.width - 1))) return null
    const column = cyclic ? Math.round(x) % field.width : Math.round(x), row = Math.round(y)
    const index = row * field.width + column
    let candidates = coastalSupport.get(index)
    if (!candidates) {
      candidates = []
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const candidateRow = row + dy; let candidateColumn = column + dx
        if (candidateRow < 0 || candidateRow >= field.height) continue
        if (cyclic) candidateColumn = (candidateColumn + field.width) % field.width
        else if (candidateColumn < 0 || candidateColumn >= field.width) continue
        const candidate = candidateRow * field.width + candidateColumn, value = field.values[candidate]
        if (value != null && Number.isFinite(value)) candidates.push(candidate)
      }
      if (!candidates.length) {
        // Some source island masks are several cells wide. Search only original
        // values within a radius of 3 cells, and only beside a mapped coast; do not
        // expand broad missing open-ocean regions or propagate padded values.
        const outer: number[] = []
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) <= 1 || dx * dx + dy * dy > 9) continue
          const candidateRow = row + dy; let candidateColumn = column + dx
          if (candidateRow < 0 || candidateRow >= field.height) continue
          if (cyclic) candidateColumn = (candidateColumn + field.width) % field.width
          else if (candidateColumn < 0 || candidateColumn >= field.width) continue
          const candidate = candidateRow * field.width + candidateColumn, value = field.values[candidate]
          if (value != null && Number.isFinite(value)) outer.push(candidate)
        }
        if (outer.length) {
          const cellLon = field.lonStart + column * field.lonStep, cellLat = field.latStart + row * field.latStep
          let nearCoast = false
          for (let dy = -1.5; dy <= 1.5 && !nearCoast; dy += .5) for (let dx = -1.5; dx <= 1.5; dx += .5) {
            if (isLand(cellLon + dx * field.lonStep, cellLat + dy * field.latStep)) { nearCoast = true; break }
          }
          if (nearCoast) candidates = outer
        }
      }
      coastalSupport.set(index, candidates)
    }
    let closest = Infinity, value: number | null = null
    for (const candidate of candidates) {
      const candidateColumn = candidate % field.width, candidateRow = Math.floor(candidate / field.width)
      let dx = Math.abs(x - candidateColumn); if (cyclic) dx = Math.min(dx, field.width - dx)
      const distance = dx * dx + (y - candidateRow) ** 2
      if (distance <= 9 && distance < closest) { closest = distance; value = field.values[candidate] ?? null }
    }
    return value
  }
}

/** Display scalar texture; valid originals are unchanged and coastal padding is bounded. */
function createFieldTexture(field: GridField, isLand: (lon: number, lat: number) => boolean, surfaceField?: GridField): THREE.DataTexture {
  const data = new Float32Array(field.width * field.height * 4)
  const displaySample = createCoastalDisplaySampler(field, isLand, surfaceField)
  for (let index = 0; index < field.values.length; index++) {
    const original = field.values[index]
    const value = original != null && Number.isFinite(original) ? original : displaySample(field.lonStart + index % field.width * field.lonStep, field.latStart + Math.floor(index / field.width) * field.latStep)
    if (value == null || !Number.isFinite(value)) continue
    data[index * 4] = value; data[index * 4 + 3] = 1
  }
  const texture = new THREE.DataTexture(data, field.width, field.height, THREE.RGBAFormat, THREE.FloatType)
  // The shader interpolates the scalar explicitly, excluding invalid neighbours.
  // Nearest here selects exact source texels; it does not select the final colour.
  texture.magFilter = texture.minFilter = THREE.NearestFilter
  texture.generateMipmaps = false; texture.needsUpdate = true
  return texture
}

function createFieldMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false, fog: false,
    uniforms: {
      sourceGrid: { value: null }, gridSize: { value: new THREE.Vector2(360, 180) },
      gridTransform: { value: new THREE.Vector4(-179.5, -89.5, 1, 1) },
      cyclicLongitude: { value: true }, mapLonStart: { value: WORLD_LON_START },
      colorCount: { value: 0 }, valueRange: { value: new THREE.Vector2() },
      bandColors: { value: Array.from({ length: 8 }, () => new THREE.Color()) },
      missingColor: { value: new THREE.Color('#8ca8b5') }, missingStripe: { value: new THREE.Color('#597d90') },
    },
    vertexShader: `varying vec2 mapUv;
      void main(){mapUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `
      uniform sampler2D sourceGrid;
      uniform vec2 gridSize;
      uniform vec4 gridTransform;
      uniform bool cyclicLongitude;
      uniform float mapLonStart;
      uniform int colorCount;
      uniform vec2 valueRange;
      uniform vec3 bandColors[8];
      uniform vec3 missingColor,missingStripe;
      varying vec2 mapUv;
      vec4 sourceCell(vec2 cell) {
        cell.x=cyclicLongitude?mod(mod(cell.x,gridSize.x)+gridSize.x,gridSize.x):clamp(cell.x,0.,gridSize.x-1.);
        cell.y=clamp(cell.y,0.,gridSize.y-1.);
        return texture2D(sourceGrid,(cell+.5)/gridSize);
      }
      void main() {
        vec2 lonLat=vec2(mapLonStart+mapUv.x*360.,-90.+mapUv.y*180.);
        vec2 grid=(lonLat-gridTransform.xy)/gridTransform.zw;
        if(cyclicLongitude) grid.x=mod(mod(grid.x,gridSize.x)+gridSize.x,gridSize.x);
        bool inBounds=grid.y>=-.5&&grid.y<=gridSize.y-.5;
        if(!cyclicLongitude) inBounds=inBounds&&grid.x>=-.5&&grid.x<=gridSize.x-.5;
        grid.y=clamp(grid.y,0.,gridSize.y-1.);
        if(!cyclicLongitude) grid.x=clamp(grid.x,0.,gridSize.x-1.);
        vec4 nearest=sourceCell(floor(grid+.5));
        vec2 base=floor(grid),part=grid-base;
        vec4 a=sourceCell(base),b=sourceCell(base+vec2(1.,0.));
        vec4 c=sourceCell(base+vec2(0.,1.)),d=sourceCell(base+vec2(1.,1.));
        vec4 weights=vec4((1.-part.x)*(1.-part.y),part.x*(1.-part.y),(1.-part.x)*part.y,part.x*part.y);
        weights*=vec4(a.a,b.a,c.a,d.a);
        float total=dot(weights,vec4(1.));
        float value=total>0.?dot(weights,vec4(a.r,b.r,c.r,d.r))/total:nearest.r;
        // Continuous coverage of the native valid-depth mask. This rounds the
        // grid boundary without inventing values inside missing regions: total
        // is zero there, and point readouts retain the original missing mask.
        float coverage=smoothstep(.25,.75,total);
        // Same continuous fixed-range gradient as ocean-atmosphere: interpolate
        // the scalar first, then the colour. The legend uses the same node spacing.
        float colorPosition=clamp((value-valueRange.x)/(valueRange.y-valueRange.x),0.,1.)*float(colorCount-1);
        vec3 color=bandColors[0];
        for(int i=0;i<7;i++) {
          if(i<colorCount-1) color=mix(color,bandColors[i+1],clamp(colorPosition-float(i),0.,1.));
        }
        float stripe=1.-smoothstep(.5,1.5,abs(mod((gl_FragCoord.x+gl_FragCoord.y)*.7071,12.)-6.));
        vec3 missing=mix(missingColor,missingStripe,stripe*.28);
        gl_FragColor=vec4(mix(missing,color,inBounds?coverage:0.),1.);
        #include <colorspace_fragment>
      }`,
  })
}

function makeMapLabel(text: string, width: number, color = '#f1f3e8'): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')!
  context.font = '500 48px "Microsoft YaHei", sans-serif'
  canvas.width = Math.max(384, Math.ceil(context.measureText(text).width + 48)); canvas.height = 96
  context.font = '500 48px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'; context.textBaseline = 'middle'
  context.fillStyle = color; context.shadowColor = '#12374c'; context.shadowBlur = 8
  context.strokeStyle = '#234656'; context.lineWidth = 3; context.strokeText(text, canvas.width / 2, 49)
  context.fillText(text, canvas.width / 2, 49)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * canvas.height / canvas.width), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false, fog: false,
  }))
  mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 12
  return mesh
}

function makeSurfaceValue(value: number, property: PropertyKey): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  const text = property === 'temperature' ? `${value}°C` : `${value}`
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d')!
  canvas.width = 320; canvas.height = 96
  context.font = '600 56px "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'; context.textBaseline = 'middle'; context.lineJoin = 'round'
  context.strokeStyle = 'rgba(20, 47, 67, .9)'; context.lineWidth = 8
  context.strokeText(text, 160, 49)
  context.fillStyle = '#ffffff'; context.fillText(text, 160, 49)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const label = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.38), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false, fog: false,
  }))
  label.rotation.x = -Math.PI / 2; label.layers.set(1); label.renderOrder = 14
  return label
}

// Match the ocean-atmosphere latitude callouts, including camera-facing text
// and its minimum readable screen width when the world map is fitted far away.
function makeLatitudeLabel(text: string, color: string, width: number): THREE.Sprite {
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d')!
  const fontSize = 56, font = `600 ${fontSize}px "Microsoft YaHei",sans-serif`
  context.font = font; canvas.width = Math.ceil(context.measureText(text).width + 56); canvas.height = 108
  context.fillStyle = 'rgba(5,25,42,.91)'; context.beginPath(); context.roundRect(3, 3, canvas.width - 6, canvas.height - 6, 21); context.fill()
  context.strokeStyle = color; context.lineWidth = 2.5; context.stroke()
  context.font = font; context.textBaseline = 'middle'; context.textAlign = 'center'
  context.fillStyle = color; context.fillText(text, canvas.width / 2, canvas.height / 2 + 2)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, depthTest: false, transparent: true, toneMapped: false })
  const sprite = new THREE.Sprite(material); sprite.scale.set(width, width * canvas.height / canvas.width, 1); sprite.renderOrder = 41
  sprite.userData.sceneLabel = { baseWidth: width, aspect: canvas.height / canvas.width, minPixels: Math.max(68, Math.min(480, canvas.width / fontSize * 14)) }
  return sprite
}

export async function createSeawaterScene(
  host: HTMLElement,
  worldData: { countries: any; elevation: any },
  onProbe: (point: { lon: number; lat: number }) => void,
): Promise<SeawaterScene> {
  const terrain = await createWorldTerrain(worldData.countries, worldData.elevation)
  let renderer: THREE.WebGLRenderer
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }) }
  catch (error) { terrain.dispose(); throw error }
  let disposed = false, moving = true, frameId = 0
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95
  renderer.shadowMap.enabled = false
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' })
  renderer.domElement.setAttribute('aria-label', '可旋转缩放的海水性质世界地图，点击海面取样')
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#6f98ad')
  scene.fog = new THREE.Fog('#6f98ad', 160, 340)
  const sky = new THREE.Mesh(new THREE.SphereGeometry(360, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
    uniforms: {
      zenith: { value: new THREE.Color('#456c85') }, horizon: { value: new THREE.Color('#89acbb') },
      nadir: { value: new THREE.Color('#547d91') },
    },
    vertexShader: 'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vDirection;uniform vec3 zenith,horizon,nadir;
      void main(){float h=normalize(vDirection).y;vec3 c=mix(horizon,zenith,smoothstep(0.,.82,h));c=mix(c,nadir,smoothstep(0.,.65,-h));gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`,
  }))
  sky.renderOrder = -100; scene.add(sky)
  let backgroundTexture: THREE.Texture | null = null
  function updateBackdropCover() {
    const image = backgroundTexture?.image as { width?: number; height?: number } | undefined
    const viewportWidth = host.clientWidth, viewportHeight = host.clientHeight
    if (!backgroundTexture || !image?.width || !image.height || !viewportWidth || !viewportHeight) return
    const imageAspect = image.width / image.height, viewportAspect = viewportWidth / viewportHeight
    backgroundTexture.repeat.set(Math.min(1, viewportAspect / imageAspect), Math.min(1, imageAspect / viewportAspect))
    backgroundTexture.offset.set((1 - backgroundTexture.repeat.x) * .5, (1 - backgroundTexture.repeat.y) * .5)
    backgroundTexture.updateMatrix()
  }
  // Reuse the same existing OSS backdrop and centered cover crop as the
  // ocean-atmosphere classroom. Keep the procedural sky until loading succeeds.
  backgroundTexture = new THREE.TextureLoader().load(
    '/geo-resources-folder/images/ocean-atmosphere/ocean-atmosphere-backdrop.png',
    (texture) => {
      if (disposed) { texture.dispose(); return }
      texture.colorSpace = THREE.SRGBColorSpace
      scene.background = texture; sky.visible = false; updateBackdropCover()
    }, undefined, () => { /* The procedural sky remains available offline. */ },
  )
  backgroundTexture.colorSpace = THREE.SRGBColorSpace
  const camera = new THREE.PerspectiveCamera(43, 1, .5, 600)
  // Water owns a layer-0 mirror camera. Teaching overlays belong only in the
  // main view, so their text/colors cannot reappear as reflections in missing cells.
  camera.layers.enable(1)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true; controls.dampingFactor = .085
  controls.minDistance = 12; controls.maxDistance = 220
  controls.minPolarAngle = .015; controls.maxPolarAngle = Math.PI * .47
  controls.screenSpacePanning = false
  scene.add(terrain.group)
  scene.add(new THREE.HemisphereLight('#cfe8f6', '#213b4d', 1.75))
  const sunPosition = new THREE.Vector3(4, 14, -10)
  const sun = new THREE.DirectionalLight('#f5e8cf', 1.65); sun.position.copy(sunPosition); scene.add(sun)

  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(WORLD_WIDTH + .6, .55, WORLD_DEPTH + .6), new THREE.MeshBasicMaterial({ color: '#296b8e', toneMapped: false }))
  pedestal.position.y = -7.83; scene.add(pedestal)
  const boxGeometry = new THREE.BoxGeometry(WORLD_WIDTH, 7.5, WORLD_DEPTH)
  const positions = boxGeometry.getAttribute('position'), normals = boxGeometry.getAttribute('normal')
  const vertexColors = new Float32Array(positions.count * 3)
  const blueTop = new THREE.Color('#48a7cb'), blueBottom = new THREE.Color('#27759c'), blended = new THREE.Color()
  for (let index = 0; index < positions.count; index++) {
    const height = (positions.getY(index) + 3.75) / 7.5
    const shade = Math.abs(normals.getX(index)) > .5 ? .94 : 1
    blended.copy(blueBottom).lerp(blueTop, height).multiplyScalar(shade).toArray(vertexColors, index * 3)
  }
  boxGeometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3))
  const oceanBlock = new THREE.Mesh(boxGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))
  oceanBlock.position.y = -3.8; scene.add(oceanBlock)
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(boxGeometry), new THREE.LineBasicMaterial({ color: '#84cce0', transparent: true, opacity: .22 }))
  edge.position.copy(oceanBlock.position); scene.add(edge)

  // Preserve the existing OSS-proxied water normals; new scene assets are not needed.
  const waterNormals = new THREE.TextureLoader().load('/geo-resources-folder/images/waternormals.jpg',
    (texture) => { if (disposed) texture.dispose() })
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping
  waterNormals.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
  const water = new Water(new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH), {
    textureWidth: 512, textureHeight: 512, waterNormals,
    sunDirection: sunPosition.clone().normalize(), sunColor: 0xb8cad6,
    waterColor: 0x0576b5, distortionScale: 2.8, fog: true,
  })
  water.rotation.x = -Math.PI / 2; water.position.y = .015; scene.add(water)
  const waterMaterial = water.material as THREE.ShaderMaterial
  waterMaterial.uniforms.size!.value = 13
  waterMaterial.uniforms.sunColor!.value.multiplyScalar(.48)
  // Strictly above Water, below the smallest real islands (y=.045). Depth
  // testing uses the exact Natural Earth silhouette, so land cannot be tinted.
  const fieldMaterial = createFieldMaterial()
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_WIDTH, WORLD_DEPTH), fieldMaterial)
  overlay.rotation.x = -Math.PI / 2; overlay.position.y = .03
  overlay.layers.set(1)
  overlay.renderOrder = 4; overlay.visible = false; scene.add(overlay)
  const surfaceValues = new THREE.Group(); surfaceValues.name = 'ocean-property-values'; scene.add(surfaceValues)
  const contourGroup = new THREE.Group(); contourGroup.name = 'ocean-property-contours'; scene.add(contourGroup)
  let contoursEnabled = true, activeField: GridField | null = null
  let activeProperty: PropertyKey | undefined, activeDepth = -1, activeSurface: GridField | undefined
  const valueTop = new THREE.Vector3(), valueBottom = new THREE.Vector3()
  function clearSurfaceValues() {
    for (const child of [...surfaceValues.children]) {
      const label = child as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
      label.geometry.dispose(); label.material.map?.dispose(); label.material.dispose()
      surfaceValues.remove(label)
    }
  }
  function updateContours(field: GridField | null, property: PropertyKey, depth: number) {
    clearSurfaceValues()
    for (const child of [...contourGroup.children]) {
      const line = child as THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>
      line.geometry.dispose(); line.material.dispose(); contourGroup.remove(line)
    }
    contourGroup.visible = surfaceValues.visible = Boolean(field) && contoursEnabled
    if (!field) return
    const style = propertyStyles[property]
    const contours = extractContours(field, getContourLevels(property, depth), { mapLonStart: WORLD_LON_START, maxLabelsPerLevel: 5, minLabelLength: 8, labelSpacing: 42 })
    const anchors: THREE.Vector3[] = []
    for (const contour of contours) {
      if (!contour.segments.length) continue
      const positions = new Float32Array(contour.segments.length / 2 * 3)
      for (let i = 0, j = 0; i < contour.segments.length; i += 2) {
        // Keep the right-hand seam endpoint at 330 degrees on the right edge.
        positions[j++] = (contour.segments[i]! - (WORLD_LON_START + 180)) / 5
        positions[j++] = .039; positions[j++] = -contour.segments[i + 1]! / 5
      }
      const baseColor = new THREE.Color(style.colors[Math.round(THREE.MathUtils.clamp((contour.value - style.min) / (style.max - style.min), 0, 1) * (style.colors.length - 1))]!)
      const light = baseColor.r * .2126 + baseColor.g * .7152 + baseColor.b * .0722
      const material = new THREE.LineBasicMaterial({ color: light > .35 ? '#20435b' : '#eff8f4', opacity: .56, transparent: true, depthWrite: false, toneMapped: false })
      const line = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)), material)
      line.layers.set(1); line.renderOrder = 10; contourGroup.add(line)
      for (const anchor of contour.labels) {
        if (terrain.isLand(anchor.lon, anchor.lat) || sampleField(field, anchor.lon, anchor.lat) === null) continue
        const position = geoToWorld(anchor.lon, anchor.lat).setY(.075)
        if (anchors.some(other => other.distanceToSquared(position) < 12)) continue
        anchors.push(position)
        const label = makeSurfaceValue(contour.value, property)
        label.position.copy(position)
        if (label.material.map) label.material.map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
        surfaceValues.add(label)
      }
    }
  }
  const cachedTextures = new Map<GridField, { surfaceField?: GridField; texture: THREE.DataTexture }>()
  function setField(field: GridField | null, property: PropertyKey, surfaceField?: GridField, depth = 0) {
    if (disposed) return
    if (activeField === field && activeProperty === property && activeDepth === depth && activeSurface === surfaceField) return
    activeField = field; activeProperty = property; activeDepth = depth; activeSurface = surfaceField
    updateContours(field, property, depth)
    if (!field) { overlay.visible = false; return }
    let cached = cachedTextures.get(field)
    if (!cached || cached.surfaceField !== surfaceField) {
      cached?.texture.dispose()
      cached = { surfaceField, texture: createFieldTexture(field, terrain.isLand, surfaceField) }; cachedTextures.set(field, cached)
    }
    cachedTextures.delete(field); cachedTextures.set(field, cached)
    // A quarter-degree RGBA float texture is ~16 MB. Keep at most the current
    // and previous fields on the GPU instead of accumulating all 15 layers.
    while (cachedTextures.size > 2) {
      const oldest = cachedTextures.keys().next().value!
      cachedTextures.get(oldest)!.texture.dispose(); cachedTextures.delete(oldest)
    }
    const texture = cached.texture
    const style = propertyStyles[property], uniforms = fieldMaterial.uniforms
    uniforms.sourceGrid!.value = texture
    uniforms.gridSize!.value.set(field.width, field.height)
    uniforms.gridTransform!.value.set(field.lonStart, field.latStart, field.lonStep, field.latStep)
    uniforms.cyclicLongitude!.value = Math.abs(Math.abs(field.lonStep) * field.width - 360) < .001
    uniforms.colorCount!.value = style.colors.length
    uniforms.valueRange!.value.set(style.min, style.max)
    // THREE.Color converts these sRGB hex colours to the shader's linear space;
    // colorspace_fragment converts back for display, matching the HTML legend.
    const colors = uniforms.bandColors!.value as THREE.Color[]
    colors.forEach((color, index) => color.set(style.colors[Math.min(index, style.colors.length - 1)]!))
    // Swap synchronously between frames, retaining opacity=1 throughout.
    // A depth/layer switch never rebuilds the renderer or briefly exposes water.
    overlay.visible = true
  }

  const latitudeGroup = new THREE.Group(); latitudeGroup.visible = false; scene.add(latitudeGroup)
  const latitudeLabels: THREE.Sprite[] = [], labelPosition = new THREE.Vector3()
  const tropicLatitude = 23 + 26 / 60, polarLatitude = 66 + 34 / 60
  // Transparent queue is intentional even at opacity=1: otherwise the opaque
  // pass renders first and the later transparent data plane paints over it.
  const equatorMaterial = new THREE.LineBasicMaterial({ color: '#f56c68', transparent: true, depthTest: false, depthWrite: false, toneMapped: false })
  const tropicMaterial = new THREE.LineDashedMaterial({ color: '#efd185', transparent: true, dashSize: .7, gapSize: .4, depthTest: false, depthWrite: false, toneMapped: false })
  const polarMaterial = new THREE.LineDashedMaterial({ color: '#ecf8f1', transparent: true, opacity: .65, dashSize: .45, gapSize: .24, depthTest: false, depthWrite: false, toneMapped: false })
  for (const [latitude, text, longitude] of [
    [-polarLatitude, '南极圈 · 66°34′S', -12], [-tropicLatitude, '南回归线 · 23°26′S', 100], [0, '赤道 · 0°', 100],
    [tropicLatitude, '北回归线 · 23°26′N', 100], [polarLatitude, '北极圈 · 66°34′N', -12],
  ] as [number, string, number][]) {
    const equator = latitude === 0, polar = Math.abs(latitude) > 60
    const points = [new THREE.Vector3(-36, .16, -latitude / 5), new THREE.Vector3(36, .16, -latitude / 5)]
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), equator ? equatorMaterial : polar ? polarMaterial : tropicMaterial)
    line.computeLineDistances(); line.renderOrder = 40; latitudeGroup.add(line)
    const label = makeLatitudeLabel(text, equator ? '#ffaaa1' : polar ? '#ecf8f1' : '#f3dba0', equator ? 4 : 6.8)
    label.position.copy(geoToWorld(longitude, latitude)).setY(.65)
    latitudeGroup.add(label); latitudeLabels.push(label)
  }
  latitudeGroup.traverse((object) => object.layers.set(1))
  for (const [name, lon, lat, width] of [
    ['太 平 洋', 195, -8, 8.4], ['印 度 洋', 78, -25, 7], ['大西洋', -49, 24, 4.4],
  ] as [string, number, number, number][]) {
    const label = makeMapLabel(name, width); label.position.copy(geoToWorld(lon, lat)).setY(.065)
    label.layers.set(1); scene.add(label)
  }
  const probeMarker = new THREE.Group(); probeMarker.visible = false; scene.add(probeMarker)
  // Keep opacity=1 but use the transparent render queue: otherwise the opaque
  // marker pass runs before the data overlay, regardless of its renderOrder.
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#fff5c4', transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
  const haloMaterial = new THREE.MeshBasicMaterial({ color: '#16374c', transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(.17, .33, 40), haloMaterial)
  outerRing.rotation.x = -Math.PI / 2; outerRing.renderOrder = 20
  const ring = new THREE.Mesh(new THREE.RingGeometry(.20, .28, 40), markerMaterial)
  ring.rotation.x = -Math.PI / 2; ring.position.y = .004; ring.renderOrder = 21
  const cross = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.42, .008, 0), new THREE.Vector3(.42, .008, 0),
    new THREE.Vector3(0, .008, -.42), new THREE.Vector3(0, .008, .42),
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .85, 0),
  ]), new THREE.LineBasicMaterial({ color: '#fff4c6', transparent: true, depthWrite: false, toneMapped: false }))
  cross.renderOrder = 22; probeMarker.add(outerRing, ring, cross)
  probeMarker.traverse((object) => object.layers.set(1))
  function setProbe(lon: number, lat: number) {
    if (disposed) return
    if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 90 || terrain.isLand(lon, lat)) {
      probeMarker.visible = false; return
    }
    probeMarker.position.copy(geoToWorld(lon, lat)).setY(.1); probeMarker.visible = true
  }

  let view: SceneView = 'world', followingView = true
  const desiredCamera = new THREE.Vector3(), desiredTarget = new THREE.Vector3()
  function fitView() {
    const target = new THREE.Vector3(0, -1.5, 0)
    let direction = new THREE.Vector3(0, .66, .75).normalize()
    let halfWidth = 36.7, halfDepth = 18.7
    if (view === 'top') { target.y = 0; direction.set(0, 1, .018).normalize() }
    if (view === 'pacific') { target.copy(geoToWorld(195, 3)); halfWidth = 19; halfDepth = 17 }
    // The inherited teaching map has its seam at 30°W; this is the western
    // Atlantic view, with the Americas and western basin in one continuous map.
    if (view === 'atlantic') { target.copy(geoToWorld(-65, 18)); halfWidth = 12; halfDepth = 16 }
    const minX = Math.max(-36.7, target.x - halfWidth), maxX = Math.min(36.7, target.x + halfWidth)
    const minZ = Math.max(-18.7, target.z - halfDepth), maxZ = Math.min(18.7, target.z + halfDepth)
    target.x = (minX + maxX) / 2; target.z = (minZ + maxZ) / 2
    const right = new THREE.Vector3(1, 0, 0), up = new THREE.Vector3().crossVectors(direction, right)
    const halfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const corner = new THREE.Vector3(); let distance = 0
    // Project the actual map-space box relative to its look target, including
    // the pedestal. In particular y must not be treated as an offset twice.
    for (const x of [minX, maxX]) for (const y of [-8.2, 4]) for (const z of [minZ, maxZ]) {
      corner.set(x, y, z).sub(target)
      distance = Math.max(distance, corner.dot(direction) + Math.max(
        Math.abs(corner.dot(right)) / (halfFov * camera.aspect * .91), Math.abs(corner.dot(up)) / (halfFov * .89),
      ))
    }
    desiredTarget.copy(target); desiredCamera.copy(target).addScaledVector(direction, distance + 1)
    controls.maxDistance = Math.max(220, distance * 1.8)
    // Narrow hosts can require a longer fitting distance. Keep both the sky
    // and far plane beyond the full allowed orbit instead of clipping the map.
    sky.scale.setScalar(Math.max(1, controls.maxDistance / 280))
    camera.far = Math.max(600, controls.maxDistance * 3); camera.updateProjectionMatrix()
  }
  function setView(value: SceneView) { if (!disposed) { view = value; fitView(); followingView = true } }
  const stopFollowing = () => { followingView = false }
  controls.addEventListener('start', stopFollowing)
  let resizePending = true, width = 0, height = 0, initial = true
  function resize() {
    if (!resizePending) return
    resizePending = false
    const nextWidth = host.clientWidth, nextHeight = host.clientHeight
    if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return
    width = nextWidth; height = nextHeight
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); fitView()
    updateBackdropCover()
    if (initial) { camera.position.copy(desiredCamera); controls.target.copy(desiredTarget); controls.update(); initial = false }
  }
  // Apply observer changes inside the same frame as render, preventing a blank
  // canvas from being painted between resize and the next animation frame.
  const observer = new ResizeObserver(() => { resizePending = true }); observer.observe(host)
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), hit = new THREE.Vector3()
  const seaPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.03)
  let pointerStart: { x: number; y: number; id: number } | null = null
  const pointerDown = (event: PointerEvent) => {
    pointerStart = event.button === 0 ? { x: event.clientX, y: event.clientY, id: event.pointerId } : null
  }
  const clearPointer = () => { pointerStart = null }
  const pointerUp = (event: PointerEvent) => {
    const start = pointerStart; pointerStart = null
    if (!start || event.pointerId !== start.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return
    const rect = renderer.domElement.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2)
    raycaster.setFromCamera(pointer, camera)
    if (!raycaster.ray.intersectPlane(seaPlane, hit) || Math.abs(hit.x) > WORLD_WIDTH / 2 || Math.abs(hit.z) > WORLD_DEPTH / 2) return
    // A raised mountain can occlude a sea coordinate in oblique view. Check the
    // actual rendered terrain as well as the land mask at the sea intersection.
    const landHit = raycaster.intersectObject(terrain.group, true)[0]
    if (landHit && landHit.distance <= raycaster.ray.origin.distanceTo(hit)) return
    const point = worldToGeo(hit.x, hit.z)
    if (terrain.isLand(point.lon, point.lat)) return
    setProbe(point.lon, point.lat); onProbe(point)
  }
  renderer.domElement.addEventListener('pointerdown', pointerDown)
  renderer.domElement.addEventListener('pointerup', pointerUp)
  renderer.domElement.addEventListener('pointercancel', clearPointer)
  let previousTime = 0
  function animate(now: number) {
    if (disposed) return
    const delta = previousTime ? Math.min((now - previousTime) / 1000, .06) : 1 / 60
    previousTime = now; resize()
    if (followingView) {
      const fraction = 1 - Math.exp(-delta * 6)
      camera.position.lerp(desiredCamera, fraction); controls.target.lerp(desiredTarget, fraction)
    }
    controls.update(); camera.updateMatrixWorld()
    const pixelsPerHeight = Math.max(1, host.clientHeight)
    const viewHeightFactor = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5))
    for (const sprite of latitudeLabels) {
      sprite.getWorldPosition(labelPosition); labelPosition.applyMatrix4(camera.matrixWorldInverse)
      const spec = sprite.userData.sceneLabel
      const pixelWorldSize = Math.max(.1, -labelPosition.z) * viewHeightFactor / pixelsPerHeight
      const labelWidth = THREE.MathUtils.clamp(spec.baseWidth, spec.minPixels * pixelWorldSize, spec.minPixels * 1.15 * pixelWorldSize)
      sprite.scale.set(labelWidth, labelWidth * spec.aspect, 1)
    }
    // Numeric annotations remain printed on the ocean plane. Compensate for
    // overview foreshortening so their type is about 12px high, with a cap to
    // avoid huge labels when the camera is almost level with the water.
    const occupied: { x: number; y: number; radius: number }[] = []
    for (const label of surfaceValues.children) {
      valueTop.copy(label.position); valueTop.z -= .69; valueTop.project(camera)
      valueBottom.copy(label.position); valueBottom.z += .69; valueBottom.project(camera)
      const projectedHeight = Math.hypot((valueTop.x - valueBottom.x) * width / 2, (valueTop.y - valueBottom.y) * height / 2)
      const scale = THREE.MathUtils.clamp(12 / Math.max(.1, projectedHeight * 56 / 96), 1, 2.4)
      label.scale.setScalar(scale)
      valueTop.copy(label.position).project(camera)
      const x = (valueTop.x + 1) * width / 2, y = (1 - valueTop.y) * height / 2
      const radius = Math.max(26, projectedHeight * scale * 1.7)
      label.visible = valueTop.z > -1 && valueTop.z < 1 && Math.abs(valueTop.x) < 1 && Math.abs(valueTop.y) < 1 &&
        !occupied.some(other => Math.hypot(x - other.x, y - other.y) < radius + other.radius)
      if (label.visible) occupied.push({ x, y, radius })
    }
    if (moving) waterMaterial.uniforms.time!.value += delta * .45
    if (width && height) renderer.render(scene, camera)
    frameId = requestAnimationFrame(animate)
  }
  frameId = requestAnimationFrame(animate)
  return {
    setField, setView, setProbe,
    setMotion: (value) => { moving = value },
    setLatitudeLines: (value) => { latitudeGroup.visible = value },
    setContours: (value) => { contoursEnabled = value; contourGroup.visible = surfaceValues.visible = value && Boolean(activeField) },
    dispose() {
      if (disposed) return
      disposed = true; cancelAnimationFrame(frameId); observer.disconnect()
      controls.removeEventListener('start', stopFollowing); controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', clearPointer)
      clearSurfaceValues()
      terrain.dispose()
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
      textures.add(waterNormals)
      if (backgroundTexture) textures.add(backgroundTexture)
      cachedTextures.forEach(({ texture }) => textures.add(texture))
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.geometry) geometries.add(mesh.geometry)
        if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((material) => materials.add(material))
      })
      materials.forEach((material) => {
        Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value) })
        if (material instanceof THREE.ShaderMaterial) Object.values(material.uniforms).forEach((uniform) => { if (uniform.value instanceof THREE.Texture) textures.add(uniform.value) })
        material.dispose()
      })
      geometries.forEach((geometry) => geometry.dispose()); textures.forEach((texture) => texture.dispose())
      cachedTextures.clear(); scene.background = null; backgroundTexture = null; scene.clear()
      // Water's reflection framebuffer is private in the official helper.
      // Releasing the owned context also frees that internal render target.
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove()
    },
  }
}
