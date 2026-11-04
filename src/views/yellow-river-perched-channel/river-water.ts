import * as THREE from 'three'

/** Opaque silt-laden river water: independently moving ripples, natural sky reflection and restrained highlights. */
export function createFlowingRiverWater(fallbackNormal: THREE.Texture) {
  const time = { value: 0 }
  const reveal = { value: 1 }
  let disposed = false
  const water = new THREE.MeshPhysicalMaterial({
    color: '#8d7d52', roughness: .17, metalness: 0,
    normalMap: fallbackNormal, normalScale: new THREE.Vector2(.72, .56),
    clearcoat: .65, clearcoatRoughness: .18, envMapIntensity: 1.15,
    transparent: true, depthWrite: false,
  })
  water.onBeforeCompile = shader => {
    shader.uniforms.riverTime = time
    shader.uniforms.riverReveal = reveal
    shader.vertexShader = `varying vec3 vRiverModelPosition;\n${shader.vertexShader}`
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvRiverModelPosition = position;')
    shader.fragmentShader = `uniform float riverTime; uniform float riverReveal; varying vec3 vRiverModelPosition;\n${shader.fragmentShader}`
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#ifdef USE_NORMALMAP_TANGENTSPACE
        vec2 riverUv = vNormalMapUv;
        vec3 rippleA = texture2D(normalMap, riverUv + vec2(.013, -.031) * riverTime).xyz * 2.0 - 1.0;
        vec3 rippleB = texture2D(normalMap, riverUv * 1.873 + vec2(-.009, -.021) * riverTime + .37).xyz * 2.0 - 1.0;
        vec3 rippleC = texture2D(normalMap, riverUv * 3.217 + vec2(.006, -.043) * riverTime + .71).xyz * 2.0 - 1.0;
        vec3 mapN = normalize(vec3((rippleA.xy + rippleB.xy * .46 + rippleC.xy * .18) * normalScale, 1.0));
        normal = normalize(tbn * mapN);
      #endif`,
    )
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      #ifdef USE_NORMALMAP
        float suspendedSilt = sin(vNormalMapUv.x * 17. + sin(vNormalMapUv.y * 3.2 - riverTime * .17) * .75);
        diffuseColor.rgb *= 1. + suspendedSilt * .025;
      #endif
    `)
    // An open river reflects the cool sky, not only the neutral studio environment.
    // Fresnel reflection varies with each animated surface normal and viewing angle.
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 riverEye = normalize(vViewPosition);
      vec3 riverReflection = inverseTransformDirection(reflect(-riverEye, normal), viewMatrix);
      float riverFresnel = pow(1.0 - max(dot(riverEye, normal), 0.0), 3.0);
      vec3 riverSky = mix(vec3(.51, .55, .53), vec3(.24, .38, .46), clamp(riverReflection.y, 0.0, 1.0));
      outgoingLight = mix(outgoingLight, riverSky, .12 + .66 * riverFresnel);
      float riverSectionWindow = smoothstep(13.5, 15.5, vRiverModelPosition.z) * riverReveal;
      diffuseColor.a *= mix(1.0, .19, riverSectionWindow);
      #include <opaque_fragment>
    `)
  }
  water.customProgramCacheKey = () => 'silt-river-three-scale-normal-section-v4'
  // Shared project normal-map asset; the seamless procedural map remains a complete fallback.
  const loadedNormal = new THREE.TextureLoader().load('/geo-resources-folder/images/waternormals.jpg', normal => {
    if (disposed) { normal.dispose(); return }
    normal.wrapS = normal.wrapT = THREE.RepeatWrapping
    normal.colorSpace = THREE.NoColorSpace
    normal.anisotropy = 4
    water.normalMap = normal
    water.needsUpdate = true
  }, undefined, () => { /* Offline fallback is already rendered. */ })
  return {
    water,
    update(elapsed: number) { time.value = elapsed },
    setReveal(enabled: boolean) { reveal.value = enabled ? 1 : 0 },
    dispose() { disposed = true; loadedNormal.dispose(); water.dispose() },
  }
}
