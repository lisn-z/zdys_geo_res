import * as THREE from 'three'

export interface PressureValueLabel {
  id: string
  text: string
  lat: number
  lon: number
  value: number
  opacity: number
  color: string
  contourId: string
}

export interface ActivePressureValue {
  readonly label: Readonly<PressureValueLabel>
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
}
interface TextPatch {
  id: string
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  textKey: string
  lat: number
  lon: number
  width: number
}

const PATCH_HEIGHT = .18
const POOL_LIMIT = 14

/** Transparent text follows the sphere, with a bounded reusable texture pool. */
export class PressureValueText {
  readonly group = new THREE.Group()
  private pool: TextPatch[] = []
  private activePatches: ActivePressureValue[] = []

  constructor(private radius: number) {
    this.group.name = 'pressure-value-text-patches'
    this.group.visible = false
  }

  get active(): readonly ActivePressureValue[] { return this.activePatches }

  hide() {
    this.group.visible = false
    for (const patch of this.pool) patch.mesh.visible = false
    this.activePatches = []
  }

  private createPatch(): TextPatch {
    const canvas = document.createElement('canvas')
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 6), new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthTest: true, depthWrite: false,
      side: THREE.FrontSide, toneMapped: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    }))
    mesh.name = 'pressure-value-text'
    mesh.renderOrder = 4
    const patch = { id: '', canvas, texture, mesh, textKey: '', lat: NaN, lon: NaN, width: 0 }
    this.pool.push(patch)
    this.group.add(mesh)
    return patch
  }

  update(labels: readonly PressureValueLabel[]) {
    const selected = labels.slice(0, POOL_LIMIT)
    const selectedIds = new Set(selected.map(label => label.id))
    const used = new Set<TextPatch>()
    this.activePatches = []
    for (const patch of this.pool) patch.mesh.visible = false
    for (const label of selected) {
      let patch = this.pool.find(item => item.id === label.id && !used.has(item))
      patch ??= this.pool.find(item => !used.has(item) && !selectedIds.has(item.id))
      patch ??= this.createPatch()
      used.add(patch)
      patch.id = label.id
      const textKey = `${label.text}:${label.color}`
      if (patch.textKey !== textKey) {
        let ctx = patch.canvas.getContext('2d')!
        ctx.font = '500 58px "Microsoft YaHei", sans-serif'
        patch.canvas.width = Math.ceil(ctx.measureText(label.text).width + 28)
        patch.canvas.height = 96
        ctx = patch.canvas.getContext('2d')!
        // Clear only: there is deliberately no colored rectangle behind the text.
        ctx.clearRect(0, 0, patch.canvas.width, patch.canvas.height)
        ctx.font = '500 58px "Microsoft YaHei", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineJoin = 'round'
        ctx.lineWidth = 7
        ctx.strokeStyle = 'rgba(7, 17, 28, .94)'
        ctx.shadowColor = 'rgba(3, 11, 23, .75)'
        ctx.shadowBlur = 3
        ctx.strokeText(label.text, patch.canvas.width / 2, 48)
        ctx.fillStyle = label.color
        ctx.fillText(label.text, patch.canvas.width / 2, 48)
        patch.texture.needsUpdate = true
        const width = patch.canvas.width / patch.canvas.height * PATCH_HEIGHT
        if (patch.width !== width) patch.lat = NaN
        patch.width = width
        patch.textKey = textKey
      }
      if (patch.lat !== label.lat || patch.lon !== label.lon) {
        const lat = label.lat * Math.PI / 180, lon = label.lon * Math.PI / 180
        const normal = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
        const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon))
        const north = new THREE.Vector3(-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon))
        const positions = patch.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
        const uv = patch.mesh.geometry.getAttribute('uv')
        const point = new THREE.Vector3()
        for (let i = 0; i < positions.count; i++) {
          point.copy(normal).multiplyScalar(this.radius)
            .addScaledVector(east, (uv.getX(i) - .5) * patch.width)
            .addScaledVector(north, (uv.getY(i) - .5) * PATCH_HEIGHT)
            .normalize().multiplyScalar(this.radius)
          positions.setXYZ(i, point.x, point.y, point.z)
        }
        positions.needsUpdate = true
        patch.mesh.geometry.computeBoundingSphere()
        patch.lat = label.lat
        patch.lon = label.lon
      }
      patch.mesh.visible = true
      patch.mesh.material.opacity = label.opacity
      const metadata = Object.freeze({ ...label })
      patch.mesh.userData.pressureValue = metadata
      this.activePatches.push({ label: metadata, mesh: patch.mesh })
    }
    this.group.visible = this.activePatches.length > 0
  }

  // The parent scene owns geometry/material disposal; release CanvasTextures here.
  dispose() {
    this.hide()
    for (const patch of this.pool) patch.texture.dispose()
    this.pool = []
  }
}
