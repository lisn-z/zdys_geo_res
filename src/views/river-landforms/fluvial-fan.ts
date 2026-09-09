import { CatmullRomCurve3, Vector3 } from 'three'

export const FAN = { x: -5.15, z: -11.2, length: 8.4, drift: .31 }
export const FAN_ATLAS = { x: -11.6, z: FAN.z, width: 15.2, length: FAN.length, nx: 512, nz: 384 }
type Point = [number, number]
type Trace = { points: Point[]; width: number; fine?: boolean }

// Coordinates are lateral offsets from the fan axis and distance from the mouth.
// Shared endpoints form unequal splits and rejoins around elongated gravel bars.
const traces: Trace[] = [
  { points: [[0,0],[.04,.62],[-.16,1.28],[.02,2.08]], width: .21 },
  { points: [[.02,2.08],[-.42,2.88],[-.66,3.72],[-1.26,4.75],[-1.66,5.7],[-2.78,7.96]], width: .19 },
  { points: [[.02,2.08],[.45,2.82],[.66,3.53],[.56,4.45],[1.13,5.77],[1.34,6.73],[2.09,8.14]], width: .17 },
  { points: [[-.16,1.28],[-.61,1.99],[-1.34,2.78],[-1.61,3.68],[-2.45,4.97],[-3.02,6.2],[-4.62,8.12]], width: .13 },
  { points: [[.04,.62],[.61,1.58],[1.01,2.65],[1.54,3.43],[1.93,4.67],[2.96,6.02],[4.65,8.05]], width: .12 },
  { points: [[-.66,3.72],[-1.29,4.25],[-1.89,4.46],[-2.45,4.97]], width: .10 },
  { points: [[-.42,2.88],[-.08,3.44],[.12,4.1],[.56,4.45]], width: .11 },
  { points: [[.66,3.53],[1.12,3.9],[1.38,4.66],[1.93,4.67]], width: .10 },
  { points: [[-1.26,4.75],[-.91,5.53],[-1.07,6.22],[-.51,7.18],[-.76,8.27]], width: .12 },
  { points: [[1.13,5.77],[.55,6.36],[.42,7.26],[-.02,8.1]], width: .09 },
  { points: [[-1.66,5.7],[-2.33,6.21],[-2.76,6.81],[-3.75,8.24]], width: .10 },
  { points: [[1.93,4.67],[2.19,5.88],[2.4,6.79],[3.52,8.2]], width: .09 },
  { points: [[-1.34,2.78],[-1.83,3.36],[-2.56,3.99],[-3.21,5.17],[-4.36,6.8]], width: .062, fine: true },
  { points: [[-2.45,4.97],[-3.16,5.46],[-3.8,6.36],[-4.13,7.53]], width: .058, fine: true },
  { points: [[-1.07,6.22],[-1.68,7.05],[-1.74,8.11]], width: .056, fine: true },
  { points: [[-.91,5.53],[-.29,6.05],[.09,6.84],[.42,7.26]], width: .055, fine: true },
  { points: [[1.01,2.65],[1.69,3.13],[2.34,3.87],[2.89,5.04],[3.94,6.61]], width: .065, fine: true },
  { points: [[2.96,6.02],[3.53,6.49],[3.74,7.1],[4.44,7.56]], width: .048, fine: true },
  { points: [[.56,4.45],[.33,5.32],[.55,6.36]], width: .055, fine: true },
  { points: [[1.34,6.73],[1.05,7.46],[1.39,8.3]], width: .045, fine: true },
  { points: [[-.61,1.99],[-1.29,2.14],[-1.77,2.99],[-2.56,3.99]], width: .052, fine: true },
]

const saturate = (value: number) => Math.max(0, Math.min(1, value))
const ease = (a: number, b: number, value: number) => { const t=saturate((value-a)/(b-a)); return t*t*(3-2*t) }
let atlas: Uint8Array | undefined

/** One immutable map drives both actual shallow incision and surface shading. */
export function fanTraceAtlas(): Uint8Array {
  if (atlas) return atlas
  const { x:x0, z:z0, width, length, nx, nz } = FAN_ATLAS
  const data = new Uint8Array(nx*nz*4)
  const dx=width/nx, dz=length/nz
  for (let n=0;n<traces.length;n++) {
    const trace=traces[n]!
    const points=new CatmullRomCurve3(trace.points.map(([offset,along]) =>
      new Vector3(FAN.x+along*FAN.drift+offset,0,FAN.z+along)),false,'centripetal').getPoints(110)
    for (let s=0;s<points.length-1;s++) {
      const a=points[s]!, b=points[s+1]!, vx=b.x-a.x, vz=b.z-a.z, ll=vx*vx+vz*vz
      const along=(a.z-FAN.z)/FAN.length
      const w=trace.width*(1-along*.38)*(.86+.14*Math.sin(along*32+n*2.6))
      const radius=w*4.2
      const i0=Math.max(0,Math.floor((Math.min(a.x,b.x)-radius-x0)/dx))
      const i1=Math.min(nx-1,Math.ceil((Math.max(a.x,b.x)+radius-x0)/dx))
      const j0=Math.max(0,Math.floor((Math.min(a.z,b.z)-radius-z0)/dz))
      const j1=Math.min(nz-1,Math.ceil((Math.max(a.z,b.z)+radius-z0)/dz))
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++) {
        const x=x0+(i+.5)*dx,z=z0+(j+.5)*dz
        const t=ll>1e-8?saturate(((x-a.x)*vx+(z-a.z)*vz)/ll):0
        const distance=Math.hypot(x-a.x-t*vx,z-a.z-t*vz), k=(j*nx+i)*4
        const endFade=1-ease(.87,1,(s+t)/(points.length-1))*.62
        const cut=Math.exp(-((distance/w)**2)*1.7)*endFade
        const channel=trace.fine?1:0
        data[k+channel]=Math.max(data[k+channel]!,Math.round(cut*255))
        const gravel=Math.exp(-((distance/(w*3.1))**2))*endFade
        data[k+2]=Math.max(data[k+2]!,Math.round(gravel*255))
        data[k+3]=255
      }
    }
  }
  atlas=data
  return data
}

export function fanTraceDepth(x:number,z:number):number {
  const bounds=FAN_ATLAS
  const u=(x-bounds.x)/bounds.width*bounds.nx-.5,v=(z-bounds.z)/bounds.length*bounds.nz-.5
  if(u<0||v<0||u>=bounds.nx-1||v>=bounds.nz-1)return 0
  const data=fanTraceAtlas(),i=Math.floor(u),j=Math.floor(v),fx=u-i,fz=v-j
  const sample=(ix:number,iz:number)=>{
    const k=(iz*bounds.nx+ix)*4
    return (data[k]!*.135+data[k+1]!*.045-data[k+2]!*.012)/255
  }
  return (sample(i,j)*(1-fx)+sample(i+1,j)*fx)*(1-fz)
    +(sample(i,j+1)*(1-fx)+sample(i+1,j+1)*fx)*fz
}
