import * as THREE from 'three';

/** Apply exposure before Three's public tone-mapping chunk, independently of
 * Sky's internal color variable (retColor in r180, texColor in r184).
 * An unfamiliar shader keeps its original appearance instead of breaking the
 * chapter. Its uniform still exists so historical lighting can safely update it.
 */
export function configureSkyRadiance(material: THREE.ShaderMaterial, radiance: number): boolean {
    const uniform = material.uniforms.sceneSkyRadiance;
    if (uniform) uniform.value = radiance;
    else material.uniforms.sceneSkyRadiance = { value: radiance };

    const marker = '// flying-sky-radiance';
    if (material.fragmentShader.includes(marker)) return true;
    const toneMapping = /#include\s*<tonemapping_fragment>/;
    if (!toneMapping.test(material.fragmentShader)) return false;

    material.fragmentShader = 'uniform float sceneSkyRadiance;\n' + material.fragmentShader.replace(
        toneMapping,
        `${marker}\ngl_FragColor.rgb *= sceneSkyRadiance;\n$&`,
    );
    material.needsUpdate = true;
    return true;
}
