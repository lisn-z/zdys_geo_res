import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export interface SampleScene {
  setBurning(value: boolean): void
  reset(): void
  zoom(direction: number): void
  dispose(): void
}

/** A visual teaching sample, not an experiment or a kinetic decomposition model. */
export function createSampleScene(host: HTMLElement, onError: () => void): SampleScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .91
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none'
  renderer.domElement.setAttribute('role', 'img')
  renderer.domElement.setAttribute('aria-label', '金属观察盘上的不规则冰状可燃冰样品三维模型')
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#293641')
  const camera = new THREE.PerspectiveCamera(37, 1, .05, 40)
  camera.position.set(2.7, 2.45, 5.3)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 1.13, 0)
  controls.enableDamping = true
  controls.dampingFactor = .09
  controls.enablePan = false
  controls.minDistance = 3.6
  controls.maxDistance = 10
  controls.minPolarAngle = .25
  controls.maxPolarAngle = Math.PI * .48
  controls.update()

  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, .035)
  room.dispose()
  scene.environment = environment.texture
  scene.environmentIntensity = .44
  scene.add(new THREE.HemisphereLight('#f2f7fc', '#33404a', .9))
  const light = new THREE.DirectionalLight('#fffaf2', 2.1)
  light.position.set(-3, 6, 5)
  light.castShadow = true
  light.shadow.mapSize.set(1024, 1024)
  Object.assign(light.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .1, far: 15 })
  light.shadow.normalBias = .008
  light.shadow.bias = -.0001
  scene.add(light)
  const rim = new THREE.DirectionalLight('#d5e5ff', .9)
  rim.position.set(3, 3, -4)
  scene.add(rim)
  const flameLight = new THREE.PointLight('#7c77ef', 0, 4, 2)
  flameLight.position.set(0, 1.8, .15)
  scene.add(flameLight)

  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  function material<T extends THREE.Material>(value: T): T { materials.add(value); return value }
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
    const value = new THREE.Mesh(geometry, mat)
    value.position.set(x, y, z)
    value.castShadow = true; value.receiveShadow = true
    scene.add(value)
    return value
  }
  // A pressed stainless observation dish, with a continuous shallow rim.
  const metal = material(new THREE.MeshStandardMaterial({ color: '#b1bdc3', metalness: .85, roughness: .27 }))
  const trayProfile = [[0, .045], [1.47, .045], [1.54, .075], [1.62, .18], [1.62, .23], [1.58, .24], [1.54, .16], [1.47, .11], [0, .11]]
  mesh(new THREE.LatheGeometry(trayProfile.map(([x, y]) => new THREE.Vector2(x!, y!)), 96), metal)
  const surfaceMat = material(new THREE.MeshStandardMaterial({ color: '#637782', roughness: .77, metalness: .08 }))
  mesh(new THREE.CylinderGeometry(2.05, 2.08, .12, 96), surfaceMat, 0, -.04, 0)
  const wetMat = material(new THREE.MeshPhysicalMaterial({ color: '#bbd8de', metalness: .1, roughness: .12, transparent: true, opacity: .38, clearcoat: 1, depthWrite: false }))
  const wet = mesh(new THREE.CircleGeometry(1.4, 64), wetMat, 0, .117, 0)
  wet.rotation.x = -Math.PI / 2

  // The textbook specimen has an opaque, granular fractured surface, not the
  // polished/translucent skin of an ice cube. All detail is deterministic.
  let seed = 731
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#aeb2b4'; ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 13500; i++) {
    const x = random() * 512, y = random() * 512, r = .45 + random() * 2
    const shade = 130 + Math.floor(random() * 113)
    // Tiny broken polygonal grains rather than long drawn-on cracks.
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`
    ctx.beginPath(); ctx.moveTo(x - r, y)
    ctx.lineTo(x - r * .2, y - r * .85); ctx.lineTo(x + r, y - r * .3)
    ctx.lineTo(x + r * .7, y + r * .75); ctx.lineTo(x - r * .4, y + r); ctx.closePath(); ctx.fill()
  }
  const frost = new THREE.CanvasTexture(canvas)
  frost.wrapS = frost.wrapT = THREE.RepeatWrapping; frost.repeat.set(2, 2); textures.add(frost)
  const iceMat = material(new THREE.MeshPhysicalMaterial({
    color: '#dbe6e8', roughness: .3, metalness: 0, transmission: .22,
    thickness: .8, ior: 1.31, attenuationColor: '#bcd5dc', attenuationDistance: 4,
    clearcoat: .18, clearcoatRoughness: .25, bumpMap: frost, bumpScale: .008,
    vertexColors: true,
  }))
  const brokenMat = material(new THREE.MeshPhysicalMaterial({
    color: '#edf0ed', roughness: .55, metalness: 0, transmission: .085,
    thickness: .5, ior: 1.31, attenuationColor: '#cfdee0', attenuationDistance: 4,
    clearcoat: .08, clearcoatRoughness: .42, bumpMap: frost, bumpScale: .012,
    vertexColors: true,
  }))
  function makeSampleGeometry(detail: number, variant = 0) {
    // Explicit broad-bottom fracture rings prevent the scoop/popsicle outline
    // produced by a deformed sphere. The high shoulder is on the left.
    const outline = [[1, -.05], [.84, .62], [.3, 1], [-.34, .94], [-.84, .53], [-1, -.04], [-.8, -.65], [-.3, -1], [.37, -.92], [.85, -.57]] as const
    const points: THREE.Vector3[] = []
    const ringScales = [1, 1.03, .86, .59]
    for (let ring = 0; ring < 4; ring++) {
      outline.forEach(([x, z], i) => {
        const scale = ringScales[ring]!
        let y = ring === 0 ? .118 : ring === 1 ? .53 : ring === 2 ? 1.05 - .07 * x : 1.42 - .19 * x + .025 * z
        // Small cavities along the lower broken edge, not an elevated base.
        if (ring === 0 && (i === 2 || i === 4)) y += i === 2 ? .075 : .04
        points.push(new THREE.Vector3(x * scale - (ring === 3 ? .12 : 0), y, z * scale * .69))
      })
    }
    points.push(new THREE.Vector3(0, .118, 0), new THREE.Vector3(-.27, 1.67, -.03))
    let triangles: number[] = []
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 10; i++) {
      const j = (i + 1) % 10, a = ring * 10 + i, b = ring * 10 + j, c = (ring + 1) * 10 + j, d = (ring + 1) * 10 + i
      triangles.push(a, d, b, b, d, c)
    }
    for (let i = 0; i < 10; i++) {
      const j = (i + 1) % 10
      triangles.push(40, i, j, 41, 30 + j, 30 + i)
    }
    // Shared midpoint subdivision preserves a closed body and the underlying
    // broken planes; small relief never changes the specimen's broad outline.
    for (let level = 0; level < detail; level++) {
      const mids = new Map<string, number>(), next: number[] = []
      const mid = (a: number, b: number) => {
        const key = a < b ? `${a}:${b}` : `${b}:${a}`
        const existing = mids.get(key)
        if (existing !== undefined) return existing
        const index = points.length; points.push(points[a]!.clone().add(points[b]!).multiplyScalar(.5)); mids.set(key, index); return index
      }
      for (let i = 0; i < triangles.length; i += 3) {
        const a = triangles[i]!, b = triangles[i + 1]!, c = triangles[i + 2]!, ab = mid(a, b), bc = mid(b, c), ca = mid(c, a)
        next.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca)
      }
      triangles = next
    }
    const hash = (x: number, y: number, z: number) => {
      const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
      return n - Math.floor(n)
    }
    function noise(x: number, y: number, z: number) {
      const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
      const sx = x - ix, sy = y - iy, sz = z - iz
      const fx = sx * sx * (3 - 2 * sx), fy = sy * sy * (3 - 2 * sy), fz = sz * sz * (3 - 2 * sz)
      const mix = THREE.MathUtils.lerp
      return mix(mix(mix(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), mix(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy), mix(mix(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), mix(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy), fz)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(p => p.toArray()), 3))
    geometry.setIndex(triangles); geometry.computeVertexNormals()
    const pos = geometry.attributes.position!, normals = geometry.attributes.normal!, v = new THREE.Vector3()
    const uv: number[] = []
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const relief = .018 * (noise(x * 17 + variant, y * 19, z * 18) - .5)
      v.fromBufferAttribute(normals, i)
      const keepBase = THREE.MathUtils.smoothstep(y, .12, .24)
      pos.setXYZ(i, x + v.x * relief * keepBase, Math.max(.118, y + v.y * relief * keepBase), z + v.z * relief * keepBase)
      uv.push(Math.atan2(z, x) / (Math.PI * 2) + .5, y / 1.8)
    }
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geometry.computeVertexNormals()
    const p = geometry.attributes.position!, colors = new Float32Array(p.count * 3)
    for (let i = 0; i < p.count; i++) {
      const value = .95 + .025 * noise(p.getX(i) * 11, p.getY(i) * 13, p.getZ(i) * 12)
      colors[i * 3] = value; colors[i * 3 + 1] = value; colors[i * 3 + 2] = Math.min(1, value + .013)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const clear: number[] = [], frosted: number[] = []
    for (let i = 0; i < triangles.length; i += 3) {
      const a = triangles[i]!, b = triangles[i + 1]!, c = triangles[i + 2]!
      const x = (p.getX(a) + p.getX(b) + p.getX(c)) / 3, y = (p.getY(a) + p.getY(b) + p.getY(c)) / 3, z = (p.getZ(a) + p.getZ(b) + p.getZ(c)) / 3
      // Broken crown and uneven front patches are frosted; adjoining crystal
      // faces retain restrained translucent depth and sharp reflections.
      const isFrost = y > 1.16 || z > .28 && noise(x * 2.1, y * 2.5, z) > .43 || x < -.7
      ;(isFrost ? frosted : clear).push(a, b, c)
    }
    geometry.setIndex([...clear, ...frosted]); geometry.addGroup(0, clear.length, 0); geometry.addGroup(clear.length, frosted.length, 1)
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    return geometry
  }
  const iceGeometry = makeSampleGeometry(4)
  const specimen = mesh(iceGeometry, [iceMat, brokenMat])
  specimen.name = 'Granular hydrate specimen'

  // Small irregular crystallites are seated into the surface. Instancing gives
  // real grazing-angle relief and a broken silhouette in one draw call.
  const grainMat = material(new THREE.MeshPhysicalMaterial({
    color: '#e4edef', roughness: .31, metalness: 0, transmission: .22,
    thickness: .055, ior: 1.31, clearcoat: .18, clearcoatRoughness: .28,
  }))
  const grainGeometry = new THREE.IcosahedronGeometry(1, 0)
  const grains = new THREE.InstancedMesh(grainGeometry, grainMat, 620)
  grains.name = 'Attached surface granules'; grains.castShadow = true; grains.receiveShadow = true
  const vertices = iceGeometry.attributes.position!, normals = iceGeometry.attributes.normal!
  const dummy = new THREE.Object3D(), normal = new THREE.Vector3(), grainColor = new THREE.Color()
  let count = 0
  for (let attempt = 0; count < grains.count && attempt < 12000; attempt++) {
    const i = Math.floor(random() * vertices.count)
    const y = vertices.getY(i)
    if (y < .19 || normals.getY(i) < -.55) continue
    normal.fromBufferAttribute(normals, i)
    const r = .016 + Math.pow(random(), 1.8) * .032
    dummy.position.fromBufferAttribute(vertices, i).addScaledVector(normal, -r * .76)
    dummy.scale.set(r * (1 + random() * .45), r * (.58 + random() * .38), r)
    dummy.rotation.set(random() * 3, random() * 6, random() * 3)
    dummy.updateMatrix(); grains.setMatrixAt(count, dummy.matrix)
    const shade = .95 + random() * .05
    grainColor.setRGB(shade, shade, Math.min(1, shade + .025))
    grains.setColorAt(count++, grainColor)
  }
  grains.count = count; grains.instanceMatrix.needsUpdate = true; scene.add(grains)
  // Angular crumbs stay on the tray, unlike suspended miniature copies.
  const chipGeometry = makeSampleGeometry(2, 1.8)
  for (const [x, z, size, turn] of [[-.79, .42, .12, .8], [.74, .33, .08, 2], [-.48, .69, .10, 4], [.45, -.6, .075, 1.4], [-.95, -.07, .065, 3.2], [.67, .56, .043, 5.1]] as const) {
    const chip = mesh(chipGeometry, [iceMat, brokenMat], x, .118 - .118 * size, z)
    chip.scale.set(size * 1.3, size * .72, size)
    chip.position.y = .118 - chipGeometry.boundingBox!.min.y * chip.scale.y
    chip.rotation.y = turn
  }

  // Gas burns above the fractured crown, not as a coloured decal on the ice.
  // Sample the real upper surface so central and shoulder flame roots touch it.
  const surfaceRay = new THREE.Raycaster()
  specimen.updateMatrixWorld()
  const flameSites = [
    { x: -.22, z: .03, height: .96, radius: .25, phase: .7 },
    { x: .18, z: .12, height: 1.02, radius: .27, phase: 4.1 },
    { x: -.48, z: -.18, height: .72, radius: .22, phase: 2.4 },
    { x: .48, z: -.12, height: 1.10, radius: .23, phase: 5.6 },
    { x: -.14, z: .38, height: .52, radius: .24, phase: 8.5 },
    { x: .47, z: .35, height: .71, radius: .26, phase: 11.2 },
    { x: -.58, z: .21, height: .66, radius: .22, phase: 14.3 },
  ]
  const roots: THREE.Vector4[] = [], shapes: THREE.Vector2[] = []
  for (const site of flameSites) {
    surfaceRay.set(new THREE.Vector3(site.x, 4, site.z), new THREE.Vector3(0, -1, 0))
    const hit = surfaceRay.intersectObject(specimen, false)[0]
    if (!hit) throw new Error('Hydrate flame root is outside the specimen')
    // A small overlap is hidden by scene depth; it prevents a detached root.
    roots.push(new THREE.Vector4(site.x, hit.point.y - .045, site.z, site.height))
    shapes.push(new THREE.Vector2(site.radius, site.phase))
  }

  // Each flame has a broad root. Follow the crown under its entire footprint,
  // rather than using the centre height as a floating horizontal bottom edge.
  const crownSize = 49, crownHeights = new Uint8Array(crownSize * crownSize * 4)
  for (let z = 0; z < crownSize; z++) for (let x = 0; x < crownSize; x++) {
    surfaceRay.set(new THREE.Vector3(((x + .5) / crownSize - .5) * 2.6, 4, ((z + .5) / crownSize - .5) * 2.1), new THREE.Vector3(0, -1, 0))
    const hit = surfaceRay.intersectObject(specimen, false)[0]
    const value = Math.round((hit?.point.y ?? 0) / 4 * 65535), offset = (z * crownSize + x) * 4
    crownHeights[offset] = value >> 8; crownHeights[offset + 1] = value & 255
    crownHeights[offset + 2] = hit ? 255 : 0; crownHeights[offset + 3] = 255
  }
  const crownTexture = new THREE.DataTexture(crownHeights, crownSize, crownSize, THREE.RGBAFormat, THREE.UnsignedByteType)
  // RG encodes 16-bit height without requiring float-linear filtering on tablets.
  crownTexture.minFilter = crownTexture.magFilter = THREE.LinearFilter
  crownTexture.needsUpdate = true; textures.add(crownTexture)

  // Depth clips the *ray interval*, not the proxy box. In particular, flames
  // behind the opaque fractured crown must not show through its transmission.
  const depthTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
  })
  const depthMaterial = material(new THREE.MeshDepthMaterial())
  depthMaterial.colorWrite = false
  const flameMaterial = material(new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uStrength: { value: 0 },
      uRoots: { value: roots }, uShapes: { value: shapes },
      uDepth: { value: depthTarget.depthTexture }, uCrown: { value: crownTexture },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uInverseProjection: { value: camera.projectionMatrixInverse },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        vWorld = p.xyz;
        gl_Position = projectionMatrix * viewMatrix * p;
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec3 vWorld;
      uniform float uTime, uStrength;
      uniform vec4 uRoots[7];
      uniform vec2 uShapes[7];
      uniform sampler2D uDepth, uCrown;
      uniform vec2 uResolution;
      uniform mat4 uInverseProjection;
      float hash(vec3 p) {
        p = fract(p * .1031); p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                       mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                       mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
      // Continuous 3D density: there are no camera-facing cards, surface UVs,
      // or overlapping transparent sheets whose order changes during orbiting.
      vec2 field(vec3 p) {
        vec3 flow = p * 5.0 - vec3(0, uTime * 2.1, 0);
        float n = noise(flow), fine = noise(flow * 2.13 + 7.4);
        float density = 0.0, hot = 0.0;
        vec3 crownSample = texture2D(uCrown, p.xz/vec2(2.6,2.1)+.5).rgb;
        float crown = (crownSample.r*256.0+crownSample.g)/257.0*4.0;
        for (int j=0; j<7; j++) {
          vec4 root = uRoots[j];
          float phase = uShapes[j].y;
          float h = root.w * (1.0 + .11*sin(uTime*2.8 + phase));
          float startY = crown-.035;
          float joinY = max(startY,root.y)+.25;
          float lift = clamp((p.y-startY)/(joinY-startY),0.0,1.0);
          float base = mix(startY,root.y,lift);
          if ((crown < .92 || crownSample.b < .75) && lift < .98) continue;
          float v = (p.y-base)/h;
          if (v < 0.0 || v >= 1.0) continue;
          float free = smoothstep(.035, .3, v);
          vec2 curl = vec2(sin(v*5.6-uTime*2.2+phase), cos(v*4.3-uTime*1.7+phase));
          vec2 center = root.xz + curl * .12 * free * v;
          center += vec2(.10, -.035) * v*v;
          float radius = uShapes[j].x * 1.25 * pow(1.0-v, .72);
          radius *= 1.0 + free * ((n-.5)*.65 + .12*sin(v*11.0-uTime*3.3+phase));
          vec2 eddy = vec2(n-.5, fine-.5) * (.07 + .14*free);
          float r = length((p.xz-center+eddy) * vec2(1.0, 1.12)) / max(radius, .005);
          float body = 1.0-smoothstep(.42, 1.12, r);
          // A brighter reaction envelope, with enough inner emission to read
          // as a volume from above. Roots stay continuous as noise advects up.
          float shell = .40 + .60*exp(-pow((r-.70)*3.5, 2.0));
          float d = body * shell * (1.0-smoothstep(.80, 1.0, v));
          d *= mix(.93, .53 + .60*fine, free);
          density += d;
          hot += d * smoothstep(.43, .84, v) * (j == 3 ? .8 : .17);
        }
        return vec2(density, hot/max(density,.001));
      }
      void main() {
        vec3 origin = cameraPosition, direction = normalize(vWorld-origin);
        vec3 inv = 1.0/direction;
        vec3 t0 = (vec3(-1.3,.92,-1.05)-origin)*inv;
        vec3 t1 = (vec3(1.3,3.05,1.05)-origin)*inv;
        vec3 nearT = min(t0,t1), farT = max(t0,t1);
        float start = max(0.0, max(max(nearT.x,nearT.y),nearT.z));
        float end = min(min(farT.x,farT.y),farT.z);
        vec2 uv = gl_FragCoord.xy/uResolution;
        float depth = texture2D(uDepth,uv).x;
        vec4 sceneP = uInverseProjection * vec4(uv*2.0-1.0, depth*2.0-1.0, 1.0);
        end = min(end, length(sceneP.xyz/sceneP.w)-.002);
        if (end <= start) discard;
        float stepSize = (end-start)/64.0;
        vec4 total = vec4(0.0);
        for (int i=0; i<64; i++) {
          vec3 p = origin + direction*(start+(float(i)+.5)*stepSize);
          vec2 f = field(p);
          float alpha = 1.0-exp(-f.x*stepSize*3.6*uStrength);
          vec3 color = mix(vec3(.075,.19,1.35), vec3(.48,.20,.77), smoothstep(1.45,2.65,p.y));
          color = mix(color,vec3(1.65,.64,.15),f.y);
          total.rgb += (1.0-total.a)*alpha*color;
          total.a += (1.0-total.a)*alpha;
          if (total.a>.97) break;
        }
        if (total.a<.003) discard;
        gl_FragColor = vec4(total.rgb/max(total.a,.001),total.a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, depthTest: false,
    side: THREE.BackSide, toneMapped: false,
  }))
  const flame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.13, 2.1), flameMaterial)
  flame.position.y = (3.05 + .92) / 2
  flame.name = 'Volumetric flame above the hydrate crown'
  flame.renderOrder = 2; flame.visible = false; scene.add(flame)
  const drawingSize = new THREE.Vector2()

  let disposed = false, frame = 0, burning = false, strength = 0, resizePending = true
  let clock = 0, previous = performance.now()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  const observer = new ResizeObserver(() => { resizePending = true })
  observer.observe(host)
  function resize() {
    const { width, height } = host.getBoundingClientRect()
    if (width <= 0 || height <= 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height; camera.updateProjectionMatrix()
    renderer.getDrawingBufferSize(drawingSize)
    depthTarget.setSize(drawingSize.x, drawingSize.y)
    flameMaterial.uniforms.uResolution!.value.copy(drawingSize)
  }
  function animate(now: number) {
    if (disposed) return
    frame = requestAnimationFrame(animate)
    const dt = Math.min((now - previous) / 1000, .05); previous = now
    if (document.hidden) return
    if (resizePending) { resize(); resizePending = false }
    clock += dt
    strength = THREE.MathUtils.damp(strength, burning ? 1 : 0, 6, dt)
    flameMaterial.uniforms.uStrength!.value = strength
    flameMaterial.uniforms.uTime!.value = reducedMotion ? 1.2 : clock
    flameLight.intensity = strength * (.25 + (reducedMotion ? 0 : Math.sin(clock * 7) * .025))
    controls.update()
    flame.visible = false
    if (strength > .002) {
      // The depth-only pass excludes the wet transparent film and the volume.
      // Disabling shadow updates avoids redoing the light's shadow map here.
      const shadowUpdate = renderer.shadowMap.autoUpdate
      renderer.shadowMap.autoUpdate = false
      wet.visible = false; scene.overrideMaterial = depthMaterial
      renderer.setRenderTarget(depthTarget); renderer.render(scene, camera)
      renderer.setRenderTarget(null); scene.overrideMaterial = null; wet.visible = true
      renderer.shadowMap.autoUpdate = shadowUpdate
      flame.visible = true
    }
    renderer.render(scene, camera)
  }
  function contextLost(event: Event) { event.preventDefault(); onError() }
  renderer.domElement.addEventListener('webglcontextlost', contextLost)
  resize(); frame = requestAnimationFrame(animate)
  return {
    setBurning(value) { burning = value },
    reset() { controls.target.set(0, 1.13, 0); camera.position.set(2.7, 2.45, 5.3); controls.update() },
    zoom(direction) { camera.position.sub(controls.target).multiplyScalar(direction > 0 ? .88 : 1.14).add(controls.target); controls.update() },
    dispose() {
      if (disposed) return
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose()
      renderer.domElement.removeEventListener('webglcontextlost', contextLost)
      const geometries = new Set<THREE.BufferGeometry>()
      scene.traverse(object => { if ((object as THREE.Mesh).geometry) geometries.add((object as THREE.Mesh).geometry) })
      grains.dispose()
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose())
      depthTarget.dispose(); light.shadow.map?.dispose(); environment.dispose(); pmrem.dispose(); renderer.dispose(); renderer.domElement.remove()
    },
  }
}
