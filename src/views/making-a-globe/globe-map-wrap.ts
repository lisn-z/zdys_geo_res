import * as THREE from 'three'

const TAU = Math.PI * 2
const smooth = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

/** Fixed UV columns are laid down one by one while the remaining sheet unrolls. */
export function createMapWrapMesh(texture: THREE.Texture, radius: number) {
  const columns = 96
  const rows = 48
  const geometry = new THREE.PlaneGeometry(1, 1, columns, rows)
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute
  const normals = geometry.getAttribute('normal') as THREE.BufferAttribute
  positions.setUsage(THREE.DynamicDrawUsage)
  normals.setUsage(THREE.DynamicDrawUsage)
  const positionArray = positions.array as Float32Array
  const normalArray = normals.array as Float32Array
  const material = new THREE.MeshStandardMaterial({
    map: texture, color: '#ffffff', roughness: 0.72, metalness: 0.015,
    side: THREE.FrontSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  // The evolving sheet can extend beyond its final spherical bounds.
  mesh.frustumCulled = false
  // Showing the pale reverse of the paper inside the curl makes the roll legible.
  const reverseMaterial = new THREE.MeshStandardMaterial({
    color: '#f5ead5', roughness: 0.86, side: THREE.BackSide,
  })
  const reverse = new THREE.Mesh(geometry, reverseMaterial)
  reverse.frustumCulled = false
  reverse.castShadow = true
  mesh.add(reverse)
  const latitudeSines = new Float32Array(rows + 1)
  const latitudeCosines = new Float32Array(rows + 1)
  for (let row = 0; row <= rows; row++) {
    const latitude = Math.PI * (0.5 - row / rows)
    latitudeSines[row] = Math.sin(latitude)
    latitudeCosines[row] = Math.cos(latitude)
  }

  function update(progress: number) {
    const gather = smooth(progress / 0.13)
    const pasted = THREE.MathUtils.clamp((progress - 0.13) / 0.78, 0, 1)
    const contactU = 1 - pasted
    const contactLongitude = (contactU - 0.5) * TAU
    const contactCosine = Math.cos(contactLongitude)
    const contactSine = Math.sin(contactLongitude)
    const surfaceRadius = radius + 0.006
    for (let row = 0; row <= rows; row++) {
      const latitudeSine = latitudeSines[row]!
      const latitudeCosine = latitudeCosines[row]!
      const ringRadius = surfaceRadius * latitudeCosine
      const targetY = surfaceRadius * latitudeSine
      for (let column = 0; column <= columns; column++) {
        const u = column / columns
        const longitude = (u - 0.5) * TAU
        let x: number
        let z: number
        let normalX: number
        let normalZ: number
        let targetLongitude: number
        if (u >= contactU) {
          // Once the contact edge passes a column it never moves relative to the
          // globe again: this is progressive pasting, not a whole-sheet morph.
          x = ringRadius * Math.cos(longitude)
          z = -ringRadius * Math.sin(longitude)
          normalX = latitudeCosine * Math.cos(longitude)
          normalZ = -latitudeCosine * Math.sin(longitude)
          targetLongitude = longitude
        } else {
          const remainingLength = (contactU - u) * TAU * radius
          const curl = remainingLength / 0.3
          const outerRadius = 0.35 * latitudeCosine
          // An inward spiral gives each turn a separate layer. Its entire cross
          // section sits outside the tangent plane at the contact meridian.
          const innerRadius = outerRadius * (0.28 + 0.72 * Math.exp(-curl * 0.07))
          const outward = outerRadius - innerRadius * Math.cos(curl)
          const tangent = -innerRadius * Math.sin(curl)
          const radial = ringRadius + outward
          x = radial * contactCosine - tangent * contactSine
          z = -radial * contactSine - tangent * contactCosine
          const normalAngle = contactLongitude + curl
          normalX = latitudeCosine * Math.cos(normalAngle)
          normalZ = -latitudeCosine * Math.sin(normalAngle)
          targetLongitude = contactLongitude + Math.atan2(tangent, radial)
        }
        let vertexY = targetY
        let normalY = latitudeSine
        if (gather < 1) {
          const flatX = radius + 0.38
          const flatZ = -(u - 0.5) * 5.4
          const flatY = (1 - 2 * row / rows) * 1.35
          const flatLongitude = Math.atan2(-flatZ, flatX)
          const angle = THREE.MathUtils.lerp(flatLongitude, targetLongitude - TAU, gather)
          const radial = THREE.MathUtils.lerp(Math.hypot(flatX, flatZ), Math.hypot(x, z), gather)
          x = radial * Math.cos(angle)
          z = -radial * Math.sin(angle)
          vertexY = THREE.MathUtils.lerp(flatY, targetY, gather)
          normalX = THREE.MathUtils.lerp(1, normalX, gather)
          normalY *= gather
          normalZ *= gather
          const normalLength = Math.hypot(normalX, normalY, normalZ)
          if (normalLength > 0.00001) {
            normalX /= normalLength
            normalY /= normalLength
            normalZ /= normalLength
          } else {
            normalX = Math.cos(angle)
            normalY = 0
            normalZ = -Math.sin(angle)
          }
        }
        const distance = Math.hypot(x, vertexY, z)
        const clearance = surfaceRadius + 0.16 * Math.sin(Math.PI * gather)
        if (distance < clearance) {
          const scale = clearance / Math.max(distance, 0.00001)
          x *= scale
          vertexY *= scale
          z *= scale
        }
        const offset = (row * (columns + 1) + column) * 3
        positionArray[offset] = x
        positionArray[offset + 1] = vertexY
        positionArray[offset + 2] = z
        normalArray[offset] = normalX
        normalArray[offset + 1] = normalY
        normalArray[offset + 2] = normalZ
      }
    }
    positions.needsUpdate = true
    normals.needsUpdate = true
    return pasted
  }

  update(0)
  return {
    mesh,
    update,
    dispose() {
      geometry.dispose()
      material.dispose()
      reverseMaterial.dispose()
    },
  }
}
