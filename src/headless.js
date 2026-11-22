/**
 * Run the real combat scheduler without DOM, animation timers, or rendering.
 * All decisions, movement checkpoints, conditions and engagement follow-up
 * use the same engine functions as the interactive battle screen.
 */
import {actor,aiTurn,stepTimeline,dist,radius,clearSegment} from './engine.js';

const EPS=1e-6;
const finite=x=>Number.isFinite(x);

/** Invariants safe to check after each authoritative scheduler transition. */
export function assertBattleState(b){
 if(!finite(b.time)||b.time<0)throw Error(`Invalid simulated time: ${b.time}`);
 for(const u of b.units){
  for(const k of ['x','y','hp','mana','physical','mental','resolve','next'])if(!finite(u[k]))throw Error(`${u.id} invalid ${k}: ${u[k]}`);
  for(const k of ['hp','mana','physical','mental','resolve'])if(u[k]<-EPS||u[k]>u.max[k]+EPS)throw Error(`${u.id} ${k} outside 0..maximum: ${u[k]}`);
  if(u.hp>0){
   if(u.x<radius-EPS||u.x>b.map.w-radius+EPS||u.y<radius-EPS||u.y>b.map.h-radius+EPS)throw Error(`${u.id} outside battlefield`);
   // Moving characters may temporarily overlap other characters, but never solid walls.
   if(!clearSegment(b.map,u,u))throw Error(`${u.id} inside obstacle`);
  }
  if(u.engagedWith){
   const target=b.units.find(v=>v.id===u.engagedWith);
   if(!target||target.team===u.team||target.hp<=0)throw Error(`${u.id} has invalid engagement ${u.engagedWith}`);
  }
  if(u.job){
   for(const k of ['at','start','end'])if(!finite(u.job[k]))throw Error(`${u.id} invalid job.${k}`);
   if(u.job.at<b.time-EPS)throw Error(`${u.id} has an event scheduled in the past`);
  }
 }
 const stationary=b.units.filter(u=>u.hp>0&&u.job?.key!=='move');
 for(let i=0;i<stationary.length;i++)for(let j=i+1;j<stationary.length;j++){
  if(dist(stationary[i],stationary[j])<radius*2-.002)throw Error(`Stationary overlap: ${stationary[i].id}/${stationary[j].id}`);
 }
 return true;
}

/**
 * Drive an existing battle without UI. The `decision` callback may choose
 * actions for a player or use the default shared aiTurn. `paced` is enabled
 * so every scheduler event remains independently observable, like the GUI.
 */
export function runHeadless(b,{decision=aiTurn,maxTransitions=250000,validate=true,record=false,onTransition=null,autoAll=true}={}){
 b.paced=true;
 b.autoAll=autoAll;
 b.recordFrames=record;
 b.keepLog=record;
 const start=performance.now();
 let transitions=0,decisions=0,events=0,previous=b.time;
 if(validate)assertBattleState(b);
 while(b.winner===null){
  if(transitions++>=maxTransitions)throw Error(`Headless transition limit ${maxTransitions} exceeded at t=${b.time} turn=${b.turns}`);
  const c=actor(b);
  if(c){
   decisions++;
   decision(b,c);
   if(b.active===c.id&&b.winner===null)throw Error(`Decision did not advance ${c.id} at ${b.time}`);
  }else{
   events++;
   stepTimeline(b);
  }
  if(b.time<previous-EPS)throw Error(`Time reversed: ${previous} -> ${b.time}`);
  previous=b.time;
  if(validate)assertBattleState(b);
  onTransition?.(b,{kind:c?'decision':'event',actor:c?.id||null,transitions});
 }
 return {battle:b,winner:b.winner,time:b.time,turns:b.turns,events:b.events,transitions,decisions,schedulerSteps:events,wallMs:performance.now()-start};
}
