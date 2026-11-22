// Universal status engine. Instances retain source, expiry and decay independently.
// No abilities are implied by definitions; only mundane actions currently deliver effects.
const clamp=(x,a=0,b=100)=>Math.max(a,Math.min(b,x));
const def=(label,model,family,decay=0,duration=8,channels={},stack='diminishing',extra={})=>({label,model,family,decay,duration,channels,stack,...extra});
export const CONDITIONS={
 bleeding:def('Bleeding','graded','physical',0,12,{},'independent',{damage:'piercing',rate:.045}),
 poisoned:def('Poisoned','graded','physical',2,20,{physical:.23},'diminishing',{drain:'physical',rate:.05}),
 burning:def('Burning','graded','physical',4,8,{},'independent',{damage:'heat',rate:.065}),
 chilled:def('Chilled','graded','physical',7,10,{movement:.35,control:.25}),
 frozen:def('Frozen','threshold','mobility',5,10,{movement:.75,control:.45}),
 numbness:def('Numbness','graded','sensory',5,10,{control:.45,sensory:.15}),
 weakness:def('Weakness','graded','physical',4,12,{physical:.5}),
 paralysis:def('Paralysis','threshold','mobility',5,8,{control:.75,movement:.75}),
 cramping:def('Cramping','graded','physical',5,10,{movement:.3,expenditure:.35},'accumulating'),
 suffocating:def('Suffocating','threshold','physical',0,12,{},'strongest',{drain:'physical',rate:.12,damage:'vital',damageThreshold:70}),
 sickened:def('Sickened','graded','physical',2,20,{physical:.25,recovery:.45}),
 slowed:def('Slowed','graded','mobility',5,10,{movement:.55}),
 hindered:def('Hindered','graded','mobility',4,10,{movement:.35,turning:.6}),
 offBalance:def('Off-balance','graded','mobility',10,12,{control:.25,response:.25}),
 restrained:def('Restrained','threshold','mobility',0,10,{movement:.75,control:.5}),
 prone:def('Prone','discrete','mobility',0,null,{movement:.45,control:.25},'strongest'),
 immobilized:def('Immobilized','discrete','mobility',0,5,{},'strongest'),
 obscured:def('Obscured vision','graded','sensory',5,10,{vision:.7}),
 blinded:def('Blinded','threshold','sensory',5,10,{vision:1}),
 deafened:def('Deafened','threshold','sensory',5,10,{hearing:1}),
 disoriented:def('Disoriented','graded','sensory',6,10,{sensory:.35,control:.2}),
 sensoryOverload:def('Sensory overload','graded','cognitive',4,10,{mental:.45,expenditure:.25}),
 hallucinating:def('Hallucinating','graded','cognitive',3,15,{sensory:.45,mental:.3}),
 fear:def('Fear','graded','volitional',6,18,{}),
 confusion:def('Confusion','graded','cognitive',5,12,{mental:.5,control:.2}),
 demoralized:def('Demoralized','graded','volitional',3,15,{will:.45,recovery:.2}),
 distracted:def('Distracted','graded','cognitive',6,10,{mental:.3,sensory:.2}),
 compulsion:def('Compulsion','graded','volitional',3,12,{will:.5}),
 mentalSuppression:def('Mental suppression','graded','cognitive',3,12,{mental:.5,recovery:.3}),
 agitated:def('Agitated','graded','volitional',5,12,{expenditure:.4,control:.25}),
 dazed:def('Dazed','graded','cognitive',8,8,{response:.55,sensory:.35}),
 stunned:def('Stunned','threshold','cognitive',12,5,{response:.75,control:.5}),
 unconscious:def('Unconscious','discrete','physical',0,5,{},'strongest'),
 arcaneDisruption:def('Arcane disruption','graded','arcane',5,10,{arcane:.5}),
 manaLeakage:def('Mana leakage','graded','arcane',2,12,{},'diminishing',{drain:'mana',rate:.08}),
 manaStagnation:def('Mana stagnation','graded','arcane',3,12,{manaRecovery:.8}),
 arcaneSuppression:def('Arcane suppression','graded','arcane',4,10,{arcane:.65}),
 arcaneInstability:def('Arcane instability','graded','arcane',4,10,{arcane:.35}),
 spellInterference:def('Spell interference','graded','arcane',5,10,{arcane:.4}),
 arcaneSealing:def('Arcane sealing','threshold','arcane',3,12,{arcane:.9}),
 overexerted:def('Overexerted','graded','exhaustion',2,15,{recovery:.5,expenditure:.25}),
};
const FAMILY={physical:{END:.6,VIT:.4},mobility:{AGI:.4,STR:.35,END:.25},sensory:{PER:.65,END:.35},cognitive:{INT:.65,WIL:.35},volitional:{WIL:.7,INT:.3},arcane:{SPI:.7,WIL:.3},exhaustion:{STA:.5,VIT:.3,WIL:.2}};
export function conditionResistance(unit,key){const weights=FAMILY[CONDITIONS[key]?.family]||FAMILY.physical;return Object.entries(weights).reduce((n,[k,w])=>n+(unit.stats[k]||20)*w,0);}
export function resistedSeverity(key,target,potency,application,roll=10){const resist=conditionResistance(target,key),a=Math.max(0,application);return clamp(potency*Math.min(1,2*a/(a+resist||1))*(.8+.4*(clamp(roll,1,20)-1)/19));}
function combine(values,rule){if(!values.length)return 0;if(values.length===1)return values[0];if(rule==='strongest')return Math.max(...values);if(rule==='accumulating'||rule==='independent')return clamp(values.reduce((a,b)=>a+b,0));return 100*(1-values.reduce((a,b)=>a*(1-b/100),1));}
export function severity(u,key){const d=CONDITIONS[key];if(!d)return 0;const values=(u.conditions||[]).filter(e=>e.key===key).map(e=>e.severity);if(key==='fear'&&u.fear>0)values.push(clamp(u.fear));if(key==='offBalance'&&u.off>0)values.push(clamp(u.off));return combine(values,d.stack);}
export function conditionList(u){return Object.entries(CONDITIONS).map(([key,d])=>({key,label:d.label,severity:severity(u,key),model:d.model,sources:(u.conditions||[]).filter(e=>e.key===key).map(e=>({...e}))})).filter(x=>x.severity>1e-6);}
export function applyCondition(u,key,amount,opts={}){const d=CONDITIONS[key];if(!d||!Number.isFinite(amount)||amount<=0)return 0;const value=d.model==='discrete'?100:clamp(amount);const duration=opts.duration===undefined?d.duration:opts.duration;if(duration!==null&&(!Number.isFinite(duration)||duration<=0))return 0;const decay=opts.decay??d.decay,decayMode=opts.decayMode??'linear';if(!Number.isFinite(decay)||decay<0||!['linear','proportional'].includes(decayMode))return 0;u.conditions??=[];u.conditions.push({key,severity:value,remaining:duration,decay,decayMode,source:typeof opts.source==='string'?opts.source:null});return severity(u,key);}
export function clearCondition(u,key){u.conditions=(u.conditions||[]).filter(e=>e.key!==key);if(key==='fear')u.fear=0;if(key==='offBalance')u.off=0;}
const CHANNELS=Object.fromEntries([...new Set(Object.values(CONDITIONS).flatMap(d=>Object.keys(d.channels)))].map(k=>[k,Object.entries(CONDITIONS).filter(([id,d])=>d.channels[k])]));
export function channel(u,key){if(!u.conditions?.length&&!u.off&&!u.fear)return 1;let factor=1;for(const [id,d] of CHANNELS[key]||[]){const weight=d.channels[key];if(!weight)continue;factor*=1-weight*severity(u,id)/100;}return Math.max(key==='vision'||key==='hearing'?0:.25,factor);}
export const incapacitated=u=>u.hp<=0||u.dead===true||severity(u,'unconscious')>0;
export const immobilized=u=>['frozen','paralysis','restrained'].some(k=>severity(u,k)>=99.999)||severity(u,'immobilized')>0;
export const stunned=u=>severity(u,'stunned')>=85;
export function conditionStep(u,dt){const effects=[];if(!(dt>0))return effects;const instances=u.conditions||[]; if(!instances.length){u.off=Math.max(0,(u.off||0)-dt*10);u.fear=Math.max(0,(u.fear||0)-dt*6);return effects;} // integrate linear decay until expiry
 const boundaries=[0,dt];for(const e of instances){if(e.remaining!==null&&e.remaining>0&&e.remaining<dt)boundaries.push(e.remaining);if(e.decayMode!=='proportional'&&e.decay>0&&e.severity/e.decay<dt)boundaries.push(e.severity/e.decay);}boundaries.sort((a,b)=>a-b);
 for(let j=1;j<boundaries.length;j++){const a=boundaries[j-1],z=boundaries[j],len=z-a;if(len<=0)continue;const value=(e,t)=>e.remaining!==null&&t>=e.remaining?0:(e.decayMode==='proportional'?e.severity*Math.exp(-e.decay*t):Math.max(0,e.severity-e.decay*t));for(const [key,d] of Object.entries(CONDITIONS)){if(!d.rate)continue;const es=instances.filter(e=>e.key===key);if(!es.length)continue;let avg;if(d.stack==='independent')avg=es.reduce((n,e)=>n+(e.decayMode==='proportional'&&e.decay>0?value(e,a)*(-Math.expm1(-e.decay*len))/(e.decay*len):value(e,(a+z)/2)),0);else avg=combine(es.map(e=>value(e,(a+z)/2)),d.stack);if(avg<=0)continue;if(d.drain)effects.push({key,resource:d.drain,amount:avg*d.rate*len});if(d.damage&&(!d.damageThreshold||avg>=d.damageThreshold))effects.push({key,type:d.damage,amount:avg*d.rate*len});}}
 u.conditions=instances.map(e=>({...e,severity:e.decayMode==='proportional'?e.severity*Math.exp(-e.decay*dt):Math.max(0,e.severity-e.decay*dt),remaining:e.remaining===null?null:Math.max(0,e.remaining-dt)})).filter(e=>e.severity>1e-6&&(e.remaining===null||e.remaining>1e-8));u.off=Math.max(0,(u.off||0)-dt*10);u.fear=Math.max(0,(u.fear||0)-dt*6);return effects;
}
export function validateConditions(u){if(u.conditions===undefined)u.conditions=[];if(!Array.isArray(u.conditions)||u.conditions.length>10000||!u.conditions.every(e=>e&&Object.hasOwn(CONDITIONS,e.key)&&Number.isFinite(e.severity)&&e.severity>0&&e.severity<=100&&(e.remaining===null||Number.isFinite(e.remaining)&&e.remaining>0)&&Number.isFinite(e.decay)&&e.decay>=0&&(e.decayMode===undefined||['linear','proportional'].includes(e.decayMode))&&(e.source===null||typeof e.source==='string')))throw Error('Invalid saved conditions');}
