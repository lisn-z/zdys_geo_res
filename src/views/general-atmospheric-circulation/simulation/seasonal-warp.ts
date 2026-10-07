import * as THREE from 'three'

// Apply the reference project's latitude warp after local mesh transforms.
// This also handles the pre-existing moving section arrows without rebuilding
// their geometry, resetting their travel phase, or moving them off the sphere.
export class SeasonalWarp {
  private clipToEarth = { value: new THREE.Matrix4() }
  private earthToClip = { value: new THREE.Matrix4() }
  constructor(private shift: { value: number }) {}

  attach(root: THREE.Object3D) {
    const seen = new Set<THREE.Material>()
    root.traverse(object => {
      const material = (object as THREE.Mesh).material
      if (!material) return
      for (const mat of Array.isArray(material) ? material : [material]) {
        if (seen.has(mat)) continue
        seen.add(mat)
        const original = mat.onBeforeCompile
        mat.onBeforeCompile = (shader, renderer) => {
          original.call(mat, shader, renderer)
          Object.assign(shader.uniforms, {
            climateShift: this.shift, climateClipToEarth: this.clipToEarth, climateEarthToClip: this.earthToClip,
          })
          const end = shader.vertexShader.lastIndexOf('}')
          shader.vertexShader = 'uniform float climateShift; uniform mat4 climateClipToEarth; uniform mat4 climateEarthToClip;\n'
            + shader.vertexShader.slice(0, end) + `
              vec4 climatePosition = climateClipToEarth * gl_Position;
              vec3 climatePoint = climatePosition.xyz / climatePosition.w;
              float climateRadius = length(climatePoint);
              float climateLatitude = asin(clamp(climatePoint.y / climateRadius, -1., 1.));
              float climateNext = clamp(climateLatitude + radians(climateShift) * cos(abs(climateLatitude)), -1.53589, 1.53589);
              float climateLongitude = atan(climatePoint.z, climatePoint.x);
              climatePoint = climateRadius * vec3(cos(climateNext)*cos(climateLongitude), sin(climateNext), cos(climateNext)*sin(climateLongitude));
              gl_Position = climateEarthToClip * vec4(climatePoint, 1.);
            ` + shader.vertexShader.slice(end)
        }
        mat.customProgramCacheKey = () => 'seasonal-world-warp-v1'
        mat.needsUpdate = true
      }
      object.frustumCulled = false
    })
  }

  update(camera: THREE.Camera, earth: THREE.Object3D) {
    earth.updateWorldMatrix(true, false)
    camera.updateMatrixWorld()
    this.earthToClip.value.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(earth.matrixWorld)
    this.clipToEarth.value.copy(this.earthToClip.value).invert()
  }
}
