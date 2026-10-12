import * as THREE from 'three';

/** A separate opaque-depth prepass for smoke/solid intersections.
 * Its texture is never attached to the framebuffer that draws the smoke.
 * Only scenes with visible, emitting large smoke pay for this pass.
 */
export class SoftSmokeDepthPass {
  private target: THREE.WebGLRenderTarget;
  private material = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, side: THREE.DoubleSide });
  private viewport = new THREE.Vector2(1, 1);
  private active = false;
  private dead = false;
  private readonly noBeforeRender: THREE.Object3D['onBeforeRender'] = () => {};

  constructor(private quality: 'balanced' | 'high' = 'balanced') {
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true, stencilBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    });
    this.target.texture.name = 'smoke-depth-unused-color';
    this.target.texture.generateMipmaps = false;
    this.target.depthTexture = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
    this.target.depthTexture.name = 'opaque-depth-for-soft-smoke';
    this.target.depthTexture.minFilter = this.target.depthTexture.magFilter = THREE.NearestFilter;
    this.target.depthTexture.generateMipmaps = false;
    this.material.name = 'OpaqueSmokeDepthOnly';
    this.material.colorWrite = false;
    this.material.toneMapped = false;
    this.material.blending = THREE.NoBlending;
  }

  resize(width: number, height: number) {
    this.viewport.set(Math.max(1, width), Math.max(1, height));
    // Soft intersections do not need MSAA or full-resolution shaded geometry.
    const cap = this.quality === 'high' ? 1500 : 1000;
    const scale = Math.min(this.quality === 'high' ? .75 : .60, cap / Math.max(width, height));
    this.target.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera | THREE.OrthographicCamera) {
    this.active = false;
    if (this.dead) return false;
    const renderables: THREE.Object3D[] = [], smoke: THREE.ShaderMaterial[] = [];
    scene.traverseVisible(object => {
      const item = object as THREE.Mesh;
      if (!item.material) return;
      renderables.push(item);
      if (!item.userData.softSmoke || !(item.material instanceof THREE.ShaderMaterial)) return;
      const mat = item.material, u = mat.uniforms;
      // Reset per frame, including a scene that has just finished emitting.
      mat.userData.softSmokeCamera = null;
      u.softDepthEnabled!.value = 0;
      const time = Number(u.time!.value), duration = Number(u.emissionDuration!.value);
      if (mat.visible && Number(u.power!.value) > .001 && time >= 0 && time < duration + 23) smoke.push(mat);
    });
    if (smoke.length === 0) return false;

    const hidden: THREE.Object3D[] = [];
    const callbacks: [THREE.Object3D, THREE.Object3D['onBeforeRender']][] = [];
    for (const object of renderables) {
      const mesh = object as THREE.Mesh & { isWater?: boolean };
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // Transparent exhaust, atmospheric domes, labels and trajectories cannot
      // occlude the smoke. Keeping them out also prevents texture feedback.
      if (!mesh.isMesh || materials.every(mat => !mat.visible || mat.transparent || !mat.depthWrite || mat.opacity < .001)) {
        hidden.push(object);
        object.visible = false;
      } else if (mesh.isWater) {
        // Keep the sea's actual plane in depth, but do not render its mirror
        // scene a second time just to obtain opaque depth.
        callbacks.push([object, object.onBeforeRender]);
        object.onBeforeRender = this.noBeforeRender;
      }
    }

    const previousTarget = renderer.getRenderTarget();
    const previousOverride = scene.overrideMaterial, previousBackground = scene.background;
    const previousAutoClear = renderer.autoClear, previousShadows = renderer.shadowMap.enabled;
    try {
      scene.overrideMaterial = this.material;
      scene.background = null;
      renderer.shadowMap.enabled = false;
      renderer.autoClear = false;
      renderer.setRenderTarget(this.target);
      renderer.clear(false, true, false);
      renderer.render(scene, camera);
    } finally {
      scene.overrideMaterial = previousOverride;
      scene.background = previousBackground;
      renderer.autoClear = previousAutoClear;
      renderer.shadowMap.enabled = previousShadows;
      hidden.forEach(object => { object.visible = true; });
      callbacks.forEach(([object, callback]) => { object.onBeforeRender = callback; });
      renderer.setRenderTarget(previousTarget);
    }
    for (const mat of smoke) {
      const u = mat.uniforms;
      u.sceneDepth!.value = this.target.depthTexture;
      u.depthViewport!.value.copy(this.viewport);
      u.depthNear!.value = camera.near;
      u.depthFar!.value = camera.far;
      u.perspectiveDepth!.value = (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? 1 : 0;
      mat.userData.softSmokeCamera = camera;
      u.softDepthEnabled!.value = 1;
    }
    this.active = true;
    return true;
  }

  diagnostics() { return { active: this.active, width: this.target.width, height: this.target.height }; }
  dispose() { this.dead = true; this.target.dispose(); this.material.dispose(); }
}
