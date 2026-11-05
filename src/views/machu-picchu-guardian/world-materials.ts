import * as THREE from 'three'

const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n) }
const periodic = (n: number, size: number) => (n % size + size) % size

export function createWorldMaterials() {
  const owned = new Set<THREE.Texture>()
  let disposed = false
  function texture(data: Uint8Array, size: number, color = true): THREE.DataTexture {
    const result = new THREE.DataTexture(data, size, size)
    result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
    result.wrapS = result.wrapT = THREE.RepeatWrapping; result.generateMipmaps = true
    result.minFilter = THREE.LinearMipmapLinearFilter; result.magFilter = THREE.LinearFilter
    result.anisotropy = 8; result.needsUpdate = true; owned.add(result); return result
  }
  function fallback(kind: 'stone' | 'grass' | 'cliff' | 'forest' | 'normal'): THREE.DataTexture {
    const n = 128, data = new Uint8Array(n * n * 4)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const at = (y * n + x) * 4, grain = hash(x, y)
      const vertical = Math.sin(x * .42 + Math.sin(y * .049) * .6) * .5 + .5
      const patch = Math.sin(x * .22) * Math.sin(y * .19)
      let r: number, g: number, b: number
      if (kind === 'normal') { r = 128 + Math.sin(x * .45 + y * .17) * 24; g = 128 + Math.cos(y * .37 + x * .09) * 24; b = 249 }
      else if (kind === 'forest') { const v = 53 + grain * 32 + patch * 13; r = v * .60; g = v; b = v * .35 }
      else if (kind === 'grass') { const v = 132 + grain * 35 + patch * 13; r = v * .85; g = v; b = v * .49 }
      else { const v = (kind === 'cliff' ? 96 + vertical * 42 : 146) + grain * 32; r = v; g = v * .99; b = v * .93 }
      data[at] = r; data[at + 1] = g; data[at + 2] = b; data[at + 3] = 255
    }
    return texture(data, n, kind !== 'normal')
  }
  // Unequal fitted stones with tight, irregular joints instead of uniform brick courses.
  function masonry(): THREE.DataTexture {
    const n = 384, cols = 8, rows = 7, color = new Uint8Array(n * n * 4)
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const px = x / n * cols + Math.sin(y / n * Math.PI * 6) * .035
      const py = y / n * rows + Math.sin(x / n * Math.PI * 8) * .045
      const gx = Math.floor(px), gy = Math.floor(py)
      let nearest = Infinity, second = Infinity, tone = 0
      for (let iy = -2; iy <= 2; iy++) for (let ix = -2; ix <= 2; ix++) {
        const cx = gx + ix, cy = gy + iy, sx = periodic(cx, cols), sy = periodic(cy, rows)
        if (hash(sx + 27, sy + 19) < .10) continue
        const dx = px - (cx + .18 + hash(sx, sy) * .64), dy = py - (cy + .16 + hash(sx + 41, sy + 3) * .68)
        const d = dx * dx + dy * dy
        if (d < nearest) { second = nearest; nearest = d; tone = hash(sx + 97, sy + 51) }
        else if (d < second) second = d
      }
      const gap = Math.sqrt(second) - Math.sqrt(nearest), face = THREE.MathUtils.smoothstep(gap, .002, .023)
      const grain = hash(x, y), value = (124 + tone * 34 + grain * 24) * (.80 + .20 * face), at = (y * n + x) * 4
      color[at] = value; color[at + 1] = value * .995; color[at + 2] = value * .94; color[at + 3] = 255
    }
    return texture(color, n)
  }
  const masonryMaps = masonry(), stoneGrain = fallback('stone'), cliff = fallback('cliff'), forest = fallback('forest')
  const stone = new THREE.MeshStandardMaterial({ color: '#f1f0e9', map: stoneGrain, roughness: .97 })
  const rock = new THREE.MeshStandardMaterial({ color: '#aaa9a0', map: cliff, roughness: 1 })
  const grass = new THREE.MeshStandardMaterial({ color: '#d1dbb6', map: fallback('grass'), roughness: 1 })
  const terrace = new THREE.MeshStandardMaterial({ color: '#c7b18b', map: stoneGrain, roughness: 1 })
  const mountain = new THREE.MeshStandardMaterial({ color: '#deded7', map: cliff, roughness: 1, vertexColors: true })
  const soil = new THREE.MeshStandardMaterial({ color: '#81765d', map: stoneGrain, roughness: 1 })
  const wood = new THREE.MeshStandardMaterial({ color: '#776b50', roughness: .98 })
  const dark = new THREE.MeshStandardMaterial({ color: '#4d5146', roughness: .98 })
  const plant = new THREE.MeshStandardMaterial({ color: '#63764a', roughness: .96, side: THREE.DoubleSide, vertexColors: true })
  const waterNormal = fallback('normal'); waterNormal.repeat.set(2.5, 8)
  const water = new THREE.MeshPhysicalMaterial({ color: '#abc3b5', roughness: .19, metalness: .04, transparent: true, opacity: .48, depthWrite: false, clearcoat: 1, clearcoatRoughness: .14, normalMap: waterNormal, normalScale: new THREE.Vector2(.13, .13) })
  const surfaceUniforms = {
    guardianMasonry: { value: masonryMaps as THREE.Texture },
    guardianCliff: { value: cliff as THREE.Texture }, guardianForest: { value: forest as THREE.Texture },
  }
  const noiseGlsl = `
    float guardianHash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    float guardianNoise(vec2 p) {
      vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
      return mix(mix(guardianHash(i),guardianHash(i+vec2(1.0,0.0)),f.x),mix(guardianHash(i+vec2(0.0,1.0)),guardianHash(i+vec2(1.0)),f.x),f.y);
    }
  `
  const worldVertex = (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 guardianWorld;\nvarying vec3 guardianWorldNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nguardianWorld=(modelMatrix*vec4(position,1.0)).xyz;\nguardianWorldNormal=inverseTransformDirection(transformedNormal,viewMatrix);')
  }
  const reliefNormal = (amount: string) => `
    #include <normal_fragment_maps>
    vec3 guardianDx=dFdx(-vViewPosition),guardianDy=dFdy(-vViewPosition);
    vec3 guardianR1=cross(guardianDy,normal),guardianR2=cross(normal,guardianDx);
    float guardianDet=dot(guardianDx,guardianR1);
    vec3 guardianGradient=sign(guardianDet)*(dFdx(${amount})*guardianR1+dFdy(${amount})*guardianR2);
    normal=normalize(max(abs(guardianDet),0.0000001)*normal-guardianGradient);
  `
  stone.onBeforeCompile = shader => {
    worldVertex(shader); Object.assign(shader.uniforms, surfaceUniforms)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 guardianWorld;\nvarying vec3 guardianWorldNormal;\nuniform sampler2D guardianMasonry;')
      .replace('#include <map_fragment>', `
        vec3 masonryAxis=abs(guardianWorldNormal);
        vec2 masonryP=masonryAxis.y>0.65?guardianWorld.xz:(masonryAxis.x>masonryAxis.z?guardianWorld.zy:guardianWorld.xy);
        vec2 masonryUv=masonryP/vec2(2.8,2.4);
        vec3 masonryColor=texture2D(guardianMasonry,masonryUv).rgb;
        vec3 masonryGrain=texture2D(map,masonryP*0.55).rgb;
        float masonryGrainLuma=dot(masonryGrain,vec3(0.2126,0.7152,0.0722));
        float masonryWall=1.0-smoothstep(0.50,0.85,masonryAxis.y);
        masonryGrain=mix(vec3(masonryGrainLuma),masonryGrain,0.72);
        diffuseColor.rgb*=mix(masonryGrain,masonryColor,masonryWall);
        float masonryRelief=dot(masonryColor,vec3(0.2126,0.7152,0.0722))*0.007*masonryWall+masonryGrainLuma*0.0015;
      `).replace('#include <normal_fragment_maps>', reliefNormal('masonryRelief'))
  }
  stone.customProgramCacheKey = () => 'guardian-local-masonry-and-raw-step-v5'
  terrace.onBeforeCompile = shader => {
    worldVertex(shader)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 guardianWorld;\nvarying vec3 guardianWorldNormal;\n' + noiseGlsl)
      .replace('#include <map_fragment>', `
        vec2 p=guardianWorld.xz;
        vec3 grain=texture2D(map,p*0.66).rgb;
        float dry=guardianNoise(p*1.4), clods=guardianNoise(p*13.0);
        float contour=p.y-0.0012*(p.x+35.0)*(p.x+35.0)-p.x*0.045;
        float rows=pow(0.5+0.5*sin(contour*20.0+guardianNoise(p*2.0)*0.35),6.0);
        vec3 earth=mix(vec3(0.35,0.28,0.18),vec3(0.60,0.49,0.31),dry);
        float stubble=smoothstep(0.65,0.88,guardianNoise(p*3.1));
        earth=mix(earth,vec3(0.39,0.41,0.23),stubble*0.50);
        diffuseColor.rgb*=earth*(0.88+clods*0.16-rows*0.09)*(0.85+dot(grain,vec3(0.333))*0.5);
        float fieldRelief=clods*0.009-rows*0.003;
      `).replace('#include <normal_fragment_maps>', reliefNormal('fieldRelief'))
  }
  terrace.customProgramCacheKey = () => 'guardian-cultivated-earth-metre-v2'
  mountain.onBeforeCompile = shader => {
    worldVertex(shader); Object.assign(shader.uniforms, surfaceUniforms)
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 guardianWorld;\nvarying vec3 guardianWorldNormal;\nuniform sampler2D guardianCliff;\nuniform sampler2D guardianForest;\n' + noiseGlsl)
      .replace('#include <map_fragment>', `
        vec3 cliffN=normalize(guardianWorldNormal);
        vec2 cliffWeights=pow(abs(cliffN.xz),vec2(5.0))+vec2(0.001);
        cliffWeights/=cliffWeights.x+cliffWeights.y;
        // Both projections keep the image's vertical direction aligned with world-up.
        vec2 cliffX=vec2(guardianWorld.z*0.017,guardianWorld.y*0.012);
        vec2 cliffZ=vec2(guardianWorld.x*0.017,guardianWorld.y*0.012);
        vec3 cliffColor=texture2D(guardianCliff,cliffX).rgb*cliffWeights.x+texture2D(guardianCliff,cliffZ).rgb*cliffWeights.y;
        vec3 canopyWeights=pow(abs(cliffN),vec3(4.0)); canopyWeights/=max(dot(canopyWeights,vec3(1.0)),0.001);
        vec3 canopy=texture2D(guardianForest,guardianWorld.zy*0.015).rgb*canopyWeights.x
          +texture2D(guardianForest,guardianWorld.xz*0.015).rgb*canopyWeights.y
          +texture2D(guardianForest,guardianWorld.xy*0.015).rgb*canopyWeights.z;
        float cliffLuma=dot(cliffColor,vec3(0.2126,0.7152,0.0722));
        float groove=1.0-smoothstep(0.075,0.29,cliffLuma);
        float longChannels=guardianNoise(vec2(guardianWorld.x*0.04+guardianWorld.z*0.023,guardianWorld.y*0.005));
        float steepness=1.0-clamp(cliffN.y,0.0,1.0);
        float shoulder=1.0-smoothstep(0.29,0.72,steepness);
        float mainPeak=(1.0-smoothstep(80.0,155.0,abs(guardianWorld.x-15.0)))*smoothstep(260.0,340.0,-guardianWorld.z)*(1.0-smoothstep(510.0,620.0,-guardianWorld.z));
        float forestFloor=mix(0.84,0.40,mainPeak);
        float vegetation=clamp(max(forestFloor,shoulder*0.93+groove*(0.20+longChannels*0.36)),0.0,0.97);
        vec3 naturalRock=cliffColor*vec3(0.88,0.88,0.86);
        diffuseColor.rgb*=mix(naturalRock,canopy*1.18,vegetation);
        float cliffRelief=(cliffLuma*0.10)*(1.0-vegetation)+dot(canopy,vec3(0.333))*vegetation*0.045;
      `).replace('#include <normal_fragment_maps>', reliefNormal('cliffRelief'))
  }
  mountain.customProgramCacheKey = () => 'guardian-vertical-granite-forest-metre-v4'
  const loader = new THREE.TextureLoader()
  function load(file: string, color: boolean, apply: (map: THREE.Texture) => void): void {
    loader.load(file.startsWith('/') ? file : `/machu-picchu-guardian/${file}`, map => {
      if (disposed) { map.dispose(); return }
      map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8; owned.add(map); apply(map)
    }, undefined, () => { /* The offline procedural surface remains available. */ })
  }
  load('stone.png', true, map => { for (const material of [stone, soil, terrace]) { material.map = map; material.needsUpdate = true } })
  load('masonry.png', true, map => { surfaceUniforms.guardianMasonry.value = map })
  load('cliff.png', true, map => { surfaceUniforms.guardianCliff.value = map; rock.map = map; mountain.map = map; rock.needsUpdate = mountain.needsUpdate = true })
  load('forest.png', true, map => { surfaceUniforms.guardianForest.value = map })
  load('grass.png', true, map => { grass.map = map; grass.needsUpdate = true })
  load('/geo-resources-folder/images/waternormals.jpg', false, map => { map.repeat.set(2.5, 8); water.normalMap = map; water.needsUpdate = true })
  return {
    stone, rock, grass, terrace, mountain, soil, wood, dark, plant, water,
    update(time: number) { if (water.normalMap) { water.normalMap.offset.y = -time * .12; water.normalMap.offset.x = Math.sin(time * .13) * .025 } },
    dispose(alreadyDisposed = new Set<THREE.Texture>()) { disposed = true; owned.forEach(map => { if (!alreadyDisposed.has(map)) map.dispose() }) },
  }
}

