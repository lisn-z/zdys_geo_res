import * as THREE from 'three';

/** Replace references, never resize an already-uploaded texture in place. */
export function replaceSceneTexture(root: THREE.Object3D, previous: THREE.Texture, next: THREE.Texture): void {
  const visited = new Set<THREE.Material>();
  const replaceMaterial = (material?: THREE.Material | THREE.Material[]) => {
    if (Array.isArray(material)) { material.forEach(replaceMaterial); return; }
    if (!material || visited.has(material)) return;
    visited.add(material);
    const properties = material as unknown as Record<string, unknown>;
    for (const key of Object.keys(properties)) if (properties[key] === previous) properties[key] = next;
    const uniforms = (material as THREE.ShaderMaterial).uniforms;
    if (!uniforms) return;
    const skyChanged = uniforms.skyMap?.value === previous;
    for (const uniform of Object.values(uniforms)) {
      if (uniform.value === previous) uniform.value = next;
      else if (Array.isArray(uniform.value)) uniform.value = uniform.value.map(value => value === previous ? next : value);
    }
    if (skyChanged && uniforms.texelSize?.value instanceof THREE.Vector2) {
      const image = next.image as { naturalWidth?: number; naturalHeight?: number; width: number; height: number };
      uniforms.texelSize.value.set(1 / (image.naturalWidth || image.width), 1 / (image.naturalHeight || image.height));
    }
  };
  root.traverse(object => {
    replaceMaterial((object as THREE.Mesh).material);
    // Highlighting temporarily detaches the base material from the mesh.
    for (const key of ['highlightBase', 'highlightMat', 'originalMaterial']) replaceMaterial(object.userData[key]);
  });
}
