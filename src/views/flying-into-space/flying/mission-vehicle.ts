import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { canvasTexture } from './assets';
import { makeFlame } from './effects';
import { ModelMaterials, meshOf, mCyl, rod, torus } from './models';
import { seeded, type Vec3T } from './math';

/** Saturn V proportions at a 23.4-unit display height, including Apollo's LES.
 * The ten callback calls are also the mission's existing rigid-body contract:
 * engines, S-IC, S-II, tapered interstage, S-IVB, Apollo, four tail fins.
 */
export function buildMissionVehicle(
  materials: ModelMaterials,
  createPiece: (name: string, rest: Vec3T, rotationY?: number) => THREE.Group,
): { flames: ReturnType<typeof makeFlame>[]; textures: THREE.Texture[] } {
  const scale = 23.4 / 22, radius = 22 * 10.06 / 110.6 / 2 * scale, thirdRadius = radius * 21.7 / 33;
  const flames: ReturnType<typeof makeFlame>[] = [], textures: THREE.Texture[] = [];
  const random = seeded(5061969);
  const texture = (width: number, height: number, draw: (context: CanvasRenderingContext2D) => void, data = false) => {
    const map = canvasTexture(width, height, draw, data); map.anisotropy = 4; textures.push(map); return map;
  };
  const skin = texture(1024, 512, c => {
    c.fillStyle = '#f0f0e9'; c.fillRect(0, 0, 1024, 512);
    for (let x = 0; x < 1024; x += 32) {
      c.fillStyle = `rgba(99,109,110,${.018 + random() * .021})`; c.fillRect(x, 0, 31, 512);
      c.fillStyle = 'rgba(87,99,101,.085)'; c.fillRect(x, 0, .7, 512);
      for (let y = 13; y < 512; y += 22) { c.fillStyle = 'rgba(65,80,82,.12)'; c.fillRect(x + 2, y, 1, 1); }
    }
    for (const y of [28, 185, 340, 487]) { c.fillStyle = 'rgba(120,127,125,.10)'; c.fillRect(0, y, 1024, .8); }
    for (let i = 0; i < 2800; i++) { c.fillStyle = `rgba(105,111,107,${random() * .045})`; c.fillRect(random() * 1024, random() * 512, 1, 1); }
  });
  const skinBump = texture(512, 512, c => {
    c.fillStyle = '#888888'; c.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) { c.fillStyle = '#777777'; c.fillRect(x, 0, 1, 512); c.fillStyle = '#939393'; c.fillRect(x + 1, 0, 1, 512); }
    for (let i = 0; i < 3800; i++) { const shade = 125 + Math.floor(random() * 22); c.fillStyle = `rgb(${shade},${shade},${shade})`; c.fillRect(random() * 512, random() * 512, 1, 1); }
  }, true);
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', map: skin, bumpMap: skinBump, bumpScale: .004, metalness: .20, roughness: .59 });
  const ribWhite = materials.std('#e2e4df', .24, .51), black = materials.std('#171b1d', .19, .65);
  const aluminium = materials.std('#b8bfc0', .77, .36), brushed = materials.std('#7e898a', .74, .44);
  const nozzleMetal = new THREE.MeshStandardMaterial({ color: '#414b50', metalness: .81, roughness: .51, side: THREE.DoubleSide });
  const origins = new Map<THREE.Group, number>();
  const piece = (name: string, rest: Vec3T, rotationY = 0) => {
    const group = createPiece(name, rest, rotationY); origins.set(group, rest[1]); return group;
  };
  const cylinder = (group: THREE.Group, name: string, bottom: number, top: number, bottomRadius: number, topRadius = bottomRadius, material: THREE.Material = white) => {
    const object = mCyl(topRadius, bottomRadius, (top - bottom) * scale, material, [0, (bottom + top) * scale / 2 - origins.get(group)!, 0], 64);
    object.name = name; group.add(object); return object;
  };
  const ring = (group: THREE.Group, y: number, r: number, width = .009, material: THREE.Material = aluminium) => {
    const object = torus(r, width, material, [0, y * scale - origins.get(group)!, 0]); object.rotation.x = Math.PI / 2; group.add(object);
  };
  const ribs = (group: THREE.Group, name: string, bottom: number, top: number, r: number, count: number, material: THREE.Material = ribWhite) => {
    const boxes: THREE.BufferGeometry[] = [];
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      const box = new THREE.BoxGeometry(.010, (top - bottom) * scale, .014);
      box.rotateY(angle); box.translate(Math.sin(angle) * r, (bottom + top) * scale / 2 - origins.get(group)!, Math.cos(angle) * r); boxes.push(box);
    }
    const geometry = mergeGeometries(boxes); boxes.forEach(box => box.dispose());
    if (geometry) { const object = meshOf(geometry, material); object.name = name; group.add(object); }
  };
  const rollMarks = (group: THREE.Group, bottom: number, top: number, r: number, offset = Math.PI / 8) => {
    for (let i = 0; i < 4; i++) {
      const object = meshOf(new THREE.CylinderGeometry(r + .004, r + .004, (top - bottom) * scale, 16, 1, true, i * Math.PI / 2 + offset, Math.PI / 4), black, [0, (bottom + top) * scale / 2 - origins.get(group)!, 0]);
      object.name = '黑白滚转识别标志'; object.castShadow = false; group.add(object);
    }
  };
  const localRod = (group: THREE.Group, a: Vec3T, b: Vec3T, r: number, material: THREE.Material) => {
    const y = origins.get(group)!;
    group.add(rod([a[0], a[1] * scale - y, a[2]], [b[0], b[1] * scale - y, b[2]], r, material));
  };

  // All five F-1 engines have the same bell size. The four outside engines sit
  // beneath their individual aerodynamic fairings; the fifth is centered.
  const engine = piece('土星五号 · 五台 F-1 发动机', [0, 1, 0]);
  cylinder(engine, 'S-IC 推力架', .94, 1.36, radius * .96, radius, brushed);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4, distance = i === 4 ? 0 : .77 * scale;
    const x = Math.cos(angle) * distance, z = Math.sin(angle) * distance;
    const bell = meshOf(new THREE.LatheGeometry(([
      [.35, -.80], [.348, -.73], [.304, -.52], [.240, -.25], [.151, -.025], [.122, .09], [.142, .21],
    ] as const).map(([r, y]) => new THREE.Vector2(r * scale, y * scale)), 48), nozzleMetal, [x, 0, z]);
    bell.name = `F-1 ${i + 1} · 开口钟形喷管`; engine.add(bell);
    const lip = torus(.35 * scale, .012, aluminium, [x, -.80 * scale, z]); lip.rotation.x = Math.PI / 2; engine.add(lip);
    for (const [y, r] of [[-.61, .329], [-.35, .269], [-.08, .178]] as const) {
      const cooling = torus(r * scale, .006, brushed, [x, y * scale, z]); cooling.rotation.x = Math.PI / 2; engine.add(cooling);
    }
    engine.add(mCyl(.13 * scale, .13 * scale, .025, black, [x, .13 * scale, z], 24));
    const flame = makeFlame(); flame.position.set(x, -.82 * scale, z); flame.scale.set(.62, 1.22, .62); flame.visible = false;
    engine.add(flame); flames.push(flame);
  }

  const lower = piece('土星五号 · S-IC 一级贮箱', [0, 5.15, 0]);
  cylinder(lower, 'S-IC 圆柱壳体', 1.18, 8.35, radius);
  rollMarks(lower, 1.19, 2.42, radius); rollMarks(lower, 7.33, 8.31, radius);
  ribs(lower, '一级尾裙纵向加强筋', 1.20, 2.42, radius + .002, 64);
  ribs(lower, '一级前裙纵向加强筋', 7.34, 8.30, radius + .002, 64);
  [2.44, 4.72, 7.32, 8.32].forEach(y => ring(lower, y, radius + .006));
  for (const angle of [Math.PI * .25, Math.PI * 1.25]) {
    const x = Math.cos(angle) * (radius + .018), z = Math.sin(angle) * (radius + .018);
    localRod(lower, [x, 2.45, z], [x, 7.29, z], .022, ribWhite);
    for (const y of [2.55, 3.8, 5.0, 6.2, 7.2]) {
      const collar = mCyl(.031, .031, .024, aluminium, [x, y * scale - origins.get(lower)!, z], 10); lower.add(collar);
    }
  }
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    const fairing = meshOf(new THREE.LatheGeometry(([[.33, .55], [.34, 1.05], [.23, 1.95], [0, 2.5]] as const).map(([r, y]) => new THREE.Vector2(r * scale, y * scale - origins.get(lower)!)), 24), ribWhite,
      [Math.cos(angle) * radius * .83, 0, Math.sin(angle) * radius * .83]);
    fairing.name = 'F-1 发动机气动整流包'; lower.add(fairing);
  }

  const middle = piece('土星五号 · S-II 二级贮箱', [0, 11.55, 0]);
  cylinder(middle, 'S-IC / S-II 级间裙', 8.35, 9.40, radius);
  rollMarks(middle, 8.36, 9.38, radius); ribs(middle, '二级级间纵梁', 8.38, 9.36, radius + .003, 64);
  cylinder(middle, 'S-II 贮箱', 9.40, 13.37, radius);
  [9.41, 10.60, 13.28].forEach(y => ring(middle, y, radius + .005));
  ribs(middle, 'S-II 前裙板条', 12.94, 13.35, radius + .003, 64);

  const interstage = piece('土星五号 · S-II / S-IVB 锥形级间', [0, 14.67, 0]);
  cylinder(interstage, '10 米至 6.6 米级间收缩段', 13.37, 14.22, radius, thirdRadius);
  for (let i = 0; i < 32; i++) {
    const a = i * Math.PI / 16;
    localRod(interstage, [Math.sin(a) * radius, 13.39, Math.cos(a) * radius], [Math.sin(a) * thirdRadius, 14.20, Math.cos(a) * thirdRadius], .007, ribWhite);
  }
  ring(interstage, 13.38, radius); ring(interstage, 14.21, thirdRadius);

  const upper = piece('土星五号 · S-IVB 三级与仪器舱', [0, 16.90, 0]);
  cylinder(upper, 'S-IVB 贮箱', 14.22, 17.31, thirdRadius);
  rollMarks(upper, 14.24, 14.96, thirdRadius);
  ribs(upper, 'S-IVB 后裙板条', 14.24, 14.95, thirdRadius + .002, 48);
  ribs(upper, 'S-IVB 前裙板条', 16.98, 17.30, thirdRadius + .002, 48);
  cylinder(upper, '仪器舱黑环', 17.31, 17.50, thirdRadius, thirdRadius, black);
  [14.23, 14.97, 17.30, 17.48].forEach(y => ring(upper, y, thirdRadius + .003, .007));

  const nose = piece('阿波罗 · 登月舱适配器、CSM 与逃逸塔', [0, 20.90, 0]);
  const serviceRadius = .386 * scale;
  cylinder(nose, '登月舱锥形适配器', 17.50, 18.62, thirdRadius, serviceRadius);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    localRod(nose, [Math.sin(a) * thirdRadius, 17.52, Math.cos(a) * thirdRadius], [Math.sin(a) * serviceRadius, 18.60, Math.cos(a) * serviceRadius], .008, ribWhite);
  }
  cylinder(nose, '阿波罗服务舱', 18.62, 19.37, serviceRadius, serviceRadius, aluminium);
  ribs(nose, '服务舱散热板', 18.68, 19.30, serviceRadius + .007, 24, ribWhite);
  cylinder(nose, '指令舱助推防护锥罩', 19.37, 20.03, serviceRadius, .108 * scale);
  [18.62, 19.36].forEach(y => ring(nose, y, serviceRadius + .005, .007));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a), z = Math.sin(a);
    const pod = mCyl(.040, .040, .11, brushed, [x * (serviceRadius + .046), 19.0 * scale - origins.get(nose)!, z * (serviceRadius + .046)], 12); nose.add(pod);
    localRod(nose, [x * .29 * scale, 19.78, z * .29 * scale], [x * .13 * scale, 20.72, z * .13 * scale], .018, ribWhite);
    const b = a + Math.PI / 2;
    localRod(nose, [x * .21 * scale, 20.22, z * .21 * scale], [Math.cos(b) * .13 * scale, 20.70, Math.sin(b) * .13 * scale], .009, ribWhite);
  }
  cylinder(nose, '发射逃逸系统固体发动机', 20.55, 21.64, .120 * scale);
  cylinder(nose, '逃逸塔尖锥', 21.64, 22, .120 * scale, 0);
  ring(nose, 20.66, .123 * scale, .006, brushed);

  for (let i = 0; i < 4; i++) {
    const fin = piece(`土星五号 · 尾部稳定翼 ${i + 1}`, [0, 1.25, 0], i * Math.PI / 2 + Math.PI / 4);
    const shape = new THREE.Shape();
    shape.moveTo(radius * .85, .50 * scale - 1.25); shape.lineTo(1.89 * scale, .45 * scale - 1.25);
    shape.lineTo(1.85 * scale, .88 * scale - 1.25); shape.lineTo(radius * .93, 2.0 * scale - 1.25); shape.closePath();
    const mesh = meshOf(new THREE.ExtrudeGeometry(shape, { depth: .065, bevelEnabled: false }), aluminium, [0, 0, -.0325]);
    mesh.name = '小面积梯形尾翼'; fin.add(mesh);
  }

  return { flames, textures };
}
