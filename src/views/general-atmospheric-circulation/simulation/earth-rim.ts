import * as THREE from 'three'

/**
 * A narrow optical limb glow, not a blue transparent globe or atmosphere volume.
 * Render only the back surface of a shell just outside the opaque Earth. The
 * globe's depth hides its interior; the shader also rejects frontal fragments.
 * Both edges of the remaining grazing-angle band fade softly to transparent.
 */
export function createEarthRim(radius = 2.5): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  if (!Number.isFinite(radius) || radius <= 0) throw new RangeError('Earth radius must be positive and finite')
  const geometry = new THREE.SphereGeometry(radius + .045, 96, 64)
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x70baff) },
      uOpacity: { value: .32 },
    },
    vertexShader: `
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = -viewPosition.xyz;
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      void main() {
        float facing = abs(dot(normalize(vViewNormal), normalize(vViewDirection)));
        // At the shell silhouette facing=0: start fully transparent rather than
        // drawing a hard luminous outline. Peak close to Earth's visible limb.
        float outerFade = smoothstep(0.0, 0.08, facing);
        float innerFade = 1.0 - smoothstep(0.15, 0.20, facing);
        float alpha = uOpacity * outerFade * innerFade;
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'earth-soft-blue-limb'
  // Opaque Earth renders before transparent objects, so its depth always masks
  // the shell's far interior. Keep the rim behind instructional overlays.
  mesh.renderOrder = 1
  return mesh
}
