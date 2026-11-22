import test from 'node:test';
import assert from 'node:assert/strict';
import {launchScenario,defaultScenario,roster} from '../src/lab.js';
import {makeMap} from '../src/maps.js';
import {snapshot,restore} from '../src/persistence.js';

// Exercises actual battle markup and delegated UI handlers without a browser
// or animation timer. Browser layout/touch testing is an additional step.
test('eight-a-side battle renders two rows, pages dead allies, and gates melee buttons on directional engagement',async()=>{
 const teams=[roster(8,200,'balanced',3,0),roster(8,200,'balanced',4,1)];
 const map=makeMap(0,7,{fog:false,elevation:false,hazards:false});map.obstacles=[];map.terrain=[];map.hazards=[];map.elevation=[];
 const b=launchScenario(defaultScenario(teams,map),65);b.paced=true;b.active='A1';b.time=0;b.recordFrames=false;
 for(const u of b.units){const n=Number(u.id.slice(1))-1;Object.assign(u,{x:(u.team?21:3)+(n%4)*1.4,y:2+(n>>2)*5,next:100});}
 Object.assign(b.units[0],{x:10,y:10,next:0});Object.assign(b.units[8],{x:11.5,y:10,next:100});
 for(let i=1;i<=5;i++)b.units[i].hp=0;
 const storage=new Map([['ascendant.battle.v1',JSON.stringify(snapshot(b,teams,{mode:'route',moveKind:'run'}))]]);
 const handlers={};let boardListeners={};
 const svg={addEventListener:(k,f)=>boardListeners[k]=f,setPointerCapture(){},setAttribute(){},querySelector(){return null;},createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y};}}},getScreenCTM(){return {inverse(){return {};}}}};
 const root={innerHTML:'',classList:{add(){}},addEventListener:(name,fn)=>handlers[name]=fn,querySelector(selector){return selector==='#ascendant-board'?svg:null;}};
 globalThis.document={querySelector:()=>root,body:{classList:{add(){}}},hidden:true,addEventListener(){}};
 globalThis.window={scrollY:0,scrollTo(){},addEventListener(){}};
 globalThis.confirm=()=>true;
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 await import('../src/app.js');
 const click=dataset=>handlers.click({target:{closest:()=>({dataset,disabled:false})}});
 click({do:'resume'});
 assert.equal((root.innerHTML.match(/class="ascendant-team-strip /g)||[]).length,2);
 assert.match(root.innerHTML,/aria-label="Allies"/);
 assert.match(root.innerHTML,/aria-label="Enemies"/);
 assert.match(root.innerHTML,/data-page-side="0"/);
 assert.match(root.innerHTML,/data-page-side="1"/);
 assert.match(root.innerHTML,/class="ascendant-engage-required"/);
 assert.match(root.innerHTML,/data-engage="E1"/);
 assert.match(root.innerHTML,/data-action="strike"[^>]*disabled/);
 click({engage:'E1'});
 click({unit:'E1'});
 assert.match(root.innerHTML,/Engaged with Enemy 1/);
 assert.doesNotMatch(root.innerHTML,/data-action="strike"[^>]*disabled/);
 click({pageSide:'0',pageDelta:'1'});
 assert.match(root.innerHTML,/data-unit="A8"/,'next arrow should remain usable even when earlier allies are down');
 click({pageSide:'1',pageDelta:'1'});
 assert.match(root.innerHTML,/data-unit="E8"/);
 // UI state is persisted from the real app, including free engagement.
 const state=restore(JSON.parse(storage.get('ascendant.battle.v1')));
 assert.equal(state.units[0].engagedWith,'E1');
 click({do:'restart'});
 const restarted=restore(JSON.parse(storage.get('ascendant.battle.v1')));
 assert.equal(restarted.units.length,16,'restart preserves the experimental team size');
 assert.equal(restarted.experiment,true);
});
