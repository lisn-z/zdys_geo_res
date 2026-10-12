import * as THREE from 'three';
import { canvasTexture, makePlanet, type PlanetKind, type TextureBank } from './assets';
import { seeded, span } from './math';
import { cosmicFlight, type CosmicTransform } from './cosmic-flight';
import { createCosmicStructures } from './cosmic-structures';
import type { ObservationBounds, WorldPack } from './worlds';

/** Each scale is part of the same scene and camera flight. Distances are
 * deliberately compressed; this is a journey through scale, not telemetry. */
export function createCosmicFinale(base: WorldPack, bank: TextureBank, quality: 'balanced' | 'high'): WorldPack {
    const scene = base.scene;
    scene.name = '仰望之后 · 连续宇宙飞行';
    const camp = new THREE.Group(); camp.name = '出发的山坡';
    const skyMaterials: THREE.ShaderMaterial[] = [];
    for (const child of [...scene.children]) {
        let sky = false;
        child.traverse(object => {
            const material = (object as THREE.Mesh).material;
            if (material instanceof THREE.ShaderMaterial && material.uniforms.skyMap) {
                sky = true; skyMaterials.push(material);
            }
        });
        if (!sky) camp.add(child);
    }
    scene.add(camp);
    const daylight = new THREE.DirectionalLight('#fff1da', 2.7);
    daylight.position.set(30, 18, 25);
    const fill = new THREE.HemisphereLight('#819ab5', '#111725', .55);
    scene.add(daylight, fill);

    const earth = makePlanet(bank, 'earth', 6), moon = makePlanet(bank, 'moon', 1.635), sun = makePlanet(bank, 'sun', 3);
    earth.name = '回望地球'; moon.name = '与地球相伴的月球'; sun.name = '太阳';
    const haloTexture = bank.own(canvasTexture(128, 128, context => {
        const glow = context.createRadialGradient(64, 64, 3, 64, 64, 64);
        glow.addColorStop(0, 'rgba(255,238,185,.7)'); glow.addColorStop(.28, 'rgba(255,173,78,.35)');
        glow.addColorStop(.62, 'rgba(255,126,32,.10)'); glow.addColorStop(1, 'rgba(255,116,25,0)');
        context.fillStyle = glow; context.fillRect(0, 0, 128, 128);
    }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .8 }));
    halo.scale.set(17, 17, 1); sun.add(halo);
    const solar = new THREE.Group(); solar.name = '八大行星与太阳系轨道 · 尺度压缩';
    const orbitRadii = [8, 11, 15, 19, 25, 31, 37, 43];
    const planetRadii = [.35, .65, 0, .48, 1.75, 1.45, 1.05, .95];
    const phases = [-.8, .2, .7, 1.9, 3, -2, -.9, 2.5];
    const kinds: PlanetKind[] = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    for (let i = 0; i < 8; i++) {
        const radius = orbitRadii[i]!;
        const geometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 161 }, (_, j) => {
            const angle = j / 160 * Math.PI * 2;
            return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        }));
        const orbit = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#7491a7', transparent: true, opacity: .18, depthWrite: false }));
        solar.add(orbit);
        // The Earth already seen on departure remains the same mesh all the way
        // into its orbit. Do not crossfade a second Earth into the solar system.
        if (i === 2) continue;
        const planet = makePlanet(bank, kinds[i]!, planetRadii[i]!);
        planet.position.set(Math.cos(phases[i]!) * radius, 0, Math.sin(phases[i]!) * radius);
        if (i === 5) {
            const rings = new THREE.Mesh(new THREE.RingGeometry(1.9, 3.1, 80), new THREE.MeshBasicMaterial({ color: '#bdb39a', side: THREE.DoubleSide, transparent: true, opacity: .60, depthWrite: false }));
            rings.rotation.x = -1.18; planet.add(rings);
        }
        solar.add(planet);
    }
    const structures = createCosmicStructures(quality);
    const layers = { earth, moon, sun, solar, galaxy: structures.galaxy, galaxies: structures.galaxies, universe: structures.universe };
    scene.add(...Object.values(layers));

    const fades = new Map<THREE.Object3D, (opacity: number) => void>();
    for (const group of [earth, moon, sun, solar]) {
        const entries: { material: THREE.Material; opacity: number; depthWrite: boolean }[] = [];
        group.traverse(object => {
            const mesh = object as THREE.Mesh;
            if (!mesh.material) return;
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                entries.push({ material, opacity: material.opacity, depthWrite: material.depthWrite });
                material.transparent = true;
                if (material instanceof THREE.ShaderMaterial) {
                    material.uniforms.cosmicOpacity = { value: 1 };
                    material.fragmentShader = 'uniform float cosmicOpacity;\n' + material.fragmentShader.replace(/}\s*$/, 'gl_FragColor.a *= cosmicOpacity;\n}');
                }
            }
        });
        fades.set(group, opacity => {
            for (const entry of entries) {
                entry.material.opacity = entry.opacity * opacity;
                if (entry.material instanceof THREE.ShaderMaterial) entry.material.uniforms.cosmicOpacity!.value = opacity;
                // A nearly invisible globe must not occlude the following scale.
                if (!(entry.material instanceof THREE.SpriteMaterial)) entry.material.depthWrite = opacity > .98 && entry.depthWrite;
            }
        });
    }

    const random = seeded(170264), starPositions: number[] = [], starSizes: number[] = [];
    for (let i = 0; i < 1100; i++) {
        starPositions.push((random() - .5) * 540, (random() - .5) * 440, (random() - .5) * 540);
        starSizes.push(.6 + random() * 1.4);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    const starMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { cosmicOpacity: { value: 0 } },
        vertexShader: 'attribute float size;varying float vAlpha;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vAlpha=clamp(1.-length(p.xyz)/420.,0.,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*140./max(20.,-p.z),.6,2.4);}',
        fragmentShader: 'uniform float cosmicOpacity;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r*r),2.);gl_FragColor=vec4(.66,.80,1.,a*vAlpha*cosmicOpacity);}' });
    const nearbyStars = new THREE.Points(starGeometry, starMaterial); nearbyStars.name = '飞行中的近处星点 · 视差示意'; scene.add(nearbyStars);
    let time = 0, flight = cosmicFlight(0);
    const apply = (group: THREE.Group, transform: CosmicTransform) => {
        group.position.fromArray(transform.position);
        group.scale.setScalar(transform.scale);
        group.visible = transform.opacity > .0001;
        const fade = fades.get(group) || group.userData.setOpacity;
        if (fade) fade(transform.opacity);
    };
    const planetRadiiByObject = [[earth, 6.33], [moon, 1.635], [sun, 3]] as const;
    const bounds = new THREE.Box3();
    const pack: WorldPack = {
        ...base, key: 'finale', cameraNear: .02, cameraFar: 12000,
        getCameraPose: () => ({ position: flight.position, target: flight.target, fov: flight.fov }),
        update(frame) {
            base.update(frame); time = frame.local; flight = cosmicFlight(time);
            camp.visible = flight.campVisible;
            daylight.visible = fill.visible = !flight.campVisible;
            for (const [name, group] of Object.entries(layers)) apply(group, flight[name as keyof typeof layers]);
            earth.rotation.y = .2 + time * .008; moon.rotation.y = .4 + time * .004;
            structures.update(time);
            for (const material of skyMaterials) material.uniforms.strength!.value = THREE.MathUtils.lerp(1.18, .026, span(time, 25, 43));
            starMaterial.uniforms.cosmicOpacity!.value = span(time, 5, 11) * (1 - span(time, 30, 45));
            base.follow.set(0, 0, 0);
            base.focus.fromArray(flight.target);
        },
        getObservationBounds(): ObservationBounds {
            if (flight.campVisible) return base.getObservationBounds();
            bounds.makeEmpty(); scene.updateMatrixWorld(true);
            for (const [name, group] of Object.entries(layers)) {
                if (flight[name as keyof typeof layers].opacity > .12) bounds.expandByObject(group);
            }
            const center = bounds.isEmpty() ? new THREE.Vector3(...flight.target) : bounds.getCenter(new THREE.Vector3());
            const radius = Math.max(2, bounds.isEmpty() ? 24 : bounds.getSize(new THREE.Vector3()).length() * .5);
            return { center, radius, minDistance: radius * 1.10 + 1, maxDistance: radius * 9 + 100,
                exclusionSpheres: planetRadiiByObject.filter(([object]) => object.visible).map(([object, radius]) => ({ center: object.getWorldPosition(new THREE.Vector3()), radius: radius * object.scale.x })) };
        },
        getPick: () => null,
    };
    // The base world's disposal traverses the complete scene, including all
    // new structures, geometries, shader materials and owned glow textures.
    return pack;
}
