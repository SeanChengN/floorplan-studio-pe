import { useState } from 'react';
import { t } from '../i18n';
import { Document, rows } from '../picture/model';
import { Room } from '../picture/room-types';
import { StateView, roomViews } from './states';
import { stateName } from './RoomTree';
import { addEffect, newBranchImage, saveEffect } from '../picture/rooms';
import { EffectEditor } from '../picture/RoomPanel';
import { HassLike } from '../ha/hassBridge';

export function StateInspector({doc,room,view,hass,selected,update,onLayer,onAssign}:{doc:Document;room:Room;view:StateView;hass:HassLike|null;selected:string[];update:(fn:(d:Document)=>Document)=>void;onLayer:(id:string)=>void;onAssign:(ids:string[])=>void}){
  const [url,setUrl]=useState(''),[picker,setPicker]=useState(false),[picked,setPicked]=useState<string[]>([]),[fill,setFill]=useState('#ffc107'),[opacity,setOpacity]=useState(0.15),effect=room.effects.find(e=>e.id===view.effectId);
  return <div><h3>{t('Room state')}</h3><label className="pe-field"><span>{t('Name')}</span><input value={stateName(room,view,roomViews(doc,room),hass)} onChange={e=>update(d=>({...d,rooms:d.rooms.map(r=>r.id===room.id?{...r,stateNames:{...r.stateNames,[view.id]:e.target.value}}:r)}))}/></label>
    <p className="pe-note">{view.entity} = {view.value}</p><p>{t('Simulation only. Existing conditions remain active.')}</p>
    {view.nodes.map(id=><button className="ws-inspector-layer" key={id} onClick={()=>onLayer(id)}>{rows(doc).find(r=>r.layer.id===id)?.layer.name||t('Edit layer and conditions')}</button>)}
    {!view.nodes.length&&<p className="pe-note">{t('Use background')}</p>}
    <button disabled={!selected.length} onClick={()=>onAssign(selected)}>{t('Add selected layers')}</button>
    <button onClick={()=>setPicker(!picker)}>{t('Add existing layers')}</button>
    {picker&&<div className="ws-layer-picker">{rows(doc).map(r=><label key={r.layer.id} className="pe-check" style={{paddingLeft:r.depth*10}}><input type="checkbox" checked={picked.includes(r.layer.id)} onChange={e=>setPicked(e.target.checked?[...picked,r.layer.id]:picked.filter(id=>id!==r.layer.id))}/>{r.layer.name||r.element.entity||t(r.element.type==='conditional'?'Condition':'Image')}</label>)}<button disabled={!picked.length} onClick={()=>{onAssign(picked);setPicker(false);setPicked([]);}}>{t('Apply')}</button></div>}
    {effect?<EffectEditor doc={doc} room={room} effect={effect} selected={selected} update={update} onLayer={onLayer} entities={Object.keys(hass?.states||{})} sideOnly={view.side}/>:<>
      <label className="pe-field"><span>{t('State fill')}</span><input type="color" value={fill} onChange={e=>setFill(e.target.value)}/></label><label className="pe-field"><span>{t('Opacity')}</span><input type="number" min="0" max="1" step="0.01" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label>
      <button onClick={()=>update(d=>{const next=addEffect(d,room.id),e=next.rooms.find(r=>r.id===room.id)!.effects.slice(-1)[0]!;e.entity=view.entity;e.onStates=view.value==='off'?['on']:[view.value];e.offStates=['on','off'].includes(view.value)?['off']:[];const side=view.value==='off'?'off':'on';e[side].color=fill;e[side].opacity=opacity;return saveEffect(next,room.id,e);})}>{t('Apply state fill')}</button>
      <label className="pe-field"><span>{t('Image URL')}</span><input value={url} onChange={e=>setUrl(e.target.value)}/></label><button disabled={!url.trim()} onClick={()=>update(d=>{let next=addEffect(d,room.id),e=next.rooms.find(r=>r.id===room.id)!.effects.slice(-1)[0]!;e.entity=view.entity;e.onStates=[view.value==='off'?'on':view.value];e.offStates=view.value==='off'||view.value==='on'?['off']:[];next=saveEffect(next,room.id,e);return newBranchImage(next,room.id,e.id,view.value==='off'?'off':'on',url);})}>{t('Add branch image')}</button>
    </>}
  </div>;
}
