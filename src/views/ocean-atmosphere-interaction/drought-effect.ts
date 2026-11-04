import * as THREE from 'three'

type SurfacePoint = { x: number; z: number; y: number; safe: boolean }

/** A local, qualitative drought illustration, independent of observed climate fields.
 * All animation follows the teaching stage clock; all resources belong to the group.
 */
export function createDroughtEffect(at: THREE.Vector3, radius: number, ground: (x: number, z: number) => number): THREE.Group {
  const group = new THREE.Group()
  group.name = 'local-drought-illustration'
  group.userData.qualitative = true
  if (!Number.isFinite(radius) || radius <= 0) return group
  group.position.set(at.x, 0, at.z)
  const extent = Math.min(radius, 2)
  const patchRadius = Math.min(.54, extent * .35)
  const margin = Math.min(.025, patchRadius * .08)
  const height = (x: number, z: number) => ground(at.x + x, at.z + z)
  const land = (y: number) => Number.isFinite(y) && y > .04
  function sample(x: number, z: number): SurfacePoint {
    const y = height(x, z)
    // The sampler's .035 ocean fallback must never become colored ground.
    const nearby = [[margin, 0], [-margin, 0], [0, margin], [0, -margin]]
    return { x, z, y, safe: land(y) && nearby.every(([dx, dz]) => {
      const h = height(x + dx!, z + dz!)
      return land(h) && Math.abs(h - y) < margin * 1.2
    }) }
  }
  const candidates: { point: SurfacePoint; score: number }[] = []
  for (let i = 0; i < 97; i++) {
    const angle = i * 2.399963, r = Math.sqrt(i / 96) * (extent - patchRadius * .45)
    const point = sample(Math.cos(angle) * r, Math.sin(angle) * r)
    if (!point.safe) continue
    let coverage = 0
    for (let j = 0; j < 12; j++) {
      const a = j * Math.PI / 6, distance = patchRadius * (j % 2 ? .76 : .42)
      if (sample(point.x + Math.cos(a) * distance, point.z + Math.sin(a) * distance).safe) coverage++
    }
    candidates.push({ point, score: coverage - r / extent * .8 })
  }
  candidates.sort((a, b) => b.score - a.score)
  const patches: SurfacePoint[] = []
  for (const candidate of candidates) {
    if (candidate.score < 2) continue
    if (patches.every((p) => Math.hypot(p.x - candidate.point.x, p.z - candidate.point.z) > patchRadius * 1.35)) patches.push(candidate.point)
    if (patches.length === 3) break
  }
  if (!patches.length) return group

  const positions: number[] = []
  const steps = Math.ceil(extent * 2 / .055), step = extent * 2 / steps
  const grid: SurfacePoint[] = []
  for (let z = 0; z <= steps; z++) {
    for (let x = 0; x <= steps; x++) grid.push(sample(-extent + x * step, -extent + z * step))
  }
  function triangle(a: SurfacePoint, b: SurfacePoint, c: SurfacePoint) {
    if (!a.safe || !b.safe || !c.safe) return
    const cx = (a.x + b.x + c.x) / 3, cz = (a.z + b.z + c.z) / 3
    if (!patches.some((p) => Math.hypot(cx - p.x, cz - p.z) < patchRadius + step)) return
    for (const [p, q] of [[a, b], [b, c], [c, a]] as const) {
      if (Math.abs(p.y - q.y) > Math.hypot(p.x - q.x, p.z - q.z) * 1.2) return
    }
    // Edges and interior are checked against the actual triangle sampler.
    // Reject a height discontinuity or a terrain crease instead of bridging it.
    for (const [wa, wb, wc] of [[.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3], [.6, .2, .2], [.2, .6, .2], [.2, .2, .6]]) {
      const x = a.x * wa! + b.x * wb! + c.x * wc!, z = a.z * wa! + b.z * wb! + c.z * wc!
      const y = height(x, z), interpolated = a.y * wa! + b.y * wb! + c.y * wc!
      if (!land(y) || Math.abs(y - interpolated) > .004) return
    }
    for (const p of [a, b, c]) positions.push(p.x, p.y + .007, p.z)
  }
  for (let z = 0; z < steps; z++) {
    for (let x = 0; x < steps; x++) {
      const index = z * (steps + 1) + x
      const a = grid[index]!, b = grid[index + 1]!, c = grid[index + steps + 1]!, d = grid[index + steps + 2]!
      triangle(a, c, b); triangle(b, c, d)
    }
  }
  if (!positions.length) return group
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const stageUniforms = () => ({ uAlpha: { value: 0 }, uReveal: { value: 0 }, uTime: { value: 0 } })
  const patchVectors = Array.from({ length: 3 }, (_, i) => {
    const p = patches[i]
    return p ? new THREE.Vector3(p.x, p.z, patchRadius) : new THREE.Vector3(999, 999, .001)
  })
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    uniforms: { ...stageUniforms(), uPatches: { value: patchVectors }, uDamp: { value: new THREE.Color('#9c9a69') }, uDry: { value: new THREE.Color('#d8b17a') }, uCrack: { value: new THREE.Color('#594331') } },
    vertexShader: `varying vec2 vGround;
      void main(){vGround=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float uAlpha,uReveal,uTime;uniform vec3 uPatches[3],uDamp,uDry,uCrack;varying vec2 vGround;
      vec2 hash2(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i).x,hash2(i+vec2(1.,0.)).x,f.x),mix(hash2(i+vec2(0.,1.)).x,hash2(i+vec2(1.)).x,f.x),f.y);}
      void main(){
        float mask=0.;
        for(int i=0;i<3;i++){vec2 q=(vGround-uPatches[i].xy)/uPatches[i].z;float rim=length(q)+noise(q*3.2+float(i))*.16;mask=max(mask,1.-smoothstep(.64,1.,rim));}
        if(mask<.01)discard;
        float dry=smoothstep(.15,2.5,uTime)*smoothstep(0.,.7,uReveal);
        vec2 p=vGround*14.,cell=floor(p),f=fract(p);float first=10.,second=10.;
        for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 neighbor=vec2(float(x),float(y));vec2 site=.12+.76*hash2(cell+neighbor);float d=length(neighbor+site-f);if(d<first){second=first;first=d;}else{second=min(second,d);}}}
        float gap=second-first,aa=max(fwidth(gap),.008);
        float cracks=(1.-smoothstep(.018,.047+aa,gap))*smoothstep(.9,2.8,uTime)*smoothstep(.15,.8,uReveal);
        vec3 soil=mix(uDamp,uDry,dry)*(.94+.1*noise(vGround*19.));
        vec3 color=mix(soil,uCrack,cracks*.86);
        float alpha=uAlpha*mask*(.18+.65*dry);if(alpha<.004)discard;
        gl_FragColor=vec4(color,alpha);
        #include <colorspace_fragment>
      }`,
  })
  const soil = new THREE.Mesh(geometry, material)
  soil.name = 'sampled-local-dry-soil'; soil.renderOrder = 10
  group.add(soil)

  const grassPositions: number[] = [], dryPositions: number[] = [], bladeHeights: number[] = []
  const tuftPoints: SurfacePoint[] = []
  for (const { point } of candidates) {
    if (!patches.some((p) => Math.hypot(p.x - point.x, p.z - point.z) < patchRadius * .55)) continue
    if (tuftPoints.some((p) => Math.hypot(p.x - point.x, p.z - point.z) < .2)) continue
    // A tuft's bent tips must stay over land too, including the narrow islands.
    if (!Array.from({ length: 8 }, (_, i) => sample(point.x + Math.cos(i * Math.PI / 4) * .18, point.z + Math.sin(i * Math.PI / 4) * .18)).every((p) => p.safe && Math.abs(p.y - point.y) < .12)) continue
    tuftPoints.push(point)
    if (tuftPoints.length === 5) break
  }
  for (let tuft = 0; tuft < tuftPoints.length; tuft++) {
    const root = tuftPoints[tuft]!
    for (let blade = 0; blade < 3; blade++) {
      const angle = tuft * 2.399963 + (blade - 1) * .9
      const dx = Math.cos(angle), dz = Math.sin(angle), tall = .21 + .035 * ((tuft + blade) % 3)
      const verts: { wet: number[]; dry: number[]; t: number }[] = []
      for (let segment = 0; segment <= 4; segment++) {
        const t = segment / 4, width = .018 * (1 - t) + .001
        for (const side of [-1, 1]) {
          const sx = -dz * width * side, sz = dx * width * side
          const wetX = root.x + dx * .045 * t * t + sx, wetZ = root.z + dz * .045 * t * t + sz
          const dryX = root.x + dx * .16 * t * t + sx, dryZ = root.z + dz * .16 * t * t + sz
          verts.push({ wet: [wetX, height(wetX, wetZ) + .012 + tall * t, wetZ], dry: [dryX, height(dryX, dryZ) + .012 + tall * (t - .72 * t * t), dryZ], t })
        }
      }
      for (let segment = 0; segment < 4; segment++) {
        const a = segment * 2
        for (const index of [a, a + 1, a + 2, a + 1, a + 3, a + 2]) {
          grassPositions.push(...verts[index]!.wet); dryPositions.push(...verts[index]!.dry); bladeHeights.push(verts[index]!.t)
        }
      }
    }
  }
  if (grassPositions.length) {
    const grassGeometry = new THREE.BufferGeometry()
    grassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3))
    grassGeometry.setAttribute('aDryPosition', new THREE.Float32BufferAttribute(dryPositions, 3))
    grassGeometry.setAttribute('aAlong', new THREE.Float32BufferAttribute(bladeHeights, 1))
    const grassMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      uniforms: { ...stageUniforms(), uGreen: { value: new THREE.Color('#6a8654') }, uStraw: { value: new THREE.Color('#9d7641') } },
      vertexShader: `attribute vec3 aDryPosition;attribute float aAlong;uniform float uTime,uReveal;varying float vAlong;
        void main(){vAlong=aAlong;float dry=smoothstep(.35,2.7,uTime)*smoothstep(0.,.7,uReveal);vec3 p=mix(position,aDryPosition,dry);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
      fragmentShader: `uniform float uAlpha,uTime,uReveal;uniform vec3 uGreen,uStraw;varying float vAlong;
        void main(){float dry=smoothstep(.35,2.7,uTime)*smoothstep(0.,.7,uReveal);vec3 color=mix(uGreen,uStraw,dry)*(1.-vAlong*.14);gl_FragColor=vec4(color,uAlpha*.94);
        #include <colorspace_fragment>
        }`,
    })
    const grass = new THREE.Mesh(grassGeometry, grassMaterial)
    grass.name = 'local-wilting-grass'; grass.renderOrder = 11; grass.frustumCulled = false
    group.add(grass)
  }
  return group
}
