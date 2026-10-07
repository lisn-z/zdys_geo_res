import * as THREE from 'three'
import { sampleNcepSlp } from '../ncep-slp-climatology.ts'
import { pressureColors, pressurePalette } from './pressure-data.ts'

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
    const material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float january; attribute float july; uniform float summerMix;
        varying float pressure;
        void main(){ pressure=mix(january,july,summerMix); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }
      `,
      fragmentShader: `
        varying float pressure; uniform float fill; uniform float lines; uniform float selected;
        uniform vec3 bandColors[9]; uniform vec3 lineColor;
        void main(){
          // Distinct 8 hPa bands with a narrow, continuous transition at each
          // boundary. Common pressures no longer collapse into one pale tint.
          vec3 tint=bandColors[0];
          for(int i=1;i<9;i++){
            float boundary=980.+8.*float(i);
            tint=mix(tint,bandColors[i],smoothstep(boundary-.8,boundary+.8,pressure));
          }
          float level=980.+8.*floor((pressure-980.)/8.+.5);
          float width=max(fwidth(pressure),.035);
          float contour=1.-smoothstep(width*.25,width*1.25,abs(pressure-level));
          contour*=step(980.,level)*step(level,1044.)*lines;
          float selectedLine=selected>0. ? (1.-smoothstep(width, max(width*5.,.6),abs(pressure-selected)))*lines : 0.;
          if(selected>0.) contour*=.3;
          float alpha=fill*.50;
          alpha=alpha+contour*.92*(1.-alpha);
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
        bandColors: { value: pressurePalette.map(color => new THREE.Color(color)) },
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
