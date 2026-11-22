// Pure geometry shared by player planning, AI and the renderer. Coordinates are metres.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const MOVEMENT_MODES=Object.freeze({
 walk:{label:'Walk',budget:.72,energy:.50,turn:.72,delay:.85,exposure:-1},
 run:{label:'Run',budget:1,energy:1,turn:1,delay:1,exposure:0},
 sprint:{label:'Sprint',budget:1.35,energy:1.65,turn:1.28,delay:1.12,exposure:2},
 cautious:{label:'Cautious',budget:.58,energy:.72,turn:.6,delay:1.12,exposure:-4}
});
export const movementMode=key=>Object.hasOwn(MOVEMENT_MODES,key)?MOVEMENT_MODES[key]:MOVEMENT_MODES.run;
export const heading=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
export const angleBetween=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
export function facingArc(unit,point){const a=angleBetween(unit.facing??(unit.team?Math.PI:0),heading(unit,point));return a>Math.PI*2/3?'rear':a>Math.PI/3?'side':'front';}
// A rectangle's covered interval on a segment; edge contact of zero length costs nothing.
export function rectInterval(a,b,o){let lo=0,hi=1;for(const [k,size] of [['x','w'],['y','h']]){const d=b[k]-a[k];if(Math.abs(d)<1e-10){if(a[k]<o[k]||a[k]>o[k]+o[size])return null;}else{let x=(o[k]-a[k])/d,y=(o[k]+o[size]-a[k])/d;if(x>y)[x,y]=[y,x];lo=Math.max(lo,x);hi=Math.min(hi,y);if(lo>=hi)return null;}}return [lo,hi];}
export function terrainExtra(a,b,terrain=[]){const intervals=terrain.map(o=>({range:rectInterval(a,b,o),factor:Math.max(1,o.factor||1)})).filter(o=>o.range);if(!intervals.length)return 0;const cuts=[0,1,...intervals.flatMap(o=>o.range)].sort((x,y)=>x-y);let cost=0;for(let i=1;i<cuts.length;i++){const mid=(cuts[i]+cuts[i-1])/2;const factor=Math.max(1,...intervals.filter(o=>mid>=o.range[0]&&mid<=o.range[1]).map(o=>o.factor));cost+=(cuts[i]-cuts[i-1])*(factor-1);}return cost*dist(a,b);}
// Nearby bends are clustered by travelled distance, not waypoint count. A subdivided
// corner cannot get cheaper by replacing it with tiny steps. Broad arcs remain cheaper.
// The first bend scales with distance already travelled (minimum 75% momentum).
export function measure(points,k,terrain=[]){let length=0,ground=0,turn=0,travel=0,group=null,previous=null;const bends=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],d=dist(a,b);if(d<1e-8)continue;const h=heading(a,b);if(previous!==null){const angle=angleBetween(previous,h);if(angle>1e-5){const gap=group?travel-group.last:travel;if(!group||gap>1.0){group={last:travel,sum:0,angle:0,charged:0,factor:.75+.25*Math.min(1,gap/2)};}group.last=travel;group.angle+=angle;group.sum+=1-Math.cos(angle);const chunks=Math.floor(group.angle/Math.PI),rem=group.angle-chunks*Math.PI;const value=k*group.factor*Math.max(group.sum,2*chunks+1-Math.cos(rem));const extra=Math.max(0,value-group.charged);turn+=extra;group.charged=value;bends.push({index:i-1,angle:angle*180/Math.PI,cost:extra});}}previous=h;travel+=d;length+=d;ground+=terrainExtra(a,b,terrain);}return {length,turn,terrain:ground,total:length+turn+ground,bends};}
// Exact entry/exit parameters against a circle, ordered along a segment.
export function circleCrossings(a,b,center,r){const dx=b.x-a.x,dy=b.y-a.y,x=a.x-center.x,y=a.y-center.y,A=dx*dx+dy*dy;if(A<1e-12)return [];const B=2*(x*dx+y*dy),C=x*x+y*y-r*r,disc=B*B-4*A*C;if(disc<=1e-10)return [];return [(-B-Math.sqrt(disc))/(2*A),(-B+Math.sqrt(disc))/(2*A)].map((t,i)=>({t,exit:i===1})).filter(q=>q.t>=-1e-8&&q.t<1-1e-8).map(q=>({...q,t:clamp(q.t,0,1)}));}
