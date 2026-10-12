/** v3 effects: a volume shader for fire, and depth-sorted, instanced smoke sheets.
 * No ConeGeometry and no THREE.Points. The box/quad is only the shader integration domain.
 * The story clock is the sole time source, including pause, speed changes and seeking.
 */
import * as THREE from 'three';
import { seeded, span } from './math';
import { recoveryState, launchTrajectory } from './motion';

export const VOLUME_NOISE = `
float hash31(vec3 p) {
  p = fract(p * .1031); p += dot(p, p.yzx + 33.33);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p) {
  vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),
                 mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),
                 mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm3(vec3 p) { return noise3(p)*.57 + noise3(p*2.03+13.7)*.28 + noise3(p*4.11+7.1)*.15; }
`;
export const FIRE_VERTEX = `varying vec3 vLocal;
void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export const FIRE_FRAGMENT = `
uniform float time, power, camp;
uniform vec3 localCamera, boxMin, boxMax;
varying vec3 vLocal;
${VOLUME_NOISE}
vec2 boxHit(vec3 ro, vec3 rd) {
  vec3 inv = 1.0 / (rd + vec3(.000001));
  vec3 a=(boxMin-ro)*inv,b=(boxMax-ro)*inv;
  vec3 lo=min(a,b),hi=max(a,b);
  return vec2(max(max(lo.x,lo.y),lo.z), min(min(hi.x,hi.y),hi.z));
}
void main() {
  if(power<.005) discard;
  vec3 rd=normalize(vLocal-localCamera);
  vec2 hit=boxHit(localCamera,rd);
  float begin=max(0.0,hit.x), end=hit.y;
  if(end<=begin) discard;
  const int STEPS=36;
  float ds=(end-begin)/float(STEPS);
  float jitter=hash31(vec3(gl_FragCoord.xy,0.0));
  vec3 emitted=vec3(0.0);float opacity=0.0;
  float throttle=clamp(power,0.0,1.35);
  float jetLength=6.32*clamp(.24+.76*pow(throttle,.64),.24,1.0);
  for(int i=0;i<STEPS;i++) {
    vec3 p=localCamera+rd*(begin+(float(i)+jitter)*ds);
    float h=camp>.5 ? p.y/3.2 : -p.y/jetLength;
    if(h<0.0 || h>1.0) continue;
    float density=0.0; float n=0.0; float coreFraction=0.0;
    if(camp>.5) {
      vec3 q=vec3(p.x,p.y-time*1.7,p.z)*2.9;
      n=fbm3(q);
      vec2 drift=vec2(sin(h*7.0-time*2.1),cos(h*8.0-time*1.6))*.14*h;
      float radius=mix(.69,.08,pow(h,.74));
      float tongues=min(length(p.xz-drift-vec2(-.22,.08)),
                        min(length(p.xz-drift-vec2(.21,.05)),length(p.xz-drift-vec2(0.0,-.2))));
      float edge=tongues/max(.03,radius)+(n-.5)*1.05;
      density=max(0.0,1.0-edge)*smoothstep(0.0,.055,h)*(1.0-smoothstep(.7,1.0,h));
      density*=.60+.75*noise3(q*1.7+4.0);
    } else {
      // A compact hot core feeds a wider, irregular shear layer. Noise travels
      // downstream with the jet; the bright core stays anchored at the nozzle.
      vec3 q=vec3(p.x*4.1,-p.y*2.15-time*(8.0+5.5*throttle),p.z*4.1);
      q.xz+=vec2(sin(q.y*.73+time*.7),cos(q.y*.59-time*.6))*.28*h;
      n=fbm3(q);
      float fine=noise3(q*2.31+vec3(7.0,0.0,13.0));
      vec2 wander=vec2(sin(h*14.0-time*5.8),cos(h*17.0-time*4.7))*.105*h*h;
      float radial=length(p.xz-wander);
      float width=(.33+.42*pow(h,.8))*mix(.74,1.0,min(throttle,1.0));
      float edge=radial/max(width,.035)+(n-.5)*mix(.18,.95,h)+(fine-.5)*.19*h;
      float entrained=pow(max(0.0,1.0-edge),1.35)*(.45+.8*n);
      entrained*=1.0-smoothstep(.55,1.0,h);
      float coreWidth=(.205+.075*h)*(.88+.12*cos(-p.y*7.0));
      float core=exp(-radial*radial/max(.001,coreWidth*coreWidth)*1.7);
      core*=1.0-smoothstep(.23,.72,h);
      density=(core*1.8+entrained*.82)*smoothstep(0.0,.016,h);
      coreFraction=core*1.8/max(.001,core*1.8+entrained*.82);
    }
    density*=clamp(power,0.0,1.6);
    float a=1.0-exp(-density*ds*(camp>.5?5.5:6.2));
    vec3 hot=mix(vec3(1.0,.16,.012),vec3(1.0,.83,.34),clamp(density*1.45,0.0,1.0));
    hot=mix(hot,vec3(1.0,.98,.87),pow(clamp(density,0.0,1.0),3.0));
    if(camp<.5){
      hot=mix(vec3(1.0,.21,.028),vec3(1.0,.72,.30),clamp(.5*n+.48*(1.0-h),0.0,1.0));
      hot=mix(hot,vec3(1.0,.98,.90),smoothstep(.18,.83,coreFraction));
      hot=mix(hot,vec3(.71,.85,1.0),coreFraction*(1.0-smoothstep(0.0,.10,h))*.56);
    }
    emitted+=(1.0-opacity)*a*hot*(camp>.5?2.5:2.9+coreFraction*3.4);
    opacity+=(1.0-opacity)*a;
    if(opacity>.985) break;
  }
  if(opacity<.006) discard;
  gl_FragColor=vec4(emitted/max(opacity,.001),opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
export function makeFlame(kind: 'rocket' | 'camp' = 'rocket') {
  const camp = kind === 'camp';
  const min = new THREE.Vector3(-1.15, camp ? 0 : -6.4, -1.15);
  const max = new THREE.Vector3(1.15, camp ? 3.2 : 0, 1.15);
  const g = new THREE.BoxGeometry(2.3, camp ? 3.2 : 6.4, 2.3);
  g.translate(0, camp ? 1.6 : -3.2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.NormalBlending,
    uniforms: { time: { value: 0 }, power: { value: 1 }, camp: { value: camp ? 1 : 0 },
      localCamera: { value: new THREE.Vector3() }, boxMin: { value: min }, boxMax: { value: max } },
    vertexShader: FIRE_VERTEX, fragmentShader: FIRE_FRAGMENT,
  });
  const mesh = new THREE.Mesh(g, mat);
  const inv = new THREE.Matrix4(), eye = new THREE.Vector3();
  mesh.frustumCulled = false;
  mesh.name = camp ? '体积篝火' : '发动机高温喷流';
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    inv.copy(mesh.matrixWorld).invert();
    camera.getWorldPosition(eye);
    mat.uniforms.localCamera!.value.copy(eye).applyMatrix4(inv);
  };
  return mesh;
}

export const SMOKE_VERTEX = `
attribute vec4 puff; attribute vec2 ageSeed;
uniform float rootScale;
varying vec2 vUv;varying vec2 vAgeSeed;varying float vViewDepth,vRadius;
void main(){vUv=uv;vAgeSeed=ageSeed;
 vec4 center=modelViewMatrix*vec4(puff.xyz,1.0);
 vViewDepth=-center.z;vRadius=puff.w*rootScale;
 float a=ageSeed.y*6.2831853; mat2 turn=mat2(cos(a),-sin(a),sin(a),cos(a));
 center.xy+=turn*position.xy*puff.w*2.0*rootScale;
 gl_Position=projectionMatrix*center;}
`;
export const SMOKE_FRAGMENT = `
uniform float power, small, launch;
uniform sampler2D sceneDepth;
uniform vec2 depthViewport;
uniform float softDepthEnabled, depthNear, depthFar, perspectiveDepth;
varying vec2 vUv,vAgeSeed;varying float vViewDepth,vRadius;
#include <packing>
${VOLUME_NOISE}
void main(){
 if(vAgeSeed.x<0.0||power<.001) discard;
 vec2 p=vUv*2.0-1.0; float d=length(p);
 if(d>1.0) discard;
 float front=sqrt(max(0.0,1.0-d*d));
 vec3 q=vec3(p*3.3,front*1.7)+vAgeSeed.y*17.0;
 float n=fbm3(q+vec3(0.0,vAgeSeed.x*.20,0.0));
 float lobes=.09*sin(atan(p.y,p.x)*5.0+vAgeSeed.y*11.0)+.065*sin(atan(p.y,p.x)*8.0);
 float boundary=d+lobes+(n-.5)*.32;
 float body=(1.0-smoothstep(.42,1.0,boundary))*front;
 float fade=smoothstep(0.0,.5,vAgeSeed.x)*(1.0-smoothstep(small>.5?5.0:15.0,small>.5?9.0:23.0,vAgeSeed.x));
 float a=(1.0-exp(-body*(.65+n*1.10)))*fade*power*(small>.5?.13:.69);
 if(softDepthEnabled>.5&&small<.5){
   float depth=texture2D(sceneDepth,gl_FragCoord.xy/depthViewport).x;
   float surface=-mix(orthographicDepthToViewZ(depth,depthNear,depthFar),perspectiveDepthToViewZ(depth,depthNear,depthFar),perspectiveDepth);
   // Both values are linear distances in this camera's view space, so the
   // intersection width remains stable when FOV, near/far or DPR changes.
   float contactWidth=clamp(vRadius*.38,.24,2.6);
   a*=smoothstep(0.0,contactWidth,surface-vViewDepth);
 }
 if(a<.003)discard;
 vec3 normal=normalize(vec3(p*.66,front));
 float lit=.55+.38*max(0.0,dot(normal,normalize(vec3(-.5,.8,.6))));
 float fresh=1.0-smoothstep(1.0,6.0,vAgeSeed.x);
 vec3 c=mix(vec3(.81,.84,.87),vec3(.39,.40,.43),fresh*.56)*lit;
 // Brief illumination of the newly entrained exhaust, cooling into grey steam.
 if(launch>.5&&small<.5){
   float heat=(1.0-smoothstep(.20,1.65,vAgeSeed.x))*body;
   c+=vec3(1.05,.29,.035)*heat*.62*min(power,1.0);
 }
 if(small>.5)c=vec3(.42,.44,.46)*lit;
 gl_FragColor=vec4(c,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export interface SmokeOptions { recovery?: boolean; radial?: boolean; trail?: boolean; launchKind?: string; acceleration?: number; turn?: number; emissionDuration?: number; }
export function makeSmoke(count = 160, small = false, options: SmokeOptions = {}) {
  const plane = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setIndex(plane.index!.clone());
  geometry.setAttribute('position', plane.attributes.position!.clone());
  geometry.setAttribute('uv', plane.attributes.uv!.clone());
  plane.dispose();
  geometry.instanceCount = count;
  const puff = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
  const ageSeed = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2);
  puff.setUsage(THREE.DynamicDrawUsage); ageSeed.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('puff', puff);geometry.setAttribute('ageSeed', ageSeed);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, blending: THREE.NormalBlending,
    uniforms: { time: { value: 0 }, power: { value: 0 }, small: { value: small ? 1 : 0 }, rootScale: { value: 1 },
      launch: { value: !small && !options.recovery && !options.radial ? 1 : 0 },
      sceneDepth: { value: null }, depthViewport: { value: new THREE.Vector2(1,1) },
      softDepthEnabled: { value: 0 }, depthNear: { value: .05 }, depthFar: { value: 4000 }, perspectiveDepth: { value: 1 },
      acceleration: { value: options.acceleration ?? .48 }, turn: { value: options.turn ?? .08 },
      emissionDuration: { value: options.emissionDuration ?? (options.trail ? 27 : 11) } },
    vertexShader: SMOKE_VERTEX, fragmentShader: SMOKE_FRAGMENT,
  });
  const mesh = new THREE.Mesh(geometry, mat), random = seeded(small ? 751 : options.trail ? 18017 : 1047);
  const records = Array.from({ length: count }, (_, index) => ({ index, seed: random(), a: random(), b: random(), c: random(), x: 0, y: 0, z: 0, radius: 0, age: -1, depth: 0 }));
  const sorted = [...records], point = new THREE.Vector3(), scale = new THREE.Vector3();
  mesh.name = options.recovery ? '回收阶段连续烟迹' : options.radial ? '着陆场扩散烟团' : small ? '篝火轻烟' : options.trail ? '连续排气烟柱' : '发射台翻卷烟团';
  mesh.frustumCulled = false;
  mesh.userData.softSmoke = !small;
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    const time = mat.uniforms.time!.value as number, duration = mat.uniforms.emissionDuration!.value as number;
    // Reflection cameras and standalone review renderers must not sample a depth
    // prepass generated for another camera or viewport.
    mat.uniforms.softDepthEnabled!.value = mat.userData.softSmokeCamera === camera ? 1 : 0;
    mesh.getWorldScale(scale);mat.uniforms.rootScale!.value = Math.max(scale.x,scale.y,scale.z);
    for (const p of records) {
      const birth = small ? 0 : (p.index / count) * duration;
      const age = small ? ((time*.65 + p.seed*9) % 9 + 9) % 9 : time-birth;
      p.age = age;
      if(age<0 || age>23){p.x=p.y=p.z=p.radius=0;p.depth=-Infinity;continue;}
      const angle = p.a*Math.PI*2;
      if(small){
        p.x=Math.sin(age*.75+p.a*6)*.18+age*.085;
        p.z=Math.cos(age*.55+p.b*6)*.17;
        p.y=.6+age*.49;
        p.radius=.20+age*.15;
      } else if(options.recovery){
        // The clock starts at the ground shot's chapter time (25 s). Only an
        // active burn can create a puff; existing puffs survive engine cutoff.
        const emitter=recoveryState(25+birth);
        if(!emitter.burning){p.x=p.y=p.z=p.radius=0;p.depth=-Infinity;continue;}
        const h=emitter.trajectory.engineY;
        p.x=emitter.trajectory.engineX+Math.cos(angle)*age*(.18+p.b*.06);
        p.z=Math.sin(angle)*age*(.18+p.c*.06);
        p.y=Math.max(.28,h-.6-age*(2.0+p.b*1.4));
        p.radius=.28+age*.30;
      } else if(options.radial){
        const spread=age*(.8+p.b*.7);
        p.x=Math.cos(angle)*spread; p.z=Math.sin(angle)*spread;
        p.radius=.55+age*.53; p.y=.28+age*.25+p.c*.35;
      } else if(options.trail){
        // The emitter's birthplace uses exactly the same hold-down and ascent
        // trajectory as its rocket. Once born, exhaust stays behind in space.
        const trajectory=options.launchKind ? launchTrajectory(options.launchKind,birth) : null;
        const h=trajectory?.height ?? birth*birth*(mat.uniforms.acceleration!.value as number);
        const turn=trajectory?.turn ?? span(birth,9,20)*(mat.uniforms.turn!.value as number);
        const x=trajectory?.x ?? h*turn*.5;
        p.x=x+Math.cos(angle)*age*.22;
        p.y=Math.max(.45,h+age*.17);
        p.z=Math.sin(angle)*age*.22;
        p.radius=.6+age*.43+(1-p.b)*.35;
      } else {
        // Fast low exhaust, rolling middle billows, and buoyant upper steam all
        // leave the +Z trench. Layered speeds prevent a symmetric expanding disc.
        const layer=p.index%3,sideways=p.seed<.5?-1:1;
        const head=1-Math.exp(-age*.9),roll=age*(.52+p.a*.27)+p.seed*Math.PI*2;
        p.radius=.62+age*(.42+p.c*.22)*(layer===2?1.10:.94);
        p.x=sideways*(.35+age*(.30+p.a*.52))+Math.sin(roll)*(.15+age*.06);
        p.z=1.45+age*(1.55+p.b*1.20)+head*(layer===0?1.6:layer===1?.8:.25);
        p.y=Math.max(.25,p.radius*.49+age*(layer===0?.025:layer===1?.12:.24)+Math.sin(roll)*p.radius*.16);
      }
      point.set(p.x,p.y,p.z).applyMatrix4(mesh.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      p.depth=-point.z;
    }
    sorted.sort((a,b)=>(b.depth-a.depth)||a.index-b.index);
    sorted.forEach((p,i)=>{puff.setXYZW(i,p.x,p.y,p.z,p.radius);ageSeed.setXY(i,p.age,p.seed);});
    puff.needsUpdate=true;ageSeed.needsUpdate=true;
  };
  return mesh;
}
