import * as THREE from 'three';

// An illustrative three-dimensional neighbourhood of galaxies. Each system
// has a fixed position and orientation; none of the discs face the camera.
const fieldDiscVertex = /* glsl */`
  attribute vec4 aFieldParams;
  varying vec2 vFieldUv;
  varying vec4 vFieldParams;
  void main() {
    vFieldUv=uv*2.0-1.0;
    vFieldParams=aFieldParams;
    gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);
  }
`;

const fieldDiscFragment = /* glsl */`
  uniform float uOpacity;
  uniform float uFieldWeight;
  varying vec2 vFieldUv;
  varying vec4 vFieldParams;
  float fieldHash(vec2 p) {
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
  }
  float fieldNoise(vec2 p) {
    vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(fieldHash(i),fieldHash(i+vec2(1,0)),f.x),
      mix(fieldHash(i+vec2(0,1)),fieldHash(i+vec2(1,1)),f.x),f.y);
  }
  float fieldFbm(vec2 p) {
    float value=0.0,weight=.5;
    for(int i=0;i<4;i++) {
      value+=weight*fieldNoise(p);
      p=mat2(.8,-.6,.6,.8)*p*2.07+vec2(17.1,8.7);weight*=.5;
    }
    return value;
  }
  void main() {
    vec2 p=vFieldUv;
    float r=length(p),edge=1.0-smoothstep(.69,1.0,r);
    if(edge<.001) discard;
    float seed=vFieldParams.x,type=vFieldParams.y;
    float brightness=vFieldParams.z,tint=vFieldParams.w;
    float grain=fieldFbm(p*12.0+seed);
    vec3 warm=vec3(.83,.69,.49),white=vec3(.72,.73,.71),blue=vec3(.56,.67,.81);
    vec3 light;
    if(type>.72) {
      // Smooth ellipsoids with different concentrations, rather than tiny
      // spirals repeated hundreds of times in the distant population.
      float concentration=mix(3.6,6.2,fract(seed*.37));
      float halo=exp(-pow(r*concentration,.90));
      float core=exp(-r*r*95.0)*.23;
      light=mix(warm,white,tint*.48)*(halo*.77+core);
    } else {
      float theta=atan(p.y,p.x);
      float pitch=1.5+fract(seed*.23)*1.0;
      float phase=theta-pitch*log(max(r,.095)/.19)+seed;
      phase+=(grain-.5)*.60;
      float armCount=type<.28?2.0:3.0;
      float arm=pow(.5+.5*cos(phase*armCount),5.0);
      float branches=pow(.5+.5*cos(phase*(armCount+1.0)+.7*sin(r*18.0)),8.0);
      float gate=smoothstep(.12,.28,r);
      float oldDisc=exp(-r*3.4);
      float arms=(arm*.38+branches*.12)*gate*(.47+.80*grain);
      float lane=pow(.5+.5*cos((phase+.12)*armCount),25.0);
      float dust=1.0-lane*gate*(.30+.34*grain);
      float disc=oldDisc*(.39+arms)*dust*(.72+.43*grain);
      vec2 bar=mat2(cos(seed),-sin(seed),sin(seed),cos(seed))*p;
      float barLight=type<.28?exp(-length(bar/vec2(.26,.075)))*.48:0.0;
      float core=exp(-pow(r/.125,1.35))*.61;
      light=mix(white,blue,clamp(arms*1.35+tint*.15,0.0,.70))*disc;
      light+=warm*(core+barLight);
      float nebula=smoothstep(.71,.89,fieldFbm(p*25.0+seed+31.0))*arm*gate*oldDisc;
      light+=vec3(.33,.075,.10)*nebula*.20;
    }
    gl_FragColor=vec4(light*brightness,uOpacity*uFieldWeight*edge);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const fieldStarVertex = /* glsl */`
  attribute vec3 aFieldColor;
  attribute float aFieldSize;
  attribute float aFieldAlpha;
  uniform float uFieldViewportHeight;
  uniform float uFieldPixelRatio;
  varying vec3 vFieldColor;
  varying float vFieldAlpha;
  void main() {
    vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
    float scale=length(modelMatrix[0].xyz);
    float pixels=aFieldSize*scale*uFieldViewportHeight*projectionMatrix[1][1]/max(.05,-viewPosition.z);
    float minimum=.55*uFieldPixelRatio;
    float coverage=min(1.0,pixels/minimum);
    gl_PointSize=clamp(pixels,minimum,2.2*uFieldPixelRatio);
    gl_Position=projectionMatrix*viewPosition;
    vFieldColor=aFieldColor;vFieldAlpha=aFieldAlpha*coverage*coverage;
  }
`;

const fieldStarFragment = /* glsl */`
  uniform float uOpacity;
  varying vec3 vFieldColor;
  varying float vFieldAlpha;
  void main() {
    float r=length(gl_PointCoord-.5)*2.0;
    if(r>1.0) discard;
    float light=exp(-5.5*r*r)*(1.0-smoothstep(.60,1.0,r));
    gl_FragColor=vec4(vFieldColor,light*vFieldAlpha*uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function fieldRandom(seed:number) {
  let fieldState=seed>>>0;
  return ()=>{fieldState=(Math.imul(fieldState,1664525)+1013904223)>>>0;return fieldState/4294967296;};
}

function fieldGaussian(fieldNext:()=>number) {
  return Math.max(-2.6,Math.min(2.6,Math.sqrt(-2*Math.log(Math.max(1e-8,fieldNext())))*Math.cos(fieldNext()*Math.PI*2)));
}

type FieldSystem = {
  center:THREE.Vector3;
  orientation:THREE.Quaternion;
  radius:number;
  flattening:number;
  seed:number;
  type:number;
  brightness:number;
  tint:number;
  nearby:boolean;
};

export function createGalaxyField(quality:'balanced'|'high'):THREE.Group {
  const fieldGroup=new THREE.Group();
  fieldGroup.name='星系之间 · 多层深空星系群';
  const fieldNearCount=quality==='high'?40:32,fieldFarCount=quality==='high'?260:180;
  const fieldNext=fieldRandom(940273),fieldSystems:FieldSystem[]=[];
  // Loose associations leave dark gaps and filaments; the central Milky Way
  // enters this scene separately and retains its own uncluttered neighbourhood.
  const fieldCenters: readonly (readonly [number, number, number])[]=[
    [-42,-12,-20],[-22,15,-32],[6,-9,-25],[34,9,-15],
    [43,-13,19],[16,18,37],[-24,-16,31],[-46,5,18],
  ];
  for(let fieldIndex=0;fieldIndex<fieldNearCount+fieldFarCount;fieldIndex++) {
    const fieldNearby=fieldIndex<fieldNearCount;
    const fieldCluster=fieldCenters[fieldIndex%fieldCenters.length]!;
    const fieldSpread=fieldNearby?6.0:10.0;
    let fieldCenter=new THREE.Vector3();
    for(let fieldAttempt=0;fieldAttempt<80;fieldAttempt++) {
      fieldCenter.set(
        THREE.MathUtils.clamp(fieldCluster[0]+fieldGaussian(fieldNext)*fieldSpread,-60,60),
        THREE.MathUtils.clamp(fieldCluster[1]+fieldGaussian(fieldNext)*fieldSpread*.72,-30,30),
        THREE.MathUtils.clamp(fieldCluster[2]+fieldGaussian(fieldNext)*fieldSpread,-55,55),
      );
      if(fieldCenter.length()<17)continue;
      // Preserve depth while preventing near systems from visibly intersecting.
      if(!fieldNearby||fieldSystems.every(fieldOther=>!fieldOther.nearby||fieldOther.center.distanceTo(fieldCenter)>7.0))break;
    }
    const fieldType=fieldNext();
    const fieldOrientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(
      -.24-fieldNext()*2.60,fieldNext()*Math.PI*2,fieldNext()*Math.PI*2,
    ));
    fieldSystems.push({
      center:fieldCenter,orientation:fieldOrientation,
      radius:fieldNearby?2.2+fieldNext()*2.0:.30+Math.pow(fieldNext(),1.1)*1.05,
      flattening:fieldType>.72?.57+fieldNext()*.40:1,
      seed:fieldNext()*53+1,type:fieldType,
      brightness:fieldNearby?.94+fieldNext()*.60:.42+fieldNext()*.43,
      tint:fieldNext(),nearby:fieldNearby,
    });
  }
  const fieldCount=fieldSystems.length,fieldParams=new Float32Array(fieldCount*4);
  fieldSystems.forEach((fieldSystem,fieldIndex)=>{
    fieldParams.set([fieldSystem.seed,fieldSystem.type,fieldSystem.brightness,fieldSystem.tint],fieldIndex*4);
  });
  const fieldMaterials:THREE.ShaderMaterial[]=[];
  const fieldMatrix=new THREE.Matrix4(),fieldPosition=new THREE.Vector3(),fieldScale=new THREE.Vector3();
  // Three parallel slices give each projected disc thickness. The point layer
  // below fills bulges and disc interiors without large cloudy particle arms.
  [-.035,0,.035].forEach((fieldHeight,fieldLayer)=>{
    const fieldGeometry=new THREE.PlaneGeometry(2,2);
    fieldGeometry.setAttribute('aFieldParams',new THREE.InstancedBufferAttribute(fieldParams,4));
    const fieldMaterial=new THREE.ShaderMaterial({
      vertexShader:fieldDiscVertex,fragmentShader:fieldDiscFragment,
      uniforms:{uOpacity:{value:1},uFieldWeight:{value:fieldLayer===1?.60:.20}},
      transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    });
    const fieldMesh=new THREE.InstancedMesh(fieldGeometry,fieldMaterial,fieldCount);
    fieldMesh.name=`星系群 · 连续盘与椭圆星系 ${fieldLayer+1}`;
    fieldMesh.renderOrder=25+fieldLayer;
    fieldSystems.forEach((fieldSystem,fieldIndex)=>{
      fieldPosition.set(0,0,fieldHeight*fieldSystem.radius).applyQuaternion(fieldSystem.orientation).add(fieldSystem.center);
      fieldScale.set(fieldSystem.radius,fieldSystem.radius*fieldSystem.flattening,fieldSystem.radius);
      fieldMatrix.compose(fieldPosition,fieldSystem.orientation,fieldScale);
      fieldMesh.setMatrixAt(fieldIndex,fieldMatrix);
    });
    fieldMesh.instanceMatrix.needsUpdate=true;
    fieldMesh.computeBoundingSphere();
    fieldGroup.add(fieldMesh);fieldMaterials.push(fieldMaterial);
  });
  const fieldStarCount=fieldNearCount*(quality==='high'?150:120);
  const fieldPositions=new Float32Array(fieldStarCount*3),fieldColors=new Float32Array(fieldStarCount*3);
  const fieldSizes=new Float32Array(fieldStarCount),fieldAlphas=new Float32Array(fieldStarCount);
  const fieldWarm=new THREE.Color('#e4c699'),fieldWhite=new THREE.Color('#d9dfdd'),fieldBlue=new THREE.Color('#b9cee4');
  const fieldColor=new THREE.Color(),fieldPoint=new THREE.Vector3();
  for(let fieldIndex=0;fieldIndex<fieldStarCount;fieldIndex++) {
    const fieldSystem=fieldSystems[fieldIndex%fieldNearCount]!,fieldCore=fieldIndex%5===0||fieldSystem.type>.72;
    let fieldRadius:number,fieldAngle:number,fieldHeight:number;
    if(fieldCore) {
      fieldPoint.set(fieldGaussian(fieldNext)*.13,fieldGaussian(fieldNext)*.095,fieldGaussian(fieldNext)*.085);
      fieldColor.copy(fieldWarm).lerp(fieldWhite,fieldNext()*.35);
    } else {
      fieldRadius=Math.min(.98,-Math.log(Math.max(1e-8,fieldNext()*fieldNext()))*.16);
      fieldAngle=fieldNext()*Math.PI*2;fieldHeight=fieldGaussian(fieldNext)*.018;
      fieldPoint.set(Math.cos(fieldAngle)*fieldRadius,Math.sin(fieldAngle)*fieldRadius*fieldSystem.flattening,fieldHeight);
      fieldColor.copy(fieldWhite).lerp(fieldBlue,fieldNext()*.55);
    }
    fieldPoint.multiplyScalar(fieldSystem.radius).applyQuaternion(fieldSystem.orientation).add(fieldSystem.center);
    fieldPositions.set(fieldPoint.toArray(),fieldIndex*3);
    fieldColors.set([fieldColor.r,fieldColor.g,fieldColor.b],fieldIndex*3);
    fieldSizes[fieldIndex]=fieldSystem.radius*(.009+Math.pow(fieldNext(),3)*.014);
    fieldAlphas[fieldIndex]=.30+fieldNext()*.33;
  }
  const fieldStarGeometry=new THREE.BufferGeometry();
  fieldStarGeometry.setAttribute('position',new THREE.BufferAttribute(fieldPositions,3));
  fieldStarGeometry.setAttribute('aFieldColor',new THREE.BufferAttribute(fieldColors,3));
  fieldStarGeometry.setAttribute('aFieldSize',new THREE.BufferAttribute(fieldSizes,1));
  fieldStarGeometry.setAttribute('aFieldAlpha',new THREE.BufferAttribute(fieldAlphas,1));
  fieldStarGeometry.computeBoundingSphere();
  const fieldStarMaterial=new THREE.ShaderMaterial({
    vertexShader:fieldStarVertex,fragmentShader:fieldStarFragment,
    uniforms:{uOpacity:{value:1},uFieldViewportHeight:{value:900},uFieldPixelRatio:{value:1}},
    transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,
  });
  const fieldStars=new THREE.Points(fieldStarGeometry,fieldStarMaterial);
  fieldStars.name='星系群 · 有深度的恒星盘与核球';fieldStars.renderOrder=28;
  const fieldViewport=new THREE.Vector2();
  fieldStars.onBeforeRender=fieldRenderer=>{
    fieldRenderer.getDrawingBufferSize(fieldViewport);
    fieldStarMaterial.uniforms.uFieldViewportHeight!.value=fieldViewport.y;
    fieldStarMaterial.uniforms.uFieldPixelRatio!.value=fieldRenderer.getPixelRatio();
  };
  fieldGroup.add(fieldStars);fieldMaterials.push(fieldStarMaterial);
  fieldGroup.userData.setOpacity=(fieldAlpha:number)=>{
    const fieldOpacity=Number.isFinite(fieldAlpha)?THREE.MathUtils.clamp(fieldAlpha,0,1):0;
    fieldMaterials.forEach(fieldMaterial=>{fieldMaterial.uniforms.uOpacity!.value=fieldOpacity;});
  };
  fieldGroup.userData.pointCount=fieldStarCount;
  fieldGroup.userData.vertexCount=fieldStarCount+fieldCount*12;
  fieldGroup.userData.galaxyCount=fieldCount;
  fieldGroup.userData.nearGalaxyCount=fieldNearCount;
  fieldGroup.userData.farGalaxyCount=fieldFarCount;
  fieldGroup.userData.radius=90;
  fieldGroup.userData.illustration='星系位置、尺度与疏密为三维教学示意，并非星系巡天目录';
  return fieldGroup;
}
