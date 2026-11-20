import * as THREE from 'three'

/**
 * Thin, additive silhouette shells for the filled circulation volume.
 * The geometry is shared deliberately: expanding along its normals happens only
 * in the vertex shader. The parent's disposal traversal must deduplicate shared
 * geometry (as it already does for the envelope face and other shared meshes).
 * Only grazing angles emit light; frontal interiors remain transparent.
 */
export function createCirculationEdgeGlow(geometry: THREE.BufferGeometry): THREE.Group {
  const group = new THREE.Group()
  group.name = 'circulation-soft-edge-glow'
  const layers = [
    { name: 'outer-blue-halo', expansion: .022, power: 3.2, opacity: .24, color: 0x4d8fff },
    { name: 'inner-blue-white-rim', expansion: .006, power: 4.8, opacity: .68, color: 0xc4e4ff },
  ]
  for (const layer of layers) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uExpansion: { value: layer.expansion },
        uRimPower: { value: layer.power },
        uOpacity: { value: layer.opacity },
        uColor: { value: new THREE.Color(layer.color) },
      },
      vertexShader: `
        uniform float uExpansion;
        varying vec3 vViewNormal;
        varying vec3 vViewDirection;
        void main() {
          vec3 expandedPosition = position + normalize(normal) * uExpansion;
          vec4 viewPosition = modelViewMatrix * vec4(expandedPosition, 1.0);
          vViewNormal = normalize(normalMatrix * normal);
          vViewDirection = -viewPosition.xyz;
          gl_Position = projectionMatrix * viewPosition;
        }
      `,
      fragmentShader: `
        uniform float uRimPower;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec3 vViewNormal;
        varying vec3 vViewDirection;
        void main() {
          float facing = abs(dot(normalize(vViewNormal), normalize(vViewDirection)));
          float rim = pow(clamp(1.0 - facing, 0.0, 1.0), uRimPower);
          // No constant fill term: looking straight at the surface adds no glow.
          float alpha = rim * uOpacity;
          if (alpha < 0.001) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = `circulation-${layer.name}`
    mesh.renderOrder = 5.37
    // Shader displacement is outside the source geometry's bounding sphere.
    mesh.frustumCulled = false
    group.add(mesh)
  }
  return group
}
