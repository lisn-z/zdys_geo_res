import * as THREE from 'three';

// A continuous, optically thin stellar disc, not a chain of cloud sprites.
// Milky Way structure is an illustration: we cannot photograph our Galaxy
// from outside. All dimensions here are compressed into the finale's scale.
const galaxyDiskVertex = /* glsl */`
  varying vec2 vGalaxyPosition;
  void main() {
    vGalaxyPosition = vec2(position.x,-position.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const galaxyDiskFragment = /* glsl */`
  uniform float uOpacity;
  uniform float uLayerWeight;
  varying vec2 vGalaxyPosition;
  float galaxyHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453);
  }
  float galaxyNoise(vec2 p) {
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(mix(galaxyHash(i),galaxyHash(i+vec2(1,0)),f.x),
      mix(galaxyHash(i+vec2(0,1)),galaxyHash(i+vec2(1,1)),f.x),f.y);
  }
  float galaxyFbm(vec2 p) {
    float n=0.0,a=.5;
    mat2 turn=mat2(.8,-.6,.6,.8);
    for(int i=0;i<5;i++) {
      n+=a*galaxyNoise(p);
      p=turn*p*2.03+vec2(13.7,8.2);a*=.5;
    }
    return n;
  }
  void main() {
    vec2 p=vGalaxyPosition;
    float r=length(p);
    float edge=1.0-smoothstep(17.0,24.0,r);
    if(edge<.0002) discard;
    float theta=atan(p.y,p.x);
    float broad=galaxyFbm(p*.38);
    vec2 flow=p+vec2(galaxyFbm(p*.49),galaxyFbm(p*.49+13.0))*1.8;
    float granular=galaxyFbm(flow*2.2+vec2(9.0,4.0));
    float fine=galaxyNoise(p*14.0);
    // Uneven stellar arms, interrupted branches and spurs.
    // Their low contrast preserves the full underlying exponential disc.
    float phase=theta-2.20*log(max(r,2.6)/4.0)-.38
      +.46*(broad-.5)+.085*sin(r*1.45+theta*3.0);
    float width=4.0+4.5*galaxyFbm(flow*.75);
    float arm=exp(-pow(abs(sin(phase))*width,2.0));
    float segments=.13+.87*smoothstep(.27,.71,galaxyFbm(flow*.57+3.0));
    float branch=exp(-pow(abs(sin(phase*2.0+.58+.30*sin(r*.63)))*5.0,2.0))
      *smoothstep(.23,.65,galaxyFbm(flow*.66+13.0));
    float spur=exp(-pow(abs(sin(phase*3.0+1.25+.28*sin(r*.93)))*7.0,2.0))
      *smoothstep(.37,.67,galaxyFbm(flow*.96-7.0));
    float armGate=smoothstep(3.1,6.5,r);
    float oldDisc=exp(-r/8.1)*edge;
    float armLight=(arm*.22*segments+branch*.27+spur*.21)*armGate;
    float clumps=.62+.60*broad+.24*granular;
    float disc=oldDisc*(.50+armLight*clumps);
    // Absorbing lanes cross the bright disc rather than becoming black holes.
    float lane=exp(-pow(abs(sin(phase+.16+(broad-.5)*.34))*16.0,2.0));
    float thread=exp(-pow(abs(sin(phase*3.0+.46+.44*granular))*14.0,2.0));
    float veins=smoothstep(.31,.66,galaxyFbm(flow*1.35+vec2(-8.0,2.0)));
    float dust=1.0-armGate*(lane*.60+thread*.25)*(.28+.72*veins);
    dust*=.49+.58*granular;
    // An extended old stellar bar with a compact, softly rounded bulge.
    vec2 bar=mat2(.947,-.322,.322,.947)*p;
    float barLight=exp(-pow(length(bar/vec2(4.6,1.8)),1.6))*.37;
    float bulge=exp(-pow(r/2.5,1.30))*.39;
    vec3 oldColor=vec3(.64,.59,.50);
    vec3 youngColor=vec3(.61,.70,.79);
    vec3 discColor=mix(oldColor,youngColor,clamp(armLight*1.15,0.0,.72));
    vec3 color=discColor*disc*dust*(.77+.25*broad+.12*fine);
    color+=vec3(.80,.68,.51)*(barLight+bulge);
    // Sparse, muted H-II complexes, embedded in the arms rather than dots.
    float regions=smoothstep(.73,.86,galaxyFbm(p*2.9+21.0))
      *arm*armGate*oldDisc;
    color+=vec3(.38,.10,.105)*regions*.33;
    gl_FragColor=vec4(color*.72,uLayerWeight*uOpacity*edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const galaxyStarVertex = /* glsl */`
  attribute vec3 aGalaxyColor;
  attribute float aGalaxySize;
  attribute float aGalaxyAlpha;
  uniform float uViewportHeight;
  uniform float uPixelRatio;
  varying vec3 vGalaxyColor;
  varying float vGalaxyAlpha;
  void main() {
    vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
    float scale=length(modelMatrix[0].xyz);
    float pixels=aGalaxySize*scale*uViewportHeight*projectionMatrix[1][1]/max(.05,-viewPosition.z);
    float minimum=.60*uPixelRatio;
    float coverage=min(1.0,pixels/minimum);
    gl_PointSize=clamp(pixels,minimum,2.3*uPixelRatio);
    gl_Position=projectionMatrix*viewPosition;
    vGalaxyColor=aGalaxyColor;
    vGalaxyAlpha=aGalaxyAlpha*coverage*coverage;
  }
`;

const galaxyStarFragment = /* glsl */`
  uniform float uOpacity;
  varying vec3 vGalaxyColor;
  varying float vGalaxyAlpha;
  void main() {
    float r=length(gl_PointCoord-.5)*2.0;
    if(r>1.0) discard;
    float light=exp(-5.0*r*r)*(1.0-smoothstep(.65,1.0,r));
    gl_FragColor=vec4(vGalaxyColor,light*vGalaxyAlpha*uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function galaxyRandom(seed:number) {
  let state=seed>>>0;
  return ()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
}
function galaxyGaussian(random:()=>number) {
  return Math.max(-3.4,Math.min(3.4,Math.sqrt(-2*Math.log(Math.max(1e-8,random())))*Math.cos(random()*Math.PI*2)));
}

export function createMilkyWayGalaxy(quality:'balanced'|'high'):THREE.Group {
  const galaxyGroup=new THREE.Group();
  galaxyGroup.name='银河系 · 连续恒星盘、中央棒与暗尘带';
  const galaxyMaterials:THREE.ShaderMaterial[]=[];
  // Close layers give the diffuse light finite thickness. Individually placed
  // stars and the ellipsoidal central population remain genuinely 3-D.
  [-.25,0,.25].forEach((height,index)=>{
    const material=new THREE.ShaderMaterial({
      vertexShader:galaxyDiskVertex,fragmentShader:galaxyDiskFragment,
      uniforms:{uOpacity:{value:1},uLayerWeight:{value:index===1?.56:.22}},
      transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,
      blending:THREE.AdditiveBlending,
    });
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(48,48),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.y=height;
    mesh.name=`银河系 · 连续星光薄盘 ${index+1}`;mesh.renderOrder=20+index;
    galaxyGroup.add(mesh);galaxyMaterials.push(material);
  });
  const random=galaxyRandom(518274),count=quality==='high'?46000:35000;
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3);
  const sizes=new Float32Array(count),alphas=new Float32Array(count);
  const warm=new THREE.Color('#e5d2af'),neutral=new THREE.Color('#d9d8d0'),blue=new THREE.Color('#b7cbe1');
  const color=new THREE.Color();
  for(let i=0;i<count;i++) {
    let x:number,y:number,z:number,brightness:number;
    const core=i<count*.18,halo=i>=count*.97;
    if(core) {
      const spread=i%4===0?1.0:1.7;
      const bx=galaxyGaussian(random)*spread*1.67,bz=galaxyGaussian(random)*spread*.57;
      x=bx*.947+bz*.322;z=-bx*.322+bz*.947;
      y=galaxyGaussian(random)*(.30+spread*.28);
      color.copy(warm).lerp(neutral,random()*.48);brightness=.40+random()*.38;
    } else if(halo) {
      const r=7+random()*17,angle=random()*Math.PI*2,elevation=(random()-.5)*1.2;
      x=Math.cos(angle)*Math.cos(elevation)*r;z=Math.sin(angle)*Math.cos(elevation)*r;
      y=Math.sin(elevation)*r*.36;
      color.copy(warm).lerp(neutral,random()*.6);brightness=.15+random()*.15;
    } else {
      let r=25;
      while(r>23.6)r=-Math.log(Math.max(1e-8,random()*random()))*5.4;
      let angle=random()*Math.PI*2;
      const arm=i%12===0&&r>4;
      if(arm) {
        const branch=[0,1.35,2.91,4.38,5.48][Math.floor(random()*5)]!;
        angle=branch+2.20*Math.log(r/4)+.38+Math.sin(r*1.13+branch)*.13+galaxyGaussian(random)*.24;
      }
      x=Math.cos(angle)*r;z=Math.sin(angle)*r;
      y=galaxyGaussian(random)*(.15+.010*r)*(arm?.65:1.5);
      color.copy(neutral).lerp(arm?blue:warm,random()*(arm?.7:.5));
      const phase=angle-2.20*Math.log(Math.max(r,2.6)/4)-.38;
      const lane=Math.exp(-Math.pow(Math.sin(phase+.115)*12,2));
      const edge=1-Math.max(0,Math.min(1,(r-18)/5.8));
      brightness=(.40+random()*.48)*(1-lane*.43)*edge;
    }
    positions[i*3]=x;positions[i*3+1]=y;positions[i*3+2]=z;
    colors[i*3]=color.r;colors[i*3+1]=color.g;colors[i*3+2]=color.b;
    sizes[i]=.022+Math.pow(random(),3)*.043;
    if(i%613===0){sizes[i]=.095;brightness*=1.1;}
    alphas[i]=brightness;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aGalaxyColor',new THREE.BufferAttribute(colors,3));
  geometry.setAttribute('aGalaxySize',new THREE.BufferAttribute(sizes,1));
  geometry.setAttribute('aGalaxyAlpha',new THREE.BufferAttribute(alphas,1));
  geometry.computeBoundingSphere();
  const material=new THREE.ShaderMaterial({
    vertexShader:galaxyStarVertex,fragmentShader:galaxyStarFragment,
    uniforms:{uOpacity:{value:1},uViewportHeight:{value:900},uPixelRatio:{value:1}},
    transparent:true,depthTest:true,depthWrite:false,blending:THREE.AdditiveBlending,
  });
  const stars=new THREE.Points(geometry,material);stars.name='银河系 · 三维盘面恒星与核球';stars.renderOrder=24;
  const viewport=new THREE.Vector2();
  stars.onBeforeRender=renderer=>{
    renderer.getDrawingBufferSize(viewport);
    material.uniforms.uViewportHeight!.value=viewport.y;
    material.uniforms.uPixelRatio!.value=renderer.getPixelRatio();
  };
  galaxyGroup.add(stars);galaxyMaterials.push(material);
  galaxyGroup.userData.setOpacity=(alpha:number)=>{
    const opacity=Number.isFinite(alpha)?Math.max(0,Math.min(1,alpha)):0;
    for(const material of galaxyMaterials)material.uniforms.uOpacity!.value=opacity;
  };
  galaxyGroup.userData.pointCount=count;galaxyGroup.userData.radius=24;
  galaxyGroup.userData.illustration='银河系外观为基于结构认识的示意，非银河系外部实拍';
  return galaxyGroup;
}
