import * as THREE from 'three'
import { geoToWorld } from './world'
import { createDroughtEffect } from './drought-effect'
import { createWinterTemperatureEffect } from './winter-temperature-effect'
import type { Effect, LessonStep, Scenario } from './lessons'

type TeachingEffect = 'moistureTransport' | 'landWaterCycle' | 'globalHeatTransport' | 'regionalImpacts' | 'chinaImpacts' | 'monitoring'
type Caption = (text: string, color?: string, width?: number) => THREE.Sprite
type Stage = { key: TeachingEffect; object: THREE.Object3D; start: number; duration: number }
type Rain = { group: THREE.Group; positions: THREE.BufferAttribute; bottoms: THREE.Vector3[]; height: number; phase: number; ripple: THREE.InstancedMesh<THREE.PlaneGeometry, THREE.ShaderMaterial> }
type TeachingLabel = { key: TeachingEffect; sprite: THREE.Sprite; anchor: THREE.Vector3 }

// A small X/Z index samples the actual rendered triangles, avoiding hundreds of
// full-world raycasts while creating labels, ground tracks and rain endpoints.
function terrainSampler(terrain: THREE.Group) {
  const cells = new Map<string, number[]>()
  const triangles: number[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  terrain.updateWorldMatrix(true, true)
  terrain.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const geometry = object.geometry as THREE.BufferGeometry
    const positions = geometry.getAttribute('position'), index = geometry.getIndex()
    if (!positions) return
    const count = index?.count ?? positions.count
    for (let i = 0; i + 2 < count; i += 3) {
      a.fromBufferAttribute(positions, index ? index.getX(i) : i).applyMatrix4(object.matrixWorld)
      b.fromBufferAttribute(positions, index ? index.getX(i + 1) : i + 1).applyMatrix4(object.matrixWorld)
      c.fromBufferAttribute(positions, index ? index.getX(i + 2) : i + 2).applyMatrix4(object.matrixWorld)
      const det = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z)
      if (Math.abs(det) < 1e-8 || Math.max(a.y, b.y, c.y) < 0) continue
      const offset = triangles.length
      triangles.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, det)
      for (let x = Math.floor(Math.min(a.x, b.x, c.x)); x <= Math.floor(Math.max(a.x, b.x, c.x)); x++) {
        for (let z = Math.floor(Math.min(a.z, b.z, c.z)); z <= Math.floor(Math.max(a.z, b.z, c.z)); z++) {
          const key = `${x}:${z}`, bucket = cells.get(key)
          if (bucket) bucket.push(offset)
          else cells.set(key, [offset])
        }
      }
    }
  })
  return (x: number, z: number) => {
    let height = .035
    for (const i of cells.get(`${Math.floor(x)}:${Math.floor(z)}`) ?? []) {
      const ax = triangles[i]!, ay = triangles[i + 1]!, az = triangles[i + 2]!
      const bx = triangles[i + 3]!, by = triangles[i + 4]!, bz = triangles[i + 5]!
      const cx = triangles[i + 6]!, cy = triangles[i + 7]!, cz = triangles[i + 8]!, det = triangles[i + 9]!
      const wa = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det
      const wb = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det
      const wc = 1 - wa - wb
      if (wa >= -1e-5 && wb >= -1e-5 && wc >= -1e-5) height = Math.max(height, wa * ay + wb * by + wc * cy)
    }
    return height
  }
}

/** Geographic teaching overlays, independent of the historical climate fields.
 * Every resource is attached to the scene and released by its shared disposer.
 * Ground paths are sampled against the rendered terrain once, never per frame.
 */
export function createTeachingEffects(options: {
  effect: (key: Effect) => THREE.Group
  amount: (key: Effect) => number
  label: Caption
  terrain: THREE.Group
}) {
  const keys: TeachingEffect[] = ['moistureTransport', 'landWaterCycle', 'globalHeatTransport', 'regionalImpacts', 'chinaImpacts', 'monitoring']
  const groups = Object.fromEntries(keys.map((key) => [key, options.effect(key)])) as Record<TeachingEffect, THREE.Group>
  const stages: Stage[] = []
  const rains: Rain[] = []
  const labels: TeachingLabel[] = []
  const buoys: THREE.Group[] = []
  const scenarioGroups: { key: TeachingEffect; scenario: Scenario; season?: 'winter' | 'summer'; group: THREE.Group }[] = []
  let elapsed = 0
  let active = new Set<Effect>()
  let scenario: Scenario = 'normal'
  let season: 'winter' | 'summer' = 'winter'

  const sampleTerrain = terrainSampler(options.terrain)
  const heightCache = new Map<string, number>()
  function ground(x: number, z: number) {
    const cacheKey = `${x.toFixed(3)}:${z.toFixed(3)}`
    const known = heightCache.get(cacheKey)
    if (known !== undefined) return known
    const height = sampleTerrain(x, z)
    heightCache.set(cacheKey, height)
    return height
  }
  function point(lon: number, lat: number, clearance = 0) {
    const p = geoToWorld(lon, lat)
    p.y = ground(p.x, p.z) + clearance
    return p
  }
  function stage(key: TeachingEffect, object: THREE.Object3D, start = 0, duration = 1.1, parent = groups[key]) {
    parent.add(object)
    object.traverse((node) => {
      const material = (node as THREE.Mesh).material
      if (!material) return
      for (const mat of Array.isArray(material) ? material : [material]) {
        mat.userData.teachingStage = true
        if (mat.userData.baseOpacity === undefined) mat.userData.baseOpacity = mat.opacity
      }
    })
    stages.push({ key, object, start, duration })
    return object
  }
  function caption(key: TeachingEffect, text: string, at: THREE.Vector3, color: string, start = 0, width = 7, parent = groups[key]) {
    const sprite = options.label(text, color, width)
    sprite.position.copy(at)
    sprite.userData.sceneLabel.minPixels = Math.min(150, Math.max(70, text.length * 12 + 18))
    labels.push({ key, sprite, anchor: at.clone() })
    stage(key, sprite, start, .8, parent)
    return sprite
  }
  function localCard(key: TeachingEffect, title: string, detail: string, at: THREE.Vector3, color: string, start: number, parent = groups[key]) {
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')!
    ctx.font = '600 30px "Microsoft YaHei",sans-serif'
    const titleWidth = ctx.measureText(title).width
    ctx.font = '25px "Microsoft YaHei",sans-serif'
    canvas.width = Math.ceil(Math.max(260, titleWidth + 40, ctx.measureText(detail).width + 40))
    canvas.height = 100
    ctx.fillStyle = 'rgba(9,37,50,.9)'; ctx.beginPath(); ctx.roundRect(1, 1, canvas.width - 2, 98, 13); ctx.fill()
    ctx.fillStyle = color; ctx.fillRect(7, 17, 4, 66)
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '600 30px "Microsoft YaHei",sans-serif'
    ctx.fillStyle = '#eff8fa'; ctx.fillText(title, 23, 31)
    ctx.font = '25px "Microsoft YaHei",sans-serif'; ctx.fillStyle = color; ctx.fillText(detail, 23, 70)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }))
    sprite.renderOrder = 24; sprite.position.copy(at)
    sprite.userData.sceneLabel = { baseWidth: 4.5, aspect: canvas.height / canvas.width, minPixels: Math.min(200, canvas.width * .5) }
    labels.push({ key, sprite, anchor: at.clone() })
    stage(key, sprite, start, .9, parent)
    return sprite
  }
  function winterBadge(cold: boolean, at: THREE.Vector3, parent: THREE.Group) {
    const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 116
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = cold ? 'rgba(218,240,252,.95)' : 'rgba(255,235,216,.95)'
    ctx.beginPath(); ctx.roundRect(1, 1, 478, 114, 24); ctx.fill()
    ctx.fillStyle = cold ? '#397fa8' : '#b66640'
    ctx.beginPath(); ctx.roundRect(18, 25, 64, 64, 18); ctx.fill()
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 34px "Microsoft YaHei",sans-serif'
    ctx.fillStyle = '#ffffff'; ctx.fillText(cold ? '冷' : '暖', 50, 57)
    ctx.textAlign = 'left'; ctx.fillStyle = cold ? '#24546f' : '#80452e'
    ctx.font = '600 32px "Microsoft YaHei",sans-serif'; ctx.fillText(cold ? '冬季偏冷倾向' : '冬季偏暖倾向', 102, 42)
    ctx.font = '24px "Microsoft YaHei",sans-serif'; ctx.fillText('季节平均 · 并非每天如此', 102, 83)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, depthTest: false, toneMapped: false }))
    sprite.position.copy(at); sprite.center.set(.5, 0); sprite.renderOrder = 24
    sprite.userData.sceneLabel = { baseWidth: 5, aspect: canvas.height / canvas.width, minPixels: 228 }
    labels.push({ key: 'chinaImpacts', sprite, anchor: at.clone() }); stage('chinaImpacts', sprite, .5, 1, parent)
    const foot = new THREE.Vector3(at.x, ground(at.x, at.z) + .1, at.z)
    const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([foot, at]), new THREE.LineBasicMaterial({ color: cold ? '#8abbd5' : '#e8b08c', transparent: true, opacity: .55, depthWrite: false, toneMapped: false }))
    stem.userData.verticalSignpost = true
    stage('chinaImpacts', stem, .5, 1, parent)
  }
  function ribbon(points: THREE.Vector3[], color: string, width: number, speed = .12, dashed = false, emphasis = 1) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    const samples = 80
    const position: number[] = [], tangent: number[] = [], uv: number[] = [], indices: number[] = []
    for (let i = 0; i <= samples; i++) {
      const p = curve.getPointAt(i / samples), t = curve.getTangentAt(i / samples)
      for (const side of [0, 1]) { position.push(p.x, p.y, p.z); tangent.push(t.x, t.y, t.z); uv.push(i / samples, side) }
      if (i < samples) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
    geometry.setAttribute('aTangent', new THREE.Float32BufferAttribute(tangent, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    geometry.setIndex(indices)
    const material = new THREE.ShaderMaterial({
      transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
      uniforms: { uAlpha: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 }, uWidth: { value: width }, uColor: { value: new THREE.Color(color) }, uSpeed: { value: speed }, uDashed: { value: dashed ? 1 : 0 }, uEmphasis: { value: emphasis } },
      vertexShader: `attribute vec3 aTangent;uniform float uWidth;varying vec2 vUv;
        void main(){vUv=uv;vec4 p=modelMatrix*vec4(position,1.);vec3 t=normalize(mat3(modelMatrix)*aTangent);vec3 side=normalize(cross(t,normalize(cameraPosition-p.xyz)));p.xyz+=side*(uv.y-.5)*uWidth;gl_Position=projectionMatrix*viewMatrix*p;}`,
      fragmentShader: `uniform float uAlpha,uReveal,uTime,uSpeed,uDashed,uEmphasis;uniform vec3 uColor;varying vec2 vUv;
        void main(){float side=abs(vUv.y-.5)*2.;float edge=1.-smoothstep(.38,1.,side);float ends=smoothstep(0.,.045,vUv.x)*(1.-smoothstep(.94,1.,vUv.x));float reveal=1.-smoothstep(uReveal-.03,uReveal+.005,vUv.x);
        float flow=fract(vUv.x*2.-uTime*uSpeed);float chevron=1.-smoothstep(.055,.105,abs(flow-.48+abs(vUv.y-.5)*.6));float dash=mix(1.,smoothstep(.12,.24,fract(vUv.x*17.)),uDashed);float alpha=uAlpha*uEmphasis*edge*ends*reveal*(.24+.4*chevron)*dash;if(alpha<.003)discard;gl_FragColor=vec4(uColor,alpha);
        #include <colorspace_fragment>
        }`,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.frustumCulled = false
    mesh.renderOrder = 12
    return mesh
  }
  function groundRoute(coordinates: [number, number][]) {
    const points = coordinates.map(([lon, lat]) => geoToWorld(lon, lat))
    const path = new THREE.CatmullRomCurve3(points, false, 'centripetal')
    return Array.from({ length: 25 }, (_, i) => {
      const p = path.getPoint(i / 24)
      p.y = ground(p.x, p.z) + .2
      return p
    })
  }
  function rain(at: THREE.Vector3, radius = 1, height = 3.4, count = 48) {
    const group = new THREE.Group()
    const bottoms: THREE.Vector3[] = []
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963, r = Math.sqrt((i + .5) / count) * radius
      const bottom = new THREE.Vector3(at.x + Math.cos(angle) * r, 0, at.z + Math.sin(angle) * r)
      bottom.y = ground(bottom.x, bottom.z) + .025
      bottoms.push(bottom)
    }
    const positions = new THREE.BufferAttribute(new Float32Array(count * 6), 3)
    positions.setUsage(THREE.DynamicDrawUsage)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', positions)
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#c1eeff', transparent: true, opacity: .85, depthWrite: false, toneMapped: false }))
    lines.frustumCulled = false
    lines.renderOrder = 14
    group.add(lines)
    // Small cloud clusters identify the source of rain without white spheres.
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64
    const ctx = canvas.getContext('2d')!
    for (const [x, y, r] of [[38, 35, 22], [64, 24, 25], [90, 35, 22]]) {
      const gradient = ctx.createRadialGradient(x!, y!, 0, x!, y!, r!)
      gradient.addColorStop(0, 'rgba(239,249,255,.95)'); gradient.addColorStop(.6, 'rgba(226,241,250,.7)'); gradient.addColorStop(1, 'rgba(216,235,247,0)')
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 64)
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: .88, toneMapped: false }))
    cloud.position.copy(at); cloud.position.y = Math.max(...bottoms.map((p) => p.y)) + height + .15
    cloud.scale.set(radius * 3.1, radius * 1.55, 1); group.add(cloud)
    const systemPhase = rains.length * .29
    const rippleGeometry = new THREE.PlaneGeometry(.28, .28)
    rippleGeometry.rotateX(-Math.PI / 2)
    rippleGeometry.setAttribute('aDropPhase', new THREE.InstancedBufferAttribute(Float32Array.from(bottoms, (_, i) => i * .618), 1))
    const rippleMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { uAlpha: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 }, uPhase: { value: systemPhase } },
      vertexShader: `attribute float aDropPhase;varying vec2 vUv;varying float vPhase;void main(){vUv=uv;vPhase=aDropPhase;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
      fragmentShader: `uniform float uAlpha,uTime,uPhase;varying vec2 vUv;varying float vPhase;
        void main(){float age=fract(uTime*.7+vPhase+uPhase);if(age>.25)discard;float d=length(vUv-.5)*2.;float aa=max(fwidth(d),.012);float r=.08+age*3.2;float first=1.-smoothstep(.018,.052+aa,abs(d-r));float late=max(0.,age-.065);float second=(1.-smoothstep(.018,.048+aa,abs(d-(.08+late*3.2))))*smoothstep(.065,.085,age);float fade=smoothstep(0.,.02,age)*(1.-smoothstep(.09,.25,age));float alpha=uAlpha*fade*(first*.38+second*.19)*(1.-smoothstep(.88,1.,d));if(alpha<.003)discard;gl_FragColor=vec4(.72,.88,.94,alpha);
        #include <colorspace_fragment>
        }`,
    })
    const ripple = new THREE.InstancedMesh(rippleGeometry, rippleMaterial, count)
    ripple.frustumCulled = false; ripple.renderOrder = 14
    const normal = new THREE.Vector3(), rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4(), scale = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < count; i++) {
      const bottom = bottoms[i]!, epsilon = .06
      normal.set(ground(bottom.x - epsilon, bottom.z) - ground(bottom.x + epsilon, bottom.z), epsilon * 2, ground(bottom.x, bottom.z - epsilon) - ground(bottom.x, bottom.z + epsilon)).normalize()
      rotation.setFromUnitVectors(up, normal)
      const surface = bottom.clone(); surface.y = ground(bottom.x, bottom.z) + .025
      matrix.compose(surface, rotation, scale); ripple.setMatrixAt(i, matrix)
    }
    ripple.instanceMatrix.needsUpdate = true; group.add(ripple)
    rains.push({ group, positions, bottoms, height, phase: systemPhase, ripple })
    return group
  }

  // A coastal example makes the sea-to-land branch legible; paths are schematic,
  // not a reconstruction of a named river catchment or observed weather event.
  const source = point(158, -17, .15)
  const land = point(143, -17, .1)
  const vapor = [source.clone(), source.clone().add(new THREE.Vector3(0, 1.5, 0)), source.clone().add(new THREE.Vector3(-.15, 3, 0))]
  stage('moistureTransport', ribbon(vapor, '#f27667', .38, .2), 0, 1.7)
  caption('moistureTransport', '海面蒸发', source.clone().add(new THREE.Vector3(.75, 1.1, .45)), '#ffc6b5', .3, 3)
  const inlandPath = [vapor[2]!, point(153, -17, 3.6), point(147, -17, 3.8), land.clone().add(new THREE.Vector3(0, 3.3, 0))]
  stage('moistureTransport', ribbon(inlandPath, '#9ae3e9', .44, .13), 1.5, 3)
  caption('moistureTransport', '水汽向陆', point(150, -17, 4.5), '#c1f3f3', 2, 3)
  stage('landWaterCycle', rain(land, .7, 2.7), 2.3, 1.5)
  caption('landWaterCycle', '陆地降水', point(140, -16, .8), '#c8edff', 2.8, 3)
  stage('landWaterCycle', ribbon(groundRoute([[143, -17], [145, -18.7], [147, -19], [151, -19.5]]), '#70e0f1', .3, .12), 4.5, 2.8)
  caption('landWaterCycle', '径流回海', point(148, -23, .65), '#a7eff8', 5.2, 3)
  // Underground return is explained in the lesson, rather than drawing a
  // second exposed path across mountains that resembles a surface river.
  const evapotranspiration = point(138, -26, .3)
  stage('landWaterCycle', ribbon([evapotranspiration, evapotranspiration.clone().add(new THREE.Vector3(-.15, 1.4, 0)), evapotranspiration.clone().add(new THREE.Vector3(-.25, 2.5, 0))], '#eeb0a0', .25, .13), 7.5, 1.8)
  caption('landWaterCycle', '陆地蒸散', point(136, -28, 1), '#f5d2c4', 7.9, 3)

  // Net poleward transport is an integrated budget, not individual meridional
  // currents or prevailing wind directions. Separate heights distinguish carriers.
  for (const sign of [-1, 1]) {
    const seaPath = [[194, sign * 8], [205, sign * 22], [208, sign * 40], [198, sign * 55]] as [number, number][]
    stage('globalHeatTransport', ribbon(seaPath.map(([lon, lat]) => point(lon, lat, .5)), '#eea264', .65, .085), .5, 3.4)
    const airPath = [[222, sign * 8], [226, sign * 24], [224, sign * 42], [218, sign * 55]] as [number, number][]
    stage('globalHeatTransport', ribbon(airPath.map(([lon, lat]) => point(lon, lat, 3.2)), '#e1caee', .5, .1), 2.7, 3.4)
  }
  caption('globalHeatTransport', '低纬净受热', point(190, 0, .8), '#ffe2af', 0, 4)
  caption('globalHeatTransport', '海洋输热', point(196, -35, 1.8), '#ffd3a0', 1.3, 5)
  caption('globalHeatTransport', '大气输热', point(228, -31, 4), '#f2e2ff', 3.3, 5)

  const regions = [
    { lon: 118, lat: -3, name: '印尼附近', radius: 1.5 },
    { lon: 134, lat: -19, name: '澳大利亚北部', radius: 1.6 },
    { lon: -80, lat: -4, name: '厄瓜多尔／秘鲁北部沿海', radius: 1.1 },
  ]
  for (const state of ['elnino', 'lanina'] as const) {
    const scenarioGroup = new THREE.Group(); groups.regionalImpacts.add(scenarioGroup)
    scenarioGroups.push({ key: 'regionalImpacts', scenario: state, group: scenarioGroup })
    regions.forEach((region, index) => {
      const west = index < 2
      const wet = state === 'elnino' ? !west : west
      const color = wet ? '#90daff' : '#ffc78e'
      const at = point(region.lon, region.lat, .15)
      if (wet) stage('regionalImpacts', rain(at, region.radius * .5, 1.9), 1.5 + index, 1.5, scenarioGroup)
      else stage('regionalImpacts', createDroughtEffect(at, region.radius, ground), 1.5 + index, 3.5, scenarioGroup)
      const detail = wet ? '偏多雨倾向 · 关注洪涝' : '偏少雨倾向 · 关注干旱'
      // Keep the sign above neighbouring ridges, with its base directly over
      // the named place. Never pull the card sideways across the map.
      let nearbyHeight = at.y
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) {
        nearbyHeight = Math.max(nearbyHeight, ground(at.x + x / 3 * region.radius, at.z + z / 3 * region.radius))
      }
      const location = at.clone().setY(Math.max(at.y + (index === 0 ? 5.4 : 3.7), nearbyHeight + 2.5))
      const start = .5 + index * 1.1
      const sign = localCard('regionalImpacts', region.name, detail, location, color, start, scenarioGroup)
      sign.center.set(.5, 0)
      const stem = new THREE.Line(new THREE.BufferGeometry().setFromPoints([at, location]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .74, depthWrite: false, toneMapped: false }))
      stem.name = 'regional-impact-signpost'
      stem.userData.verticalSignpost = true
      stage('regionalImpacts', stem, start, .9, scenarioGroup)
    })
  }

  // Each page selects one season. China marks are qualitative tendencies, not
  // a downscaled forecast or a fixed province/rain-belt boundary.
  function chinaGroup(state: 'elnino' | 'lanina', period: 'winter' | 'summer') {
    const group = new THREE.Group()
    groups.chinaImpacts.add(group)
    scenarioGroups.push({ key: 'chinaImpacts', scenario: state, season: period, group })
    return group
  }
  for (const state of ['elnino', 'lanina'] as const) {
    const winter = chinaGroup(state, 'winter')
    const strongerColdAir = state === 'lanina'
    stage('chinaImpacts', createWinterTemperatureEffect(options.terrain, strongerColdAir ? 'cold' : 'warm'), 0, 3, winter)
    winterBadge(strongerColdAir, point(113, 38, 4.6), winter)
    // The seasonal tendency appears first. A later, intermittent cold-air
    // example distinguishes a short weather event from the winter average.
    for (const [index, offset] of [-1.5, 0, 1.5].entries()) {
      const path = [[105 + offset, 51], [111 + offset, 42], [118 + offset, 31]] as [number, number][]
      const air = ribbon(path.map(([lon, lat]) => point(lon, lat, 2.1)), '#c9e9fa', strongerColdAir ? .32 : .22, strongerColdAir ? .16 : .11, false, strongerColdAir ? .92 : .65)
      air.userData.winterAir = true
      air.userData.intermittent = !strongerColdAir
      stage('chinaImpacts', air, (strongerColdAir ? 2.3 : 5.5) + index * .25, 1.8, winter)
    }
    const weatherCue = caption('chinaImpacts', strongerColdAir ? '注意阶段性降温' : '仍可能出现短时强降温', point(124, 26, 2.6), '#d5edf8', strongerColdAir ? 4 : 6, 5, winter)
    weatherCue.userData.sceneLabel.minPixels = 198

    const summer = chinaGroup(state, 'summer')
    if (state === 'elnino') {
      localCard('chinaImpacts', '次年夏季 · 统计倾向', '长江流域部分地区多雨', point(108, 34, 2.1), '#a9ddf5', .2, summer)
      stage('chinaImpacts', rain(point(112, 30), .42, 1.5, 24), 1.7, 1.8, summer)
      stage('chinaImpacts', rain(point(117, 31), .4, 1.45, 24), 2.2, 1.8, summer)
      localCard('chinaImpacts', '长江流域 · 防汛关注', '洪涝风险可能增加', point(121, 28, 1), '#c3eafa', 3.2, summer)
    } else {
      localCard('chinaImpacts', '次年夏季 · 统计倾向', '北方多雨概率有所上升', point(110, 45, 1.5), '#a9ddf5', .2, summer)
      // Sparse clusters indicate possibilities across the north. Never join
      // them into a fixed rain belt or mirror the El Niño Yangtze example.
      stage('chinaImpacts', rain(point(110, 40), .28, 1.25, 18), 1.7, 1.8, summer)
      stage('chinaImpacts', rain(point(120, 43), .29, 1.3, 18), 2.4, 1.8, summer)
      localCard('chinaImpacts', '多雨区并不固定', '位置、范围因事件而异', point(118, 33, 1.1), '#c3eafa', 3.2, summer)
    }
  }

  const buoySpecs = [
    { lon: 150, lat: 1, title: '海温观测', detail: '识别持续偏暖或偏冷', color: '#ffd5a8' },
    { lon: 210, lat: 1, title: '气压观测', detail: '比较东西气压变化', color: '#c8e9fb' },
    { lon: 270, lat: 1, title: '风的观测', detail: '判断风向、风速变化', color: '#b7ece0' },
  ]
  buoySpecs.forEach((spec, index) => {
    const group = new THREE.Group(); const at = point(spec.lon, spec.lat)
    group.position.copy(at)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.45, .32, .28, 18), new THREE.MeshStandardMaterial({ color: '#f5bc61', roughness: .6 }))
    body.position.y = .17; group.add(body)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, 1.4, 8), new THREE.MeshStandardMaterial({ color: '#ebeee9' }))
    mast.position.y = .95; group.add(mast)
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(.25, .28, .25), new THREE.MeshStandardMaterial({ color: '#b9dce6' }))
    sensor.position.y = 1.3; group.add(sensor)
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.5, .045, .35), new THREE.MeshStandardMaterial({ color: '#214e6f', metalness: .3, roughness: .4 }))
    panel.position.set(.22, .85, 0); panel.rotation.z = .3; group.add(panel)
    buoys.push(group)
    stage('monitoring', group, index * 1.1, 1)
    localCard('monitoring', spec.title, spec.detail, at.clone().add(new THREE.Vector3(0, 2.6, .3)), spec.color, index * 1.1 + .4)
  })

  function update(delta: number, moving: boolean) {
    if (moving) elapsed += Math.min(delta, .25)
    for (const { key, object, start, duration } of stages) {
      const progress = THREE.MathUtils.smoothstep(elapsed, start, start + duration)
      let amount = options.amount(key) * progress
      if (object.userData.intermittent) {
        const phase = Math.max(0, elapsed - start) % 13
        amount *= THREE.MathUtils.smoothstep(phase, 0, .8) * (1 - THREE.MathUtils.smoothstep(phase, 5.8, 7.5))
      }
      object.visible = active.has(key) && amount > .003
      object.traverse((node) => {
        const material = (node as THREE.Mesh).material
        if (!material) return
        for (const mat of Array.isArray(material) ? material : [material]) {
          if (mat instanceof THREE.ShaderMaterial) {
            mat.uniforms.uAlpha!.value = amount
            mat.uniforms.uReveal!.value = progress
            mat.uniforms.uTime!.value = Math.max(0, elapsed - start)
          } else { mat.transparent = true; mat.opacity = mat.userData.baseOpacity * amount }
        }
      })
    }
    for (const { key, scenario: state, season: groupSeason, group } of scenarioGroups) group.visible = state === scenario && active.has(key) && (!groupSeason || groupSeason === season)
    for (const key of keys) if (!active.has(key)) groups[key].visible = false
    for (const system of rains) {
      if (!system.group.visible || !system.group.parent?.visible) continue
      system.ripple.material.uniforms.uTime!.value = elapsed
      for (let i = 0; i < system.bottoms.length; i++) {
        const bottom = system.bottoms[i]!
        const phase = (elapsed * .7 + i * .618 + system.phase) % 1
        const y = bottom.y + (1 - phase) * system.height
        system.positions.setXYZ(i * 2, bottom.x, y, bottom.z)
        system.positions.setXYZ(i * 2 + 1, bottom.x - .025, Math.min(bottom.y + system.height, y + .34), bottom.z)
      }
      system.positions.needsUpdate = true
    }
    for (let i = 0; i < buoys.length; i++) buoys[i]!.rotation.z = Math.sin(elapsed * 1.3 + i) * .035
  }
  const projected = new THREE.Vector3(), inCamera = new THREE.Vector3()
  function layoutLabels(camera: THREE.PerspectiveCamera, width: number, height: number) {
    // Labels stay with the named place or process. There is deliberately no
    // screen-column packing, remote callout or cross-map connector geometry.
    for (const { key, sprite, anchor } of labels) {
      let visible = active.has(key)
      for (let parent: THREE.Object3D | null = sprite.parent; parent; parent = parent.parent) if (!parent.visible) visible = false
      sprite.position.copy(anchor)
      projected.copy(anchor).project(camera)
      inCamera.copy(anchor).applyMatrix4(camera.matrixWorldInverse)
      sprite.visible = visible && inCamera.z < 0 && projected.z >= -1 && projected.z <= 1
      if (!sprite.visible) continue
      const spec = sprite.userData.sceneLabel
      const pixelWidth = Math.min(spec.minPixels, Math.max(70, width * .23))
      const pixelScale = -inCamera.z * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(1, height)
      sprite.scale.set(pixelWidth * pixelScale, pixelWidth * spec.aspect * pixelScale, 1)
    }
  }
  return {
    regionalSignPositions: () => labels.filter(({ key }) => key === 'regionalImpacts').map(({ anchor }) => anchor.clone()),
    setLesson(step: LessonStep, complete: boolean) {
      active = new Set(step.effects)
      scenario = step.scenario
      season = step.id.endsWith('-summer') ? 'summer' : 'winter'
      elapsed = complete ? 12 : 0
      update(0, false)
    },
    update,
    layoutLabels,
  }
}
