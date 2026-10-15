import * as THREE from 'three'
import { EARTH_AXIAL_TILT_DEGREES } from './earthOrientation'

export interface EarthGridVisibility {
  grid: boolean
  equator: boolean
  tropics: boolean
  polarCircles: boolean
}

/** 与 earth-motion 一致：15° 间隔、浅青色细线，贴合地球而非黄道面。 */
export function createEarthGraticule(radius: number) {
  const group = new THREE.Group()
  group.name = 'earth-graticule'
  group.visible = false
  group.scale.setScalar(radius)
  const grid = new THREE.Group()
  grid.name = 'grid'
  group.add(grid)
  const material = new THREE.LineBasicMaterial({
    color: 0xa8fff6,
    transparent: true,
    opacity: 0.23,
    depthTest: true,
    depthWrite: false,
  })
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = [material]

  function point(latitude: number, longitude: number, surfaceRadius: number) {
    const lat = THREE.MathUtils.degToRad(latitude)
    const lon = THREE.MathUtils.degToRad(longitude)
    return new THREE.Vector3(
      Math.cos(lon) * Math.cos(lat) * surfaceRadius,
      Math.sin(lat) * surfaceRadius,
      -Math.sin(lon) * Math.cos(lat) * surfaceRadius,
    )
  }

  function addLine(parent: THREE.Group, name: string, points: THREE.Vector3[], lineMaterial = material) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    geometries.push(geometry)
    const line = new THREE.Line(geometry, lineMaterial)
    line.name = name
    line.renderOrder = 3
    if (lineMaterial instanceof THREE.LineDashedMaterial) line.computeLineDistances()
    parent.add(line)
  }

  for (let longitude = 0; longitude < 360; longitude += 15) {
    const points: THREE.Vector3[] = []
    for (let latitude = -90; latitude <= 90; latitude += 3) {
      points.push(point(latitude, longitude, 1.006))
    }
    addLine(grid, `longitude-${longitude}`, points)
  }
  for (let latitude = -75; latitude <= 75; latitude += 15) {
    const points: THREE.Vector3[] = []
    for (let longitude = -180; longitude <= 180; longitude += 3) {
      points.push(point(latitude, longitude, 1.007))
    }
    addLine(grid, `latitude-${latitude}`, points)
  }

  const highlightLayers = [
    { key: 'equator', latitudes: [0], color: 0xff4058, opacity: 0.98, dashSize: 0 },
    { key: 'tropics', latitudes: [-EARTH_AXIAL_TILT_DEGREES, EARTH_AXIAL_TILT_DEGREES], color: 0xffd447, opacity: 0.98, dashSize: 0.085 },
    { key: 'polarCircles', latitudes: [-(90 - EARTH_AXIAL_TILT_DEGREES), 90 - EARTH_AXIAL_TILT_DEGREES], color: 0x66d9ff, opacity: 0.9, dashSize: 0.07 },
  ] as const
  for (const definition of highlightLayers) {
    const layer = new THREE.Group()
    layer.name = definition.key
    layer.visible = false
    group.add(layer)
    const common = { color: definition.color, opacity: definition.opacity, transparent: true, depthTest: true, depthWrite: false }
    // earth-motion 半径为 1.35；把虚线节距归一化，缩放时保持同样的视觉密度。
    const lineMaterial = definition.dashSize
      ? new THREE.LineDashedMaterial({ ...common, dashSize: definition.dashSize / 1.35, gapSize: 0.055 / 1.35 })
      : new THREE.LineBasicMaterial(common)
    materials.push(lineMaterial)
    for (const latitude of definition.latitudes) {
      const points: THREE.Vector3[] = []
      for (let longitude = -180; longitude <= 180; longitude += 2) {
        points.push(point(latitude, longitude, 1.012))
      }
      addLine(layer, `latitude-${latitude}`, points, lineMaterial)
    }
  }

  function setVisibility(visibility: EarthGridVisibility, surfaceView = false) {
    group.visible = !surfaceView && Object.values(visibility).some(Boolean)
    group.children.forEach(layer => {
      layer.visible = visibility[layer.name as keyof EarthGridVisibility]
    })
    // 红色赤道开启时隐藏重合的普通纬线，避免叠色和闪烁。
    grid.getObjectByName('latitude-0')!.visible = !visibility.equator
  }

  return {
    group,
    setVisibility,
    setRadius: (nextRadius: number) => group.scale.setScalar(nextRadius),
    dispose() {
      group.removeFromParent()
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(item => item.dispose())
      group.clear()
    },
  }
}
