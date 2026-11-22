// One impact may contain multiple typed components. Flat DR is allocated
// by raw damage share, so splitting an impact cannot multiply flat defense.
export const DAMAGE_TYPES=Object.freeze({blunt:'Blunt',slashing:'Slashing',piercing:'Piercing',heat:'Heat',cold:'Cold',electrical:'Electrical',corrosive:'Corrosive',sonic:'Sonic',toxic:'Toxic',arcane:'Arcane',mental:'Mental',vital:'Vital',spatial:'Spatial'});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function nonnegative(n,label){if(!Number.isFinite(n)||n<0)throw new RangeError(`Invalid ${label}`);return n;}
export function innateDefense(stats,type='blunt'){
 if(!Object.hasOwn(DAMAGE_TYPES,type))throw new RangeError('Unknown damage type');
 const b=(type==='mental'?(stats.END+stats.WIL)/2:stats.END)/20;
 nonnegative(b,'defense stat');const p=b**.75;return {dr:2*b**.8,res:.6*p/(4+p)};
}
export function combineDefenses(...sources){let dr=0,remaining=1;for(const s of sources){if(!s)continue;dr+=nonnegative(s.dr??0,'DR');remaining*=1-clamp(nonnegative(s.res??0,'RES'),0,1);}return {dr,res:1-remaining};}
export function defenseProfile(stats,bonuses={}){return Object.fromEntries(Object.keys(DAMAGE_TYPES).map(type=>[type,combineDefenses(innateDefense(stats,type),...(bonuses[type]??[]))]));}
export function effectiveDefense(defense={},penetration={}){
 const dr=nonnegative(defense.dr??0,'DR'),res=clamp(nonnegative(defense.res??0,'RES'),0,1);
 const drFlat=nonnegative(penetration.drFlat??0,'flat DR penetration'),drRatio=clamp(nonnegative(penetration.drRatio??0,'proportional DR penetration'),0,1);
 const resFlat=nonnegative(penetration.resFlat??0,'flat RES penetration'),resRatio=clamp(nonnegative(penetration.resRatio??0,'proportional RES penetration'),0,1);
 return {dr:Math.max(0,dr*(1-drRatio)-drFlat),res:Math.max(0,res*(1-resRatio)-resFlat)};
}
export function resolveDamage(components,profile){
 if(!Array.isArray(components)||!components.length)throw new TypeError('Damage event requires components');
 const raw=components.reduce((sum,c)=>{if(!Object.hasOwn(DAMAGE_TYPES,c.type))throw new RangeError('Unknown damage type');return sum+nonnegative(c.raw,'raw damage');},0);
 nonnegative(raw,'event damage');
 const parts=components.map(c=>{const defense=profile[c.type]??{dr:0,res:0},penetration=c.penetration??{},effective=effectiveDefense(defense,penetration),share=raw?c.raw/raw:0,allocatedDR=effective.dr*share,reduced=Math.min(c.raw,allocatedDR),after=c.raw-reduced,resisted=after*effective.res;return {type:c.type,raw:c.raw,share,dr:defense.dr??0,res:defense.res??0,penetration:{...penetration},effectiveDR:effective.dr,effectiveRES:effective.res,allocatedDR,reduced,resisted,damage:after-resisted};});
 const sum=k=>parts.reduce((a,c)=>a+c[k],0);return {raw,reduced:sum('reduced'),resisted:sum('resisted'),damage:sum('damage'),parts};
}
// Each attack uses opposed d20s. No automatic hit/miss on a natural roll:
// a large enough capability difference can overwhelm even excellent luck.
export function degree(margin){return margin>=12?'criticalSuccess':margin>=0?'success':margin<=-12?'criticalFailure':'failure';}
export const criticalScale=outcome=>outcome==='criticalSuccess'?1.4:1;
