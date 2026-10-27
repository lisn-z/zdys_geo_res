import * as THREE from 'three'

/**
 * 两侧共用的观测者：脚底 y=0，总高为 height，站立轴 +Y，正面 −Z。
 * 每个实例独立持有资源，由所在场景统一释放；不使用外部模型或贴图。
 */
export function createObserverFigure(height = 1): THREE.Group {
  if (!Number.isFinite(height) || height <= 0) throw new RangeError('观测者高度须为正的有限数值')

  const figure = new THREE.Group()
  figure.name = 'observer-figure'
  figure.userData.isObserverFigure = true
  figure.scale.setScalar(height)

  const jacket = new THREE.MeshStandardMaterial({ color: '#91a8b3', roughness: 0.88 })
  const trousers = new THREE.MeshStandardMaterial({ color: '#42576b', roughness: 0.9 })
  const shoes = new THREE.MeshStandardMaterial({ color: '#26323d', roughness: 0.88 })
  const skin = new THREE.MeshStandardMaterial({ color: '#edc3a4', roughness: 0.88 })
  const hair = new THREE.MeshStandardMaterial({ color: '#493c36', roughness: 0.95 })
  const face = new THREE.MeshStandardMaterial({ color: '#49362e', roughness: 0.85 })
  const collar = new THREE.MeshStandardMaterial({ color: '#eee9dc', roughness: 0.9 })

  const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material,
    x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    figure.add(mesh)
    return mesh
  }
  const ellipsoid = (name: string, material: THREE.Material,
    x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = add(name, new THREE.SphereGeometry(1, 20, 14), material, x, y, z)
    mesh.scale.set(sx, sy, sz)
    return mesh
  }
  const limb = (name: string, material: THREE.Material, radius: number,
    from: THREE.Vector3, to: THREE.Vector3) => {
    const direction = to.clone().sub(from)
    const middle = from.clone().add(to).multiplyScalar(0.5)
    const mesh = add(name, new THREE.CapsuleGeometry(radius, Math.max(0, direction.length() - 2 * radius), 4, 12),
      material, middle.x, middle.y, middle.z)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
    return mesh
  }

  // 圆润的肩、袖和自然下垂的手臂，头身比例约为 1:5.5。
  const torso = add('observer-jacket', new THREE.CapsuleGeometry(0.083, 0.16, 6, 20), jacket, 0, 0.594, 0)
  torso.scale.set(1.12, 1, 0.76)
  ellipsoid('observer-hips', trousers, 0, 0.444, 0, 0.087, 0.057, 0.062)
  add('observer-collar', new THREE.CylinderGeometry(0.042, 0.049, 0.018, 16), collar, 0, 0.753, 0)
  add('observer-neck', new THREE.CylinderGeometry(0.031, 0.033, 0.066, 16), skin, 0, 0.791, 0)

  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'left' : 'right'
    ellipsoid('observer-shoe-' + suffix, shoes, side * 0.049, 0.035, -0.025, 0.046, 0.035, 0.087)
    limb('observer-leg-' + suffix, trousers, 0.034,
      new THREE.Vector3(side * 0.046, 0.061, 0), new THREE.Vector3(side * 0.045, 0.441, 0))
    limb('observer-upper-arm-' + suffix, jacket, 0.032,
      new THREE.Vector3(side * 0.104, 0.713, 0), new THREE.Vector3(side * 0.134, 0.571, 0.008))
    limb('observer-forearm-' + suffix, jacket, 0.027,
      new THREE.Vector3(side * 0.134, 0.571, 0.008), new THREE.Vector3(side * 0.139, 0.449, -0.026))
    ellipsoid('observer-hand-' + suffix, skin, side * 0.14, 0.427, -0.028, 0.025, 0.034, 0.023)
    ellipsoid('observer-ear-' + suffix, skin, side * 0.069, 0.898, 0, 0.010, 0.017, 0.012)
    ellipsoid('observer-eye-' + suffix, face, side * 0.022, 0.902, -0.061, 0.004, 0.005, 0.003)
  }

  ellipsoid('observer-head', skin, 0, 0.902, 0, 0.069, 0.09, 0.063)
  // 发顶恰好到 y=1；额头留空，背面发片让俯视也能辨认朝向。
  const crown = add('observer-hair-crown', new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, 1.25), hair, 0, 0.904, 0)
  crown.scale.set(0.071, 0.096, 0.065)
  const backHair = add('observer-hair-back', new THREE.SphereGeometry(1, 16, 12, 0, Math.PI, 0.35, 2.4), hair, 0, 0.902, 0)
  backHair.scale.set(0.0705, 0.0915, 0.0645)
  ellipsoid('observer-nose', skin, 0, 0.884, -0.063, 0.009, 0.011, 0.014)
  const mouth = add('observer-mouth', new THREE.CapsuleGeometry(0.0015, 0.014, 3, 8), face, 0, 0.867, -0.059)
  mouth.rotation.z = Math.PI / 2
  return figure
}

/** 太阳方向须用人物父节点的当地坐标表示；只转动朝向，不改变站立姿态。 */
export function faceObserverTowardSun(figure: THREE.Object3D, sunDirection: { x: number; y: number; z: number }): void {
  const { x, y, z } = sunDirection
  if (![x, y, z].every(Number.isFinite) || Math.hypot(x, z) < 1e-10) return
  // 正面为 −Z；太阳在天顶/天底时水平朝向不唯一，保留上一次朝向。
  figure.rotation.y = Math.atan2(-x, -z)
}
