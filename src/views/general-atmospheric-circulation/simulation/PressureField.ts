import * as THREE from 'three'
import { sampleNcepSlp } from '../ncep-slp-climatology.ts'
import { pressureColors, pressureFillScaleForMonth, pressureLevels, pressureMajorInterval } from './pressure-data.ts'

// Data lives in vertex attributes, never in an additional Earth image texture.
export class PressureField {
  // Blend is a visual transition between the two climatological fields, not new monthly data.
  readonly summerMix = { value: 1 }
  readonly fill = { value: 0 }
  readonly lines = { value: 0 }
  readonly selected = { value: -1 }
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>

  constructor(radius: number) {
    const positions: number[] = [],
      january: number[] = [],
      july: number[] = [],
      indices: number[] = []
    const cols = 288,
      rows = 144
    for (let row = 0; row <= rows; row++) {
      const lat = 90 - row * 1.25,
        phi = (lat * Math.PI) / 180
      for (let col = 0; col <= cols; col++) {
        const lon = col * 1.25,
          theta = (lon * Math.PI) / 180
        positions.push(
          radius * Math.cos(phi) * Math.cos(theta),
          radius * Math.sin(phi),
          -radius * Math.cos(phi) * Math.sin(theta),
        )
        january.push(sampleNcepSlp('january', lon, lat))
        july.push(sampleNcepSlp('july', lon, lat))
        if (row < rows && col < cols) {
          const a = row * (cols + 1) + col,
            b = a + cols + 1
          indices.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('january', new THREE.Float32BufferAttribute(january, 1))
    geometry.setAttribute('july', new THREE.Float32BufferAttribute(july, 1))
    geometry.setIndex(indices)
    const scaleUniforms = (month: 1 | 7) => {
      const scale = pressureFillScaleForMonth(month)
      const colors = scale.colors.map(color => new THREE.Color(color))
      const boundaries = [...scale.levels]
      while (colors.length < 10) colors.push(colors[colors.length - 1]!.clone())
      while (boundaries.length < 9) boundaries.push(1e5)
      return { colors, boundaries }
    }
    const januaryScale = scaleUniforms(1), julyScale = scaleUniforms(7)
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float january; attribute float july; uniform float summerMix;
        varying float pressure;
        void main(){ pressure=mix(january,july,summerMix); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
      `,
      fragmentShader: `
        varying float pressure; uniform float fill; uniform float lines; uniform float selected;
        uniform vec3 januaryColors[10]; uniform float januaryBoundaries[9];
        uniform vec3 julyColors[10]; uniform float julyBoundaries[9]; uniform float summerMix;
        uniform vec3 lineColor; uniform float majorInterval; uniform vec2 contourRange;
        void main(){
          // Use the printed pressure thresholds directly. Only a narrow
          // antialiasing transition straddles each exact color-zone boundary.
          vec3 winterTint=januaryColors[0], summerTint=julyColors[0];
          for(int i=1;i<10;i++){
            float winterBoundary=januaryBoundaries[i-1], summerBoundary=julyBoundaries[i-1];
            winterTint=mix(winterTint,januaryColors[i],smoothstep(winterBoundary-.12,winterBoundary+.12,pressure));
            summerTint=mix(summerTint,julyColors[i],smoothstep(summerBoundary-.12,summerBoundary+.12,pressure));
          }
          vec3 tint=mix(winterTint,summerTint,summerMix);
          float level=majorInterval*floor(pressure/majorInterval+.5);
          float derivative=max(fwidth(pressure),.025);
          float width=min(derivative,majorInterval*.22);
          float mainLine=1.-smoothstep(width*.2,width*1.02,abs(pressure-level));
          float julyExtra=(1.-smoothstep(width*.2,width*1.02,abs(pressure-1026.)))*summerMix;
          float contour=max(mainLine,julyExtra)*.85;
          contour*=step(contourRange.x,level)*step(level,contourRange.y)*lines;
          float selectedLine=selected>0. ? (1.-smoothstep(width, max(width*5.,.6),abs(pressure-selected)))*lines : 0.;
          if(selected>0.) contour*=.3;
          // Every range, including the wide pale middle bands, has the same
          // visible coverage. Pressure must not introduce transparency holes.
          tint*=.98;
          float alpha=fill*.60;
          alpha=alpha+contour*(1.-alpha);
          alpha=alpha+selectedLine*.95*(1.-alpha);
          if(alpha<.003) discard;
          gl_FragColor=vec4(mix(mix(tint,lineColor,contour),vec3(1.,.85,.48),selectedLine),alpha);
          #include <colorspace_fragment>
        }
      `,
      uniforms: {
        summerMix: this.summerMix,
        fill: this.fill,
        lines: this.lines,
        selected: this.selected,
        majorInterval: { value: pressureMajorInterval },
        contourRange: { value: new THREE.Vector2(pressureLevels[0]!, pressureLevels[pressureLevels.length - 1]!) },
        januaryColors: { value: januaryScale.colors },
        januaryBoundaries: { value: januaryScale.boundaries },
        julyColors: { value: julyScale.colors },
        julyBoundaries: { value: julyScale.boundaries },
        lineColor: { value: new THREE.Color(pressureColors.line) },
      },
      transparent: true,
      toneMapped: false,
      depthWrite: false,
      side: THREE.FrontSide,
    })
    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.renderOrder = 1
  }
}
