import {coefficient} from './lab-rules.js';
import {severity,channel,conditionStep} from './conditions.js';
// Resource rules: absolute HP/mana, progressive physical/mental/resolve.
// Effort is voluntary output intensity, not an extra attribute or resource.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const power=(x,e)=>(x/20)**e;
export const RESOURCE_FLOORS={physical:.42,mental:.45,resolve:.40};
export const efficiency=(fraction,floor)=>{const x=clamp(fraction,0,1);return floor+(1-floor)*x*(2-x);};
export const EFFORT_MIN=.5;
export function exertion(value=false){
 if(typeof value==='boolean')return {effort:1,push:value?'both':'none'};
 const effort=Number(value?.effort);
 return {effort:Number.isFinite(effort)?clamp(effort,EFFORT_MIN,1):1,push:['physical','mental','both'].includes(value?.push)?value.push:'none'};
}
// Explicit channels prevent spending Resolve on a resource the action doesn't use.
export const DEMANDS={strike:[.84,.10,.06],heavy:[.90,.05,.05],quick:[.72,.22,.06],shove:[.88,.06,.06],guard:[.70,.25,.05],observe:[0,.95,.05],hold:[0,.90,.10],move:[.95,0,.05],recover:[0,0,0],wait:[0,0,0],trip:[.75,.20,.05],grapple:[.85,.10,.05],escape:[.80,.15,.05],release:[0,0,0],stand:[.95,0,.05],intimidate:[.05,.25,.70]};
export function efficiencies(c,options=false,demand=[1,1,0],load=1){
 const {effort,push}=exertion(options),p0=efficiency(c.physical/c.max.physical,.42),m0=efficiency(c.mental/c.max.mental,.45),w=efficiency(c.resolve/c.max.resolve,.4)*channel(c,'will');
 const bp=['physical','both'].includes(push)&&demand[0]>0?(1-p0)*.75*w:0,bm=['mental','both'].includes(push)&&demand[1]>0?(1-m0)*.75*w:0;
 const requested=20*(bp*demand[0]+bm*demand[1])*load*effort*(1+severity(c,'fear')/100),factor=requested>0?Math.min(1,c.resolve/requested):1;
 return {p:(p0+bp*factor)*channel(c,'physical'),m:(m0+bm*factor)*channel(c,'mental'),w,cost:requested*factor,physicalBoost:bp*factor,mentalBoost:bm*factor,effort,push};
}
export function actionEfficiency(key,e){const d=DEMANDS[key];return d?(d[0]*e.p+d[1]*e.m+d[2]*e.w||1):1;}
export const effortCost=e=>.25+.75*e*e;
export const effortOutput=e=>.40+.60*e;
export function affordable(c,cost){return Object.fromEntries(['physical','mental','resolve'].map(k=>[k,Math.min(c[k],Math.max(0,cost[k]||0))]));}
export function actionExpenditure(c,key,a,options=false){
 const setting=exertion(options),effort=['recover','wait','hold'].includes(key)?1:setting.effort,demand=DEMANDS[key]||[1,1,0],e=efficiencies(c,{...setting,effort},demand,a.delay),fear=severity(c,'fear'),s=c.stats;
 const cost={physical:a.physical*coefficient(c,"expenditure")*effortCost(effort)/power(s.STA,.25)*(1+.35*fear/100),mental:a.mental*coefficient(c,"expenditure")*effortCost(effort)/power(s.INT,.25)*(1+.20*fear/100),resolve:e.cost+(key==='heavy'?Math.min(Math.max(0,c.resolve-e.cost),effort):0)};
 cost.physical/=channel(c,'expenditure');cost.mental/=channel(c,'expenditure');return {e,effort,requested:cost,cost:affordable(c,cost)};
}
// Rates per simulated second; resource channels recover independently during low demand.
// Active recover is a separate bonus at impact; no health regeneration during combat.
export function recoveryRates(c,job=c.job){
 const s=c.stats,phase=job?.phase,key=job?.key,effort=exertion(job?.push).effort;
 let p=1,m=1,w=1;
 if(phase==='preparation'){p=.85;m=.35;w=.45;}
 if(phase==='execution'){
  if(key==='recover'||key==='wait'){p=1;m=1;w=1;}
  else {const d=DEMANDS[key]||[1,1,0];p=1-.92*d[0]*effort;m=1-.92*d[1]*effort;w=.30;}
 }
 if(phase==='recovery'){p=.85;m=.85;w=.65;}
 if(job?.committed?.cost?.resolve>0&&phase!=='recovery')w*=.25;
 if(key==='move'&&job?.check?.energy?.resolve>0&&phase!=='recovery')w*=.25;
 const fear=severity(c,'fear'),r=coefficient(c,"recovery");return {physical:r*2.0*power(s.STA,.55)*power(s.VIT,.15)*p*channel(c,'recovery'),mental:r*1.8*power(s.INT,.55)*power(s.VIT,.15)*m*channel(c,'recovery'),resolve:r*.28*power(s.WIL,.65)*w*(1-.004*fear)*channel(c,'recovery'),mana:r*.40*power(s.SPI,.65)*channel(c,'manaRecovery'),hp:0};
}
export function regenerate(c,dt){if(c.hp<=0)return;const rates=recoveryRates(c);for(const k of ['physical','mental','resolve','mana'])c[k]=Math.min(c.max[k],c[k]+Math.max(0,dt)*rates[k]);}
export function activeRecovery(c){const s=c.stats,r=coefficient(c,"recovery");return {physical:r*15*power(s.STA,.5)*power(s.VIT,.15),mental:r*12*power(s.INT,.5)*power(s.VIT,.15),resolve:r*5*power(s.WIL,.5)};}
export function recover(c,amount=activeRecovery(c)){const gains={};for(const k of ['physical','mental','resolve']){gains[k]=Math.min(c.max[k]-c[k],amount[k]);c[k]+=gains[k];}return gains;}

// Conditional forecast: no damage, reactions, interrupts or other state changes.
// Same phase rates and active recovery as the scheduler; fear decays naturally.
export function forecastResources(c,key,phases,cost,options=false){
 const clone={...c,conditions:(c.conditions||[]).map(e=>({...e})),job:null},setting=exertion(options);for(const k of ['physical','mental','resolve'])clone[k]=Math.max(0,clone[k]-(cost[k]||0));
 const afterPayment=Object.fromEntries(['hp','mana','physical','mental','resolve'].map(k=>[k,clone[k]]));
 for(const phase of ['preparation','execution','recovery']){
  clone.job={key,phase,push:setting,committed:{cost}};regenerate(clone,phases[phase]);for(const e of conditionStep(clone,phases[phase]))if(e.resource)clone[e.resource]=Math.max(0,clone[e.resource]-e.amount);
  if(phase==='execution'&&key==='recover')recover(clone);
 }
 return {afterPayment,end:Object.fromEntries(Object.keys(afterPayment).map(k=>[k,clone[k]]))};
}
