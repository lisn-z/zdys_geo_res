import * as THREE from 'three'
import { WALL_X, terrainHeight, type ExperimentFrame, type ExperimentParams } from './experiment'

export interface ShoreWaveOptions {
  minZ?: number
  maxZ?: number
  waterColor?: THREE.ColorRepresentation
}

const TAU = Math.PI * 2
const hash = (n: number) => { const v = Math.sin(n * 127.1 + 31.77) * 43758.5453; return v - Math.floor(v) }
const clamp = (v: number, low: number, high: number) => Math.max(low, Math.min(high, v))

const common = /* glsl */`
  uniform float uTime;
  uniform float uPhase;
  uniform float uSea;
  uniform float uCrest;
  uniform float uAmplitude;
  uniform float uK;
  uniform float uOmega;
  uniform float uOblique;
  uniform vec3 uWaterColor;
  uniform float uMinZ;
  uniform float uMaxZ;
  const float PI = 3.14159265359;
  const float TAU = 6.28318530718;
  float shorePhase(float z) {
    return z * uOblique + sin(z * .19) * .42 + sin(z * .071 + 1.9) * .62;
  }
  float noise2(vec2 p) {
    vec2 i=floor(p), f=fract(p);f=f*f*(3.-2.*f);
    float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453);
    float b=fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453);
    float c=fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453);
    float d=fract(sin(dot(i+vec2(1.),vec2(127.1,311.7)))*43758.5453);
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
  }
`

/** Short waves and swash are a visual surface layer. They never feed the
 * mean-water-level or inundation model, never cross the landward wall face,
 * and break on the actual beach when low water does not reach the wall.
 * One surface, one run-up sheet and one GPU particle system: three draws.
 */
export function createShoreWaves(options: ShoreWaveOptions = {}) {
  const minZ = options.minZ ?? -90, maxZ = options.maxZ ?? 90
  const toeX = WALL_X - 1.6, faceX = WALL_X - .55
  const minX = WALL_X - 62, maxX = faceX - .025
  const nx = 180, nz = Math.max(96, Math.ceil((maxZ - minZ) / .75))
  const group = new THREE.Group(); group.name = 'shore-breaking-waves'
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uTime: { value: 0 }, uPhase: { value: 0 }, uSea: { value: 0 }, uCrest: { value: 1.9 },
    uAmplitude: { value: .12 }, uK: { value: .85 }, uOmega: { value: 1.6 },
    uOblique: { value: .12 }, uWaterColor: { value: new THREE.Color(options.waterColor ?? 0x0576b5) },
    uToeX: { value: toeX }, uFaceX: { value: faceX },uMinZ:{value:minZ},uMaxZ:{value:maxZ},
  }
  const positions = new Float32Array((nx + 1) * (nz + 1) * 3)
  const ground = new Float32Array((nx + 1) * (nz + 1))
  const shore = new Float32Array((nx + 1) * (nz + 1))
  const toes = new Float32Array((nx + 1) * (nz + 1))
  const indices: number[] = [], toeRows = new Float32Array(nz + 1)
  for (let j = 0; j <= nz; j++) {
    const z = minZ + (maxZ - minZ) * j / nz
    toeRows[j] = terrainHeight(toeX, z)
    for (let i = 0; i <= nx; i++) {
      const n = j * (nx + 1) + i, x = minX + (maxX - minX) * i / nx
      positions[n * 3] = x; positions[n * 3 + 2] = z
      ground[n] = terrainHeight(x, z); toes[n] = toeRows[j]!
      if (i < nx && j < nz) indices.push(n, n + nx + 1, n + 1, n + 1, n + nx + 1, n + nx + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aGround', new THREE.BufferAttribute(ground, 1))
  geometry.setAttribute('aShore', new THREE.BufferAttribute(shore, 1).setUsage(THREE.DynamicDrawUsage))
  geometry.setAttribute('aToe', new THREE.BufferAttribute(toes, 1)); geometry.setIndex(indices)

  const waveMaterial = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    vertexShader: common + /* glsl */`
      attribute float aGround;attribute float aShore;attribute float aToe;
      uniform float uToeX;uniform float uFaceX;
      varying vec3 vWorld;varying float vGround;varying float vShore;
      varying float vCrest;varying float vSlope;varying float vBreaking;
      #include <fog_pars_vertex>
      void main() {
        vec3 p=position;
        float distance=aShore-p.x;
        float phase=p.x*uK-uPhase+shorePhase(p.z);
        float primary=sin(phase), crest=pow(max(0.,primary),2.4);
        float shoal=1.-smoothstep(1.5,15.,distance);
        float fadeIn=1.-smoothstep(30.,40.,distance);
        float runout=1.-smoothstep(0.,3.3,distance*-1.);
        float height=uAmplitude*(.28+crest*(.72+shoal*.4));
        height+=uAmplitude*.09*sin(phase*1.73-p.z*.13);
        height*=fadeIn*runout;
        p.y=uSea+.024+max(0.,height);
        // Lean the shallow crest shoreward to suggest its breaking lip.
        p.x+=shoal*crest*cos(phase)*uAmplitude*.3;
        p.x=min(p.x,uFaceX-.012);
        float wall=smoothstep(uToeX,uFaceX,p.x);
        float wallHeight=mix(aToe,uCrest,clamp((p.x-uToeX)/(uFaceX-uToeX),0.,1.));
        vGround=max(aGround,p.x>uToeX?wallHeight:aGround);
        // A wave may run up the sea face, but cannot spill across a dry crest.
        if(uSea<uCrest-.08 && p.x>uToeX-.3)p.y=min(p.y,uCrest-.065);
        vCrest=crest;vShore=distance;vBreaking=shoal;
        vSlope=cos(phase)*2.4*pow(max(.001,primary),1.4)*uAmplitude*uK;
        vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;
        vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: common + /* glsl */`
      varying vec3 vWorld;varying float vGround;varying float vShore;
      varying float vCrest;varying float vSlope;varying float vBreaking;
      #include <fog_pars_fragment>
      void main() {
        float wet=vWorld.y-vGround;
        if(wet<.012||vShore>40.||vShore< -3.3)discard;
        float edge=smoothstep(.012,.11,wet)*(1.-smoothstep(26.,40.,vShore))*smoothstep(uMinZ,uMinZ+9.,vWorld.z)*(1.-smoothstep(uMaxZ-9.,uMaxZ,vWorld.z));
        float cells=noise2(vWorld.xz*3.9+vec2(-uTime*.38,uTime*.17));
        float fine=noise2(vWorld.xz*10.7+vec2(-uTime*.76,0.));
        float breaker=smoothstep(.48,.92,vCrest)*vBreaking;
        float swash=exp(-pow((vShore-.45)/2.0,2.))*(.35+.4*sin(uPhase-shorePhase(vWorld.z)));
        float foam=smoothstep(.40,.78,cells*.63+fine*.37)*(breaker*.94+max(0.,swash));
        vec3 n=normalize(vec3(-vSlope,1.,.08*sin(vWorld.z*.7)));
        vec3 eye=normalize(cameraPosition-vWorld);
        float fresnel=pow(1.-max(0.,dot(n,eye)),3.);
        float light=.75+.25*max(0.,dot(n,normalize(vec3(-.5,1.,-.45))));
        vec3 water=mix(uWaterColor*.64,vec3(.30,.48,.53),.3+fresnel*.45)*light;
        water+=vec3(.09,.17,.18)*vCrest;
        vec3 color=mix(water,vec3(.84,.93,.90),clamp(foam,0.,.96));
        float opacity=(.025+vCrest*.30+foam*.56)*edge;
        gl_FragColor=vec4(color,clamp(opacity,0.,.88));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })
  const waveSurface = new THREE.Mesh(geometry, waveMaterial)
  waveSurface.name = 'approaching-breaking-wave-ridges'; waveSurface.frustumCulled = false
  waveSurface.renderOrder = 3; group.add(waveSurface)

  // A thin swash sheet hugs the trapezoid's sea face. Individual coastal
  // sections rise and drain at different phases instead of one white bar.
  const wallGeometry = new THREE.PlaneGeometry(1, maxZ - minZ, 8, nz)
  const wallPos = wallGeometry.getAttribute('position'), wallToe = new Float32Array(wallPos.count)
  for (let i = 0; i < wallPos.count; i++) {
    const z = wallPos.getY(i) + (minZ + maxZ) / 2
    wallToe[i] = terrainHeight(toeX, z)
    wallPos.setXYZ(i, wallPos.getX(i) + .5, 0, z)
  }
  wallGeometry.setAttribute('aToe', new THREE.BufferAttribute(wallToe, 1))
  const runupMaterial = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    vertexShader: common + /* glsl */`
      attribute float aToe;uniform float uToeX;uniform float uFaceX;
      varying vec3 vWorld;varying float vUp;varying float vPulse;varying float vActive;
      #include <fog_pars_vertex>
      void main(){
        float meanFace=mix(uToeX,uFaceX,clamp((uSea-aToe)/max(.1,uCrest-aToe),0.,1.));
        float phase=meanFace*uK-uPhase+shorePhase(position.z);
        float pulse=pow(max(0.,sin(phase)),4.);
        float room=max(0.,uCrest-.07-uSea);
        float runup=min(room,uAmplitude*(.35+1.5*pulse));
        vActive=smoothstep(aToe-.06,aToe+.1,uSea)*(1.-step(uCrest-.06,uSea));
        float y=uSea+position.x*runup;
        float x=mix(uToeX,uFaceX,clamp((y-aToe)/max(.1,uCrest-aToe),0.,1.))-.035;
        vec4 world=modelMatrix*vec4(x,y,position.z,1.);vWorld=world.xyz;
        vUp=position.x;vPulse=pulse;
        vec4 mvPosition=viewMatrix*world;gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: common + /* glsl */`
      varying vec3 vWorld;varying float vUp;varying float vPulse;varying float vActive;
      #include <fog_pars_fragment>
      void main(){
        if(vActive<.01)discard;
        float streak=noise2(vec2(vWorld.z*7.,vUp*5.-uTime*1.7));
        float fine=noise2(vWorld.xz*17.+uTime*.3);
        float lip=exp(-pow((vUp-.83)/.2,2.));
        float foam=smoothstep(.30,.75,streak*.7+fine*.3)*(lip*.8+.2);
        float alpha=vActive*(.12+vPulse*.56)*foam*smoothstep(0.,.1,vUp);
        gl_FragColor=vec4(mix(vec3(.36,.62,.65),vec3(.87,.95,.92),lip*.7+.3),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })
  const runup = new THREE.Mesh(wallGeometry, runupMaterial)
  runup.name = 'wall-runup-and-backwash'; runup.frustumCulled = false; runup.renderOrder = 4; group.add(runup)

  // Seeded particles move entirely in the vertex shader. Their ballistic arc
  // is capped below the crest and their horizontal travel is always seaward.
  const count = 1152, sprayPositions = new Float32Array(count * 3), seeds = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    const z = minZ + (maxZ - minZ) * (i + hash(i + 31)) / count
    sprayPositions[i * 3] = toeX; sprayPositions[i * 3 + 1] = terrainHeight(toeX, z); sprayPositions[i * 3 + 2] = z
    for (let j = 0; j < 4; j++) seeds[i * 4 + j] = hash(i * 7 + j + 91)
  }
  const sprayGeometry = new THREE.BufferGeometry()
  sprayGeometry.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3))
  sprayGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
  const sprayMaterial = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, fog: false,
    vertexShader: common + /* glsl */`
      attribute vec4 aSeed;uniform float uToeX;uniform float uFaceX;
      varying float vAlpha;
      #include <fog_pars_vertex>
      void main(){
        float toe=position.y;
        float face=mix(uToeX,uFaceX,clamp((uSea-toe)/max(.1,uCrest-toe),0.,1.));
        float period=TAU/uOmega;
        float age=fract((uPhase-face*uK-shorePhase(position.z)+PI*.5)/TAU-aSeed.x*.09)*period;
        float life=.55+aSeed.z*.38,t=age/life;
        float cap=max(0.,uCrest-.09-uSea);
        float height=min(cap,uAmplitude*(.6+aSeed.y*1.2));
        float y=uSea+.025+height*4.*t*(1.-t);
        float alive=step(0.,t)*(1.-step(1.,t))*smoothstep(toe-.03,toe+.13,uSea)*(1.-step(uCrest-.08,uSea));
        // Splash travels away from the wall, never onto the protected land.
        vec3 p=vec3(face-.07-age*(.45+aSeed.w*1.5),max(uSea+.018,y),position.z+(aSeed.w-.5)*age*.9);
        vec4 world=modelMatrix*vec4(p,1.);vec4 mvPosition=viewMatrix*world;
        gl_Position=projectionMatrix*mvPosition;
        gl_PointSize=clamp((.7+aSeed.y*.8)*(220./max(10.,-mvPosition.z)),1.2,8.);
        vAlpha=alive*(1.-t)*(.38+uAmplitude*.34);
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      varying float vAlpha;
      #include <fog_pars_fragment>
      void main(){
        vec2 q=gl_PointCoord*2.-1.;float r=dot(q,q);
        if(r>1.||vAlpha<.01)discard;
        gl_FragColor=vec4(.88,.96,.94,(1.-smoothstep(.15,1.,r))*vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  })
  const spray = new THREE.Points(sprayGeometry, sprayMaterial)
  spray.name = 'wall-spray'; spray.frustumCulled = false; spray.renderOrder = 5; group.add(spray)

  let lastSea = NaN, lastCrest = NaN, disposed = false, lastTime = NaN, startTime = NaN
  function update(params: ExperimentParams, frame: ExperimentFrame, timeSeconds: number) {
    if (disposed) return
    const directionFactor = params.direction === 'offshore' ? .38 : params.direction === 'alongshore' ? .67 : 1
    if (!Number.isFinite(startTime)) startTime = timeSeconds
    const dt = Number.isFinite(lastTime) ? clamp(timeSeconds - lastTime, 0, .1) : 0
    lastTime = timeSeconds
    uniforms.uTime.value = timeSeconds - startTime; uniforms.uSea.value = frame.seaLevel; uniforms.uCrest.value = frame.barrierCrest
    // Baseline swell remains visible while a storm builds or subsides.
    uniforms.uAmplitude.value = .115 + directionFactor * frame.storm * (.20 + params.wind * .20)
    const wavelength = 6.7 + params.wind * .65
    uniforms.uK.value = TAU / wavelength; uniforms.uOmega.value = 1.45 + params.wind * .16 + frame.storm * .18
    // Integrate phase, so a changing storm strength cannot suddenly rewind or
    // accelerate the fronts by multiplying the entire elapsed time by a new speed.
    uniforms.uPhase.value = (uniforms.uPhase.value + uniforms.uOmega.value * dt) % (TAU * 100)
    uniforms.uOblique.value = params.direction === 'alongshore' ? -.25 : params.direction === 'offshore' ? -.08 : .11
    if (Math.abs(lastSea - frame.seaLevel) < .0001 && lastCrest === frame.barrierCrest) return
    lastSea = frame.seaLevel; lastCrest = frame.barrierCrest
    for (let j = 0; j <= nz; j++) {
      const z = minZ + (maxZ - minZ) * j / nz, toe = toeRows[j]!
      let low = minX, high = maxX
      for (let k = 0; k < 16; k++) {
        const x = (low + high) / 2
        const surface = x <= toeX ? terrainHeight(x, z)
          : Math.max(terrainHeight(x, z), toe + (frame.barrierCrest - toe) * clamp((x - toeX) / (faceX - toeX), 0, 1))
        if (surface < frame.seaLevel) low = x; else high = x
      }
      const shoreline = (low + high) / 2
      for (let i = 0; i <= nx; i++) shore[j * (nx + 1) + i] = shoreline
    }
    geometry.getAttribute('aShore').needsUpdate = true
  }
  function dispose() {
    if (disposed) return
    disposed = true
    geometry.dispose(); wallGeometry.dispose(); sprayGeometry.dispose()
    waveMaterial.dispose(); runupMaterial.dispose(); sprayMaterial.dispose(); group.clear()
  }
  return { group, update, dispose }
}
