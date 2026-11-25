import * as THREE from 'three'

export const TROPIC_LATITUDE = 23 + 26 / 60
export const POLAR_CIRCLE_LATITUDE = 66 + 34 / 60

export interface ThermalZoneDefinition {
  readonly id: string
  readonly name: string
  readonly south: number
  readonly north: number
  readonly color: string
  readonly opacity: number
  readonly labelLatitude: number
}

/** The five astronomical zones use fixed latitude boundaries, not seasonal offsets. */
export const THERMAL_ZONE_DEFINITIONS: readonly ThermalZoneDefinition[] = Object.freeze([
  { id: 'north-frigid', name: '北寒带', south: POLAR_CIRCLE_LATITUDE, north: 90, color: '#8ebeff', opacity: .14, labelLatitude: 70 },
  { id: 'north-temperate', name: '北温带', south: TROPIC_LATITUDE, north: POLAR_CIRCLE_LATITUDE, color: '#cbd69a', opacity: .11, labelLatitude: 45 },
  { id: 'tropical', name: '热带', south: -TROPIC_LATITUDE, north: TROPIC_LATITUDE, color: '#f2b17b', opacity: .14, labelLatitude: 0 },
  { id: 'south-temperate', name: '南温带', south: -POLAR_CIRCLE_LATITUDE, north: -TROPIC_LATITUDE, color: '#cbd69a', opacity: .11, labelLatitude: -45 },
  { id: 'south-frigid', name: '南寒带', south: -90, north: -POLAR_CIRCLE_LATITUDE, color: '#8ebeff', opacity: .14, labelLatitude: -70 },
].map(zone => Object.freeze(zone)))

export interface ThermalZoneScreenLabel {
  id: string
  text: string
  x: number
  y: number
  color: string
  opacity: number
  visible: boolean
  cls: 'thermal-zone-label'
}

/** Subtle, fixed latitude fills; attach group directly to the rotating Earth. */
export class ThermalZones {
  readonly group = new THREE.Group()
  readonly definitions = THERMAL_ZONE_DEFINITIONS
  private readonly labelRadius: number
  private readonly cameraLocal = new THREE.Vector3()
  private readonly cameraWorld = new THREE.Vector3()
  private readonly center = new THREE.Vector3()
  private readonly world = new THREE.Vector3()
  private readonly normal = new THREE.Vector3()
  private readonly toCamera = new THREE.Vector3()
  private disposed = false

  constructor(radius = 2.5) {
    if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('地球半径必须大于0')
    this.labelRadius = radius + .025
    this.group.name = 'earth-five-thermal-zones'
    this.group.visible = false
    for (const zone of this.definitions) {
      const geometry = new THREE.SphereGeometry(radius + .007, 160,
        Math.max(4, Math.ceil((zone.north - zone.south) / 1.5)), 0, Math.PI * 2,
        THREE.MathUtils.degToRad(90 - zone.north), THREE.MathUtils.degToRad(zone.north - zone.south))
      const material = new THREE.ShaderMaterial({
        uniforms: { zoneColor: { value: new THREE.Color(zone.color) }, zoneOpacity: { value: zone.opacity } },
        vertexShader: `varying vec2 zoneUv;
          void main(){ zoneUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `uniform vec3 zoneColor; uniform float zoneOpacity; varying vec2 zoneUv;
          void main(){
            float softEdge=smoothstep(0.,.055,zoneUv.y)*(1.-smoothstep(.945,1.,zoneUv.y));
            gl_FragColor=vec4(zoneColor,zoneOpacity*mix(.58,1.,softEdge));
            #include <colorspace_fragment>
          }`,
        transparent: true, depthTest: true, depthWrite: false, side: THREE.FrontSide,
        toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = `thermal-zone-${zone.id}`
      // Below climate GIS (1.5), pressure belts (2), and wind arrows. These five
      // coloured latitude patches must not become an opaque atmospheric shell.
      mesh.renderOrder = 1.25
      this.group.add(mesh)
    }
  }

  setVisible(visible: boolean) { this.group.visible = visible && !this.disposed }
  update(visible: boolean) { this.setVisible(visible) }

  /** Canvas-relative coordinates; hidden and back-facing labels are not returned. */
  projectLabels(camera: THREE.Camera, width: number, height: number): ThermalZoneScreenLabel[] {
    if (this.disposed || !this.group.visible || width <= 0 || height <= 0) return []
    for (let ancestor: THREE.Object3D | null = this.group.parent; ancestor; ancestor = ancestor.parent)
      if (!ancestor.visible) return []
    camera.updateWorldMatrix(true, false)
    this.group.updateWorldMatrix(true, false)
    camera.getWorldPosition(this.cameraWorld)
    this.cameraLocal.copy(this.cameraWorld)
    this.group.worldToLocal(this.cameraLocal)
    this.group.getWorldPosition(this.center)
    // Facing meridian rather than a frozen continent anchor: names identify a
    // complete latitude zone, and remain readable while the Earth rotates.
    const longitude = Math.hypot(this.cameraLocal.x, this.cameraLocal.z) > 1e-7
      ? Math.atan2(-this.cameraLocal.z, this.cameraLocal.x) : 0
    const labels: ThermalZoneScreenLabel[] = []
    for (const zone of this.definitions) {
      const latitude = THREE.MathUtils.degToRad(zone.labelLatitude)
      this.world.set(this.labelRadius * Math.cos(latitude) * Math.cos(longitude),
        this.labelRadius * Math.sin(latitude), -this.labelRadius * Math.cos(latitude) * Math.sin(longitude))
        .applyMatrix4(this.group.matrixWorld)
      this.normal.copy(this.world).sub(this.center).normalize()
      this.toCamera.copy(this.cameraWorld).sub(this.world).normalize()
      if (this.normal.dot(this.toCamera) <= .01) continue
      this.world.project(camera)
      if (Math.abs(this.world.x) >= 1 || Math.abs(this.world.y) >= 1 || Math.abs(this.world.z) >= 1) continue
      labels.push({ id: `thermal-zone-${zone.id}`, text: zone.name, x: (this.world.x + 1) * width / 2,
        y: (1 - this.world.y) * height / 2, color: zone.color, opacity: .92, visible: true, cls: 'thermal-zone-label' })
    }
    return labels
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    for (const object of this.group.children) {
      const mesh = object as THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>
      mesh.geometry.dispose(); mesh.material.dispose()
    }
    this.group.clear(); this.group.removeFromParent(); this.group.visible = false
  }
}
