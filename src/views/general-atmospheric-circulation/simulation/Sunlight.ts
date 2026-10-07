import * as THREE from 'three'
import { damp, subsolarLatitude } from './model.ts'

// Latitude reference only; no subsolar longitude or footprint is computed.
export class Sunlight {
  readonly group = new THREE.Group()
  latitude = 0
  private intensity = { value: 0 }
  private highlight = { value: 0 }
  private geometry = new THREE.PlaneGeometry(1, 1, 360, 1)
  private worldRotation = new THREE.Quaternion()
  private radius: number

  constructor(radius: number) {
    this.radius = radius + .032
    const material = new THREE.ShaderMaterial({
      uniforms: { intensity: this.intensity, highlight: this.highlight },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv; uniform float intensity; uniform float highlight;
        void main(){float edge=abs(vUv.y-.5)*2.;
        float alpha=1.-smoothstep(.35,1.,edge);
        gl_FragColor=vec4(mix(vec3(1.,.84,.42),vec3(1.),highlight*.6),alpha*intensity);}`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    })
    const ring = new THREE.Mesh(this.geometry, material)
    ring.frustumCulled = false
    ring.renderOrder = 5
    this.group.add(ring)
    this.update(3, false, false, false, 1, 0)
  }

  getWorldDirection(target: THREE.Vector3) {
    // This longitude is only a lighting choice, never presented as a measured point.
    const lat = this.latitude * Math.PI / 180, lon = -55 * Math.PI / 180
    this.group.updateWorldMatrix(true, false)
    return target.set(Math.cos(lat)*Math.cos(lon), Math.sin(lat), -Math.cos(lat)*Math.sin(lon))
      .applyQuaternion(this.group.getWorldQuaternion(this.worldRotation)).normalize()
  }

  update(month: number, ideal: boolean, enabled: boolean, _playing: boolean, _speed: number, dt: number, selected = false) {
    this.latitude = damp(this.latitude, ideal ? 0 : subsolarLatitude(month), dt)
    this.highlight.value = damp(this.highlight.value, selected ? 1 : 0, dt)
    this.intensity.value = damp(this.intensity.value, enabled ? 1 : 0, dt)
    this.group.visible = this.intensity.value > .005
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute
    const uv = this.geometry.getAttribute('uv')
    for (let i = 0; i < positions.count; i++) {
      const lat = (this.latitude + (uv.getY(i) - .5) * .65) * Math.PI / 180
      const lon = uv.getX(i) * Math.PI * 2
      positions.setXYZ(i, this.radius*Math.cos(lat)*Math.cos(lon), this.radius*Math.sin(lat), -this.radius*Math.cos(lat)*Math.sin(lon))
    }
    positions.needsUpdate = true
  }
}
