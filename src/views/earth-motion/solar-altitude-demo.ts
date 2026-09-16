import * as THREE from 'three'
import { formatSignedDegreesMinutes } from './obliquity'

/** Solar elevation is measured from the tangent plane, not from the surface normal. */
export function solarAltitudeFrame(normal: THREE.Vector3, sunlight: THREE.Vector3) {
  const up = normal.clone().normalize()
  const sun = sunlight.clone().normalize()
  const sine = THREE.MathUtils.clamp(up.dot(sun), -1, 1)
  const horizontal = sun.clone().addScaledVector(up, -sine)
  // At zenith/nadir the azimuth is undefined; choose a stable tangent axis.
  if (horizontal.lengthSq() < 1e-10) {
    horizontal.copy(Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0))
    horizontal.addScaledVector(up, -horizontal.dot(up))
  }
  horizontal.normalize()
  return { up, horizontal, sideways: new THREE.Vector3().crossVectors(horizontal, up).normalize(), altitude: Math.asin(sine) }
}

function label(initialText: string, color: string, emphasis = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 72
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, sizeAttenuation: false })
  const sprite = new THREE.Sprite(material)
  sprite.renderOrder = 24
  const anchor = new THREE.Vector3()
  const leaderPosition = new THREE.Float32BufferAttribute(new Float32Array(6), 3)
  const leader = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', leaderPosition), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.48, depthTest: false, depthWrite: false, toneMapped: false }))
  leader.renderOrder = 23
  leader.frustumCulled = false
  let previous = ''
  let contentWidth = 256
  function setText(text: string) {
    if (!context || text === previous) return
    previous = text
    context.font = '600 48px "Microsoft YaHei", sans-serif'
    contentWidth = Math.min(canvas.width, Math.ceil(context.measureText(text).width + 26))
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    // Small unboxed text; a restrained outline keeps it legible over terrain and stars.
    context.strokeStyle = 'rgba(3, 13, 24, 0.9)'
    context.lineWidth = 6
    context.lineJoin = 'round'
    context.strokeText(text, contentWidth / 2, 38)
    context.fillStyle = color
    context.fillText(text, contentWidth / 2, 38)
    // Keep the GPU texture dimensions stable; crop its UVs instead of resizing the canvas.
    texture.repeat.x = contentWidth / canvas.width
    texture.needsUpdate = true
  }
  setText(initialText)
  return { sprite, setText, texture, canvas, get contentWidth() { return contentWidth }, emphasis, anchor, leader, leaderPosition }
}

export function createSolarAltitudeDemo(radius: number) {
  const group = new THREE.Group()
  group.name = 'solar-altitude-demonstration'
  const length = radius * 0.65
  const arcRadius = radius * 0.34
  const plane = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.32, 48),
    new THREE.MeshBasicMaterial({ color: 0x77c7d9, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false }),
  )
  plane.rotation.x = -Math.PI / 2
  plane.renderOrder = 20
  group.add(plane)
  const normalArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), length, 0x65e5f3, radius * 0.07, radius * 0.035)
  const sunArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(length, 0, 0), length, 0xffd05b, radius * 0.075, radius * 0.04)
  group.add(normalArrow, sunArrow)
  const horizon = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-length * 0.3, 0, 0), new THREE.Vector3(length * 1.06, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0xc0e0eb, dashSize: radius * 0.045, gapSize: radius * 0.03, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }),
  )
  horizon.computeLineDistances()
  group.add(horizon)
  const nightRay = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(length, 0, 0)]),
    new THREE.LineDashedMaterial({ color: 0xb4a3ff, dashSize: radius * 0.045, gapSize: radius * 0.035, depthTest: false, depthWrite: false, transparent: true, opacity: 0.86 }),
  )
  nightRay.computeLineDistances()
  group.add(nightRay)
  const segments = 48
  const arcAttribute = new THREE.Float32BufferAttribute(new Float32Array((segments + 1) * 3), 3)
  const arcGeometry = new THREE.BufferGeometry().setAttribute('position', arcAttribute)
  const arcMaterial = new THREE.LineDashedMaterial({ color: 0xffd05b, dashSize: radius * 0.045, gapSize: 0, depthTest: false, depthWrite: false, toneMapped: false })
  const arc = new THREE.Line(arcGeometry, arcMaterial)
  arc.frustumCulled = false
  const sectorAttribute = new THREE.Float32BufferAttribute(new Float32Array(segments * 9), 3)
  const sectorMaterial = new THREE.MeshBasicMaterial({ color: 0xffcd52, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false })
  const sector = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', sectorAttribute), sectorMaterial)
  sector.frustumCulled = false
  sector.renderOrder = 21
  group.add(sector, arc)
  const normalLabel = label('地表法线', '#75e9f5')
  normalLabel.anchor.set(-radius * 0.08, length * 0.92, 0)
  const horizonLabel = label('当地水平面', '#c3e6ef')
  horizonLabel.anchor.set(length * 0.8, -radius * 0.06, 0)
  const sunLabel = label('太阳光线', '#ffdc80')
  const angleLabel = label(`h = ${formatSignedDegreesMinutes(0)}`, '#ffdc80', true)
  const labels = [angleLabel, normalLabel, sunLabel, horizonLabel]
  labels.forEach((item) => group.add(item.sprite, item.leader))
  group.traverse((object) => {
    if (object instanceof THREE.Line || object instanceof THREE.Mesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => { material.depthTest = false; material.depthWrite = false; material.toneMapped = false })
      if (object !== plane && object !== sector) object.renderOrder = 22
    }
  })
  const basis = new THREE.Matrix4()
  const worldObserver = new THREE.Vector3()
  const worldCenter = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const worldNormal = new THREE.Vector3()
  function update(normal: THREE.Vector3, sunDirection: THREE.Vector3) {
    const frame = solarAltitudeFrame(normal, sunDirection)
    group.position.copy(frame.up).multiplyScalar(radius * 1.014)
    basis.makeBasis(frame.horizontal, frame.up, frame.sideways)
    group.quaternion.setFromRotationMatrix(basis)
    const night = frame.altitude < -1e-6
    const sun = new THREE.Vector3(Math.cos(frame.altitude), Math.sin(frame.altitude), 0)
    sunArrow.visible = !night
    sunArrow.position.copy(sun).multiplyScalar(length)
    sunArrow.setDirection(sun.clone().negate())
    nightRay.visible = night
    nightRay.rotation.z = frame.altitude
    arcMaterial.color.setHex(night ? 0xb4a3ff : 0xffd05b)
    arcMaterial.gapSize = night ? radius * 0.025 : 0
    sectorMaterial.color.copy(arcMaterial.color)
    for (let i = 0; i <= segments; i++) {
      const theta = frame.altitude * i / segments
      const x = Math.cos(theta) * arcRadius
      const y = Math.sin(theta) * arcRadius
      arcAttribute.setXYZ(i, x, y, 0)
      if (i < segments) {
        const next = frame.altitude * (i + 1) / segments
        sectorAttribute.setXYZ(i * 3, 0, 0, 0)
        sectorAttribute.setXYZ(i * 3 + 1, x, y, 0)
        sectorAttribute.setXYZ(i * 3 + 2, Math.cos(next) * arcRadius, Math.sin(next) * arcRadius, 0)
      }
    }
    arcAttribute.needsUpdate = true
    sectorAttribute.needsUpdate = true
    arc.computeLineDistances()
    sunLabel.setText(night ? '太阳方向延长线' : '太阳光线')
    sunLabel.anchor.copy(sun).multiplyScalar(length * 0.88).add(new THREE.Vector3(radius * 0.06, radius * 0.04, 0))
    const halfAngle = frame.altitude / 2
    angleLabel.anchor.set(Math.cos(halfAngle) * arcRadius * 1.18, Math.sin(halfAngle) * arcRadius * 1.18, radius * 0.02)
    angleLabel.setText(`h = ${formatSignedDegreesMinutes(THREE.MathUtils.radToDeg(frame.altitude))}`)
  }
  const projected = new THREE.Vector3()
  const labelLocal = new THREE.Vector3()
  function updateForCamera(camera: THREE.PerspectiveCamera | THREE.OrthographicCamera, enabled: boolean, viewportHeight = 720) {
    if (!enabled || !group.parent) { group.visible = false; return }
    group.parent.updateWorldMatrix(true, false)
    group.parent.getWorldPosition(worldCenter)
    worldObserver.copy(group.position).applyMatrix4(group.parent.matrixWorld)
    worldNormal.copy(worldObserver).sub(worldCenter).normalize()
    camera.updateWorldMatrix(true, false)
    if (camera instanceof THREE.OrthographicCamera) camera.getWorldDirection(toCamera).negate()
    else camera.getWorldPosition(toCamera).sub(worldObserver).normalize()
    // The negative-elevation extension is drawn over the near surface only, never through the far hemisphere.
    group.visible = worldNormal.dot(toCamera) > 0.015
    if (!group.visible) return
    group.updateWorldMatrix(true, false)
    const height = Math.max(viewportHeight, 1)
    const projection = camera.projectionMatrix.elements
    const width = height * projection[5]! / projection[0]!
    const worldPerPixel = 2 / (height * projection[5]!)
    const boxes: { x: number; y: number; w: number; h: number }[] = []
    for (const item of labels) {
      item.sprite.visible = item.emphasis || height >= 280
      item.leader.visible = false
      if (!item.sprite.visible) continue
      const textPixels = THREE.MathUtils.clamp(height * 0.012, 13, 19) + (item.emphasis ? 2 : 0)
      const pixelHeight = textPixels * 1.5
      const pixelWidth = pixelHeight * item.contentWidth / item.canvas.height
      item.sprite.scale.set(pixelWidth * worldPerPixel, pixelHeight * worldPerPixel, 1)
      projected.copy(item.anchor).applyMatrix4(group.matrixWorld).project(camera)
      if (projected.z < -1 || projected.z > 1) { item.sprite.visible = false; continue }
      const anchorX = (projected.x + 1) * width / 2
      const anchorY = (1 - projected.y) * height / 2
      let x = THREE.MathUtils.clamp(anchorX + 9, pixelWidth / 2 + 12, width - pixelWidth / 2 - 12)
      let y = THREE.MathUtils.clamp(anchorY - 16, pixelHeight / 2 + 14, height - pixelHeight / 2 - 28)
      const baseY = y
      for (const offset of [0, -28, 28, -56, 56, -84, 84]) {
        y = THREE.MathUtils.clamp(baseY + offset, pixelHeight / 2 + 14, height - pixelHeight / 2 - 28)
        if (!boxes.some((box) => Math.abs(box.x - x) < (box.w + pixelWidth) / 2 + 6 && Math.abs(box.y - y) < (box.h + pixelHeight) / 2 + 4)) break
      }
      boxes.push({ x, y, w: pixelWidth, h: pixelHeight })
      labelLocal.set(x / width * 2 - 1, 1 - y / height * 2, projected.z).unproject(camera)
      group.worldToLocal(labelLocal)
      item.sprite.position.copy(labelLocal)
      item.leader.visible = Math.hypot(x - anchorX, y - anchorY) > 12
      item.leaderPosition.setXYZ(0, item.anchor.x, item.anchor.y, item.anchor.z)
      item.leaderPosition.setXYZ(1, labelLocal.x, labelLocal.y, labelLocal.z)
      item.leaderPosition.needsUpdate = true
    }
  }
  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Sprite) {
        if (!(object instanceof THREE.Sprite)) geometries.add(object.geometry)
        ;(Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material))
      }
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    ;[normalLabel, horizonLabel, sunLabel, angleLabel].forEach((item) => item.texture.dispose())
    group.removeFromParent()
  }
  return { group, update, updateForCamera, dispose }
}
