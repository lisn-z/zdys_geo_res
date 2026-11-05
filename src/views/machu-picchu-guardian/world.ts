import * as THREE from 'three'
import type { WorldModel } from './types'
import { createWorldMaterials } from './world-materials'
import { createVisitors } from './world-visitors'
import { createDrainWater } from './world-water'
import { createValleyRiver } from './world-valley-water'
import { WorldGeometry, hash } from './world-geometry'
import { addTerrain, naturalHeight } from './world-terrain'
import { addFoundations, type FoundationSpec } from './world-foundations'
import { addLandmarks } from './world-landmarks'
import { addAccessPath } from './world-access'
import { WORLD_HORIZONTAL_SCALE, toCanonicalXZ, toWorldPoint, toWorldVec3 } from './world-scale'
import { WORLD_SITES, WORLD_SPAWN, WORLD_SPAWN_LOOK_AT, ROOM_LAYOUT, TERRACE_AREAS, PLAZA_AREAS, PLAZA_HEIGHTS, URBAN_PLATFORMS, WORLD_ROUTES, STAIR_LINKS, LANDMARK_SPECS, DRAIN_DEMO, drainBed, contourZ, type Point2 } from './world-layout'

/** Metric interpretation of the ridge's archaeological spatial order, based
 * on the official plan and historic photographs, not a measured survey. */
export function createWorld(): WorldModel {
  const group = new THREE.Group(); group.name = 'machu-picchu-archaeological-ridge'
  const materials = createWorldMaterials(), build = new WorldGeometry(materials), walkables: THREE.Object3D[] = []
  const foundations: FoundationSpec[] = []
  let disposed = false
  // Agriculture spans the southern ridge. The curved stone retaining walls
  // connect real field tops; the central stair is cut out of each field.
  for (const t of TERRACE_AREAS) {
    for (const [left, right] of [[t.left, -2.5], [2.5, t.right]] as const) {
      const points: Point2[] = []
      for (let j = 0; j <= 30; j++) { const x = left + (right - left) * j / 30; points.push([x, contourZ(t.band, x)]) }
      for (let j = 30; j >= 0; j--) { const x = left + (right - left) * j / 30; points.push([x, contourZ(t.band + 1, x)]) }
      foundations.push({ points, y: t.y, material: materials.terrace, name: 'agricultural-' + t.band })
      for (let j = 0; j < 40; j++) {
        const x0 = left + (right - left) * j / 40, x1 = left + (right - left) * (j + 1) / 40, z0 = contourZ(t.band, x0), z1 = contourZ(t.band, x1)
        const length = Math.hypot(x1 - x0, z1 - z0), angle = -Math.atan2(z1 - z0, x1 - x0)
        build.box(length + .012, .18, .46, (x0 + x1) / 2, t.y - .01, (z0 + z1) / 2, materials.stone, angle)
      }
    }
    build.stairs([0, contourZ(t.band, 0)], [0, contourZ(t.band + 1, 0)], t.band === 0 ? 24 : t.y - 2.15, t.y, 5)
  }
  // Western ceremonial districts sit above the eastern residential shelves.
  // The central grass sequence contains six distinct levels, not a flat field.
  for (const platform of URBAN_PLATFORMS) {
    const holes: Point2[][] = platform.id === 'southern-entry-and-water'
      ? [[[DRAIN_DEMO.x - .38, DRAIN_DEMO.z0], [DRAIN_DEMO.x + .38, DRAIN_DEMO.z0], [DRAIN_DEMO.x + .38, DRAIN_DEMO.z0 + DRAIN_DEMO.length], [DRAIN_DEMO.x - .38, DRAIN_DEMO.z0 + DRAIN_DEMO.length]]] : []
    // Lower cross-flights enter the tall western platforms below their caps.
    // These genuine openings remove the cap above the lower part of the flight.
    if (platform.id === 'western-sacred') holes.push([[-30.1, -74.1], [-24, -74.1], [-24, -69.9], [-30.1, -69.9]])
    if (platform.id === 'western-upper-north') holes.push([[-30.1, -139.1], [-24, -139.1], [-24, -134.9], [-30.1, -134.9]])
    foundations.push({ points: platform.points, y: platform.y, material: platform.id.startsWith('western') ? materials.soil : materials.grass, holes, name: platform.id })
  }
  PLAZA_AREAS.forEach((points, index) => foundations.push({ points, y: PLAZA_HEIGHTS[index]!, material: materials.grass, name: 'central-plaza-' + index }))
  for (const link of STAIR_LINKS) build.stairs(link.a, link.b, link.fromY, link.toY, link.width)
  build.stairLanding(4.2, 4.2, -28, 30, -72)
  build.stairLanding(4.2, 4.2, -28, 33, -137)
  build.walkBox(4.2, 1.1, 8.4, 98, 8, -91.8, materials.soil)
  ROOM_LAYOUT.forEach(spec => build.room(spec))
  addLandmarks(build, materials, LANDMARK_SPECS)
  group.userData.accessPath = addAccessPath(build, materials, naturalHeight)
  group.userData.foundations = addFoundations(build, foundations, naturalHeight, materials.rock)
  // Six-metre classroom drain with a true opening and separate bed/bank tops.
  const drainX = DRAIN_DEMO.x, drainZ0 = DRAIN_DEMO.z0, drainLength = DRAIN_DEMO.length, bed = drainBed
  const bedGeometry = new THREE.PlaneGeometry(.46, drainLength, 1, 24); bedGeometry.rotateX(-Math.PI / 2)
  const bp = bedGeometry.getAttribute('position')
  for (let i = 0; i < bp.count; i++) { const z = bp.getZ(i) + drainZ0 + drainLength / 2; bp.setXYZ(i, drainX + bp.getX(i), bed(z), z) }
  build.add(bedGeometry, materials.stone, true)
  for (const x of [drainX - .32, drainX + .32]) build.box(.18, .42, drainLength, x, 23.79, drainZ0 + drainLength / 2, materials.stone)
  for (const bridge of DRAIN_DEMO.bridges) build.walkBox(bridge.halfWidth * 2, .10, bridge.halfLength * 2, drainX, 24.02, bridge.z)
  const drainWater = createDrainWater(materials.water, { ...DRAIN_DEMO, bed }); group.add(drainWater.group)
  const valleyRiver = createValleyRiver(materials.water); group.add(valleyRiver.group)
  const blockage = new THREE.Group(); blockage.name = 'removable-leaves-and-sediment'; group.add(blockage)
  for (let i = 0; i < 7; i++) {
    const h = i % 3 ? .05 : .25, g = new THREE.BoxGeometry(.12 + hash(i, 1) * .10, h, .16 + hash(i, 2) * .10), mesh = new THREE.Mesh(g, i % 3 ? materials.wood : materials.stone)
    const z = DRAIN_DEMO.blockZ + (hash(i, 4) - .5) * .4; mesh.position.set(drainX + (hash(i, 3) - .5) * .26, i % 3 ? 23.89 : bed(z) + h / 2, z); mesh.rotation.y = i * 1.4; blockage.add(mesh)
  }
  function setDrain(clear: boolean): void { blockage.visible = !clear; drainWater.setDrain(clear) }
  setDrain(false)
  const terrainHeight = addTerrain(build, materials.mountain, materials.soil)
  // Small grass rosettes have open curved blades, not solid bush spheres. They
  // sit on terrace edges and leave fields and historic stonework legible.
  const leaves: number[] = [], leafColors: number[] = []
  for (let leaf = 0; leaf < 7; leaf++) {
    const angle = leaf * 2.399, length = .08 + hash(leaf, 5) * .10, width = .006 + hash(leaf, 6) * .006
    const sample = (t: number, side: number): number[] => {
      const reach = length * (.23 * t + .77 * t * t), taper = width * Math.sin(Math.PI * t) * side
      return [Math.cos(angle) * reach + Math.sin(angle) * taper, length * (1.18 * t - .83 * t * t), Math.sin(angle) * reach - Math.cos(angle) * taper]
    }
    const color = new THREE.Color().setHSL(.23 + hash(leaf, 7) * .025, .23, .31 + hash(leaf, 8) * .08)
    for (let s = 0; s < 5; s++) { const a = sample(s / 5, -1), b = sample(s / 5, 1), c = sample((s + 1) / 5, -1), d = sample((s + 1) / 5, 1); leaves.push(...a, ...b, ...c, ...b, ...d, ...c); for (let k = 0; k < 6; k++) leafColors.push(color.r, color.g, color.b) }
  }
  const plantGeometry = new THREE.BufferGeometry(); plantGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leaves, 3)); plantGeometry.setAttribute('color', new THREE.Float32BufferAttribute(leafColors, 3)); plantGeometry.computeVertexNormals()
  const plants = new THREE.InstancedMesh(plantGeometry, materials.plant, 960), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(), point = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < 960; i++) {
    const t = TERRACE_AREAS[i % TERRACE_AREAS.length]!, x0 = t.left + .55 + hash(i, 70) * (t.right - t.left - 1.1), x = Math.abs(x0) < 2.8 ? 5.2 : x0
    const z = contourZ(t.band + .18 + hash(i, 71) * .70, x)
    point.set(x, t.y + .008, z); rotation.setFromAxisAngle(up, hash(i, 72) * 6.283); scale.setScalar(.55 + hash(i, 73) * .35); matrix.compose(point, rotation, scale); plants.setMatrixAt(i, matrix)
  }
  plants.receiveShadow = true; group.add(plants)
  build.finish(group, walkables)
  // All terrain, ruins, plants and drainage objects still use canonical local
  // coordinates, including their animations. People are added to the unscaled
  // outer group below so their height and shoulder width remain human-sized.
  const landscape = new THREE.Group(); landscape.name = 'canonical-landscape-scaled'
  landscape.add(...group.children.slice()); landscape.scale.set(WORLD_HORIZONTAL_SCALE, 1, WORLD_HORIZONTAL_SCALE); group.add(landscape)
  const horizontalMatrix = new THREE.Matrix4().makeScale(WORLD_HORIZONTAL_SCALE, 1, WORLD_HORIZONTAL_SCALE)
  for (const collider of build.colliders) collider.applyMatrix4(horizontalMatrix)
  group.updateMatrixWorld(true)
  const ray = new THREE.Raycaster(), origin = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0)
  function floorHeight(x: number, z: number): number { origin.set(x, 600, z); ray.set(origin, down); return ray.intersectObjects(walkables, false)[0]?.point.y ?? terrainHeight(toCanonicalXZ(x), toCanonicalXZ(z)) }
  const visitorRoutes = { original: WORLD_ROUTES.original.map(toWorldPoint), guided: WORLD_ROUTES.guided.map(route => route.map(toWorldPoint)) }
  const visitors = createVisitors(floorHeight, visitorRoutes); group.add(visitors.group)
  const sites = WORLD_SITES.map(site => ({ ...site, position: toWorldVec3(site.position), arrival: toWorldVec3(site.arrival), lookAt: toWorldVec3(site.lookAt) }))
  for (const site of sites) site.arrival[1] = floorHeight(site.arrival[0], site.arrival[2])
  group.userData.worldHorizontalScale = WORLD_HORIZONTAL_SCALE; group.userData.educationalReconstruction = true; group.userData.roomCount = ROOM_LAYOUT.length; group.userData.landmarkCount = LANDMARK_SPECS.length; group.userData.terraceCount = TERRACE_AREAS.length; group.userData.reference = 'official-2024-plan / Bingham historical panorama / real southern photographs'
  return {
    group, walkables, colliders: build.colliders, sites, spawn: toWorldVec3(WORLD_SPAWN), spawnLookAt: toWorldVec3(WORLD_SPAWN_LOOK_AT), setDrain,
    setVisitorPlan(plan) { visitors.setPlan(plan) }, setVisitorsPlaying(playing) { visitors.setPlaying(playing) }, resetVisitors() { visitors.reset() },
    update(time, delta) {
      if (disposed) return
      materials.update(time); visitors.update(time, delta); drainWater.update(time, delta); valleyRiver.update()
    },
    dispose() {
      if (disposed) return
      disposed = true
      const geometries = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
      group.traverse(object => { if (!(object instanceof THREE.Mesh)) return; geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) mats.add(material); if (object instanceof THREE.InstancedMesh) object.dispose() })
      mats.forEach(material => { for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value) })
      geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); materials.dispose(textures)
    },
  }
}
