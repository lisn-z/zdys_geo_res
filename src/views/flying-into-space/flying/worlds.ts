import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { configureSkyRadiance } from './sky-compat';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { SURFACE, GROUND_CAMERA_FAR, DAY_SKY_RADIANCE, landscapeHeight, coastlineX, coastalHeight, groundGridAxis, groundSurfaceHeight, sampledGroundHeight } from './scenery';
import { TextureBank, SUN_DIRECTION, makePlanet, makeStarfield, makeSmoke, makeFlame, canvasTexture, type PlanetKind } from './assets';
import { ModelMaterials, mBox, mCyl, mBall, meshOf, rod, torus, makeRocket, setFalconRecoveryConfiguration, makeFlyer, makeGoddard, makeSatellite, makeVostok, makeShenzhou, makeLander, makeApollo, makeRover, makeStation, makeHuman, makeCabin, annotate, makeFootprint, poseApolloAstronaut, type CraftModel } from './models';
import { span, mix, seeded, clamp01, solveOrbit, circularSpeed, EARTH_KM, ORBIT_ALTITUDE, segmentClear, type Vec3T, type LandingState } from './math';
import type { StoryChapter, StoryShot, ShotPose } from './story';
import { APOLLO_CONTACTS, deliveryState, roverDeliveryPose, DELIVERY, recoveryState, launchState } from './motion';
import { createCosmicFinale } from './cosmic-finale';
export interface VisualState {
    speed: number;
    orbitRun: number;
    landing: LandingState | null;
    relay: boolean;
    roverTarget: number;
    stationPart: string;
    activeKind: string;
    thrust: boolean;
    demo: boolean;
    taskArmed?: boolean;
    quality: 'balanced' | 'high';
}
export interface WorldFrame {
    chapter: StoryChapter;
    shot: StoryShot;
    local: number;
    global: number;
    interactionTime: number;
    state: VisualState;
}
export interface ObservationBounds {
    center: THREE.Vector3;
    radius: number;
    minDistance: number;
    maxDistance: number;
    groundHeight?: (x: number, z: number) => number;
    exclusionSpheres?: { center: THREE.Vector3; radius: number }[];
    exclusionBoxes?: THREE.Box3[];
}
export interface WorldPack {
    key: string;
    scene: THREE.Scene;
    focus: THREE.Vector3;
    follow: THREE.Vector3;
    cameraNear: number;
    cameraFar: number;
    getCameraPose?: () => ShotPose;
    update: (f: WorldFrame) => void;
    getObservationBounds: () => ObservationBounds;
    dispose: () => void;
    getPick: (ndc: THREE.Vector2, camera: THREE.Camera) => string | null;
}
/** The cabin is a fixed foreground aperture. Story/drag camera motion changes
 * the exterior view while the physical window stays on the optical axis.
 * Fit its outer bolts in the smaller viewport dimension, including portrait.
 */
export function alignCabinWindow(cabin: THREE.Group, camera: THREE.Camera): void {
    const projection = camera.projectionMatrix.elements;
    const distance = Math.max(4.20, Math.max(1.95 * Math.abs(projection[0]), 1.79 * Math.abs(projection[5])) / .82 + .28);
    camera.getWorldPosition(cabin.position);
    camera.getWorldQuaternion(cabin.quaternion);
    // makeCabin's aperture center is (0, 1.35, -3.73). Translate that exact
    // point to (0, 0, -distance) in camera space without distorting the model.
    cabin.position.add(new THREE.Vector3(0, -1.35, 3.73 - distance).applyQuaternion(cabin.quaternion));
    // Scene.onBeforeRender runs after Three's initial world-matrix update.
    cabin.updateMatrixWorld(true);
}
function disposeWorldScene(scene: THREE.Scene, bank?: TextureBank) {
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse(o => {
        if (o instanceof THREE.Light && 'shadow' in o)
            (o.shadow as THREE.LightShadow)?.dispose();
        const mesh = o as THREE.Mesh;
        if (mesh.geometry)
            geometries.add(mesh.geometry);
        if (mesh.material)
            (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(g => g.dispose());
    materials.forEach(m => {
        if (m.userData.keepAlive)
            return;
        for(const key of ['map','bumpMap','normalMap','roughnessMap','alphaMap','metalnessMap'] as const){
            const map=(m as THREE.MeshStandardMaterial)[key];
            if(map && (m.userData.ownMap || bank?.extra.has(map))){map.dispose();bank?.extra.delete(map);}
        }
        m.dispose();
    });
    scene.clear();
}
function linePath(points: Vec3T[], color: THREE.ColorRepresentation, opacity = .65, dashed = false) {
    const geo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    const mat = dashed ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: .35, gapSize: .22 }) : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const line = new THREE.Line(geo, mat);
    if (dashed)
        line.computeLineDistances();
    return line;
}
function ringPath(radius: number, color: THREE.ColorRepresentation, xy = false) { return linePath(Array.from({ length: 241 }, (_, i) => { const a = i / 240 * Math.PI * 2; return xy ? [Math.cos(a) * radius, Math.sin(a) * radius, 0] as Vec3T : [Math.cos(a) * radius, 0, Math.sin(a) * radius] as Vec3T; }), color, .28); }
function textSprite(text: string, bank: TextureBank, color = '#d6e5eb', scale = 3) { const tex = bank.own(canvasTexture(512, 96, c => { c.font = '500 34px "Microsoft YaHei", sans-serif'; c.textAlign = 'center'; c.fillStyle = color; c.shadowColor = '#030910'; c.shadowBlur = 9; c.fillText(text, 256, 58); })); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); s.scale.set(scale, scale * 96 / 512, 1); return s; }
function updateFalconJets(craft:CraftModel,state:ReturnType<typeof recoveryState>,time:number) {
    const flame=craft.parts.flame!;flame.visible=state.burning;
    flame.children.forEach((jet,index)=>{
        const center=index===flame.children.length-1;
        jet.visible=state.engineCount===9 || center || (state.engineCount===3 && (index===0 || index===4));
        if(jet instanceof THREE.Mesh && jet.material instanceof THREE.ShaderMaterial){
            jet.material.uniforms.time!.value=time;jet.material.uniforms.power!.value=state.power;
            jet.scale.y=state.phase==='landing'?.72-.25*span(time,41,44):.90;
        }
    });
}
/** A shared near grid with a graded far skirt: no rectangular terrain edge below the camera. */
function makeExtendedGround(type:string,coastal:boolean) {
    const axis=groundGridAxis(),n=axis.length,positions:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
        const x=axis[ix]!,z=axis[iz]!;
        positions.push(x,groundSurfaceHeight(x,z,coastal,type),z);
        uv.push((x+190)/380,1-(z+190)/380);
    }
    for(let z=0;z<n-1;z++)for(let x=0;x<n-1;x++){
        const a=z*n+x,b=a+1,c=a+n,d=c+1;indices.push(a,c,b,b,c,d);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);
    geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}
/** Clip the sea to the actual terrain/water intersection. Keeping a full ocean
 * plane under dry land creates distant depth competition at grazing angles.
 * Each shoreline bend comes from a real terrain triangle, including the coarse
 * outer grid; an analytic shoreline alone would leave gaps at those triangles.
 */
function makeCoastalWaterGeometry(ground:THREE.BufferGeometry,seaY:number,size:number) {
    const p=ground.getAttribute('position'),index=ground.index;
    if(!index)throw new Error('Coastal ground requires indexed triangles');
    const level=Math.fround(seaY),crossings:{x:number;z:number}[]=[];
    for(let i=0;i<index.count;i+=3){
        const corners=[index.getX(i),index.getX(i+1),index.getX(i+2)];
        for(let edge=0;edge<3;edge++){
            const a=corners[edge]!,b=corners[(edge+1)%3]!,ay=p.getY(a),by=p.getY(b);
            if((ay<=level)===(by<=level))continue;
            const t=(level-ay)/(by-ay);
            crossings.push({x:mix(p.getX(a),p.getX(b),t),z:mix(p.getZ(a),p.getZ(b),t)});
        }
    }
    crossings.sort((a,b)=>a.z-b.z||a.x-b.x);
    const shore:{x:number;z:number}[]=[];
    for(const point of crossings){
        const previous=shore[shore.length-1];
        if(previous&&Math.abs(point.z-previous.z)<1e-6)previous.x=Math.min(previous.x,point.x);
        else shore.push({...point});
    }
    if(shore.length<2)throw new Error('Coastal terrain does not intersect the water level');
    const half=size/2;
    if(shore[0]!.z>-half)shore.unshift({x:shore[0]!.x,z:-half});
    if(shore[shore.length-1]!.z<half)shore.push({x:shore[shore.length-1]!.x,z:half});
    const positions:number[]=[],uv:number[]=[],indices:number[]=[];
    for(const {x,z} of shore){
        // Water keeps its usual XY plane and -PI/2 rotation. Its reflection
        // plane, original shader, wave normals and full resolution are unchanged.
        positions.push(-half,-z,0,x,-z,0);
        uv.push(0,(z+half)/size,(x+half)/size,(z+half)/size);
    }
    for(let i=0;i<shore.length-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
    geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return geometry;
}
function makeTerrain(type: string, m: ModelMaterials, bank: TextureBank, _size = 380, coastal = false) {
    const g = new THREE.Group();
    const random = seeded(type === 'mars' ? 767 : 125);
    const tex = bank.own(canvasTexture(256, 256, c => {
        c.fillStyle = type === 'mars' ? '#855b3f' : type === 'moon' ? '#5b5d60' : type === 'dune' ? '#baa889' : '#737763';
        c.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 14000; i++) {
            const l = random() > .5 ? 220 : 25;
            c.fillStyle = `rgba(${l},${l},${l},${random() * .11})`;
            c.fillRect(random() * 256, random() * 256, 1 + random() * 3, 1 + random() * 2);
        }
    }));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(70, 70);
    const groundMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, color: type === 'moon' ? '#b1b2b3' : '#b9b6ad' });
    const land = meshOf(makeExtendedGround(type,coastal), groundMat);
    land.userData.observationNoCollision = true; // sampledGroundHeight represents this surface exactly.
    land.name=coastal?'连续海岸与远景陆地':'地表与远景地形';
    g.add(land);
    const rocks = (type === 'moon' || type === 'mars' || type === 'camp') ? 190 : 30;
    const rockGeo = new THREE.DodecahedronGeometry(1, 0), rockMat = m.std(type === 'mars' ? '#54483c' : type === 'moon' ? '#67686a' : '#3b3e3c', .05, .96);
    const inst = new THREE.InstancedMesh(rockGeo, rockMat, rocks);
    inst.castShadow = true;
    inst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rocks; i++) {
        let x = (random() - .5) * 150, z = (random() - .5) * 150;
        if (Math.abs(x) < 5 && Math.abs(z) < 12) {
            x += 15;
        }
        const s = .18 + random() * .8;
        if(coastal && x<coastlineX(z)+12) x=coastlineX(z)+18+random()*15;
        dummy.position.set(x, sampledGroundHeight(x,z,type,coastal) + s * .22, z);
        dummy.scale.set(s * 1.2, s * .7, s);
        dummy.rotation.set(random(), random() * 6, random());
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
    }
    g.add(inst);
    return g;
}
function addLights(scene: THREE.Scene, mars = false, night = false) {
    const sun = new THREE.DirectionalLight(mars ? '#ffd3ab' : '#fff2df', night ? .12 : 3.1);
    sun.position.copy(SUN_DIRECTION).multiplyScalar(90);
    sun.castShadow = !night;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -35;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -.00015;
    sun.shadow.normalBias = .025;
    scene.add(sun, new THREE.HemisphereLight(night ? '#416181' : mars ? '#ae7e57' : '#aec7dc', night ? '#161315' : '#3b3530', night ? .6 : .65));
    return sun;
}
function makeLaunchPad(m: ModelMaterials, bank: TextureBank, tower = true, siteDetails = true) {
    const g = new THREE.Group();
    g.name='发射台 · 开放式排焰槽';
    const concrete=m.std('#737a78',.04,.91),steel=m.std('#3e4c51',.64,.48),edge=m.std('#c99d36',.16,.62);
    const trench=new THREE.Group();trench.name='向正Z延伸的排焰通道';
    // U-shaped foundations leave x=(-2.6,2.6), z=(-2.8,26) open above the trough floor.
    // No apron, stair, support beam or road crosses the engine opening or the outlet.
    for(const side of [-1,1]){
        g.add(mBox(4.70,.91,14,concrete,[side*4.95,.455,0]),mBox(4.70,.12,14,steel,[side*4.95,1.14,0]));
        for(const z of [-6,-3,0,3,6]){
            g.add(mBox(4.70,.17,.16,m.metal,[side*4.95,.99,z]),mBox(.22,.92,.34,steel,[side*7.18,.52,z]));
        }
        // Narrow grating panels sit on the side decks, never over the central flame well.
        for(let z=-6.5;z<6.9;z+=.30)g.add(mBox(1.06,.028,.055,m.metal,[side*5.66,1.186,z]));
        for(const x of [side*5.12,side*6.20])g.add(mBox(.065,.035,13.6,m.metal,[x,1.182,0]));
        for(let z=-2.40;z<6.65;z+=.82)g.add(mBox(.13,.015,.49,edge,[side*2.87,1.208,z]));
        // Outer edge guardrail and a separate stair on each shoulder of the open outlet.
        for(let z=-6.75;z<=6.76;z+=2.25)g.add(rod([side*7.11,1.2,z],[side*7.11,2.00,z],.025,m.metal));
        g.add(rod([side*7.11,2.00,-6.75],[side*7.11,2.00,6.75],.025,m.metal),rod([side*7.11,1.62,-6.75],[side*7.11,1.62,6.75],.018,m.metal));
        for(let i=0;i<6;i++){
            const h=(i+1)*.20,z=9.23-i*.42;
            g.add(mBox(2.40,h,.46,concrete,[side*5.08,h*.5,z]),mBox(2.40,.018,.055,edge,[side*5.08,h+.011,z+.20]));
        }
        // Hold-down outriggers stay at the four corners, clear of the nozzle footprint.
        for(const z of [-1.85,1.85]){
            g.add(mBox(.82,.23,.40,steel,[side*2.22,1.025,z]),mBox(.36,.43,.42,m.metal,[side*1.87,.985,z]));
            g.add(rod([side*2.66,.55,z],[side*1.89,.92,z],.060,steel));
        }
    }
    g.add(mBox(14.6,.91,4.2,concrete,[0,.455,-4.9]),mBox(14.6,.12,4.2,steel,[0,1.14,-4.9]));
    g.add(mBox(14.1,.015,.14,edge,[0,1.208,-6.73]));
    // The low refractory floor catches the exhaust below the 1.2-unit launch deck.
    const floor=mBox(5.20,.08,28.8,m.dark,[0,.06,11.6]);floor.name='排焰槽底板';trench.add(floor);
    for(const side of [-1,1]){
        trench.add(mBox(.36,1.02,28.8,concrete,[side*2.79,.55,11.6]),mBox(.43,.11,28.8,steel,[side*2.79,1.075,11.6]));
        for(let z=-2.3;z<25.5;z+=2.4)trench.add(mBox(.50,.86,.22,concrete,[side*3.04,.47,z]));
    }
    // This material belongs only to this pad; the launch update may animate its emissive intensity.
    const trenchGlow=new THREE.MeshStandardMaterial({color:'#33261e',roughness:.88,metalness:.08,emissive:'#ff6817',emissiveIntensity:0});
    for(const side of [-1,1]){
        const lining=mBox(.026,.68,15.2,trenchGlow,[side*2.592,.47,4.8]);lining.name='排焰槽耐火内衬';trench.add(lining);
    }
    const hotFloor=mBox(5.14,.016,10.6,trenchGlow,[0,.109,2.55]);hotFloor.name='喷口下方耐火地坪';trench.add(hotFloor);
    g.userData.launchGlowMaterials=[trenchGlow];
    g.userData.flameTrenchBounds={halfWidth:2.6,startZ:-2.8,endZ:26,floorY:.117,deckY:1.2};
    g.add(trench);
    if (tower) {
        const t = new THREE.Group();
        t.name='发射脐带塔';
        t.position.set(5, 1.2, -1);
        for (const x of [-1.5, 1.5])
            for (const z of [-1.5, 1.5])
                t.add(rod([x, 0, z], [x, 27, z], .1, m.red));
        for (let y = 0; y < 27; y += 2.7) {
            t.add(mBox(3.4, .12, 3.4, m.metal, [0, y, 0]));
            for (const z of [-1.5, 1.5]) {
                t.add(rod([-1.5, y, z], [1.5, y + 2.7, z], .055, m.red), rod([1.5, y, z], [-1.5, y + 2.7, z], .055, m.red));
            }
            for (const x of [-1.5, 1.5])
                t.add(rod([x, y, -1.5], [x, y + 2.7, 1.5], .05, m.red));
            if (y > 7){
                t.add(mBox(3.5, .18, .7, m.metal, [-2.5, y, 0]));
                for(const z of [-.32,.32]){
                    t.add(rod([-4.15,y+.50,z],[-.86,y+.50,z],.019,m.metal));
                    for(const x of [-4.15,-2.50,-.86])t.add(rod([x,y+.08,z],[x,y+.50,z],.020,m.metal));
                }
            }
        }
        t.add(mBox(6, .3, 2, m.red, [-1.5, 27.2, 0]));
        // Cable riser, access ladder and lightning mast give the truss an engineering scale.
        t.add(mBox(.42,25.8,.25,steel,[1.20,12.9,-1.58]),rod([1.32,27.2,1.20],[1.32,32.5,1.20],.045,m.metal));
        for(const x of [.46,.85])t.add(rod([x,.10,1.64],[x,26.8,1.64],.026,m.metal));
        for(let y=.3;y<26.8;y+=.35)t.add(rod([.46,y,1.64],[.85,y,1.64],.022,m.metal));
        for(const side of [-1,1])t.add(rod([1.32,31.7,1.20],[side*1.5,27.25,-1.5],.012,m.metal));
        g.add(t);
    }
    if (siteDetails) {
    for (const [x, z] of [[-33, -20], [22, 35], [38, -28], [-29, 25]] as const) {
        const h = 2 + (Math.abs(x) % 4);
        g.add(mBox(7, h, 5, m.white, [x, h / 2, z]), mBox(7.3, .3, 5.3, m.metal, [x, h, z]));
        for (let j = 0; j < 4; j++)
            g.add(mBox(.65, .65, .02, m.glass, [x - 2 + j * 1.3, h * .6, z + 2.52]));
    }
    const roadMat = m.std('#424849', .03, .95);
    for (const x of [-20, 25]) {
        g.add(makeGroundRibbon(x,-57,x,73,5,roadMat,.045));
        for(let z=-50;z<68;z+=5)g.add(makeGroundRibbon(x,z,x,z+2,.14,m.white,.055));
        for(const side of [-1,1])g.add(makeGroundRibbon(x+side*2.55,-57,x+side*2.55,73,.12,m.metal,.063));
    }
    // The service road approaches both sides; it stops before the exhaust corridor.
    g.add(makeGroundRibbon(-20,8,-3.45,8,5,roadMat,.046),makeGroundRibbon(3.45,8,25,8,5,roadMat,.046));
    for (const x of [-11, 12]) {
        g.add(rod([x, 0, 9], [x, 12, 9], .09, m.metal));
        for (const a of [-.35, .35]) {
            const light = mBox(.5, .55, .18, m.white, [x + a, 12, 9]);
            g.add(light);
        }
    }
    const tank = mBall(2.7, m.white, [-15, 2.7, -12]);
    tank.scale.y = .9;
    g.add(tank);
    for(const x of [-16.4,-13.6])for(const z of [-13.4,-10.6])g.add(rod([x,.05,z],[x,1.36,z],.11,steel));
    const tankWalkway=torus(2.69,.06,m.metal,[-15,2.8,-12]);tankWalkway.rotation.x=Math.PI/2;g.add(tankWalkway);
    g.add(rod([-15,.45,-9.70],[-15,.45,-4.45],.105,m.metal),rod([-15,.45,-4.45],[-7.30,.45,-4.45],.105,m.metal));
    for(const x of [-12.8,-10.2,-7.7])g.add(mBox(.24,.35,.55,steel,[x,.20,-4.45]));
    for(const side of [-1,1]){
        g.add(rod([side*3.32,.32,-2.55],[side*3.32,.32,7.0],.10,m.metal));
        for(const z of [-1.5,1.5,4.5]){
            g.add(rod([side*3.32,.32,z],[side*3.32,1.12,z],.055,m.metal),rod([side*3.32,1.12,z],[side*2.92,1.12,z],.048,m.metal));
        }
    }
    }
    return g;
}
/** Historical pads share only the safe exhaust opening. Architecture, surroundings
 * and light are specific to each chapter; these are illustrative site layouts. */
function historicalLaunchTerrain(terrain: THREE.Group, kind: string, bank: TextureBank) {
    const palette: Record<string, string> = { goddard:'#aaa58d',v2:'#697663',vostok:'#9a8b6f',saturn:'#788b63',cz1:'#ae9674',cz2f:'#b4a082' };
    const groundColor = palette[kind];
    if (!groundColor) return;
    const ground = terrain.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    const random = seeded(461 + kind.charCodeAt(0)), desert = kind === 'cz1' || kind === 'cz2f';
    const texture = bank.own(canvasTexture(512,512,c=>{
        c.fillStyle=groundColor;c.fillRect(0,0,512,512);
        for(let i=0;i<16000;i++){
            const light=random()>.51;
            c.fillStyle=light?'rgba(231,218,184,.085)':'rgba(34,40,24,.075)';
            const x=random()*512,z=random()*512;
            c.fillRect(x,z,desert?1+random()*3:1,desert?1:1+random()*4);
        }
        for(let i=0;i<230;i++){
            const x=random()*512,z=random()*512,r=8+random()*31;
            const wash=c.createRadialGradient(x,z,0,x,z,r);
            wash.addColorStop(0,desert?'rgba(77,58,39,.07)':'rgba(41,57,26,.09)');wash.addColorStop(1,'rgba(50,50,30,0)');
            c.fillStyle=wash;c.fillRect(x-r,z-r,r*2,r*2);
        }
    }));
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(56,56);texture.anisotropy=4;
    const old=ground.material.map;if(old){old.dispose();bank.extra.delete(old);}
    ground.material.map=texture;ground.material.color.set('#ffffff');ground.material.vertexColors=true;
    const p=ground.geometry.attributes.position!,colors:number[]=[];
    for(let i=0;i<p.count;i++){
        const x=p.getX(i),z=p.getZ(i),patch=.91+.055*Math.sin(x*.061+z*.031)+.035*Math.sin(z*.127-x*.052);
        colors.push(patch,patch,patch*(desert?.98:1.015));
    }
    ground.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));ground.material.needsUpdate=true;
    terrain.name=`历史场地地貌 · ${kind}`;
}
function historicalLaunchLight(scene: THREE.Scene, sun: THREE.DirectionalLight, sky: Sky | null, kind: string) {
    const settings:Record<string,{direction:Vec3T;color:string;strength:number;haze:string;turbidity:number;cloud:number}>={
        goddard:{direction:[-.48,.62,.58],color:'#fff1da',strength:2.4,haze:'#a3b6bd',turbidity:2.2,cloud:.29},
        v2:{direction:[-.55,.42,-.55],color:'#d5e3ee',strength:1.55,haze:'#96a4ab',turbidity:3.8,cloud:.48},
        vostok:{direction:[-.82,.30,.44],color:'#ffce91',strength:2.65,haze:'#b8b5a5',turbidity:2.6,cloud:.15},
        saturn:{direction:[-.46,.71,.53],color:'#fff0d1',strength:3.1,haze:'#a8c0cf',turbidity:1.6,cloud:.21},
        cz1:{direction:[-.89,.12,.38],color:'#ffb478',strength:1.5,haze:'#948e9b',turbidity:3.0,cloud:.19},
        cz2f:{direction:[.77,.46,-.43],color:'#ffe5b5',strength:2.85,haze:'#b5bfc7',turbidity:1.9,cloud:.08},
    };
    const s=settings[kind];if(!s)return;
    const direction=new THREE.Vector3(...s.direction).normalize();sun.position.copy(direction).multiplyScalar(90);
    sun.color.set(s.color);sun.intensity=s.strength;
    scene.fog=new THREE.Fog(s.haze,kind==='v2'?200:520,kind==='v2'?4600:7600);
    scene.traverse(o=>{if(o instanceof THREE.HemisphereLight){o.color.set(kind==='cz1'?'#8e9cb5':'#b5c8d6');o.intensity=kind==='cz1'?.72:kind==='v2'?1.12:.68;if(kind==='v2')o.groundColor.set('#606a58');}});
    if(sky){const u=sky.material.uniforms;u.sunPosition!.value.copy(direction).multiplyScalar(450000);u.turbidity!.value=s.turbidity;
        u.rayleigh!.value=kind==='cz1'?2.1:2.7;if(u.cloudCoverage)u.cloudCoverage.value=s.cloud;
        if(u.cloudDensity)u.cloudDensity.value=kind==='v2'?.48:.27;
        u.sceneSkyRadiance!.value=DAY_SKY_RADIANCE*(kind==='cz1'?.77:kind==='v2'?.87:1);
    }
}
function historicalLaunchBuilding(g: THREE.Group, m: ModelMaterials, x:number,z:number,w:number,h:number,d:number,material:THREE.Material) {
    const ground=Math.max(.025,...[-1,1].flatMap(a=>[-1,1].map(b=>sampledGround(x+a*w/2,z+b*d/2))));
    const base=mBox(w+.4,ground+.20,d+.4,m.std('#686b65',.04,.94),[x,(ground-.20)/2,z]);g.add(base);
    g.add(mBox(w,h,d,material,[x,ground+h/2,z]),mBox(w+.22,.16,d+.22,m.metal,[x,ground+h,z]));
    for(let i=0;i<Math.floor(w/2);i++)g.add(mBox(.72,.52,.035,m.glass,[x-w/2+1+i*2,ground+h*.65,z+d/2+.021]));
    return ground;
}
function historicalLaunchTruss(m:ModelMaterials,height:number,width:number,material:THREE.Material) {
    const g=new THREE.Group(),half=width/2,levels=Math.ceil(height/2.6),step=height/levels;
    for(const x of [-half,half])for(const z of [-half,half])g.add(rod([x,0,z],[x,height,z],.075,material));
    for(let i=0;i<=levels;i++){
        const y=i*step;g.add(mBox(width+.12,.09,width+.12,m.metal,[0,y,0]));
        if(i===levels)continue;
        for(const side of [-1,1]){
            g.add(rod([-half,y,side*half],[half,y+step,side*half],.042,material),rod([half,y,side*half],[-half,y+step,side*half],.042,material));
            g.add(rod([side*half,y,-half],[side*half,y+step,half],.042,material));
        }
    }
    for(const x of [-.22,.22])g.add(rod([x,.2,half+.10],[x,height,half+.10],.022,m.metal));
    for(let y=.3;y<height;y+=.35)g.add(rod([-.22,y,half+.10],[.22,y,half+.10],.019,m.metal));
    return g;
}
function historicalLaunchFarm(m: ModelMaterials) {
    const g=new THREE.Group();g.name='奥本农场 · 木棚与早春牧场';
    const barn=new THREE.Group();barn.position.set(-13,sampledGround(-13,-21),-21);
    const timber=m.std('#665349',.01,.95),roof=m.std('#555552',.1,.88);
    barn.add(mBox(7,3.4,7,timber,[0,1.7,0]));
    for(const side of [-1,1]){const panel=mBox(4.05,.14,7.5,roof,[side*1.75,4.30,0]);panel.rotation.z=-side*.52;barn.add(panel);}
    barn.add(mBox(2.6,2.65,.10,m.wood,[0,1.35,3.56]));
    for(let x=-3.3;x<3.4;x+=.35)barn.add(mBox(.035,3.3,.025,m.metal,[x,1.68,3.54]));
    g.add(barn);
    for(let x=-29;x<=26;x+=3){const y=sampledGround(x,-12);g.add(rod([x,y,-12],[x,y+1.1,-12],.055,m.wood));
        if(x<25)for(const h of [.43,.89])g.add(rod([x,y+h,-12],[x+3,sampledGround(x+3,-12)+h,-12],.031,m.wood));}
    const random=seeded(1926);
    for(let i=0;i<16;i++){
        const x=-38+i*5.8,z=-35-random()*22,y=sampledGround(x,z),h=4+random()*4;
        g.add(rod([x,y,z],[x,y+h,z],.09,m.wood));
        for(let j=0;j<4;j++){const a=j*2.4+i;g.add(rod([x,y+h*.53,z],[x+Math.cos(a)*h*.31,y+h*(.77+j*.05),z+Math.sin(a)*h*.31],.032,m.wood));}
    }
    // Nell's lower feed frame rests on two shoes attached to the timber guide.
    for(const side of [-1,1]){
        g.add(mBox(.95,.11,.21,m.wood,[side*.48,.145,0]),mBox(.15,.11,.25,m.metal,[side*.37,.165,0]));
        g.add(mBox(.35,.10,.35,m.wood,[side*.8,.05,-.6]),rod([side*.8,.13,-.6],[side*.8,.13,1.7],.055,m.wood));
    }
    g.add(rod([-.8,4.28,-.6],[.8,4.28,-.6],.048,m.wood));
    return g;
}
function historicalLaunchSupports(g:THREE.Group,kind:string,m:ModelMaterials) {
    const steel=m.std(kind==='vostok'?'#646e5a':'#596260',.58,.56),movable:THREE.Group[]=[];
    if(kind==='vostok'){
        // R-7 is held by four opening support trusses at the booster shoulders.
        // Offset foundations stand on the side decks, leaving the +Z trench free.
        const shoulders:Vec3T[]=[[1.13,10.20,0],[-1.13,10.20,0],[0,10.20,1.13],[0,10.20,-1.13]];
        shoulders.forEach((p,i)=>{
            const side=i%2? -1:1,pivot:Vec3T=[side*3.7,1.2,i<2?-1.8:i===2?3.3:-3.3];
            const arm=new THREE.Group();arm.name='R-7 载荷支承臂';arm.position.set(...pivot);arm.userData.side=side;arm.userData.openAngle=.30;
            const end:Vec3T=[p[0]-pivot[0],p[1]-pivot[1],p[2]-pivot[2]];
            for(const dz of [-.19,.19])arm.add(rod([0,0,dz],[end[0],end[1],end[2]+dz],.12,steel));
            arm.add(rod([side*.75,0,0],end,.10,steel),mBox(.31,.28,.42,m.metal,end));
            for(let j=1;j<5;j++){const t=j/5;arm.add(rod([end[0]*t,end[1]*t,end[2]*t-.19],[end[0]*t+side*.4*(1-t),end[1]*t,end[2]*t+.19],.048,steel));}
            g.add(mBox(1.2,.40,1.1,steel,[pivot[0],1.40,pivot[2]]),arm);movable.push(arm);
        });
    } else if(kind!=='v2') {
        // Shoe heights match the model skirt bottoms; bells remain inside the opening.
        const radius=kind==='saturn'?22*10.06/110.6/2:kind==='cz1'?15*2.25/29.46/2:21*3.35/58.34/2;
        const contactY=kind==='saturn'?1.90:kind==='cz1'?1.45:1.70;
        for(let i=0;i<4;i++){
            const a=i*Math.PI/2+(kind==='saturn'?0:Math.PI/4),contactRadius=radius*(kind==='cz1'?1.05:1);
            const x=Math.cos(a)*(contactRadius+.135),z=Math.sin(a)*(contactRadius+.135);
            const side=x<-.01?-1:1,anchorX=side*3.0,anchorZ=z===0?-.34:z;
            g.add(rod([anchorX,1.03,anchorZ],[x,contactY-.16,z],.13,steel));
            const shoe=mBox(.30,.18,.18,m.metal,[x,contactY-.09,z]);shoe.rotation.y=-a;shoe.name='箭体裙段承力鞋';g.add(shoe);
            g.add(rod([anchorX,.60,anchorZ],[x*1.3,contactY-.18,z*1.3],.075,steel));
        }
        if(kind==='cz2f')for(let i=0;i<4;i++){
            const a=i*Math.PI/2,r=radius+2*radius*2.25/3.35+.09,x=Math.cos(a)*r,z=Math.sin(a)*r;
            // Auxiliary supports bear on booster skirts, outside each engine throat.
            const shoe=mBox(.22,.22,.18,steel,[x,1.49,z]);shoe.rotation.y=-a;shoe.name='助推器承力座';g.add(shoe);
            g.add(rod([x<0?-2.85:2.85,1.0,z],[x,1.42,z],.095,steel));
        }
    }
    g.userData.historicalSupportArms=movable;
}
function historicalLaunchSite(kind:string,m:ModelMaterials,bank:TextureBank) {
    if(!['v2','vostok','saturn','cz1','cz2f'].includes(kind))return makeLaunchPad(m,bank);
    const g=kind==='v2'?new THREE.Group():makeLaunchPad(m,bank,kind==='saturn',false);
    const steel=m.std('#545e5a',.53,.58),concrete=m.std('#96998e',.02,.93),olive=m.std('#5b6651',.28,.70);
    const road=m.std(kind==='v2'?'#797d6b':kind==='saturn'?'#a2a393':'#8f8270',.02,.96);
    if(kind==='v2'){
        g.name='佩内明德 · 林地试验场与发射桌';
        const ring=meshOf(new THREE.RingGeometry(1.40,1.98,48),steel,[0,1.18,0]);ring.rotation.x=-Math.PI/2;g.add(ring);
        const rim=meshOf(new THREE.CylinderGeometry(1.98,1.98,.18,48,1,true),steel,[0,1.09,0]);g.add(rim);
        for(let i=0;i<4;i++){
            const a=i*Math.PI/2,x=Math.cos(a)*1.72,z=Math.sin(a)*1.72;
            g.add(mBox(.34,1.08,.34,steel,[x,.54,z]),mBox(.46,.08,.46,m.metal,[x,1.19,z]));
            const foot=mBox(.72,.12,.72,concrete,[x,.06,z]);foot.name='V-2 发射桌支脚';g.add(foot);
        }
        const lining=new THREE.MeshStandardMaterial({color:'#40372c',roughness:.92,emissive:'#ff6817',emissiveIntensity:0});
        g.add(mBox(3.0,.07,13,lining,[0,.065,5.0]));g.userData.launchGlowMaterials=[lining];
        g.userData.flameTrenchBounds={halfWidth:1.5,startZ:-1.5,endZ:11.5,floorY:.10,deckY:1.2};
        const rack=historicalLaunchTruss(m,11.8,.8,olive);rack.name='小型检修导架';rack.position.set(-3.7,0,-1.8);g.add(rack);
        for(const y of [3.1,7.3,10.8])g.add(mBox(2.2,.11,.65,steel,[-2.2,y,-1.8]));
        const bunker=new THREE.Group();bunker.name='V-2 控制掩体 · 前场与入口';
        const bunkerFloor=historicalLaunchBuilding(bunker,m,13,-19,7,2.15,5,concrete);
        bunker.children[0]!.name='V-2 掩体地基';bunker.children[1]!.name='V-2 掩体墙体';
        bunker.children[2]!.name='V-2 掩体完整屋顶';
        bunker.children.slice(3).forEach((window,i)=>window.name=`V-2 掩体正面观察窗 ${i+1}`);
        // Leave a clear strip behind the entire building, including its eaves.
        // A low terrain mound tapers into the ground instead of cutting through
        // the roof as a scaled hemisphere did when viewed from above.
        const bermGeometry=new THREE.PlaneGeometry(12.8,7.2,32,20);
        bermGeometry.rotateX(-Math.PI/2);
        const bermPositions=bermGeometry.getAttribute('position');
        for(let i=0;i<bermPositions.count;i++){
            const dx=bermPositions.getX(i),dz=bermPositions.getZ(i),x=13+dx,z=-27+dz;
            const falloff=Math.max(0,1-(dx/6.4)**2-(dz/3.6)**2);
            const rise=1.1*falloff*falloff*(1+.06*Math.sin(dx*.8)*Math.sin(dz*.6));
            bermPositions.setXYZ(i,x,sampledGround(x,z)+rise-.035,z);
        }
        bermGeometry.computeVertexNormals();
        const berm=meshOf(bermGeometry,m.std('#697663',0,1));berm.name='V-2 掩体后侧覆土';bunker.add(berm);
        const door=mBox(.92,1.72,.075,olive,[15.65,bunkerFloor+.94,-16.447]);door.name='V-2 掩体入口门';bunker.add(door);
        for(const x of [15.13,16.17])bunker.add(mBox(.12,1.95,.15,concrete,[x,bunkerFloor+.975,-16.43]));
        bunker.add(mBox(1.16,.13,.15,concrete,[15.65,bunkerFloor+1.95,-16.43]),mBox(.055,.16,.06,m.metal,[15.96,bunkerFloor+.94,-16.385]));
        const threshold=mBox(1.32,.12,.8,concrete,[15.65,bunkerFloor+.02,-16.22]);threshold.name='V-2 掩体入口门槛';bunker.add(threshold);
        const apron=makeGroundRibbon(9.2,-15.6,16.8,-15.6,1.5,road,.026);apron.name='V-2 掩体正面通道';bunker.add(apron);
        g.add(bunker);
        g.add(makeGroundRibbon(-11,-52,-5,-8,3.6,road,.055));
        // Layered boughs have drooping, irregular needle sprays, not cone silhouettes.
        // A shared branch geometry keeps the entire distant forest to three draws.
        const treeCount=48,tiers=7,segments=36,random=seeded(1944),dummy=new THREE.Object3D();
        const positions:number[]=[],colors:number[]=[],indices:number[]=[];
        const rings=[[.025,.62],[.27,.35],[.73,.05],[1,-.15],[.52,-.25],[.025,-.15]] as const;
        rings.forEach(([radius,height],ring)=>{
            for(let j=0;j<segments;j++){
                const angle=j/segments*Math.PI*2;
                // Nine distinct bough tips, each split into shorter lateral sprays.
                const branch=j%4===0?1:j%4===2?.73:.88;
                const asymmetry=.90+.085*Math.sin(angle*3.0+.8)+.055*Math.cos(angle*7.0);
                const r=radius*branch*asymmetry,y=height+(ring>1?.045*Math.sin(angle*9+.4):0);
                positions.push(Math.cos(angle)*r,y,Math.sin(angle)*r);
                const lit=ring<3?.90+.10*Math.sin(angle*3+.7):.64;
                colors.push(lit,lit,lit*.96);
                if(ring<rings.length-1){const a=ring*segments+j,b=ring*segments+(j+1)%segments,c=a+segments,d=b+segments;indices.push(a,b,c,b,d,c);}
            }
        });
        const crownGeometry=new THREE.BufferGeometry();crownGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
        crownGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));crownGeometry.setIndex(indices);crownGeometry.computeVertexNormals();
        const crowns=new THREE.InstancedMesh(crownGeometry,new THREE.MeshStandardMaterial({color:'#839577',roughness:.97,vertexColors:true}),treeCount*tiers);
        const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.006,.016,1,7),m.std('#756655',0,.98),treeCount);
        const branches=new THREE.InstancedMesh(new THREE.CylinderGeometry(.011,.023,1,5),m.std('#686554',0,.99),treeCount*4);
        crowns.name='远景松林 · 不规则分层针叶';trunks.name='远景松林 · 可见树干';branches.name='远景松林 · 外伸枝条';
        crowns.castShadow=trunks.castShadow=true;crowns.receiveShadow=trunks.receiveShadow=true;
        const branchDirection=new THREE.Vector3(),branchStart=new THREE.Vector3(),branchEnd=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
        for(let i=0;i<treeCount;i++){
            const x=-75+random()*150,z=-58-random()*65-(Math.abs(x)<15?23:0),h=4.8+random()*4.7,y=sampledGround(x,z),twist=random()*Math.PI*2;
            dummy.position.set(x,y+h*.49,z);dummy.rotation.set(0,twist,0);dummy.scale.setScalar(h);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
            const tint=new THREE.Color().setRGB(.78+random()*.24,.83+random()*.20,.76+random()*.20);
            for(let j=0;j<tiers;j++){
                const radius=h*.21*(1-j/8.2)*( .89+random()*.17);
                dummy.position.set(x+(random()-.5)*.12,y+h*(.29+j*.096),z+(random()-.5)*.12);
                dummy.rotation.set((random()-.5)*.10,twist+j*1.65,(random()-.5)*.08);
                dummy.scale.set(radius,h*(.15-j*.004),radius*(.87+random()*.20));dummy.updateMatrix();crowns.setMatrixAt(i*tiers+j,dummy.matrix);crowns.setColorAt(i*tiers+j,tint);
            }
            for(let j=0;j<4;j++){
                const a=twist+j*2.4,level=.29+j*.115,length=h*(.14-j*.018);
                branchStart.set(x,y+h*level,z);branchEnd.set(x+Math.cos(a)*length,y+h*(level-.035),z+Math.sin(a)*length);
                branchDirection.subVectors(branchEnd,branchStart);dummy.position.copy(branchStart).add(branchEnd).multiplyScalar(.5);
                dummy.quaternion.setFromUnitVectors(up,branchDirection.clone().normalize());dummy.scale.set(1,branchDirection.length(),1);dummy.updateMatrix();branches.setMatrixAt(i*4+j,dummy.matrix);
            }
        }
        g.add(trunks,branches,crowns);
    } else if(kind==='vostok'){
        g.name='拜科努尔 · 草原铁路与双侧服务架';const gantries:THREE.Group[]=[];
        for(const side of [-1,1]){
            const tower=historicalLaunchTruss(m,15.2,1.7,olive);tower.name='可外张苏式服务架';tower.position.set(side*4.6,1.2,-3.6);tower.userData.side=side;tower.userData.openAngle=.35;
            for(const y of [4.2,8.4,12.8])tower.add(mBox(3.1,.14,.86,steel,[-side*2.0,y,0]));g.add(tower);gantries.push(tower);
        }
        g.userData.historicalServiceArms=gantries;
        for(const x of [-.75,.75])g.add(makeGroundRibbon(x,-100,x,-8,.12,steel,.15));
        for(let z=-98;z<-8;z+=1.3)g.add(makeGroundRibbon(-1.25,z,1.25,z,.20,m.wood,.07));
        g.add(makeGroundRibbon(-14,-110,-14,15,3.8,road,.045));
        historicalLaunchBuilding(g,m,-22,-23,10,2.7,5,concrete);historicalLaunchBuilding(g,m,28,-42,16,3.1,7,concrete);
        for(const x of [-20,-16]){const tank=mCyl(.9,.9,5.5,m.metal,[x,1.05,-13]);tank.rotation.z=Math.PI/2;g.add(tank);}
    } else if(kind==='saturn'){
        g.name='肯尼迪 · 海滨红色脐带塔与履带通道';
        const tower=g.getObjectByName('发射脐带塔')!;tower.position.set(-5.2,1.2,-2.2);tower.rotation.y=Math.PI;tower.scale.y=.85;
        for(const x of [-3.6,3.6])g.add(makeGroundRibbon(x,-170,x,-8,5.1,road,.06,true));
        const white=m.std('#d0d3ca',.03,.83);historicalLaunchBuilding(g,m,35,-118,27,25,20,white);
        for(let j=0;j<6;j++)g.add(mBox(2.25,21,.065,m.std('#7c8c93',.15,.67),[25+j*4,14,-107.94]));
        historicalLaunchBuilding(g,m,35,-43,16,3.3,8,white);
        for(const x of [-21,-29]){g.add(mBall(3.0,white,[x,3.35,-24]));for(const dx of [-1.4,1.4])g.add(rod([x+dx,.1,-24],[x+dx,2,-24],.14,steel));}
        g.add(makeGroundRibbon(-23,-73,-23,3,4.0,road,.048,true));
        for(const x of [-19,-14])g.add(rod([x,.4,-24],[x,.4,-5],.14,m.metal));
    } else if(kind==='cz1'){
        g.name='酒泉旧发射区 · 戈壁与简朴钢架';
        const tower=historicalLaunchTruss(m,17.1,1.8,olive);tower.name='早期开放式服务塔';tower.position.set(-4.6,1.2,-2.7);
        for(const y of [4.1,8.2,12.9])tower.add(mBox(3.1,.13,.85,steel,[2.05,y,0]));g.add(tower);
        historicalLaunchBuilding(g,m,-22,-18,8,2.8,5,concrete);historicalLaunchBuilding(g,m,24,-32,12,2.4,6,concrete);
        g.add(makeGroundRibbon(-16,-83,-16,12,3.3,road,.06));
        for(const z of [-41,-24,-9]){g.add(rod([19,0,z],[19,5.0,z],.08,steel),mBox(2.3,.10,.13,steel,[19,4.75,z]));}
        const warm=new THREE.MeshStandardMaterial({color:'#ebc08b',emissive:'#ffaa54',emissiveIntensity:1.0});
        for(const y of [4.2,8.3,13])g.add(mBox(.24,.12,.18,warm,[-3.8,y+1.2,-1.6]));
    } else {
        g.name='酒泉载人航天发射场 · 白蓝服务塔与避雷杆';
        const white=m.std('#c8cec9',.12,.70),blue=m.std('#557788',.3,.59),tower=historicalLaunchTruss(m,24.2,3.2,white);
        tower.name='载人航天半包覆服务塔';tower.position.set(-5.0,1.2,-3.0);
        for(let y=1.4;y<23.5;y+=2.8){tower.add(mBox(3.3,1.9,.15,white,[0,y,-1.65]),mBox(.15,1.9,3.3,white,[-1.65,y,0]),mBox(3.4,.25,3.4,blue,[0,y+1.1,0]));
            if(y>5)tower.add(mBox(3.4,.18,1.15,white,[2.6,y,0]));}
        tower.add(mBox(3.8,.32,3.8,blue,[0,24.4,0]));g.add(tower);
        for(const x of [-15,15])for(const z of [-14,13]){
            g.add(mCyl(.045,.16,29,white,[x,14.5,z]),mCyl(.018,.035,3,steel,[x,30.5,z]));
            for(const side of [-1,1])g.add(rod([x,24,z],[x+side*4,.08,z-3],.015,steel));
        }
        historicalLaunchBuilding(g,m,26,-48,19,8,12,white);g.add(mBox(18.7,1.1,.06,blue,[26,6.7,-41.94]));
        g.add(makeGroundRibbon(22,-98,22,35,5,m.std('#5d6260',.03,.92),.055));
        for(let z=-88;z<33;z+=7)g.add(makeGroundRibbon(22,z,22,z+3,.14,m.white,.071));
        for(const x of [-.7,.7])g.add(makeGroundRibbon(x,-87,x,-8,.12,steel,.13));
    }
    historicalLaunchSupports(g,kind,m);return g;
}
export function createWorld(key: string, bank: TextureBank, m: ModelMaterials, env: THREE.Texture, quality: 'balanced' | 'high'): WorldPack {
    if (key === 'finale') return createCosmicFinale(createWorld('campEnd', bank, m, env, quality), bank, quality);
    const [type = '', kind = ''] = key.split(':'), scene = new THREE.Scene();
    scene.name = key;
    scene.background = new THREE.Color('#03070e');
    scene.environment = env;
    scene.environmentIntensity = .45;
    const focus = new THREE.Vector3(), follow = new THREE.Vector3(), updates: ((f: WorldFrame) => void)[] = [];
    const ground = ['camp', 'campEnd', 'dune', 'field', 'pad', 'coast', 'lunar', 'mars', 'return', 'recovery'].includes(type);
    const sun = addLights(scene, type === 'mars', type === 'camp' || type === 'campEnd');
    if (!ground || type === 'lunar' || type === 'camp' || type === 'campEnd')
        scene.add(makeStarfield(bank, type === 'camp' || type === 'campEnd'));
    let craft: CraftModel | null = null, planet: THREE.Group | null = null, sky: Sky | null = null, water: Water | null = null;
    // Only the displayed subject contributes to framing. Terrain, sky, labels
    // and exhaust have unrelated scales and must never enlarge these bounds.
    const observationExtras: THREE.Object3D[] = [];
    const observationPlanets: { object: THREE.Object3D; radius: number }[] = [];
    if (ground) {
        const terrainType = type === 'mars' ? 'mars' : type === 'lunar' ? 'moon' : type === 'dune' ? 'dune' : type === 'camp' || type === 'campEnd' ? 'camp' : 'earth';
        const terrain = makeTerrain(terrainType, m, bank, 380, type==='coast');
        scene.add(terrain);
        if(type==='field'||type==='pad'||type==='coast')historicalLaunchTerrain(terrain,kind,bank);
        if (type === 'coast') {
            // The sea meets the actual shoreline and has no triangles under dry
            // land, so distant grass cannot fight a nearly coplanar water plane.
            const groundGeometry=(terrain.children[0] as THREE.Mesh).geometry;
            water = new Water(makeCoastalWaterGeometry(groundGeometry,SURFACE.seaY-.3,SURFACE.waterSize), {
                textureWidth: quality === 'high' ? 512 : 256, textureHeight: quality === 'high' ? 512 : 256,
                waterNormals: bank.get('waterNormals'), sunDirection: SUN_DIRECTION.clone(),
                sunColor: 0xeaf6ff, waterColor: 0x6e94ae, distortionScale: .42, alpha: .86, fog: true, clipBias:.001
            });
            water.rotation.x=-Math.PI/2;water.position.set(0,SURFACE.seaY-.3,0);
            water.name='连续海面 · 地形下方覆盖至远处';scene.add(water);
        }
        if (['dune', 'field', 'pad', 'coast', 'return', 'recovery'].includes(type)) {
            sky = new Sky();sky.scale.setScalar(3000);sky.frustumCulled=false;sky.renderOrder=-900;
            const u=sky.material.uniforms;
            u.turbidity!.value=1.15;u.rayleigh!.value=3.05;u.mieCoefficient!.value=.0024;u.mieDirectionalG!.value=.71;
            u.sunPosition!.value.copy(SUN_DIRECTION).multiplyScalar(450000);
            // Sky r184 contains background cloud uniforms. Near clouds are handled by AscentCloudPass.
            if(u.cloudCoverage)u.cloudCoverage.value=.16;
            if(u.cloudDensity)u.cloudDensity.value=.24;
            if(u.cloudElevation)u.cloudElevation.value=.32;
            configureSkyRadiance(sky.material,DAY_SKY_RADIANCE);
            sky.material.depthWrite=false;sky.material.needsUpdate=true;
            const dome=sky,eye=new THREE.Vector3();
            dome.onBeforeRender=(_r,_s,camera)=>{camera.getWorldPosition(eye);dome.position.copy(eye);dome.updateMatrixWorld();};
            scene.add(sky);
            // Only the very distant horizon fades; this is not a white full-screen fog overlay.
            scene.fog=new THREE.Fog('#97b4ca',520,7600);
            if (type === 'coast') {
                const hazeMat = new THREE.MeshBasicMaterial({ color: '#afc4d5', transparent: true, opacity: .16, depthWrite: false, side: THREE.BackSide });
                const haze = meshOf(new THREE.CylinderGeometry(6200, 6200, 110, 48, 1, true), hazeMat, [0, 28, 0]);
                haze.name = '海平线薄雾带';
                scene.add(haze);
            }
        }
        if(type==='field'||type==='pad'||type==='coast')historicalLaunchLight(scene,sun,sky,kind);
        if (type === 'mars')
            scene.fog = new THREE.FogExp2('#7b5238', .0045), scene.background = new THREE.Color('#7b5238');
        if (type === 'camp' || type === 'campEnd') {
            const human = makeHuman(m,false,0);
            human.root.position.set(-1.9,0,-2.3);human.root.rotation.y=.67;
            scene.add(human.root);
            const companionA = makeHuman(m,false,1);
            companionA.root.scale.setScalar(.92);
            companionA.root.position.set(2.3,0,-2.7);
            companionA.root.rotation.y = -1.05;
            scene.add(companionA.root);
            const companionB = makeHuman(m,false,2);
            companionB.root.scale.setScalar(.84);
            companionB.root.position.set(-3,0,1.6);
            companionB.root.rotation.y = 2.06;
            scene.add(companionB.root);
            observationExtras.push(human.root, companionA.root, companionB.root);
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI * 2 / 8;
                scene.add(rod([Math.cos(a) * .95, .08, Math.sin(a) * .95], [-Math.cos(a) * .75, .34, -Math.sin(a) * .75], .12, m.wood));
            }
            const coalMat=new THREE.MeshStandardMaterial({color:'#24160c',roughness:.99,emissive:'#dc3e03',emissiveIntensity:.65});
            for(let i=0;i<23;i++){const a=i*2.399;const coal=mBall(.10+(i%4)*.023,coalMat,[Math.cos(a)*(.18+i*.018),.10,Math.sin(a)*(.18+i*.018)]);coal.scale.y=.5;scene.add(coal);}
            const fire=makeFlame('camp');fire.position.y=.15;fire.scale.set(.87,.55,.87);scene.add(fire);
            const ember=makeSmoke(quality==='high'?56:36,true);ember.position.y=.4;scene.add(ember);
            const glow = new THREE.PointLight('#ff9c43', 18, 23, 2);
            glow.position.set(0, 1.25, 0);
            scene.add(glow);
            const moon = makePlanet(bank, 'moon', 1.8);
            moon.position.set(-7, 25, -42);
            scene.add(moon);
            observationPlanets.push({ object: moon, radius: 1.8 });
            const label = textSprite('从仰望，到出发', bank, '#c2ced7', 10);
            label.position.set(0, 12, -25);
            label.visible = false;
            scene.add(label);
            if (type === 'campEnd') {
                const telescope = new THREE.Group();
                telescope.position.set(2, 0, -3);
                for (let i = 0; i < 3; i++) {
                    const a = i * Math.PI * 2 / 3;
                    telescope.add(rod([0, 1.3, 0], [Math.cos(a) * .7, 0, Math.sin(a) * .7], .035, m.metal));
                }
                const tube = mCyl(.16, .19, 1.1, m.white, [0, 1.65, 0]);
                tube.rotation.x = .8;
                telescope.add(tube);
                scene.add(telescope);
                observationExtras.push(telescope);
            }
            updates.push(f=>{
              fire.material.uniforms.time!.value=f.global;
              fire.material.uniforms.power!.value=.93+.08*Math.sin(f.global*2.1);
              ember.material.uniforms.time!.value=f.global;ember.material.uniforms.power!.value=1;
              glow.intensity=18+Math.sin(f.global*8.3)*1.5+Math.sin(f.global*13.7)*.75;
              human.parts.head!.rotation.x=-.14-span(f.local,7,19)*.52;
              human.parts.arms!.rotation.z=-.12-span(f.local,8,18)*.28;
              companionA.parts.head!.rotation.x=-.2-span(f.local,10,20)*.26;
              companionA.parts.arms!.rotation.z=.06;
              companionB.parts.head!.rotation.x=-.1-span(f.local,12,23)*.32;
            });
        }
        if (type === 'dune') {
            craft = makeFlyer(m);
            // Pusher layout: the canard at local -Z leads; rear propellers at +Z trail.
            craft.root.rotation.y = Math.PI;
            scene.add(craft.root);
            updates.push(f => { const fly = span(f.local, 10, 28); const z = -35 + 45 * fly; const y = Math.sin(fly * Math.PI) * 1.5; craft!.root.position.set(0, y, z); craft!.parts.props!.children.forEach((p, i) => p.rotation.z = f.local < 9 ? 0 : (f.local - 9) * 35 * (i ? -1 : 1)); follow.set(0, y * .5, z); focus.copy(craft!.root.position); });
        }
        if (type === 'field') {
            craft = makeGoddard(m);
            scene.add(craft.root);
            scene.add(historicalLaunchFarm(m));
            for (const x of [-.8, .8]) {
                scene.add(rod([x, 0, -.6], [x, 4.5, -.6], .055, m.wood), rod([x, 4.5, -.6], [x, 0, 1.7], .04, m.wood));
            }
            updates.push(f => { const y = 7 * Math.sin(Math.PI * span(f.local, 13, 24)); craft!.parts.rocket!.position.y = y; (craft!.parts.flame as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>).material.uniforms.time!.value = f.global; craft!.parts.flame!.visible = f.local >= 13 && f.local < 23; follow.y = y * .65; });
        }
        if (type === 'pad' || type === 'coast') {
            const launchPad = historicalLaunchSite(kind,m,bank);
            scene.add(launchPad);
            craft = makeRocket(kind, m);
            craft.root.position.y = 1.2;
            scene.add(craft.root);
            const smoke=makeSmoke(quality==='high'?150:96,false,{emissionDuration:10});
            const trail=makeSmoke(quality==='high'?88:54,false,{trail:true,launchKind:kind,emissionDuration:kind==='generic'?26:17});
            smoke.position.y=.5;trail.position.y=1.2;scene.add(smoke,trail);
            // Exhaust first turns along the +Z flame trench, then separates from the rising rocket.
            const deflected = makeFlame();
            // Keep the back face of the volume above the trench floor for depth testing.
            deflected.position.set(0,.94,.5);
            deflected.rotation.x=-Math.PI/2;
            deflected.scale.set(1.5,1.3,.7);
            scene.add(deflected);
            const engineLight=new THREE.PointLight('#ffb36b',0,26,2);
            engineLight.position.set(0,.15,0);craft.root.add(engineLight);
            const trenchLight=new THREE.PointLight('#ff993f',0,20,2);
            trenchLight.position.set(0,.75,3.4);scene.add(trenchLight);
            updates.push(f => {
                const launch=launchState(kind,f.local,kind!=='generic'||!!f.state.taskArmed);
                craft!.root.position.set(launch.x,launch.height+1.2,0);
                craft!.root.rotation.z=-launch.turn;
                follow.set(launch.followX,launch.followY,0);
                focus.set(launch.x,launch.height+10,0);
                craft!.parts.flame!.visible=launch.lit;
                craft!.parts.flame!.traverse(o => {
                    if (o instanceof THREE.Mesh && o.material instanceof THREE.ShaderMaterial) {
                        o.material.uniforms.time!.value=launch.elapsed;
                        o.material.uniforms.power!.value=launch.power;
                    }
                });
                smoke.visible=trail.visible=launch.lit;
                smoke.material.uniforms.time!.value=launch.elapsed;smoke.material.uniforms.power!.value=launch.power;
                trail.material.uniforms.time!.value=launch.elapsed;trail.material.uniforms.power!.value=launch.power*.78;
                deflected.visible=launch.padPower>.001;
                deflected.material.uniforms.time!.value=launch.elapsed;
                deflected.material.uniforms.power!.value=launch.padPower*.8;
                const flicker=.94+.06*Math.sin(launch.elapsed*31);
                engineLight.intensity=launch.power*90*flicker;
                trenchLight.intensity=launch.padPower*110*flicker;
                const glow=launchPad.userData.launchGlowMaterials as THREE.MeshStandardMaterial[]|undefined;
                glow?.forEach(material=>material.emissiveIntensity=launch.padPower*1.5*flicker);
                for(const name of ['historicalSupportArms','historicalServiceArms']){
                    const arms=launchPad.userData[name] as THREE.Group[]|undefined;
                    arms?.forEach(arm=>arm.rotation.z=-arm.userData.side*arm.userData.openAngle*span(launch.elapsed,.03,1.45));
                }
                sun.target.position.y = Math.min(50, launch.height);
                sun.target.updateMatrixWorld();
            });
        }
        if (type === 'lunar' || type === 'mars') {
            craft=makeLander(kind==='zhurong'?'tianwen':kind,m);
            scene.add(craft.root);
            const delivery=kind==='change'||kind==='zhurong';
            let rover:CraftModel|null=null;
            if(delivery){
              rover=makeRover(kind==='zhurong'?'zhurong':'yutu',m);
              rover.root.scale.setScalar(DELIVERY.roverScale);
              // During descent rover and platform are ONE hierarchy, not two independently moving actors.
              craft.root.add(rover.root);
            }
            if(type==='lunar'&&kind==='apollo'){
              const earth=makePlanet(bank,'earth',12);earth.position.set(-80,220,-700);scene.add(earth);
              observationPlanets.push({ object: earth, radius: 12 });
              const astronaut=makeHuman(m,true);scene.add(astronaut.root);observationExtras.push(astronaut.root);
              const prototype=makeFootprint(m);
              const marks=APOLLO_CONTACTS.map((c,i)=>{
                const mark=i===0?prototype:prototype.clone();mark.position.set(c.x,.004,c.z);
                mark.visible=false;mark.userData.contactTime=c.time;scene.add(mark);return mark;
              });
              updates.push(f=>{
                poseApolloAstronaut(astronaut,f.local);
                marks.forEach((mark,i)=>mark.visible=f.local>=APOLLO_CONTACTS[i]!.time);
              });
            }
            const track=new THREE.Group();scene.add(track);
            if(delivery)for(const side of [-1,1])for(let i=0;i<39;i++){
              const z=4.70+i*.11;const mark=mBox(.145,.008,.024,m.dark,[side*.97*DELIVERY.roverScale,.007,z]);
              mark.userData.trackZ=z;mark.userData.side=side;mark.visible=false;mark.castShadow=false;track.add(mark);
            }
            updates.push(f=>{
              let clearance=0;
              if(kind==='apollo'){
                clearance=9*(1-span(f.local,47,62));
                if(f.state.activeKind==='landing'&&f.state.landing)clearance=f.state.landing.height*(9*(1-span(50,47,62))/32);
              } else if(kind==='viking')clearance=12*(1-span(f.local,8,22));
              else if(delivery)clearance=deliveryState(kind as 'change'|'zhurong',f.local).clearance;
              clearance=Math.max(0,clearance);
              craft!.root.position.y=clearance;
              const flame=craft!.parts.flame as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
              flame.visible=clearance>.045;
              flame.material.uniforms.time!.value=f.global+f.interactionTime;
              flame.material.uniforms.power!.value=(f.state.thrust?.95:.50)*span(clearance,0,.50);
              focus.set(0,clearance+1.4,0);follow.set(0,clearance*.4,0);
              if(rover){
                const pose=roverDeliveryPose(kind as 'change'|'zhurong',f.local,f.state.roverTarget);
                const ramp=craft!.parts.ramp!;
                ramp.rotation.x=mix(-1.40,craft!.root.userData.rampSlope as number,pose.ramp);
                rover.root.position.set(pose.x,pose.y,pose.z);
                rover.root.rotation.set(pose.pitch,pose.yaw,0);
                rover.parts.wings!.children.forEach(p=>p.rotation.z=(Number(p.userData.restTilt)||0)+(Number(p.userData.side)||0)*(1-pose.wings)*1.43);
                rover.parts.wheels!.children.forEach(axle=>{const spin=axle.children[0]!;spin.rotation.y=(pose.z-.15)/(DELIVERY.wheelRadius*DELIVERY.roverScale);});
                track.children.forEach(mark=>{
                  const z=mark.userData.trackZ as number;
                  const travel=clamp01((z-5.1)/3.25);
                  mark.position.x=(mark.userData.side as number)*.97*DELIVERY.roverScale+(f.state.roverTarget-1)*1.8*travel;
                  mark.visible=pose.landed && z<pose.z-.75*DELIVERY.roverScale;
                });
                if(pose.travel>0){follow.set(pose.x*.48,0,(pose.z-5.1)*.44);focus.copy(rover.root.position);}
              }
            });
        }
        if (type === 'return') {
            const full = makeShenzhou(m);
            craft = { root: new THREE.Group(), parts: {} };
            const capsule = full.parts.capsule!;
            capsule.removeFromParent();
            craft.root.add(capsule);
            scene.add(craft.root);
            disposeWorldScene(Object.assign(new THREE.Scene(), {}).add(full.root) as THREE.Scene);
            const canopyMaterial = m.fabric.clone(); canopyMaterial.userData.keepAlive = false; canopyMaterial.side = THREE.DoubleSide;
            canopyMaterial.roughness = .94; canopyMaterial.metalness = 0;
            canopyMaterial.emissive.set('#746950'); canopyMaterial.emissiveIntensity = .045;
            const canopyGeometry = new THREE.SphereGeometry(5, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2);
            const chute = new THREE.Group(), parachute = meshOf(canopyGeometry, canopyMaterial);
            chute.name = '神舟主伞 · 可变形伞布组'; parachute.name = '神舟主伞 · 半球伞布';
            chute.add(parachute);
            const suspension = new THREE.Group(); suspension.name = '神舟主伞 · 实时连接伞绳';
            const canopyPositions = parachute.geometry.attributes.position! as THREE.BufferAttribute;
            const clothRestPositions = new Float32Array(canopyPositions.array);
            parachute.userData.clothRestPositions = clothRestPositions;
            canopyPositions.setUsage(THREE.DynamicDrawUsage);
            const rimStart = canopyGeometry.parameters.heightSegments * (canopyGeometry.parameters.widthSegments + 1);
            const ropeMaterial = m.std('#b9b3a4', .10, .83), ropeSegments = 28, ropeSides = 5, ropeRadius = .012;
            const anchorHeight = 1.08, anchorHalfHeight = .026;
            const anchors = Array.from({ length: 4 }, (_, i) => {
                const angle = i * Math.PI / 2;
                // The flat capsule roof is y=1.08, radius=.48. Each fitting has
                // its bottom on that real surface, and the cord meets its top.
                const anchor = mCyl(.060, .072, anchorHalfHeight * 2, m.metal,
                    [Math.cos(angle) * .34, anchorHeight + anchorHalfHeight, Math.sin(angle) * .34], 16);
                anchor.name = `返回舱 · 伞绳承力固定点 ${i + 1}`; capsule.add(anchor); return anchor;
            });
            const ropes: { mesh: THREE.Mesh; vertex: number; anchor: THREE.Mesh; centers: Float32Array }[] = [];
            for (let i = 0; i < 12; i++) {
                const vertex = rimStart + Math.round(i * canopyGeometry.parameters.widthSegments / 12);
                const angle = Math.atan2(canopyPositions.getZ(vertex), canopyPositions.getX(vertex));
                const anchorIndex = (Math.round(angle / (Math.PI / 2)) + 4) % 4;
                const ropeGeometry = new THREE.BufferGeometry(), indices:number[] = [];
                ropeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ropeSegments + 1) * ropeSides * 3), 3).setUsage(THREE.DynamicDrawUsage));
                ropeGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((ropeSegments + 1) * ropeSides * 3), 3).setUsage(THREE.DynamicDrawUsage));
                for (let segment = 0; segment < ropeSegments; segment++) for (let side = 0; side < ropeSides; side++) {
                    const a = segment * ropeSides + side, b = segment * ropeSides + (side + 1) % ropeSides;
                    indices.push(a, b, a + ropeSides, b, b + ropeSides, a + ropeSides);
                }
                ropeGeometry.setIndex(indices);
                const rope = meshOf(ropeGeometry, ropeMaterial), centers = new Float32Array((ropeSegments + 1) * 3);
                rope.name = `神舟主伞 · 连接绳 ${i + 1}`;
                rope.userData.rimVertex = vertex; rope.userData.anchorIndex = anchorIndex;
                rope.userData.ropeCenters = centers;
                ropes.push({ mesh: rope, vertex, anchor: anchors[anchorIndex]!, centers }); suspension.add(rope);
            }
            craft.root.add(chute, suspension);
            const rootInverse = new THREE.Matrix4(), upperEnd = new THREE.Vector3(), lowerEnd = new THREE.Vector3();
            const lineDirection = new THREE.Vector3(), lineUp = new THREE.Vector3(0, 1, 0);
            const ropeNormal = new THREE.Vector3(), ropeBinormal = new THREE.Vector3(), ropeTangent = new THREE.Vector3();
            updates.push(f => {
                const drop = span(f.local, 28, 37.2);
                const drift = span(f.local, 37.2, 40.9);
                const soften = span(f.local, 37.5, 40.0);
                const domeLoss = span(f.local, 37.6, 40.8);
                const hanging = span(f.local, 37.6, 38.6) * (1 - span(f.local, 40.5, 41.3));
                const slack = span(f.local, 37.5, 41.3);
                craft!.root.position.set(0, 1.08 + mix(12, 0, drop), 0);
                chute.visible = true;
                // Each frame starts from the inflated rest mesh: time seeking
                // restores the same cloth, without accumulating a simulation.
                // The windward edge loses lift first; folds start well before
                // contact instead of lowering a rigid hemisphere onto the soil.
                for (let i = 0; i < canopyPositions.count; i++) {
                    const rx = clothRestPositions[i * 3]!, ry = clothRestPositions[i * 3 + 1]!, rz = clothRestPositions[i * 3 + 2]!;
                    const radial = Math.hypot(rx, rz) / 5, angle = Math.atan2(rz, rx);
                    // The downwind lip reaches the ground first while the
                    // opposite skirt and centre still hang above it. A common
                    // fall factor would briefly turn the cloth into an airborne
                    // horizontal disc as soon as its inflation was removed.
                    const windward = clamp01(.5 + rx / 10);
                    const edgeLag = 1 - windward;
                    const fall = span(f.local, 37.5 + edgeLag * .88 + (1 - radial) * .20, 40.35 + edgeLag * .90);
                    const fold = Math.sin(rx * 2.6 + rz * .7), crossFold = Math.sin(rz * 3.8 - rx * .55);
                    const edgeSmooth = 1 - span(radial, .76, 1) * .78;
                    const foldX = radial * (.22 * Math.sin(angle * 3 + radial * 8) + .15 * crossFold * edgeSmooth);
                    const foldZ = radial * (.25 * Math.sin(angle * 5 - radial * 6) + .17 * fold * edgeSmooth);
                    const finalX = 6.9 + rx * .72 + foldX, finalZ = 1.1 + rz * .62 + foldZ;
                    const x = mix(rx, finalX, drift) + .09 * radial * Math.sin(angle * 12) * soften * (1 - fall);
                    const z = mix(rz, finalZ, drift);
                    const ground = sampledGroundHeight(x, z, 'earth', false);
                    const foldHeight = .055 + (.14 * fold * fold + .10 * crossFold * crossFold) * (.50 + edgeSmooth * .50)
                        + .26 * Math.exp(-Math.pow((rx + Math.sin(rz * 1.3) * .5) / .85, 2));
                    const finalY = ground - craft!.root.position.y + foldHeight;
                    const sag = radial * Math.sin(angle + .4) * soften * (1 - fall) * .70;
                    const ripple = Math.sin(angle * 12 + radial * 3) * radial * .06 * (1 - soften);
                    const pleat = (Math.sin(rz * 1.8 + rx * .35) + .35 * Math.sin(rz * 3.6 - rx * .30)) * hanging * .60;
                    const y = mix(12, finalY, fall) + ry * (1 - domeLoss) * (1 - fall) + sag + ripple + pleat;
                    // Contact is local to each vertex. A single low edge must
                    // never lift the rest of the cloth back into a hard shell.
                    canopyPositions.setXYZ(i, x, Math.max(y, ground + .045 - craft!.root.position.y), z);
                }
                canopyPositions.needsUpdate = true;
                canopyGeometry.computeVertexNormals(); canopyGeometry.computeBoundingBox(); canopyGeometry.computeBoundingSphere();
                craft!.root.updateMatrixWorld(true);
                rootInverse.copy(craft!.root.matrixWorld).invert();
                for (const [ropeIndex, { mesh, vertex, anchor, centers }] of ropes.entries()) {
                    upperEnd.fromBufferAttribute(canopyPositions, vertex).applyMatrix4(parachute.matrixWorld).applyMatrix4(rootInverse);
                    lowerEnd.set(0, anchorHalfHeight, 0).applyMatrix4(anchor.matrixWorld).applyMatrix4(rootInverse);
                    lineDirection.subVectors(upperEnd, lowerEnd);
                    const horizontal = Math.max(.001, Math.hypot(lineDirection.x, lineDirection.z));
                    for (let segment = 0; segment <= ropeSegments; segment++) {
                        const u = segment / ropeSegments, arch = Math.sin(Math.PI * u);
                        const wander = Math.sin(u * Math.PI * 3 + ropeIndex * .71) * arch * slack * .36;
                        const x = mix(lowerEnd.x, upperEnd.x, u) - lineDirection.z / horizontal * wander;
                        const z = mix(lowerEnd.z, upperEnd.z, u) + lineDirection.x / horizontal * wander;
                        let y = mix(lowerEnd.y, upperEnd.y, u) - arch * slack * 3.4;
                        if (segment > 0 && segment < ropeSegments) {
                            y = Math.max(y, sampledGroundHeight(x, z, 'earth', false) + .045 - craft!.root.position.y);
                            // Slack ropes first pass over the capsule shoulder,
                            // then drape on the ground; they cannot cut its roof.
                            const radius = Math.hypot(x, z);
                            if (radius < 2.05) y = Math.max(y, mix(anchorHeight + anchorHalfHeight * 2, -.95, span(radius, .90, 2.05)));
                        }
                        centers[segment * 3] = x; centers[segment * 3 + 1] = y; centers[segment * 3 + 2] = z;
                    }
                    const positions = mesh.geometry.attributes.position!, normals = mesh.geometry.attributes.normal!;
                    for (let segment = 0; segment <= ropeSegments; segment++) {
                        const before = Math.max(0, segment - 1) * 3, after = Math.min(ropeSegments, segment + 1) * 3;
                        ropeTangent.set(centers[after]! - centers[before]!, centers[after + 1]! - centers[before + 1]!, centers[after + 2]! - centers[before + 2]!).normalize();
                        ropeNormal.crossVectors(ropeTangent, lineUp);
                        if (ropeNormal.lengthSq() < .0001) ropeNormal.set(1, 0, 0);
                        ropeNormal.normalize(); ropeBinormal.crossVectors(ropeTangent, ropeNormal).normalize();
                        for (let side = 0; side < ropeSides; side++) {
                            const a = side / ropeSides * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), index = segment * ropeSides + side;
                            const nx = ropeNormal.x * c + ropeBinormal.x * s, ny = ropeNormal.y * c + ropeBinormal.y * s, nz = ropeNormal.z * c + ropeBinormal.z * s;
                            positions.setXYZ(index, centers[segment * 3]! + nx * ropeRadius, centers[segment * 3 + 1]! + ny * ropeRadius, centers[segment * 3 + 2]! + nz * ropeRadius);
                            normals.setXYZ(index, nx, ny, nz);
                        }
                    }
                    positions.needsUpdate = true; normals.needsUpdate = true;
                    mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
                }
                focus.copy(craft!.root.position);
                follow.y = (craft!.root.position.y - 1) * .7;
            });
        }
        if (type === 'recovery') {
            craft = makeRocket('falcon', m);
            craft.parts.upper!.visible = false;
            craft.parts.legs!.visible = true;
            scene.add(craft.root);
            const landingPad = mCyl(9, 9, .18, m.metal, [0, .08, 0]);
            scene.add(landingPad);
            const paint = bank.own(canvasTexture(512, 512, c => { c.clearRect(0, 0, 512, 512); c.strokeStyle = '#d0d6d0'; c.lineWidth = 9; c.beginPath(); c.arc(256, 256, 216, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#d0d6d0'; c.font = 'bold 230px sans-serif'; c.textAlign = 'center'; c.fillText('H', 256, 332); }));
            const disc = meshOf(new THREE.PlaneGeometry(15, 15), new THREE.MeshBasicMaterial({ map: paint, transparent: true, depthWrite: false }), [0, .18, 0]);
            disc.rotation.x = -Math.PI / 2;
            scene.add(disc);
            const returnSmoke = makeSmoke(quality === 'high' ? 84 : 56, false, {recovery:true, emissionDuration:19});
            const groundSmoke = makeSmoke(quality === 'high' ? 70 : 48, false, {radial:true, emissionDuration:5});
            scene.add(returnSmoke, groundSmoke);
            const returnLabels:Record<string,THREE.Sprite>={};
            for(const [phase,label] of Object.entries({coast:'一级 · 熄火滑行',entry:'再入减速点火',glide:'熄火 · 栅格舵引导',landing:'中心发动机着陆点火',landed:'一级陆上着陆完成'})){
                const sprite=textSprite(label,bank,'#dce8e9',6.2);sprite.visible=false;scene.add(sprite);returnLabels[phase]=sprite;
            }
            updates.push(f => {
                const r = recoveryState(f.local), y = r.height;
                craft!.root.rotation.z=r.trajectory.angle;
                craft!.root.position.set(r.trajectory.engineX,r.trajectory.engineY,0);
                updateFalconJets(craft!,r,f.local);
                // Births are filtered by recoveryState inside makeSmoke; earlier
                // exhaust can dissipate during coast without creating new puffs.
                returnSmoke.material.uniforms.time!.value=r.smokeTime;
                returnSmoke.material.uniforms.power!.value=.64;
                groundSmoke.material.uniforms.time!.value=r.groundSmokeTime;
                groundSmoke.material.uniforms.power!.value=.82*r.groundSmokePower;
                setFalconRecoveryConfiguration(craft!.root,r.legs,r.gridFins,f.local);
                for(const [phase,label] of Object.entries(returnLabels)){label.visible=phase===r.phase&&f.local>26;label.position.set(r.trajectory.centerX,y+14.5,0);}
                follow.set(r.trajectory.centerX,(y-.21)*.75,0);
                focus.set(r.trajectory.centerX,r.trajectory.centerY,0);
            });
        }
    }
    else if (type === 'cabin') {
        const cabin = makeCabin(m);
        cabin.userData.observationNoCollision = true; // Seated look-around uses the camera-fixed aperture.
        scene.add(cabin);
        scene.onBeforeRender = (_renderer, _scene, camera) => alignCabinWindow(cabin, camera);
        planet = makePlanet(bank, 'earth', 50);
        planet.position.set(0, -29, -74);
        scene.add(planet);
        observationPlanets.push({ object: planet, radius: 50 });
        sun.intensity = 2;
        scene.environmentIntensity = .2;
        updates.push(f => { const surface = planet!.userData.surface as THREE.Mesh; surface.rotation.y = .68 + Math.max(0, f.local - 23) * .0035; const mat = surface.material as THREE.ShaderMaterial; mat.uniforms.nightEnabled!.value = .78; focus.set(0, 1.1, -12); });
    }
    else if (type === 'earth' || type === 'moonOrbit' || type === 'marsOrbit') {
        const planetType = type === 'moonOrbit' ? 'moon' : type === 'marsOrbit' ? 'mars' : 'earth';
        planet = makePlanet(bank, planetType, type === 'earth' ? 52 : 36);
        planet.position.set(0, type === 'earth' ? -48 : -31, type === 'earth' ? -44 : -29);
        // Place the Florida coast in the visible limb of the recovery shot.
        // This is a geographic viewing orientation, not a telemetry attitude.
        if (type === 'earth' && kind === 'falcon') planet.rotation.x = -.95;
        scene.add(planet);
        observationPlanets.push({ object: planet, radius: type === 'earth' ? 52 : 36 });
        if (kind === 'sputnik' || kind === 'dfh' || kind === 'generic')
            craft = makeSatellite(kind, m);
        else if (kind === 'vostok') {
            craft = makeVostok(m);
            // The model's optical port faces local +Z. Point it toward the
            // visible Earth limb, 45 degrees east of nadir, so the exterior
            // window has an unobstructed Earth view before the cabin transition.
            // This is an illustrative viewing attitude, not a flight record.
            const earthward=planet.position.clone().sub(craft.root.position).normalize();
            const portDirection=earthward.multiplyScalar(Math.SQRT1_2).add(new THREE.Vector3(Math.SQRT1_2,0,0)).normalize();
            craft.root.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),portDirection)
                .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-Math.PI/2));
        }
        else if (kind === 'apollo')
            craft = makeApollo(m);
        else if (kind === 'shenzhou')
            craft = makeShenzhou(m);
        else if (kind === 'salyut' || kind === 'tiangong')
            craft = makeStation(kind, m);
        else if (kind === 'falcon' || kind === 'v2' || kind === 'launcher') {
            craft = makeRocket(kind === 'launcher' ? 'generic' : kind, m);
            craft.root.scale.setScalar(kind === 'v2' ? .5 : kind === 'falcon' ? 1 : .6);
            craft.root.position.y = -6;
            craft.root.rotation.z = -.22;
        }
        else
            craft = makeSatellite('generic', m);
        scene.add(craft.root);
        const falconLabels:Record<string,THREE.Sprite>={};
        if(kind==='falcon'){
            const upperFlame=makeFlame();upperFlame.position.set(0,-.54,0);upperFlame.scale.set(.64,.75,.64);
            craft.parts.upper!.add(upperFlame);craft.parts.upperFlame=upperFlame;
            const upperLabel=textSprite('二级 · 继续运送载荷',bank,'#dce8e9',5.0);upperLabel.position.set(3,3,0);craft.parts.upper!.add(upperLabel);
            craft.parts.upperLabel=upperLabel;
            for(const [phase,label] of Object.entries({separation:'主机关机 · 两级分离',flip:'一级翻转',boostback:'一级返程点火',coast:'一级 · 熄火滑行'})){
                const sprite=textSprite(label,bank,'#dce8e9',5.0);sprite.visible=false;scene.add(sprite);falconLabels[phase]=sprite;
            }
        }
        updates.push(f => {
            const surface = planet!.userData.surface as THREE.Mesh;
            // This chapter follows the 2015 Cape Canaveral return: keep the
            // Florida / western Atlantic hemisphere in view throughout the
            // compressed sequence, independent of the film's global clock.
            surface.rotation.y = kind === 'falcon'
                ? -.10 + Math.max(0, f.local) * (Math.PI * 2 / 86164)
                : .8 + f.global * .003;
            if (planetType === 'earth') {
                const mat = surface.material as THREE.ShaderMaterial;
                mat.uniforms.nightEnabled!.value = f.chapter.id >= 11 ? .82 : .72;
            }
            if (['sputnik', 'dfh', 'generic'].includes(kind)) {
                craft!.root.rotation.y = f.local * .025;
                if (craft!.parts.wings)
                    craft!.parts.wings!.children.forEach((p, i) => p.rotation.z = (i ? 1 : -1) * (1 - span(f.local, 64, 69)) * .15);
            }
            if (kind === 'apollo') {
                const separate = span(f.local, 37, 47);
                craft!.parts.lm!.position.set(3.6 + separate * 3, -1.3 - separate * 2.5, 0);
                craft!.parts.csm!.position.x = -3 - separate * 2;
            }
            if (kind === 'shenzhou') {
                const s = span(f.local, 21, 28);
                craft!.parts.orbital!.position.y = 2.65 + s * 4;
                craft!.parts.service!.position.y = -2.25 - s * 4;
                craft!.root.rotation.z = -Math.PI / 2 + s * .2;
            }
            if (kind === 'falcon' || kind === 'launcher') {
                const p = kind === 'falcon' ? span(f.local, 8, 21) : span(f.local, 41, 51);
                craft!.parts.upper!.position.y = Number(craft!.root.userData.lowH) + p * 13;
                if(kind==='falcon'){
                    const r=recoveryState(f.local),half=Number(craft!.root.userData.lowH)*.5;
                    const trajectory=r.trajectory;
                    // The parent follows the pre-boost inertial frame. Stage two
                    // accelerates independently; stage one's attitude only rotates
                    // it around the separately integrated centre of mass.
                    craft!.root.position.set(trajectory.referenceX+Math.sin(-.22)*half,trajectory.referenceY-Math.cos(-.22)*half,0);
                    craft!.root.updateMatrixWorld(true);
                    const center=craft!.root.worldToLocal(new THREE.Vector3(trajectory.centerX,trajectory.centerY,0));
                    craft!.parts.lower!.rotation.z=r.boosterAngle;
                    craft!.parts.lower!.position.copy(center).sub(new THREE.Vector3(0,half,0).applyAxisAngle(new THREE.Vector3(0,0,1),r.boosterAngle));
                    craft!.parts.upper!.position.set(0,half*2+.35*span(f.local,8,8.55)+.16*Math.max(0,f.local-8.55)**2,0);
                    updateFalconJets(craft!,r,f.local);craft!.parts.legs!.visible=true;
                    setFalconRecoveryConfiguration(craft!.root,0,r.gridFins,f.local);
                    const jet=craft!.parts.upperFlame as THREE.Mesh<THREE.BufferGeometry,THREE.ShaderMaterial>;
                    jet.visible=r.secondStagePower>.001;jet.material.uniforms.time!.value=f.local;jet.material.uniforms.power!.value=.84*r.secondStagePower;
                    craft!.parts.upperLabel!.visible=f.local>=8.55&&f.local<12.75;
                    (craft!.parts.upperLabel as THREE.Sprite).material.opacity=1-span(f.local,11,12.75);
                    craft!.root.updateMatrixWorld(true);
                    const labelPosition=craft!.parts.lower!.localToWorld(new THREE.Vector3(0,half,0)).add(new THREE.Vector3(-4.6,1.5,0));
                    for(const [phase,label] of Object.entries(falconLabels)){label.visible=phase===r.phase&&f.local<24;label.position.copy(labelPosition);label.material.opacity=1-span(f.local,23,24);}
                    // At t=25 this +10 offset matches the incoming shot's target
                    // and camera exactly, with the same scale and stage position.
                    follow.set(trajectory.centerX,mix(trajectory.centerY,.75*(trajectory.centerY-half-.21)+10,span(f.local,14,25)),0);
                } else {
                    craft!.parts.lower!.position.y=-p*7;craft!.parts.lower!.rotation.z=p*.2;
                    craft!.parts.flame!.visible=true;craft!.parts.legs!.visible=false;
                    craft!.parts.flame!.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.ShaderMaterial)o.material.uniforms.time!.value=f.global;});
                    follow.set(-p*1.5,-p*2,0);
                }
            }
            if (kind === 'v2') {
                const phase = span(f.local, 8, 27);
                craft!.root.position.set((phase - .5) * 6, Math.sin(phase * Math.PI) * 3 - 1, 0);
                craft!.root.rotation.z = -phase * 2.5;
                craft!.parts.flame!.visible = phase < .55;
            }
            if (kind === 'salyut') {
                craft!.parts.interior!.visible = false;
                craft!.parts.core!.traverse(o => {
                    if (o instanceof THREE.Mesh && o.userData.originalMaterial)
                        o.material = o.userData.originalMaterial;
                });
            }
            focus.set(0, 0, 0);
        });
    }
    else if (type === 'orbit') {
        planet = makePlanet(bank, 'earth', 8);
        // Keep the illustrative atmospheric glow thin enough to read the
        // correctly scaled 400 km gap above the solid Earth.
        (planet.userData.shell as THREE.Mesh).scale.setScalar(1.015 / 1.055);
        scene.add(planet);
        observationPlanets.push({ object: planet, radius: 8 });
        craft = makeSatellite('generic', m);
        craft.root.name = '轨道实验卫星 · 放大示意';
        craft.root.scale.setScalar(.12);
        scene.add(craft.root);
        const startRadius = 8 * (1 + ORBIT_ALTITUDE / EARTH_KM);
        const reference = ringPath(startRadius, '#3a607c', true);
        reference.name = '400 km 等高参考线';
        scene.add(reference);
        let velocity = -1;
        let path: THREE.Line | null = null;
        let samples: Vec3T[] = [];
        let orbitKind: 'impact' | 'bound' | 'escape' = 'bound';
        const marker = mBall(.055, m.white);
        marker.name = '400 km 共同起点';
        marker.position.set(0, startRadius, 0);
        scene.add(marker);
        const text = textSprite('400 km · 起始高度', bank, '#d9e9ee', 5);
        text.position.set(-3.4, 9.3, 0);
        const heightGuide = linePath([[0, 8, 0], [0, startRadius, 0]], '#d9e9ee', .75);
        // A compact right-side stack stays clear of the film controls and
        // subtitles in the actual 1:1 and 16:9 story camera projections.
        const orbitLabel = (words:string,color:string,y:number) => {
            const texture = bank.own(canvasTexture(384,80,c=>{
                c.font='500 34px "Microsoft YaHei", sans-serif';c.textAlign='center';
                c.fillStyle=color;c.shadowColor='#030910';c.shadowBlur=8;c.fillText(words,192,51);
            }));
            const label = new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
            label.name=`轨道标注 · ${words}`;
            label.scale.set(5,5*80/384,1);label.position.set(10.7,y,0);return label;
        };
        const lowSpeedText = orbitLabel('初速 5.60 km/s','#d7a075',-1.6);
        const circularText = orbitLabel('初速 7.67 km/s','#8ad7cc',-1.6);
        const lowResultText = orbitLabel('轨迹返回地表','#d7a075',-2.5);
        const circularResultText = orbitLabel('持续环绕地球','#8ad7cc',-2.5);
        const scaleText = orbitLabel('卫星放大 · 时间压缩','#94abb7',-3.4);
        const velocityArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1.3, '#a1e1d5', .25, .12);
        velocityArrow.name = '瞬时速度方向';
        scene.add(text, heightGuide, lowSpeedText, circularText, lowResultText, circularResultText, scaleText, velocityArrow);
        updates.push(f => {
            const explicitRun = f.state.activeKind === 'orbit' || f.state.activeKind === 'insertion';
            const experiment = f.chapter.id === 5;
            const lowSpeedRun = experiment && !explicitRun && f.local < 17;
            const speed = explicitRun ? f.state.speed : lowSpeedRun ? 5.6 : circularSpeed();
            if (Math.abs(velocity - speed) > .0001) {
                velocity = speed;
                const result = solveOrbit(speed);
                orbitKind = result.kind;
                samples = result.points.map(p => [p[0] * 8 / EARTH_KM, p[1] * 8 / EARTH_KM, p[2]]);
                if (path) {
                    scene.remove(path);
                    path.geometry.dispose();
                    (path.material as THREE.Material).dispose();
                }
                path = linePath(samples, result.kind === 'impact' ? '#d7a075' : result.kind === 'escape' ? '#caad73' : '#66cbc0', .9);
                path.name = '二体引力计算轨迹';
                scene.add(path);
            }
            // Two separate releases from the same height. The initial velocity
            // never changes mid-flight; a surface impact does not loop/teleport.
            const progress = explicitRun ? clamp01(f.state.orbitRun) : experiment
                ? clamp01(lowSpeedRun ? (f.local - 8) / 8 : (f.local - 17) / 20)
                : (Math.max(0, f.local) * .055) % 1;
            const cursor = progress * Math.max(1, samples.length - 1);
            const index = Math.min(samples.length - 1, Math.floor(cursor));
            const p = samples[index] || [0, startRadius, 0];
            const q = samples[Math.min(samples.length - 1, index + 1)] || p;
            craft!.root.position.set(mix(p[0], q[0], cursor - index), mix(p[1], q[1], cursor - index), 0);
            // A stable local-vertical attitude; the separate arrow shows motion.
            craft!.root.rotation.z = Math.atan2(craft!.root.position.y, craft!.root.position.x) - Math.PI / 2;
            craft!.root.visible = !(orbitKind === 'impact' && progress >= 1);
            const before = samples[Math.max(0, index - 1)] || p;
            const tangent = new THREE.Vector3(q[0] - before[0], q[1] - before[1], 0).normalize();
            velocityArrow.position.copy(craft!.root.position);
            velocityArrow.setDirection(tangent);
            velocityArrow.visible = craft!.root.visible;
            lowSpeedText.visible = lowSpeedRun;
            circularText.visible = experiment && !explicitRun && !lowSpeedRun;
            lowResultText.visible = lowSpeedText.visible;
            circularResultText.visible = circularText.visible;
            scaleText.visible = experiment;
            craft!.root.userData.orbitSpeed = speed;
            craft!.root.userData.orbitProgress = progress;
            (planet!.userData.surface as THREE.Mesh).rotation.y = f.global * .002;
            focus.set(0, 0, 0);
        });
    }
    else if (type === 'relay') {
        const moon = makePlanet(bank, 'moon', 4);
        scene.add(moon);
        const earth = makePlanet(bank, 'earth', 5);
        earth.position.set(-30, 0, 0);
        scene.add(earth);
        observationPlanets.push({ object: moon, radius: 4 }, { object: earth, radius: 5 });
        const relay = makeSatellite('generic', m);
        relay.root.scale.setScalar(.4);
        relay.root.position.set(10, 9, 0);
        annotate(relay.root, '鹊桥');
        scene.add(relay.root);
        observationExtras.push(relay.root);
        const land = mBall(.22, m.gold, [4.1, 0, 0]);
        annotate(land, '月背探测器');
        scene.add(land);
        observationExtras.push(land);
        const a: Vec3T = [-30, 0, 0], b: Vec3T = [10, 9, 0], c: Vec3T = [4.1, 0, 0];
        if (!segmentClear(a, b, [0, 0, 0], 4) || !segmentClear(b, c, [0, 0, 0], 4))
            throw new Error('中继路径与月球相交');
        const links = new THREE.Group();
        links.add(linePath([a, b], '#7de2d5', .85), linePath([b, c], '#7de2d5', .85));
        scene.add(links);
        const direct = linePath([[-24.9, 0, 0], [-4.15, 0, 0]], '#b77c69', .4, true);
        scene.add(direct);
        for (const [name, p] of [['地球', [-30, 6, 0]], ['月球', [0, -5.7, 0]], ['鹊桥 · 中继星', [10, 11, 0]], ['月背着陆点', [5, -1.3, 0]]] as [
            string,
            Vec3T
        ][]) {
            const label = textSprite(name, bank, '#dfebf1', 5);
            label.position.fromArray(p);
            scene.add(label);
        }
        const pulse = mBall(.15, m.white);
        scene.add(pulse);
        updates.push(f => {
            links.visible = f.state.relay || f.local > 28;
            pulse.visible = links.visible;
            if (links.visible) {
                const u = ((f.global + f.interactionTime) * .3) % 2;
                const p = u < 1 ? new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), u) : new THREE.Vector3(...b).lerp(new THREE.Vector3(...c), u - 1);
                pulse.position.copy(p);
            }
            focus.set(0, 0, 0);
        });
    }
    else if (type === 'transfer') {
        const earth = makePlanet(bank, 'earth', 6);
        earth.position.set(-15, -1, 0);
        scene.add(earth);
        const moon = makePlanet(bank, 'moon', 2.4);
        moon.position.set(17, 0, 0);
        scene.add(moon);
        observationPlanets.push({ object: earth, radius: 6 }, { object: moon, radius: 2.4 });
        const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(-9, 0, 0), new THREE.Vector3(-4, 9, 0), new THREE.Vector3(12, 9, 0), new THREE.Vector3(17, 2.8, 0));
        scene.add(linePath(curve.getPoints(160).map(p => p.toArray() as Vec3T), '#d0b583', .65));
        craft = makeApollo(m);
        craft.root.scale.setScalar(.22);
        scene.add(craft.root);
        for (const [label, p] of [['地球', [-15, -8, 0]], ['月球', [17, -4.5, 0]]] as [
            string,
            Vec3T
        ][]) {
            const l = textSprite(label, bank, '#dce8e9', 6);
            l.position.fromArray(p);
            scene.add(l);
        }
        updates.push(f => { const u = span(f.local, 23, 36); craft!.root.position.copy(curve.getPoint(u)); craft!.root.rotation.z = Math.atan2(curve.getTangent(u).y, curve.getTangent(u).x); focus.set(2, 0, 0); });
    }
    else if (type === 'solar') {
        const sunBody = makePlanet(bank, 'sun', 3.4);
        scene.add(sunBody, new THREE.PointLight('#ffca8a', 35, 200, 1));
        observationPlanets.push({ object: sunBody, radius: 3.4 });
        sun.visible = false;
        const names = ['水星', '金星', '地球', '火星', '木星', '土星', '天王星', '海王星'], radii = [7, 11, 16, 21, 29, 36, 43, 50], bodies: THREE.Object3D[] = [];
        for (let i = 0; i < 8; i++) {
            const bodyTypes: PlanetKind[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
            const b = makePlanet(bank, bodyTypes[i]!, [.5, .9, 1.35, .8, 2.4, 2.1, 1.5, 1.45][i]!);
            scene.add(b, ringPath(radii[i]!, '#557180'));
            observationPlanets.push({ object: b, radius: [.5, .9, 1.35, .8, 2.4, 4, 1.5, 1.45][i]! });
            bodies.push(b);
            const label = textSprite(names[i]!, bank, '#c4d3da', 3);
            label.position.y = -3;
            b.add(label);
            if (i === 5) {
                const ring = meshOf(new THREE.RingGeometry(2.7, 4, 64), new THREE.MeshBasicMaterial({ color: '#928775', side: THREE.DoubleSide, transparent: true, opacity: .65 }));
                ring.rotation.x = -1.1;
                b.add(ring);
            }
        }
        updates.push(f => { bodies.forEach((b, i) => { const a = i * .75 + (f.local - 8) * .008; b.position.set(Math.cos(a) * radii[i]!, 0, Math.sin(a) * radii[i]!); }); focus.set(0, 0, 0); });
    }
    const observationGroundType = type === 'lunar' ? 'moon' : type === 'mars' ? 'mars' : type === 'dune' ? 'dune' : type === 'camp' || type === 'campEnd' ? 'camp' : 'earth';
    const observationGround = ground ? (x: number, z: number) => {
        const height = sampledGroundHeight(x, z, observationGroundType, type === 'coast');
        return type === 'coast' ? Math.max(height, SURFACE.seaY - .3) : height;
    } : undefined;
    const observationBox = new THREE.Box3(), observationPartBox = new THREE.Box3();
    const observationInstanceMatrix = new THREE.Matrix4(), observationMatrix = new THREE.Matrix4();
    const observationSubjectRoots = new Set<THREE.Object3D>([
        ...(craft ? [craft.root] : []), ...observationExtras, ...observationPlanets.map(entry => entry.object)
    ]);
    const observationObstacles: { object: THREE.Mesh; boxes: THREE.Box3[]; lastMatrix: THREE.Matrix4 | null }[] = [];
    scene.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        for (let ancestor: THREE.Object3D | null = object; ancestor; ancestor = ancestor.parent) {
            if (observationSubjectRoots.has(ancestor) || ancestor.userData.observationNoCollision) return;
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some(material => material.visible && !(material instanceof THREE.ShaderMaterial) && (!material.transparent || material.opacity >= .5))) return;
        // Flat paint, footprints and decorative rings do not enclose a solid.
        if (object.geometry instanceof THREE.PlaneGeometry || object.geometry instanceof THREE.RingGeometry) return;
        if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
        if (!object.geometry.boundingBox || object.geometry.boundingBox.isEmpty()) return;
        const count = object instanceof THREE.InstancedMesh ? object.count : 1;
        observationObstacles.push({ object, boxes: Array.from({ length: count }, () => new THREE.Box3()), lastMatrix: null });
    });
    const ray = new THREE.Raycaster();
    const world: WorldPack = { key, scene, focus, follow, cameraNear: type === 'cabin' ? .02 : .08, cameraFar:sky?GROUND_CAMERA_FAR:4000,
        update(f) {
            follow.set(0, 0, 0);
            updates.forEach(fn => fn(f));
            if (water)
                water.material.uniforms.time!.value = f.global * .28;
            if (sky && sky.material.uniforms.time)
                sky.material.uniforms.time!.value = f.global * .05;
        },
        getObservationBounds() {
            observationBox.makeEmpty();
            const subjects = craft ? [craft.root, ...observationExtras] : observationExtras;
            for (const subject of subjects) {
                subject.updateWorldMatrix(true, true);
                subject.traverseVisible(object => {
                    if (!(object instanceof THREE.Mesh)) return;
                    const materials = Array.isArray(object.material) ? object.material : [object.material];
                    if (!materials.some(material => material.visible && !(material instanceof THREE.ShaderMaterial))) return;
                    const geometry = object.geometry;
                    if (!geometry.boundingBox) geometry.computeBoundingBox();
                    if (!geometry.boundingBox) return;
                    if (object instanceof THREE.InstancedMesh) {
                        for (let i = 0; i < object.count; i++) {
                            object.getMatrixAt(i, observationInstanceMatrix);
                            observationMatrix.multiplyMatrices(object.matrixWorld, observationInstanceMatrix);
                            observationPartBox.copy(geometry.boundingBox).applyMatrix4(observationMatrix);
                            observationBox.union(observationPartBox);
                        }
                    } else {
                        observationPartBox.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld);
                        observationBox.union(observationPartBox);
                    }
                });
            }
            const exclusionSpheres = observationPlanets.map(({ object, radius }) => {
                object.updateWorldMatrix(true, false);
                const scale = object.getWorldScale(new THREE.Vector3());
                return { center: object.getWorldPosition(new THREE.Vector3()), radius: radius * Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z)) };
            });
            if (type === 'orbit' || type === 'relay' || type === 'transfer') {
                // These chapters explain relations between bodies: their planets
                // belong in the subject bounds as well as the collision list.
                for (const sphere of exclusionSpheres) {
                    const extent = new THREE.Vector3().setScalar(sphere.radius);
                    observationBox.expandByPoint(sphere.center.clone().sub(extent));
                    observationBox.expandByPoint(sphere.center.clone().add(extent));
                }
                if (type === 'transfer') observationBox.expandByPoint(new THREE.Vector3(2, 9, 0));
                if (type === 'orbit') {
                    observationBox.expandByPoint(new THREE.Vector3(-9, -9, -1));
                    observationBox.expandByPoint(new THREE.Vector3(9, 9.5, 1));
                }
            }
            const sphere = observationBox.isEmpty() ? new THREE.Sphere(focus.clone(), 3) : observationBox.getBoundingSphere(new THREE.Sphere());
            if (type === 'solar') {
                // The full 50-unit Neptune orbit is the stable teaching subject,
                // even when the current planets happen to cluster on one side.
                sphere.center.set(0, 0, 0); sphere.radius = 54;
            } else if (type === 'cabin') {
                // Director preserves this chapter's seated look-around mode.
                sphere.center.set(0, 1.35, -3.73); sphere.radius = 1.95;
            }
            const radius = Math.max(.5, sphere.radius);
            const minDistance = Math.max(1.2, radius * 1.08 + .24);
            const maxDistance = Math.max(minDistance * 2.8, Math.min(800, radius * 7 + 12));
            const exclusionBoxes: THREE.Box3[] = [];
            for (const obstacle of observationObstacles) {
                let visible = true;
                for (let ancestor: THREE.Object3D | null = obstacle.object; ancestor; ancestor = ancestor.parent) {
                    if (!ancestor.visible) { visible = false; break; }
                }
                if (!visible) continue;
                const object = obstacle.object;
                object.updateWorldMatrix(true, false);
                // Most buildings never move. Reuse their boxes; opening gantries
                // refresh only when their ancestor transform actually changes.
                if (!obstacle.lastMatrix || !obstacle.lastMatrix.equals(object.matrixWorld)) {
                    for (let i = 0; i < obstacle.boxes.length; i++) {
                        if (object instanceof THREE.InstancedMesh) {
                            object.getMatrixAt(i, observationInstanceMatrix);
                            observationMatrix.multiplyMatrices(object.matrixWorld, observationInstanceMatrix);
                        } else observationMatrix.copy(object.matrixWorld);
                        obstacle.boxes[i]!.copy(object.geometry.boundingBox!).applyMatrix4(observationMatrix);
                    }
                    if (!obstacle.lastMatrix) obstacle.lastMatrix = new THREE.Matrix4();
                    obstacle.lastMatrix.copy(object.matrixWorld);
                }
                exclusionBoxes.push(...obstacle.boxes);
            }
            return { center: sphere.center, radius, minDistance, maxDistance, groundHeight: observationGround, exclusionSpheres, exclusionBoxes };
        },
        getPick(ndc, camera) {
            ray.setFromCamera(ndc, camera);
            const hits = ray.intersectObjects(scene.children, true);
            for (const hit of hits) {
                let visible = true;
                let label = '';
                let node: THREE.Object3D | null = hit.object;
                while (node) {
                    if (!node.visible)
                        visible = false;
                    if (!label && node.userData.label)
                        label = String(node.userData.label);
                    node = node.parent;
                }
                if (!visible)
                    continue;
                if (label)
                    return label;
                // Do not select objects hidden behind the Earth, terrain, or a solid cabin wall.
                if (hit.object instanceof THREE.Mesh && hit.object.renderOrder >= 0) {
                    const mats = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
                    if (mats.some(mat => !mat.transparent || mat.opacity >= 0.95))
                        return null;
                }
            }
            return null;
        },
        dispose() {
            scene.traverse(o => {
                if (o.userData.cutMaterial)
                    (o.userData.cutMaterial as THREE.Material).dispose();
            });
            disposeWorldScene(scene, bank);
        },
    };
    return world;
}

/** Contact placement shares the exact near and far terrain triangles. */
function sampledGround(x:number,z:number,coastal=false){
  return sampledGroundHeight(x,z,'earth',coastal);
}
function makeGroundRibbon(x0:number,z0:number,x1:number,z1:number,width:number,material:THREE.Material,offset=.05,coastal=false){
  const len=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.ceil(len/1.4));
  const dx=(x1-x0)/len,dz=(z1-z0)/len;
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=n;i++)for(let j=0;j<3;j++){
    const across=(j/2-.5)*width,x=mix(x0,x1,i/n)-dz*across,z=mix(z0,z1,i/n)+dx*across;
    positions.push(x,sampledGround(x,z,coastal)+offset,z);uv.push(j/2,i/n);
  }
  for(let i=0;i<n;i++)for(let j=0;j<2;j++){
    const a=i*3+j,b=a+1,c=a+3,d=c+1;indices.push(a,b,c,b,d,c);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);mesh.receiveShadow=true;mesh.castShadow=false;
  mesh.userData.observationNoCollision=true; // Terrain-conforming paint/roads use the terrain constraint.
  return mesh;
}
