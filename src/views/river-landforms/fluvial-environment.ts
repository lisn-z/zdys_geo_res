import * as THREE from 'three'

export interface FluvialEnvironment {
  group: THREE.Group
  update(camera: THREE.Camera, time: number): void
  dispose(): void
}

/** A distant atmosphere only: the river, mountains and coast remain scene geometry. */
export function createFluvialEnvironment(): FluvialEnvironment {
  const group = new THREE.Group()
  group.name = 'Fluvial sky and distant atmospheric landscape'
  const geometry = new THREE.SphereGeometry(150, 48, 24)
  const material = new THREE.ShaderMaterial({
    name: 'Fluvial layered atmosphere',
    uniforms: {
      uTime: { value: 0 },
      // An oblique overview looks below the physical horizon. Depress this
      // distant panorama so a little sky survives above the finite terrain.
      uHorizonDip: { value: .40 },
      uZenith: { value: new THREE.Color('#78aac5') },
      uLowSky: { value: new THREE.Color('#b4cbd7') },
      uHaze: { value: new THREE.Color('#dce4e4') },
      uGround: { value: new THREE.Color('#c8d1d2') },
      uCloud: { value: new THREE.Color('#eef0eb') },
      uFarRidge: { value: new THREE.Color('#afc2ca') },
      uMidRidge: { value: new THREE.Color('#9eb7c0') },
      uNearRidge: { value: new THREE.Color('#92adb6') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDirection;

      void main() {
        vDirection = position;
        // Use only the current render camera's rotation. This also keeps all
        // six reflection-camera faces centered within the same atmosphere.
        vec3 rotated = mat3(viewMatrix) * position;
        gl_Position = projectionMatrix * vec4(rotated, 1.0);
        // Background geometry must survive both main and cube-camera far planes.
        gl_Position.z = gl_Position.w * .999999;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uHorizonDip;
      uniform vec3 uZenith;
      uniform vec3 uLowSky;
      uniform vec3 uHaze;
      uniform vec3 uGround;
      uniform vec3 uCloud;
      uniform vec3 uFarRidge;
      uniform vec3 uMidRidge;
      uniform vec3 uNearRidge;
      varying vec3 vDirection;

      float atmosphereHash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float atmosphereNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(atmosphereHash(i), atmosphereHash(i + vec2(1.0, 0.0)), f.x),
          mix(atmosphereHash(i + vec2(0.0, 1.0)), atmosphereHash(i + vec2(1.0, 1.0)), f.x), f.y);
      }

      float cloudNoise(vec2 p) {
        float result = .52 * atmosphereNoise(p);
        p = mat2(.80, -.60, .60, .80) * p * 2.03 + 7.1;
        result += .27 * atmosphereNoise(p);
        p = mat2(.80, -.60, .60, .80) * p * 2.07 + 3.7;
        result += .14 * atmosphereNoise(p);
        return result + .07 * atmosphereNoise(p * 2.11 + 9.3);
      }

      float ridgeHeight(vec2 direction, float scale, vec2 offset) {
        vec2 p = direction * scale + offset;
        float broad = atmosphereNoise(p);
        float shoulder = atmosphereNoise(p * 2.7 + 12.7);
        float detail = atmosphereNoise(p * 7.4 + 3.9);
        return broad * .68 + shoulder * .25 + detail * .07;
      }

      void main() {
        vec3 ray = normalize(vDirection);
        float elevation = ray.y + uHorizonDip;
        float skyHeight = max(elevation, 0.0);
        vec3 color = mix(uHaze, uLowSky, smoothstep(0.0, .38, skyHeight));
        color = mix(color, uZenith, smoothstep(.14, 1.1, skyHeight));

        // A broad, restrained glow follows the scene's northwest daylight.
        float sunward = max(dot(ray, normalize(vec3(-.55, .76, -.32))), 0.0);
        color += vec3(.065, .052, .033) * pow(sunward, 7.0);

        if (elevation > .065) {
          // Continuous x/z coordinates avoid a longitude seam on rotation.
          // Flattened noise and soft opacity make thin, wind-stretched clouds.
          vec2 cloudUv = ray.xz / (skyHeight + .24);
          cloudUv = mat2(.91, -.41, .41, .91) * cloudUv;
          cloudUv *= vec2(2.7, 8.4);
          cloudUv += vec2(uTime * .0017, uTime * .00032);
          float wisps = cloudNoise(cloudUv);
          float coverage = atmosphereNoise(cloudUv * .24 + 19.2);
          float cloud = smoothstep(.46, .76, wisps) * smoothstep(.30, .68, coverage);
          cloud *= smoothstep(.065, .23, elevation) * .44;
          color = mix(color, uCloud, cloud);
        }

        if (elevation < .24 && elevation > -.18) {
          vec2 bearing = ray.xz / max(length(ray.xz), .0001);
          float farTop = .030 + ridgeHeight(bearing, 3.8, vec2(4.8, 9.1)) * .18;
          float midTop = .006 + ridgeHeight(bearing, 5.2, vec2(14.2, 3.6)) * .12;
          float nearTop = -.015 + ridgeHeight(bearing, 6.7, vec2(2.9, 21.4)) * .082;
          float farMask = 1.0 - smoothstep(farTop - .005, farTop + .006, elevation);
          float midMask = 1.0 - smoothstep(midTop - .003, midTop + .005, elevation);
          float nearMask = 1.0 - smoothstep(nearTop - .003, nearTop + .004, elevation);
          color = mix(color, uFarRidge, farMask * .62);
          color = mix(color, uMidRidge, midMask * .52);
          color = mix(color, uNearRidge, nearMask * .36);
          // Mountain bases disappear in a broad atmospheric band, with no
          // ground plane or hard skyline crossing the actual relief model.
          color = mix(color, uHaze, 1.0 - smoothstep(-.14, .065, elevation));
        }

        // Below the overview horizon the background becomes pale ground mist.
        // This also gives downward cube-camera rays a quiet, natural fill.
        float groundFade = 1.0 - smoothstep(-.36, -.035, elevation);
        vec3 ground = mix(uGround, uHaze, smoothstep(-.62, -.09, elevation));
        color = mix(color, ground, groundFade);

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    fog: false,
  })
  const sky = new THREE.Mesh(geometry, material)
  sky.name = 'Seamless sky, wispy clouds and hazy distant ridges'
  sky.frustumCulled = false
  sky.castShadow = false
  sky.receiveShadow = false
  sky.renderOrder = -1000
  group.renderOrder = -1000
  group.add(sky)

  const cameraPosition = new THREE.Vector3()
  let disposed = false
  function update(camera: THREE.Camera, time: number) {
    if (disposed) return
    camera.getWorldPosition(cameraPosition)
    group.position.copy(cameraPosition)
    material.uniforms.uTime!.value = Number.isFinite(time) ? Math.max(0, time) : 0
  }

  function dispose() {
    if (disposed) return
    disposed = true
    group.removeFromParent()
    group.clear()
    geometry.dispose()
    material.dispose()
  }

  return { group, update, dispose }
}
