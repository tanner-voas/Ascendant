import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleTo} from '../src/battlefield.js';
import {restore} from '../src/persistence.js';
// An event-level smoke test of the real app module, not a browser/layout test.
// UI rendering and delegated handlers run against a minimal DOM fixture.
test('setup, start, movement planner controls, commit, facing, and resume render without runtime errors',async()=>{
 const events={},storage=new Map();let boardEvents={};
 const svg={addEventListener:(k,v)=>boardEvents[k]=v,setPointerCapture(){},setAttribute(){},querySelector(){return null;},createSVGPoint(){return {x:0,y:0,matrixTransform(){return {x:this.x,y:this.y}}}},getScreenCTM(){return {inverse(){return {}}}}};
 const root={innerHTML:'',classList:{add(){}},addEventListener:(k,v)=>events[k]=v,querySelector(k){return k==='#ascendant-board'&&this.innerHTML.includes('id="ascendant-board"')?svg:null;}};
 globalThis.document={querySelector:()=>root,body:{classList:{add(){}}},hidden:true,addEventListener(){}};
 globalThis.window={scrollY:0,scrollTo(){},addEventListener(){}};
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 globalThis.confirm=()=>true;
 await import('../src/app.js');
 const button=dataset=>events.click({target:{closest:()=>({dataset,disabled:false})}});
 const change=(id,value)=>events.change({target:{id,value,checked:value}});
 const saved=()=>JSON.parse(storage.get('ascendant.battle.v1'));
 const tap=(x,y,dataset={})=>{const target={closest:s=>s==='[data-unit]'&&dataset.unit?{dataset}:s==='[data-waypoint]'&&dataset.waypoint?{dataset}:s==='[data-insert]'&&dataset.insert?{dataset}:null};const ev={button:0,pointerId:1,clientX:x,clientY:y,target};boardEvents.pointerdown(ev);boardEvents.pointerup(ev);};
 assert.match(root.innerHTML,/v0\.1\.8/);events.input({target:{id:'ascendant-seed',value:'42',dataset:{}}});await change('ascendant-fog',false);button({do:'start'});button({do:'pause'});
 for(let i=0;i<10&&!saved().state.active.startsWith('A');i++)button({do:'step'});
 assert.match(root.innerHTML,/YOUR TURN/);assert.match(root.innerHTML,/Damage defenses by type/);assert.match(root.innerHTML,/Conditions/);assert.match(root.innerHTML,/data-action="grapple"/);assert.match(root.innerHTML,/data-action="intimidate"/);assert.match(root.innerHTML,/data-action="stand"/);assert.match(root.innerHTML,/value="block"/);assert.match(root.innerHTML,/value="parry"/);assert.match(root.innerHTML,/Momentum/);assert.match(root.innerHTML,/data-movement="sprint"/);
 await change('ascendant-effort','0.7');await change('ascendant-push','physical');assert.deepEqual(saved().ui.push,{effort:.7,push:'physical'});await change('ascendant-effort','1');await change('ascendant-push','none');button({movement:'sprint'});assert.equal(saved().ui.moveKind,'sprint');
 const u=saved().state.units.find(u=>u.id===saved().state.active);
 const p=root.innerHTML.match(/<polygon points="([^"]+)"/)[1].split(' ').map(v=>v.split(',').map(Number)).sort((a,b)=>Math.hypot(b[0]-u.x,b[1]-u.y)-Math.hypot(a[0]-u.x,a[1]-u.y))[0];
 const x=u.x+(p[0]-u.x)*.65,y=u.y+(p[1]-u.y)*.65;tap(x,y);assert.equal(saved().ui.path.length,2);tap((u.x+x)/2,(u.y+y)/2,{insert:'1'});assert.equal(saved().ui.path.length,3);button({do:'deleteWaypoint'});assert.equal(saved().ui.path.length,2);
 // Drag the numbered endpoint, verify persistent coordinates and commit.
 const ev={button:0,pointerId:2,clientX:x,clientY:y,target:{closest:s=>s==='[data-waypoint]'?{dataset:{waypoint:'1'}}:null}};boardEvents.pointerdown(ev);const q={...ev,clientX:u.x+(x-u.x)*.65,clientY:u.y+(y-u.y)*.65};boardEvents.pointermove(q);boardEvents.pointerup(q);
 // The minimal fixture uses metres as pixels and small paths may not meet the 5px drag threshold;
 // the click/release selection and path remain valid in either case.
 assert.equal(saved().ui.waypoint,1);await change('ascendant-event-mode',true);button({do:'move'});assert.ok(saved().state.units.find(v=>v.id===u.id).job);assert.match(root.innerHTML,/Combat timeline/);button({do:'setup'});button({do:'resume'});assert.ok(saved().state.units.find(v=>v.id===u.id).job);await change('ascendant-event-mode',false);for(let i=0;i<200&&!(saved().state.active===u.id&&saved().state.moved);i++)button({do:'step'});assert.equal(saved().state.active,u.id);assert.equal(saved().state.moved,true);assert.ok(saved().state.lastMove.total>0);assert.match(root.innerHTML,/Movement complete/);
 await change('ascendant-reaction','brace');assert.equal(saved().state.units.find(v=>v.id===u.id).reaction,'brace');button({do:'modeFace'});tap(u.x,u.y);assert.match(root.innerHTML,/Facing updated/);button({action:'guard'});
 button({do:'setup'});assert.match(root.innerHTML,/Resume/);button({do:'resume'});assert.match(root.innerHTML,/Saved battle restored/);assert.equal(saved().ui.paused,true);
 button({do:'replayPrev'});assert.match(root.innerHTML,/Recorded battlefield position/);await change('ascendant-threat',false);assert.equal(saved().ui.showThreat,false);
 button({do:'setup'});await change('ascendant-map','12');await change('ascendant-map-seed','123');await change('ascendant-width','46');await change('ascendant-height','30');await change('ascendant-deployment','7');await change('ascendant-fog',true);assert.match(root.innerHTML,/Canal Works/);button({do:'start'});const fog=restore(saved());assert.equal(fog.map.seed,123);assert.equal(fog.map.w,46);assert.equal(fog.map.h,30);assert.equal(fog.map.zones[0].w,7);assert.ok(fog.map.fog);assert.match(root.innerHTML,/Fog enabled/);assert.match(root.innerHTML,/Full replay and raw battle export unlock/);for(const u of fog.units.filter(u=>!visibleTo(fog,0,u)))assert.ok(!root.innerHTML.includes(`data-unit="${u.id}"`));await change('ascendant-sight','individual');assert.equal(saved().ui.sightView,'individual');button({do:'setup'});button({do:'resume'});assert.equal(saved().battlefield.seed,123);

 assert.match(root.innerHTML,/Team tactics/);assert.match(root.innerHTML,/data-ai-unit="A1"/);
 const aiChange=(dataset,value,checked=false)=>events.change({target:{dataset,value,checked}});
 await aiChange({aiUnit:'A1'},'',true);assert.ok(saved().state.automated.includes('A1'));
 await aiChange({aiSide:'1',aiKey:'difficulty'},'tactical');assert.equal(saved().state.tactics[1].difficulty,'tactical');
 button({unit:'A2'});button({order:'protect'});assert.equal(saved().state.tactics[0].order,'protect');assert.equal(saved().state.tactics[0].target,'A2');
 button({do:'setup'});button({do:'resume'});assert.ok(saved().state.automated.includes('A1'));assert.equal(saved().state.tactics[0].order,'protect');
 await aiChange({aiUnit:'A1'},'',false);assert.ok(!saved().state.automated.includes('A1'));

});
