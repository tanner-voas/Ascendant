import test from 'node:test';
import assert from 'node:assert/strict';
import {timelineLabel,timelineBands,timelineSummary} from '../src/battle-ui.js';

const row=(key,phase='preparation')=>({id:'A1',key,phase,start:0,prepEnd:.5,impactAt:1.2,end:1.8,next:1.8});

test('discrete attacks display a wound-up preparation, zero-duration impact, then recovery',()=>{
 const strike=row('strike');
 assert.equal(timelineLabel(strike,0),'Strike[P]');
 assert.equal(timelineLabel({...strike,phase:'execution'},.75),'Strike[P]');
 assert.equal(timelineLabel({...strike,phase:'recovery'},1.3),'Strike[R]');
 const bands=timelineBands(strike);
 assert.deepEqual(bands.map(b=>b.label),['Strike[P]','Strike[E] · instant','Strike[R]']);
 assert.equal(bands[0].to,1.2);
 assert.equal(bands[1].at,1.2);
 assert.equal(bands[1].instant,true);
 assert.ok(!bands.some(b=>b.css==='execute'));
 assert.equal(bands[2].from,1.2);
});

test('movement is continuous and has no preparation or recovery bars',()=>{
 const move={...row('move','execution'),prepEnd:0,impactAt:2.5,end:2.5,next:2.5};
 assert.equal(timelineLabel(move,1),'Move[E]');
 const bands=timelineBands(move);
 assert.deepEqual(bands.map(b=>b.label),['Move[E]']);
 assert.equal(bands[0].from,0);
 assert.equal(bands[0].to,2.5);
});

test('continuous support actions keep separate active intervals',()=>{
 const recover=row('recover','execution');
 assert.equal(timelineLabel(recover,1),'Recover[E]');
 assert.deepEqual(timelineBands(recover).map(b=>b.label),['Recover[P]','Recover[E]','Recover[R]']);
});

test('summaries provide a compact allied readiness queue without opponent information',()=>{
 const arr=[{...row('move','execution'),id:'A4',next:2.5},{...row('strike'),id:'A1',next:.3},{id:'A3',key:null,phase:'ready',next:0},{id:'A2',key:null,phase:'ready',next:1}];
 assert.equal(timelineSummary(arr,0,3),'A3 Ready · A1 Strike[P] · A2 Ready in 1.0s · +1');
});
