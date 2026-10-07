import * as THREE from 'three'
import { formatPressure, pressureCenterAnchors, pressureColors } from './pressure-data.ts'

type Center = ReturnType<typeof pressureCenterAnchors>[number]
const PATCH_HEIGHT = .33
interface TextPatch {
  canvas: HTMLCanvasElement
  texture: THREE.CanvasTexture
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  text: string
  lat: number
  lon: number
  width: number
}

// Transparent text patches conform to the sphere, rather than facing the camera.
export class PressureCenterText {
  readonly group = new THREE.Group()
  private patches = new Map<string, TextPatch>()

  constructor(private radius: number) {}

  update(centers: Center[], visible: boolean, opacity: number, selectedId = '') {
    this.group.visible = visible
    if (!visible) return
    for (const patch of this.patches.values()) patch.mesh.visible = false
    for (const center of centers) {
      let patch = this.patches.get(center.id)
      if (!patch) {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        context.font = '600 60px "Microsoft YaHei", sans-serif'
        const titleWidth = context.measureText(`${center.symbol}  ${center.name}`).width
        context.font = '500 46px "Microsoft YaHei", sans-serif'
        const valueWidth = context.measureText(formatPressure(center.value)).width
        canvas.width = Math.ceil(Math.max(titleWidth, valueWidth) + 48)
        canvas.height = 192
        const texture = new THREE.CanvasTexture(canvas)
        texture.colorSpace = THREE.SRGBColorSpace
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthTest: true,
          depthWrite: false,
          side: THREE.FrontSide,
          toneMapped: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 24, 8), material)
        mesh.renderOrder = 4
        patch = { canvas, texture, mesh, text: '', lat: NaN, lon: NaN, width: (canvas.width / canvas.height) * PATCH_HEIGHT }
        this.patches.set(center.id, patch)
        this.group.add(mesh)
      }
      patch.mesh.visible = true
      patch.mesh.userData.center = center
      const selected = center.id === selectedId
      patch.mesh.material.opacity = center.opacity * opacity * (selectedId && !selected ? .4 : 1)
      const pressure = formatPressure(center.value)
      const textKey = `${pressure}:${selected}`
      if (patch.text !== textKey) {
        const ctx = patch.canvas.getContext('2d')!
        const x = patch.canvas.width / 2
        ctx.clearRect(0, 0, patch.canvas.width, patch.canvas.height)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = 'rgba(10, 20, 28, .92)'
        ctx.lineWidth = 9
        ctx.font = '600 60px "Microsoft YaHei", sans-serif'
        ctx.fillStyle = center.symbol === 'H' ? pressureColors.highText : pressureColors.lowText
        ctx.shadowColor = ctx.fillStyle
        ctx.shadowBlur = selected ? 20 : 0
        const title = `${center.symbol}  ${center.name}`
        ctx.strokeText(title, x, 63)
        ctx.fillText(title, x, 63)
        ctx.font = '500 46px "Microsoft YaHei", sans-serif'
        ctx.fillStyle = '#fff9ec'
        ctx.strokeText(pressure, x, 133)
        ctx.fillText(pressure, x, 133)
        patch.texture.needsUpdate = true
        patch.text = textKey
      }
      if (patch.lat !== center.lat || patch.lon !== center.lon) {
        const lat = (center.lat * Math.PI) / 180,
          lon = (center.lon * Math.PI) / 180
        const normal = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon))
        const east = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon))
        const north = new THREE.Vector3(-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon))
        const position = patch.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
        const uv = patch.mesh.geometry.getAttribute('uv')
        const point = new THREE.Vector3()
        for (let i = 0; i < position.count; i++) {
          point
            .copy(normal)
            .multiplyScalar(this.radius)
            .addScaledVector(east, (uv.getX(i) - 0.5) * patch.width)
            .addScaledVector(north, (uv.getY(i) - 0.5) * PATCH_HEIGHT)
            .normalize()
            .multiplyScalar(this.radius)
          position.setXYZ(i, point.x, point.y, point.z)
        }
        position.needsUpdate = true
        patch.mesh.geometry.computeBoundingSphere()
        patch.lat = center.lat
        patch.lon = center.lon
      }
    }
  }

  pick(raycaster: THREE.Raycaster): Center | null {
    if (!this.group.visible) return null
    const meshes = [...this.patches.values()]
      .filter((patch) => patch.mesh.visible && patch.mesh.material.opacity > 0.15)
      .map((patch) => patch.mesh)
    const hit = raycaster.intersectObjects(meshes, false)[0]
    return hit ? (hit.object.userData.center as Center) : null
  }

  // Scene traversal owns mesh geometry/material disposal; CanvasTextures are separate resources.
  dispose() {
    for (const patch of this.patches.values()) patch.texture.dispose()
    this.patches.clear()
  }
}
