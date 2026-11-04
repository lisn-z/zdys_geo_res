import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

type V3 = [number, number, number]
/** Model Y inspired teaching reconstruction, front +X, tyre contact at Y=0.
 * The dimensions are scaled for the textbook garage; this is not a CAD asset.
 * Battery inspection lifts the body to expose its under-floor traction pack.
 */
export function createModelYCar(): {
  root: THREE.Group; setCutaway(enabled: boolean): void
  highlight(id: number | null): void; dispose(): void
} {
  const root = new THREE.Group(); root.name = 'Red Model Y inspired crossover'
  const shell = new THREE.Group(); shell.name = 'Body lifted for underfloor battery inspection'
  const rolling = new THREE.Group(); rolling.name = 'Wheels, axles and underfloor chassis'
  const battery = new THREE.Group(); battery.name = '8 · Underfloor traction battery — schematic modules'
  root.add(shell, rolling, battery)
  const materials: THREE.MeshStandardMaterial[] = []
  const batches = new Map<THREE.Group, Map<THREE.MeshStandardMaterial, THREE.BufferGeometry[]>>()
  const make = (color: string, roughness: number, metalness = 0) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness })
    materials.push(mat); return mat
  }
  const red = new THREE.MeshPhysicalMaterial({ color: '#ac101b', roughness: .255, metalness: .35, clearcoat: .9, clearcoatRoughness: .19 })
  materials.push(red)
  const black = make('#131719', .46), rubber = make('#16191a', .84)
  const glass = make('#16232c', .13, .35), rim = make('#343b40', .29, .75)
  const metal = make('#a9b3b8', .25, .85), seam = make('#4a1015', .64)
  const lamp = make('#e7f1ed', .2, .12), tail = make('#ad101c', .23, .22)
  lamp.emissive.set('#c2d7df'); lamp.emissiveIntensity = .28
  tail.emissive.set('#9d0b10'); tail.emissiveIntensity = .25
  const plate = make('#dddcd4', .6), batteryMetal = make('#7d8a8c', .5, .58)
  const cell = make('#36555b', .47, .3), cable = make('#c86a27', .65)
  const smokedLens = make('#24313a', .17, .28), projectorLens = make('#182b35', .12, .38)
  const lensEdge = make('#60727a', .25, .55), lensGlint = make('#9aadb0', .22, .45)
  const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial) => {
    const g = geometry.index ? geometry.toNonIndexed() : geometry
    if (g !== geometry) geometry.dispose()
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2))
    const bucket = batches.get(parent) ?? new Map<THREE.MeshStandardMaterial, THREE.BufferGeometry[]>()
    const list = bucket.get(mat) ?? []; list.push(g); bucket.set(mat, list); batches.set(parent, bucket)
  }
  const box = (parent: THREE.Group, mat: THREE.MeshStandardMaterial, p: V3, dimensions: V3, angle = 0) => {
    const g = new THREE.BoxGeometry(...dimensions); g.rotateY(angle); g.translate(...p); add(parent, g, mat)
  }
  const pipe = (parent: THREE.Group, mat: THREE.MeshStandardMaterial, points: V3[], radius: number, segments = 24, radial = 5) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    add(parent, new THREE.TubeGeometry(curve, segments, radius, radial, false), mat)
  }
  const surface = (parent: THREE.Group, mat: THREE.MeshStandardMaterial, rows: number, cols: number, sample: (u: number, v: number) => V3, flip = false) => {
    const positions: number[] = [], uv: number[] = [], indices: number[] = []
    for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
      positions.push(...sample(r / rows, c / cols)); uv.push(r / rows, c / cols)
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c, b = a + cols + 1
      if (flip) indices.push(a, a + 1, b, a + 1, b + 1, b)
      else indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); add(parent, g, mat)
  }
  const sample = (knots: [number, number][], x: number): number => {
    const first = knots[0]
    if (!first) throw new Error('A vehicle profile must contain at least one knot')
    if (x <= first[0]) return first[1]
    const lastIndex = knots.length - 1
    if (x >= knots[lastIndex]![0]) return knots[lastIndex]![1]
    const secant = (index: number) => {
      const a = knots[index]!, b = knots[index + 1]!
      return (b[1] - a[1]) / (b[0] - a[0])
    }
    const interval = (index: number) => knots[index + 1]![0] - knots[index]![0]
    // Shape-preserving cubic Hermite interpolation: adjacent spans share their
    // tangent instead of flattening every control point into a separate bulge.
    const tangent = (index: number): number => {
      if (lastIndex === 1) return secant(0)
      if (index === 0 || index === lastIndex) {
        const near = index === 0 ? 0 : lastIndex - 1
        const far = index === 0 ? 1 : lastIndex - 2
        const h0 = interval(near), h1 = interval(far)
        const d0 = secant(near), d1 = secant(far)
        const slope = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1)
        if (Math.sign(slope) !== Math.sign(d0)) return 0
        return Math.sign(d0) !== Math.sign(d1) && Math.abs(slope) > 3 * Math.abs(d0) ? 3 * d0 : slope
      }
      const before = secant(index - 1), after = secant(index)
      if (before * after <= 0) return 0
      const hBefore = interval(index - 1), hAfter = interval(index)
      const w1 = 2 * hAfter + hBefore, w2 = hAfter + 2 * hBefore
      return (w1 + w2) / (w1 / before + w2 / after)
    }
    for (let i = 1; i < knots.length; i++) {
      // Both indices are bounded by this loop and the nonempty profile guard.
      const previous = knots[i - 1]!, next = knots[i]!
      if (x > next[0]) continue
      const h = next[0] - previous[0], t = (x - previous[0]) / h
      const t2 = t * t, t3 = t2 * t
      const value = (2 * t3 - 3 * t2 + 1) * previous[1]
        + (t3 - 2 * t2 + t) * h * tangent(i - 1)
        + (-2 * t3 + 3 * t2) * next[1]
        + (t3 - t2) * h * tangent(i)
      return THREE.MathUtils.clamp(value, Math.min(previous[1], next[1]), Math.max(previous[1], next[1]))
    }
    return knots[knots.length - 1]![1]
  }
  const width = (x: number) => sample([[-1.825, .58], [-1.65, .704], [-1.15, .744], [-.4, .739], [.55, .735], [1.1, .748], [1.55, .708], [1.825, .59]], x)
  const belt = (x: number) => sample([[-1.825, .855], [-1.5, .97], [-.8, .99], [.15, .98], [.72, .95], [1.25, .845], [1.825, .71]], x)
  const archRadius = .354, wheelY = .319
  const lower = (x: number) => {
    let y = .235
    for (const axleX of [-1.1, 1.12]) {
      const d = Math.abs(x - axleX)
      if (d < archRadius) y = Math.max(y, wheelY + Math.sqrt(archRadius ** 2 - d ** 2))
    }
    return y
  }
  const sideWidth = (x: number, t: number) => width(x) - .025 * (1 - t)
    + .018 * Math.sin(Math.PI * t) - .012 * Math.sin(Math.PI * t * 2)
  // The last 30 cm of the body rolls into the nose. All adjoining surfaces use
  // this same deformation, so neither a vertical flat cap nor a cut seam remains.
  const frontX = (x: number, t: number, across: number): number => {
    const blend = THREE.MathUtils.smoothstep(x, 1.52, 1.825)
    const shoulder = -.15 + .045 * t + .092 * Math.sin(Math.PI * t)
    const crown = .025 * (.65 + .35 * Math.sin(Math.PI * t)) * (1 - across * across)
    return x + blend * (shoulder + crown)
  }
  const frontPoint = (t: number, across: number, outward = 0): V3 => [
    frontX(1.825, t, across) + outward,
    THREE.MathUtils.lerp(.235, belt(1.825) + .043 * (1 - across * across), t),
    across * sideWidth(1.825, t),
  ]
  const hoodPoint = (x: number, across: number, raised = 0): V3 => [
    frontX(x, 1, across), belt(x) + .043 * (1 - across * across) + raised, width(x) * across,
  ]
  const sideAt = (x: number, y: number, side: number, offset = 0): V3 => {
    const t = THREE.MathUtils.clamp((y - lower(x)) / Math.max(.04, belt(x) - lower(x)), 0, 1)
    return [frontX(x, t, side), y, side * (sideWidth(x, t) + offset)]
  }
  // Continuous sculpted side panels with actual curved wheel-arch openings.
  for (const side of [-1, 1]) {
    surface(shell, red, 80, 12, (u, v) => {
      const x = -1.825 + 3.65 * u, y = THREE.MathUtils.lerp(lower(x), belt(x), v)
      return sideAt(x, y, side)
    }, side < 0)
    // The inner wheel-arch liner bridges the body edge and inner chassis.
    for (const axleX of [-1.1, 1.12]) {
      surface(shell, black, 32, 2, (u, v) => {
        const angle = u * Math.PI, x = axleX + Math.cos(angle) * archRadius
        return [x, wheelY + Math.sin(angle) * archRadius, side * THREE.MathUtils.lerp(width(x) + .004, .61, v)]
      }, side < 0)
      surface(shell, black, 36, 2, (u, v) => {
        const angle = -.03 + u * (Math.PI + .06), r = archRadius + v * .024
        const x = axleX + Math.cos(angle) * r
        return [x, wheelY + Math.sin(angle) * r, side * (width(x) + .013)]
      }, side > 0)
    }
    pipe(shell, black, [[-1.78,.235,side*.675],[-1.48,.219,side*.714],[-.7,.205,side*.734],[.55,.205,side*.729],[1.55,.234,side*.695]], .019, 34)
  }
  // Hood and rear shoulders are smooth convex surfaces rather than cuboids.
  surface(shell, red, 80, 24, (u, v) => {
    const x = -1.825 + 3.65 * u, across = v * 2 - 1
    return hoodPoint(x, across)
  }, true)
  // Rounded end caps close the front and rear bumpers; underfloor closes the shell.
  for (const end of [-1, 1]) {
    surface(shell, red, 12, 24, (u, v) => {
      if (end > 0) return frontPoint(u, v * 2 - 1)
      const across = v * 2 - 1, x = end * (1.825 - .058 * Math.sin(Math.PI * u) * (1 - across * across))
      return [x, THREE.MathUtils.lerp(.235, belt(end * 1.825) + .043 * (1-across*across), u), across * sideWidth(end * 1.825, u)]
    }, end < 0)
  }
  surface(shell, black, 80, 24, (u,v)=>{
    const x=-1.825+3.65*u, across=v*2-1
    return [frontX(x,0,across),lower(x),across*(width(x)-.025)]
  },false)

  // One continuous black glass canopy has a tall gently arched SUV roof and
  // declining rear screen. Thin painted rails define the distinctive silhouette.
  const roofHeight = (x: number) => sample([[-1.58,.966],[-1.35,1.12],[-.96,1.31],[-.45,1.414],[.03,1.408],[.35,1.34],[.66,1.16],[.99,.958]],x)
  const roofHalfWidth = (x: number) => sample([[-1.58,.64],[-1.1,.598],[-.45,.568],[.1,.574],[.6,.616],[.99,.675]],x)
  const canopy = (x: number, theta: number): V3 => {
    const across = Math.sin(theta)
    return [x, .939 + (roofHeight(x)-.939) * Math.pow(Math.max(0,Math.cos(theta)),.43), roofHalfWidth(x) * across + .045 * across * Math.pow(Math.abs(across),6)]
  }
  // Exact barycentric sampling of the rendered glass/bumper mesh. Sampling only
  // the analytical curve would leave thin trim above its discrete triangles.
  const patchSkin = (rows: number, cols: number, u: number, v: number, patch: (u: number,v: number)=>V3, hint: THREE.Vector3, lift = 0): { point: V3; normal: THREE.Vector3 } => {
    const ru=THREE.MathUtils.clamp(u,0,1)*rows,cv=THREE.MathUtils.clamp(v,0,1)*cols
    const r=Math.min(rows-1,Math.floor(ru)),c=Math.min(cols-1,Math.floor(cv))
    const a=ru-r,b=cv-c
    const p00=new THREE.Vector3(...patch(r/rows,c/cols))
    const p10=new THREE.Vector3(...patch((r+1)/rows,c/cols))
    const p01=new THREE.Vector3(...patch(r/rows,(c+1)/cols))
    const p11=new THREE.Vector3(...patch((r+1)/rows,(c+1)/cols))
    let point:THREE.Vector3,normal:THREE.Vector3
    if(a+b<=1){
      point=p00.clone().multiplyScalar(1-a-b).addScaledVector(p10,a).addScaledVector(p01,b)
      normal=p10.clone().sub(p00).cross(p01.clone().sub(p00)).normalize()
    }else{
      point=p11.clone().multiplyScalar(a+b-1).addScaledVector(p10,1-b).addScaledVector(p01,1-a)
      normal=p11.clone().sub(p10).cross(p01.clone().sub(p10)).normalize()
    }
    if(normal.dot(hint)<0)normal.negate()
    point.addScaledVector(normal,lift)
    return {point:[point.x,point.y,point.z],normal}
  }
  const canopySkin = (x:number,theta:number,lift=0)=>{
    const side=theta<0?-1:1
    return patchSkin(40,10,(x+1.58)/2.57,Math.abs(theta)/(Math.PI/2),
      (u,v)=>canopy(-1.58+2.57*u,side*v*Math.PI/2),new THREE.Vector3(0,1,side),lift)
  }
  const glassTrim = (mat:THREE.MeshStandardMaterial,rows:number,cols:number,at:(u:number,v:number)=>[number,number],lift:number)=>{
    const sampleTrim=(u:number,v:number):V3=>{const [x,theta]=at(u,v);return canopySkin(x,theta,lift).point}
    const centre=new THREE.Vector3(...sampleTrim(.5,.5))
    const du=new THREE.Vector3(...sampleTrim(.501,.5)).sub(centre),dv=new THREE.Vector3(...sampleTrim(.5,.501)).sub(centre)
    const [x,theta]=at(.5,.5)
    const flip=du.cross(dv).dot(canopySkin(x,theta).normal)<0
    surface(shell,mat,rows,cols,sampleTrim,flip)
    if(mat===red){
      // Painted rails have closed, thin edges, not an open sheet or round tube.
      for(const edge of [0,1]){
        surface(shell,mat,rows,1,(u,v)=>{const [px,pt]=at(u,edge);return canopySkin(px,pt,THREE.MathUtils.lerp(.0003,lift,v)).point},edge===0?flip:!flip)
        surface(shell,mat,cols,1,(u,v)=>{const [px,pt]=at(edge,u);return canopySkin(px,pt,THREE.MathUtils.lerp(.0003,lift,v)).point},edge===0?!flip:flip)
      }
    }
  }
  // Mirror the actual triangle diagonals as well as the parametric positions.
  // Otherwise the two curved glass sides differ slightly between grid vertices.
  for(const side of [-1,1])surface(shell,glass,40,10,(u,v)=>canopy(-1.58+2.57*u,side*v*Math.PI/2),side>0)
  for(const end of [-1.58,.99]) surface(shell,glass,1,28,(u,v)=>{
    const edge=canopy(end,-Math.PI/2+Math.PI*v)
    return [end,THREE.MathUtils.lerp(.939,edge[1],u),edge[2]]
  },end<0)
  for(const side of [-1,1]){
    // Flat 2–3 mm ribbons attached to the glazing replace the former tubular
    // rails and free-standing triangular C pillars. A/B/C pillars all follow
    // the same actual glass triangles, including their tapered ends.
    glassTrim(red,80,3,(u,v)=>[-1.51+2.45*u,side*(1.055+(v-.5)*.078)],.0025)
    glassTrim(black,80,2,(u,v)=>[-1.51+2.45*u,side*(1.546+(v-.5)*.023)],.002)
    glassTrim(black,24,3,(u,v)=>[-.18+(v-.5)*.045,side*(1.055+.497*u)],.0022)
    glassTrim(red,32,3,(u,v)=>[.947-.64*u+(v-.5)*(.025+.014*Math.sin(Math.PI*u)),side*(1.546-.491*u)],.0025)
    glassTrim(red,32,4,(u,v)=>[-1.505+.485*u+(v-.5)*(.033+.025*Math.sin(Math.PI*u)),side*(1.546-.491*u)],.0025)
    // Four door shut lines follow the body curvature; handles sit flush.
    for(const doorX of [-.25,.81]){
      const points:V3[]=[]
      for(let i=0;i<=9;i++){
        const t=i/9, y=.27+t*(.938-.27), x=doorX+(1-t)*.025
        points.push(sideAt(x,y,side,.0025))
      }
      pipe(shell,seam,points,.0032,20,4)
    }
    pipe(shell,seam,[sideAt(-1.35,.91,side,.003),sideAt(-1.45,.77,side,.003),sideAt(-1.45,.71,side,.003)],.003,12,4)
    for(const handleX of [-.57,.46]){
      const p=sideAt(handleX,.904,side,.004)
      box(shell,black,p,[.136,.016,.01])
      box(shell,rim,[p[0]-.014,p[1]+.002,p[2]+side*.0055],[.083,.006,.006])
    }
    // Short aero mirror stem and tapered housing, restrained to the garage width.
    pipe(shell,black,[[.66,1.005,side*.671],[.61,1.013,side*.757]],.014,8,5)
    const mirror=new THREE.SphereGeometry(1,16,8)
    mirror.scale(.101,.038,.058); mirror.translate(.603,1.032,side*.767); add(shell,mirror,red)
    const mirrorFace=new THREE.SphereGeometry(1,12,6)
    mirrorFace.scale(.008,.027,.047);mirrorFace.translate(.514,1.03,side*.767);add(shell,mirrorFace,glass)
  }

  // New Model Y light signatures: narrow full-width DRL and indirect rear bar.
  const frontLights:V3[]=[],rearLights:V3[]=[]
  for(let i=0;i<=18;i++){
    const z=-.595+i/18*1.19
    frontLights.push(frontPoint(.968, -.965+i/18*1.93, .006))
    rearLights.push([-1.825+.045*Math.pow(Math.abs(z)/.6,2),.846+.014*Math.pow(Math.abs(z)/.6,2),z])
  }
  pipe(shell,black,frontLights,.011,34,6)
  pipe(shell,lamp,frontLights.map(([x,y,z])=>[x+.005,y+.001,z]),.0045,34,5)
  pipe(shell,black,rearLights,.032,34,6)
  pipe(shell,tail,rearLights.map(([x,y,z])=>[x-.005,y-.007,z]),.013,34,6)
  const bumperSkin=(t:number,across:number,lift=0)=>patchSkin(12,24,t,(across+1)/2,(u,v)=>frontPoint(u,v*2-1),new THREE.Vector3(1,0,0),lift).point
  // A curved tapered optical cavity, rather than a black rectangle with a white
  // stripe. The smoked cover and quiet projector lenses remain readable close up.
  const lampOutline=new THREE.Shape()
  lampOutline.moveTo(.681,.692)
  lampOutline.quadraticCurveTo(.704,.710,.77,.712)
  lampOutline.quadraticCurveTo(.87,.713,.956,.716)
  lampOutline.quadraticCurveTo(.965,.695,.948,.670)
  lampOutline.quadraticCurveTo(.921,.641,.88,.632)
  lampOutline.quadraticCurveTo(.772,.632,.697,.660)
  lampOutline.quadraticCurveTo(.681,.674,.681,.692)
  const lensContour=lampOutline.getPoints(6)
  const lensCentre=new THREE.Vector2(.825,.677)
  const lensSurface=(side:number,mat:THREE.MeshStandardMaterial,scale:number,lift:number,bulge:number)=>{
    const vertices:number[]=[],indices:number[]=[]
    const rings=3,count=lensContour.length-1
    vertices.push(...bumperSkin(lensCentre.y,side*lensCentre.x,lift+bulge))
    for(let ring=1;ring<=rings;ring++)for(let i=0;i<count;i++){
      const p=lensContour[i]!,r=ring/rings
      const across=lensCentre.x+(p.x-lensCentre.x)*scale*r,t=lensCentre.y+(p.y-lensCentre.y)*scale*r
      vertices.push(...bumperSkin(t,side*across,lift+bulge*(1-r*r)))
    }
    for(let i=0;i<count;i++){
      const n=(i+1)%count
      if(side>0)indices.push(0,1+i,1+n);else indices.push(0,1+n,1+i)
      for(let ring=1;ring<rings;ring++){
        const a=1+(ring-1)*count+i,b=1+ring*count+i,c=1+(ring-1)*count+n,d=1+ring*count+n
        if(side>0)indices.push(a,b,c,c,b,d);else indices.push(a,c,b,c,d,b)
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();add(shell,g,mat)
  }
  const projector=(side:number,across:number,t:number)=>{
    const disc=(mat:THREE.MeshStandardMaterial,rx:number,ry:number,lift:number)=>{
      const vertices:number[]=[...bumperSkin(t,side*across,lift+.0004)],indices:number[]=[]
      for(let i=0;i<=20;i++){const angle=i/20*Math.PI*2;vertices.push(...bumperSkin(t+Math.sin(angle)*ry,side*(across+Math.cos(angle)*rx),lift))}
      for(let i=1;i<=20;i++)if(side>0)indices.push(0,i+1,i);else indices.push(0,i,i+1)
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();add(shell,g,mat)
    }
    disc(lensEdge,.025,.021,.009)
    disc(projectorLens,.019,.016,.010)
    const glint:V3[]=[]
    for(let i=0;i<=8;i++){const angle=.25+i/8*1.35;glint.push(bumperSkin(t+Math.sin(angle)*.011,side*(across+Math.cos(angle)*.015),.011))}
    pipe(shell,lensGlint,glint,.0012,8,4)
  }
  for(const side of [-1,1]){
    lensSurface(side,black,1,.002,0)
    lensSurface(side,smokedLens,.9,.005,.001)
    projector(side,.79,.678);projector(side,.875,.677)
    // Small corner continuation meets the hood's shoulder instead of floating.
    const corner:V3[]=[frontPoint(.973,side*.97,.004),hoodPoint(1.72,side*.99,.004),hoodPoint(1.57,side*.97,.004)]
    pipe(shell,black,corner,.010,12,5)
    pipe(shell,lamp,corner.map(([x,y,z])=>[x+.002,y+.003,z]),.0035,12,5)
  }
  // A shallow lower intake and slim curved lip, with no oversized licence block.
  surface(shell,black,4,20,(u,v)=>{
    const across=(v*2-1)*(.66-.035*Math.cos(u*Math.PI))
    return frontPoint(.135+u*.105,across,.004)
  })
  const lowerLip:V3[]=[]
  for(let i=0;i<=20;i++)lowerLip.push(frontPoint(.075,-.91+i/20*1.82,.004))
  pipe(shell,black,lowerLip,.006,28,5)
  box(shell,black,[-1.816,.325,0],[.02,.15,1.02])
  box(shell,plate,[-1.833,.57,0],[.01,.105,.34])
  pipe(shell,black,[[-1.65,1.005,-.61],[-1.69,1.018,0],[-1.65,1.005,.61]],.018,20,6)
  // Bonnet seam, subtle wipers and the high-mounted brake lamp.
  for(const side of [-1,1])pipe(shell,seam,[hoodPoint(1.74,side*.78,.002),hoodPoint(1.34,side*.78,.002),hoodPoint(1.02,side*.87,.002)],.0027,18,4)
  pipe(shell,black,[[.908,.997,-.48],[.833,1.035,-.08],[.89,1.002,.25]],.006,16,4)
  pipe(shell,tail,[[-1.47,1.043,-.17],[-1.47,1.043,.17]],.006,8,4)

  // Four physically separate tyres and seven-blade aero alloy wheels.
  for(const axleX of [-1.1,1.12])for(const side of [-1,1]){
    const z=side*.707
    const tyre=new THREE.TorusGeometry(.246,.073,12,40)
    tyre.translate(axleX,wheelY,z);add(rolling,tyre,rubber)
    const rimGeo=new THREE.CylinderGeometry(.222,.222,.13,32,1)
    rimGeo.rotateX(Math.PI/2);rimGeo.translate(axleX,wheelY,z);add(rolling,rimGeo,black)
    const outerZ=z+side*.074
    const rimRing=new THREE.TorusGeometry(.216,.009,5,36)
    rimRing.translate(axleX,wheelY,outerZ);add(rolling,rimRing,rim)
    const disk=new THREE.CylinderGeometry(.17,.17,.009,24)
    disk.rotateX(Math.PI/2);disk.translate(axleX,wheelY,z+side*.059);add(rolling,disk,metal)
    for(let spoke=0;spoke<7;spoke++){
      const angle=spoke*Math.PI*2/7
      const outline=new THREE.Shape()
      outline.moveTo(.043,-.018);outline.lineTo(.194,-.043);outline.lineTo(.217,.007);outline.lineTo(.072,.035);outline.closePath()
      const geometry=new THREE.ExtrudeGeometry(outline,{depth:.014,bevelEnabled:false,curveSegments:1})
      geometry.rotateZ(angle);geometry.translate(axleX,wheelY,outerZ-side*.007);add(rolling,geometry,rim)
    }
    const hub=new THREE.CylinderGeometry(.054,.054,.019,16)
    hub.rotateX(Math.PI/2);hub.translate(axleX,wheelY,outerZ+side*.01);add(rolling,hub,black)
    for(let bolt=0;bolt<5;bolt++){
      const a=bolt*Math.PI*2/5,g=new THREE.CylinderGeometry(.005,.005,.006,6)
      g.rotateX(Math.PI/2);g.translate(axleX+Math.cos(a)*.033,wheelY+Math.sin(a)*.033,outerZ+side*.022);add(rolling,g,metal)
    }
  }
  for(const axleX of [-1.1,1.12])box(rolling,black,[axleX,.29,0],[.07,.07,1.4])
  box(rolling,black,[0,.19,0],[2.15,.05,1.21])

  // Schematic module tray is correctly below the cabin, between the axles.
  // No traction battery is placed inside the front luggage compartment.
  box(battery,batteryMetal,[0,.245,0],[1.92,.11,1.17])
  box(battery,black,[0,.306,0],[1.84,.012,1.09])
  for(let x=0;x<4;x++)for(let z=0;z<2;z++){
    const cx=-.705+x*.47,cz=-.27+z*.54
    box(battery,cell,[cx,.343,cz],[.43,.061,.48])
    for(let strip=0;strip<4;strip++)box(battery,batteryMetal,[cx,.377,cz-.18+strip*.12],[.405,.007,.012])
  }
  pipe(battery,cable,[[-.88,.39,-.5],[-.88,.39,.48],[.88,.39,.48],[.88,.39,-.5]],.012,28,5)
  for(const x of [-.88,.88])box(battery,metal,[x,.39,-.48],[.055,.035,.055])

  for(const [parent,bucket] of batches)for(const [mat,geometries]of bucket){
    let merged=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose())
    if(!merged)continue
    if(mat===red){
      // Shared body edges have identical positions. Weld them before normals are
      // computed so the bonnet/fascia/side transitions also shade continuously.
      merged.deleteAttribute('normal');merged.deleteAttribute('uv')
      const welded=mergeVertices(merged,.00001);merged.dispose();merged=welded
      merged.computeVertexNormals()
    }
    const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true
    mesh.userData.featureId=parent===battery?8:7;parent.add(mesh)
  }
  batches.clear()
  root.userData.featureAnchors={7:[1.1,.86,.56] as V3,8:[0,.39,.28] as V3}
  root.userData.batteryInspection={eye:[2.5,1.55,2.6] as V3,target:[0,.42,0] as V3}
  let cutaway=true, selected:number|null=null,disposed=false
  const update=()=>{
    const inspecting=cutaway&&selected===8
    shell.position.y=inspecting?.78:0
    battery.visible=inspecting
    red.emissive.set(selected===7?'#653125':'#000000');red.emissiveIntensity=selected===7?.11:0
    cell.emissive.set(inspecting?'#25443d':'#000000');cell.emissiveIntensity=inspecting?.14:0
  }
  update()
  return{
    root,
    setCutaway(enabled){cutaway=enabled;update()},
    highlight(id){selected=id;update()},
    dispose(){
      if(disposed)return;disposed=true
      root.traverse(object=>{if(object instanceof THREE.Mesh)object.geometry.dispose()})
      materials.forEach(mat=>mat.dispose());root.clear()
    },
  }
}
