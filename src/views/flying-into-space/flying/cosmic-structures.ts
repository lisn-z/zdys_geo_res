import * as THREE from 'three';
import { createMilkyWayGalaxy } from './galaxy-disk';
import { createGalaxyField } from './galaxy-field';

/** Spatial scales, individual galaxies and the cosmic-web layout are teaching
 * illustrations, not a measured sky catalogue. The finite sample is an
 * observable region; it is not a physical wall or edge of the Universe. */
type CosmicSample = { positions:number[]; colors:number[]; sizes:number[]; alpha:number[] };
type CosmicStyle = 'star' | 'haze' | 'dust';

function cosmicRandom(seed:number) {
    let value=seed>>>0;
    return ()=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;};
}
function cosmicGaussian(random:()=>number) {
    return Math.max(-3,Math.min(3,Math.sqrt(-2*Math.log(Math.max(1e-8,random())))*Math.cos(random()*Math.PI*2)));
}
function cosmicSamples():CosmicSample { return {positions:[],colors:[],sizes:[],alpha:[]}; }
function cosmicPush(sample:CosmicSample,x:number,y:number,z:number,color:THREE.Color,size:number,alpha:number) {
    sample.positions.push(x,y,z);sample.colors.push(color.r,color.g,color.b);sample.sizes.push(size);sample.alpha.push(alpha);
}

const cosmicPointVertex=/* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    attribute float aAlpha;
    uniform float uViewportHeight;
    uniform float uPixelRatio;
    uniform float uMaxPointSize;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
        float scale=length(modelMatrix[0].xyz);
        float pixels=aSize*scale*uViewportHeight*projectionMatrix[1][1]/max(.05,-viewPosition.z);
        float minimumSize=.65*uPixelRatio;
        float coverage=min(1.0,pixels/minimumSize);
        gl_PointSize=clamp(pixels,minimumSize,uMaxPointSize*uPixelRatio);
        gl_Position=projectionMatrix*viewPosition;
        // A rasterised minimum-size point must retain only its true projected
        // area, otherwise thousands of shrinking stars collapse to a white dot.
        vColor=aColor;vAlpha=aAlpha*coverage*coverage;
    }
`;
const cosmicPointFragment=/* glsl */`
    uniform float uOpacity;
    uniform float uStyle;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
        float radius=length(gl_PointCoord-vec2(.5))*2.0;
        if(radius>1.0) discard;
        float rim=1.0-smoothstep(.68,1.0,radius);
        float profile;
        if(uStyle<.5) profile=(exp(-7.0*radius*radius)+.13*exp(-1.9*radius*radius))*rim;
        else if(uStyle<1.5) profile=exp(-3.2*radius*radius)*rim;
        else profile=exp(-2.0*radius*radius)*rim;
        float alpha=profile*vAlpha*uOpacity;
        if(alpha<.002) discard;
        gl_FragColor=vec4(vColor,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

function cosmicPoints(sample:CosmicSample,style:CosmicStyle,name:string) {
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(sample.positions,3));
    geometry.setAttribute('aColor',new THREE.Float32BufferAttribute(sample.colors,3));
    geometry.setAttribute('aSize',new THREE.Float32BufferAttribute(sample.sizes,1));
    geometry.setAttribute('aAlpha',new THREE.Float32BufferAttribute(sample.alpha,1));
    geometry.computeBoundingSphere();
    const material=new THREE.ShaderMaterial({
        vertexShader:cosmicPointVertex,fragmentShader:cosmicPointFragment,
        uniforms:{uOpacity:{value:1},uViewportHeight:{value:900},uPixelRatio:{value:1},uMaxPointSize:{value:style==='star'?18:54},uStyle:{value:style==='star'?0:style==='haze'?1:2}},
        transparent:true,depthTest:true,depthWrite:false,
        blending:style==='dust'?THREE.NormalBlending:THREE.AdditiveBlending,
    });
    material.userData.keepAlive=false;
    const points=new THREE.Points(geometry,material);points.name=name;
    // Haze supplies a low surface brightness; dust softly absorbs part of it;
    // individually resolved stars remain visible over both layers.
    points.renderOrder=style==='haze'?20:style==='dust'?21:22;
    const viewport=new THREE.Vector2();
    points.onBeforeRender=renderer=>{
        renderer.getDrawingBufferSize(viewport);
        material.uniforms.uViewportHeight!.value=viewport.y;
        material.uniforms.uPixelRatio!.value=renderer.getPixelRatio();
    };
    return points;
}

function cosmicSetFade(group:THREE.Group,radius:number) {
    const materials:THREE.ShaderMaterial[]=[];let count=0;
    group.traverse(object=>{
        if(object instanceof THREE.Points){
            materials.push(object.material as THREE.ShaderMaterial);
            count+=object.geometry.getAttribute('position').count;
        }
    });
    group.userData.setOpacity=(alpha:number)=>{
        const value=Number.isFinite(alpha)?Math.max(0,Math.min(1,alpha)):0;
        for(const material of materials)material.uniforms.uOpacity!.value=value;
    };
    group.userData.pointCount=count;group.userData.radius=radius;
    group.userData.illustration='空间尺度、密度和排列为教学示意';
}

function cosmicWeb(multiplier:number) {
    const group=new THREE.Group();group.name='可观测宇宙 · 星系纤维与空洞示意';
    const filaments=cosmicSamples(),knots=cosmicSamples(),haze=cosmicSamples(),random=cosmicRandom(901237);
    const cold=new THREE.Color('#8295bd'),violet=new THREE.Color('#9d8eae'),warm=new THREE.Color('#b8aaa2');
    const nodes:THREE.Vector3[]=[];
    for(let attempts=0;nodes.length<44&&attempts<5000;attempts++){
        const azimuth=random()*Math.PI*2,vertical=random()*2-1,radius=5+20.3*Math.pow(random(),.58);
        const ring=Math.sqrt(1-vertical*vertical),candidate=new THREE.Vector3(Math.cos(azimuth)*ring,vertical,Math.sin(azimuth)*ring).multiplyScalar(radius);
        if(nodes.every(node=>node.distanceTo(candidate)>5.1))nodes.push(candidate);
    }
    // A connected irregular backbone with a few secondary links creates voids
    // without looking like the edges of a triangulated ball or a constellation.
    const pairs:[number,number][]=[];const used=new Set<string>(),connected=new Set([0]);
    const link=(a:number,b:number)=>{
        const key=[Math.min(a,b),Math.max(a,b)].join(':');
        if(!used.has(key)){used.add(key);pairs.push([a,b]);}
    };
    while(connected.size<nodes.length){
        let a=0,b=0,distance=Infinity;
        for(const from of connected)for(let to=0;to<nodes.length;to++)if(!connected.has(to)){
            const candidate=nodes[from]!.distanceToSquared(nodes[to]!);
            if(candidate<distance){distance=candidate;a=from;b=to;}
        }
        link(a,b);connected.add(b);
    }
    nodes.forEach((node,index)=>{
        if(index%3!==0)return;
        const nearest=nodes.map((other,i)=>({i,distance:node.distanceTo(other)}))
            .filter(other=>other.i!==index&&!used.has([Math.min(index,other.i),Math.max(index,other.i)].join(':')))
            .sort((a,b)=>a.distance-b.distance)[0];
        if(nearest)link(index,nearest.i);
    });
    const curves=pairs.map(([a,b])=>{
        const start=nodes[a]!,end=nodes[b]!,direction=end.clone().sub(start).normalize();
        const across=new THREE.Vector3().crossVectors(direction,new THREE.Vector3(0,1,0));
        if(across.lengthSq()<.01)across.crossVectors(direction,new THREE.Vector3(1,0,0));
        across.normalize();const up=new THREE.Vector3().crossVectors(direction,across).normalize();
        const bend=Math.min(4.0,start.distanceTo(end)*.34),side=random()>.5?1:-1;
        const c1=start.clone().lerp(end,.29).addScaledVector(across,bend*side).addScaledVector(up,bend*(random()-.5));
        const c2=start.clone().lerp(end,.72).addScaledVector(across,-bend*side*.65).addScaledVector(up,bend*(random()-.5));
        return new THREE.CubicBezierCurve3(start,c1,c2,end);
    });
    const branches=curves.map(curve=>{
        const t=.18+random()*.63,start=curve.getPoint(t),direction=curve.getTangent(t);
        const drift=new THREE.Vector3(cosmicGaussian(random),cosmicGaussian(random),cosmicGaussian(random)).normalize();
        drift.addScaledVector(direction,-drift.dot(direction)).normalize();
        const length=1.9+random()*3.1,end=start.clone().addScaledVector(drift,length).addScaledVector(direction,length*.4);
        const c1=start.clone().addScaledVector(direction,length*.55),c2=end.clone().addScaledVector(drift,-length*.25).addScaledVector(direction,length*.2);
        return new THREE.CubicBezierCurve3(start,c1,c2,end);
    });
    const point=new THREE.Vector3();
    for(let i=0;i<Math.round(10000*multiplier);i++){
        const curve=curves[i%curves.length]!,t=random(),width=.22+.32*Math.sin(Math.PI*t)**2;
        curve.getPoint(t,point);
        point.add(new THREE.Vector3(cosmicGaussian(random)*width,cosmicGaussian(random)*width,cosmicGaussian(random)*width));
        const color=cold.clone().lerp(violet,random()*.55),patch=.65+.35*Math.sin(t*17+i%7)**2;
        cosmicPush(filaments,point.x,point.y,point.z,color,.045+random()*.105,(.14+random()*.24)*patch);
    }
    for(let i=0;i<Math.round(4000*multiplier);i++){
        const t=random(),width=.14+.20*t;
        branches[i%branches.length]!.getPoint(t,point);
        point.add(new THREE.Vector3(cosmicGaussian(random)*width,cosmicGaussian(random)*width,cosmicGaussian(random)*width));
        cosmicPush(filaments,point.x,point.y,point.z,cold.clone().lerp(violet,.55),.05+random()*.10,(.14+random()*.13)*(1-t*.72));
    }
    for(let i=0;i<Math.round(1800*multiplier);i++){
        const center=nodes[i%nodes.length]!,spread=.38+random()*.60;
        point.copy(center).add(new THREE.Vector3(cosmicGaussian(random)*spread,cosmicGaussian(random)*spread,cosmicGaussian(random)*spread));
        cosmicPush(knots,point.x,point.y,point.z,warm.clone().lerp(cold,random()*.45),.06+random()*.10,.25+random()*.28);
    }
    for(let i=0;i<Math.round(1300*multiplier);i++){
        const atNode=i%5===0;
        if(atNode)point.copy(nodes[i%nodes.length]!);
        else (i%3===0?branches:curves)[i%(i%3===0?branches.length:curves.length)]!.getPoint(random(),point);
        point.add(new THREE.Vector3(cosmicGaussian(random)*.24,cosmicGaussian(random)*.24,cosmicGaussian(random)*.24));
        cosmicPush(haze,point.x,point.y,point.z,cold.clone().lerp(violet,.35),.85+random()*1.15,atNode?.025:.018);
    }
    group.add(cosmicPoints(haze,'haze','宇宙网 · 节点弥散光'),cosmicPoints(filaments,'star','宇宙网 · 三维弯曲纤维'),cosmicPoints(knots,'star','宇宙网 · 星系团节点'));
    cosmicSetFade(group,28);return group;
}

export function createCosmicStructures(quality:'balanced'|'high') {
    const multiplier=quality==='high'?1.55:1;
    const galaxy=createMilkyWayGalaxy(quality),galaxies=createGalaxyField(quality),universe=cosmicWeb(multiplier);
    return {
        galaxy,galaxies,universe,
        // On film timescales these structures do not physically rotate or
        // rearrange. A pure, state-free update preserves exact backwards seeks;
        // camera motion and group opacity are controlled by the parent scene.
        update(_time:number):void {},
    };
}
