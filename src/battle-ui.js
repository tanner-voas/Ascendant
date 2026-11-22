// Pure, non-GUI timeline presentation. Neither action timing nor resolution changes.
import {ACTIONS} from './engine.js';
const CONTINUOUS=new Set(['move','recover','wait','hold','observe','guard']);
const tidy=s=>s.replace(/^./,a=>a.toUpperCase());
export function timelineLabel(row,now){
 if(!row?.key)return row?.phase==='unconscious'?'Unconscious':row?.phase==='stunned'?'Stunned':`Ready${row?.next>now+1e-6?` in ${(row.next-now).toFixed(1)}s`:''}`;
 const name=ACTIONS[row.key]?.label||tidy(row.key);
 if(row.phase==='recovery')return `${name}[R]`;
 if(CONTINUOUS.has(row.key))return `${name}[${row.phase==='preparation'?'P':'E'}]`;
 // A discrete action has a single effect at impactAt. Its engine execution
 // interval is the wind-up before that instantaneous effect.
 return `${name}[P]`;
}
export function timelineBands(row){
 if(!row?.key)return [];
 const name=ACTIONS[row.key]?.label||tidy(row.key),out=[];
 const add=(css,from,to,label)=>{if(Number.isFinite(from)&&Number.isFinite(to)&&to>from+1e-9)out.push({css,from,to,label});};
 if(CONTINUOUS.has(row.key)){
  add('prep',row.start,row.prepEnd,`${name}[P]`);
  add('execute',row.prepEnd,row.impactAt,`${name}[E]`);
 }else{
  add('prep',row.start,row.impactAt,`${name}[P]`);
  if(Number.isFinite(row.impactAt))out.push({instant:true,at:row.impactAt,label:`${name}[E] · instant`});
 }
 add('recovery',row.impactAt,row.end,`${name}[R]`);
 return out;
}
export function timelineSummary(rows,now,max=3){
 const ordered=[...rows].sort((a,b)=>(a.next??Infinity)-(b.next??Infinity));
 return ordered.slice(0,max).map(u=>`${u.id} ${timelineLabel(u,now)}`).join(' · ')+(ordered.length>max?` · +${ordered.length-max}`:'');
}
