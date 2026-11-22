#!/usr/bin/env node
// Reproducible engine-only stress suite. No DOM, app state, canvas, or timers.
import assert from 'node:assert/strict';
import {newBattle,move,fitPath,route,stepTimeline} from '../src/engine.js';
import {makeMap} from '../src/maps.js';
import {runHeadless,assertBattleState} from '../src/headless.js';
import {roster} from '../src/lab.js';
import {snapshot,restore} from '../src/persistence.js';

const args=process.argv.slice(2);
function option(name,fallback){const i=args.indexOf(name);return i<0?fallback:Number(args[i+1]);}
const seed=option('--seed',173),cases=option('--cases',20),startCase=option('--start',0),max=option('--max-transitions',200000);
const mixed=args.includes('--mixed');
if(!Number.isInteger(seed)||!Number.isInteger(cases)||!Number.isInteger(startCase)||startCase<0||cases<1||cases>10000)throw Error('Invalid seed/case count');
const teams=()=>[roster(5,200,'balanced',1,0),roster(5,200,'balanced',2,1)];
let completed=0,draws=0,transitions=0,duration=0;const drawn=[];
for(let i=startCase;i<startCase+cases;i++){
 const map=makeMap(i%20,(seed+Math.imul(i,2654435761))>>>0,{fog:i%2===0,elevation:i%3!==0,hazards:i%4===0});
 const builds=['balanced','random','STR+REA','END+VIT','REA+AGI','WIL+STA','AGI+PER'];
 const t=mixed?[roster(5,200,builds[i%builds.length],(seed+i*31)>>>0,0),roster(5,200,builds[(i*3+1)%builds.length],(seed+i*47)>>>0,1)]:teams();
 const b=newBattle(t,map,(seed+i*19)>>>0);
 let result;try{result=runHeadless(b,{maxTransitions:max});}catch(error){throw Error(`Failed case ${i+1}, map=${i%20}, mapSeed=${map.seed}, battleSeed=${b.seed}, builds=${mixed}: ${error.message}`,{cause:error});}
 assert.notEqual(result.winner,null);
 completed++;draws+=result.winner===2;transitions+=result.transitions;duration+=result.wallMs;
 if(result.winner===2){const entry={case:i+1,seed:b.seed,map:i%20,mapSeed:map.seed,turns:b.turns,events:b.events,time:b.time};drawn.push(entry);console.log('DRAW',JSON.stringify(entry));}
 if(i===startCase||i===startCase+cases-1||i%20===19)console.log(`case ${i+1}/${startCase+cases}: seed=${b.seed} winner=${result.winner} turns=${b.turns} events=${b.events} t=${b.time.toFixed(2)}s`);
}
// Deterministic snapshot restoration during an actively tracking movement.
{
 const map=makeMap(0,99,{fog:false,elevation:false,hazards:false});map.obstacles=[];map.terrain=[];map.elevation=[];map.hazards=[];
 const t=teams(),b=newBattle(t,map,91);b.paced=true;b.active='A1';b.time=0;b.recordFrames=false;
 for(const u of b.units){u.next=100;u.x=u.team?map.w-3:3;u.y=2.5+(Number(u.id.slice(1))-1)*4;}
 const a=b.units[0],enemy=b.units[5];a.x=10;a.y=10;a.next=0;enemy.x=20;enemy.y=10;
 const points=fitPath(b,route(b,a,enemy,'run'));assert(points.length>1);
 assert(move(b,points,false,'run',enemy.id).ok);
 stepTimeline(b);stepTimeline(b);
 const same=restore(snapshot(b,t,{}));same.paced=true;
 assertBattleState(b);assertBattleState(same);
 for(let n=0;n<25&&a.job?.phase==='execution';n++){
  if(n===4){enemy.x=22;enemy.y=12;same.units[5].x=22;same.units[5].y=12;}
  stepTimeline(b);stepTimeline(same);
  for(let j=0;j<b.units.length;j++)for(const k of ['x','y','physical','mental','resolve','next'])assert(Math.abs(b.units[j][k]-same.units[j][k])<1e-7,`${b.units[j].id}.${k} diverged after restoration`);
 }
 assertBattleState(b);
}
console.log(JSON.stringify({pass:true,seed,startCase,cases:completed,mixed,draws,drawn,transitions,wallMs:Math.round(duration),meanTransitions:Math.round(transitions/completed),snapshotReplay:true}));
