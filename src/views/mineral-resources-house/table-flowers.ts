import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

/** Metre-scale tabletop still life; origin sits directly on the table surface. */
export function createTableFlowers(): { root: THREE.Group; dispose(): void } {
  const root = new THREE.Group()
  root.name = 'Hollow ceramic vase with three gently curved flowering stems'
  const materials: THREE.MeshStandardMaterial[] = []
  const geometryGroups = new Map<THREE.MeshStandardMaterial, THREE.BufferGeometry[]>()
  const material = (color: string, roughness: number, doubleSided = false) => {
    const result = new THREE.MeshStandardMaterial({
      color, roughness, metalness: 0, side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    })
    materials.push(result)
    return result
  }
  const ceramic = material('#e7e1d4', .31)
  const stemMaterial = material('#5e7250', .85)
  const leafMaterial = material('#516c45', .88, true)
  const petalMaterials = [material('#eee5cc', .78, true), material('#e5c3ad', .83, true), material('#ecdfb4', .8, true)]
  const centreMaterial = material('#ad8641', .88)
  const add = (geometry: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial) => {
    const triangles = geometry.index ? geometry.toNonIndexed() : geometry
    if (triangles !== geometry) geometry.dispose()
    // All geometry in a material batch shares the same attribute set.
    if (!triangles.getAttribute('uv')) triangles.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(triangles.getAttribute('position').count * 2), 2))
    const list = geometryGroups.get(mat) ?? []
    list.push(triangles); geometryGroups.set(mat, list)
  }

  // Continuous inner and outer walls, including a solid foot and a real open
  // mouth. The ceramic rim is part of the profile rather than a painted disc.
  const profile: [number, number][] = [
    [0, .002], [.037, .002], [.043, .005], [.045, .013], [.043, .021],
    [.052, .034], [.070, .065], [.082, .108], [.084, .146], [.079, .182],
    [.065, .216], [.046, .244], [.031, .263], [.027, .285], [.028, .309],
    [.032, .316], [.0325, .320], [.030, .323], [.026, .321], [.024, .316],
    [.022, .305], [.022, .283], [.026, .260], [.041, .239], [.059, .210],
    [.072, .177], [.077, .143], [.075, .109], [.063, .069], [.045, .040],
    [.034, .024], [0, .024],
  ]
  add(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 32), ceramic)

  const stems = [
    [[-.010, .254, .004], [-.016, .385, -.004], [-.055, .528, -.012], [-.082, .635, -.004]],
    [[.007, .252, -.009], [.018, .402, -.015], [.047, .582, -.028], [.066, .704, -.008]],
    [[.012, .256, .008], [.028, .377, .027], [.082, .477, .046], [.118, .574, .045]],
  ] as const
  const curves = stems.map(points => new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))))
  for (const [index, curve] of curves.entries()) add(new THREE.TubeGeometry(curve, 20, index === 1 ? .0028 : .0023, 6, false), stemMaterial)

  // A narrow leaf blade has a lifted central vein and a gently rolled tip; its
  // two-sided surface remains thin when seen from above, unlike ellipsoid leaves.
  const leaf = (origin: THREE.Vector3, direction: THREE.Vector3, length: number, width: number, roll: number) => {
    const vertices: number[] = [], indices: number[] = []
    const rows = 6, cols = 2
    for (let row = 0; row <= rows; row++) {
      const t = row / rows
      const halfWidth = width * .5 * Math.pow(Math.sin(Math.PI * t), .8)
      for (let col = 0; col <= cols; col++) {
        const across = col / cols * 2 - 1
        vertices.push(halfWidth * across, length * t, Math.sin(Math.PI * t) * length * .12 - Math.abs(across) * halfWidth * .15 + t * t * length * .1)
      }
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const a = row * (cols + 1) + col, b = a + cols + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.setIndex(indices); geometry.computeVertexNormals()
    geometry.rotateY(roll)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
    geometry.translate(...origin.toArray())
    add(geometry, leafMaterial)
  }
  const leafPlacements: [number, number, [number, number, number], number, number, number][] = [
    [0, .43, [-1, .35, .28], .102, .031, .35],
    [0, .64, [.75, .4, .65], .083, .026, -.5],
    [0, .79, [-.55, .65, -.5], .066, .022, .7],
    [1, .35, [.65, .45, -.72], .112, .033, -.3],
    [1, .58, [-.85, .55, -.4], .095, .029, .6],
    [1, .78, [.72, .6, -.3], .071, .024, .1],
    [2, .38, [-.55, .35, .8], .092, .03, -.7],
    [2, .64, [.85, .45, .2], .08, .026, .4],
  ]
  for (const [stem, t, direction, length, width, roll] of leafPlacements) leaf(curves[stem]!.getPoint(t), new THREE.Vector3(...direction), length, width, roll)

  const flower = (centre: THREE.Vector3, axis: THREE.Vector3, size: number, colorIndex: number) => {
    const orientation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize())
    const petal = (angle: number, span: number, width: number, lift: number) => {
      const vertices: number[] = [], indices: number[] = []
      const rows = 5, cols = 4
      for (let row = 0; row <= rows; row++) {
        const t = row / rows
        const w = width * Math.pow(Math.sin(Math.PI * (t * .87 + .06)), .72)
        for (let col = 0; col <= cols; col++) {
          const across = col / cols * 2 - 1
          const radial = .006 + span * t
          const localX = radial, localZ = across * w
          const y = lift * Math.sin(t * Math.PI * .78) - .006 * t * t + .004 * across * across * Math.sin(t * Math.PI)
          vertices.push(localX * Math.cos(angle) - localZ * Math.sin(angle), y, localX * Math.sin(angle) + localZ * Math.cos(angle))
        }
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const a = row * (cols + 1) + col, b = a + cols + 1
        indices.push(a, b, a + 1, b, b + 1, a + 1)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      geometry.setIndex(indices); geometry.computeVertexNormals()
      geometry.applyQuaternion(orientation); geometry.translate(...centre.toArray())
      add(geometry, petalMaterials[colorIndex]!)
    }
    for (let i = 0; i < 6; i++) petal(i * Math.PI / 3 + colorIndex * .21, size * (1 + Math.sin(i * 2.3) * .06), size * .40, .010 + i % 2 * .002)
    const centreGeometry = new THREE.SphereGeometry(.009, 10, 6)
    centreGeometry.scale(1, .4, 1)
    centreGeometry.applyQuaternion(orientation); centreGeometry.translate(...centre.toArray())
    add(centreGeometry, centreMaterial)
    // Five tapered green sepals meet the stem beneath each blossom.
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * .4
      const sepal = new THREE.ConeGeometry(.0029, .017, 4)
      sepal.rotateZ(.7)
      sepal.rotateY(angle)
      sepal.translate(Math.cos(angle) * .005, -.004, Math.sin(angle) * .005)
      sepal.applyQuaternion(orientation); sepal.translate(...centre.toArray())
      add(sepal, stemMaterial)
    }
  }
  flower(curves[0]!.getPoint(1), new THREE.Vector3(-.30, .94, .16), .034, 0)
  flower(curves[1]!.getPoint(1), new THREE.Vector3(.19, .94, -.28), .037, 2)
  flower(curves[2]!.getPoint(1), new THREE.Vector3(.36, .85, .30), .031, 1)

  for (const [mat, geometries] of geometryGroups) {
    const merged = mergeGeometries(geometries, false)
    geometries.forEach(geometry => geometry.dispose())
    if (!merged) continue
    const mesh = new THREE.Mesh(merged, mat)
    mesh.castShadow = true; mesh.receiveShadow = true
    root.add(mesh)
  }
  geometryGroups.clear()
  let disposed = false
  return {
    root,
    dispose() {
      if (disposed) return
      disposed = true
      root.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose() })
      materials.forEach(mat => mat.dispose())
      root.clear()
    },
  }
}
