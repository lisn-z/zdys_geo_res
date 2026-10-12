/** Adaptation of Three.js examples/webgl_volume_cloud.html:
 * ImprovedNoise -> Data3DTexture -> ray/box intersection -> front-to-back integration.
 * v7 adds opaque-scene depth clipping, lighting, camera-inside support and a depth-aware composite.
 * All outputs here are LINEAR. The application's final output pass tone maps exactly once.
 */
export const CLOUD_FULLSCREEN_VERTEX = `out vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
export const CLOUD_VOLUME_FRAGMENT = `
precision highp sampler3D;
in vec2 vUv;out vec4 outCloud;
uniform sampler3D densityMap;
uniform sampler3D missionDensityMap;
uniform sampler2D sceneDepth;
uniform mat4 inverseProjection,cameraWorld,worldToCloud;
uniform vec3 cameraWorldPosition,sunDirection,boxSize;
uniform float time,strength,extinction,cameraFar,missionProfile;
uniform int marchSteps;
vec3 viewPoint(vec2 uv,float d){vec4 p=inverseProjection*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);return p.xyz/p.w;}
vec2 boxHit(vec3 ro,vec3 rd){
  vec3 inv=sign(rd+vec3(1e-8))/max(abs(rd),vec3(1e-8));
  vec3 a=(-.5-ro)*inv,b=(.5-ro)*inv,lo=min(a,b),hi=max(a,b);
  return vec2(max(lo.x,max(lo.y,lo.z)),min(hi.x,min(hi.y,hi.z)));
}
float densityAt(vec3 p){
  vec3 uv=p+.5;
  if(any(lessThan(uv,vec3(0.0)))||any(greaterThan(uv,vec3(1.0))))return 0.0;
  if(missionProfile>.5){
    vec3 world=p*boxSize;
    vec3 wind=vec3(time*.0019,0.0,time*.0012);
    float billow=texture(missionDensityMap,world/vec3(94.0,72.0,90.0)+vec3(.23,.47,.61)+wind).r;
    float erosion=texture(missionDensityMap,world/vec3(29.0,23.0,31.0)+vec3(.73,.11,.37)-wind*.6).r;
    float weather=texture(missionDensityMap,world/vec3(270.0,185.0,250.0)+vec3(.41,.19,.83)).r;
    // At the bottom only isolated high-density peaks survive. As height rises
    // the threshold falls continuously, so those wisps expand and merge.
    float altitude=smoothstep(.13,.76,uv.y);
    float threshold=mix(.68,.36,altitude)+(weather-.5)*.08;
    float shape=billow*.82+erosion*.18;
    float cloud=smoothstep(threshold,threshold+.15,shape);
    // A noise-varied, very wide feather removes both a level cloud-base wall
    // and hard volume edges, including when the camera is inside the field.
    float bottom=smoothstep(.04+(weather-.5)*.07,.30+(weather-.5)*.05,uv.y);
    float top=1.0-smoothstep(.80,1.0,uv.y);
    float sides=smoothstep(0.0,.24,uv.x)*smoothstep(0.0,.24,1.0-uv.x)*smoothstep(0.0,.24,uv.z)*smoothstep(0.0,.24,1.0-uv.z);
    return cloud*bottom*top*sides*mix(.14,1.0,altitude)*strength;
  }
  float side=smoothstep(0.0,.14,uv.x)*smoothstep(0.0,.14,1.0-uv.x)*smoothstep(0.0,.14,uv.z)*smoothstep(0.0,.14,1.0-uv.z);
  float height=smoothstep(.06,.28,uv.y)*(1.0-smoothstep(.56,.88,uv.y));
  vec3 drift=vec3(sin(time*.035)*.018,0.0,cos(time*.031)*.017);
  float n=texture(densityMap,uv+drift).r;
  float edge=smoothstep(.018,.23,n);
  return edge*height*side*strength;
}
float staticHash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
  if(strength<=.0001){outCloud=vec4(0.0);return;}
  vec3 rayView=normalize(viewPoint(vUv,1.0));
  vec3 rayWorld=normalize(mat3(cameraWorld)*rayView);
  vec3 ro=(worldToCloud*vec4(cameraWorldPosition,1.0)).xyz;
  // Do not normalize: t remains a distance in WORLD units after non-uniform scaling.
  vec3 rd=(worldToCloud*vec4(rayWorld,0.0)).xyz;
  vec2 hit=boxHit(ro,rd);
  float z=texture(sceneDepth,vUv).r;
  float opaqueDistance=z>=.999999?cameraFar:length(viewPoint(vUv,z));
  float start=max(0.0,hit.x),finish=min(hit.y,opaqueDistance);
  if(finish<=start){outCloud=vec4(0.0);return;}
  float ds=(finish-start)/float(marchSteps);
  float jitter=.22+.56*staticHash(floor(gl_FragCoord.xy));
  vec3 lightStep=(worldToCloud*vec4(normalize(sunDirection),0.0)).xyz*max(4.0,boxSize.y*.12);
  vec3 accum=vec3(0.0);float transmittance=1.0;
  float forward=pow(max(dot(rayWorld,normalize(sunDirection)),0.0),7.0);
  for(int i=0;i<80;i++){
    if(i>=marchSteps)break;
    float distance=start+(float(i)+jitter)*ds;
    vec3 p=ro+rd*distance;float d=densityAt(p);
    if(d>.001){
      float shadowDensity=densityAt(p+lightStep)*.85+densityAt(p+lightStep*2.5)*.45;
      float sunlight=exp(-shadowDensity*2.2);
      float relief=clamp(.75+(d-densityAt(p+lightStep*.22))*1.2,.45,1.20);
      float height=clamp(p.y+.5,0.0,1.0);
      vec3 ambient=mix(vec3(.36,.42,.49),vec3(.72,.78,.84),height);
      vec3 light=(ambient+vec3(.98,.985,.99)*sunlight*(.68+.14*forward))*relief;
      float a=1.0-exp(-d*ds*extinction);
      accum+=transmittance*a*light;
      transmittance*=1.0-a;
      if(transmittance<.008)break;
    }
  }
  outCloud=vec4(accum,1.0-transmittance);
}`;
export const CLOUD_COMPOSITE_FRAGMENT = `
in vec2 vUv;out vec4 outColor;
uniform sampler2D baseColor,cloudColor,sceneDepth;
uniform vec2 cloudSize;
uniform float nearPlane,farPlane;
float linearDepth(float d){return (nearPlane*farPlane)/(farPlane-d*(farPlane-nearPlane));}
void main(){
  vec3 base=texture(baseColor,vUv).rgb;
  float center=linearDepth(texture(sceneDepth,vUv).r);
  vec2 grid=vUv*cloudSize-.5,cell=floor(grid),f=fract(grid);
  vec4 sum=vec4(0.0);float total=0.0;
  for(int j=0;j<2;j++)for(int i=0;i<2;i++){
    vec2 uv=(cell+vec2(float(i),float(j))+.5)/cloudSize;
    float d=linearDepth(texture(sceneDepth,uv).r);
    float similarity=exp(-abs(d-center)/max(.18,center*.004));
    float w=(i==0?1.0-f.x:f.x)*(j==0?1.0-f.y:f.y)*similarity;
    sum+=texture(cloudColor,uv)*w;total+=w;
  }
  vec4 cloud=total>.00001?sum/total:vec4(0.0);
  outColor=vec4(base*(1.0-clamp(cloud.a,0.0,1.0))+cloud.rgb,1.0);
}`;
