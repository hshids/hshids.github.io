import * as THREE from 'three';

const GRID=.10, SAMPLE=.012, GUARD=.007, MAX_STEP=.16, MARGIN=3, MAX_NODES=12000;
const EPSILON=1e-6;

// A small deterministic heap keeps a local search bounded without sorting the
// entire open set every frame. Each search runs synchronously against one set
// of real door/furniture colliders.
class OpenSet {
  constructor(){this.items=[];this.sequence=0;}
  static before(a,b){return a.f<b.f||(a.f===b.f&&(a.h<b.h||(a.h===b.h&&a.order<b.order)));}
  push(node){
    const entry={node,g:node.g,h:node.h,f:node.g+node.h,order:this.sequence++},items=this.items;
    items.push(entry);let i=items.length-1;
    while(i>0){const parent=(i-1)>>1;if(!OpenSet.before(entry,items[parent]))break;items[i]=items[parent];i=parent;}
    items[i]=entry;
  }
  pop(){
    const items=this.items;if(!items.length)return null;
    const first=items[0],last=items.pop();if(!items.length)return first;
    let i=0;
    while(true){let child=i*2+1;if(child>=items.length)break;
      if(child+1<items.length&&OpenSet.before(items[child+1],items[child]))child++;
      if(!OpenSet.before(items[child],last))break;items[i]=items[child];i=child;
    }
    items[i]=last;return first;
  }
  get length(){return this.items.length;}
}

function coordinates(value){
  const p=Array.isArray(value)?value:value?.isVector3?[value.x,value.y,value.z]:null;
  return p&&p.length>=3&&p.every(Number.isFinite)?p:null;
}

/** Plan a supported path through real room openings and around furniture.
 * Returns waypoints excluding the start; the last waypoint is the exact end
 * XZ, with its true floor height. null means there is no bounded, safe route.
 * passable(x,z) already includes the world's character radius and headroom. */
export function planWalk({start,end,passable,floorAt}={}) {
  const from=coordinates(start),goal=coordinates(end);
  if(!from||!goal||typeof passable!=='function'||typeof floorAt!=='function')return null;
  function sample(x,z,allowExactStart=false){
    if(!passable(x,z))return null;
    // A seven-millimetre planning margin covers the intervals between samples
    // without changing the world's collider radius. It still fits a target
    // with one centimetre of clearance and prevents grazing a thin door corner.
    const escapingStart=allowExactStart&&x===from[0]&&z===from[2];
    if(!escapingStart)for(const dx of[-GUARD,GUARD])for(const dz of[-GUARD,GUARD])if(!passable(x+dx,z+dz))return null;
    const y=floorAt(x,z);return Number.isFinite(y)?new THREE.Vector3(x,y,z):null;
  }
  // Keyboard movement can legitimately stop inside the extra planning margin.
  // Only that exact starting point may escape it; goals stay fully guarded.
  const a=sample(from[0],from[2],true),b=sample(goal[0],goal[2]);
  if(!a||!b)return null;
  function segment(p,q){
    const distance=Math.hypot(q.x-p.x,q.z-p.z),steps=Math.max(1,Math.ceil(distance/SAMPLE));
    let previous=sample(p.x,p.z,true);if(!previous)return false;
    for(let i=1;i<=steps;i++){
      const t=i/steps,next=sample(THREE.MathUtils.lerp(p.x,q.x,t),THREE.MathUtils.lerp(p.z,q.z,t));
      if(!next||Math.abs(next.y-previous.y)>MAX_STEP+EPSILON)return false;
      previous=next;
    }
    return true;
  }
  if(segment(a,b))return[b];

  // Anchor the grid to the EXACT start. The goal remains a virtual endpoint,
  // never a rounded grid cell; a seat may have only a centimetre of clearance.
  const minI=Math.floor((Math.min(a.x,b.x)-MARGIN-a.x)/GRID),maxI=Math.ceil((Math.max(a.x,b.x)+MARGIN-a.x)/GRID);
  const minJ=Math.floor((Math.min(a.z,b.z)-MARGIN-a.z)/GRID),maxJ=Math.ceil((Math.max(a.z,b.z)+MARGIN-a.z)/GRID);
  const nodes=new Map(),edges=new Map(),open=new OpenSet();
  const key=(i,j)=>i+','+j;
  function nodeAt(i,j){
    if(i<minI||i>maxI||j<minJ||j>maxJ)return null;
    const id=key(i,j);if(nodes.has(id))return nodes.get(id);
    if(nodes.size>=MAX_NODES)return null;
    const p=sample(a.x+i*GRID,a.z+j*GRID,i===0&&j===0);
    const node=p?{id,i,j,p,g:Infinity,h:Math.hypot(b.x-p.x,b.z-p.z),parent:null,closed:false}:null;
    nodes.set(id,node);return node;
  }
  function edge(p,q){
    const id=p.id<q.id?p.id+'|'+q.id:q.id+'|'+p.id;
    if(!edges.has(id))edges.set(id,segment(p.p,q.p));return edges.get(id);
  }
  const first=nodeAt(0,0);if(!first)return null;first.g=0;open.push(first);
  const directions=[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[-1,-1],[1,-1]];
  let reached=null,expanded=0;
  while(open.length&&expanded<MAX_NODES){
    const entry=open.pop(),current=entry.node;
    if(current.closed||entry.g!==current.g)continue;
    current.closed=true;expanded++;
    if(current.h<=GRID*2.5&&segment(current.p,b)){reached=current;break;}
    for(const[di,dj]of directions){
      const next=nodeAt(current.i+di,current.j+dj);if(!next||!edge(current,next))continue;
      if(di&&dj){
        // Both adjacent axial cells must be supported and clear. A diagonal
        // never clips the corner of a wall, door leaf, chair or stair riser.
        const sideX=nodeAt(current.i+di,current.j),sideZ=nodeAt(current.i,current.j+dj);
        if(!sideX||!sideZ||!edge(current,sideX)||!edge(current,sideZ))continue;
      }
      const cost=current.g+Math.hypot(di,dj)*GRID+Math.abs(next.p.y-current.p.y)*.10;
      if(cost>=next.g-EPSILON)continue;
      next.g=cost;next.parent=current;next.closed=false;open.push(next);
    }
  }
  if(!reached)return null;
  const path=[];for(let node=reached;node;node=node.parent)path.push(node.p);path.reverse();
  // A tiny final segment keeps the precision of cushions/action anchors.
  if(path.at(-1).distanceToSquared(b)>EPSILON*EPSILON)path.push(b);else path[path.length-1]=b;
  const result=[];let anchor=0;
  while(anchor<path.length-1){
    let next=path.length-1;
    while(next>anchor+1&&!segment(path[anchor],path[next]))next--;
    if(!segment(path[anchor],path[next]))return null;
    result.push(path[next].clone());anchor=next;
  }
  return result.length?result:[b];
}
