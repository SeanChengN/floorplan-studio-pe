import { t } from '../i18n';
import { Document, rows, setMeta } from '../picture/model';
import { assignRoom } from '../picture/rooms';
import { roomViews, StateView, stateSatisfied } from './states';
import { Eye } from './Eye';
import { Room } from '../picture/room-types';
import { HassLike } from '../ha/hassBridge';

export function stateName(room:Room,v:StateView,views:StateView[],hass:HassLike|null){
  if(room.stateNames?.[v.id])return room.stateNames[v.id];
  const effect=room.effects.find(e=>e.id===v.effectId),first=views[0]?.entity===v.entity;
  const prefix=effect?.name||(!first?(hass?.states[v.entity]?.attributes.friendly_name||v.entity):'');
  return prefix?prefix+' · '+t(v.value==='on'?'On':v.value==='off'?'Off':v.value):t(v.value==='on'?'Light on':v.value==='off'?'Light off':v.value);
}
export function RoomTree({doc,selected,activeRoom,activeState,hass,simulating,onRoom,onState,onSelect,update,mask,onAssign}:{doc:Document;selected:string[];activeRoom:string;activeState:string;hass:HassLike|null;simulating:boolean;onRoom:(id:string)=>void;onState:(room:string,v:StateView)=>void;onSelect:(ids:string[])=>void;update:(fn:(d:Document)=>Document)=>void;mask:(fn:(d:Document)=>Document)=>void;onAssign:(room:string,v:StateView,ids:string[])=>void}){
  const all=rows(doc),owned=new Set(doc.rooms.flatMap(r=>r.members));
  function layer(id:string,depth=0):React.ReactNode {const r=all.find(r=>r.layer.id===id);if(!r)return null;return <div key={id} style={{paddingLeft:depth?10:0}}><div className={'ws-tree-row '+(selected.includes(id)?'active':'')} draggable onDragStart={e=>e.dataTransfer.setData('application/fps-layers',JSON.stringify(selected.includes(id)?selected:[id]))}>
    <button className="ws-tree-label" onClick={e=>onSelect(e.shiftKey?[...new Set([...selected,id])]:[id])}>{r.layer.name||r.element.entity||t(r.element.type==='conditional'?'Condition':'Image')}</button>
    <button aria-label={t(r.layer.hidden?'Show':'Hide temporarily')} title={t('Temporary visibility')} onClick={()=>mask(d=>setMeta(d,id,{hidden:!r.layer.hidden}))}><Eye hidden={r.layer.hidden}/></button>
  </div>{r.layer.children.length>0&&<details><summary>{t('Contents')} · {r.layer.children.length}</summary>{r.layer.children.map(c=>layer(c.id,depth+1))}</details>}</div>;}

  function drop(e:React.DragEvent,room:string,v?:StateView){e.preventDefault();e.stopPropagation();try{const ids=JSON.parse(e.dataTransfer.getData('application/fps-layers'));if(!Array.isArray(ids)||!ids.every(x=>typeof x==='string'))return;if(v)onAssign(room,v,ids);else update(d=>assignRoom(d,room,ids));}catch{}}
  return <div className="ws-room-tree">{doc.rooms.map(room=>{const views=roomViews(doc,room),stateNodes=new Set(views.flatMap(v=>v.nodes));return <section key={room.id} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,room.id)}>
    <div className={'ws-tree-row ws-room-heading '+(room.id===activeRoom&&!activeState?'active':'')}><button className="ws-tree-label" onClick={()=>onRoom(room.id)}>{room.name||t('Room')}</button><button title={t('Temporary visibility')} aria-label={t(room.hidden?'Show room':'Hide room')} onClick={()=>mask(d=>({...d,rooms:d.rooms.map(r=>r.id===room.id?{...r,hidden:!r.hidden}:r)}))}><Eye hidden={room.hidden}/></button></div>
    <details><summary>{t('Permanent layers')}</summary>{room.baseId&&layer(room.baseId)}{room.members.filter(id=>!stateNodes.has(id)&&!all.find(r=>r.layer.id===id)?.ancestors.some(a=>stateNodes.has(a.id)||room.members.includes(a.id))).map(id=>layer(id))}</details>
    {views.map(v=><div className="ws-state" key={v.id} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,room.id,v)}>
      <div className={'ws-tree-row '+(activeRoom===room.id&&activeState===v.id?'active':'')}><button className="ws-tree-label" onClick={()=>onState(room.id,v)}>{stateName(room,v,views,hass)}</button><span className={'ws-state-dot '+(stateSatisfied(v,hass?.states||{})?'satisfied':'')} title={t(stateSatisfied(v,hass?.states||{})?'Condition matches':'Condition not met')}>{simulating&&hass?.states[v.entity]?.state===v.value?'◆':'●'}</span><button title={t('Temporary visibility')} aria-label={t('Toggle state visibility')} onClick={()=>mask(d=>({...d,rooms:d.rooms.map(r=>r.id!==room.id?r:{...r,hiddenStates:r.hiddenStates?.includes(v.id)?r.hiddenStates.filter(x=>x!==v.id):[...r.hiddenStates||[],v.id]})}))}><Eye hidden={room.hiddenStates?.includes(v.id)}/></button></div>
      <details><summary>{v.nodes.length?t('Layers')+' · '+v.nodes.length:t('Use background')}</summary>{v.nodes.map(id=>layer(id))}<button onClick={()=>onAssign(room.id,v,selected)} disabled={!selected.length}>{t('Add selected layers')}</button></details>
    </div>)}
  </section>;})}
  <section><h3>{t('Unassigned')}</h3>{all.filter(r=>!owned.has(r.layer.id)&&r.ancestors.length===0).map(r=>layer(r.layer.id))}</section>
  </div>;
}
