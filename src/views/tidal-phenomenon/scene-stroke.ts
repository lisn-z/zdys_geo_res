import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'

export interface StrokeStyle {
  color?: THREE.ColorRepresentation
  width: number
  opacity?: number
  dashSize?: number
  gapSize?: number
  glowWidth?: number
  glowOpacity?: number
  vertexColors?: boolean
  segments?: boolean
}

// Screen-space widths stay consistent when the camera or floating panels move.
// Line2 updates its viewport resolution before each draw, including on resize.
export class SceneStroke extends THREE.Group {
  readonly geometry: LineSegmentsGeometry
  readonly materials: LineMaterial[] = []
  private readonly stroke: LineSegments2
  private readonly segments: boolean
  private readonly dashed: boolean
  private pointCount = 0

  constructor(positions: number[] | Float32Array, style: StrokeStyle) {
    super()
    this.segments = style.segments ?? false
    this.dashed = style.dashSize !== undefined
    this.geometry = this.segments ? new LineSegmentsGeometry() : new LineGeometry()
    this.renderOrder = 5

    const makeLayer = (width: number, opacity: number, glow = false) => {
      const material = new LineMaterial({
        color: style.color ?? 0xffffff,
        linewidth: width,
        opacity,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        toneMapped: false,
        alphaToCoverage: true,
        vertexColors: style.vertexColors ?? false,
        dashed: this.dashed,
        dashSize: style.dashSize ?? 1,
        gapSize: style.gapSize ?? 1,
      })
      // Preserve opacity at round joins: the stock AA shader replaces it with
      // coverage, which turns a translucent halo into bright dots at vertices.
      material.fragmentShader = material.fragmentShader.replace(
        /alpha = 1\.0 - smoothstep/g, 'alpha *= 1.0 - smoothstep',
      )
      if (glow) {
        material.fragmentShader = material.fragmentShader.replace(
          'gl_FragColor = vec4( diffuseColor.rgb, alpha );',
          'alpha *= 1.0 - smoothstep(0.1, 1.0, abs(vUv.x));\ngl_FragColor = vec4( diffuseColor.rgb, alpha );',
        )
      }
      this.materials.push(material)
      const line = this.segments
        ? new LineSegments2(this.geometry, material)
        : new Line2(this.geometry as LineGeometry, material)
      this.add(line)
      return line
    }

    if (style.glowWidth) makeLayer(style.glowWidth, style.glowOpacity ?? 0.1, true)
    this.stroke = makeLayer(style.width, style.opacity ?? 1)
    this.stroke.renderOrder = 1
    this.setPositions(positions)
  }

  setPositions(positions: number[] | Float32Array) {
    const count = positions.length / 3
    if (count !== this.pointCount) {
      this.geometry.setPositions(positions)
      this.pointCount = count
    } else {
      // Reuse the interleaved GPU buffer for the moving Earth–Moon line.
      const start = this.geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute
      const end = this.geometry.getAttribute('instanceEnd') as THREE.InterleavedBufferAttribute
      for (let index = 0; index < start.count; index++) {
        const offset = index * (this.segments ? 6 : 3)
        start.setXYZ(index, positions[offset]!, positions[offset + 1]!, positions[offset + 2]!)
        end.setXYZ(index, positions[offset + 3]!, positions[offset + 4]!, positions[offset + 5]!)
      }
      start.data.needsUpdate = true
      this.geometry.computeBoundingBox()
      this.geometry.computeBoundingSphere()
    }
    if (this.dashed) this.stroke.computeLineDistances()
  }

  setColors(colors: number[] | Float32Array) {
    this.geometry.setColors(colors)
  }

  dispose() {
    this.geometry.dispose()
    this.materials.forEach((material) => material.dispose())
  }
}
