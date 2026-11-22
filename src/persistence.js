import {normalizeTactics} from './tactics.js';
import {validateConditions} from './conditions.js';
import {rng,valid,derived,ACTIONS,REACTIONS,KEYS,total} from './engine.js';
import {normalizeRules,experimentalStats} from './lab-rules.js';
import {legacyMap,validateMap} from './maps.js';
import {team,clone} from './rosters.js';

export function snapshot(b,initial,ui){
 const {random,map,...state}=b;
 return clone({format:'ascendant-battle-v1',mapId:map.id,...(map.schema?{battlefield:map}:{}),randomState:random.state(),initial,ui,state});
}

const finiteFields=(o,keys)=>keys.every(k=>Number.isFinite(o[k]));
const slotId=(side,i)=>`${side?'E':'A'}${i+1}`;

function validInitial(initial,experimental){
 if(!Array.isArray(initial)||initial.length!==2)return false;
 if(!experimental)return initial.every(team);
 return initial.every(t=>{
  if(!Array.isArray(t)||t.length<1||t.length>10)return false;
  const budget=total(t[0].stats);
  return t.every(c=>c&&typeof c.name==='string'&&c.name.length<=40&&experimentalStats(c.stats,KEYS,budget));
 });
}

export function restore(data){
 if(data?.format!=='ascendant-battle-v1'||!Number.isInteger(data.randomState)||data.randomState<0||data.randomState>4294967295)throw Error('Invalid saved battle');
 const s=clone(data.state??null),initial=data.initial;
 if(!s||!validInitial(initial,s.experiment===true))throw Error('Invalid saved battle');
 const map=data.battlefield?validateMap(clone(data.battlefield)):Number.isInteger(data.mapId)&&data.mapId>=0&&data.mapId<20?legacyMap(data.mapId):null;
 const allyCount=initial[0].length,enemyCount=initial[1].length,unitCount=allyCount+enemyCount;
 if(!map||!Number.isInteger(s.seed)||!Number.isFinite(s.time)||!Number.isInteger(s.turns)||!Array.isArray(s.units)||s.units.length!==unitCount||!Array.isArray(s.log)||![null,0,1,2].includes(s.winner))throw Error('Invalid battle state');

 for(const [i,u] of s.units.entries()){
  const side=i<allyCount?0:1,slot=side?i-allyCount:i;
  if(u.id!==slotId(side,slot)||u.team!==side||typeof u.name!=='string'||!(s.experiment?experimentalStats(u.stats,KEYS,total(initial[side][0].stats)):valid(u.stats))||!finiteFields(u,['x','y','next','off','fear','actions']))throw Error('Invalid saved character');
  const max=derived(u.stats);
  if(s.experiment){
   const rules=normalizeRules(u.rules??{});
   Object.assign(max,{hp:max.hp*rules.health,move:max.move*rules.movement,delay:max.delay*rules.timing,dr:max.dr*rules.reduction,res:Math.min(1,max.res*rules.resistance)});
   u.rules=rules;
  }
  if(!['hp','mana','physical','mental','resolve'].every(k=>Number.isFinite(u[k])&&u[k]>=0&&u[k]<=max[k]+1e-8))throw Error('Invalid saved resources');
  u.max=max;
  validateConditions(u);
  u.grappledBy=u.grappledBy??null;
  u.grappling=u.grappling??null;
  u.engagedWith=u.engagedWith??null;
  if(u.dead!==undefined&&typeof u.dead!=='boolean')throw Error('Invalid life state');
  u.guardPower=Number.isFinite(u.guardPower)?Math.max(0,Math.min(1,u.guardPower)):1;
  u.focusBonus=Number.isFinite(u.focusBonus)?Math.max(0,Math.min(3,u.focusBonus)):3;
  u.facing=Number.isFinite(u.facing)?u.facing:(u.team?Math.PI:0);
  u.interceptReady=u.interceptReady!==false;
  u.reaction=Object.hasOwn(REACTIONS,u.reaction)?u.reaction:'dodge';
  u.followup=!!u.followup;
  u.job=u.job??null;
  if(u.job){
   const j=u.job;
   if(!(j.key==='move'||Object.hasOwn(ACTIONS,j.key))||!['preparation','execution','recovery'].includes(j.phase)||!finiteFields(j,['start','prepEnd','impactAt','end','at'])||j.at<s.time-1e-7||!j.phases||!['preparation','execution','recovery'].every(k=>Number.isFinite(j.phases[k])&&(j.key==='move'?j.phases[k]>=0:j.phases[k]>0)))throw Error('Invalid timeline job');
   if(j.key==='move'){
    if(j.trackingId!=null&&(!s.units.some(v=>v.id===j.trackingId)||!Number.isFinite(j.check?.total)))throw Error('Invalid tracking target');
    if(!Array.isArray(j.steps)||!j.steps.length||j.steps.length>256||!Number.isInteger(j.index)||j.index<0||j.index>j.steps.length||!j.steps.every(q=>finiteFields(q,['at','distance'])&&Number.isFinite(q.point?.x)&&Number.isFinite(q.point?.y))||!j.check||!Number.isFinite(j.expected?.x)||!Number.isFinite(j.expected?.y)||(j.origin!==undefined&&(!Number.isFinite(j.origin?.x)||!Number.isFinite(j.origin?.y)))||(j.progress!==undefined&&(!Number.isFinite(j.progress)||j.progress<0||j.progress>1))||(j.phase==='execution'&&j.index>=j.steps.length))throw Error('Invalid movement job');
   }else if(!j.committed||!finiteFields(j.committed,['ef','delay'])||!finiteFields(j.committed.cost||{},['physical','mental','resolve']))throw Error('Invalid committed action');
  }
 }
 for(const u of s.units){
  if(u.engagedWith!==null){
   const t=s.units.find(v=>v.id===u.engagedWith);
   if(!t||t.team===u.team)throw Error('Invalid engagement target');
   // v0.1.13 snapshots could retain a pointer from/to a defeated unit.
   if(u.hp<=0||t.hp<=0)u.engagedWith=null;
  }
  for(const [field,otherField] of [['grappledBy','grappling'],['grappling','grappledBy']])if(u[field]!==null){
   const v=s.units.find(x=>x.id===u[field]);if(!v||v.team===u.team||v[otherField]!==u.id||u.hp<=0||v.hp<=0||u.grappledBy&&u.grappling)throw Error('Invalid grapple relation');
  }
 }
 if(s.winner===null&&!(s.active===null&&s.units.some(u=>u.hp>0))&&!s.units.some(u=>u.id===s.active&&u.hp>0&&!u.job))throw Error('Invalid active character');
 s.moveDelay=Number.isFinite(s.moveDelay)?s.moveDelay:(s.moveSpent||0);
 s.lastMove=s.lastMove??null;
 s.events=Number.isInteger(s.events)?s.events:0;
 s.frames=Array.isArray(s.frames)?s.frames.slice(-180).filter(f=>Number.isFinite(f?.time)&&typeof f.label==='string'&&Array.isArray(f.units)&&f.units.length===unitCount&&f.units.every(u=>[u.x,u.y,u.hp].every(Number.isFinite))):[];
 s.eventMode=!!s.eventMode;
 s.tactics=normalizeTactics(s.tactics);
 const eligibleId=new Set(s.units.map(u=>u.id));
 s.automated=Array.isArray(s.automated)?[...new Set(s.automated.filter(id=>eligibleId.has(id)&&id.startsWith('A')))]:[];
 s.aiDecisions=Object.fromEntries(Object.entries(s.aiDecisions||{}).filter(([id,d])=>eligibleId.has(id)&&d&&typeof d.reason==='string'&&typeof d.action==='string'&&Number.isFinite(d.time)).map(([id,d])=>[id,clone(d)]));
 return {...clone(s),map,random:rng(data.randomState)};
}
