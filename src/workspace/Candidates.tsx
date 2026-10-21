import { useState } from 'react';
import { t } from '../i18n';
import { Document, position, rows } from '../picture/model';
import { Room } from '../picture/room-types';
import { areaFor, Registry } from '../picture/registry';
import { assignRoom } from '../picture/rooms';
import { Measurements } from '../picture/geometry';
function inside(x:number,y:number,room:Room){let yes=false;const ps=room.polygon;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
export function Candidates({doc,room,registry,measure,update}:{doc:Document;room:Room;registry:Registry;measure:Measurements;update:(fn:(d:Document)=>Document)=>void}){
  const [chosen,setChosen]=useState<string[]>([]),all=rows(doc),assigned=new Set(doc.rooms.flatMap(r=>r.members));
  const possible=all.filter(r=>{if(assigned.has(r.layer.id)||r.element.type==='conditional')return false;const p=position(r.element),g=measure[r.layer.id],box=g?.bounds;
    return room.areaId&&areaFor(registry,r.element.entity||r.conditions.find(c=>c.entity)?.entity)===room.areaId||box&&inside(box.x+box.width/2,box.y+box.height/2,room)||p&&r.element.type!=='image'&&inside(p.x,p.y,room);
  });
  if(!possible.length)return null;
  return <details className="ws-candidates"><summary>{t('Suggested room layers')} · {possible.length}</summary><p className="pe-note">{t('Based on area or position. Select the layers that belong to this room.')}</p>{possible.map(r=><label className="pe-check" key={r.layer.id}><input type="checkbox" checked={chosen.includes(r.layer.id)} onChange={e=>setChosen(e.target.checked?[...chosen,r.layer.id]:chosen.filter(id=>id!==r.layer.id))}/>{r.layer.name||r.element.entity||r.conditions.map(c=>c.entity+' '+c.state).join(' / ')||t('Image')}</label>)}<button disabled={!chosen.length} onClick={()=>{update(d=>assignRoom(d,room.id,chosen));setChosen([]);}}>{t('Assign selected layers')}</button></details>;
}
