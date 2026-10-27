import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { WeatherModel, WeatherState } from './types'

/** Units are metres. North is +Z and east is -X, matching the station compass. */
export function createWeatherInstruments(): WeatherModel {
  const group = new THREE.Group()
  group.name = 'weather-instruments'
  const resources: THREE.Texture[] = []
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()

  function material(parameters: THREE.MeshStandardMaterialParameters) {
    const result = new THREE.MeshStandardMaterial(parameters)
    materials.add(result)
    return result
  }
  function grainTexture(seed: number, brightness: number) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const data = ctx.createImageData(128, 128)
    let random = seed
    for (let i = 0; i < data.data.length; i += 4) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0
      const value = brightness + (random >>> 24) / 255 * 12
      data.data[i] = data.data[i + 1] = data.data[i + 2] = value
      data.data[i + 3] = 255
    }
    ctx.putImageData(data, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(3, 3)
    resources.push(texture)
    return texture
  }
  const paintGrain = grainTexture(17, 230)
  const metalGrain = grainTexture(93, 210)
  const paint = material({ color: '#eeeee6', roughness: 0.62, metalness: 0.025, bumpMap: paintGrain, bumpScale: 0.0003 })
  const innerPaint = material({ color: '#f8f8ef', roughness: 0.70 })
  const dark = material({ color: '#252d2c', roughness: 0.52, metalness: 0.5 })
  const steel = material({ color: '#a1aca9', metalness: 0.78, roughness: 0.32, bumpMap: metalGrain, bumpScale: 0.00012 })
  const dullSteel = material({ color: '#87948f', metalness: 0.65, roughness: 0.51, bumpMap: metalGrain, bumpScale: 0.00014 })
  const brass = material({ color: '#82775a', metalness: 0.75, roughness: 0.34 })
  const concrete = material({ color: '#a9a99b', roughness: 0.98, bumpMap: paintGrain, bumpScale: 0.004 })
  const glass = material({ color: '#dfeeea', metalness: 0.05, roughness: 0.13, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  const liquidRed = material({ color: '#a83b32', roughness: 0.34, metalness: 0.1 })
  const liquidBlue = material({ color: '#287c96', roughness: 0.28, metalness: 0.12 })
  const mercury = material({ color: '#515e61', roughness: 0.23, metalness: 0.86 })
  const water = material({ color: '#51a8b7', transparent: true, opacity: 0.62, metalness: 0.08, roughness: 0.18, depthWrite: false })
  const rubber = material({ color: '#212827', roughness: 0.90 })
  const vanePaint = material({ color: '#517f89', roughness: 0.39, metalness: 0.44 })

  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    geometries.add(geometry)
    const result = new THREE.Mesh(geometry, mat)
    result.position.set(x, y, z)
    result.castShadow = true
    result.receiveShadow = true
    parent.add(result)
    return result
  }
  function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, radius = 0) {
    return mesh(radius ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d), mat, parent, x, y, z)
  }
  function cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, mat: THREE.Material, segments = 24) {
    return mesh(new THREE.CylinderGeometry(radius, radius, height, segments), mat, parent, x, y, z)
  }
  function beam(parent: THREE.Object3D, start: THREE.Vector3, end: THREE.Vector3, radius: number, mat: THREE.Material, segments = 12) {
    const delta = end.clone().sub(start)
    const result = cylinder(parent, radius, delta.length(), 0, 0, 0, mat, segments)
    result.position.copy(start).add(end).multiplyScalar(0.5)
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize())
    return result
  }
  function bolt(parent: THREE.Object3D, x: number, y: number, z: number, axis: 'y' | 'z' = 'y', size = 0.009) {
    const washer = cylinder(parent, size * 1.5, size * 0.20, x, y, z, dullSteel, 16)
    const nut = cylinder(parent, size, size * 0.66, x, y + (axis === 'y' ? size * 0.35 : 0), z + (axis === 'z' ? size * 0.35 : 0), steel, 6)
    if (axis === 'z') { washer.rotation.x = Math.PI / 2; nut.rotation.x = Math.PI / 2 }
  }
  function texturePlane(parent: THREE.Object3D, canvas: HTMLCanvasElement, width: number, height: number, x: number, y: number, z: number) {
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 4
    resources.push(texture)
    const mat = material({ color: '#ffffff', map: texture, roughness: 0.75, metalness: 0 })
    const plane = mesh(new THREE.PlaneGeometry(width, height), mat, parent, x, y, z)
    plane.castShadow = false
    return { texture, plane }
  }
  function namePlate(parent: THREE.Object3D, text: string, width: number, height: number, x: number, y: number, z: number, sub = '') {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = Math.round(768 * height / width)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#eeeee5'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#bfc5bb'; ctx.lineWidth = 6; ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10)
    ctx.fillStyle = '#344541'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `600 ${Math.round(canvas.height * (sub ? .30 : .40))}px "Microsoft YaHei", sans-serif`
    ctx.fillText(text, canvas.width / 2, canvas.height * (sub ? .37 : .5))
    if (sub) { ctx.font = `${Math.round(canvas.height * .18)}px sans-serif`; ctx.fillStyle = '#66746a'; ctx.fillText(sub, canvas.width / 2, canvas.height * .74) }
    const holder = new THREE.Group(); holder.position.set(x, y, z); parent.add(holder)
    box(holder, width + .007, height + .006, .006, 0, 0, -.004, dullSteel, .002)
    return { ...texturePlane(holder, canvas, width, height, 0, 0, 0), group: holder }
  }

  // Stevenson screen: ventilated double louvers, two roof sheets and a true hinged door.
  const screen = new THREE.Group(); screen.position.set(-3, 0, 0); group.add(screen)
  const screenFloor = 1.205
  for (const x of [-.36, .36]) for (const z of [-.28, .28]) {
    box(screen, .15, .07, .15, x, .035, z, concrete, .009)
    box(screen, .062, screenFloor - .07, .062, x, (.07 + screenFloor) / 2, z, paint, .003)
    box(screen, .11, .008, .11, x, .076, z, steel, .002)
    bolt(screen, x + .037, .084, z + .037, 'y', .007)
    bolt(screen, x - .037, .084, z - .037, 'y', .007)
  }
  for (const z of [-.28, .28]) {
    box(screen, .78, .055, .055, 0, .38, z, paint, .003)
    beam(screen, new THREE.Vector3(-.36, .40, z), new THREE.Vector3(.36, .98, z), .018, paint)
  }
  for (const x of [-.36, .36]) box(screen, .055, .055, .59, x, .94, 0, paint, .003)
  box(screen, .87, .048, .81, 0, screenFloor, 0, paint, .004)
  // Alternating bottom boards leave ventilation slots, backed by an offset second layer.
  for (let k = 0; k < 5; k++) box(screen, .78, .019, .135, 0, 1.24 + (k % 2) * .012, -.28 + k * .14, innerPaint, .002)
  for (const x of [-.405, .405]) for (const z of [-.355, .355]) box(screen, .052, .85, .052, x, 1.675, z, paint, .003)
  for (const y of [1.28, 2.075]) {
    box(screen, .85, .045, .065, 0, y, -.355, paint, .002)
    for (const x of [-.405, .405]) box(screen, .045, .045, .75, x, y, 0, paint, .002)
  }
  const slatCount = 13
  const slatHeight = .064
  for (let k = 0; k < slatCount; k++) {
    const y = 1.31 + k * .0605
    const backOuter = box(screen, .76, .014, slatHeight, 0, y, -.383, paint, .001)
    backOuter.rotation.x = -Math.PI / 4
    const backInner = box(screen, .76, .012, slatHeight, 0, y, -.341, innerPaint, .001)
    backInner.rotation.x = Math.PI / 4
    for (const side of [-1, 1]) {
      const outside = box(screen, slatHeight, .014, .66, side * .427, y, 0, paint, .001)
      outside.rotation.z = side * Math.PI / 4
      const inside = box(screen, slatHeight, .012, .66, side * .383, y, 0, innerPaint, .001)
      inside.rotation.z = -side * Math.PI / 4
    }
  }
  box(screen, .94, .032, .89, 0, 2.108, 0, paint, .005)
  for (const x of [-.31, .31]) box(screen, .032, .035, .64, x, 2.14, 0, paint)
  const roof = box(screen, 1.02, .038, .97, 0, 2.178, 0, paint, .005)
  roof.rotation.x = -.025
  for (const x of [-.37, .37]) for (const z of [-.34, .34]) bolt(screen, x, 2.206 + z * .025, z, 'y', .006)

  const door = new THREE.Group(); door.position.set(-.405, 1.275, .397); screen.add(door)
  for (const x of [.027, .783]) box(door, .054, .79, .044, x, .394, 0, paint, .003)
  for (const y of [.022, .768]) box(door, .81, .044, .05, .405, y, 0, paint, .003)
  for (let k = 0; k < 12; k++) {
    const y = .063 + k * .06
    const outer = box(door, .70, .013, .063, .405, y, .014, paint, .001); outer.rotation.x = Math.PI / 4
    const inner = box(door, .70, .012, .063, .405, y, -.027, innerPaint, .001); inner.rotation.x = -Math.PI / 4
  }
  for (const y of [.12, .65]) {
    box(screen, .05, .08, .006, -.428, 1.275 + y, .403, steel, .002)
    box(door, .05, .08, .006, .035, y, .030, steel, .002)
    cylinder(screen, .009, .084, -.405, 1.275 + y, .414, steel, 16)
    bolt(door, .035, y - .024, .036, 'z', .004)
    bolt(door, .035, y + .024, .036, 'z', .004)
  }
  box(door, .042, .077, .005, .750, .39, .031, steel, .002)
  const doorHandle = beam(door, new THREE.Vector3(.752, .36, .059), new THREE.Vector3(.752, .416, .059), .009, dark)
  for (const y of [.36, .416]) beam(door, new THREE.Vector3(.752, y, .034), new THREE.Vector3(.752, y, .059), .006, steel)
  doorHandle.name = 'stevenson-screen-door-handle'
  const doorAction = new THREE.Object3D()
  doorAction.position.set(.752, .39, .085)
  door.add(doorAction)
  // A northern-facing label is fixed to the lower frame rather than floating in space.
  namePlate(screen, '百叶箱', .29, .065, 0, 1.173, .418, 'THERMOMETER SCREEN')

  // Internal instruments are supported by two rails. The dry/wet bulbs sit at 1.50 m.
  box(screen, .58, .025, .023, 0, 1.97, .005, dullSteel, .003)
  box(screen, .58, .025, .023, 0, 1.43, .005, dullSteel, .003)
  for (const x of [-.26, .26]) box(screen, .025, .56, .025, x, 1.70, -.022, steel, .002)
  type Thermometer = { liquid: THREE.Mesh; value: number; min: number; max: number; base: number; length: number; horizontal: boolean; texture: THREE.CanvasTexture; canvas: HTMLCanvasElement; name: string; color: THREE.Material }
  const thermometers: Thermometer[] = []
  function scaleCanvas(horizontal: boolean, label: string, value: number) {
    const canvas = document.createElement('canvas')
    canvas.width = horizontal ? 1536 : 384; canvas.height = horizontal ? 288 : 1536
    paintScale(canvas, horizontal, label, value)
    return canvas
  }
  function paintScale(canvas: HTMLCanvasElement, horizontal: boolean, label: string, value: number) {
    const ctx = canvas.getContext('2d')!
    const w = canvas.width; const h = canvas.height
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#f4f0df'; ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#aab3a9'; ctx.lineWidth = 4; ctx.strokeRect(3, 3, w - 6, h - 6)
    ctx.fillStyle = '#253c3d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    if (horizontal) {
      ctx.font = 'bold 48px "Microsoft YaHei", sans-serif'; ctx.fillText(label, w * .19, h * .18)
      ctx.font = '42px sans-serif'; ctx.fillText(`${value.toFixed(1)} °C`, w * .79, h * .18)
      for (let t = -10; t <= 50; t++) {
        const x = w * (.12 + (t + 10) / 60 * .77)
        ctx.lineWidth = t % 10 === 0 ? 4 : 2; ctx.beginPath(); ctx.moveTo(x, h * .63); ctx.lineTo(x, h * (t % 10 === 0 ? .35 : t % 5 === 0 ? .43 : .50)); ctx.strokeStyle = '#344747'; ctx.stroke()
        if (t % 10 === 0) { ctx.font = '34px sans-serif'; ctx.fillText(String(t), x, h * .80) }
      }
    } else {
      const scaleX = (fraction: number) => w * (label === '湿球' ? 1 - fraction : fraction)
      ctx.font = 'bold 50px "Microsoft YaHei", sans-serif'; ctx.fillText(label, w / 2, h * .060)
      ctx.font = '50px sans-serif'; ctx.fillText('°C', scaleX(.70), h * .115)
      for (let t = -10; t <= 50; t++) {
        const y = h * (.83 - (t + 10) / 60 * .66)
        ctx.lineWidth = t % 10 === 0 ? 4 : 2; ctx.beginPath(); ctx.moveTo(scaleX(.43), y); ctx.lineTo(scaleX(t % 10 === 0 ? .65 : t % 5 === 0 ? .58 : .52), y); ctx.strokeStyle = '#344747'; ctx.stroke()
        if (t % 10 === 0) { ctx.font = '39px sans-serif'; ctx.fillText(String(t), scaleX(.80), y) }
      }
      ctx.font = 'bold 49px sans-serif'; ctx.fillText(value.toFixed(1), w / 2, h * .94)
    }
  }
  function thermometer(x: number, y: number, label: string, horizontal: boolean, color: THREE.Material, capillarySide = -1) {
    const w = horizontal ? .59 : .116; const h = horizontal ? .087 : .52
    const z = horizontal ? .15 : .105
    box(screen, w + .012, h + .012, .017, x, y, z - .009, innerPaint, .003)
    const canvas = scaleCanvas(horizontal, label, 0)
    const { texture } = texturePlane(screen, canvas, w, h, x, y, z + .001)
    const base = horizontal ? x - w / 2 + w * .12 : y - h / 2 + h * .17
    const length = horizontal ? w * .77 : h * .66
    const lineX = horizontal ? x : x + capillarySide * w * .18
    const lineY = horizontal ? y - h * .13 : y
    const trackStart = horizontal ? new THREE.Vector3(base - .035, lineY, z + .010) : new THREE.Vector3(lineX, 1.50, z + .010)
    const trackEnd = horizontal ? new THREE.Vector3(base + length, lineY, z + .010) : new THREE.Vector3(lineX, base + length + .012, z + .010)
    beam(screen, trackStart, trackEnd, horizontal ? .005 : .0065, glass, 12)
    const scaleStart = horizontal ? new THREE.Vector3(base, lineY, z + .010) : new THREE.Vector3(lineX, base, z + .010)
    beam(screen, trackStart, scaleStart, horizontal ? .0021 : .0028, color, 10)
    // Solid liquid is visible within the narrow glass capillary, not painted on top of the scale.
    const liquid = cylinder(screen, horizontal ? .0021 : .0028, 1, 0, 0, 0, color, 10)
    if (horizontal) liquid.rotation.z = -Math.PI / 2
    const bulb = mesh(new THREE.SphereGeometry(horizontal ? .009 : .012, 16, 10), color, screen, trackStart.x, trackStart.y, trackStart.z)
    bulb.scale.set(horizontal ? 1.45 : .74, horizontal ? .75 : 1.38, .74)
    for (const clipY of (horizontal ? [y] : [y - .19, y + .18])) {
      if (horizontal) for (const clipX of [x - .26, x + .26]) box(screen, .016, .043, .007, clipX, clipY - .006, z + .015, steel, .002)
      else { box(screen, .028, .015, .008, lineX, clipY, z + .016, steel, .002); bolt(screen, x - capillarySide * .045, clipY, z + .007, 'z', .003) }
    }
    const item: Thermometer = { liquid, value: NaN, min: -10, max: 50, base, length, horizontal, texture, canvas, name: label, color }
    liquid.userData.fixedX = lineX; liquid.userData.fixedY = lineY; liquid.userData.fixedZ = z + .010
    thermometers.push(item)
    return item
  }
  const dry = thermometer(-.23, 1.76, '干球', false, liquidRed)
  const wet = thermometer(.23, 1.76, '湿球', false, liquidBlue, 1)
  const highest = thermometer(0, 1.405, '最高', true, mercury)
  const lowest = thermometer(0, 1.295, '最低', true, liquidBlue)
  // The minimum thermometer keeps a small index in the alcohol column. Its end
  // farther from the bulb records the minimum even as the liquid warms again.
  const minimumIndex = box(screen, .013, .0048, .005, 0, lowest.liquid.userData.fixedY, lowest.liquid.userData.fixedZ + .003, dark, .001)
  // Wet-bulb wick and a supported distilled-water reservoir.
  cylinder(screen, .022, .07, .251, 1.437, .114, glass, 24)
  cylinder(screen, .018, .039, .251, 1.422, .114, water, 24)
  cylinder(screen, .005, .066, .251, 1.478, .114, innerPaint, 12)
  box(screen, .054, .008, .06, .251, 1.399, .108, steel)
  beam(screen, new THREE.Vector3(.251, 1.399, .08), new THREE.Vector3(.251, 1.434, -.02), .005, steel)

  // Manual rain gauge. Its circular collecting aperture is 200 mm across.
  const rain = new THREE.Group(); rain.position.set(0, 0, -2); group.add(rain)
  box(rain, .46, .07, .46, 0, .035, 0, concrete, .014)
  // Every leg top fits inside the circular tray, including its outer corners.
  // Slight intersections seat the tray, footplates and washers without light leaks.
  for (const x of [-.07, .07]) for (const z of [-.07, .07]) {
    box(rain, .023, .174, .023, x, .157, z, dark, .002)
    box(rain, .055, .009, .055, x, .0735, z, steel, .002)
    bolt(rain, x + Math.sign(x) * .0185, .0784, z + Math.sign(z) * .0185, 'y', .005)
  }
  cylinder(rain, .117, .014, 0, .24, 0, dullSteel)
  const outer = mesh(new THREE.CylinderGeometry(.106, .106, .444, 64, 1, true), dullSteel, rain, 0, .468, 0)
  const cutOuter = mesh(new THREE.CylinderGeometry(.106, .106, .444, 64, 1, true, Math.PI / 2, Math.PI), dullSteel, rain, 0, .468, 0)
  cutOuter.visible = false
  const shellInner = material({ color: '#b9c2b9', metalness: .58, roughness: .48, side: THREE.BackSide })
  const innerOuter = mesh(new THREE.CylinderGeometry(.104, .104, .444, 64, 1, true), shellInner, rain, 0, .468, 0)
  const cutInner = mesh(new THREE.CylinderGeometry(.104, .104, .444, 64, 1, true, Math.PI / 2, Math.PI), shellInner, rain, 0, .468, 0)
  cutInner.visible = false
  const rimShape = [new THREE.Vector2(.100, .686), new THREE.Vector2(.100, .701), new THREE.Vector2(.106, .701), new THREE.Vector2(.108, .695), new THREE.Vector2(.108, .684)]
  const rim = mesh(new THREE.LatheGeometry(rimShape, 64), steel, rain)
  const funnelProfile = [new THREE.Vector2(.022, .524), new THREE.Vector2(.022, .551), new THREE.Vector2(.098, .682), new THREE.Vector2(.100, .686)]
  const funnelMaterial = material({ color: '#bac4be', metalness: .68, roughness: .32, side: THREE.DoubleSide })
  const funnel = mesh(new THREE.LatheGeometry(funnelProfile, 64), funnelMaterial, rain)
  const cutFunnel = mesh(new THREE.LatheGeometry(funnelProfile, 64, Math.PI / 2, Math.PI), funnelMaterial, rain)
  cutFunnel.visible = false
  for (const side of [-1, 1]) {
    const handle = new THREE.Group(); handle.position.set(side * .111, .52, 0); rain.add(handle)
    beam(handle, new THREE.Vector3(0, -.035, -.022), new THREE.Vector3(side * .022, -.035, -.022), .004, steel)
    beam(handle, new THREE.Vector3(side * .022, -.035, -.022), new THREE.Vector3(side * .022, .035, -.022), .004, steel)
    beam(handle, new THREE.Vector3(side * .022, .035, -.022), new THREE.Vector3(0, .035, -.022), .004, steel)
  }
  const rainLabel = namePlate(rain, '雨量器', .104, .043, 0, .40, .108, '口径 200 mm')
  const bottle = new THREE.Group(); rain.add(bottle)
  const bottleProfile = [new THREE.Vector2(0, .246), new THREE.Vector2(.058, .246), new THREE.Vector2(.065, .26), new THREE.Vector2(.065, .455), new THREE.Vector2(.060, .47), new THREE.Vector2(.024, .493), new THREE.Vector2(.024, .532)]
  mesh(new THREE.LatheGeometry(bottleProfile, 48), glass, bottle)
  const bottleWater = cylinder(bottle, .0615, 1, 0, .26, 0, water, 48)
  const bottleWaterTop = cylinder(bottle, .0618, .0015, 0, .26, 0, water, 48)
  const measure = new THREE.Group(); measure.position.set(.29, .07, .10); rain.add(measure); measure.visible = false
  box(measure, .17, .07, .18, 0, -.035, 0, concrete, .009)
  cylinder(measure, .055, .008, 0, .004, 0, glass, 32)
  const measureProfile = [new THREE.Vector2(0, .007), new THREE.Vector2(.031, .007), new THREE.Vector2(.033, .014), new THREE.Vector2(.033, .366), new THREE.Vector2(.037, .373), new THREE.Vector2(.032, .375), new THREE.Vector2(.030, .365), new THREE.Vector2(.030, .015)]
  mesh(new THREE.LatheGeometry(measureProfile, 48), glass, measure)
  const cupWater = cylinder(measure, .0297, 1, 0, .015, 0, water, 48)
  const cupWaterTop = cylinder(measure, .0298, .001, 0, .015, 0, water, 48)
  // Area ratio = (100 mm / 30 mm)^2. A 30 mm rain collection rises 333.3 mm in this cup.
  const collectorRadius = .1
  const cupRadius = .03
  const rainWaterHeight = (mm: number) => mm * .001 * (collectorRadius / cupRadius) ** 2
  const cupScaleCanvas = document.createElement('canvas'); cupScaleCanvas.width = 256; cupScaleCanvas.height = 1792
  const cupCtx = cupScaleCanvas.getContext('2d')!
  cupCtx.clearRect(0, 0, 256, 1792)
  cupCtx.fillStyle = '#283d3d'; cupCtx.textAlign = 'right'; cupCtx.textBaseline = 'middle'
  for (let tick = 0; tick <= 150; tick++) {
    const mm = tick / 5
    const isMajor = tick % 25 === 0
    const isMillimetre = tick % 5 === 0
    const y = 1720 - mm / 30 * 1580
    cupCtx.strokeStyle = '#203839'; cupCtx.lineWidth = isMajor ? 5 : isMillimetre ? 3 : 1.7
    cupCtx.beginPath(); cupCtx.moveTo(isMajor ? 103 : isMillimetre ? 149 : 190, y); cupCtx.lineTo(240, y); cupCtx.stroke()
    if (isMajor) { cupCtx.font = 'bold 47px sans-serif'; cupCtx.fillText(String(mm), 94, y) }
  }
  cupCtx.font = 'bold 44px sans-serif'; cupCtx.fillText('mm', 202, 59)
  const scaleTexture = new THREE.CanvasTexture(cupScaleCanvas); scaleTexture.colorSpace = THREE.SRGBColorSpace; resources.push(scaleTexture)
  const scaleMaterial = material({ map: scaleTexture, transparent: true, depthWrite: false, roughness: .8, side: THREE.DoubleSide })
  const scaleHeight = rainWaterHeight(30) / (1580 / 1792)
  const scaleBase = .015 - scaleHeight * (72 / 1792)
  const scalePlane = mesh(new THREE.PlaneGeometry(.048, scaleHeight), scaleMaterial, measure, 0, scaleBase + scaleHeight / 2, .0332)
  scalePlane.castShadow = false
  const measuringPlate = namePlate(rain, '配套量杯', .20, .05, .29, .052, .193, '降水量 / mm')
  measuringPlate.group.visible = false
  const rainAction = new THREE.Object3D()
  rain.add(rainAction)

  // Wind observation: a ten-metre mast with foot flange, inspection box and guy wires.
  const wind = new THREE.Group(); wind.position.set(3, 0, 2); group.add(wind)
  box(wind, .55, .09, .55, 0, .045, 0, concrete, .012)
  cylinder(wind, .19, .025, 0, .102, 0, dullSteel, 32)
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + k * Math.PI / 2
    bolt(wind, Math.cos(a) * .135, .125, Math.sin(a) * .135, 'y', .014)
  }
  cylinder(wind, .063, 4.9, 0, 2.565, 0, dullSteel, 32)
  cylinder(wind, .052, 4.59, 0, 7.31, 0, steel, 32)
  for (const y of [2.5, 5.0, 7.5, 9.5]) {
    cylinder(wind, .071, .05, 0, y, 0, dullSteel, 32)
    bolt(wind, 0, y, .072, 'z', .007)
  }
  box(wind, .16, .27, .09, 0, .95, .095, paint, .012)
  box(wind, .135, .235, .009, 0, .95, .144, dullSteel, .005)
  for (const x of [-.052, .052]) for (const y of [.855, 1.045]) bolt(wind, x, y, .151, 'z', .004)
  cylinder(wind, .008, 8.7, .065, 5.0, 0, rubber, 8)
  for (let k = 0; k < 3; k++) {
    const angle = Math.PI / 6 + k * Math.PI * 2 / 3
    const x = Math.sin(angle) * 1.25; const z = Math.cos(angle) * 1.25
    box(wind, .12, .06, .12, x, .03, z, concrete, .006)
    cylinder(wind, .014, .10, x, .085, z, steel, 8)
    beam(wind, new THREE.Vector3(.03 * Math.sin(angle), 6.4, .03 * Math.cos(angle)), new THREE.Vector3(x, .13, z), .0035, steel, 6)
    const low = new THREE.Vector3(x, .13, z); const high = new THREE.Vector3(.03 * Math.sin(angle), 6.4, .03 * Math.cos(angle))
    const connector = low.clone().lerp(high, .04)
    beam(wind, connector, low.clone().lerp(high, .075), .009, dullSteel, 8)
  }
  beam(wind, new THREE.Vector3(-.66, 9.61, 0), new THREE.Vector3(.66, 9.61, 0), .025, steel, 20)
  for (const x of [-.66, .66]) cylinder(wind, .022, .35, x, 9.775, 0, steel, 20)
  cylinder(wind, .044, .17, -.66, 9.95, 0, paint, 24)
  cylinder(wind, .050, .07, -.66, 10.005, 0, dark, 24)
  cylinder(wind, .055, .15, .66, 9.96, 0, dark, 24)
  cylinder(wind, .027, .10, .66, 10.065, 0, steel, 20)

  const vane = new THREE.Group(); vane.position.set(-.66, 10.05, 0); wind.add(vane)
  beam(vane, new THREE.Vector3(0, 0, -.44), new THREE.Vector3(0, 0, .44), .011, steel, 16)
  cylinder(vane, .025, .063, 0, .001, 0, steel, 20)
  // The slim pointer faces the incoming air; the broad tail extends downwind.
  const pointer = new THREE.Shape()
  pointer.moveTo(-.065, .285); pointer.lineTo(0, .495); pointer.lineTo(.065, .285); pointer.lineTo(.015, .31); pointer.lineTo(-.015, .31); pointer.closePath()
  const pointerMesh = mesh(new THREE.ExtrudeGeometry(pointer, { depth: .006, bevelEnabled: false }), vanePaint, vane)
  pointerMesh.rotation.x = Math.PI / 2; pointerMesh.position.y = .005
  const tail = new THREE.Shape()
  tail.moveTo(-.42, -.12); tail.lineTo(-.16, -.085); tail.lineTo(-.16, .085); tail.lineTo(-.42, .16); tail.closePath()
  const tailMesh = mesh(new THREE.ExtrudeGeometry(tail, { depth: .007, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .002, bevelThickness: .001 }), vanePaint, vane)
  // Shape x becomes world z, so the broad panel stays vertical along the vane's tail.
  tailMesh.rotation.y = -Math.PI / 2; tailMesh.position.x = -.004
  for (const z of [-.34, -.21]) bolt(vane, .006, 0, z, 'z', .004)
  const rotor = new THREE.Group(); rotor.position.set(.66, 10.12, 0); wind.add(rotor)
  cylinder(rotor, .033, .05, 0, 0, 0, dark, 24)
  mesh(new THREE.SphereGeometry(.034, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark, rotor, 0, .025, 0)
  for (let k = 0; k < 3; k++) {
    const angle = k * Math.PI * 2 / 3
    const x = Math.cos(angle) * .23; const z = Math.sin(angle) * .23
    beam(rotor, new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, 0, z), .006, steel, 12)
    // Upper hemisphere has an open -Y normal. Rotate it so every bowl opens in the
    // same tangential sense; opposite cup orientations would cancel the torque.
    const cup = new THREE.Group(); cup.position.set(x, 0, z); rotor.add(cup)
    const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle))
    cup.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), tangent)
    const outerCup = mesh(new THREE.SphereGeometry(.071, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark, cup)
    outerCup.material = dark
    const innerCupMaterial = material({ color: '#4e5c58', metalness: .45, roughness: .43, side: THREE.BackSide })
    mesh(new THREE.SphereGeometry(.066, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), innerCupMaterial, cup, 0, .001, 0)
    const lip = mesh(new THREE.TorusGeometry(.0685, .0025, 6, 32), steel, cup)
    lip.rotation.x = Math.PI / 2
  }
  namePlate(wind, '风向 · 风速', .23, .08, 0, 1.25, .067, 'WIND OBSERVATION')

  for (const [id, object] of [['screen', screen], ['rain', rain], ['wind', wind]] as const) {
    object.userData.instrumentId = id
    object.traverse(child => { if (child instanceof THREE.Mesh) child.userData.instrumentId = id })
  }
  let doorAngle = 0
  let vaneAngle = 0
  function setThermometer(item: Thermometer, value: number, columnValue = value) {
    const clamped = THREE.MathUtils.clamp(columnValue, item.min, item.max)
    const fill = Math.max(.00001, (clamped - item.min) / (item.max - item.min) * item.length)
    item.liquid.scale.y = fill
    if (item.horizontal) item.liquid.position.set(item.base + fill / 2, item.liquid.userData.fixedY, item.liquid.userData.fixedZ)
    else item.liquid.position.set(item.liquid.userData.fixedX, item.base + fill / 2, item.liquid.userData.fixedZ)
    if (Math.abs(value - item.value) > .049 || !Number.isFinite(item.value)) {
      item.value = value
      paintScale(item.canvas, item.horizontal, item.name, value)
      item.texture.needsUpdate = true
    }
  }
  function setWater(meshWater: THREE.Mesh, surface: THREE.Mesh, height: number, bottom: number) {
    meshWater.visible = surface.visible = height > .00001
    meshWater.scale.y = Math.max(.00001, height)
    meshWater.position.y = bottom + height / 2
    surface.position.y = bottom + height
  }
  function update(state: WeatherState, delta: number, _elapsed: number) {
    const dt = Math.min(delta, .1)
    doorAngle = THREE.MathUtils.damp(doorAngle, state.screenOpen ? -Math.PI * .62 : 0, 5.5, dt)
    door.rotation.y = doorAngle
    setThermometer(dry, state.temperature)
    // This demonstration uses a fixed wet-bulb depression; no humidity inference is made.
    setThermometer(wet, state.temperature - 3)
    setThermometer(highest, state.maximum)
    setThermometer(lowest, state.minimum, state.temperature)
    minimumIndex.position.x = lowest.base + (THREE.MathUtils.clamp(state.minimum, -10, 50) + 10) / 60 * lowest.length - .0065
    outer.visible = innerOuter.visible = funnel.visible = !state.rainCutaway
    cutOuter.visible = cutInner.visible = cutFunnel.visible = state.rainCutaway
    rainLabel.group.visible = !state.rainCutaway
    measure.visible = state.rainCutaway
    // Keep the hand beside the exposed cup, clear of its graduated front face.
    rainAction.position.set(state.rainCutaway ? .45 : .14, state.rainCutaway ? .30 : .52, .10)
    measuringPlate.group.visible = state.rainCutaway
    rim.visible = true
    bottle.visible = state.rainCutaway
    // During the reading demonstration the bottle is emptied into its calibrated cup.
    setWater(bottleWater, bottleWaterTop, state.rainCutaway ? 0 : Math.max(0, state.rainfall) * .001 * (collectorRadius / .0615) ** 2, .26)
    setWater(cupWater, cupWaterTop, rainWaterHeight(THREE.MathUtils.clamp(state.rainfall, 0, 30)), .015)
    const desiredAngle = -THREE.MathUtils.degToRad(state.windDirection)
    const difference = Math.atan2(Math.sin(desiredAngle - vaneAngle), Math.cos(desiredAngle - vaneAngle))
    if (state.windSpeed > .2) vaneAngle += difference * (1 - Math.exp(-dt * 4.5))
    vane.rotation.y = vaneAngle
    // Rotation is a visual response to wind speed, not an instrument calibration curve.
    rotor.rotation.y += dt * (state.windSpeed > .2 ? state.windSpeed : 0) * 1.8
  }
  update({ temperature: 23.6, maximum: 26.8, minimum: 17.4, rainfall: 12.4, windDirection: 135, windSpeed: 4.2, screenOpen: false, rainCutaway: false, raining: false }, 0, 0)

  return {
    group,
    anchors: { screen: new THREE.Vector3(-3, 2.18, 0), rain: new THREE.Vector3(0, .72, -2), wind: new THREE.Vector3(3, 10.16, 2) },
    actionAnchors: { 'screen-door': doorAction, 'rain-cup': rainAction },
    update,
    dispose() {
      for (const geometry of geometries) geometry.dispose()
      for (const mat of materials) mat.dispose()
      for (const texture of resources) texture.dispose()
      group.clear()
    },
  }
}
