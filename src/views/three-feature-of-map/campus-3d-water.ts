import * as THREE from 'three'

type GroundPoint = { x: number; z: number }

// The mesh keeps every authored corner; this texture only controls colour inside it.
// A texture avoids a GLSL uniform-array limit when teachers draw a detailed shoreline.
function shoreDistanceTexture(points: readonly GroundPoint[], minX: number, minZ: number, width: number, depth: number, range: number) {
  const resolution = 160
  const pixels = new Uint8Array(resolution * resolution * 4)
  for (let row = 0; row < resolution; row++) {
    const z = minZ + (row + 0.5) / resolution * depth
    for (let column = 0; column < resolution; column++) {
      const x = minX + (column + 0.5) / resolution * width
      let nearestSquared = Infinity
      for (let index = 0; index < points.length; index++) {
        const a = points[index]!, b = points[(index + 1) % points.length]!
        const dx = b.x - a.x, dz = b.z - a.z
        const lengthSquared = dx * dx + dz * dz
        const fraction = lengthSquared > 0 ? THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / lengthSquared, 0, 1) : 0
        const distanceSquared = (x - a.x - fraction * dx) ** 2 + (z - a.z - fraction * dz) ** 2
        nearestSquared = Math.min(nearestSquared, distanceSquared)
      }
      const offset = (row * resolution + column) * 4
      const encoded = Math.round(THREE.MathUtils.clamp(Math.sqrt(nearestSquared) / range, 0, 1) * 255)
      pixels[offset] = encoded
      pixels[offset + 1] = encoded
      pixels[offset + 2] = encoded
      pixels[offset + 3] = 255
    }
  }
  const texture = new THREE.DataTexture(pixels, resolution, resolution, THREE.RGBAFormat)
  texture.name = '校园湖泊岸距'
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

/** Animated lake in the same east (+X), north (-Z) frame as the drawn campus. */
export function createCampusWater(authoredPoints: readonly GroundPoint[]): { group: THREE.Group; update: (elapsedSeconds: number) => void } {
  const group = new THREE.Group()
  group.name = '校园湖泊'
  const points = authoredPoints.filter((point, index) => Number.isFinite(point.x) && Number.isFinite(point.z)
    && (index === 0 || point.x !== authoredPoints[index - 1]!.x || point.z !== authoredPoints[index - 1]!.z))
  const lastPoint = points[points.length - 1]
  if (points.length > 1 && points[0]!.x === lastPoint!.x && points[0]!.z === lastPoint!.z) points.pop()
  if (points.length < 3) return { group, update: () => {} }

  const xs = points.map(point => point.x), zs = points.map(point => point.z)
  const minX = Math.min(...xs), minZ = Math.min(...zs)
  const width = Math.max(...xs) - minX, depth = Math.max(...zs) - minZ
  const area = Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length]!
    return sum + point.x * next.z - next.x * point.z
  }, 0)) / 2
  if (width < 1e-5 || depth < 1e-5 || area < 1e-5) return { group, update: () => {} }

  const shape = new THREE.Shape()
  points.forEach((point, index) => index ? shape.lineTo(point.x, -point.z) : shape.moveTo(point.x, -point.z))
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(-Math.PI / 2)
  const shortSide = Math.min(width, depth)
  const shoreWidth = THREE.MathUtils.clamp(shortSide * 0.022, 0.1, 0.65)
  const distanceRange = Math.max(shortSide * 0.24, shoreWidth * 5)
  const shoreDistance = shoreDistanceTexture(points, minX, minZ, width, depth, distanceRange)
  const material = new THREE.ShaderMaterial({
    name: '波光湖水',
    uniforms: {
      uTime: { value: 0 },
      uShoreDistance: { value: shoreDistance },
      uBounds: { value: new THREE.Vector4(minX, minZ, width, depth) },
      uDistanceRange: { value: distanceRange },
      uShoreWidth: { value: shoreWidth },
      uRippleScale: { value: 1 / THREE.MathUtils.clamp(shortSide * 0.055, 0.5, 2.2) },
      uDeepColor: { value: new THREE.Color(0x127e9f) },
      uShallowColor: { value: new THREE.Color(0x52cbd0) },
      uSkyColor: { value: new THREE.Color(0xbce6ef) },
      uShoreColor: { value: new THREE.Color(0xd8dfba) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vGround;
      varying vec3 vWorldPosition;
      void main() {
        vGround = position.xz;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uShoreDistance;
      uniform vec4 uBounds;
      uniform float uDistanceRange;
      uniform float uShoreWidth;
      uniform float uRippleScale;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSkyColor;
      uniform vec3 uShoreColor;
      varying vec2 vGround;
      varying vec3 vWorldPosition;

      void main() {
        vec2 uv = (vGround - uBounds.xy) / uBounds.zw;
        float shore = texture2D(uShoreDistance, uv).r * uDistanceRange;
        vec2 p = vGround * uRippleScale;
        float t = uTime * 0.65;

        // As in the sea/land-breeze Water surface, moving normals bend the sky
        // reflection and sun glint. The waves never move the authored shoreline.
        float phaseA = dot(p, vec2(1.6, 0.72)) + t;
        float phaseB = dot(p, vec2(-0.86, 2.2)) - t * 0.8;
        float phaseC = dot(p, vec2(3.8, 1.8)) + t * 1.5;
        vec2 gradient = vec2(1.6, 0.72) * cos(phaseA) * 0.085
          + vec2(-0.86, 2.2) * cos(phaseB) * 0.047
          + vec2(3.8, 1.8) * cos(phaseC) * 0.017;
        gradient *= smoothstep(0.0, uShoreWidth * 2.0, shore);
        vec3 normal = normalize(vec3(-gradient.x, 1.0, -gradient.y));
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float facing = max(dot(normal, viewDirection), 0.0);
        float fresnel = 0.12 + 0.65 * pow(1.0 - facing, 3.0);
        float depth = smoothstep(uShoreWidth, uDistanceRange, shore);
        vec3 colour = mix(uShallowColor, uDeepColor, depth);

        // Soft refracted caustics are strongest over the shallow lake bed.
        float causticA = sin(p.x * 2.4 + sin(p.y * 1.7 + t) + t * 0.5);
        float causticB = sin(p.y * 2.9 + sin(p.x * 1.6 - t * 0.7));
        float caustic = pow(max(0.0, 1.0 - abs(causticA + causticB) * 0.55), 10.0);
        colour += vec3(0.06, 0.10, 0.08) * caustic * (1.0 - depth * 0.8);

        vec3 reflected = reflect(-viewDirection, normal);
        float skyBand = smoothstep(-0.3, 0.8, reflected.y);
        vec3 sky = mix(uSkyColor * 0.6, uSkyColor, skyBand);
        float cloud = smoothstep(0.68, 0.96, sin(reflected.x * 8.0 + reflected.z * 4.0 + t * 0.04));
        sky = mix(sky, vec3(0.94, 0.98, 1.0), cloud * 0.2);
        colour = mix(colour, sky, fresnel);
        vec3 sunDirection = normalize(vec3(-0.5, 0.86, 0.48));
        vec3 halfDirection = normalize(sunDirection + viewDirection);
        float sunGlint = pow(max(dot(normal, halfDirection), 0.0), 110.0);
        float broadGlint = pow(max(dot(normal, halfDirection), 0.0), 18.0);
        colour += vec3(1.0, 0.97, 0.85) * (sunGlint * 0.75 + broadGlint * 0.075);

        // The light shoreline sits inside the polygon, including concave coves.
        float wetEdge = smoothstep(uShoreWidth * 0.2, uShoreWidth * 1.1, shore);
        colour = mix(uShoreColor, colour, wetEdge);
        float waveBand = 0.5 + 0.5 * sin(shore / uShoreWidth * 5.0 - t * 1.2 + sin(p.x + p.y) * 0.3);
        float foam = pow(waveBand, 12.0) * (1.0 - smoothstep(uShoreWidth, uShoreWidth * 3.4, shore));
        colour = mix(colour, vec3(0.8, 0.96, 0.9), foam * wetEdge * 0.24);
        gl_FragColor = vec4(colour, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const surface = new THREE.Mesh(geometry, material)
  surface.name = '经纬度湖面'
  surface.position.y = 0.205
  surface.renderOrder = 2
  surface.receiveShadow = false
  group.add(surface)

  return {
    group,
    update(elapsedSeconds) {
      if (Number.isFinite(elapsedSeconds)) material.uniforms.uTime!.value = elapsedSeconds
    },
  }
}
