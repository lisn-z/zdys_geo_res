import * as THREE from 'three';
import { stationElement, assignStationElementNames, corePanelDeployment } from './station-tools';
import { canvasTexture, makeFlame, type TextureBank } from './assets';
import { seeded, span, mix, clamp01, type Vec3T } from './math';
import { DELIVERY, dfhPanelVertices, apolloFeet, apolloStage, apolloRigPose, APOLLO_ASTRONAUT_SCALE, STATION_LAYOUT } from './motion';
export interface CraftModel {
    root: THREE.Group;
    parts: Record<string, THREE.Object3D>;
    height?: number;
}
export class ModelMaterials {
    all: THREE.Material[] = [];
    private materialCache = new Map<string, THREE.MeshStandardMaterial>();
    white: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial;
    dark: THREE.MeshStandardMaterial;
    gold: THREE.MeshStandardMaterial;
    solar: THREE.MeshStandardMaterial;
    wood: THREE.MeshStandardMaterial;
    fabric: THREE.MeshStandardMaterial;
    fur: THREE.MeshStandardMaterial;
    red: THREE.MeshStandardMaterial;
    glass: THREE.MeshStandardMaterial;
    solarGold: THREE.MeshStandardMaterial;
    constructor(public bank: TextureBank) {
        this.white = this.std('#d8dedf', .24, .47);
        this.metal = this.std('#98a7ae', .72, .35);
        this.dark = this.std('#151c23', .35, .55);
        this.red = this.std('#793b2d', .4, .65);
        this.wood = this.std('#796045', .05, .85);
        this.fabric = this.std('#d2c3a4', .02, .88);
        this.fur = this.std('#9b8066', .01, .94);
        const furTexture = bank.own(canvasTexture(256, 256, c => {
            c.fillStyle='#80654b';c.fillRect(0,0,256,256);const r=seeded(42719);
            for(let i=0;i<4500;i++){const x=r()*256,y=r()*256;c.strokeStyle=r()>.5?'rgba(224,195,154,.22)':'rgba(33,22,13,.33)';c.lineWidth=.6+r()*.6;c.beginPath();c.moveTo(x,y);c.lineTo(x+(r()-.5)*5,y+4+r()*13);c.stroke();}
        }));
        this.fur.map=furTexture;this.fur.bumpMap=furTexture;this.fur.bumpScale=.018;
        this.glass = this.std('#051822', .8, .16);
        const random = seeded(437);
        const foil = bank.own(canvasTexture(256, 256, c => {
            c.fillStyle = '#c8aa62';
            c.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 950; i++) {
                c.fillStyle = `rgba(${random() > .5 ? '255,230,130' : '30,18,0'},${random() * .19})`;
                const x = random() * 256, y = random() * 256;
                c.beginPath();
                c.moveTo(x, y);
                c.lineTo(x + random() * 40, y + random() * 20);
                c.lineTo(x - 10, y + random() * 30);
                c.fill();
            }
        }));
        this.gold = this.std('#fff0c8', .84, .32);
        this.gold.envMapIntensity=1.25;
        this.gold.map = foil;
        const cells = bank.own(canvasTexture(512, 256, c => {
            c.fillStyle = '#071a3a';
            c.fillRect(0, 0, 512, 256);
            for (let x = 2; x < 512; x += 23)
                for (let y = 2; y < 256; y += 14) {
                    c.fillStyle = (x + y) % 3 ? '#15365a' : '#23476d';
                    c.fillRect(x, y, 20, 11);
                    c.strokeStyle = '#45667c';
                    c.lineWidth = .5;
                    c.strokeRect(x, y, 20, 11);
                }
        }));
        this.solar = this.std('#a4bdd1', .4, .42);
        this.solar.map = cells;
        this.solarGold = this.std('#e4c47c', .52, .37);
        // Warm substrate / rear side, not a blue cell texture multiplied by yellow.
        this.solarGold.map = bank.own(canvasTexture(512,256,c=>{
            c.fillStyle='#b89550';c.fillRect(0,0,512,256);
            for(let x=0;x<512;x+=32)for(let y=0;y<256;y+=32){c.fillStyle=(x+y)%64?'#d5b46a':'#c5a157';c.fillRect(x+1,y+1,30,30);}
            c.strokeStyle='#ebd49a';c.lineWidth=1;for(let y=8;y<256;y+=16){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
        }));
    }
    std(color: THREE.ColorRepresentation, metalness = .2, roughness = .6) {
        const key = new THREE.Color(color).getHexString() + ':' + metalness + ':' + roughness;
        const cached = this.materialCache.get(key);
        if (cached)
            return cached;
        const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
        m.userData.keepAlive = true;
        this.all.push(m);
        this.materialCache.set(key, m);
        return m;
    }
    dispose() { this.all.forEach(m => m.dispose()); }
}
export function meshOf(g: THREE.BufferGeometry, m: THREE.Material, p: Vec3T = [0, 0, 0]) { const o = new THREE.Mesh(g, m); o.position.fromArray(p); o.castShadow = true; o.receiveShadow = true; return o; }
export function mBox(x: number, y: number, z: number, m: THREE.Material, p: Vec3T = [0, 0, 0]) { return meshOf(new THREE.BoxGeometry(x, y, z), m, p); }
export function mCyl(rt: number, rb: number, h: number, m: THREE.Material, p: Vec3T = [0, 0, 0], segments = 40) { return meshOf(new THREE.CylinderGeometry(rt, rb, h, segments), m, p); }
export function mBall(r: number, m: THREE.Material, p: Vec3T = [0, 0, 0]) { return meshOf(new THREE.SphereGeometry(r, 28, 20), m, p); }
export function rod(a: Vec3T, b: Vec3T, r: number, m: THREE.Material) { const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), o = mCyl(r, r, av.distanceTo(bv), m); o.position.copy(av).add(bv).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize()); return o; }
export function torus(r: number, t: number, m: THREE.Material, p: Vec3T = [0, 0, 0]) { return meshOf(new THREE.TorusGeometry(r, t, 8, 48), m, p); }
export function annotate(o: THREE.Object3D, label: string) { o.userData.label = label; return o; }
export function solarWing(width: number, length: number, m: ModelMaterials, panelMaterial: THREE.Material = m.solar, backMaterial: THREE.Material = m.dark) {
    const g = new THREE.Group();
    g.add(mBox(width, .075, length, backMaterial), mBox(width - .07, .015, length - .07, panelMaterial, [0, .048, 0]));
    for (let z = -length / 2; z <= length / 2; z += length / 4)
        g.add(rod([-width / 2, .06, z], [width / 2, .06, z], .015, m.metal));
    return g;
}
function nozzle(radius: number, m: ModelMaterials) { const n = new THREE.Group(); n.add(mCyl(radius * .42, radius, radius * 1.6, m.dark, [0, -radius * .8, 0]), mCyl(radius * .81, radius * .9, .05, m.metal, [0, -radius * 1.58, 0])); return n; }
export function makeRocket(kind: string, m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), lower = new THREE.Group(), upper = new THREE.Group();
    const flame = new THREE.Group(), legs = new THREE.Group(), boosters = new THREE.Group();
    const parts: Record<string, THREE.Object3D> = { lower, upper, flame, legs, boosters };
    root.add(lower, upper); lower.add(flame, legs, boosters);
    const saturn = kind === 'saturn', cz1 = kind === 'cz1', v2 = kind === 'v2';
    const vostok = kind === 'vostok', falcon = kind === 'falcon';
    // Keep the cinematic heights, but derive diameters from the real vehicles.
    // NASA Saturn V: 110.6 m / 10.06 m; CNSA CZ-1: 29.46 m / 2.25 m;
    // CMSEO CZ-2F: 58.34 m / 3.35 m; SpaceX Falcon 9: 70 m / 3.7 m.
    const height = saturn ? 22 : cz1 ? 15 : v2 ? 14 : falcon ? 21.8 : 21;
    const r = saturn ? height * 10.06 / 110.6 / 2 : cz1 ? height * 2.25 / 29.46 / 2 :
        v2 ? .825 : falcon ? height * 3.7 / 70 / 2 : vostok ? .81 : height * 3.35 / 58.34 / 2;
    const lowH = saturn ? 8.35 : cz1 ? 8.9 : v2 ? 9.8 : falcon ? 13 : vostok ? 14.35 : 10.6;
    upper.position.y = lowH;
    const aluminium = m.std('#c4c9cb', .68, .37), black = m.std('#171c20', .16, .7);
    const soviet = m.std('#747d72', .22, .66), red = m.std('#b33124', .13, .62);
    const segment = (parent: THREE.Group, name: string, bottom: number, top: number, rb: number, rt = rb, material: THREE.Material = m.white) => {
        const o = mCyl(rt, rb, top - bottom, material, [0, (bottom + top) / 2, 0], 48);
        o.name = name; parent.add(o); return o;
    };
    const profile = (parent: THREE.Group, name: string, points: [number, number][], material: THREE.Material = m.white, lean = 0) => {
        const geometry = new THREE.LatheGeometry(points.map(([radius, y]) => new THREE.Vector2(radius, y)), 48);
        if (lean) {
            const position = geometry.attributes.position!;
            for (let i = 0; i < position.count; i++) position.setX(i, position.getX(i) - position.getY(i) * lean);
            geometry.computeVertexNormals();
        }
        const o = meshOf(geometry, material); o.name = name; parent.add(o); return o;
    };
    const band = (parent: THREE.Group, y: number, radius: number, thickness = .012, material: THREE.Material = aluminium) => {
        const o = torus(radius, thickness, material, [0, y, 0]); o.rotation.x = Math.PI / 2; parent.add(o);
    };
    const rollMarks = (parent: THREE.Group, radius: number, bottom: number, top: number, count: number, width: number, offset = 0) => {
        for (let i = 0; i < count; i++) parent.add(meshOf(new THREE.CylinderGeometry(radius + .006, radius + .006,
            top - bottom, 12, 1, true, offset + i * Math.PI * 2 / count, width), black, [0, (top + bottom) / 2, 0]));
    };
    const fin = (parent: THREE.Group, angle: number, points: [number, number][], material: THREE.Material = aluminium, depth = .055) => {
        const shape = new THREE.Shape(); points.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y)); shape.closePath();
        const o = meshOf(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }), material, [0, 0, -depth / 2]);
        const g = new THREE.Group(); g.name = 'aerodynamic-fin'; g.rotation.y = angle; g.add(o); parent.add(g);
    };
    const engine = (parent: THREE.Group, name: string, x: number, z: number, y: number, radius: number, jet = true) => {
        // Open bell, including the inner wall, instead of a capped solid cone.
        const n = profile(parent, name, [[radius, y], [radius * .77, y + radius * .45],
            [radius * .37, y + radius * 1.38], [radius * .29, y + radius * 1.56],
            [radius * .25, y + radius * 1.56], [radius * .33, y + radius * 1.38],
            [radius * .72, y + radius * .45], [radius * .95, y]], black);
        n.position.set(x, 0, z);
        const rim = torus(radius, radius * .035, aluminium, [x, y, z]); rim.rotation.x = Math.PI / 2; parent.add(rim);
        if (jet) {
            const f = makeFlame(); f.position.set(x, y, z); f.scale.set(radius * 1.7, saturn ? 1.18 : .85, radius * 1.7);
            flame.add(f);
        }
    };
    const cluster = (parent: THREE.Group, name: string, count: number, radius: number, spread: number, y: number, center: boolean, x = 0, z = 0) => {
        const ringCount = center ? count - 1 : count;
        for (let i = 0; i < ringCount; i++) {
            const a = i * Math.PI * 2 / ringCount + Math.PI / 4;
            engine(parent, name, x + Math.cos(a) * spread, z + Math.sin(a) * spread, y, radius);
        }
        // Recovery animation selects the last flame child as the central Merlin.
        if (center) engine(parent, name, x, z, y, radius);
    };
    const stencil = (parent: THREE.Group, text: string, radius: number, y: number, length: number, color: string) => {
        const map = m.bank.own(canvasTexture(128, 768, c => {
            c.clearRect(0, 0, 128, 768); c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.font = '700 91px Arial, "Microsoft YaHei", sans-serif';
            [...text].forEach((char, i) => c.fillText(char, 64, 768 * (i + .5) / text.length));
        }));
        const material = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: .7,
            polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        for (let i = 0; i < 4; i++) {
            const mark = meshOf(new THREE.CylinderGeometry(radius + .009, radius + .009, length, 12, 1, true,
                i * Math.PI / 2 - .15, .3), material, [0, y, 0]);
            mark.castShadow = false; parent.add(mark);
        }
    };
    if (saturn) {
        segment(lower, 'S-IC', .7, lowH, r);
        cluster(lower, 'F-1', 5, .36, .64, .02, true);
        for (let j = 0; j < 4; j++) {
            const angle = j * Math.PI / 2 + Math.PI / 4, fairing = new THREE.Group();
            fairing.rotation.y = angle;
            const cover = profile(fairing, 'F-1-engine-fairing', [[.33, .55], [.34, 1.05], [.23, 1.95], [0, 2.5]], aluminium);
            cover.position.x = r * .83; lower.add(fairing);
            fin(lower, angle, [[r * .85, .5], [1.89, .45], [1.85, .88], [r * .93, 2.0]], aluminium);
        }
        rollMarks(lower, r, .85, 2.4, 4, Math.PI / 4);
        rollMarks(lower, r, 7.35, 8.30, 4, Math.PI / 4);
        [2.45, 4.72, 7.33, 8.32].forEach(y => band(lower, y, r + .003));
        stencil(lower, 'USA', r, 5.7, 1.75, '#a82c25');
        segment(upper, 'S-II-interstage', 0, 1.05, r);
        rollMarks(upper, r, .02, 1.03, 4, Math.PI / 4);
        segment(upper, 'S-II', 1.05, 5.02, r);
        segment(upper, 'S-II-to-S-IVB-taper', 5.02, 5.87, r, r * 21.7 / 33);
        const thirdR = r * 21.7 / 33;
        segment(upper, 'S-IVB', 5.87, 8.96, thirdR);
        rollMarks(upper, thirdR, 5.9, 6.6, 4, Math.PI / 4);
        segment(upper, 'instrument-unit', 8.96, 9.15, thirdR, thirdR, black);
        segment(upper, 'spacecraft-lunar-module-adapter', 9.15, 10.27, thirdR, .386);
        segment(upper, 'Apollo-service-module', 10.27, 11.02, .386, .386, aluminium);
        segment(upper, 'Apollo-boost-protective-cover', 11.02, 11.68, .386, .11);
        for (let j = 0; j < 4; j++) {
            const a = j * Math.PI / 2;
            upper.add(rod([Math.cos(a) * .29, 11.43, Math.sin(a) * .29], [Math.cos(a) * .13, 12.28, Math.sin(a) * .13], .023, m.white));
        }
        segment(upper, 'launch-escape-motor', 12.2, 13.29, .12);
        segment(upper, 'launch-escape-nose', 13.29, height - lowH, .12, 0);
        [1.05, 4.92, 5.89, 8.93, 10.27, 11.02].forEach(y => band(upper, y, y < 5.1 ? r : y < 9 ? thirdR : .386));
    } else if (v2) {
        // A-4 has one continuous tapered fuselage, an ogive nose and four broad tail fins.
        const bodyProfile: [number, number][] = [[.58, .04], [.69, .55], [.8, 1.8], [r, 3.1], [r, 8.2], [.78, lowH]];
        profile(lower, 'V-2-tapered-body', bodyProfile);
        const noseProfile: [number, number][] = [[.78, 0], [.71, 1.1], [.56, 2.2], [.32, 3.3], [0, height - lowH]];
        profile(upper, 'V-2-ogive', noseProfile);
        for (let j = 0; j < 2; j++) {
            const a = j * Math.PI;
            lower.add(meshOf(new THREE.LatheGeometry(bodyProfile.map(([x, y]) => new THREE.Vector2(x + .004, y)), 24, a, Math.PI / 2), black));
            upper.add(meshOf(new THREE.LatheGeometry(noseProfile.map(([x, y]) => new THREE.Vector2(x + .004, y)), 24, a + Math.PI / 2, Math.PI / 2), black));
        }
        for (let j = 0; j < 4; j++) fin(lower, j * Math.PI / 2,
            [[.57, .06], [1.78, .03], [1.78, .73], [.81, 3.23]], j % 2 ? m.white : black, .08);
        engine(lower, 'V-2-engine', 0, 0, .01, .42);
        [1.1, 3.23, 8.2].forEach(y => band(lower, y, y < 2 ? .75 : r, .007, black));
    } else if (cz1) {
        segment(lower, 'CZ-1-first-stage', .5, lowH, r);
        cluster(lower, 'YF-2-chamber', 4, .22, .32, .02, false);
        segment(lower, 'CZ-1-aft-skirt', .25, 1.25, r * 1.05, r, aluminium);
        for (let j = 0; j < 4; j++) fin(lower, j * Math.PI / 2,
            [[r * .95, .25], [r + .74, .18], [r + .68, .54], [r, 1.85]], aluminium);
        segment(upper, 'CZ-1-second-stage', 0, 3.46, r);
        segment(upper, 'CZ-1-third-stage-transition', 3.46, 4.07, r, .385);
        segment(upper, 'CZ-1-payload-shroud', 4.07, 4.9, .385);
        profile(upper, 'CZ-1-nose', [[.385, 4.9], [.35, 5.2], [.24, 5.62], [0, height - lowH]]);
        [1.24, 6.15, 8.88].forEach(y => band(lower, y, r, .012, black));
        [0, 3.45, 4.07].forEach(y => band(upper, y, y < 4 ? r : .385, .009, black));
        rollMarks(lower, r, 1.3, 2.02, 4, Math.PI / 4);
    } else if (vostok) {
        profile(lower, 'R-7-core', [[.56, .55], [.56, 5.8], [.69, 7.7], [r, 10.35], [r, 12.1], [.7, lowH]], soviet);
        cluster(lower, 'RD-108-chamber', 4, .205, .315, .02, false);
        for (let j = 0; j < 4; j++) {
            const angle = j * Math.PI / 2, b = new THREE.Group(); b.name = 'R-7-tapered-booster'; b.rotation.y = angle;
            const shell = profile(b, 'R-7-booster-shell', [[.68, .4], [.735, 2.5], [.7, 4.5], [.55, 6.9], [.31, 9], [0, 10.65]], soviet, .053);
            shell.position.x = 1.3;
            const a = -angle, bx = Math.cos(a) * 1.3, bz = Math.sin(a) * 1.3;
            // Engine groups remain in the lower-stage frame, keeping flame animation simple.
            cluster(lower, 'RD-107-chamber', 4, .205, .31, .02, false, bx, bz);
            fin(b, 0, [[1.8, .35], [2.46, .28], [2.46, .64], [1.97, 1.65]], soviet);
            boosters.add(b);
        }
        // Vostok uses an exposed interstage lattice and has no launch escape tower.
        for (let j = 0; j < 12; j++) {
            const a = j * Math.PI / 6, b = a + Math.PI / 6;
            upper.add(rod([Math.cos(a) * .7, 0, Math.sin(a) * .7], [Math.cos(b) * .7, .95, Math.sin(b) * .7], .025, soviet));
        }
        engine(upper, 'Block-E-engine', 0, 0, .1, .34, false);
        segment(upper, 'Block-E-stage', .95, 2.8, .7, .7, soviet);
        segment(upper, 'Vostok-payload-shroud', 2.8, 5.0, .7, .7, soviet);
        profile(upper, 'Vostok-ogive', [[.7, 5], [.66, 5.45], [.47, 5.95], [.23, 6.4], [0, height - lowH]], soviet);
        [10.36, 12.1].forEach(y => band(lower, y, r, .013, aluminium));
        [0, .95, 2.8, 4.99].forEach(y => band(upper, y, .7, .015, aluminium));
    } else if (falcon) {
        segment(lower, 'Falcon-9-first-stage', .6, 11.55, r);
        // This chapter depicts the 2015 first landing: white interstage and aluminium
        // grid fins, before the black interstage / titanium fins of Block 5.
        segment(lower, 'Falcon-9-engine-skirt', .34, 1.1, r, r, aluminium);
        segment(lower, 'Falcon-9-interstage', 11.55, lowH, r);
        segment(lower, 'Falcon-9-interstage-opening', lowH - .006, lowH + .002, r * .96, r * .96, black);
        cluster(lower, 'Merlin-1D', 9, .157, .392, .025, true);
        lower.add(rod([r, 1.15, 0], [r, 11.55, 0], .038, m.white));
        [1.15, 7.15, 11.54].forEach(y => band(lower, y, r + .003, .009, aluminium));
        engine(upper, 'Merlin-vacuum', 0, 0, -.54, .42, false);
        segment(upper, 'Falcon-9-second-stage', .2, 4.62, r);
        const fairingR = 21.8 * 5.2 / 70 / 2;
        segment(upper, 'Falcon-9-fairing-shoulder', 4.62, 5.15, r, fairingR);
        segment(upper, 'Falcon-9-payload-fairing', 5.15, 7.07, fairingR);
        profile(upper, 'Falcon-9-fairing-ogive', [[fairingR, 7.07], [fairingR * .93, 7.63],
            [fairingR * .7, 8.16], [fairingR * .35, 8.58], [0, height - lowH]]);
        for (let j = 0; j < 4; j++) {
            const angle = j * Math.PI / 2 + Math.PI / 4;
            const g = new THREE.Group(); g.name = 'Falcon-9-landing-leg'; g.rotation.y = angle;
            const anchorX=r+.06, anchorY=2.42, hinge=new THREE.Group();
            hinge.position.set(anchorX,anchorY,0);hinge.name='Falcon-9-leg-hinge';
            fin(hinge, 0, [[-.055,0],[2.74-anchorX,.10-anchorY],[2.48-anchorX,.08-anchorY],[.14,-.20]],m.white,.13);
            // At full deployment the foot bottom remains y=-.03: +.21 root
            // settling height puts all four feet on the landing paint at .18.
            hinge.add(mBox(.47,.12,.38,black,[2.63-anchorX,.03-anchorY,0]));
            const strut=mCyl(.043,.043,1,aluminium);
            g.add(rod([r*.80,anchorY,0],[anchorX,anchorY,0],.065,aluminium),hinge,strut);
            g.userData.falconLeg={hinge,strut,base:new THREE.Vector3(r*.8,4.08,0),
                tip:new THREE.Vector3(2.60-anchorX,.18-anchorY,0),
                foldAngle:Math.PI/2-Math.atan2(.03-anchorY,2.63-anchorX)};
            legs.add(g);
            const grid = new THREE.Group(); grid.name = 'Falcon-9-grid-fin'; grid.rotation.y = angle;
            grid.position.y = 11.25;
            const gridHinge=new THREE.Group();gridHinge.position.x=r;
            for (let i = 0; i < 7; i++) gridHinge.add(mBox(.74, .08, .019, aluminium, [.38, 0, (i - 3) * .1]));
            for (let i = 0; i < 8; i++) gridHinge.add(mBox(.019, .08, .6, aluminium, [.02 + i * .103, 0, 0]));
            grid.add(gridHinge);grid.userData.falconGridHinge=gridHinge;
            lower.add(grid);
        }
        setFalconRecoveryConfiguration(root,0,0);
    } else {
        // Crew launch configuration: 3.35 m core, four 2.25 m boosters, 3.8 m shroud.
        segment(lower, 'CZ-2F-first-stage', .5, lowH, r);
        cluster(lower, 'YF-20B', 4, .24, .34, .015, false);
        const boosterR = r * 2.25 / 3.35;
        for (let j = 0; j < 4; j++) {
            const a = j * Math.PI / 2, b = new THREE.Group(), distance = r + boosterR;
            b.name = 'CZ-2F-booster'; b.position.set(Math.cos(a) * distance, 0, Math.sin(a) * distance);
            segment(b, 'CZ-2F-booster-tank', .4, 6.9, boosterR);
            profile(b, 'CZ-2F-booster-nose', [[boosterR, 6.9], [boosterR * .84, 7.5], [0, 8.12]]);
            [1.0, 5.35, 6.88].forEach(y => band(b, y, boosterR, .009, aluminium));
            boosters.add(b);
            engine(lower, 'YF-20B-booster', b.position.x, b.position.z, .015, .29);
        }
        [1, 6.2, 10.58].forEach(y => band(lower, y, r, .011, aluminium));
        segment(upper, 'CZ-2F-second-stage', 0, 4.5, r);
        const fairingR = r * 3.8 / 3.35;
        segment(upper, 'Shenzhou-fairing-shoulder', 4.5, 4.92, r, fairingR);
        segment(upper, 'Shenzhou-fairing', 4.92, 7.6, fairingR);
        profile(upper, 'Shenzhou-fairing-nose', [[fairingR, 7.6], [.58, 8.03], [.31, 8.48], [.11, 8.74]]);
        segment(upper, 'CZ-2F-escape-motor', 8.74, 10.08, .105);
        segment(upper, 'CZ-2F-escape-tip', 10.08, height - lowH, .105, 0);
        for (let j = 0; j < 4; j++) {
            const a = j * Math.PI / 2;
            upper.add(rod([Math.cos(a) * .4, 8.02, Math.sin(a) * .4], [Math.cos(a) * .1, 9.19, Math.sin(a) * .1], .022, m.white));
            fin(upper, a, [[.1, 9.16], [.42, 9.01], [.1, 9.7]], red, .03);
        }
        stencil(lower, '中国航天', r, 8.0, 2.35, '#b33124');
        rollMarks(upper, r, .15, .55, 4, Math.PI / 5);
    }
    root.name = saturn ? '土星五号' : cz1 ? '长征一号' : v2 ? 'V-2 / A-4' : vostok ? '东方号运载火箭' : falcon ? '猎鹰九号' : kind === 'cz2f' ? '长征二号F' : '通用运载火箭';
    root.userData.kind = kind; root.userData.height = height; root.userData.lowH = lowH;
    root.userData.coreRadius = r;
    parts.lower = annotate(lower, v2 ? '单级箭体' : '一级箭体');
    parts.upper = annotate(upper, v2 ? '头锥' : '上面级 / 载荷');
    return { root, parts, height };
}
/** Deploy about fixed airframe hinges. The telescopic strut keeps both ends
 * attached throughout, instead of shrinking the entire landing-leg assembly. */
export function setFalconRecoveryConfiguration(root:THREE.Object3D,legs:number,gridFins:number,time=0) {
    const deployment=clamp01(legs),grids=clamp01(gridFins),up=new THREE.Vector3(0,1,0);
    root.traverse(node=>{
        const leg=node.userData.falconLeg as {hinge:THREE.Group;strut:THREE.Mesh;base:THREE.Vector3;tip:THREE.Vector3;foldAngle:number}|undefined;
        if(leg){
            leg.hinge.rotation.z=leg.foldAngle*(1-deployment);
            const tip=leg.tip.clone().applyAxisAngle(new THREE.Vector3(0,0,1),leg.hinge.rotation.z).add(leg.hinge.position);
            const axis=tip.clone().sub(leg.base);
            leg.strut.position.copy(leg.base).add(tip).multiplyScalar(.5);
            leg.strut.scale.set(1,axis.length(),1);
            leg.strut.quaternion.setFromUnitVectors(up,axis.normalize());
        }
        const hinge=node.userData.falconGridHinge as THREE.Group|undefined;
        if(hinge){hinge.rotation.z=(1-grids)*Math.PI/2;hinge.rotation.y=grids*.045*Math.sin(time*1.2+node.rotation.y);}
    });
}
export function makeFlyer(m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), props = new THREE.Group();
    root.add(props);
    // 1903 Flyer: cambered fabric biplane, forward elevator, twin pusher props.
    const fabric = m.fabric.clone(); fabric.side = THREE.DoubleSide; m.all.push(fabric);
    for (const y of [.65, 1.9]) {
        const geometry = new THREE.PlaneGeometry(10, 1.65, 24, 12); geometry.rotateX(-Math.PI / 2);
        const vertices = geometry.attributes.position!;
        for (let i = 0; i < vertices.count; i++) {
            const t = (vertices.getZ(i) + .825) / 1.65;
            vertices.setY(i, .11 * Math.sin(t * Math.PI));
        }
        geometry.computeVertexNormals();
        const wing = meshOf(geometry, fabric, [0, y, 0]); wing.name = 'cambered-fabric-wing';
        root.add(wing);
        for (let x = -4.8; x < 5; x += .55)
            for (let j = 0; j < 8; j++) {
                const a = j / 8, b = (j + 1) / 8;
                root.add(rod([x, y + .012 + .11 * Math.sin(a * Math.PI), -.825 + 1.65 * a],
                    [x, y + .012 + .11 * Math.sin(b * Math.PI), -.825 + 1.65 * b], .008, m.wood));
            }
        for (const z of [-.68, .65])
            root.add(rod([-5, y, z], [5, y, z], .035, m.wood));
    }
    for (let x = -4.2; x <= 4.2; x += 1.4)
        for (const z of [-.65, .65]) {
            root.add(rod([x, .65, z], [x, 1.9, z], .033, m.wood));
            if (x < 4)
                root.add(rod([x, .65, z], [x + 1.4, 1.9, z], .008, m.metal));
        }
    for (const x of [-.65, .65]) {
        root.add(rod([x, .3, -2], [x, .3, 1.6], .06, m.wood), rod([x, .3, -2], [x, .8, -2.8], .045, m.wood), rod([x, .7, 0], [x, .7, -2.8], .035, m.wood));
    }
    for (const y of [.8, 1.3])
        root.add(mBox(3, .055, .75, m.fabric, [0, y, -2.75]));
    for (const x of [-1.15, 1.15]) {
        for (const z of [-3.02, -2.48]) root.add(rod([x, .8, z], [x, 1.3, z], .025, m.wood));
        root.add(rod([Math.sign(x) * .65, .7, -2.8], [x, .8, -2.75], .025, m.wood));
    }
    for (const x of [-1.35, 1.35]) {
        const g = new THREE.Group();
        g.position.set(x, 1.2, 1.35);
        const hub = mCyl(.10, .10, .18, m.metal); hub.rotation.x = Math.PI / 2; g.add(hub);
        for (const side of [-1, 1]) {
            const shape = new THREE.Shape(); shape.moveTo(-.045, 0); shape.lineTo(-.09, .38);
            shape.quadraticCurveTo(-.16, .82, -.06, 1.03); shape.quadraticCurveTo(.06, 1.06, .14, .8);
            shape.lineTo(.1, .32); shape.lineTo(.045, 0); shape.closePath();
            const blade = meshOf(new THREE.ExtrudeGeometry(shape, { depth: .035, bevelEnabled: false }), m.wood);
            blade.rotation.z = side < 0 ? Math.PI : 0; blade.rotation.y = x < 0 ? -.2 : .2; g.add(blade);
        }
        root.add(rod([x, .67, .4], [x, 1.2, 1.25], .035, m.wood),
            rod([.75, .92, .45], [x, 1.18, 1.24], .009, m.dark),
            rod([.75, 1.04, .45], [x, 1.29, 1.24], .009, m.dark));
        props.add(g);
    }
    root.add(mBox(.65, .26, .8, m.metal, [.75, .89, .05]));
    for (let i = 0; i < 4; i++) root.add(mCyl(.085, .085, .22, m.dark, [.75, 1.08, -.25 + i * .2]));
    const pilot = mBall(.22, m.wood, [-.45, 1.05, -.55]);
    pilot.scale.y = .9;
    root.add(pilot, mBox(.4, .25, 1.1, m.dark, [-.45, .94, .14]));
    // Slender fabric rudders sit aft of the propeller disks, on their own truss.
    for (const x of [-.3, .3]) {
        root.add(rod([x,.65,.6],[x,.62,2.15],.025,m.wood), rod([x,1.9,.6],[x,1.45,2.15],.025,m.wood));
        const tail = mBox(.025, .82, .52, m.fabric, [x, 1.04, 2.16]); tail.name = 'rear-rudder'; root.add(tail);
        root.add(rod([x,.63,1.91],[x,1.45,1.91],.018,m.wood), rod([x,.63,2.41],[x,1.45,2.41],.018,m.wood));
    }
    return { root, parts: { props } };
}
export function makeGoddard(m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), rocket = new THREE.Group();
    root.add(rocket);
    // Nell carried its engine ABOVE the tanks; its exhaust passed down beside the feed frame.
    const fuel = mCyl(.29, .29, .45, m.metal, [0, .42, 0]); fuel.name = 'gasoline-tank';
    const oxygen = mCyl(.32, .32, .72, m.metal, [0, 1.08, 0]); oxygen.name = 'oxygen-tank';
    const shield = mCyl(.05, .43, .48, m.std('#c3bda7', .05, .9), [0, 1.68, 0]); shield.name = 'conical-heat-shield';
    const engine = mCyl(.105, .105, .38, m.dark, [0, 3.77, 0]); engine.name = 'top-combustion-chamber';
    rocket.add(fuel, oxygen, shield, engine);
    for (const x of [-.37, .37]) rocket.add(rod([x, .22, 0], [x, 3.95, 0], .025, m.metal),
        rod([x, 3.95, 0], [0, 3.98, 0], .025, m.metal));
    rocket.add(rod([.29,.4,.14],[.29,3.98,.14],.018,m.metal), rod([.29,3.98,.14],[0,3.98,0],.018,m.metal));
    const bell = nozzle(.16, m); bell.position.y = 3.59; rocket.add(bell);
    const f = makeFlame();
    f.position.set(0, 3.33, 0);
    f.scale.set(.25, .16, .25);
    rocket.add(f);
    return { root, parts: { rocket, flame: f } };
}
export function makeSatellite(kind: string, m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), wings = new THREE.Group();
    root.add(wings);
    if (kind === 'dfh') return makeDongfanghong(m);
    if (kind === 'sputnik') {
        // Sputnik 1: 0.58 m sphere, two 2.4 m and two 2.9 m trailing whips.
        // Scale the body down to restore that ratio within the existing shot framing.
        const radius = .45, scale = radius / .29;
        const aluminium = m.std('#d4dcdf', .92, .19);
        root.name = 'Sputnik 1 · 1957';
        const shell = mBall(radius, aluminium);
        shell.name = '密封铝合金球壳';
        root.add(shell);
        const seam = torus(radius + .002, .004, m.metal);
        seam.rotation.x = Math.PI / 2;
        root.add(seam);
        const antennas = new THREE.Group();
        antennas.name = '两对后掠鞭状天线';
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2, length = (i % 2 === 0 ? 2.9 : 2.4) * scale;
            const base = new THREE.Vector3(Math.cos(a) * .35, -.283, Math.sin(a) * .35);
            const direction = new THREE.Vector3(Math.cos(a) * Math.sin(Math.PI * 35 / 180), -Math.cos(Math.PI * 35 / 180), Math.sin(a) * Math.sin(Math.PI * 35 / 180));
            antennas.add(mBall(.034, m.white, base.toArray() as Vec3T));
            for (let j = 0; j < 3; j++) {
                const from = base.clone().addScaledVector(direction, j * length / 3);
                const to = base.clone().addScaledVector(direction, (j + 1) * length / 3);
                antennas.add(rod(from.toArray() as Vec3T, to.toArray() as Vec3T, .011 - j * .003, aluminium));
            }
        }
        root.add(antennas);
        return { root, parts: { wings, body: shell, antennas } };
    }
    else {
        root.add(mBox(1.5, 1.7, 1.4, m.gold), mBox(1.6, .14, 1.5, m.white, [0, .94, 0]));
        for (const side of [-1, 1]) {
            const g = new THREE.Group();
            g.position.x = side * .85;
            const panel = solarWing(3.5, 1.8, m);
            panel.position.x = side * 1.9;
            g.add(panel);
            wings.add(g);
        }
        root.add(rod([0, .8, 0], [0, 2, 0], .028, m.metal));
        const dish = mCyl(.65, .15, .23, m.white, [0, 1.8, 0]);
        dish.rotation.z = .4;
        root.add(dish);
    }
    return { root, parts: { wings } };
}
export function makeVostok(m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), capsule = new THREE.Group(), instrument = new THREE.Group();
    root.name = '东方一号 · Vostok 3KA';
    const thermal = m.std('#aaa99f', .65, .43), tankMaterial = m.std('#718178', .45, .48);
    root.add(capsule, instrument);
    capsule.add(mBall(1.32, thermal));
    // The descent sphere has flush hatches and small optical ports, not a bubble canopy.
    const hatch = meshOf(new THREE.SphereGeometry(1.328, 36, 12, 0, Math.PI * 2, 0, Math.asin(.54 / 1.328)), m.metal);
    hatch.rotation.x = Math.PI / 2;
    capsule.add(hatch, torus(.54, .020, m.dark, [0, 0, 1.213]));
    capsule.add(meshOf(new THREE.CircleGeometry(.20, 32), m.glass, [0, 0, 1.334]), torus(.215, .021, m.metal, [0, 0, 1.319]));
    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        capsule.add(mBall(.015, m.dark, [Math.cos(a) * .50, Math.sin(a) * .50, 1.237]));
    }
    for (const a of [0, Math.PI / 2]) {
        const seam = torus(1.323, .010, m.metal);
        seam.rotation.y = a;
        capsule.add(seam);
    }
    // Characteristic flared equipment compartment, thermal-control belt and retro engine.
    instrument.add(mCyl(.80, 1.39, .92, m.white, [0, -1.54, 0]), mCyl(1.39, .70, 1.12, m.metal, [0, -2.56, 0]));
    instrument.add(mCyl(1.395, 1.395, .19, m.dark, [0, -2.0, 0]));
    for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12;
        const shutter = mBox(.14, .29, .035, m.white, [Math.sin(a) * 1.385, -2.025, Math.cos(a) * 1.385]);
        shutter.rotation.y = a;
        instrument.add(shutter);
    }
    for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, x = Math.cos(a), z = Math.sin(a);
        instrument.add(mBall(.20, tankMaterial, [x * 1.00, -1.02, z * 1.00]));
        instrument.add(rod([x * .83, -.90, z * .83], [x * 1.36, -1.93, z * 1.36], .022, m.metal));
    }
    const engine = nozzle(.32, m);
    engine.position.y = -3.05;
    instrument.add(engine);
    for (const side of [-1, 1]) {
        instrument.add(rod([side * 1.05, -1.48, 0], [side * 1.83, -.60, 0], .013, m.metal));
        instrument.add(rod([0, -1.48, side * 1.05], [0, -.60, side * 1.83], .013, m.metal));
    }
    root.rotation.z = -Math.PI / 2;
    return { root, parts: { capsule, instrument } };
}
export function makeShenzhou(m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), orbital = new THREE.Group(), capsule = new THREE.Group(), service = new THREE.Group();
    root.name = '神舟五号 · 两对太阳翼构型';
    const blanket = m.std('#77785c', .48, .58), capsuleSkin = m.std('#adaeaa', .56, .48);
    orbital.add(mCyl(1.03, 1.03, 2.24, blanket, [0, -.13, 0]), mCyl(1.03, .48, .32, m.metal, [0, -1.41, 0]));
    orbital.add(mCyl(.64, 1.03, .31, blanket, [0, 1.145, 0]));
    // Shenzhou 5 carried an experiment package here; it had no docking mechanism.
    orbital.add(mCyl(.58, .58, .18, m.metal, [0, 1.39, 0]), mBox(.43, .23, .40, m.dark, [.20, 1.59, 0]));
    for (const y of [-1.22, .96]) {
        const ring = torus(1.035, .025, m.metal, [0, y, 0]);
        ring.rotation.x = Math.PI / 2;
        orbital.add(ring);
    }
    const hatch = mCyl(.40, .40, .055, m.metal, [0, -.15, 1.02]);
    hatch.rotation.x = Math.PI / 2;
    orbital.add(hatch, torus(.40, .028, m.dark, [0, -.15, 1.054]));
    orbital.position.y = 2.65;
    const capsuleProfile = [[0, -1.015], [1.05, -1.015], [1.16, -.96], [1.20, -.82], [1.20, -.59], [1.17, -.34], [1.10, -.04], [.99, .29], [.84, .61], [.65, .85], [.48, 1.00], [.48, 1.08], [0, 1.08]];
    capsule.add(meshOf(new THREE.LatheGeometry(capsuleProfile.map(([r, y]) => new THREE.Vector2(r, y)), 48), capsuleSkin));
    capsule.add(mCyl(1.13, 1.06, .075, m.dark, [0, -.991, 0]));
    const window = new THREE.Group();
    window.position.set(0, .25, 1.015);
    window.rotation.x = -.30;
    window.add(meshOf(new THREE.CircleGeometry(.155, 24), m.glass), torus(.18, .032, m.metal));
    capsule.add(window);
    service.add(mCyl(1.18, 1.18, 1.90, m.white, [0, -.14, 0]), mCyl(.96, 1.18, .44, blanket, [0, 1.00, 0]));
    service.add(mCyl(1.18, 1.18, .15, m.dark, [0, -1.16, 0]));
    for (let i = 0; i < 24; i++) {
        const a = i * Math.PI / 12, strip = mBox(.018, 1.63, .025, m.metal, [Math.sin(a) * 1.187, -.13, Math.cos(a) * 1.187]);
        strip.rotation.y = a;
        service.add(strip);
    }
    for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + i * Math.PI / 2, engine = nozzle(.145, m);
        engine.position.set(Math.cos(a) * .57, -1.23, Math.sin(a) * .57);
        service.add(engine);
    }
    service.position.y = -2.25;
    const makeArray = (side: number, span: number, chord: number, modules: number, base: number) => {
        const wing = new THREE.Group();
        wing.position.set(side * base, 0, 0);
        // Array plane contains the spacecraft longitudinal axis; cells face +Z.
        wing.add(rod([0, 0, 0], [side * (span + .18), 0, 0], .029, m.metal));
        for (let i = 0; i < modules; i++) {
            const panel = solarWing(span / modules - .035, chord, m, m.solar, m.solarGold);
            panel.rotation.x = Math.PI / 2;
            panel.position.x = side * (.18 + (i + .5) * span / modules);
            wing.add(panel);
        }
        return wing;
    };
    for (const side of [-1, 1]) {
        service.add(makeArray(side, 4.0, 1.82, 4, 1.18));
        orbital.add(makeArray(side, 1.72, 1.12, 2, 1.03));
    }
    root.add(annotate(orbital, '轨道舱'), annotate(capsule, '返回舱'), annotate(service, '推进舱'));
    root.rotation.z = -Math.PI / 2;
    return { root, parts: { orbital, capsule, service } };
}
export function makeLander(kind: string, m: ModelMaterials): CraftModel {
    if(kind === 'change' || kind === 'tianwen') return makeDeliveryLander(kind, m);
    const root = new THREE.Group(), body = new THREE.Group(), parts: Record<string, THREE.Object3D> = { body };
    root.add(body);
    const apollo = kind === 'apollo', viking = kind === 'viking';
    // Viking's short/long alternating sides form a clipped triangle; LM is an octagonal box.
    if (viking) {
        const plan = new THREE.Shape();
        ([[-.35,-1.1],[.35,-1.1],[1.28,.51],[.92,1.13],[-.92,1.13],[-1.28,.51]] as const).forEach(([x,z],i)=>i ? plan.lineTo(x,z) : plan.moveTo(x,z));
        plan.closePath();
        const hull = meshOf(new THREE.ExtrudeGeometry(plan,{depth:.60,bevelEnabled:false}),m.white,[0,1.22,0]);
        hull.rotation.x=Math.PI/2;body.add(hull);
    } else {
        const descent=mCyl(1.71,1.71,1.18,m.gold,[0,1.69,0],8);descent.rotation.y=Math.PI/8;
        const deck=mCyl(1.72,1.72,.075,m.dark,[0,2.30,0],8);deck.rotation.y=Math.PI/8;body.add(descent,deck);
        for(const side of [-1,1]){
            body.add(mBox(.74,.84,.045,m.dark,[side*.91,1.68,1.58]),mBox(.045,.72,.78,m.gold,[side*1.59,1.72,-.54]));
        }
        const descentEngine=nozzle(.45,m);descentEngine.position.y=1.11;body.add(descentEngine);
    }
    const n = viking ? 3 : 4;
    for (let j = 0; j < n; j++) {
        const a = j * Math.PI * 2 / n + (viking ? -Math.PI/2 : 0), ca = Math.cos(a), sa = Math.sin(a);
        const foot:Vec3T=[ca*2.7,.18,sa*2.7];
        body.add(rod([ca*1.38,viking?1.04:1.96,sa*1.38],foot,.072,viking?m.white:m.gold),mCyl(viking?.29:.43,viking?.33:.43,.16,viking?m.white:m.gold,[ca*2.7,.08,sa*2.7]));
        for(const side of [-1,1])body.add(rod([ca*.98-sa*side*.50,viking?.76:1.19,sa*.98+ca*side*.50],[ca*2.40,.44,sa*2.40],.036,m.metal));
        body.add(mBall(.10,m.metal,[ca*2.7,.20,sa*2.7]));
    }
    const upper = new THREE.Group();
    upper.position.y = 2.4;
    parts.upper = upper;
    body.add(upper);
    if (apollo) {
        root.name='阿波罗登月舱';
        // Angular crew cabin, offset equipment bays and two triangular forward windows.
        const profile=new THREE.Shape();
        ([[-1.08,0],[-1.28,.60],[-.86,1.35],[-.42,1.62],[.42,1.62],[.86,1.35],[1.28,.60],[1.08,0]] as const).forEach(([x,y],i)=>i?profile.lineTo(x,y):profile.moveTo(x,y));profile.closePath();
        upper.add(meshOf(new THREE.ExtrudeGeometry(profile,{depth:1.28,bevelEnabled:false}),m.metal,[0,0,-.60]),mBox(1.64,1.14,.82,m.dark,[0,.53,-.94]));
        for(const side of [-1,1]){
            const cheek=mBox(.68,.73,.54,m.dark,[side*.89,.64,.59]);cheek.rotation.z=side*.25;upper.add(cheek);
            const tank=mBall(.43,m.gold,[side*1.13,.26,-.24]);tank.scale.set(.72,1,.95);upper.add(tank);
            upper.add(mBox(.46,.70,.66,m.white,[side*1.14,.76,-.55]));
        }
        upper.add(mBox(.67,.59,.07,m.white,[0,.29,.74]),mBox(.53,.43,.025,m.dark,[0,.30,.786]),mBox(.45,.36,.025,m.metal,[0,.30,.804]));
        for (const side of [-1,1]) {
            const tri = new THREE.Shape();
            tri.moveTo(-.24,0);tri.lineTo(.24,0);tri.lineTo(-side*.16,.39);
            tri.closePath();
            upper.add(meshOf(new THREE.ShapeGeometry(tri),m.glass,[side*.54,.83,.879]));
        }
        upper.add(mCyl(.32,.38,.24,m.white,[0,1.76,-.12]),mCyl(.26,.30,.14,m.metal,[0,1.95,-.12]));
        for(const x of [-1,1])for(const z of [-1,1]){
            const pod=new THREE.Group();pod.position.set(x*1.34,.64,z*.63);pod.add(mBox(.24,.24,.24,m.dark));
            for(const direction of [[x,0,0],[0,0,z],[0,1,0],[0,-1,0]]){
                const jet=nozzle(.085,m);jet.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(direction[0],direction[1],direction[2]));pod.add(jet);
            }upper.add(pod);
        }
        upper.add(rod([-.64,1.40,-.34],[-1.04,2.08,-.34],.024,m.metal),rod([.84,1.17,-.41],[1.11,1.82,-.57],.023,m.metal));
        const antenna=mCyl(.30,.06,.10,m.white,[-1.04,2.08,-.34]);antenna.rotation.z=-.55;upper.add(antenna);
        const rendezvous=mCyl(.20,.07,.07,m.metal,[1.11,1.82,-.57]);rendezvous.rotation.x=.65;upper.add(rendezvous);
        body.add(mBox(.77,.07,1.05,m.metal,[0,2.43,1.26]));
        for(const side of [-1,1])body.add(rod([side*.34,2.45,.83],[side*.34,2.78,1.54],.018,m.metal));
        const ladder = new THREE.Group();
        ladder.position.set(0, .12, 2.65);
        ladder.rotation.x = -.38;
        for (const x of [-.3, .3])
            ladder.add(rod([x, 0, 0], [x, 2.5, 0], .025, m.metal));
        for (let i = 0; i < 9; i++)ladder.add(rod([-.3,i*.30,0],[.3,i*.30,0],.022,m.metal));
        body.add(ladder);parts.ladder=ladder;
    }
    else if(viking) {
        root.name='海盗一号着陆器';upper.position.y=1.22;
        upper.add(mBox(.94,.30,.79,m.white,[0,.15,-.07]),mBox(.48,.23,.43,m.metal,[.52,.12,.39]));
        // Two finned SNAP-19 units with sloping pale wind covers.
        for(const side of [-1,1]){
            const rtg=new THREE.Group();rtg.position.set(side*1.20,.22,-.16);
            rtg.add(mCyl(.27,.27,.72,m.dark));
            for(let i=0;i<6;i++){const fin=mBox(.72,.70,.035,m.metal);fin.rotation.y=i*Math.PI/3;rtg.add(fin);}
            const cover=mBox(.88,.075,1.02,m.white,[side*.07,.48,0]);cover.rotation.z=-side*.24;rtg.add(cover);upper.add(rtg);
        }
        for(const x of [-.52,.52])upper.add(mCyl(.10,.12,.68,m.white,[x,.40,.74]),mBox(.15,.13,.16,m.dark,[x,.70,.81]));
        const antenna=new THREE.Group();antenna.position.set(.37,.95,-.77);antenna.rotation.x=-.46;
        const dishMat=m.std('#e3e6e0',.23,.59);dishMat.side=THREE.DoubleSide;
        const curve=Array.from({length:13},(_,i)=>{const r=i/12*.69;return new THREE.Vector2(r,.28*(r/.69)**2);});
        antenna.add(meshOf(new THREE.LatheGeometry(curve,40),dishMat),rod([0,0,0],[0,.59,0],.027,m.metal),mBall(.075,m.dark,[0,.59,0]));
        upper.add(rod([.37,0,-.77],[.37,.95,-.77],.043,m.white),antenna);
        upper.add(rod([-.70,.08,-.72],[-.70,1.74,-.72],.022,m.metal));
        body.add(rod([0,1.27,1.03],[0,1.34,2.10],.075,m.white),rod([0,1.34,2.10],[.17,.34,2.85],.047,m.metal),mBox(.30,.15,.40,m.white,[.17,.27,2.88]));
        body.add(rod([-1.10,1.14,.64],[-2.13,1.65,.91],.022,m.metal),mBox(.25,.08,.18,m.white,[-2.13,1.65,.91]));
    } else {
        upper.add(mBox(.8,.4,.7,m.white),rod([.5,0,0],[.5,1.4,0],.04,m.metal));
    }
    const flame = makeFlame();
    flame.position.y = .5;
    flame.scale.set(.45, .45, .45);
    root.add(flame);
    parts.flame = flame;
    return { root, parts };
}
export function makeApollo(m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), csm = new THREE.Group(), lm = makeLander('apollo', m), orbitalLM=new THREE.Group();
    root.name='阿波罗指令服务舱与登月舱';csm.name='指令服务舱';orbitalLM.name='登月舱';
    const sm = mCyl(1.25, 1.25, 2.9, m.metal);
    sm.rotation.z = -Math.PI / 2;
    csm.add(sm);
    // SM radiator strips wrap the cylinder; there are four separate RCS quads.
    for(let i=0;i<6;i++){
        const panel=meshOf(new THREE.CylinderGeometry(1.26,1.26,2.21,8,1,true,i*Math.PI/3+.04,.57),m.white);
        panel.rotation.z=-Math.PI/2;csm.add(panel);
    }
    for(const x of [-1.43,1.44]){const ring=torus(1.25,.028,m.metal,[x,0,0]);ring.rotation.y=Math.PI/2;csm.add(ring);}
    const cm = mCyl(.19, 1.25, 1.82, m.metal, [2.36, 0, 0]);
    cm.rotation.z = -Math.PI / 2;
    csm.add(cm,mBox(.40,.045,.35,m.glass,[2.02,1.025,0]));
    const heatshield=mCyl(1.25,1.25,.10,m.dark,[1.49,0,0]);heatshield.rotation.z=-Math.PI/2;csm.add(heatshield);
    const collar=mCyl(.24,.27,.32,m.white,[3.39,0,0]);collar.rotation.z=-Math.PI/2;csm.add(collar,rod([3.55,0,0],[3.75,0,0],.074,m.metal));
    const engine = nozzle(.69, m);
    engine.rotation.z = -Math.PI / 2;
    engine.position.x = -1.46;
    csm.add(engine);
    for (let i = 0; i < 4; i++) {
        const a=i*Math.PI/2+Math.PI/4,quad=new THREE.Group();quad.position.set(.52,Math.cos(a)*1.31,Math.sin(a)*1.31);quad.rotation.x=a;
        quad.add(mBox(.30,.24,.30,m.dark));
        for(const direction of [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){
            const thruster=nozzle(.087,m);thruster.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),new THREE.Vector3(direction[0],direction[1],direction[2]));quad.add(thruster);
        }csm.add(quad);
    }
    // Four-dish S-band antenna at the service module's aft end.
    const antenna=new THREE.Group();antenna.position.set(-1.06,-1.22,.34);antenna.rotation.z=.35;
    antenna.add(rod([0,0,0],[0,-.78,0],.038,m.metal));
    for(const x of [-.22,.22])for(const z of [-.22,.22])antenna.add(mCyl(.24,.05,.11,m.metal,[x,-.79,z]));
    csm.add(antenna);
    csm.position.x = -3;
    // Keep worlds.ts separation anchors, but align the two docking axes before separation.
    orbitalLM.position.set(3.6,-1.3,0);
    lm.root.rotation.z=Math.PI/2;lm.root.position.set(0,1.3,.078);
    lm.root.scale.setScalar(.65);
    lm.parts.flame!.visible = false;
    orbitalLM.add(lm.root);root.add(csm,orbitalLM);
    return { root, parts: { csm, lm: orbitalLM } };
}
export function makeRover(kind: string, m: ModelMaterials): CraftModel {
    const root=new THREE.Group(),wheels=new THREE.Group(),wings=new THREE.Group(),body=new THREE.Group(),mast=new THREE.Group();
    root.add(body,wheels,wings,mast);
    const isZhurong=kind==='zhurong',axleMat=m.std('#b6bdc1',.78,.3);
    root.name=isZhurong?'祝融号火星车':'玉兔二号月球车';
    body.add(mBox(isZhurong?1.38:1.24,isZhurong?.66:.48,1.65,isZhurong?m.gold:m.metal,[0,isZhurong?1.00:.89,0]),mBox(1.17,.08,1.48,m.white,[0,isZhurong?1.37:1.17,0]));
    // Both vehicles have six outboard wheels. Contact radius/axles match the delivery solver.
    for(const side of [-1,1]){
        root.add(rod([side*.60,.91,.25],[side*.84,.61,-.35],.047,axleMat),rod([side*.84,.61,-.35],[side*.97,.35,-.75],.045,axleMat),rod([side*.84,.61,-.35],[side*.97,.35,0],.045,axleMat),rod([side*.60,.91,.25],[side*.97,.35,.75],.045,axleMat));
        for(const z of [-.75,0,.75]){
            const axle=new THREE.Group();axle.position.set(side*.97,DELIVERY.wheelCenterY,z);axle.rotation.z=Math.PI/2;
            const wheel=new THREE.Group();wheel.name='wheel-spin';
            wheel.add(mCyl(DELIVERY.wheelRadius-.012,DELIVERY.wheelRadius-.012,.20,axleMat,[0,0,0],32),mCyl(.265,.265,.214,m.dark,[0,0,0],28),mCyl(.11,.11,.24,axleMat));
            for(let j=0;j<20;j++){
                const a=j/20*Math.PI*2,r=DELIVERY.wheelRadius-.01;
                const tread=mBox(.042,.216,.022,axleMat,[Math.cos(a)*r,0,Math.sin(a)*r]);tread.rotation.y=Math.PI/2-a;wheel.add(tread);
            }
            for(let j=0;j<6;j++){
                const a=j*Math.PI/3;wheel.add(rod([Math.cos(a)*.10,side*.114,Math.sin(a)*.10],[Math.cos(a)*.25,side*.114,Math.sin(a)*.25],.021,axleMat));
            }
            axle.add(wheel);wheels.add(axle);
        }
    }
    mast.position.set(0,isZhurong?1.40:1.20,.48);
    const mastHeight=isZhurong?.95:.74;
    mast.add(rod([0,0,0],[0,mastHeight,0],.039,m.metal),mBox(isZhurong?.57:.46,.23,.27,m.white,[0,mastHeight,0]));
    for(const x of [-.15,.15])mast.add(mBall(.075,m.glass,[x,mastHeight,.15]));
    if(isZhurong)mast.add(mBox(.19,.15,.21,m.dark,[.27,mastHeight-.13,.04]));
    const dish=new THREE.Group();dish.position.set(isZhurong?.42:.35,isZhurong?1.57:1.38,-.51);dish.rotation.x=-.52;
    const dishRadius=isZhurong?.26:.25,dishMat=m.std('#e0e4dd',.24,.51);dishMat.side=THREE.DoubleSide;
    dish.add(meshOf(new THREE.LatheGeometry(Array.from({length:9},(_,i)=>{const r=i/8*dishRadius;return new THREE.Vector2(r,.12*(r/dishRadius)**2);}),28),dishMat),rod([0,0,0],[0,.27,0],.016,m.metal));root.add(dish);
    root.add(rod([isZhurong?.42:.35,1.15,-.51],[isZhurong?.42:.35,isZhurong?1.57:1.38,-.51],.028,m.metal));
    for(const side of [-1,1]){
        root.add(mBox(.18,.13,.18,m.white,[side*.43,.92,.85]),mBall(.052,m.glass,[side*.43,.92,.954]));
        if(isZhurong)root.add(rod([side*.56,1.05,.72],[side*.73,1.12,1.95],.020,m.metal));
        else root.add(rod([side*.42,1.09,-.76],[side*.69,1.78,-1.16],.014,m.metal));
    }
    if(isZhurong){
        // Paired heat-collection windows on the deck are distinct from the four solar wings.
        for(const side of [-1,1])body.add(mCyl(.17,.19,.045,m.glass,[side*.28,1.445,-.07],24));
    } else {
        body.add(mBox(.30,.21,.40,m.dark,[0,.82,.87]),mBox(.22,.11,.19,m.metal,[0,.76,1.13]));
    }
    function panel(side:number,fore:number,points:[number,number][]){
        const pivot=new THREE.Group();pivot.position.set(side*(isZhurong?.67:.61),isZhurong?1.40:1.20,isZhurong?fore*.49:0);pivot.userData.side=side;
        const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(side*x,-fore*z):shape.moveTo(side*x,-fore*z));shape.closePath();
        const backing=meshOf(new THREE.ExtrudeGeometry(shape,{depth:.042,bevelEnabled:false}),m.dark);backing.rotation.x=-Math.PI/2;pivot.add(backing);
        const cells=meshOf(new THREE.ShapeGeometry(shape),m.solar,[0,.047,0]);cells.rotation.x=-Math.PI/2;
        cells.geometry.computeBoundingBox();
        const bounds=cells.geometry.boundingBox!,positions=cells.geometry.getAttribute('position'),uv=cells.geometry.getAttribute('uv');
        for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)-bounds.min.x)/(bounds.max.x-bounds.min.x),(positions.getY(i)-bounds.min.y)/(bounds.max.y-bounds.min.y));
        // Mirror winding may face down; use the existing cell texture on a double-sided material.
        const cellMaterial=m.std('#d2ddf1',.33,.48);cellMaterial.map=m.solar.map;cellMaterial.side=THREE.DoubleSide;cells.material=cellMaterial;pivot.add(cells);
        points.forEach(([x,z],i)=>{const next=points[(i+1)%points.length]!;pivot.add(rod([side*x,.05,fore*z],[side*next[0],.05,fore*next[1]],.017,m.metal));});
        pivot.add(rod([side*.09,.05,0],[side*(isZhurong?1.65:1.14),.05,0],.014,m.metal));wings.add(pivot);
    }
    if(isZhurong){
        // Four independent, clipped butterfly lobes, two on either side of the chassis.
        for(const side of [-1,1])for(const fore of [-1,1])panel(side,fore,[[0,-.30],[.40,-.35],[1.74,-.63],[1.84,.20],[1.31,.83],[.10,.55]]);
    } else {
        for(const side of [-1,1])panel(side,1,[[.02,-.68],[1.03,-.68],[1.22,-.48],[1.22,.48],[1.03,.68],[.02,.68]]);
    }
    root.userData.wheelBottom=DELIVERY.wheelCenterY-DELIVERY.wheelRadius;
    root.userData.wheelRadius=DELIVERY.wheelRadius;
    root.userData.wheelCount=6;root.userData.solarWingCount=isZhurong?4:2;
    return {root,parts:{body,wheels,wings,mast}};
}

export function makeStation(kind: string, m: ModelMaterials): CraftModel {
    const root = new THREE.Group(), parts: Record<string, THREE.Object3D> = {};
    function namePanel(panel: THREE.Group, role: string) {
        stationElement(panel, role);
        panel.children.forEach((child, i) => stationElement(child, i === 0 ? '背板' : i === 1 ? '正面蒙皮' : '加强筋'));
        return panel;
    }
    function module(length: number, radius: number, label: string) {
        const g = new THREE.Group();
        stationElement(g, label);
        const body = stationElement(mCyl(radius, radius, length, m.white), '主舱体');
        body.rotation.x = Math.PI / 2;
        g.add(body);
        for (const z of [-length / 2, length / 2]) {
            const end = mCyl(radius * .48, radius, .6, m.metal, [0, 0, z]);
            end.rotation.x = Math.PI / 2;
            stationElement(end, z < 0 ? '负Z端过渡段' : '正Z端过渡段');
            g.add(end);
            g.add(stationElement(torus(radius * .5, .06, m.dark, [0, 0, z + .31]), z < 0 ? '负Z端对接环' : '正Z端对接环'));
        }
        for (let z = -length / 2 + .5; z < length / 2; z += 1.5)
            g.add(stationElement(torus(radius + .015, .025, m.metal, [0, 0, z]), '舱体加强环'));
        annotate(g, label);
        return g;
    }
    const dockedCylinder = (r1:number,r2:number,len:number,mat:THREE.Material,pos:Vec3T,segs=20) => {
        const c=mCyl(r1,r2,len,mat,pos,segs); c.rotation.x=Math.PI/2; return c;
    };
    if (kind === 'salyut') {
        const core = module(7, 1.15, '工作与生活舱');
        root.add(core);
        parts.core = core;
        const small = module(2, .8, '对接通道');
        small.position.z = 4.6;
        root.add(small);
        for (const s of [-1, 1])
            for (const z of [-2.7, 2.7]) {
                const w = namePanel(solarWing(3.5, 1.3, m, m.metal, m.metal), `${s < 0 ? '负X侧' : '正X侧'}-${z < 0 ? '负Z端' : '正Z端'}金属太阳翼`);
                w.position.set(s * 3, 0, z);
                root.add(w);
            }
        const interior = stationElement(new THREE.Group(), '内部设备（隐藏）');
        interior.add(mBox(1.2, .12, 4, m.dark, [0, -.55, 0]), mBox(1, .8, 1.5, m.metal, [0, 0, -1.5]), mBox(.8, .2, 1.7, m.fabric, [0, .1, 1.1]));
        interior.visible = false;
        root.add(interior);
        parts.interior = interior;
    }
    else {
        const core = module(8.8, 1.02, '天和核心舱');
        root.add(core);
        parts.core = core;
        const hub = mBall(1.08, m.white, [0, 0, -4.65]);
        stationElement(hub, '核心对接节点');
        root.add(hub);

        // Forward gray panels: 2 total, one on each side, horizontal rather than vertical.
        for (const side of [-1, 1]) {
            const mount = stationElement(new THREE.Group(), `天和核心舱-灰色太阳翼${side < 0 ? 'A（局部-X）' : 'B（局部+X）'}`);
            mount.position.set(0, 0, .74);
            mount.add(rod([0,0,0],[side*1.05,0,0],.078,m.white));
            mount.add(mBox(.22,.18,.34,m.white,[side*1.05,0,0]));
            mount.children.forEach((child, i) => stationElement(child, i === 0 ? '根部连接杆' : '根部安装座'));
            const panel = namePanel(solarWing(8.9, 1.34, m, m.metal, m.metal), '光板');
            panel.position.set(side*5.5, 0, 0);
            // Horizontal long axis: scale local X, keep the inner edge at ±1.05 in the mount frame.
            panel.userData.coreSolarPanel = { width: 8.9, side, anchorX: 1.05 };
            mount.add(panel);
            root.add(mount);
        }

        const cargoDock = rod([0,0,4.66],[0,0,5.66],.18,m.white);
        stationElement(cargoDock, '天舟-对接连接段');
        const cargo = stationElement(new THREE.Group(), '天舟货运飞船');
        cargo.position.z = 7.38;
        // Head near the station is clearly short; the long cylindrical body is the tailward section.
        cargo.add(
            dockedCylinder(.30, .20, .46, m.metal, [0, 0, -1.92], 24),
            dockedCylinder(.78, .30, .70, m.metal, [0, 0, -1.36], 24),
            dockedCylinder(.72, .78, 3.62, m.white, [0, 0, .78], 24),
            dockedCylinder(.34, .72, .86, m.metal, [0, 0, 3.00], 24)
        );
        cargo.children.forEach((child, i) => stationElement(child, ['对接头','过渡锥段','货运主舱体','尾段'][i]!));
        for (const s of [-1, 1]) {
            const arm = rod([0, .10, .88], [s * .84, .10, .88], .046, m.white);
            stationElement(arm, `${s < 0 ? '负X侧' : '正X侧'}太阳翼连接杆`);
            cargo.add(arm);
            const wing = makeStationSolarWing(2.2, .92, m, s, false, m.solar, .20);
            wing.position.set(s * .84, .10, .88);
            wing.scale.set(.82, .82, .82);
            stationElement(wing, `${s < 0 ? '负X侧' : '正X侧'}小太阳翼`);
            cargo.add(wing);
        }
        root.add(cargoDock, annotate(cargo, '天舟货运飞船'));

        const shipDock = rod([0,0,-5.69],[0,0,-6.96],.18,m.white);
        stationElement(shipDock, '神舟-对接连接段');
        const shenzhou = stationElement(new THREE.Group(), '神舟载人飞船');
        shenzhou.position.z = -9.18;
        // Near-station head is a short docking section; the long body extends to the far tail.
        shenzhou.add(
            dockedCylinder(.22, .54, .62, m.metal, [0, 0, 1.94], 20),
            dockedCylinder(.64, .78, 3.12, m.white, [0, 0, -.02], 20),
            dockedCylinder(.55, .55, .72, m.dark, [0, 0, -2.34], 20)
        );
        shenzhou.children.forEach((child, i) => stationElement(child, ['对接头','载人飞船舱体','尾段'][i]!));
        // Overlapping adapters close the real axial gaps between the docking
        // head, pressure body and dark propulsion tail without moving the ship.
        shenzhou.add(
            stationElement(dockedCylinder(.54, .64, .14, m.metal, [0, 0, 1.58], 20), '舱体头部连接环'),
            stationElement(dockedCylinder(.78, .55, .46, m.metal, [0, 0, -1.78], 20), '推进尾段连接锥段')
        );
        for (const s of [-1, 1]) {
            const arm = rod([0, -.14, -.52], [s * .9, -.14, -.52], .042, m.white);
            stationElement(arm, `${s < 0 ? '负X侧' : '正X侧'}太阳翼连接杆`);
            shenzhou.add(arm);
            const wing = makeStationSolarWing(2.75, .86, m, s, false, m.solarGold, .18);
            wing.position.set(s * .9, -.14, -.52);
            wing.scale.set(.86, .86, .86);
            stationElement(wing, `${s < 0 ? '负X侧' : '正X侧'}小太阳翼`);
            shenzhou.add(wing);
        }
        root.add(shipDock, annotate(shenzhou, '神舟载人飞船'));

        const buildLab = (name:string, side:number, partKey:'wentian'|'mengtian') => {
            const pivot = stationElement(new THREE.Group(), name);
            pivot.position.z = -4.65;
            pivot.rotation.y = side * Math.PI / 2;
            pivot.userData.side = side;
            const tunnel = rod([0,0,0],[0,0,-.66],.22,m.white);
            const node = dockedCylinder(.42,.42,.48,m.metal,[0,0,-.90],18);
            const head = dockedCylinder(.46,.78,.92,m.metal,[0,0,-1.58],22);
            const body = dockedCylinder(.92,.94,4.68,m.white,[0,0,-4.38],24);
            const tail = dockedCylinder(.88,.64,.92,m.metal,[0,0,-7.12],24);
            [tunnel,node,head,body,tail].forEach((child,i) => stationElement(child, ['对接通道','对接节点','头部过渡段','实验舱主舱体','尾段'][i]!));
            pivot.add(tunnel,node,head,body,tail);
            for (let z=-6.2; z<=-2.4; z+=1.3) pivot.add(stationElement(torus(.97,.024,m.metal,[0,0,z]), '舱体加强环'));
            pivot.add(stationElement(mBox(.44,.36,.70,m.dark,[0,.18,-5.65]), '外部设备盒'));

            // Keep this panel group direction unchanged: vertical up/down pairs on the arm ends.
            const panelBase = stationElement(new THREE.Group(), '柱臂端太阳翼组件');
            panelBase.position.set(0, 0, -7.88);
            // The transverse wing yoke needs an axial mounting section back to
            // the laboratory aft face; its animation pivot stays unchanged.
            pivot.add(stationElement(dockedCylinder(.64,.23,.38,m.metal,[0,0,-7.73],24), '太阳翼转轴连接段'));
            const outboardSide = side < 0 ? -1 : 1;
            panelBase.add(rod([0,0,0],[outboardSide*1.18,0,0],.074,m.white));
            panelBase.add(mBox(.20,.18,.30,m.white,[outboardSide*1.18,0,0]));
            panelBase.children.forEach((child, i) => stationElement(child, i === 0 ? '柱臂端连接杆' : '柱臂端安装座'));
            for (const dir of [-1, 1]) {
                const branch = stationElement(new THREE.Group(), dir > 0 ? '朝上太阳翼' : '朝下太阳翼');
                branch.position.set(outboardSide * 1.18, 0, 0);
                branch.add(rod([0,0,0],[0,dir*1.16,0],.056,m.white));
                branch.add(mBox(.16,.16,.24,m.metal,[0,dir*1.16,0]));
                branch.children.forEach((child, i) => stationElement(child, i === 0 ? '根部连接杆' : '根部安装座'));
                const panel = namePanel(solarWing(7.9, 1.44, m, m.solarGold, m.solarGold), '光板');
                panel.rotation.z = Math.PI / 2;
                panel.position.set(0, dir * 5.10, 0);
                // Anchor the inner edge at the arm tip, so collapse/expand happens in place instead of floating away.
                panel.userData.labSolarPanel = { width: 7.9, dir, anchorY: 1.15 };
                branch.add(panel);
                panelBase.add(branch);
            }
            pivot.add(panelBase);
            root.add(pivot);
            parts[partKey] = pivot;
            annotate(pivot, name);
        };
        buildLab('问天实验舱', -1, 'wentian');
        buildLab('梦天实验舱', 1, 'mengtian');
    }
    if (kind === 'tiangong')
        root.rotation.set(0, Math.PI - .18, 0);
    else
        root.rotation.set(0, -.18, 0);
    assignStationElementNames(root, kind === 'salyut' ? '礼炮一号空间站' : '天宫空间站');
    return { root, parts };
}
/** Anatomical proportions, hide clothing, hair and tools: no cylinder-and-ball stick figure. */
export function makeHuman(m: ModelMaterials, astronaut = false, variant = 0): CraftModel {
    if (astronaut) return makeAstronaut(m);
    const root = new THREE.Group(), head = new THREE.Group(), arms = new THREE.Group(), legs = new THREE.Group();
    root.add(head, arms, legs);
    const skin = m.std(variant === 1 ? '#876b56' : '#9b7960', .0, .86), hair = m.std('#2a211c', .0, .97);
    const ellipsoid = (r:number, scale:Vec3T, mat:THREE.Material, p:Vec3T) => { const b=mBall(r,mat,p);b.scale.fromArray(scale);return b; };
    root.add(ellipsoid(.31,[1.0,1.35,.67],skin,[0,1.13,0]),ellipsoid(.26,[1.1,.73,.70],skin,[0,.83,0]));
    root.add(mCyl(.09,.13,.20,skin,[0,1.50,0]));
    const robeGeo=new THREE.CylinderGeometry(.33,.35,.73,36,10,true);
    const pos=robeGeo.attributes.position!;
    for(let i=0;i<pos.count;i++){
      const a=Math.atan2(pos.getZ(i),pos.getX(i));
      const y=pos.getY(i), w=(.365-y)/.73;
      pos.setY(i,y+w*w*(.045*Math.sin(a*11)+.023*Math.cos(a*23)));
      pos.setX(i,pos.getX(i)*(1+.023*Math.sin(a*13)));pos.setZ(i,pos.getZ(i)*.72);
    }
    robeGeo.computeVertexNormals();const robe=meshOf(robeGeo,m.fur,[0,1.00,0]);root.add(robe);
    root.add(ellipsoid(.30,[.50,.74,.89],m.fur,[-.23,1.38,0]));
    root.add(rod([-.29,1.48,.12],[.27,.94,.23],.04,m.wood));
    head.position.set(0,1.71,0);
    head.add(ellipsoid(.215,[.89,1.12,.93],skin,[0,0,0]));
    head.add(ellipsoid(.14,[.95,.82,.86],skin,[0,-.11,.065]));
    for(const side of [-1,1]){
      head.add(ellipsoid(.044,[.65,1.2,.78],skin,[side*.195,-.015,0]));
      head.add(ellipsoid(.032,[1.25,.48,.52],m.dark,[side*.073,.02,.181]));
      head.add(rod([side*.032,.067,.188],[side*.113,.064,.175],.016,hair));
    }
    head.add(ellipsoid(.052,[.55,1.15,.84],skin,[0,-.028,.193]));
    head.add(rod([-.05,-.094,.177],[.05,-.094,.177],.008,m.std('#634239',0,.9)));
    const cap=meshOf(new THREE.SphereGeometry(.222,28,18,0,Math.PI*2,0,1.82),hair,[0,.055,-.018]);
    cap.scale.set(1.04,1.08,.96);head.add(cap);
    const random=seeded(731+variant);
    for(let i=0;i<28;i++){
      const a=i/28*Math.PI*2;
      const x=Math.cos(a)*.203,z=Math.sin(a)*.195;
      const length=.16+random()*.19;
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,.12,z),new THREE.Vector3(x*1.10,-.03,z*1.04-.01),new THREE.Vector3(x*1.0,-length,z*.95-.025)]);
      head.add(meshOf(new THREE.TubeGeometry(curve,6,.012+random()*.008,5,false),hair));
    }
    // A short, irregular beard reads as hair, not an exaggerated animal-like muzzle.
    for(let i=0;i<11;i++){
      const x=(i-5)*.021;
      head.add(rod([x,-.09,.169],[x*.83,-.205-Math.cos(i)*.019,.139],.013,hair));
    }
    for(const side of [-1,1]){
      arms.add(ellipsoid(.12,[1,.97,.94],skin,[side*.30,1.36,0]));
      arms.add(rod([side*.30,1.35,0],[side*.41,1.06,.027],.086,skin));
      arms.add(ellipsoid(.078,[1,1,1],skin,[side*.41,1.03,.026]));
      arms.add(rod([side*.41,1.03,.026],[side*.45,.78,.075],.063,skin));
      const hand=ellipsoid(.074,[.75,1.10,.49],skin,[side*.45,.735,.080]);arms.add(hand);
      for(let j=0;j<4;j++)arms.add(rod([side*.45+(j-1.5)*.018,.72,.083],[side*.45+(j-1.5)*.017,.657,.090],.008,skin));
      const leg=new THREE.Group();
      leg.add(rod([side*.15,.84,0],[side*.17,.46,.01],.105,skin));
      leg.add(ellipsoid(.088,[1,1.0,1],skin,[side*.17,.45,.018]));
      leg.add(rod([side*.17,.44,.01],[side*.19,.15,.02],.070,skin));
      leg.add(ellipsoid(.11,[.9,.52,1.55],skin,[side*.19,.064,.075]));legs.add(leg);
    }
    if(variant!==2){
      root.add(rod([.48,.015,.03],[.56,1.77,.11],.026,m.wood));
      const flint=meshOf(new THREE.OctahedronGeometry(.1,0),m.std('#7b8084',.12,.82),[.565,1.86,.114]);
      flint.scale.set(.64,1.7,.30);root.add(flint);
      for(let i=0;i<6;i++){const cord=torus(.036,.006,m.fabric,[.56,1.71+i*.017,.11]);cord.rotation.x=Math.PI/2;root.add(cord);}
    }
    root.name='史前仰望者 · 情景化造型';
    return { root, parts: { head, arms, legs } };
}

export function makeCabin(m: ModelMaterials) {
    const group = new THREE.Group(), wallMat = m.std('#303833', .32, .7), rimMat = m.std('#596368', .62, .35);
    const shape = new THREE.Shape();
    shape.moveTo(-7, -5);
    shape.lineTo(7, -5);
    shape.lineTo(7, 7);
    shape.lineTo(-7, 7);
    shape.closePath();
    const hole = new THREE.Path();
    hole.absellipse(0, 1.35, 1.67, 1.52, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const wall = meshOf(new THREE.ExtrudeGeometry(shape, { depth: .32, bevelEnabled: false }), wallMat, [0, 0, -3.9]);
    group.add(wall);
    for (const z of [-3.95, -3.55]) {
        const rim = torus(1.6, .15, rimMat, [0, 1.35, z]);
        rim.scale.set(1.075, .99, 1);
        group.add(rim);
    }
    const sleeve = mCyl(1.59, 1.59, .34, rimMat, [0, 1.35, -3.73], 64);
    sleeve.geometry.dispose();
    sleeve.geometry = new THREE.CylinderGeometry(1.59, 1.59, .34, 64, 1, true);
    sleeve.rotation.x = Math.PI / 2;
    sleeve.scale.x = 1.075;
    group.add(sleeve);
    for (let i = 0; i < 28; i++) {
        const a = i * Math.PI * 2 / 28;
        const bolt = mCyl(.035, .035, .05, m.metal, [Math.cos(a) * 1.91, 1.35 + Math.sin(a) * 1.75, -3.48], 6);
        bolt.rotation.x = Math.PI / 2;
        group.add(bolt);
    }
    const glass = meshOf(new THREE.CircleGeometry(1.56, 64), new THREE.MeshPhysicalMaterial({ color: '#92b7c2', transparent: true, opacity: .035, metalness: .1, roughness: .12, depthWrite: false, side: THREE.DoubleSide }), [0, 1.35, -3.67]);
    glass.scale.x = 1.075;
    group.add(glass);
    for (const s of [-1, 1]) {
        group.add(mBox(.5, 6, 7, wallMat, [s * 4, 1, -.6]));
        for (let y = -1; y < 4; y += .6)
            group.add(mBox(.065, .06, 6, m.dark, [s * 3.72, y, -.6]));
        const grab = new THREE.Group();
        grab.add(rod([s * 2.4, .4, -3.3], [s * 2.4, 2.3, -3.3], .045, m.metal), rod([s * 2.4, .4, -3.3], [s * 2.4, .4, -3.6], .04, m.metal), rod([s * 2.4, 2.3, -3.3], [s * 2.4, 2.3, -3.6], .04, m.metal));
        group.add(grab);
    }
    const console = mBox(5.6, 1.05, 1.15, m.dark, [0, -1.3, -2.85]);
    console.rotation.x = -.18;
    group.add(console);
    for (let i = 0; i < 5; i++) {
        const x = i * .8 - 1.6;
        const gauge = mCyl(.25, .25, .045, m.metal, [x, -.83, -2.3]);
        gauge.rotation.x = Math.PI / 2;
        group.add(gauge);
        const face = meshOf(new THREE.CircleGeometry(.21, 32), m.dark, [x, -.83, -2.266]);
        group.add(face, rod([x, -.83, -2.25], [x + .08, -.68, -2.25], .008, m.white));
        for (let j = 0; j < 3; j++)
            group.add(mBox(.08, .14, .08, j === 1 ? m.red : m.metal, [x + (j - 1) * .15, -1.35, -2.25]));
    }
    const lamp = new THREE.PointLight('#9bcede', 7, 9, 2);
    lamp.position.set(0, 1.8, -2.6);
    group.add(lamp);
    return group;
}

/** 72 separate, inset and bevelled metal panels; surface colour varies per panel. */
function makeDongfanghong(m: ModelMaterials): CraftModel {
  const root=new THREE.Group(), shell=new THREE.Group(), wings=new THREE.Group();
  root.add(shell,wings);root.name='东方红一号 · 72 面体与鞭状天线';
  // National Museum / CAST structural reference: 1 m shell, four 3 m whips,
  // and a 0.4 m axial antenna. Keep the full antenna span close to the old model.
  const radius=.60, antennaLength=3.60;
  root.add(mBall(.53,m.dark));
  const scratch=m.bank.own(canvasTexture(256,256,c=>{
    c.fillStyle='#888888';c.fillRect(0,0,256,256);const r=seeded(8191);
    for(let i=0;i<1800;i++){const g=110+Math.floor(r()*40);c.strokeStyle=`rgb(${g},${g},${g})`;const y=r()*256;c.beginPath();c.moveTo(r()*20,y);c.lineTo(256-r()*20,y+(r()-.5)*.8);c.stroke();}
  },true));
  const colors=['#cbbd91','#c9bd9c','#d0c4a1','#c8bb8e'];
  const materials=colors.map((c,i)=>{
    const mat=new THREE.MeshPhysicalMaterial({color:c,metalness:.90,roughness:.24+i*.018,
      bumpMap:scratch,bumpScale:.004,envMapIntensity:1.55,clearcoat:.12,clearcoatRoughness:.33});
    return mat;
  });
  const bolts: {pos:THREE.Vector3;normal:THREE.Vector3}[]=[];
  dfhPanelVertices(radius).forEach((coords,index)=>{
    let vs=coords.map(v=>new THREE.Vector3(...v));
    const center=vs.reduce((a,v)=>a.add(v),new THREE.Vector3()).multiplyScalar(1/vs.length);
    let n=new THREE.Vector3().subVectors(vs[1]!,vs[0]!).cross(new THREE.Vector3().subVectors(vs[2]!,vs[0]!)).normalize();
    if(n.dot(center)<0){vs=vs.reverse();n.negate();}
    const u=new THREE.Vector3().subVectors(vs[1]!,vs[0]!).normalize(),v=new THREE.Vector3().crossVectors(n,u).normalize();
    const shape=new THREE.Shape();
    vs.forEach((p,i)=>{const d=p.clone().sub(center).multiplyScalar(.966);const x=d.dot(u),y=d.dot(v);i===0?shape.moveTo(x,y):shape.lineTo(x,y);});shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1,curveSegments:1});
    const panel=meshOf(geo,materials[(index*7+Math.floor(index/12))%materials.length]!);
    panel.position.copy(center);panel.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u,v,n));
    panel.name=`蒙皮分块 ${index+1}`;shell.add(panel);
    // Dark thermal-control patches are visible on CAST's historical exterior photo.
    if(index>=12&&index<60&&index%3!==1){
      const patchShape=new THREE.Shape();
      vs.forEach((p,i)=>{const d=p.clone().sub(center).multiplyScalar(.68);const x=d.dot(u),y=d.dot(v);i===0?patchShape.moveTo(x,y):patchShape.lineTo(x,y);});patchShape.closePath();
      panel.add(meshOf(new THREE.ShapeGeometry(patchShape),m.std('#202521',.22,.67),[0,0,.009]));
    }
    vs.forEach(p=>bolts.push({pos:p.clone().sub(center).multiplyScalar(.83).add(center).addScaledVector(n,.010),normal:n.clone()}));
  });
  const rivets=new THREE.InstancedMesh(new THREE.SphereGeometry(.0045,7,5),m.metal,bolts.length);
  const dummy=new THREE.Object3D();bolts.forEach((b,i)=>{dummy.position.copy(b.pos);dummy.updateMatrix();rivets.setMatrixAt(i,dummy.matrix);});
  shell.add(rivets);
  const belt=mCyl(radius+.003,radius+.003,.075,m.metal,[0,0,0],12);root.add(belt);
  for(let i=0;i<8;i++){
    const a=(i+.5)*Math.PI/4,port=mBox(.050,.037,.008,m.dark,[Math.cos(a)*(radius+.005),0,Math.sin(a)*(radius+.005)]);
    port.rotation.y=Math.PI/2-a;root.add(port);
  }
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
    const base=new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius);
    root.add(mBall(.030,m.metal,base.toArray() as Vec3T));
    for(let j=0;j<4;j++){
      const from=base.clone().addScaledVector(dir,j*antennaLength/4),to=base.clone().addScaledVector(dir,(j+1)*antennaLength/4);
      root.add(rod(from.toArray() as Vec3T,to.toArray() as Vec3T,.013-j*.0025,m.metal));
    }
  }
  root.add(mCyl(.042,.060,.035,m.metal,[0,.615,0]),rod([0,.63,0],[0,1.11,0],.007,m.metal));
  root.add(mCyl(.13,.10,.08,m.metal,[0,-.625,0]));
  root.userData.panelCount=72;root.userData.panelConstruction='inset-extruded-facets';
  return {root,parts:{wings,body:shell}};
}

function addMissionDecals(parent:THREE.Object3D,label:string,r:number,y:number,m:ModelMaterials,height=3.9){
  const map=m.bank.own(canvasTexture(512,1024,c=>{
    c.clearRect(0,0,512,1024);
    c.fillStyle='rgba(252,248,240,.96)';c.fillRect(86,28,340,968);
    c.strokeStyle='rgba(170,40,26,.24)';c.lineWidth=5;c.strokeRect(86,28,340,968);
    c.fillStyle='#c33422';c.textAlign='center';
    c.shadowColor='rgba(255,255,255,.28)';c.shadowBlur=5;
    c.font='700 108px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
    const chars=[...label];chars.forEach((v,i)=>c.fillText(v,256,138+i*740/Math.max(1,chars.length-1)));
  }));
  const mat=new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.48,metalness:.04,
    polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  for(let i=0;i<6;i++){
    const geo=new THREE.CylinderGeometry(r+.018,r+.018,height,22,1,true,i*Math.PI/3-.34,.68);
    const patch=meshOf(geo,mat,[0,y,0]);patch.castShadow=false;patch.renderOrder=2;parent.add(patch);
  }
}

function makeDeliveryLander(kind:string,m:ModelMaterials):CraftModel{
  const root=new THREE.Group(),body=new THREE.Group(),upper=new THREE.Group();root.add(body,upper);
  const lunar=kind==='change';
  root.name=lunar?'嫦娥四号着陆器':'天问一号着陆平台';
  if(lunar){
    body.add(mBox(2.36,.77,2.34,m.gold,[0,1.10,0]),mBox(2.46,.07,2.46,m.metal,[0,DELIVERY.deckY-.035,0]));
    for(const side of [-1,1])body.add(mBox(.045,.50,.63,m.dark,[side*1.195,1.13,.15]),mBox(.50,.43,.04,m.gold,[side*.71,1.20,1.19]));
  } else {
    const bus=mCyl(1.57,1.49,.66,m.gold,[0,1.13,0],8);bus.rotation.y=Math.PI/8;
    const deck=mCyl(1.59,1.59,.08,m.metal,[0,DELIVERY.deckY-.04,0],8);deck.rotation.y=Math.PI/8;body.add(bus,deck);
    for(const side of [-1,1])body.add(mBox(.40,.35,.49,m.white,[side*1.10,1.53,-.78]),mBox(.26,.32,.40,m.gold,[side*1.39,1.21,.14]));
  }
  const engine=nozzle(lunar?.34:.40,m);engine.position.y=.95;body.add(engine);
  for(let j=0;j<4;j++){
    const a=j*Math.PI/2+Math.PI/4,ca=Math.cos(a),sa=Math.sin(a);
    body.add(rod([ca*1.40,1.41,sa*1.40],[ca*2.7,.19,sa*2.7],.065,m.metal),
      rod([ca*1.48,1.34,sa*1.48],[ca*2.01,.82,sa*2.01],.10,lunar?m.gold:m.white),
      mCyl(.40,.43,.16,m.gold,[ca*2.7,.08,sa*2.7],32));
    for(const side of [-1,1])body.add(rod([ca*.95-sa*side*.40,.83,sa*.95+ca*side*.40],[ca*2.49,.37,sa*2.49],.032,m.metal));
    body.add(mBall(.085,m.metal,[ca*2.7,.20,sa*2.7]));
  }
  // Rover cradle is clear. All fixed equipment is aft of the delivery deck.
  upper.add(mBox(.58,.45,.37,m.white,[-.64,1.81,-1.02]),mBox(.42,.32,.37,m.gold,[.68,1.73,-1.03]));
  upper.add(rod([-.92,1.57,-1.02],[-.92,lunar?2.48:2.13,-1.02],.035,m.metal));
  const dish=new THREE.Group();dish.position.set(-.92,lunar?2.50:2.15,-1.02);dish.rotation.z=-.42;
  const radius=lunar?.37:.24,antennaMat=m.std('#dedfd6',.22,.56);antennaMat.side=THREE.DoubleSide;
  dish.add(meshOf(new THREE.LatheGeometry(Array.from({length:10},(_,i)=>{const r=i/9*radius;return new THREE.Vector2(r,.15*(r/radius)**2);}),32),antennaMat),rod([0,0,0],[0,.34,0],.02,m.metal));upper.add(dish);
  if(lunar)for(const side of [-1,1]){
    const w=solarWing(1.90,1.52,m);w.position.set(side*2.22,1.50,-.23);body.add(w);
    body.add(rod([side*1.15,1.45,-.63],[side*2.38,1.45,-.63],.043,m.metal));
  }
  upper.add(rod([.81,1.58,-.99],[.81,lunar?2.68:2.35,-.99],.016,m.metal),mBox(.18,.18,.21,m.dark,[.72,1.99,-1.02]));
  for(const side of [-1,1]){
    body.add(rod([side*.48,1.57,-.45],[side*.48,1.57,1.24],.031,m.metal));
  }
  const ramp=new THREE.Group();ramp.position.set(0,DELIVERY.deckY,DELIVERY.rampStartZ);
  const slope=Math.atan2(DELIVERY.deckY-DELIVERY.rampEndY,DELIVERY.rampEndZ-DELIVERY.rampStartZ);
  const length=Math.hypot(DELIVERY.deckY-DELIVERY.rampEndY,DELIVERY.rampEndZ-DELIVERY.rampStartZ);
  for(const side of [-1,1]){
    const x=side*.97*DELIVERY.roverScale;
    ramp.add(mBox(.39,.042,length,m.metal,[x,-.023,length/2]));
    for(const edge of [-1,1])ramp.add(rod([x+edge*.20,0,0],[x+edge*.20,0,length],.025,m.metal));
    for(let z=.16;z<length;z+=.16)ramp.add(mBox(.39,.025,.045,m.dark,[x,.005,z]));
  }
  ramp.rotation.x=-1.40;root.add(ramp);root.userData.rampSlope=slope;root.userData.deliveryDeckY=DELIVERY.deckY;
  const exhaust=makeFlame();exhaust.position.y=.69;exhaust.scale.set(.20,.26,.20);root.add(exhaust);
  return {root,parts:{body,upper,ramp,flame:exhaust}};
}

/** The visible warm side is the blanket/substrate; the cell side remains blue-black. */
function makeStationSolarWing(length:number,width:number,m:ModelMaterials,side:number,vertical=true,panelMaterial:THREE.Material=m.solarGold,boomLength:number=STATION_LAYOUT.boom){
  const root=new THREE.Group(),hinge=new THREE.Group();
  const collarDepth=vertical?Math.max(.22,width*.32):Math.max(.26,width*.34);
  root.add(mBox(.24,.20,collarDepth,m.white,[-side*.11,0,0]));
  root.add(rod([-side*.10,0,0],[side*boomLength,0,0],.085,m.white));
  hinge.position.x=side*boomLength;root.add(hinge);
  const array=new THREE.Group();array.position.x=side*(STATION_LAYOUT.clearance+length*.5);
  if(vertical){
    array.add(mBox(length,width,.055,m.metal),mBox(length-.08,width-.08,.010,panelMaterial,[0,0,.031]),mBox(length-.08,width-.08,.010,m.metal,[0,0,-.031]));
    for(let x=-length*.5;x<=length*.5;x+=Math.max(.42,length/16))array.add(rod([x,-width*.5,.034],[x,width*.5,.034],.013,m.metal));
    for(const y of [-width*.5,width*.5])array.add(rod([-length*.5,y,0],[length*.5,y,0],.017,m.metal));
  } else {
    array.add(mBox(length,.045,width,m.dark),mBox(length-.08,.007,width-.08,panelMaterial,[0,.026,0]),mBox(length-.08,.007,width-.08,m.metal,[0,-.026,0]));
    for(let x=-length*.5;x<=length*.5;x+=Math.max(.42,length/16))array.add(rod([x,.035,-width*.5],[x,.035,width*.5],.014,m.metal));
    for(const z of [-width*.5,width*.5])array.add(rod([-length*.5,0,z],[length*.5,0,z],.017,m.metal));
  }
  hinge.add(mBox(.18,.12,Math.max(.24,vertical?width*.30:width*.28),m.metal,[side*.09,0,0]));
  hinge.add(rod([0,0,0],[side*STATION_LAYOUT.clearance,0,0],.052,m.metal),array);
  stationElement(root, vertical ? '竖直太阳翼' : '水平太阳翼');
  stationElement(root.children[0]!, '根部安装座'); stationElement(root.children[1]!, '连接臂');
  stationElement(hinge, '铰链组件'); stationElement(array, '光板');
  array.children.forEach((child,i) => stationElement(child, i===0?'板框':i===1?'正面蒙皮':i===2?'背面蒙皮':'加强筋'));
  hinge.children.filter(child=>child!==array).forEach((child,i)=>stationElement(child,i===0?'铰链座':'板根连接杆'));
  root.userData.solarAssembly={array,length,side};root.name=vertical?'竖直展开太阳翼':'水平展开太阳翼';return root;
}
export function setStationSolarDeployment(root:THREE.Object3D,amount:number){
  const deploy=Math.max(.035,Math.min(1,amount));
  root.traverse(o=>{
    const spec=o.userData.solarAssembly as {array:THREE.Group;length:number;side:number}|undefined;
    if(spec){
      spec.array.scale.x=deploy;
      spec.array.position.x=spec.side*(STATION_LAYOUT.clearance+spec.length*deploy*.5);
    }
    const core=o.userData.coreSolarPanel as {width:number;side:number;anchorX:number}|undefined;
    if(core){
      const pose=corePanelDeployment(core.width,core.side,core.anchorX,deploy);
      o.scale.x=pose.scale;
      o.position.x=pose.centerX;
    }
    const lab=o.userData.labSolarPanel as {width:number;dir:number;anchorY:number}|undefined;
    if(lab){
      // The long axis is local X, but after rotation.z=PI/2 it extends along local Y in world view.
      // Keep the inner edge anchored at the arm tip while only changing the visible length.
      o.scale.x=deploy;
      o.position.y=lab.dir*(lab.anchorY+lab.width*.5*deploy);
    }
  });
}

function makeAstronaut(m:ModelMaterials):CraftModel{
  const root=new THREE.Group(),head=new THREE.Group(),arms=new THREE.Group(),legs=new THREE.Group();
  root.scale.setScalar(APOLLO_ASTRONAUT_SCALE);
  root.add(head,arms,legs);const parts:Record<string,THREE.Object3D>={head,arms,legs};
  const chest=mBall(.32,m.white,[0,1.19,0]);chest.scale.set(1.03,1.15,.79);root.add(chest);
  root.add(mCyl(.29,.27,.20,m.white,[0,.90,0]),mBox(.48,.63,.32,m.white,[0,1.23,-.33]),mBox(.49,.10,.34,m.metal,[0,1.52,-.33]));
  head.position.set(0,1.70,0);head.add(mBall(.29,m.white));
  const visor=mBall(.242,m.std('#b3a46d',.86,.16),[0,.006,.112]);visor.scale.z=.61;head.add(visor);
  const rim=torus(.228,.023,m.dark,[0,.003,.208]);rim.scale.set(1.02,.90,1);head.add(rim);
  root.add(mBox(.28,.22,.045,m.white,[0,1.25,.252]),mBox(.20,.018,.048,m.red,[0,1.31,.262]));
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.31,1.41,0);
    const upper=mCyl(.115,.10,.29,m.white,[0,-.145,0]);shoulder.add(upper);
    const elbow=new THREE.Group();elbow.position.y=-.29;elbow.add(mBall(.11,m.white),mCyl(.095,.075,.28,m.white,[0,-.14,0]),mBall(.090,m.white,[0,-.31,.025]));shoulder.add(elbow);arms.add(shoulder);
    parts[side<0?'leftArm':'rightArm']=shoulder;parts[side<0?'leftElbow':'rightElbow']=elbow;
    const hip=new THREE.Group();hip.position.set(side*.18,.88,0);
    hip.add(mCyl(.13,.11,.40,m.white,[0,-.20,0]));const knee=new THREE.Group();knee.position.y=-.40;
    knee.add(mBall(.115,m.white),mCyl(.11,.094,.38,m.white,[0,-.19,0]));hip.add(knee);
    const ankle=new THREE.Group();ankle.position.y=-.38;
    ankle.add(mBox(.25,.15,.42,m.white,[0,-.021,.055]),mBox(.26,.035,.44,m.std('#7f868b',.05,.91),[0,-.083,.055]));
    for(let j=0;j<5;j++)ankle.add(mBox(.257,.019,.034,m.white,[0,-.047,-.10+j*.070]));knee.add(ankle);legs.add(hip);
    for(let k=0;k<3;k++){
      const cuff=torus(.112,.015,m.metal,[0,-.10-k*.037,0]);cuff.rotation.x=Math.PI/2;knee.add(cuff);
    }
    parts[side<0?'leftHip':'rightHip']=hip;parts[side<0?'leftKnee':'rightKnee']=knee;parts[side<0?'leftBoot':'rightBoot']=ankle;
  }
  const hose=new THREE.CatmullRomCurve3([new THREE.Vector3(-.18,1.19,.26),new THREE.Vector3(-.37,1.0,.28),new THREE.Vector3(-.35,.97,-.12),new THREE.Vector3(-.20,1.18,-.30)]);
  root.add(meshOf(new THREE.TubeGeometry(hose,18,.023,6,false),m.dark));root.name='月面宇航员 · 动作示意';
  return {root,parts};
}

/** Place the glove on a ladder rail using the suit's existing two arm joints. */
function poseApolloRailArm(shoulder:THREE.Object3D,elbow:THREE.Object3D,target:THREE.Vector3,side:number){
  const delta=target.clone().sub(shoulder.position),distance=delta.length(),direction=delta.normalize();
  const upper=.29,lower=Math.hypot(.31,.025),reach=Math.min(upper+lower-.0001,Math.max(.03,distance));
  const along=(upper*upper+reach*reach-lower*lower)/(2*reach);
  const bend=new THREE.Vector3(side*.6,-1,0).addScaledVector(direction,-new THREE.Vector3(side*.6,-1,0).dot(direction)).normalize();
  const joint=direction.clone().multiplyScalar(along).addScaledVector(bend,Math.sqrt(Math.max(0,upper*upper-along*along)));
  shoulder.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),joint.clone().normalize());
  const forearm=direction.multiplyScalar(reach).sub(joint).applyQuaternion(shoulder.quaternion.clone().invert()).normalize();
  elbow.quaternion.setFromUnitVectors(new THREE.Vector3(0,-.31,.025).normalize(),forearm);
}

export function poseApolloAstronaut(craft:CraftModel,t:number){
  const {root,parts}=craft;root.visible=t>=63.2;
  const stage=apolloStage(t);
  for(const name of ['leftArm','rightArm','leftElbow','rightElbow'])parts[name]!.rotation.set(0,0,0);
  if(t<65.8){
    const u=span(t,63.2,65.8),h=mix(1.78,.16,u),settle=span(t,65.52,65.8),s=APOLLO_ASTRONAUT_SCALE;
    const rig=apolloRigPose(65.8),hip=mix(.10,rig.legs[0]!.hip,settle),knee=mix(.35,rig.legs[0]!.knee,settle);
    for(const prefix of ['left','right']){
      parts[`${prefix}Hip`]!.rotation.x=hip;parts[`${prefix}Knee`]!.rotation.x=knee;parts[`${prefix}Boot`]!.rotation.x=-hip-knee;
    }
    // Boots keep the same ladder/pad path after resizing; the root itself is not a contact point.
    const soleY=(.88-.4*Math.cos(hip)-.38*Math.cos(hip+knee)-.1005)*s;
    const soleZ=(-.4*Math.sin(hip)-.38*Math.sin(hip+knee)+.055)*s;
    const railZ=2.65-(h-.12)*Math.tan(.38),contactZ=mix(railZ+.096,2.73,settle);
    root.position.set(0,h-soleY,contactZ+soleZ);root.rotation.y=Math.PI;root.updateMatrixWorld(true);
    for(const [prefix,side] of [['left',-1],['right',1]] as const){
      const gripY=Math.min(2.42,root.position.y+.94),gripZ=2.65-(gripY-.12)*Math.tan(.38);
      const grip=root.worldToLocal(new THREE.Vector3(-side*.3,gripY,gripZ));
      poseApolloRailArm(parts[`${prefix}Arm`]!,parts[`${prefix}Elbow`]!,grip,side);
      const armRest=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.08,0,0));
      const elbowRest=new THREE.Quaternion().setFromEuler(new THREE.Euler(-.18,0,0));
      parts[`${prefix}Arm`]!.quaternion.slerp(armRest,settle);parts[`${prefix}Elbow`]!.quaternion.slerp(elbowRest,settle);
    }
  } else {
    const rig=apolloRigPose(t);
    root.rotation.y=Math.PI*(1-span(t,65.8,66.45));
    // Pivot about the soles while turning on the footpad, rather than translating the smaller boots.
    root.position.set(-Math.sin(root.rotation.y)*rig.soleForward,rig.rootY,
      rig.rootZ+rig.soleForward*(1-Math.cos(root.rotation.y)));
    for(const [index,prefix] of [[0,'left'],[1,'right']] as const){
      const angles=rig.legs[index]!;
      parts[`${prefix}Hip`]!.rotation.x=angles.hip;
      parts[`${prefix}Knee`]!.rotation.x=angles.knee;
      parts[`${prefix}Boot`]!.rotation.x=angles.ankle;
    }
    const sway=t>69.5?Math.sin((t-69.5)*2.6)*.12:0;
    parts.leftArm!.rotation.x=-.08+sway;parts.rightArm!.rotation.x=-.08-sway;
    parts.leftElbow!.rotation.x=-.18;parts.rightElbow!.rotation.x=-.18;
  }
  parts.head!.rotation.x=stage==='first-step' || stage==='imprint' ? .19 : .04;
}

export function makeFootprint(m:ModelMaterials){
  const outline=(c:CanvasRenderingContext2D)=>{
    c.beginPath();c.moveTo(115,660);c.bezierCurveTo(77,574,133,520,117,415);c.bezierCurveTo(66,303,65,169,115,105);c.bezierCurveTo(173,23,349,23,403,107);c.bezierCurveTo(449,177,446,301,391,415);c.bezierCurveTo(376,519,437,578,395,660);c.bezierCurveTo(358,715,150,715,115,660);c.closePath();
  };
  const map=m.bank.own(canvasTexture(512,768,c=>{
    c.clearRect(0,0,512,768);outline(c);c.fillStyle='rgba(53,53,53,.87)';c.shadowBlur=12;c.shadowColor='rgba(8,8,8,.48)';c.fill();c.shadowBlur=0;c.save();outline(c);c.clip();
    for(let y=126;y<650;y+=52){c.strokeStyle='rgba(167,169,165,.72)';c.lineWidth=10;c.beginPath();c.moveTo(74,y);c.quadraticCurveTo(257,y+23,437,y);c.stroke();c.strokeStyle='rgba(26,27,27,.68)';c.lineWidth=5;c.beginPath();c.moveTo(74,y+10);c.quadraticCurveTo(257,y+32,437,y+10);c.stroke();}
    const r=seeded(61981);for(let i=0;i<4800;i++){c.fillStyle=r()>.5?'rgba(205,207,199,.14)':'rgba(8,8,8,.10)';c.fillRect(r()*512,r()*768,1+r()*2,1+r()*2);}c.restore();
  }));
  const bump=m.bank.own(canvasTexture(512,768,c=>{
    c.fillStyle='#aaaaaa';c.fillRect(0,0,512,768);outline(c);c.fillStyle='#444444';c.fill();c.save();outline(c);c.clip();
    for(let y=126;y<650;y+=52){c.strokeStyle='#aaaaaa';c.lineWidth=9;c.beginPath();c.moveTo(74,y);c.quadraticCurveTo(257,y+23,437,y);c.stroke();}c.restore();
  },true));
  const mat=new THREE.MeshStandardMaterial({map,bumpMap:bump,bumpScale:.018,transparent:true,alphaTest:.01,depthWrite:false,
    roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  const geo=new THREE.PlaneGeometry(.35*APOLLO_ASTRONAUT_SCALE,.53*APOLLO_ASTRONAUT_SCALE);geo.rotateX(-Math.PI/2);geo.rotateY(Math.PI);
  const mark=new THREE.Mesh(geo,mat);mark.receiveShadow=true;mark.castShadow=false;mark.renderOrder=3;
  mark.name='接触后出现的靴底压痕';mark.position.y=.004;return mark;
}
