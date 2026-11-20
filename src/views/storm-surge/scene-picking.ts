export type SceneSelection = { kind:'house'; id:string } | { kind:'wall'; z:number }
type Footprint = { id:string; x:number; z:number; width:number; depth:number }
type PickNode = { parent:PickNode|null }
type PickHit = { object:PickNode; point:{x:number;z:number} }

/** CSS pixels, not drawing-buffer pixels: this also works at browser zoom/DPR. */
export function pointerNdc(x:number,y:number,rect:{left:number;top:number;width:number;height:number}){
  if(rect.width<=0||rect.height<=0||x<rect.left||x>rect.left+rect.width||y<rect.top||y>rect.top+rect.height)return null
  return {x:(x-rect.left)/rect.width*2-1,y:1-(y-rect.top)/rect.height*2}
}
export function sameSelection(a:SceneSelection|null,b:SceneSelection|null){
  return a===b||!!a&&!!b&&a.kind===b.kind&&(a.kind==='house'&&b.kind==='house'?a.id===b.id:a.kind==='wall'&&b.kind==='wall'&&a.z===b.z)
}
function belongsTo(object:PickNode,root:PickNode){
  let current:PickNode|null=object
  while(current){if(current===root)return true;current=current.parent}
  return false
}
/** The first solid hit owns the click. A paved parcel/terrain hit must not
 * select a building hidden farther behind it. Water itself remains transparent. */
export function selectionFromHits(hits:readonly PickHit[],houses:readonly Footprint[],city:PickNode,wall:PickNode):SceneSelection|null{
  const hit=hits[0]
  if(!hit)return null
  if(belongsTo(hit.object,wall))return {kind:'wall',z:Math.round(hit.point.z*10)/10||0}
  if(!belongsTo(hit.object,city))return null
  const house=houses.find(h=>Math.abs(hit.point.x-h.x)<=h.width/2+.15&&Math.abs(hit.point.z-h.z)<=h.depth/2+.15)
  return house?{kind:'house',id:house.id}:null
}

/** Distance is accumulated, so dragging out and back is never a click.
 * All participants in a multi-touch gesture stay blocked until released. */
export function createTapTracker(threshold=6){
  const pointers=new Map<number,{x:number;y:number;distance:number;blocked:boolean}>()
  function block(){for(const pointer of pointers.values())pointer.blocked=true}
  function move(id:number,x:number,y:number){
    const pointer=pointers.get(id)
    if(!pointer)return
    pointer.distance+=Math.hypot(x-pointer.x,y-pointer.y);pointer.x=x;pointer.y=y
    if(pointer.distance>threshold)pointer.blocked=true
  }
  return {
    down(id:number,x:number,y:number,button=0){
      const multiple=pointers.size>0
      if(multiple)block()
      pointers.set(id,{x,y,distance:0,blocked:multiple||button!==0})
    },
    move,
    up(id:number,x:number,y:number){
      move(id,x,y)
      const pointer=pointers.get(id),tap=!!pointer&&!pointer.blocked&&pointers.size===1
      pointers.delete(id)
      return tap
    },
    cancel(id:number){pointers.delete(id)},
    block,
    clear(){pointers.clear()},
  }
}
