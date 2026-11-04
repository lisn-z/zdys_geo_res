/** Shared physical interface for terrain, water, sand cover and sediment tracers. */
export const SAND_HALF_WIDTH=5
export const SAND_HALF_LENGTH=16
export const SAND_X_STEPS=96
export const SAND_Z_STEPS=192
export const clampProgress=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0))
export type LeveeScenario='raised'|'fixed'
export const scenarioProgress=(progress:number,scenario:LeveeScenario)=>scenario==='fixed'
  ?Math.min(clampProgress(progress)/.7,1)*.4:clampProgress(progress)
export const sandGridX=(index:number)=>-SAND_HALF_WIDTH+index/SAND_X_STEPS*SAND_HALF_WIDTH*2
export const sandGridZ=(index:number)=>-SAND_HALF_LENGTH+index/SAND_Z_STEPS*SAND_HALF_LENGTH*2
const smooth=(n:number)=>n*n*(3-2*n)

/** Teaching-model coordinates, deliberately not an observed cross-section survey. */
export function riverHeights(progress:number,scenario:LeveeScenario='raised') {
  const p=clampProgress(progress),bed=-1.4+5.6*p
  return {bed,water:bed+.75,levee:scenario==='fixed'?1.3:1.3+5.6*p,plain:0}
}

/** The fixed levee shoulder never rises above its unchanged crest. */
function terrainDesign(x:number,progress:number,scenario:LeveeScenario) {
  const a=Math.abs(x),h=riverHeights(progress,scenario)
  const shoulder=scenario==='fixed'?Math.min(h.bed+1.05,h.levee-.04):h.bed+1.05
  const points=[[0,h.bed],[5,h.bed],[5.75,shoulder],[6.75,h.levee],
    [7.75,h.levee],[8.25,h.levee-.12],[12,0],[24,0]]
  for(let i=1;i<points.length;i++) {
    const left=points[i-1]!,right=points[i]!
    if(a<=right[0]!) {
      const t=smooth((a-left[0]!)/(right[0]!-left[0]!))
      return (1-t)*left[1]!+t*right[1]!
    }
  }
  return 0
}

/** Quarter-unit interpolation is shared with the terrain's actual mesh edges. */
export function riverSurfaceHeight(x:number,progress:number,scenario:LeveeScenario='raised') {
  const left=Math.floor(x/.25)*.25,t=(x-left)/.25
  return (1-t)*terrainDesign(left,progress,scenario)+t*terrainDesign(left+.25,progress,scenario)
}

/** Continuous design function; all rendered interfaces use the shared grid below. */
export function sandCoverThickness(x:number,z:number) {
  const edge=Math.max(0,Math.min(1,(SAND_HALF_WIDTH-Math.abs(x))/1.05))
  const feather=smooth(edge)
  const phase=x*2.16+.32*Math.sin(z*.19)+.14*Math.sin(z*.47+x*.54)
  const longRidge=Math.pow(.5+.5*Math.sin(phase),3)*.09
  const broad=.018*Math.sin(x*.65+z*.09)+.012*Math.cos(z*.17-x*.30)
  const fine=.007*Math.sin(z*4.1+x*.5+.22*Math.sin(x*2))*(.5+.5*Math.sin(x*.9+z*.13))
  return feather*(.072+longRidge+broad+fine)
}

const samples=Float64Array.from({length:(SAND_X_STEPS+1)*(SAND_Z_STEPS+1)},(_,i)=>
  sandCoverThickness(sandGridX(i%(SAND_X_STEPS+1)),sandGridZ(Math.floor(i/(SAND_X_STEPS+1)))))
export const sandGridThickness=(ix:number,iz:number)=>samples[iz*(SAND_X_STEPS+1)+ix]!

/** Barycentric evaluation of the actual rendered sand triangles, not an analytic approximation. */
export function depositionSurfaceHeight(x:number,z:number,progress:number) {
  const p=clampProgress(progress),bed=riverHeights(p).bed
  if(Math.abs(x)>SAND_HALF_WIDTH||Math.abs(z)>SAND_HALF_LENGTH)return bed
  const gx=(x+SAND_HALF_WIDTH)/(SAND_HALF_WIDTH*2)*SAND_X_STEPS
  const gz=(z+SAND_HALF_LENGTH)/(SAND_HALF_LENGTH*2)*SAND_Z_STEPS
  const ix=Math.min(SAND_X_STEPS-1,Math.max(0,Math.floor(gx)))
  const iz=Math.min(SAND_Z_STEPS-1,Math.max(0,Math.floor(gz)))
  const tx=gx-ix,tz=gz-iz
  const a=sandGridThickness(ix,iz),b=sandGridThickness(ix+1,iz)
  const c=sandGridThickness(ix,iz+1),d=sandGridThickness(ix+1,iz+1)
  const thickness=tx+tz<=1?a*(1-tx-tz)+b*tx+c*tz:b*(1-tz)+c*(1-tx)+d*(tx+tz-1)
  return bed+thickness*p
}
