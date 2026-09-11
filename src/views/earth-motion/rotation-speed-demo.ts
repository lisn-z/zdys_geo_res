import * as THREE from 'three'

export const ROTATION_CUTAWAY_HALF_ANGLE = THREE.MathUtils.degToRad(32)

// 中学地理的近似模型：一昼夜 24 小时、赤道线速度约 1670 km/h。
// 这里表示地球本身的运动，与场景的播放倍率无关。
export function rotationSpeedAtLatitude(latitude: number) {
  const safeLatitude = THREE.MathUtils.clamp(Number.isFinite(latitude) ? latitude : 0, -90, 90)
  const cosine = Math.cos(THREE.MathUtils.degToRad(safeLatitude))
  const isPole = Math.abs(safeLatitude) === 90
  return {
    // 教学约定：极点不绕地轴画圆，点的角速度标为 0；并非地球整体停止自转。
    angularDegPerHour: isPole ? 0 : 15,
    linearKmPerHour: isPole ? 0 : 1670 * cosine,
  }
}

type SpeedAnnotation = {
  sprite: THREE.Sprite
  anchor: THREE.Vector3
  screenHeight: number
  connector: THREE.BufferAttribute
}

/**
 * 纬度与自转速度对比示意。挂在地轴倾斜组下，不跟随地表自转。
 * 扇区统一表示 4 小时转过 60°；相同角位移对应的弧长随纬度改变。
 * 地球表面由调用方沿 cutawayDirection 剖去前方 ±32°，此处补齐真实切面和纬线截面。
 */
export function createRotationSpeedDemo(radius: number) {
  const group = new THREE.Group()
  group.name = 'rotation-speed-demo'
  const slices = new THREE.Group()
  slices.name = 'camera-facing-latitude-sectors'
  group.add(slices)

  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  const textures: THREE.Texture[] = []
  const annotations: SpeedAnnotation[] = []
  const view = new THREE.Vector3(0, 0, 1)
  const cutawayDirection = new THREE.Vector3(0, 0, 1)
  const right = new THREE.Vector3(1, 0, 0)
  const up = new THREE.Vector3(0, 1, 0)
  const worldAnchor = new THREE.Vector3()
  const connectorEnd = new THREE.Vector3()
  const labelWidth = radius * 1.04
  const labelHeight = radius * 0.29
  let disposed = false

  function geometry<T extends THREE.BufferGeometry>(value: T): T {
    geometries.push(value)
    return value
  }

  function material<T extends THREE.Material>(value: T): T {
    materials.push(value)
    return value
  }

  const discMaterial = material(new THREE.MeshBasicMaterial({
    color: '#56b6d9', transparent: true, opacity: 0.24,
    side: THREE.DoubleSide, depthTest: true, depthWrite: false, toneMapped: false,
  }))
  const sectorMaterial = material(new THREE.MeshBasicMaterial({
    color: '#ffc943', transparent: true, opacity: 0.88,
    side: THREE.DoubleSide, depthTest: true, depthWrite: false, toneMapped: false,
  }))
  const arcMaterial = material(new THREE.MeshBasicMaterial({
    color: '#ff6e82', transparent: true, opacity: 0.98,
    side: THREE.DoubleSide, depthTest: true, depthWrite: false, toneMapped: false,
  }))
  const rimMaterial = material(new THREE.LineBasicMaterial({
    color: '#85d0e6', transparent: true, opacity: 0.47,
    depthTest: true, depthWrite: false, toneMapped: false,
  }))
  const spokeMaterial = material(new THREE.LineBasicMaterial({
    color: '#ffe598', transparent: true, opacity: 0.63,
    depthTest: true, depthWrite: false, toneMapped: false,
  }))
  const connectorMaterial = material(new THREE.LineBasicMaterial({
    color: '#a9c9db', transparent: true, opacity: 0.5,
    depthTest: false, depthWrite: false, toneMapped: false,
  }))
  const markerMaterial = material(new THREE.MeshBasicMaterial({
    color: '#ffe19c', depthTest: true, depthWrite: false, toneMapped: false,
  }))
  const markerGeometry = geometry(new THREE.SphereGeometry(radius * 0.014, 10, 8))
  const cutFaceMaterial = material(new THREE.MeshBasicMaterial({
    vertexColors: true, side: THREE.DoubleSide,
    depthTest: true, depthWrite: true, toneMapped: false,
  }))

  // 两个径向半圆封住剖切后的球体，不让背面的地表或纬线透过剖面。
  for (const azimuth of [-ROTATION_CUTAWAY_HALF_ANGLE, ROTATION_CUTAWAY_HALF_ANGLE]) {
    const positions: number[] = []
    const colors: number[] = []
    const centerColor = new THREE.Color('#102333')
    const outerColor = new THREE.Color(azimuth < 0 ? '#274458' : '#213949')
    const segments = 96
    for (let index = 0; index < segments; index += 1) {
      const first = -Math.PI / 2 + Math.PI * index / segments
      const second = -Math.PI / 2 + Math.PI * (index + 1) / segments
      positions.push(
        0, 0, 0,
        Math.sin(azimuth) * Math.cos(first) * radius, Math.sin(first) * radius, Math.cos(azimuth) * Math.cos(first) * radius,
        Math.sin(azimuth) * Math.cos(second) * radius, Math.sin(second) * radius, Math.cos(azimuth) * Math.cos(second) * radius,
      )
      colors.push(centerColor.r, centerColor.g, centerColor.b, outerColor.r, outerColor.g, outerColor.b, outerColor.r, outerColor.g, outerColor.b)
    }
    const faceGeometry = geometry(new THREE.BufferGeometry()
      .setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      .setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)))
    const face = new THREE.Mesh(faceGeometry, cutFaceMaterial)
    face.name = azimuth < 0 ? 'rotation-cut-face-left' : 'rotation-cut-face-right'
    face.renderOrder = 107
    slices.add(face)
  }

  // 使用真实的纬线半径，所有截面都在同一自转轴上。
  const sectorStart = -Math.PI / 6
  const sectorEnd = Math.PI / 6

  function createSector(r: number, y: number, start: number, end: number) {
    const positions: number[] = []
    const segments = Math.max(20, Math.ceil((end - start) * 36))
    for (let index = 0; index < segments; index += 1) {
      const a = start + (end - start) * index / segments
      const b = start + (end - start) * (index + 1) / segments
      positions.push(0, y, 0, Math.sin(a) * r, y, Math.cos(a) * r, Math.sin(b) * r, y, Math.cos(b) * r)
    }
    return geometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)))
  }

  function createRibbon(r: number, y: number) {
    const positions: number[] = []
    const segments = 48
    const inner = r - radius * 0.020
    const outer = r - radius * 0.003
    for (let index = 0; index < segments; index += 1) {
      const a = sectorStart + (sectorEnd - sectorStart) * index / segments
      const b = sectorStart + (sectorEnd - sectorStart) * (index + 1) / segments
      positions.push(
        Math.sin(a) * inner, y, Math.cos(a) * inner,
        Math.sin(a) * outer, y, Math.cos(a) * outer,
        Math.sin(b) * outer, y, Math.cos(b) * outer,
        Math.sin(a) * inner, y, Math.cos(a) * inner,
        Math.sin(b) * outer, y, Math.cos(b) * outer,
        Math.sin(b) * inner, y, Math.cos(b) * inner,
      )
    }
    // 箭头尖端止于 60° 弧尾，尾翼向后收进扇形，避免穿过缩小后的剖切边界。
    const headRadius = r - radius * 0.020
    const endX = Math.sin(sectorEnd) * headRadius
    const endZ = Math.cos(sectorEnd) * headRadius
    const tangentX = Math.cos(sectorEnd)
    const tangentZ = -Math.sin(sectorEnd)
    const radialX = Math.sin(sectorEnd)
    const radialZ = Math.cos(sectorEnd)
    const head = radius * 0.035
    positions.push(
      endX, y, endZ,
      endX - tangentX * head + radialX * head * 0.42, y, endZ - tangentZ * head + radialZ * head * 0.42,
      endX - tangentX * head - radialX * head * 0.42, y, endZ - tangentZ * head - radialZ * head * 0.42,
    )
    return geometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)))
  }

  function createAnnotation(latitude: number, anchor: THREE.Vector3, screenHeight: number) {
    const speed = rotationSpeedAtLatitude(latitude)
    const pole = Math.abs(latitude) === 90
    const title = latitude === 0 ? '赤道  0°'
      : pole ? `${latitude > 0 ? '北极' : '南极'}  90°${latitude > 0 ? 'N' : 'S'}`
        : `${latitude > 0 ? '北纬' : '南纬'} ${Math.abs(latitude)}°`
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 132
    const context = canvas.getContext('2d')
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height)
      // 文字描边保障地球和星空上的可读性，不再以大块标签底板遮住场景。
      context.strokeStyle = 'rgba(0, 5, 12, 0.88)'
      context.lineWidth = 5
      context.lineJoin = 'round'
      context.shadowColor = 'rgba(0, 5, 12, 0.75)'
      context.shadowBlur = 5
      context.fillStyle = latitude === 0 ? '#ffdb80' : '#d4eaf5'
      context.font = '600 33px "Microsoft YaHei", sans-serif'
      context.textBaseline = 'middle'
      context.strokeText(title, 12, 28)
      context.fillText(title, 12, 28)
      context.font = '500 31px "Microsoft YaHei", sans-serif'
      context.fillStyle = '#ffdd7d'
      const angularText = pole ? '位于地轴上' : `自转角速度  ≈ ${speed.angularDegPerHour}°/h`
      context.strokeText(angularText, 12, 66)
      context.fillText(angularText, 12, 66)
      context.fillStyle = '#ffacb9'
      const linearText = `自转线速度  ${pole ? '' : '≈ '}${Math.round(speed.linearKmPerHour)} km/h`
      context.strokeText(linearText, 12, 104)
      context.fillText(linearText, 12, 104)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    textures.push(texture)
    const sprite = new THREE.Sprite(material(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    })))
    sprite.name = `rotation-speed-label-${latitude}`
    sprite.scale.set(labelWidth, labelHeight, 1)
    sprite.renderOrder = 114
    group.add(sprite)

    const connector = new THREE.BufferAttribute(new Float32Array(6), 3).setUsage(THREE.DynamicDrawUsage)
    const connectorGeometry = geometry(new THREE.BufferGeometry().setAttribute('position', connector))
    const line = new THREE.Line(connectorGeometry, connectorMaterial)
    line.frustumCulled = false
    line.renderOrder = 113
    group.add(line)
    annotations.push({ sprite, anchor, screenHeight, connector })
  }

  for (const latitude of [60, 30, 0, -30, -60]) {
    const angle = THREE.MathUtils.degToRad(latitude)
    const y = Math.sin(angle) * radius
    const r = Math.cos(angle) * radius * 0.999
    const disc = new THREE.Mesh(createSector(r, y, -ROTATION_CUTAWAY_HALF_ANGLE, ROTATION_CUTAWAY_HALF_ANGLE), discMaterial)
    disc.renderOrder = 108
    slices.add(disc)
    const sector = new THREE.Mesh(createSector(r, y, sectorStart, sectorEnd), sectorMaterial)
    sector.renderOrder = 109
    slices.add(sector)
    const arc = new THREE.Mesh(createRibbon(r, y), arcMaterial)
    arc.renderOrder = 111
    slices.add(arc)

    const rimPositions: number[] = []
    for (let index = 0; index <= 96; index += 1) {
      const phi = -ROTATION_CUTAWAY_HALF_ANGLE + 2 * ROTATION_CUTAWAY_HALF_ANGLE * index / 96
      rimPositions.push(Math.sin(phi) * r, y, Math.cos(phi) * r)
    }
    const rim = new THREE.Line(geometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rimPositions, 3))), rimMaterial)
    rim.renderOrder = 110
    slices.add(rim)
    const spokePositions = [
      Math.sin(sectorStart) * r, y, Math.cos(sectorStart) * r,
      0, y, 0,
      Math.sin(sectorEnd) * r, y, Math.cos(sectorEnd) * r,
    ]
    const spoke = new THREE.Line(geometry(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(spokePositions, 3))), spokeMaterial)
    spoke.renderOrder = 110
    slices.add(spoke)
    const anchor = new THREE.Vector3(Math.sin(sectorEnd) * r, y, Math.cos(sectorEnd) * r)
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.copy(anchor)
    marker.renderOrder = 112
    slices.add(marker)
    createAnnotation(latitude, anchor, latitude / 30 * 0.34)
  }

  const axis = new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -radius * 1.14, 0),
    new THREE.Vector3(0, radius * 1.14, 0),
  ])), rimMaterial)
  axis.renderOrder = 110
  slices.add(axis)
  for (const latitude of [90, -90]) {
    const anchor = new THREE.Vector3(0, Math.sign(latitude) * radius, 0)
    const marker = new THREE.Mesh(markerGeometry, markerMaterial)
    marker.position.copy(anchor)
    marker.renderOrder = 112
    slices.add(marker)
    createAnnotation(latitude, anchor, latitude / 30 * 0.34)
  }

  function updateLabels(
    viewDirectionLocal: THREE.Vector3,
    screenRightLocal?: THREE.Vector3,
    screenUpLocal?: THREE.Vector3,
    viewportHeight?: number,
    verticalFovDeg = 45,
  ) {
    if (disposed || !Number.isFinite(viewDirectionLocal.lengthSq()) || viewDirectionLocal.lengthSq() < 1e-12) return
    view.copy(viewDirectionLocal).normalize()
    const horizontalLength = Math.hypot(view.x, view.z)
    if (screenRightLocal && Number.isFinite(screenRightLocal.lengthSq()) && screenRightLocal.lengthSq() > 1e-12) {
      right.copy(screenRightLocal).normalize()
    } else if (horizontalLength > 1e-5) {
      right.set(view.z / horizontalLength, 0, -view.x / horizontalLength)
    } else {
      right.set(cutawayDirection.z, 0, -cutawayDirection.x)
    }
    if (screenUpLocal && Number.isFinite(screenUpLocal.lengthSq()) && screenUpLocal.lengthSq() > 1e-12) {
      up.copy(screenUpLocal).normalize()
    } else {
      up.crossVectors(view, right).normalize()
    }
    const fixedPixels = typeof viewportHeight === 'number' && Number.isFinite(viewportHeight) && viewportHeight > 0
    let spriteWidth = labelWidth
    let spriteHeight = labelHeight
    let labelWorldWidth = labelWidth
    let rowStep = radius * 0.34
    if (fixedPixels) {
      // 不启用透视缩放的 Sprite，其尺寸仍需按相机 FOV 换算为像素。
      const fov = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(verticalFovDeg, 1, 179))
      const projectionScale = 2 * Math.tan(fov / 2) / viewportHeight
      const pixelHeight = THREE.MathUtils.clamp(viewportHeight * 0.06, 24, 52)
      const pixelWidth = pixelHeight * labelWidth / labelHeight
      const worldPerPixel = projectionScale * viewDirectionLocal.length()
      spriteWidth = pixelWidth * projectionScale
      spriteHeight = pixelHeight * projectionScale
      labelWorldWidth = pixelWidth * worldPerPixel
      rowStep = THREE.MathUtils.clamp(rowStep, (pixelHeight + 4) * worldPerPixel, viewportHeight * 0.1 * worldPerPixel)
    }
    for (const annotation of annotations) {
      // 用真正的相机坐标排列七行；地轴倾斜不再让标签倾斜或挤到时间轴下方。
      // 不朝相机前推，保证标签的大小、间距不被透视额外放大。
      annotation.sprite.position.copy(right).multiplyScalar(radius * 1.4)
        .addScaledVector(up, rowStep * annotation.screenHeight / 0.34)
      annotation.sprite.scale.set(spriteWidth, spriteHeight, 1)
      if (annotation.sprite.material.sizeAttenuation === fixedPixels) {
        annotation.sprite.material.sizeAttenuation = !fixedPixels
        annotation.sprite.material.needsUpdate = true
      }
      worldAnchor.copy(annotation.anchor).applyQuaternion(slices.quaternion)
      connectorEnd.copy(annotation.sprite.position).addScaledVector(right, -labelWorldWidth * 0.5)
      annotation.connector.setXYZ(0, worldAnchor.x, worldAnchor.y, worldAnchor.z)
      annotation.connector.setXYZ(1, connectorEnd.x, connectorEnd.y, connectorEnd.z)
      annotation.connector.needsUpdate = true
    }
  }

  function update(
    viewDirectionLocal: THREE.Vector3,
    screenRightLocal?: THREE.Vector3,
    screenUpLocal?: THREE.Vector3,
    viewportHeight?: number,
    verticalFovDeg = 45,
  ) {
    if (disposed || !Number.isFinite(viewDirectionLocal.lengthSq()) || viewDirectionLocal.lengthSq() < 1e-12) return
    const horizontalLength = Math.hypot(viewDirectionLocal.x, viewDirectionLocal.z)
    if (horizontalLength > 1e-5) {
      slices.rotation.y = Math.atan2(viewDirectionLocal.x, viewDirectionLocal.z)
      cutawayDirection.set(viewDirectionLocal.x / horizontalLength, 0, viewDirectionLocal.z / horizontalLength)
    }
    updateLabels(viewDirectionLocal, screenRightLocal, screenUpLocal, viewportHeight, verticalFovDeg)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    group.removeFromParent()
    for (const item of geometries) item.dispose()
    for (const item of materials) item.dispose()
    for (const item of textures) item.dispose()
    group.clear()
  }

  update(view)
  return { group, cutawayDirection, update, updateLabels, dispose }
}
