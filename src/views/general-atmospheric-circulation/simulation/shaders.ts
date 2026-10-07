// Original rendering treatment, grounded in earth-motion's ocean-mask and atmospheric-rim approach.
export const globeVertex = `
varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
void main(){ vUv=uv; vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p; }
`
export const globeFragment = `
uniform sampler2D map; uniform vec3 sun; uniform float atmosphere;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
void main(){
 vec3 n=normalize(vNormal), view=normalize(cameraPosition-vWorld), light=normalize(sun);
 vec3 land=texture2D(map,vUv).rgb;
 float luma=dot(land,vec3(.2126,.7152,.0722));
 float ocean=smoothstep(-.025,.115,land.b-max(land.r,land.g))*(1.-smoothstep(.48,.82,luma));
 float direct=max(dot(n,light),0.);
 float glint=pow(max(dot(n,normalize(light+view)),0.),105.)*ocean*direct;
 vec3 color=land*(.45+direct*.88)+vec3(.70,.83,.92)*glint*.75;
 float rim=pow(1.-abs(dot(n,view)),3.)*.46*atmosphere;
 color=mix(color,vec3(.33,.59,.79),rim);
 gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`
export const atmosphereFragment = `
varying vec3 vNormal; varying vec3 vWorld;
void main(){ vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);float f=1.-abs(dot(n,v));float inner=1.-smoothstep(.67,1.,f);float alpha=pow(inner,2.65)*.85;gl_FragColor=vec4(.30,.56,.78,alpha); }
`
// Same latitude warp for every atmospheric layer. Geometry and uniforms survive month changes.
export const flowVertex = `
uniform float shift; uniform float seasonal; varying vec2 vUv;
attribute float verticalFlow; varying float vVerticalFlow;
void main(){
 vVerticalFlow=verticalFlow;
 vUv=uv; vec3 p=position;float r=length(p);float lat=asin(clamp(p.y/r,-1.,1.));
 float next=clamp(lat+shift*.01745329252*cos(abs(lat)),-1.53588974,1.53588974);
 next=mix(lat,next,seasonal);float lon=atan(p.z,p.x);
 p=vec3(r*cos(next)*cos(lon),r*sin(next),r*cos(next)*sin(lon));
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`
export const flowFragment = `
uniform vec3 color; uniform float opacity; uniform float highlight;
varying vec2 vUv;
void main(){
 gl_FragColor=vec4(mix(color,vec3(1.),highlight*.62)*(1.+highlight*.5),opacity*.9);
 #include <colorspace_fragment>
}
`
export const pressureFragment = `
uniform vec3 color; uniform float opacity; uniform float highlight; varying vec2 vUv;
void main(){float feather=sin(vUv.y*3.14159265);float lines=pow(.5+.5*cos(vUv.y*25.13274),16.);gl_FragColor=vec4(mix(color,vec3(1.),highlight*.4),opacity*(.32*feather+.38*lines*feather+highlight*.3*feather));
 #include <colorspace_fragment>
}
`

export const particleStreamVertex = `
uniform float shift; uniform float seasonal;
attribute float verticalFlow; attribute float strandPhase; attribute float strandKind;
varying vec2 vUv; varying float vVerticalFlow; varying float vPhase; varying float vKind;
void main(){
 vUv=uv; vVerticalFlow=verticalFlow; vPhase=strandPhase; vKind=strandKind;
 vec3 p=position; float r=length(p), lat=asin(clamp(p.y/r,-1.,1.));
 float next=clamp(lat+shift*.01745329252*cos(abs(lat)),-1.53588974,1.53588974);
 next=mix(lat,next,seasonal); float lon=atan(p.z,p.x);
 p=vec3(r*cos(next)*cos(lon),r*sin(next),r*cos(next)*sin(lon));
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`

export const particleStreamFragment = `
uniform vec3 color; uniform vec3 risingColor; uniform vec3 sinkingColor;
uniform float opacity; uniform float time; uniform float beads; uniform float glow; uniform float highlight;
uniform float reveal;
varying vec2 vUv; varying float vVerticalFlow; varying float vPhase; varying float vKind;
void main(){
 if(reveal<=0. || vUv.x>reveal) discard;
 float tip=(1.-smoothstep(0.,.018,reveal-vUv.x))*(1.-smoothstep(.97,1.,reveal));
 vec3 tint=mix(color,risingColor,smoothstep(.20,.70,vVerticalFlow));
 tint=mix(tint,sinkingColor,smoothstep(.20,.70,-vVerticalFlow));
 float age=fract(time*(1.0+vPhase*.16)-vUv.x*beads+vPhase);
 float tail=(1.-smoothstep(.025,.30,age))*smoothstep(0.,.012,age);
 float head=1.-smoothstep(.015,.050,abs(age-.035));
 float profile=pow(max(0.,sin(vUv.y*3.14159265)),1.6);
 float alpha=max(mix(.22+highlight*.24,tail*.85+head*.15,vKind),tip*.85)*opacity;
 alpha*=mix(1.,profile*(.28+highlight*.55),glow);
 if(alpha<.008) discard;
 gl_FragColor=vec4(mix(tint,vec3(1.),max((head*.65+highlight*.16)*vKind,tip*.65))*(1.+highlight*.35),alpha);
 #include <colorspace_fragment>
}`

export const currentPulseFragment = `
uniform vec3 color; uniform float opacity; uniform float travel;
uniform float pathLength; uniform float spacing; uniform float direction; uniform float strength;
uniform float glow; uniform float highlight;
varying vec2 vUv;
void main(){
 float age=mod((travel-vUv.x*pathLength)*direction,spacing);
 float pulse=(1.-smoothstep(.02,spacing*.34,age))*smoothstep(0.,.014,age);
 float edge=mix(1.-smoothstep(.30,.50,abs(vUv.y-.5)),exp(-pow((vUv.y-.5)*4.5,2.)),glow);
 float alpha=(.19+pulse*.81*strength+highlight*.22)*edge*opacity;
 alpha*=mix(1.,.30+highlight*.52,glow);
 if(alpha<.005) discard;
 gl_FragColor=vec4(mix(color,vec3(1.),pulse*.62+highlight*.15)*(1.+highlight*.3),alpha);
 #include <colorspace_fragment>
}`
