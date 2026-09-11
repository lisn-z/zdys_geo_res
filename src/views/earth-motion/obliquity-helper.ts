import * as THREE from 'three'

interface ObliquityColors {
  eclipticColor?: THREE.ColorRepresentation
  equatorColor?: THREE.ColorRepresentation
}

/** The parent is the un-tilted Earth root, not the spinning or tilted Earth group. */
export function createObliquityHelper(radius: number, tilt: number, colors: ObliquityColors = {}) {
  const group = new THREE.Group()
  group.name = 'obliquity-demonstration'
  const referenceLength = radius * 1.78
  const arcRadius = radius * 1.32
  const arcColor = '#e8d8b0'
  const makeReference = (name: string, direction: THREE.Vector3, color: THREE.ColorRepresentation) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(), direction.multiplyScalar(referenceLength),
    ])
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false })
    const line = new THREE.Line(geometry, material)
    line.name = name
    group.add(line)
  }
  makeReference('obliquity-ecliptic-reference', new THREE.Vector3(1, 0, 0), colors.eclipticColor ?? '#9b7cff')
  // Rz(-tilt) * X lies in the actual equator plane: dot(ray, Rz(-tilt) * Y) = 0.
  makeReference('obliquity-equator-reference', new THREE.Vector3(Math.cos(tilt), -Math.sin(tilt), 0), colors.equatorColor ?? '#2dd4e8')
  const arcPoints = Array.from({ length: 65 }, (_, index) => {
    const angle = -tilt * index / 64
    return new THREE.Vector3(Math.cos(angle) * arcRadius, Math.sin(angle) * arcRadius, 0)
  })
  const arc = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(arcPoints),
    new THREE.LineBasicMaterial({ color: arcColor, transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false }),
  )
  arc.name = 'obliquity-angle-arc'
  group.add(arc)

  // A two-line, unboxed annotation. Screen-space sizing avoids giant text when zooming in.
  const canvas = document.createElement('canvas')
  canvas.width = 224
  canvas.height = 112
  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    context.strokeStyle = 'rgba(3, 13, 24, 0.94)'
    context.lineWidth = 6
    context.font = '600 46px "Microsoft YaHei", sans-serif'
    const value = `${THREE.MathUtils.radToDeg(Math.abs(tilt)).toFixed(2)}°`
    context.strokeText(value, 112, 37)
    context.fillStyle = '#f4e5c2'
    context.fillText(value, 112, 37)
    context.font = '500 27px "Microsoft YaHei", sans-serif'
    context.strokeText('黄赤交角', 112, 84)
    context.fillStyle = '#bdcfdb'
    context.fillText('黄赤交角', 112, 84)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture, transparent: true, sizeAttenuation: false,
    depthTest: false, depthWrite: false, toneMapped: false,
  }))
  label.name = 'obliquity-label'
  label.renderOrder = 24
  label.frustumCulled = false
  const anchor = new THREE.Vector3(Math.cos(tilt / 2) * arcRadius, -Math.sin(tilt / 2) * arcRadius, 0)
  label.position.copy(anchor)
  group.add(label)

  const leaderPosition = new THREE.Float32BufferAttribute(new Float32Array(6), 3)
  const leader = new THREE.Line(
    new THREE.BufferGeometry().setAttribute('position', leaderPosition),
    new THREE.LineBasicMaterial({ color: '#a6becb', transparent: true, opacity: 0.42, depthTest: false, depthWrite: false, toneMapped: false }),
  )
  leader.name = 'obliquity-label-leader'
  leader.renderOrder = 23
  leader.frustumCulled = false
  group.add(leader)

  const cameraLocal = new THREE.Vector3()
  const sightline = new THREE.Vector3()
  const closestPoint = new THREE.Vector3()
  const projected = new THREE.Vector3()
  const centerProjected = new THREE.Vector3()
  const labelLocal = new THREE.Vector3()
  const leaderEnd = new THREE.Vector3()

  function updateForCamera(camera: THREE.PerspectiveCamera, enabled: boolean, viewportHeight = 720) {
    group.visible = enabled && viewportHeight > 0
    if (!group.visible) return
    group.updateWorldMatrix(true, false)
    camera.updateWorldMatrix(true, false)
    camera.getWorldPosition(cameraLocal)
    group.worldToLocal(cameraLocal)
    sightline.copy(anchor).sub(cameraLocal)
    const t = THREE.MathUtils.clamp(-cameraLocal.dot(sightline) / Math.max(sightline.lengthSq(), 1e-12), 0, 1)
    closestPoint.copy(cameraLocal).addScaledVector(sightline, t)
    projected.copy(anchor).applyMatrix4(group.matrixWorld).project(camera)
    // Do not draw a floating label through the far hemisphere or behind the camera.
    label.visible = projected.z >= -1 && projected.z <= 1 && closestPoint.length() >= radius * 0.998
    leader.visible = label.visible
    if (!label.visible) return

    const height = Math.max(1, viewportHeight)
    const width = height * camera.aspect
    const pixelHeight = height < 480 ? 32 : THREE.MathUtils.clamp(height * 0.035, 44, 56)
    const pixelWidth = pixelHeight * canvas.width / canvas.height
    // projectionMatrix includes camera.zoom; distance is deliberately not a factor.
    const worldPerPixel = 2 / (height * camera.projectionMatrix.elements[5]!)
    label.scale.set(pixelWidth * worldPerPixel, pixelHeight * worldPerPixel, 1)

    centerProjected.set(0, 0, 0).applyMatrix4(group.matrixWorld).project(camera)
    const anchorX = (projected.x + 1) * width / 2
    const anchorY = (1 - projected.y) * height / 2
    let dx = (projected.x - centerProjected.x) * width
    let dy = (centerProjected.y - projected.y) * height
    const length = Math.hypot(dx, dy)
    if (length < 1e-6) { dx = 1; dy = 0 } else { dx /= length; dy /= length }
    const halfExtent = (Math.abs(dx) * pixelWidth + Math.abs(dy) * pixelHeight) / 2
    const x = THREE.MathUtils.clamp(anchorX + dx * (halfExtent + 12), pixelWidth / 2 + 10, width - pixelWidth / 2 - 10)
    const y = THREE.MathUtils.clamp(anchorY + dy * (halfExtent + 12), pixelHeight / 2 + 10, height - pixelHeight / 2 - 10)
    labelLocal.set(x / width * 2 - 1, 1 - y / height * 2, projected.z).unproject(camera)
    group.worldToLocal(labelLocal)
    label.position.copy(labelLocal)
    const leaderLength = Math.hypot(x - anchorX, y - anchorY)
    const gap = Math.max(0, leaderLength - halfExtent - 4) / Math.max(leaderLength, 1)
    leaderEnd.set((anchorX + (x - anchorX) * gap) / width * 2 - 1,
      1 - (anchorY + (y - anchorY) * gap) / height * 2, projected.z).unproject(camera)
    group.worldToLocal(leaderEnd)
    leaderPosition.setXYZ(0, anchor.x, anchor.y, anchor.z)
    leaderPosition.setXYZ(1, leaderEnd.x, leaderEnd.y, leaderEnd.z)
    leaderPosition.needsUpdate = true
    leader.visible = gap > 0
  }

  function dispose() {
    group.traverse((object) => {
      if (object instanceof THREE.Line) {
        object.geometry.dispose()
        ;(Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose())
      }
    })
    texture.dispose()
    label.material.dispose()
    group.removeFromParent()
  }

  return { group, updateForCamera, dispose }
}
