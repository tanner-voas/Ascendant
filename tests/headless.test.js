import test from 'node:test';
import assert from 'node:assert/strict';
import {newBattle,balanced,actor,engageTarget,ENGAGEMENT_REACH,move,fitPath,route,stepTimeline,dist} from '../src/engine.js';
import {makeMap} from '../src/maps.js';
import {roster,defaultScenario,runScenario,launchScenario} from '../src/lab.js';
import {runHeadless,assertBattleState} from '../src/headless.js';
import {snapshot,restore} from '../src/persistence.js';

const teams=(a='balanced',b='balanced')=>[roster(5,200,a,13,0),roster(5,200,b,23,1)];
const blank=()=>{const map=makeMap(0,91,{fog:false,elevation:false,hazards:false});map.obstacles=[];map.terrain=[];map.elevation=[];map.hazards=[];return map;};

test('headless paced scheduler produces exactly the same full result as the existing laboratory engine',()=>{
 for(const [seed,index,a,b] of [[1,0,'balanced','random'],[12,3,'STR+REA','END+VIT'],[31,17,'AGI+PER','WIL+STA']]){
  const map=makeMap(index,seed*13,{fog:seed%2===0,elevation:true,hazards:true}),t=teams(a,b);
  const h=runHeadless(newBattle(t,map,seed));
  const lab=runScenario(defaultScenario(t,map),seed);
  assert.deepEqual([h.winner,h.time,h.turns,h.events],[lab.winner,lab.time,lab.turns,lab.events]);
  assert.equal(h.battle.units.length,10);
  assert.ok(h.transitions>h.turns,'headless visits actual scheduler events');
 }
});

test('headless runs unusual battle sizes with the unchanged engine, not a synthetic combat model',()=>{
 const map=makeMap(2,77,{fog:true});
 for(const size of [1,3,8]){
  const s=defaultScenario([roster(size,200,'REA+AGI',10,0),roster(size,200,'END+VIT',20,1)],map);
  s.maxTurns=800;
  const h=runHeadless(launchScenario(s,100+size),{maxTransitions:100000});
  assert.equal(h.battle.units.length,size*2);
  assert.notEqual(h.winner,null);
 }
});

test('defeated engagement targets do not leave stale pointers until another movement tick',()=>{
 const b=newBattle(teams(),blank(),51);const a=b.units[0],e=b.units[5];
 Object.assign(a,{x:10,y:10});Object.assign(e,{x:11.5,y:10});
 assert.equal(engageTarget(b,a,e),true);assert.equal(a.engagedWith,e.id);
 e.hp=0;b.active=null;stepTimeline(b);
 assert.equal(a.engagedWith,null);
 assertBattleState(b);
});

test('defeated owners lose engagement and older stale-link saves migrate cleanly',()=>{
 const b=newBattle(teams(),blank(),58);const a=b.units[0],e=b.units[5];
 Object.assign(a,{x:10,y:10});Object.assign(e,{x:11.5,y:10});
 assert.equal(engageTarget(b,a,e),true);
 a.hp=0;
 const saved=snapshot(b,teams(),{});
 const loaded=restore(saved);
 assert.equal(loaded.units[0].engagedWith,null);
 b.active=null;stepTimeline(b);
 assert.equal(a.engagedWith,null);
 assertBattleState(b);
});

test('global autopilot engages on contact just like the existing per-character AI setting',()=>{
 const b=newBattle(teams(),blank(),3);b.paced=true;b.autoAll=true;b.recordFrames=false;
 const a=b.units[0],e=b.units[5];for(const u of b.units)u.next=100;
 Object.assign(a,{x:10,y:10,next:0});Object.assign(e,{x:14,y:10});b.active=a.id;
 const path=[{x:10,y:10},{x:19,y:10}];assert(move(b,path).ok);
 for(let i=0;i<100&&a.job;i++)stepTimeline(b);
 assert.equal(a.engagedWith,e.id);
 assert.equal(e.engagedWith,null);
 assert.ok(dist(a,e)<=ENGAGEMENT_REACH+.001);
});

test('headless invariant checker rejects illegal positions and overdrawn resources',()=>{
 const b=newBattle(teams(),blank(),41),a=b.units[0],other=b.units[1];
 assertBattleState(b);a.physical=-1;
 assert.throws(()=>assertBattleState(b),/physical outside/);a.physical=10;
 Object.assign(other,{x:a.x,y:a.y});
 assert.throws(()=>assertBattleState(b),/Stationary overlap/);
});


test('experimental 8v8, 800-point rules and A6–A8 auto settings survive save/restart validation',()=>{
 const map=makeMap(0,55,{fog:false});
 const teams=[roster(8,800,'STR+REA',72,0),roster(8,200,'END+VIT',22,1)];
 const scenario=defaultScenario(teams,map);
 scenario.budgets=[800,200];scenario.rules.health=1.8;scenario.rules.movement=.7;
 const original=launchScenario(scenario,7);original.automated=['A1','A6','A8'];
 const restored=restore(snapshot(original,teams,{mode:'route'}));
 assert.equal(restored.units.length,16);
 assert.equal(restored.units[0].max.hp,original.units[0].max.hp);
 assert.equal(restored.units[0].max.move,original.units[0].max.move);
 assert.deepEqual(restored.automated,original.automated);
 assert.equal(restored.units[8].id,'E1');
 assert.equal(restored.experiment,true);
});
