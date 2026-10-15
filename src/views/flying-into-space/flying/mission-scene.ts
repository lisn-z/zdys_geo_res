import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { configureSkyRadiance } from './sky-compat';
import { TextureBank } from './assets';
import { ModelMaterials, mBox, mCyl, mBall, meshOf, rod } from './models';
import { makeFlame, makeSmoke } from './effects';
import { MISSION_FLIGHT, type MissionFlightState } from './mission';
import { applyMissionCloudProfile, type CloudVolumeSettings } from './clouds';
import { createMissionSurfaces } from './mission-surfaces';
import { buildMissionVehicle } from './mission-vehicle';
import { span, seeded, type Vec3T } from './math';

interface MissionDebrisPiece {
  object: THREE.Group;
  rest: THREE.Vector3;
  rotation: THREE.Quaternion;
  bounds: THREE.Box3;
  contactPoints: Float32Array;
  kick: THREE.Vector3;
  spin: THREE.Vector3;
  delay: number;
  landedAt: number | null;
  landingPosition: THREE.Vector3;
  landingRotation: THREE.Quaternion;
  impactPosition: THREE.Vector3;
  impactRotation: THREE.Quaternion;
}
interface MissionExhaustBirth { time: number; height: number; seed: number; }
interface MissionPadContact {
  mesh: THREE.Mesh<THREE.BoxGeometry>;
  halfX: number; halfZ: number; x: number; z: number; top: number;
  xx: number; xz: number; zx: number; zz: number;
}

/** An original training vehicle and coastal launch complex.
 * Every moving object is driven by LaunchMission's independent state.
 */
export class MissionScene {
  readonly scene = new THREE.Scene();
  readonly cameraPosition = new THREE.Vector3(42, 24, 57);
  readonly cameraTarget = new THREE.Vector3(0, 11.5, 0);
  readonly cloudVolume: CloudVolumeSettings = {
    center: new THREE.Vector3(0, (MISSION_FLIGHT.cloudBottom + MISSION_FLIGHT.cloudTop) / 2 + 9, 0),
    size: new THREE.Vector3(660, MISSION_FLIGHT.cloudTop - MISSION_FLIGHT.cloudBottom + 42, 570),
    time: 0, strength: .74, extinction: .060,
  };
  readonly cameraNear = .10;
  readonly cameraFar = 6000;
  cameraFov = 44;
  cameraRoll = 0;
  private readonly baseY = 2.9;
  private readonly pieces: MissionDebrisPiece[] = [];
  private readonly flames: ReturnType<typeof makeFlame>[] = [];
  private readonly arms: THREE.Group[] = [];
  private readonly holdDowns: THREE.Group[] = [];
  private readonly padContacts: MissionPadContact[] = [];
  private readonly ownedTextures = new Set<THREE.Texture>();
  private readonly padSmoke: ReturnType<typeof makeSmoke>;
  private readonly trail: ReturnType<typeof makeSmoke>;
  private readonly crashSmoke: ReturnType<typeof makeSmoke>;
  private readonly wreckSmoke: ReturnType<typeof makeSmoke>;
  private readonly wreckFires: ReturnType<typeof makeFlame>[] = [];
  private readonly impactFire: ReturnType<typeof makeFlame>;
  private readonly shockRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly engineLight = new THREE.PointLight('#ffad57', 0, 42, 2);
  private readonly crashLight = new THREE.PointLight('#ffbd77', 0, 75, 2);
  private readonly sun = new THREE.DirectionalLight('#fff1d9', 3.05);
  private readonly sunDirection = new THREE.Vector3(-.72, .28, .63).normalize();
  private readonly surfaces: ReturnType<typeof createMissionSurfaces>;
  private readonly seaTime = { value: 0 };
  private readonly flash: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly scorch: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly trenchMaterial = new THREE.MeshStandardMaterial({ color: '#3e4240', metalness: .14, roughness: .88, emissive: '#ff731c', emissiveIntensity: 0 });
  private seaNormal: THREE.Texture | null = null;
  private lastState: MissionFlightState | null = null;
  private failureStart: { height: number; velocity: number; time: number } | null = null;
  private cameraInitialized = false;
  private nextBirth = 0;
  private exhaust: MissionExhaustBirth[] = [];
  private readonly random = seeded(40185);
  private readonly pose = new THREE.Quaternion();
  private readonly vector = new THREE.Vector3();
  private readonly crashPosition = new THREE.Vector3();
  private readonly impactCenter = new THREE.Vector3();
  private readonly rigidOrigin = new THREE.Vector3();
  private readonly contactPoint = new THREE.Vector3();
  private readonly cameraShake = new THREE.Vector3();
  private readonly cameraTargetShake = new THREE.Vector3();
  private impactCaptured = false;
  private introTime = 0;
  private readonly introDuration = 4;
  private readonly introTopPosition = new THREE.Vector3(6, 37, 9.5);
  private readonly introTopTarget = new THREE.Vector3(0, 20, 0);
  private readonly introScanPosition = new THREE.Vector3(18, 20.5, 30);
  private readonly introScanTarget = new THREE.Vector3(0, 11.5, 0);

  get introComplete() { return this.introTime >= this.introDuration; }

  restartIntro() {
    this.introTime = 0;
    this.cameraPosition.sub(this.cameraShake); this.cameraShake.set(0, 0, 0);
    this.cameraTarget.sub(this.cameraTargetShake); this.cameraTargetShake.set(0, 0, 0);
    this.cameraRoll = 0; this.cameraInitialized = false;
  }

  constructor(private bank: TextureBank, private materials: ModelMaterials, environment: THREE.Texture, private quality: 'balanced' | 'high') {
    const scene = this.scene;
    scene.name = 'mission:coastal-flight';
    scene.background = new THREE.Color('#a9bacb');
    scene.environment = environment;
    scene.environmentIntensity = .46;
    scene.fog = new THREE.Fog('#b6bfc6', 450, 3100);
    this.sun.color.set('#ffe0b3'); this.sun.intensity = 3.3;
    this.sun.position.copy(this.sunDirection).multiplyScalar(155);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(quality === 'high' ? 1536 : 1024, quality === 'high' ? 1536 : 1024);
    Object.assign(this.sun.shadow.camera, { left: -48, right: 48, top: 50, bottom: -42, near: 1, far: 300 });
    this.sun.shadow.bias = -.00016;
    this.sun.shadow.normalBias = .026;
    scene.add(this.sun, this.sun.target, new THREE.HemisphereLight('#b6cfe5', '#4c554e', .84), this.engineLight, this.crashLight);
    this.surfaces = createMissionSurfaces();
    this.surfaces.textures.forEach(texture => this.ownedTextures.add(texture));
    this.buildCoast(environment);
    this.buildPad();
    this.buildVehicle();

    this.padSmoke = makeSmoke(quality === 'high' ? 150 : 108, false, { emissionDuration: 9.0 });
    this.padSmoke.name = '任务场地 · 排焰槽蒸汽';
    this.padSmoke.position.y = .12;
    const padBeforeRender = this.padSmoke.onBeforeRender;
    this.padSmoke.onBeforeRender = (...args) => {
      padBeforeRender.apply(this.padSmoke, args);
      if (!this.failureStart) return;
      const ages = this.padSmoke.geometry.attributes.ageSeed as THREE.InstancedBufferAttribute;
      const time = Number(this.padSmoke.material.uniforms.time!.value);
      // Releasing stops new steam. Existing billows retain their age and drift.
      for (let i = 0; i < ages.count; i++) if (time - ages.getX(i) > this.failureStart.time) ages.setX(i, -1);
      ages.needsUpdate = true;
    };
    scene.add(this.padSmoke);
    this.trail = this.makeTrail(quality === 'high' ? 220 : 150);
    scene.add(this.trail);
    this.crashSmoke = makeSmoke(quality === 'high' ? 110 : 76, false, { radial: true, emissionDuration: .60 });
    this.crashSmoke.name = '任务失败 · 撞击扬尘';
    this.crashSmoke.scale.set(2.1, 1.35, 2.1);
    scene.add(this.crashSmoke);
    this.wreckSmoke = this.makeWreckSmoke(quality === 'high' ? 84 : 60);
    scene.add(this.wreckSmoke);
    for (let i = 0; i < 4; i++) {
      const fire = makeFlame('camp');
      fire.name = `任务失败 · 残骸持续燃烧 ${i + 1}`;
      fire.visible = false;
      fire.scale.set(i ? 2.15 : 3.8, i ? 2.7 : 4.05, i ? 2.15 : 3.8);
      this.calibrateMissionFire(fire);
      this.wreckFires.push(fire); scene.add(fire);
    }
    this.impactFire = makeFlame('camp');
    this.impactFire.name = '任务失败 · 橙红体积爆炸火球';
    this.impactFire.visible = false;
    this.impactFire.material.fragmentShader = this.impactFire.material.fragmentShader
      .replace('float radius=mix(.69,.08,pow(h,.74));', 'float radius=.08+.95*sqrt(max(0.0,1.0-pow(h*2.0-1.0,2.0)));');
    this.calibrateMissionFire(this.impactFire);
    scene.add(this.impactFire);
    this.shockRing = new THREE.Mesh(new THREE.RingGeometry(.84, 1, 80), new THREE.MeshBasicMaterial({ color: '#ff9d45', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.shockRing.name = '任务失败 · 外扩冲击波'; this.shockRing.rotation.x = -Math.PI / 2; this.shockRing.visible = false;
    scene.add(this.shockRing);
    this.flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshBasicMaterial({
      color: new THREE.Color(3.2, .85, .08), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.flash.name = '任务失败 · 撞击闪光';
    this.flash.visible = false;
    scene.add(this.flash);
    this.scorch = new THREE.Mesh(new THREE.CircleGeometry(5.8, 40), new THREE.MeshBasicMaterial({ color: '#302d28', transparent: true, opacity: 0, depthWrite: false }));
    this.scorch.rotation.x = -Math.PI / 2;
    this.scorch.name = '任务失败 · 地面烧蚀痕';
    scene.add(this.scorch);
  }

  private calibrateMissionFire(fire: ReturnType<typeof makeFlame>) {
    fire.material.fragmentShader = fire.material.fragmentShader
      .replace('vec3 hot=mix(vec3(1.0,.16,.012),vec3(1.0,.83,.34),clamp(density*1.45,0.0,1.0));',
        'vec3 hot=mix(vec3(1.0,.055,.002),vec3(1.0,.39,.022),clamp(density*.92,0.0,1.0));')
      .replace('hot=mix(hot,vec3(1.0,.98,.87),pow(clamp(density,0.0,1.0),3.0));',
        'hot=mix(hot,vec3(1.0,.82,.43),pow(clamp((density-1.0)*1.6,0.0,1.0),8.0));')
      .replace('(camp>.5?2.5:2.9+coreFraction*3.4)', '(camp>.5?1.6:2.9+coreFraction*3.4)');
  }

  private buildCoast(environment: THREE.Texture) {
    const m = this.materials;
    const terrain = new THREE.PlaneGeometry(6200, 6200, 128, 128);
    terrain.rotateX(-Math.PI / 2);
    const positions = terrain.attributes.position!, colors: number[] = [];
    const sand = new THREE.Color('#c4b591'), grass = new THREE.Color('#9aa27b');
    for (let i = 0; i < positions.count; i++) {
      // Concentrate real triangles around the base instead of interpolating a
      // 70 m hillside triangle through the road, apron and building foundations.
      const warp = (value: number) => Math.sign(value) * 3100 * Math.pow(Math.abs(value) / 3100, 1.95);
      const x = warp(positions.getX(i)), z = warp(positions.getZ(i)), shore = -74 + Math.sin(z * .013) * 8;
      const inland = span(x - shore, 0, 22);
      const distance = Math.hypot(x, z);
      const hills = span(distance, 70, 270) * (Math.sin(x * .015) * Math.cos(z * .014) * 5 + 7);
      const naturalHeight = x < shore ? -.8 - Math.min(18, (shore - x) * .18) : -.65 + inland * (.65 + hills);
      const facilityDistance = Math.max(Math.abs(x - 14) - 67, Math.abs(z + 22) - 75);
      const roadDistance = Math.max(Math.abs(x - 12) - 22, Math.abs(z + 130) - 130);
      const grading = (1 - span(Math.min(facilityDistance, roadDistance), 0, 36)) * inland;
      const height = naturalHeight * (1 - grading);
      positions.setX(i, x); positions.setZ(i, z);
      positions.setY(i, height);
      const color = sand.clone().lerp(grass, span(x - shore, 15, 65));
      const shade = .96 + Math.sin(x * .073 + z * .09) * .04;
      colors.push(color.r * shade, color.g * shade, color.b * shade);
    }
    terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrain.computeVertexNormals();
    const land = meshOf(terrain, this.surfaces.terrain);
    land.name = '滨海任务基地 · 连续海岸';
    land.castShadow = false;
    this.scene.add(land);
    this.seaNormal = this.bank.get('waterNormals').clone();
    this.seaNormal.wrapS = this.seaNormal.wrapT = THREE.RepeatWrapping;
    this.seaNormal.repeat.set(260, 260);
    this.seaNormal.needsUpdate = true;
    this.ownedTextures.add(this.seaNormal);
    const seaMaterial = new THREE.MeshStandardMaterial({
      color: '#416776', roughness: .19, metalness: .50, envMap: environment, envMapIntensity: 1.15,
      normalMap: this.seaNormal, normalScale: new THREE.Vector2(.42, .42),
    });
    seaMaterial.onBeforeCompile = shader => {
      shader.uniforms.missionSeaTime = this.seaTime;
      shader.fragmentShader = 'uniform float missionSeaTime;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace(
        'vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
        'vec2 swellUv = vNormalMapUv * .31 + vec2(missionSeaTime*.008,-missionSeaTime*.004);\nvec3 mapN = normalize((texture2D(normalMap,vNormalMapUv).xyz*2.0-1.0)*.65 + (texture2D(normalMap,swellUv).xyz*2.0-1.0)*.35);'));
    };
    seaMaterial.customProgramCacheKey = () => 'mission-two-scale-sea-v1';
    const sea = meshOf(new THREE.PlaneGeometry(6800, 6800), seaMaterial, [0, -.74, 0]);
    sea.rotation.x = -Math.PI / 2;
    sea.castShadow = false;
    sea.name = '任务基地 · 海面';
    this.scene.add(sea);
    const sky = new Sky();
    sky.scale.setScalar(4800);
    sky.material.depthWrite = false;
    sky.frustumCulled = false;
    sky.renderOrder = -900;
    const u = sky.material.uniforms;
    u.turbidity!.value = 2.3; u.rayleigh!.value = 2.15; u.mieCoefficient!.value = .004; u.mieDirectionalG!.value = .78;
    u.sunPosition!.value.copy(this.sunDirection).multiplyScalar(450000);
    if (u.cloudCoverage) u.cloudCoverage!.value = 0;
    configureSkyRadiance(sky.material,.125);
    sky.onBeforeRender = (_renderer, _scene, camera) => { sky.position.copy(camera.position); sky.updateMatrixWorld(); };
    this.scene.add(sky);
    this.buildDistantClouds();

    // Access road, tank farm, and an assembly hall establish the scale of the new complex.
    const asphalt = this.surfaces.asphalt, concrete = this.surfaces.concrete, orange = m.std('#9e4a30', .22, .65);
    const roadShape = new THREE.Shape();
    roadShape.moveTo(7.5, 237); roadShape.lineTo(16.5, 237);
    for (let i = 16; i >= 0; i--) { const x = 7.5 + i / 16 * 9; roadShape.lineTo(x, Math.sqrt(30.8 * 30.8 - x * x)); }
    roadShape.closePath();
    const road = meshOf(new THREE.ExtrudeGeometry(roadShape, { depth: .24, bevelEnabled: false }), asphalt, [0, -.06, 0]);
    road.rotation.x = -Math.PI / 2; road.name = '任务基地 · 埋入路基的进场道路'; this.scene.add(road);
    const gravel = concrete.clone(); gravel.color.set('#8e8a78'); gravel.roughness = 1; gravel.userData.keepAlive = false;
    for (const x of [7.21, 16.79]) this.scene.add(mBox(.55, .10, 202, gravel, [x, .015, -136]));
    const paint = m.white.clone(); paint.userData.keepAlive = false; paint.polygonOffset = true; paint.polygonOffsetFactor = -2; paint.polygonOffsetUnits = -2;
    for (let z = -231; z < -37; z += 13) this.scene.add(mBox(.17, .004, 5.8, paint, [12, .184, z]));
    const hall = new THREE.Group();
    hall.position.set(41, 0, -64);
    hall.add(mBox(28, 12, 24, concrete, [0, 6, 0]), mBox(29, .35, 25, m.metal, [0, 12.15, 0]));
    hall.add(mBox(15, 9, .12, asphalt, [0, 4.55, 12.1]));
    for (let x = -6.5; x <= 6.5; x += 1.3) hall.add(mBox(.05, 8.7, .16, m.metal, [x, 4.55, 12.19]));
    hall.add(mBox(28, .75, .16, orange, [0, 10.75, 12.1]));
    this.scene.add(hall);
    for (let i = 0; i < 3; i++) {
      const x = 31 + i * 8.0, z = -23;
      this.scene.add(mCyl(2.25, 2.25, 7.0, m.white, [x, 3.65, z]), mBall(2.25, m.white, [x, 7.15, z]));
      this.scene.add(mCyl(2.5, 2.5, .24, concrete, [x, .12, z]));
      this.scene.add(rod([x, .72, z + 2.3], [x, .72, -12], .11, m.metal));
    }
    this.scene.add(rod([31, .72, -12], [47, .72, -12], .12, m.metal));
    for (const x of [-22, 22]) for (const z of [-22, 26]) {
      this.scene.add(rod([x, 0, z], [x, 13, z], .065, m.metal), mBox(1.5, .20, .5, m.white, [x, 12.9, z]));
    }
  }

  private buildPad() {
    const m = this.materials, concrete = this.surfaces.concrete, steel = m.std('#4d575b', .60, .54), orange = m.std('#b6a062', .22, .70);
    const apron = mCyl(31, 31.65, .30, concrete, [0, .07, 0], 128);
    apron.name = '独立任务 · 环形发射坪'; this.scene.add(apron);
    const jointPoints: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; jointPoints.push(new THREE.Vector3(Math.cos(a) * 8, .223, Math.sin(a) * 8), new THREE.Vector3(Math.cos(a) * 30.95, .223, Math.sin(a) * 30.95)); }
    const joints = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(jointPoints), new THREE.LineBasicMaterial({ color: '#515652', transparent: true, opacity: .28, depthWrite: false }));
    joints.name = '发射坪 · 混凝土收缩缝'; this.scene.add(joints);
    const paint = m.white.clone(); paint.userData.keepAlive = false; paint.polygonOffset = true; paint.polygonOffsetFactor = -2; paint.polygonOffsetUnits = -2;
    for (const radius of [18, 24]) {
      const ring = meshOf(new THREE.RingGeometry(radius - .07, radius + .07, 128), paint, [0, .224, 0]); ring.rotation.x = -Math.PI / 2; ring.name = '发射坪 · 喷涂安全线'; ring.castShadow = false; this.scene.add(ring);
    }
    const pad = new THREE.Group(); pad.name = '独立任务 · 高架双肩发射台';
    for (const side of [-1, 1]) {
      pad.add(mBox(5.7, 2.55, 13.5, concrete, [side * 4.87, 1.275, -.5]), mBox(5.9, .16, 13.8, steel, [side * 4.87, 2.65, -.5]));
      for (let z = -6.4; z <= 6; z += 1.2) {
        pad.add(mBox(.12, .025, .52, orange, [side * 2.25, 2.747, z]));
        pad.add(mBox(1.1, .035, .075, m.metal, [side * 5.15, 2.75, z]));
      }
      for (let z = -6.8; z <= 6.4; z += 2.2) pad.add(rod([side * 7.68, 2.7, z], [side * 7.68, 3.52, z], .025, m.metal));
      pad.add(rod([side * 7.68, 3.52, -6.8], [side * 7.68, 3.52, 6.4], .024, m.metal));
      for (let i = 0; i < 9; i++) pad.add(mBox(2.2, (i + 1) * .30, .40, concrete, [side * 5.7, (i + 1) * .15, 10.05 - i * .42]));
      pad.add(mBox(.35, 1.10, 27, concrete, [side * 2.13, .62, 13]));
      pad.add(mBox(.025, .75, 16, this.trenchMaterial, [side * 1.948, .60, 5.5]));
      pad.add(rod([side * 3.0, 1.4, -5], [side * 3.0, 1.4, 8], .13, m.metal));
      for (let z = -2; z <= 6; z += 2) pad.add(rod([side * 3.0, 1.4, z], [side * 2.0, 1.4, z], .075, m.metal));
    }
    pad.add(mBox(15.5, 2.55, 3.1, concrete, [0, 1.275, -5.73]), mBox(3.90, .08, 27, this.trenchMaterial, [0, .20, 13]));
    // The annular launch mount spans the two concrete shoulders. Its open
    // 2.60-unit bore clears all five F-1 bells and drains into the flame trench.
    const mountShape = new THREE.Shape(); mountShape.absarc(0, 0, 2.16, 0, Math.PI * 2, false);
    const mountHole = new THREE.Path(); mountHole.absarc(0, 0, 1.30, 0, Math.PI * 2, true); mountShape.holes.push(mountHole);
    const mountGeometry = new THREE.ExtrudeGeometry(mountShape, { depth: .33, bevelEnabled: false, curveSegments: 96 });
    mountGeometry.rotateX(-Math.PI / 2);
    const mount = meshOf(mountGeometry, steel, [0, 2.73, 0]); mount.name = '发射座 · 开口承力环与排焰孔'; pad.add(mount);
    for (const z of [-1.74, 1.74]) {
      const beam = this.padContactBox(4.7, .32, .36, steel, [0, 2.61, z]); beam.name = '发射座 · 跨槽承重梁'; pad.add(beam);
    }
    // These four horizontal shoes meet the actual underside of the vehicle's
    // S-IC thrust frame (.94 * vehicle scale + baseY), not its engine nozzles.
    const supportHeight = this.baseY + .94 * (23.4 / 22), pivotY = 3.50;
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2, pedestal = new THREE.Group();
      pedestal.name = `发射座 · 承力支座 ${i + 1}`;
      pedestal.position.set(Math.cos(angle) * 1.65, 0, Math.sin(angle) * 1.65); pedestal.rotation.y = -angle;
      pedestal.add(this.padContactBox(.55, .10, .62, m.metal, [0, 3.11, 0]));
      pedestal.add(this.padContactBox(.34, pivotY - 3.16, .42, steel, [0, (pivotY + 3.16) / 2, 0]));
      const pin = mCyl(.13, .13, .56, m.metal, [0, pivotY, 0], 24); pin.rotation.x = Math.PI / 2; pedestal.add(pin);
      const clamp = new THREE.Group(); clamp.name = `发射座 · 可释放固定爪 ${i + 1}`; clamp.position.y = pivotY;
      const shoe = this.padContactBox(.80, .14, .38, steel, [-.37, supportHeight - .07 - pivotY, 0]);
      shoe.name = '固定爪 · 与一级推力架接触的承力面'; shoe.userData.supportHeight = supportHeight; clamp.add(shoe);
      for (const side of [-1, 1]) {
        clamp.add(rod([0, .015, side * .135], [-.52, supportHeight - .15 - pivotY, side * .135], .053, m.metal));
        const bolt = mCyl(.028, .028, .09, m.metal, [-.20, supportHeight - .14 - pivotY, side * .145], 8); clamp.add(bolt);
      }
      pedestal.add(clamp); this.holdDowns.push(clamp); pad.add(pedestal);
    }
    this.scene.add(pad);

    const tower = new THREE.Group(); tower.name = '独立任务 · 氧化红脐带服务塔'; tower.position.set(-9.2, .48, -5.6);
    const redSteel = this.surfaces.tower;
    tower.add(mBox(5.2, .62, 5.7, concrete, [0, -.28, 0]));
    for (const x of [-1.55, 1.55]) for (const z of [-1.85, 1.85]) {
      tower.add(mBox(.26, 25.55, .27, redSteel, [x, 12.6, z]));
      tower.add(mBox(.55, .10, .64, steel, [x, .09, z]));
    }
    const stairTreads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.08, .065, .31), steel, 98);
    stairTreads.name = '服务塔 · 七层折返检修楼梯'; stairTreads.castShadow = stairTreads.receiveShadow = true;
    const stairPose = new THREE.Object3D(); let stepIndex = 0;
    for (let level = 0; level < 8; level++) {
      const y = level * 3.15;
      tower.add(mBox(3.78, .14, 4.25, steel, [0, y, 0]));
      for (const z of [-1.96, 1.96]) {
        tower.add(mBox(3.82, .20, .14, redSteel, [0, y - .08, z]), rod([-1.85, y + .94, z], [1.85, y + .94, z], .025, redSteel));
        for (const x of [-1.83, 0, 1.83]) tower.add(rod([x, y, z], [x, y + .94, z], .024, redSteel));
      }
      for (const x of [-1.76, 1.76]) tower.add(rod([x, y + .94, -1.96], [x, y + .94, 1.96], .025, redSteel));
      if (level < 7) {
        for (const z of [-1.85, 1.85]) tower.add(rod([-1.55, y + .10, z], [1.55, y + 3.05, z], .082, redSteel), rod([1.55, y + .10, z], [-1.55, y + 3.05, z], .082, redSteel));
        tower.add(rod([-1.55, y + .10, -1.85], [-1.55, y + 3.05, 1.85], .08, redSteel));
        const forward = level % 2 === 0;
        for (let i = 0; i < 14; i++) {
          stairPose.position.set(2.35, y + (i + 1) * .225, (forward ? -1.62 : 1.62) + (forward ? 1 : -1) * i * .25);
          stairPose.updateMatrix(); stairTreads.setMatrixAt(stepIndex++, stairPose.matrix);
        }
        for (const x of [1.80, 2.90]) {
          tower.add(rod([x, y + .85, forward ? -1.77 : 1.77], [x, y + 4.0, forward ? 1.77 : -1.77], .029, redSteel));
          for (const f of [0, .5, 1]) { const z = (forward ? -1.77 : 1.77) * (1 - 2 * f), h = y + 3.15 * f; tower.add(rod([x, h, z], [x, h + .85, z], .022, redSteel)); }
        }
      }
      tower.add(mBox(1.28, .12, .95, steel, [2.35, y, level % 2 ? 1.67 : -1.67]));
    }
    tower.add(stairTreads);
    for (const x of [-.65, 0, .65]) tower.add(rod([x, .1, -2.05], [x, 24.1, -2.05], x === 0 ? .115 : .074, m.metal));
    for (const y of [7.4, 11.9, 17.7, 23.0]) {
      const arm = new THREE.Group(); arm.position.set(1.65, y, 1.3); arm.userData.restYaw = -.42; arm.rotation.y = -.42;
      arm.add(mBox(7.3, .18, 1.12, steel, [3.65, 0, 0]));
      for (const z of [-.50, .50]) {
        arm.add(mBox(7.3, .24, .12, redSteel, [3.65, -.11, z]), rod([0, 1.02, z], [7.2, 1.02, z], .025, redSteel));
        for (let x = .3; x < 7.3; x += 1.15) arm.add(rod([x, 0, z], [x, 1.02, z], .025, redSteel));
        arm.add(rod([0, -.9, z], [6.8, -.17, z], .07, redSteel));
      }
      arm.add(rod([.3, .24, -.18], [7.2, .24, -.18], .070, m.metal));
      const hose = new THREE.CatmullRomCurve3([new THREE.Vector3(6.45, .36, -.2), new THREE.Vector3(7.25, .3, -.15), new THREE.Vector3(7.60, -.22, .12), new THREE.Vector3(7.75, -.42, .38)]);
      arm.add(meshOf(new THREE.TubeGeometry(hose, 12, .066, 7, false), m.dark));
      arm.name = '服务塔 · 可回转脐带工作臂'; tower.add(arm); this.arms.push(arm);
    }
    tower.add(mBox(4.5, .20, 4.65, redSteel, [0, 25.6, 0]), rod([-.9, 25.6, -.9], [-.9, 30.4, -.9], .038, m.metal));
    const beacon = new THREE.MeshStandardMaterial({ color: '#b92715', emissive: '#ff3617', emissiveIntensity: 1.7, roughness: .3 });
    tower.add(mBall(.10, beacon, [-.9, 28.45, -.9]));
    this.scene.add(tower);
  }

  private padContactBox(width: number, height: number, depth: number, material: THREE.Material, position: Vec3T) {
    const mesh = meshOf(new THREE.BoxGeometry(width, height, depth), material, position) as THREE.Mesh<THREE.BoxGeometry>;
    this.padContacts.push({ mesh, halfX: width / 2, halfZ: depth / 2, x: 0, z: 0, top: 0, xx: 1, xz: 0, zx: 0, zz: 1 });
    return mesh;
  }

  private updateHoldDowns(state: MissionFlightState) {
    const failed = state.phase === 'falling' || state.phase === 'crashed';
    const release = state.phase === 'ready' ? 0 : Math.max(
      span(state.time, MISSION_FLIGHT.ignitionDuration - .20, MISSION_FLIGHT.ignitionDuration),
      failed ? span(state.fallTime + state.crashTime, 0, .22) : 0,
    );
    this.holdDowns.forEach(clamp => { clamp.rotation.y = release * 1.45; });
    // Record the real rotated footprints once per frame. Contact queries then
    // stay cheap and cannot hit an invisible, already-retracted support shoe.
    for (const contact of this.padContacts) {
      contact.mesh.updateWorldMatrix(true, false);
      const e = contact.mesh.matrixWorld.elements;
      contact.x = e[12]; contact.z = e[14]; contact.top = e[13] + contact.mesh.geometry.parameters.height / 2;
      contact.xx = e[0]; contact.xz = e[2]; contact.zx = e[8]; contact.zz = e[10];
    }
  }

  private buildDistantClouds() {
    const clouds = makeSmoke(48, false, { radial: true, emissionDuration: 9999 });
    clouds.name = '海岸远景 · 稀疏积云群'; clouds.userData.softSmoke = false; clouds.renderOrder = -100;
    clouds.material.uniforms.power!.value = .34; clouds.material.uniforms.time!.value = 8;
    const puff = clouds.geometry.attributes.puff as THREE.InstancedBufferAttribute, ages = clouds.geometry.attributes.ageSeed as THREE.InstancedBufferAttribute;
    const random = seeded(91741), centers = [[-540, 175, -860], [-275, 155, -1120], [240, 195, -900], [530, 210, -1170]] as const;
    const records = Array.from({ length: 48 }, (_, i) => { const c = centers[Math.floor(i / 12)]!; return { x: c[0] + (random() - .5) * 145, y: c[1] + (random() - .5) * 26, z: c[2] + (random() - .5) * 90, radius: 20 + random() * 33, seed: random(), depth: 0 }; });
    const point = new THREE.Vector3();
    clouds.onBeforeRender = (_renderer, _scene, camera) => {
      clouds.material.uniforms.softDepthEnabled!.value = 0;
      for (const p of records) { point.set(p.x, p.y, p.z).applyMatrix4(camera.matrixWorldInverse); p.depth = -point.z; }
      records.sort((a, b) => b.depth - a.depth);
      records.forEach((p, i) => { puff.setXYZW(i, p.x, p.y, p.z, p.radius); ages.setXY(i, 7 + p.seed * 3, p.seed); });
      puff.needsUpdate = true; ages.needsUpdate = true; clouds.material.uniformsNeedUpdate = true;
    };
    this.scene.add(clouds);
  }

  private piece(name: string, rest: Vec3T, rotationY = 0) {
    const object = new THREE.Group(); object.name = name;
    const index = this.pieces.length, a = index * 2.39996;
    const data: MissionDebrisPiece = {
      object, rest: new THREE.Vector3(...rest), rotation: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY), bounds: new THREE.Box3(), contactPoints: new Float32Array(),
      kick: new THREE.Vector3(Math.cos(a) * (3.7 + (index % 3) * 1.6), 3.8 + (index % 3) * 1.05, Math.sin(a) * (4.0 + (index % 2) * 1.6)),
      spin: new THREE.Vector3(.32 + index * .088, .29 - index * .056, (index % 2 ? 1 : -1) * (.56 + index * .088)),
      delay: (index % 4) * .025, landedAt: null, landingPosition: new THREE.Vector3(), landingRotation: new THREE.Quaternion(), impactPosition: new THREE.Vector3(), impactRotation: new THREE.Quaternion(),
    };
    this.pieces.push(data); this.scene.add(object); return object;
  }

  private buildVehicle() {
    const vehicle = buildMissionVehicle(this.materials, (name, rest, rotationY) => this.piece(name, rest, rotationY));
    this.flames.push(...vehicle.flames);
    vehicle.textures.forEach(texture => this.ownedTextures.add(texture));
    for (const piece of this.pieces) {
      // Exhaust is excluded from physical debris bounds and therefore from ground contact.
      const flameVisibility = this.flames.map(f => f.visible); this.flames.forEach(f => { f.visible = false; });
      piece.object.updateMatrixWorld(true);
      piece.bounds.makeEmpty();
      const points: number[] = [], seen = new Set<string>(), point = new THREE.Vector3();
      piece.object.traverseVisible(node => {
        const mesh = node as THREE.Mesh; if (!mesh.isMesh) return;
        mesh.geometry.computeBoundingBox(); if (mesh.geometry.boundingBox) piece.bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
        const positions = mesh.geometry.attributes.position!;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
          const key = `${Math.round(point.x * 10000)},${Math.round(point.y * 10000)},${Math.round(point.z * 10000)}`;
          if (!seen.has(key)) { seen.add(key); points.push(point.x, point.y, point.z); }
        }
      });
      piece.contactPoints = new Float32Array(points);
      this.flames.forEach((f, i) => { f.visible = flameVisibility[i]!; });
    }
  }

  private makeTrail(count: number) {
    const smoke = makeSmoke(count, false, { trail: true, emissionDuration: 999 });
    smoke.name = '任务 · 实时飞行轨迹尾烟';
    const puff = smoke.geometry.attributes.puff as THREE.InstancedBufferAttribute;
    const ageSeed = smoke.geometry.attributes.ageSeed as THREE.InstancedBufferAttribute;
    const point = new THREE.Vector3();
    smoke.onBeforeRender = (_renderer, _scene, camera) => {
      const time = Number(smoke.material.uniforms.time!.value);
      smoke.material.uniforms.softDepthEnabled!.value = smoke.material.userData.softSmokeCamera === camera ? 1 : 0;
      smoke.material.uniforms.rootScale!.value = 1;
      const billows = this.exhaust.map(birth => {
        const age = Math.max(0, time - birth.time), angle = birth.seed * Math.PI * 2;
        const x = Math.cos(angle) * age * .15, y = Math.max(.22, this.baseY + birth.height - age * .44), z = Math.sin(angle) * age * .16;
        point.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        return { x, y, z, age, seed: birth.seed, radius: .30 + age * .35, depth: -point.z };
      }).sort((a, b) => b.depth - a.depth);
      smoke.geometry.instanceCount = Math.min(count, billows.length);
      billows.slice(0, count).forEach((b, i) => { puff.setXYZW(i, b.x, b.y, b.z, b.radius); ageSeed.setXY(i, b.age, b.seed); });
      puff.needsUpdate = true; ageSeed.needsUpdate = true;
      smoke.material.uniformsNeedUpdate = true;
    };
    return smoke;
  }

  private makeWreckSmoke(count: number) {
    const smoke = makeSmoke(count, false, { radial: true, emissionDuration: 9999 });
    smoke.name = '任务失败 · 残骸燃烧烟柱';
    smoke.material.fragmentShader = smoke.material.fragmentShader.replace(
      'vec3 c=mix(vec3(.81,.84,.87),vec3(.39,.40,.43),fresh*.56)*lit;',
      'vec3 c=mix(vec3(.24,.26,.28),vec3(.10,.105,.11),fresh*.68)*lit;');
    const puff = smoke.geometry.attributes.puff as THREE.InstancedBufferAttribute;
    const ages = smoke.geometry.attributes.ageSeed as THREE.InstancedBufferAttribute;
    const random = seeded(71621), seeds = Array.from({ length: count }, () => random());
    const point = new THREE.Vector3();
    smoke.onBeforeRender = (_renderer, _scene, camera) => {
      const elapsed = Math.max(0, Number(smoke.material.uniforms.time!.value)), life = 12;
      smoke.material.uniforms.softDepthEnabled!.value = smoke.material.userData.softSmokeCamera === camera ? 1 : 0;
      smoke.material.uniforms.rootScale!.value = 1;
      const billows = seeds.map((seed, i) => {
        const birth = i / count * life, age = elapsed < birth ? -1 : (elapsed - birth) % life;
        const angle = seed * Math.PI * 2;
        const x = Math.cos(angle) * (.25 + age * .15) + age * .22, y = .35 + age * .78, z = Math.sin(angle) * (.25 + age * .14);
        point.set(x, y, z).applyMatrix4(smoke.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
        return { x, y, z, age, seed, depth: -point.z, radius: .45 + Math.max(0, age) * .24 };
      }).sort((a, b) => b.depth - a.depth);
      billows.forEach((b, i) => { puff.setXYZW(i, b.x, b.y, b.z, b.radius); ages.setXY(i, b.age, b.seed); });
      puff.needsUpdate = true; ages.needsUpdate = true; smoke.material.uniformsNeedUpdate = true;
    };
    return smoke;
  }

  /** All pieces share this one transform until the impact phase begins. */
  private placeFallingVehicle(state: MissionFlightState) {
    const fall = state.fallTime, tilt = span(fall, .18, 2.8);
    this.pose.setFromEuler(new THREE.Euler(.19 * tilt, .035 * tilt, -1.07 * tilt));
    const drift = Math.min(8, Math.pow(Math.max(0, fall - .30), 1.12) * .82);
    this.rigidOrigin.set(drift, this.baseY + state.height + 10, drift * .27);
    let clearance = Infinity;
    for (const piece of this.pieces) {
      piece.object.position.copy(piece.rest).sub(this.vector.set(0, 10, 0)).applyQuaternion(this.pose).add(this.rigidOrigin);
      piece.object.quaternion.copy(this.pose).multiply(piece.rotation);
      const distance = this.pieceClearance(piece, true);
      if (distance < clearance) { clearance = distance; this.crashPosition.copy(this.contactPoint); }
    }
    // The simulation height reaches zero at impact. Blend the model's physical
    // support height into that origin so the last falling pose already touches
    // the actual pad/ground surface; the impact frame does not snap downward.
    const landing = span(fall, .06, .45) * (1 - span(state.height, 0, 10));
    const correction = Math.max(-clearance, -(clearance - state.height) * landing);
    for (const piece of this.pieces) piece.object.position.y += correction;
    this.rigidOrigin.y += correction; this.crashPosition.y += correction;
  }

  private pieceClearance(piece: MissionDebrisPiece, trackContact = false) {
    let minimum = Infinity;
    const points = piece.contactPoints, object = piece.object;
    for (let i = 0; i < points.length; i += 3) {
      this.vector.set(points[i]!, points[i + 1]!, points[i + 2]!).applyQuaternion(object.quaternion).add(object.position);
      const distance = this.vector.y - this.surfaceHeight(this.vector.x, this.vector.z);
      if (distance < minimum) { minimum = distance; if (trackContact) this.contactPoint.copy(this.vector); }
    }
    return minimum;
  }

  update(state: MissionFlightState, dt: number) {
    this.cameraPosition.sub(this.cameraShake); this.cameraShake.set(0, 0, 0);
    this.cameraTarget.sub(this.cameraTargetShake); this.cameraTargetShake.set(0, 0, 0); this.cameraRoll = 0;
    const reset = !this.lastState || state.time < this.lastState.time || (state.phase === 'ready' && this.lastState.phase !== 'ready');
    if (reset) {
      this.failureStart = null; this.exhaust.length = 0; this.nextBirth = 0;
      this.pieces.forEach(p => { p.landedAt = null; });
      this.cameraInitialized = false; this.impactCaptured = false;
      if (this.lastState) this.restartIntro();
    }
    this.updateHoldDowns(state);
    const failed = state.phase === 'falling' || state.phase === 'crashed';
    const fall = state.fallTime + state.crashTime;
    if (failed && !this.failureStart) {
      const t = state.fallTime;
      const velocity = state.velocity + MISSION_FLIGHT.gravity * t;
      const previous = this.lastState;
      // A coarse review step may jump straight to crashed, whose velocity is
      // already clamped to zero. Preserve the last powered snapshot in that case.
      this.failureStart = previous && previous.phase !== 'falling' && previous.phase !== 'crashed'
        ? { height: previous.height, velocity: previous.velocity, time: state.time - fall }
        : { height: Math.max(0, state.height - velocity * t + MISSION_FLIGHT.gravity * t * t / 2), velocity, time: state.time - fall };
    }
    const crashed = state.phase === 'crashed', impact = state.crashTime;
    if (!failed) {
      for (const piece of this.pieces) {
        const object = piece.object;
        object.position.copy(piece.rest).add(this.vector.set(0, this.baseY + state.height, 0));
        object.quaternion.copy(piece.rotation);
      }
    } else {
      if (!crashed || !this.impactCaptured) this.placeFallingVehicle(state);
      if (crashed && !this.impactCaptured) {
        this.pieces.forEach(piece => { piece.impactPosition.copy(piece.object.position); piece.impactRotation.copy(piece.object.quaternion); });
        this.impactCenter.copy(this.rigidOrigin);
        this.crashPosition.y = this.surfaceHeight(this.crashPosition.x, this.crashPosition.z);
        this.impactCaptured = true;
      }
      if (crashed) for (const piece of this.pieces) {
        const object = piece.object, t = Math.max(0, impact - piece.delay);
        if (piece.landedAt !== null) {
          object.position.copy(piece.landingPosition);
          object.quaternion.copy(piece.landingRotation);
        } else {
          object.position.copy(piece.impactPosition).addScaledVector(piece.kick, t);
          object.position.y -= MISSION_FLIGHT.gravity * t * t / 2;
          object.quaternion.copy(piece.impactRotation).multiply(this.pose.setFromEuler(new THREE.Euler(piece.spin.x * t, piece.spin.y * t, piece.spin.z * t)));
          const clearance = this.pieceClearance(piece);
          if (clearance < 0) {
            object.position.y -= clearance;
            if (t > .04 && piece.kick.y - MISSION_FLIGHT.gravity * t < 0) {
              piece.landedAt = impact; piece.landingPosition.copy(object.position); piece.landingRotation.copy(object.quaternion);
            }
          }
        }
      }
    }
    for (const flame of this.flames) {
      flame.visible = !failed && state.power > .005;
      flame.material.uniforms.time!.value = state.time;
      flame.material.uniforms.power!.value = failed ? 0 : state.power;
    }
    this.engineLight.position.set(0, this.baseY + state.height + .3, 0);
    this.engineLight.intensity = failed ? 0 : 1100 * state.power;
    this.trenchMaterial.emissiveIntensity = failed ? 0 : state.power * (1 - span(state.height, 3, 22)) * .60;
    this.arms.forEach((arm, i) => { arm.rotation.y = Number(arm.userData.restYaw ?? 0) - span(state.time, .15 + i * .035, .72) * 1.22; });
    this.padSmoke.material.uniforms.time!.value = state.time;
    this.padSmoke.material.uniforms.power!.value = state.phase === 'ready' ? 0 : .93 * (1 - span(state.time, 14, 22)) * (crashed ? 1 - span(impact, 0, .45) : 1);

    if ((state.phase === 'igniting' || state.phase === 'flying') && state.power > .08) {
      const previousTime = this.lastState?.time ?? 0, previousHeight = this.lastState?.height ?? 0;
      while (this.nextBirth <= state.time) {
        if (this.nextBirth >= previousTime - .08) {
          const blend = Math.min(1, Math.max(0, (this.nextBirth - previousTime) / Math.max(.0001, state.time - previousTime)));
          this.exhaust.push({ time: this.nextBirth, height: THREE.MathUtils.lerp(previousHeight, state.height, blend), seed: this.random() });
        }
        this.nextBirth += this.quality === 'high' ? .065 : .09;
      }
    }
    this.exhaust = this.exhaust.filter(birth => state.time - birth.time < 11).slice(-(this.quality === 'high' ? 220 : 150));
    this.trail.material.uniforms.time!.value = state.time;
    this.trail.material.uniforms.power!.value = this.exhaust.length ? .78 * (crashed ? 1 - span(impact, .1, 1.0) : 1) : 0;
    this.crashSmoke.position.copy(this.crashPosition);
    this.crashSmoke.material.uniforms.time!.value = impact;
    this.crashSmoke.material.uniforms.power!.value = crashed ? .53 * (1 - span(impact, 5, 10)) : 0;
    this.wreckSmoke.position.copy(this.crashPosition); this.wreckSmoke.position.y += 5.8;
    this.wreckSmoke.material.uniforms.time!.value = Math.max(0, impact - .25);
    this.wreckSmoke.material.uniforms.power!.value = crashed ? .50 * span(impact, .3, 1.2) : 0;
    this.impactFire.visible = crashed && impact < 1.65;
    this.impactFire.position.copy(this.crashPosition); this.impactFire.position.y += impact * 1.2;
    const blastExpansion = span(impact, 0, .48);
    this.impactFire.scale.set(3.8 + blastExpansion * 3.5, 2.0 + blastExpansion * 1.45, 3.8 + blastExpansion * 3.5);
    this.impactFire.material.uniforms.time!.value = state.time * 1.6;
    this.impactFire.material.uniforms.power!.value = crashed ? 1.35 * (1 - span(impact, .65, 1.65)) : 0;
    this.shockRing.visible = crashed && impact < 1.5;
    this.shockRing.position.copy(this.crashPosition); this.shockRing.position.y = .27;
    this.shockRing.scale.setScalar(2.2 + impact * 29);
    this.shockRing.material.opacity = crashed ? .70 * Math.exp(-impact * 2.6) : 0;
    this.flash.visible = crashed && impact < .26;
    this.flash.position.copy(this.crashPosition); this.flash.position.y += .85;
    this.flash.scale.setScalar(.85 + Math.min(.22, impact) * 14);
    this.flash.material.opacity = crashed ? Math.exp(-impact * 12) * .65 : 0;
    this.crashLight.position.copy(this.flash.position);
    this.crashLight.intensity = crashed ? 4400 * Math.exp(-impact * 5) + 1150 * (.88 + .12 * Math.sin(state.time * 17)) : 0;
    this.scorch.position.copy(this.crashPosition); this.scorch.position.y += .025;
    this.scorch.material.opacity = crashed ? .47 * span(impact, 0, .5) : 0;
    this.wreckFires.forEach((fire, i) => {
      const piece = this.pieces[i === 1 ? 0 : i === 2 ? 1 : 2]!;
      fire.visible = crashed && (i === 0 || piece.landedAt !== null);
      if (i === 0) fire.position.copy(this.crashPosition);
      else { fire.position.copy(piece.object.position); fire.position.y = this.surfaceHeight(fire.position.x, fire.position.z); }
      fire.position.y += .06;
      fire.material.uniforms.time!.value = state.time + i * 3.47;
      fire.material.uniforms.power!.value = fire.visible ? (i ? .95 : 1.20) * (.90 + .10 * Math.sin(state.time * 11 + i * 1.8)) : 0;
    });

    const airborne = span(state.height, 2, 20), failureWiden = failed ? span(fall, .3, 2.0) : 0;
    const desiredTarget = new THREE.Vector3(0, this.baseY + state.height + 10.8, 0);
    if (failed) desiredTarget.copy(this.rigidOrigin);
    if (crashed) desiredTarget.copy(this.impactCenter).lerp(this.vector.copy(this.crashPosition).add(new THREE.Vector3(1.5, 4, 0)), span(impact, .12, 1.8));
    const desiredPosition = new THREE.Vector3(THREE.MathUtils.lerp(32, 28, airborne) + failureWiden * 10, 10.6 + failureWiden * 7.4, THREE.MathUtils.lerp(45, 39, airborne) + failureWiden * 16).add(desiredTarget);
    if (!this.cameraInitialized) { this.cameraPosition.copy(desiredPosition); this.cameraTarget.copy(desiredTarget); this.cameraInitialized = true; }
    else { const follow = 1 - Math.exp(-Math.max(0, Math.min(1, dt)) * (failed ? 6 : 4)); this.cameraPosition.lerp(desiredPosition, follow); this.cameraTarget.lerp(desiredTarget, follow); }
    if (!failed && (state.phase === 'igniting' || state.phase === 'flying')) {
      const launchRumble = span(state.time, .04, .72) * (1 - span(state.time, 1.45, 3.8)) * state.power;
      const amplitude = launchRumble * .46;
      this.cameraShake.set((Math.sin(state.time * 71) + .30 * Math.sin(state.time * 117)) * amplitude, (Math.sin(state.time * 89 + .4) + .24 * Math.sin(state.time * 137)) * amplitude * .76, Math.sin(state.time * 61) * amplitude * .28);
      this.cameraRoll = launchRumble * (.0048 * Math.sin(state.time * 63) + .0018 * Math.sin(state.time * 101));
    } else if (crashed && impact < 1.2) {
      const amplitude = 1.05 * Math.exp(-impact * 2.8) * (1 - span(impact, .8, 1.2));
      this.cameraShake.set(Math.sin(impact * 79) * amplitude, Math.sin(impact * 103 + .3) * amplitude * .72, Math.sin(impact * 67) * amplitude * .30);
      this.cameraRoll = Math.sin(impact * 87) * amplitude * .013;
    }
    this.cameraTargetShake.copy(this.cameraShake).multiplyScalar(.72);
    this.cameraPosition.add(this.cameraShake); this.cameraTarget.add(this.cameraTargetShake);
    this.cameraFov = THREE.MathUtils.lerp(43, 43.5, airborne);
    if (state.phase !== 'ready') {
      // Direct scene reviewers may launch immediately; a live flight always
      // keeps its normal tracking camera instead of replaying an arrival shot.
      this.introTime = this.introDuration;
    } else if (!this.introComplete) {
      this.introTime = Math.min(this.introDuration, this.introTime + (Number.isFinite(dt) ? Math.max(0, Math.min(1, dt)) : 0));
      if (this.introTime <= 2.1) {
        const scan = span(this.introTime, .25, 2.1);
        this.cameraPosition.copy(this.introTopPosition).lerp(this.introScanPosition, scan);
        this.cameraTarget.copy(this.introTopTarget).lerp(this.introScanTarget, scan);
        this.cameraFov = THREE.MathUtils.lerp(46, 54, scan);
      } else {
        const reveal = span(this.introTime, 2.1, this.introDuration);
        this.cameraPosition.copy(this.introScanPosition).lerp(desiredPosition, reveal);
        this.cameraTarget.copy(this.introScanTarget).lerp(desiredTarget, reveal);
        this.cameraFov = THREE.MathUtils.lerp(54, this.cameraFov, reveal);
      }
      this.cameraRoll = 0;
    }
    applyMissionCloudProfile(this.cloudVolume, state.height, state.time);
    this.sun.position.copy(this.sunDirection).multiplyScalar(155); this.sun.position.y += state.height * .60;
    this.sun.target.position.set(0, state.height * .60, 0);
    if (this.seaNormal) this.seaNormal.offset.set(state.time * .0017, state.time * .0010);
    this.seaTime.value = state.time + this.introTime;
    this.lastState = state;
  }

  private surfaceHeight(x: number, z: number) {
    const inside = (x0: number, x1: number, z0: number, z1: number) => x > x0 && x < x1 && z > z0 && z < z1;
    let height = .02;
    if (inside(-7.82, -1.92, -7.4, 6.4) || inside(1.92, 7.82, -7.4, 6.4) || inside(-7.75, 7.75, -7.28, -4.18)) height = 2.75;
    else if (inside(-11.8, -6.6, -8.45, -2.75)) height = .51;
    else if (inside(-2.305, -1.955, -.5, 26.5) || inside(1.955, 2.305, -.5, 26.5)) height = 1.20;
    else if (inside(-1.95, 1.95, -.5, 26.5)) height = .24;
    else if (Math.hypot(x, z) < 31) height = .22;
    else if (inside(7.5, 16.5, -237, -28)) height = .18;
    const radial = Math.hypot(x, z);
    if (radial >= 1.30 && radial <= 2.16) height = Math.max(height, 3.06);
    if (Math.abs(x) < 2.45 && Math.abs(z) < 2.45) for (const contact of this.padContacts) {
      const dx = x - contact.x, dz = z - contact.z;
      if (Math.abs(dx * contact.xx + dz * contact.xz) <= contact.halfX && Math.abs(dx * contact.zx + dz * contact.zz) <= contact.halfZ) height = Math.max(height, contact.top);
    }
    return height;
  }

  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => { if (!material.userData.keepAlive) material.dispose(); });
    this.ownedTextures.forEach(texture => texture.dispose());
    this.sun.shadow.dispose();
    this.scene.clear();
    this.exhaust.length = 0;
  }
}
