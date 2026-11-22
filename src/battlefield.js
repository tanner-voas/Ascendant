// Geometry and perceptual rules are independent of UI and combat scheduler.
import {rectInterval} from './navigation.js';
import {channel,incapacitated} from './conditions.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const inRegion=(p,r)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
export function elevation(map,p){let z=0;for(const r of map.elevation||[]){if(!inRegion(p,r))continue;const inset=Math.min(p.x-r.x,r.x+r.w-p.x,p.y-r.y,r.y+r.h-p.y);z=Math.max(z,r.height*clamp(inset/r.ramp,0,1));}return z;}
export function groundAt(map,p){const regions=(map.terrain||[]).filter(r=>inRegion(p,r));return {elevation:elevation(map,p),factor:Math.max(1,...regions.map(r=>r.factor)),concealment:Math.max(0,...regions.map(r=>r.concealment||0)),stability:Math.min(1,...regions.map(r=>r.stability??1)),regions:regions.map(r=>r.kind),hazards:(map.hazards||[]).filter(r=>inRegion(p,r))};}
// Eye-to-torso ray; legacy obstacles with no height remain fully opaque.
export function lineOfSight(map,a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<1e-8)return true;const za=elevation(map,a)+1.6,zb=elevation(map,b)+1.2;for(const o of map.obstacles){const q=rectInterval(a,b,o);if(!q)continue;if(o.height===undefined)return false;const mid=(q[0]+q[1])/2,base=elevation(map,{x:a.x+dx*mid,y:a.y+dy*mid});if(base+o.height>=Math.min(za+(zb-za)*q[0],za+(zb-za)*q[1]))return false;}if(map.elevation?.length)for(let i=1,n=Math.ceil(d);i<n;i++){const t=i/n;if(elevation(map,{x:a.x+dx*t,y:a.y+dy*t})>za+(zb-za)*t-.05)return false;}return true;}
export function concealment(map,a,b){const d=Math.hypot(a.x-b.x,a.y-b.y);let depth=0;for(const r of map.terrain||[]){if(!r.concealment)continue;const q=rectInterval(a,b,r);if(q)depth+=(q[1]-q[0])*d*r.concealment;}return clamp(depth/8+groundAt(map,b).concealment*.35,0,.75);}
export function canSee(map,a,b){if(incapacitated(a))return false;const d=Math.hypot(a.x-b.x,a.y-b.y),sens=channel(a,'sensory'),vision=channel(a,'vision'),hearing=channel(a,'hearing');if(d<=2.0*sens*hearing&&lineOfSight(map,a,b))return true;if(vision<=0||d>a.max.sight*sens*vision*1.25||!lineOfSight(map,a,b))return false;const high=clamp((elevation(map,a)-elevation(map,b))*.08,-.2,.25);return d<=a.max.sight*sens*vision*(1+high)*(1-concealment(map,a,b));}
// Player-facing identification is always limited by actual perception, even when
// the testing option to disable fog lets the combat engine target freely.
export function perceivedTo(b,team,u){return !!u&&(u.team===team||b.units.some(a=>a.team===team&&a.hp>0&&canSee(b.map,a,u)));}
export function visibleTo(b,team,u){return !!u&&(!b.map.fog||perceivedTo(b,team,u));}
export function coverBetween(map,a,b){let cover=0;const d=Math.hypot(a.x-b.x,a.y-b.y);for(const o of map.obstacles){if(!o.cover||o.height===undefined)continue;const q=rectInterval(a,b,o);if(q&&d*(1-q[1])<=2.5&&lineOfSight(map,a,b))cover=Math.max(cover,o.cover);}return cover;}
export function environmentModifier(map,a,b){if(!map.schema)return 0;const ga=groundAt(map,a),gb=groundAt(map,b);return 1.2*clamp(ga.elevation-gb.elevation,-1.5,1.5)-2*(1-ga.stability)+1*(1-gb.stability)-coverBetween(map,a,b)*3-concealment(map,a,b)*2;}
// Continuous hazards use per-second resistance, never repeated flat DR per scheduler event.
export function hazardExposure(map,u,dt){return groundAt(map,u).hazards.map(r=>({id:r.id,kind:r.kind,type:r.damageType,damage:r.damageRate*dt,physical:(r.energyRate||0)*dt,condition:r.condition,potency:r.potency||0}));}
// Simple shared explored-cell map. Current visibility is calculated from live observers.
export function visibilityCells(b,team=0,step=2){const live=b.units.filter(u=>u.team===team&&!incapacitated(u)),out=[];for(let y=0;y<b.map.h;y+=step)for(let x=0;x<b.map.w;x+=step){const w=Math.min(step,b.map.w-x),h=Math.min(step,b.map.h-y),p={x:x+w/2,y:y+h/2};out.push({x,y,w,h,id:`${x}:${y}`,visible:live.some(u=>canSee(b.map,u,p))});}return out;}
export function pathHazards(map,points){return (map.hazards||[]).map(h=>{let length=0;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],q=rectInterval(a,b,h);if(q)length+=(q[1]-q[0])*Math.hypot(b.x-a.x,b.y-a.y);}return {id:h.id,kind:h.kind,length};}).filter(h=>h.length>1e-6);}
