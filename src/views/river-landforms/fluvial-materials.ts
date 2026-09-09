import * as THREE from 'three'
import { FAN, FAN_ATLAS, fanTraceAtlas } from './fluvial-fan'

function materialTexture(url: string) {
  const texture = new THREE.TextureLoader().load(url)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** Small-scale variation is anchored to the land, not to a repeating image tile. */
const surfaceNoise = /* glsl */ `
  varying vec3 vReliefPosition;
  varying vec3 vReliefNormal;
  uniform sampler2D uRockTile;
  uniform sampler2D uMeadowTile;
  uniform sampler2D uFanTraces;
  uniform vec4 uFanBounds;
  uniform vec4 uFanShape;
  uniform float uFanGrowth;

  float reliefHash(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  float reliefNoise(vec3 p) {
    vec3 cell = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(reliefHash(cell), reliefHash(cell + vec3(1, 0, 0)), f.x),
          mix(reliefHash(cell + vec3(0, 1, 0)), reliefHash(cell + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(reliefHash(cell + vec3(0, 0, 1)), reliefHash(cell + vec3(1, 0, 1)), f.x),
          mix(reliefHash(cell + vec3(0, 1, 1)), reliefHash(cell + vec3(1, 1, 1)), f.x), f.y), f.z);
  }

  // Blended projections preserve a sensible texture scale on steep cliff faces.
  vec3 rockProjection(vec3 p, vec3 n) {
    vec3 w = pow(abs(n), vec3(5.0));
    w /= max(w.x + w.y + w.z, 0.0001);
    return texture2D(uRockTile, p.zy * 0.11).rgb * w.x
      + texture2D(uRockTile, p.xz * 0.11 + vec2(.23, .41)).rgb * w.y
      + texture2D(uRockTile, p.xy * 0.11 + vec2(.57, .13)).rgb * w.z;
  }
`

function addSurfaceDetail(
  material: THREE.MeshStandardMaterial,
  detail: string,
  key: string,
  normalDetail = '',
  uniforms: Record<string, THREE.IUniform> = {},
) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        varying vec3 vReliefPosition;
        varying vec3 vReliefNormal;
      `)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vReliefPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vReliefNormal = normalize(mat3(modelMatrix) * objectNormal);
      `)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${surfaceNoise}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${detail}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${normalDetail}`)
  }
  material.customProgramCacheKey = () => key
}

export function createTerrainMaterial(): THREE.MeshStandardMaterial {
  const rock = materialTexture('/geo-resources-folder/images/alpine-rock-albedo.png')
  const meadow = materialTexture('/geo-resources-folder/images/alpine-meadow-albedo.png')
  const fanTraces = new THREE.DataTexture(fanTraceAtlas(), FAN_ATLAS.nx, FAN_ATLAS.nz, THREE.RGBAFormat)
  fanTraces.minFilter = THREE.LinearMipmapLinearFilter
  fanTraces.magFilter = THREE.LinearFilter
  fanTraces.generateMipmaps = true
  fanTraces.anisotropy = 8
  fanTraces.needsUpdate = true
  const fanGrowth = { value: 0 }
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    envMapIntensity: 0.38,
    side: THREE.DoubleSide,
  })
  material.userData.fanGrowth = fanGrowth
  material.addEventListener('dispose', () => { rock.dispose(); meadow.dispose(); fanTraces.dispose() })
  addSurfaceDetail(material, /* glsl */ `
    float reliefFootprint = length(fwidth(vReliefPosition));
    float reliefFineFade = 1.0 - smoothstep(0.018, 0.14, reliefFootprint);
    float reliefBroad = reliefNoise(vReliefPosition * 1.35) - 0.5;
    float reliefFine = (reliefNoise(vReliefPosition * 18.0) - 0.5) * reliefFineFade;
    float reliefSlope = 1.0 - abs(normalize(vReliefNormal).y);
    // Vertex colors have already been multiplied in here: snow is never inferred
    // from the white base material before Three's color_fragment executes.
    vec3 authoredColor = diffuseColor.rgb;
    float reliefSnow = smoothstep(0.59, 0.80, min(authoredColor.r, authoredColor.g));
    reliefSnow *= 1.0 - smoothstep(.28, .83, reliefSlope) * .73;
    float reliefRock = max(smoothstep(0.12, 0.47, reliefSlope), smoothstep(7.0, 12.5, vReliefPosition.y) * .83)
      * smoothstep(2.6, 5.0, vReliefPosition.y);
    float reliefSand = smoothstep(.008, .065, authoredColor.r - authoredColor.g);
    vec3 rockColor = rockProjection(vReliefPosition, normalize(vReliefNormal));
    vec2 meadowUv = vReliefPosition.xz * .27;
    vec3 meadowColor = mix(texture2D(uMeadowTile, meadowUv).rgb,
      texture2D(uMeadowTile, mat2(.8,-.6,.6,.8) * meadowUv * .61 + vec2(.37,.52)).rgb, .34);
    meadowColor *= vec3(1.04, 1.10, 1.02) * (1.06 + reliefBroad * .26);
    float mountainGravel = smoothstep(-13.0,-10.5,vReliefPosition.z)
      * (1.0-smoothstep(-4.0,-2.0,vReliefPosition.z));
    vec3 sandColor = mix(vec3(.34,.29,.20), rockColor * vec3(1.12,1.04,.86), .42);
    sandColor = mix(sandColor, rockColor * vec3(.97,.94,.85), mountainGravel*.78);
    vec3 landColor = mix(meadowColor, sandColor, reliefSand);
    landColor = mix(landColor, rockColor * .92, reliefRock * (1.0-reliefSand*.4));
    float fanAlong = vReliefPosition.z - uFanShape.y;
    float fanLength = max(.001, uFanShape.z * uFanGrowth);
    float fanAxis = uFanShape.x + fanAlong * uFanShape.w;
    float fanAcross = (vReliefPosition.x - fanAxis) / max(.01, .65 + fanAlong * .67);
    // The front expands spatially from the mountain mouth, in step with the
    // deposited geometry. Scars remain after the floodwater has drained away.
    float fanMask = (1.0-smoothstep(.76,1.0,abs(fanAcross)))
      * (1.0-smoothstep(.79,1.0,fanAlong/fanLength))
      * step(0.0,fanAlong) * uFanGrowth;
    vec2 fanUv = (vReliefPosition.xz-uFanBounds.xy)/uFanBounds.zw;
    vec3 fanTrace = texture2D(uFanTraces,fanUv).rgb;
    float fanGrain = reliefNoise(vReliefPosition*vec3(31.0,14.0,31.0));
    float fanGrainFade = 1.0-smoothstep(.012,.065,reliefFootprint);
    float fanGrit = reliefNoise(vReliefPosition*vec3(67.0,31.0,67.0));
    float fanDarkGrains = smoothstep(.59,.77,fanGrit)*fanGrainFade;
    float fanPaleGrains = (1.0-smoothstep(.22,.35,fanGrit))*fanGrainFade;
    float fanWarp = reliefNoise(vec3(fanAlong*1.7,fanAcross*8.0,2.3));
    float fanThreads = reliefNoise(vec3(fanAcross*112.0+fanWarp*1.7,fanAlong*2.4,1.7));
    float fanFineScars = smoothstep(.58,.82,fanThreads) * smoothstep(.1,.6,fanAlong)
      * (1.0-smoothstep(.04,.16,reliefFootprint));
    float fanCut = clamp(fanTrace.r*.88+fanTrace.g*.56,0.0,1.0);
    vec3 fanSilt = mix(vec3(.30,.225,.135),vec3(.44,.35,.225),.45+reliefBroad*.45);
    fanSilt *= .93+fanGrain*.14;
    vec3 fanGravel = mix(vec3(.225,.215,.185),vec3(.34,.31,.255),fanGrain);
    vec3 fanSurface = mix(fanSilt,fanGravel,fanTrace.b*.66);
    fanSurface *= .90+reliefNoise(vReliefPosition*vec3(7.0,3.0,9.0))*.20;
    fanSurface *= 1.0-fanDarkGrains*.33;
    fanSurface += vec3(.07,.064,.05)*fanPaleGrains;
    fanSurface = mix(fanSurface,vec3(.092,.088,.067)*(1.0+fanGrain*.65),fanCut);
    fanSurface *= 1.0-fanFineScars*.15;
    // Pale sediment shoulders flank the dark channels, with no coplanar decals.
    fanSurface += vec3(.055,.047,.028)*max(0.0,fanTrace.b-fanCut)*.7;
    landColor = mix(landColor,fanSurface,fanMask*.96);
    diffuseColor.rgb = mix(landColor, vec3(.83,.88,.89) * (1.0+reliefBroad*.065), reliefSnow);
    diffuseColor.rgb *= 1.0 + reliefFine * .035;
    float reliefTextureHeight = dot(rockColor, vec3(.299,.587,.114));
  `, 'fluvial-photographic-terrain-fan-5', /* glsl */ `
    // Screen derivatives reconstruct the surface gradient in view space. The
    // height field remains in world units, so relief does not grow with zoom.
    float reliefFracture = abs(reliefNoise(vReliefPosition * 3.6) - 0.5);
    float reliefHeight = reliefTextureHeight * reliefRock * .006;
    reliefHeight += (reliefNoise(vReliefPosition * 2.1) - 0.5) * mix(0.006, 0.035, reliefRock);
    reliefHeight += reliefFracture * reliefRock * 0.027;
    reliefHeight += reliefFine * mix(0.001, 0.003, reliefRock);
    reliefHeight += fanMask*(-fanCut*.024+fanTrace.b*.004-fanFineScars*.002);
    reliefHeight += fanMask*(fanGrit-.5)*fanGrainFade*.008;
    reliefHeight *= 1.0 - reliefSnow * 0.78;
    vec3 reliefDx = dFdx(-vViewPosition);
    vec3 reliefDy = dFdy(-vViewPosition);
    vec3 reliefCrossX = cross(reliefDy, normal);
    vec3 reliefCrossY = cross(normal, reliefDx);
    float reliefDet = dot(reliefDx, reliefCrossX) * faceDirection;
    vec3 reliefGradient = sign(reliefDet)
      * (dFdx(reliefHeight) * reliefCrossX + dFdy(reliefHeight) * reliefCrossY);
    normal = normalize(max(abs(reliefDet), 0.00000001) * normal - reliefGradient);
  `, {
    uRockTile: { value: rock }, uMeadowTile: { value: meadow },
    uFanTraces: { value: fanTraces }, uFanGrowth: fanGrowth,
    uFanBounds: { value: new THREE.Vector4(FAN_ATLAS.x,FAN_ATLAS.z,FAN_ATLAS.width,FAN_ATLAS.length) },
    uFanShape: { value: new THREE.Vector4(FAN.x,FAN.z,FAN.length,FAN.drift) },
  })
  return material
}

export function createWallMaterial(): THREE.MeshStandardMaterial {
  const rock = materialTexture('/geo-resources-folder/images/alpine-rock-albedo.png')
  const material = new THREE.MeshStandardMaterial({
    color: '#aaa398',
    roughness: 0.94,
    metalness: 0,
    side: THREE.DoubleSide,
  })
  material.addEventListener('dispose', () => rock.dispose())
  addSurfaceDetail(material, /* glsl */ `
    float drift = reliefNoise(vec3(vReliefPosition.x * 0.12, 0.0, vReliefPosition.z * 0.12));
    float level = vReliefPosition.y + drift * 0.18;
    float broadLayer = sin(level * 4.7) * 0.5 + 0.5;
    float thinLayer = smoothstep(0.80, 0.98, sin(level * 17.8 + drift) * 0.5 + 0.5);
    float grain = reliefNoise(vReliefPosition * 20.0) - 0.5;
    vec3 cutRock = rockProjection(vReliefPosition, normalize(vReliefNormal));
    diffuseColor.rgb = cutRock * vec3(.76,.72,.65) * (.94 + broadLayer*.09 + grain*.055);
    diffuseColor.rgb *= mix(.54,1.0,smoothstep(-3.7,1.5,vReliefPosition.y));
  `, 'fluvial-photographic-walls-2', '', { uRockTile: { value: rock } })
  return material
}

const waterVertex = /* glsl */ `
  attribute float aWet;
  attribute float aFlow;
  attribute float aFoam;
  varying vec2 vWaterUv;
  varying vec3 vWaterPosition;
  varying vec3 vWaterNormal;
  varying float vWet;
  varying float vFlow;
  varying float vFoam;

  void main() {
    vWaterUv = uv;
    vWet = aWet;
    vFlow = aFlow;
    vFoam = aFoam;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWaterPosition = world.xyz;
    vWaterNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const waterCommon = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uWhite;
  uniform vec3 uSky;
  uniform vec3 uHorizon;
  uniform samplerCube uEnvironment;
  uniform float uHasEnvironment;
  uniform float uUnionSurface;
  varying vec2 vWaterUv;
  varying vec3 vWaterPosition;
  varying vec3 vWaterNormal;
  varying float vWet;
  varying float vFlow;
  varying float vFoam;

  float waterHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float waterNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(waterHash(i), waterHash(i + vec2(1, 0)), f.x),
      mix(waterHash(i + vec2(0, 1)), waterHash(i + vec2(1, 1)), f.x), f.y);
  }

  float waterEdge(float u) {
    return mix(smoothstep(0.0, 0.035, u) * (1.0 - smoothstep(0.965, 1.0, u)),1.0,uUnionSurface);
  }
`

const riverSurface = /* glsl */ `
  float edge = waterEdge(vWaterUv.x);
  float depth = smoothstep(0.015, 0.28, vWaterUv.x)
    * (1.0 - smoothstep(0.72, 0.985, vWaterUv.x));
  // Two overlapping advection cycles let the outer-bank lanes run faster
  // without indefinitely stretching the texture where neighboring speeds differ.
  float laneSpeed = clamp(vFlow,0.0,2.2);
  float phaseA = fract(uTime*.16), phaseB = fract(uTime*.16+.5);
  float phaseMix = abs(phaseA-.5)*2.0;
  float travelledA = vWaterUv.y-phaseA*1.55*laneSpeed/.16;
  float travelledB = vWaterUv.y-phaseB*1.55*laneSpeed/.16;
  float fastBank = smoothstep(1.02,1.65,laneSpeed);
  float threadDensity = mix(16.0,27.0,fastBank);
  float streak = mix(waterNoise(vec2(vWaterUv.x*threadDensity,travelledA*.52)),
    waterNoise(vec2(vWaterUv.x*threadDensity,travelledB*.52)),phaseMix);
  float thread = smoothstep(0.66, 0.91, streak);
  float ripple = mix(sin(vWaterUv.x*29.0+travelledA*3.0),sin(vWaterUv.x*29.0+travelledB*3.0),phaseMix)*.5+.5;
  vec3 color = mix(uShallow, uDeep, depth * 0.91);
  color *= 0.91 + streak * 0.19;
  color = mix(color, skyReflection, .07 + fresnel * .46);
  color *= .92 + mix(waterNoise(vec2(vWaterUv.x*4.0,travelledA*.13)),
    waterNoise(vec2(vWaterUv.x*4.0,travelledB*.13)),phaseMix)*.16;
  color = mix(color, uShallow, thread * (.12+fastBank*.18) * min(laneSpeed,1.0));
  float bankFilaments = mix(waterNoise(vec2(vWaterUv.x*42.0,travelledA*1.4)),
    waterNoise(vec2(vWaterUv.x*42.0,travelledB*1.4)),phaseMix);
  float bankRipples = smoothstep(.58,.85,bankFilaments)*fastBank;
  color = mix(color,uShallow*.85+uWhite*.15,bankRipples*.32);
  float foam = clamp(vFoam, 0.0, 1.0) * smoothstep(0.38, 0.81, streak);
  color = mix(color, uWhite, foam * 0.78);
  color += uWhite * (ripple * fresnel * 0.024 + sunlight * .65);
  float alpha = edge * wet * uOpacity * (0.77 + depth * 0.19);
`

const waterfallSurface = /* glsl */ `
  float edge = waterEdge(vWaterUv.x);
  float travelled = vWaterUv.y - uTime * 5.0;
  float strands = waterNoise(vec2(vWaterUv.x * 21.0, travelled * 0.45));
  float detail = waterNoise(vec2(vWaterUv.x * 47.0, travelled * 1.8));
  float sheets = waterNoise(vec2(vWaterUv.x * 13.0, travelled * 0.27));
  float whiteWater = smoothstep(0.20, 0.86, strands * 0.52 + detail * 0.24 + sheets * 0.24);
  float broken = smoothstep(.18,.65,sheets);
  vec3 color = mix(uDeep * 1.25, uWhite, 0.25 + whiteWater * 0.74);
  color = mix(color, uWhite, clamp(vFoam, 0.0, 1.0) * broken * 0.22);
  float alpha = edge * wet * uOpacity * (0.42 + whiteWater * 0.55);
`

const oceanSurface = /* glsl */ `
  vec2 wavePosition = vWaterPosition.xz;
  float swell = sin(wavePosition.x * 0.73 + wavePosition.y * 1.45 - uTime * 0.62);
  float crossWave = sin(wavePosition.x * 1.8 - wavePosition.y * 0.87 - uTime * 0.91);
  float grain = waterNoise(wavePosition * 3.2 + vec2(uTime * 0.1, -uTime * 0.12));
  float shallow = clamp(vFoam, 0.0, 1.0);
  vec3 color = mix(uDeep, uShallow, shallow * 0.85);
  color *= 0.92 + swell * 0.065 + crossWave * 0.036;
  color = mix(color, skyReflection, .12 + fresnel * .74);
  color += uWhite * sunlight * .22;
  float foam = shallow * shallow * smoothstep(0.68, 0.93, swell * 0.5 + grain*.34 + 0.33);
  color = mix(color, uWhite, foam * 0.38);
  float alpha = wet * uOpacity * (0.96-shallow*.12);
`

/** Water ribbons must supply aWet, aFlow, aFoam and downstream-increasing uv.y. */
export function createWaterMaterial(kind: 'river' | 'ocean' | 'waterfall'): THREE.ShaderMaterial {
  const body = kind === 'waterfall' ? waterfallSurface : kind === 'ocean' ? oceanSurface : riverSurface
  const material = new THREE.ShaderMaterial({
    name: `Fluvial ${kind}`,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uDeep: { value: new THREE.Color(kind === 'ocean' ? '#184668' : kind === 'river' ? '#153a4b' : '#245771') },
      uShallow: { value: new THREE.Color(kind === 'river' ? '#436c70' : '#759f9a') },
      uWhite: { value: new THREE.Color('#ecf5f6') },
      uSky: { value: new THREE.Color('#7eb9e3') },
      uHorizon: { value: new THREE.Color('#deedf4') },
      uEnvironment: { value: null },
      uHasEnvironment: { value: 0 },
      uUnionSurface: { value: 0 },
    },
    vertexShader: waterVertex,
    fragmentShader: /* glsl */ `
      ${waterCommon}
      void main() {
        if (vWet < 0.015) discard;
        float wet = smoothstep(0.015, 0.085, vWet);
        vec3 toEye = normalize(cameraPosition - vWaterPosition);
        vec2 wave = vWaterPosition.xz;
        vec2 swellUv=wave*.72+vec2(-uTime*.11,uTime*.047);
        float rippleX=waterNoise(swellUv+vec2(.12,0.0))-waterNoise(swellUv-vec2(.12,0.0));
        float rippleZ=waterNoise(swellUv+vec2(0.0,.12))-waterNoise(swellUv-vec2(0.0,.12));
        vec3 waterNormal = normalize(vWaterNormal + vec3(rippleX*.44,0.0,rippleZ*.44));
        float fresnel = .025 + .975*pow(1.0 - abs(dot(waterNormal, toEye)), 5.0);
        vec3 reflection = reflect(-toEye, waterNormal);
        vec3 skyReflection = mix(uHorizon, uSky, smoothstep(.02,.8,reflection.y));
        skyReflection = mix(skyReflection, textureCube(uEnvironment,reflection).rgb,uHasEnvironment*.84);
        float sunlight = pow(max(dot(reflect(-normalize(vec3(-.42,.81,-.25)),waterNormal),toEye),0.0),118.0);
        ${body}
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(color, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
  })
  material.forceSinglePass = true
  return material
}

/** Soft, irregular particles for impact mist; no solid billboard edges. */
export function createFoamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 62)
  gradient.addColorStop(0, 'rgba(239,246,242,0.86)')
  gradient.addColorStop(0.24, 'rgba(229,241,236,0.60)')
  gradient.addColorStop(0.58, 'rgba(224,236,234,0.20)')
  gradient.addColorStop(1, 'rgba(224,236,234,0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
