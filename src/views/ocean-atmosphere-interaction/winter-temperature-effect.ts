import * as THREE from 'three'
import { geoToWorld } from './world'

/** A qualitative winter-temperature cue; its footprint is illustrative, not observed data. */
export function createWinterTemperatureEffect(terrain: THREE.Group, mode: 'warm' | 'cold'): THREE.Group {
  const group = new THREE.Group()
  group.name = `china-winter-${mode}-tendency`
  group.userData.qualitative = true
  const center = geoToWorld(113.5, 33.5)
  const west = geoToWorld(105, 33.5), north = geoToWorld(113.5, 42)
  const radius = new THREE.Vector2(Math.abs(center.x - west.x), Math.abs(center.z - north.z))
  const positions: number[] = []
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), normal = new THREE.Vector3()
  terrain.updateWorldMatrix(true, true)
  // Effects and terrain share the world parent. Preserve the terrain's own transforms.
  const parentInverse = terrain.parent?.matrixWorld.clone().invert() ?? new THREE.Matrix4()
  const transform = new THREE.Matrix4()
  terrain.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const geometry = object.geometry as THREE.BufferGeometry
    const source = geometry.getAttribute('position'), index = geometry.getIndex()
    if (!source) return
    transform.multiplyMatrices(parentInverse, object.matrixWorld)
    const count = index?.count ?? source.count
    for (let i = 0; i + 2 < count; i += 3) {
      a.fromBufferAttribute(source, index ? index.getX(i) : i).applyMatrix4(transform)
      b.fromBufferAttribute(source, index ? index.getX(i + 1) : i + 1).applyMatrix4(transform)
      c.fromBufferAttribute(source, index ? index.getX(i + 2) : i + 2).applyMatrix4(transform)
      if (Math.min(a.y, b.y, c.y) <= .04) continue
      if (Math.max(a.x, b.x, c.x) < center.x - radius.x || Math.min(a.x, b.x, c.x) > center.x + radius.x
        || Math.max(a.z, b.z, c.z) < center.z - radius.y || Math.min(a.z, b.z, c.z) > center.z + radius.y) continue
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a))
      if (normal.y <= 1e-9) continue
      // Copy the actual triangles, including the exact coastal silhouette. No
      // sampling grid can bridge a bay or leave square gaps along the relief.
      for (const p of [a, b, c]) positions.push(p.x, p.y + .006, p.z)
    }
  })
  if (!positions.length) return group
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: {
      uAlpha: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 },
      uCenter: { value: new THREE.Vector2(center.x, center.z) }, uRadius: { value: radius },
      uColor: { value: new THREE.Color(mode === 'warm' ? '#ff967f' : '#a6dafa') },
    },
    vertexShader: `varying vec2 vGround;varying float vRelief;
      void main(){vGround=position.xz;vRelief=.94+.06*abs(normal.y);
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uAlpha,uReveal,uTime;uniform vec2 uCenter,uRadius;uniform vec3 uColor;
      varying vec2 vGround;varying float vRelief;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
      void main(){
        vec2 q=(vGround-uCenter)/uRadius;
        float shape=length(q)+.07*(noise(q*3.1)-.5);
        float mask=1.-smoothstep(.18,.98,shape);
        float drift=noise(q*2.4+vec2(uTime*.025,-uTime*.016));
        float enter=smoothstep(0.,3.,uTime)*smoothstep(0.,.8,uReveal);
        float pulse=.96+.04*sin(uTime*.65);
        float alpha=uAlpha*enter*mask*(.11+.03*drift)*pulse;
        if(alpha<.003)discard;
        gl_FragColor=vec4(uColor*vRelief,alpha);
        #include <colorspace_fragment>
      }`,
  })
  const tint = new THREE.Mesh(geometry, material)
  tint.name = 'terrain-conforming-winter-air-tint'
  tint.renderOrder = 10
  group.add(tint)
  // Low airborne haze carries the color cue; the land itself stays almost unchanged.
  // Camera-facing vertices are handled entirely in the shader, with no extra clock.
  for (let layer = 0; layer < 2; layer++) {
    const hazeMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide, toneMapped: false,
      uniforms: {
        uAlpha: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 },
        uSize: { value: new THREE.Vector2(layer ? 4.2 : 5, layer ? 1.55 : 1.8) },
        uPhase: { value: layer * 2.7 }, uStrength: { value: layer ? .12 : .18 },
        uColor: { value: new THREE.Color(mode === 'warm' ? '#ff967f' : '#a6dafa') },
      },
      vertexShader: `uniform vec2 uSize;varying vec2 vUv;
        void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(0.,0.,0.,1.);
          p.xy+=position.xy*uSize;gl_Position=projectionMatrix*p;}`,
      fragmentShader: `uniform float uAlpha,uReveal,uTime,uPhase,uStrength;uniform vec3 uColor;varying vec2 vUv;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
          return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
        void main(){vec2 p=(vUv-.5)*2.;vec2 flow=vec2(uTime*.027+uPhase,uTime*.009);
          float n=noise(p*2.2-flow),fine=noise(p*5.1-flow*.7);
          float axis=.16*sin(p.x*3.+uPhase)+.16*(n-.5);
          float spread=.33+.12*noise(vec2(p.x*2.1-uPhase,.8));
          float band=exp(-pow((p.y-axis)/spread,2.));
          float ends=exp(-pow(p.x*1.55,4.))*(1.-smoothstep(.78,1.,abs(p.x)));
          float edge=1.-smoothstep(.62,1.,abs(p.y));
          float enter=smoothstep(0.,3.,uTime)*smoothstep(0.,.8,uReveal);
          float alpha=uAlpha*enter*uStrength*band*ends*edge*(.64+.26*n+.1*fine);
          if(alpha<.002)discard;gl_FragColor=vec4(uColor,alpha);
          #include <colorspace_fragment>
        }`,
    })
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hazeMaterial)
    haze.position.set(center.x + (layer ? .55 : -.35), layer ? 1.95 : 1.55, center.z + (layer ? -.3 : .25))
    haze.name = `low-winter-air-haze-${layer}`; haze.renderOrder = 11; haze.frustumCulled = false
    group.add(haze)
  }
  return group
}
