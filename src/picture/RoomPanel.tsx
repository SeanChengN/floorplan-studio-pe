import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { Document, rows } from './model';
import { Registry, areaFor } from './registry';
import { Effect, Room } from './room-types';
import { addEffect, assignBranch, assignRoom, deleteEffect, deleteRoom, detachBranch, newBranchImage, saveEffect, setRoomClip, updateRoom } from './rooms';
type Update=(fn:(d:Document)=>Document)=>void;
export function RoomList({doc,active,onRoom,onLayer,selected,update}:{doc:Document;active:string;onRoom:(id:string)=>void;onLayer:(id:string)=>void;selected:string[];update:Update}){
  const all=rows(doc),label=(id:string)=>{const r=all.find(r=>r.layer.id===id);return r?.layer.name||r?.element.entity||t(r?.element.type==='conditional'?'Condition':'Image');};
  return <div className="pe-room-list">{!doc.rooms.length&&<p className="pe-note">{t('Draw a room or reuse a selected polygon image.')}</p>}{doc.rooms.map((r,i)=><section key={r.id}>
    <button className={'pe-room-title '+(active===r.id?'active':'')} onClick={()=>onRoom(r.id)}>{r.name||`${t('Room')} ${i+1}`}</button>
    <button disabled={!selected.length} onClick={()=>update(d=>assignRoom(d,r.id,selected))}>{t('Assign selected layers')}</button>
    {r.effects.map((e,j)=><details key={e.id} open><summary>{e.name||`${t('State effect')} ${j+1}`}</summary>{(['on','off'] as const).map(side=><div className="pe-branch-tree" key={side}><strong>{t(side==='on'?'On layers':'Off layers')}</strong>{[e[side].fillId,...e[side].wrappers].filter(Boolean).map(id=><button className="pe-layer-name" key={id} onClick={()=>onLayer(id!)}>{label(id!)}</button>)}</div>)}</details>)}
    {r.members.filter(id=>!all.find(x=>x.layer.id===id)?.ancestors.some(a=>r.members.includes(a.id))).map(id=><button key={id} className="pe-layer-name" onClick={()=>onLayer(id)}>{label(id)}</button>)}
  </section>)}</div>;
}
function Text({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="pe-field"><span>{t(label)}</span><input value={value} onChange={e=>onChange(e.target.value)}/></label>;}
function Fill({label,color,opacity,onChange}:{label:string;color:string;opacity:number;onChange:(color:string,opacity:number)=>void}){
  return <fieldset className="pe-fill"><legend>{t(label)}</legend><label>{t('Color')}<input type="color" aria-label={t(label)+' '+t('Color')} value={color} onChange={e=>onChange(e.target.value,opacity)}/></label><label>{t('Opacity')}<input aria-label={t(label)+' '+t('Opacity')} type="number" min="0" max="1" step="0.01" value={opacity} onChange={e=>onChange(color,Number(e.target.value))}/></label></fieldset>;
}
export function RoomInspector({doc,room,registry,selected,update,onDraw,onEdit,editing,onLayer,entityIds}:{doc:Document;room:Room;registry:Registry;selected:string[];update:Update;onDraw:()=>void;onEdit:()=>void;editing:boolean;onLayer:(id:string)=>void;entityIds:string[]}){
  const existing=!!room.areaId&&!!registry.areas[room.areaId],all=rows(doc);
  const inArea=room.areaId?entityIds.filter(id=>areaFor(registry,id)===room.areaId):entityIds;
  return <div className="pe-room-inspector"><h2>{t('Room')}</h2>
    <Text label="Name" value={room.name} onChange={name=>update(d=>updateRoom(d,room.id,{name}))}/>
    <label className="pe-field"><span>{t('HA area')}</span><select aria-label={t('HA area')} value={room.areaId||''} onChange={e=>update(d=>updateRoom(d,room.id,{areaId:e.target.value||undefined}))}><option value="">{t('No area')}</option>{room.areaId&&!existing&&<option value={room.areaId}>{room.areaId}</option>}{Object.entries(registry.areas).map(([id,a])=><option key={id} value={id}>{a.name||id}</option>)}</select></label>
    {room.areaId&&!existing&&<p className="pe-note">{t('Area not found; the saved binding is retained.')}</p>}{registry.failed&&<p className="pe-note">{t('Some registries could not be read. Existing bindings are retained.')}</p>}
    <Fill label="Base fill" color={room.fill} opacity={room.opacity} onChange={(fill,opacity)=>update(d=>updateRoom(d,room.id,{fill,opacity}))}/>
    <div className="pe-two"><button onClick={onEdit}>{t(editing?'Finish boundary editing':'Edit boundary')}</button><button onClick={onDraw}>{t('Redraw boundary')}</button></div>
    <p className="pe-note">{t('Drag vertices or the area. Double-click an edge to add a vertex; select a vertex and press Delete to remove it.')}</p>
    <button disabled={!selected.length} onClick={()=>update(d=>assignRoom(d,room.id,selected))}>{t('Assign selected layers')}</button>
    <button disabled={!selected.length} onClick={()=>update(d=>assignRoom(d,room.id,selected,true))}>{t('Unassign selected layers')}</button>
    {selected.length===1&&all.find(r=>r.layer.id===selected[0])?.element.type==='image'&&room.members.includes(selected[0])&&<label className="pe-check"><input type="checkbox" checked={room.clipLayers.includes(selected[0])} onChange={e=>update(d=>setRoomClip(d,room.id,selected[0],e.target.checked))}/>{t('Use room boundary for clipping')}</label>}
    <p className="pe-note">{t('Area binding filters entities only. Each effect has its own controlling entity.')}</p>
    {room.effects.map(e=><EffectEditor key={e.id} doc={doc} room={room} effect={e} selected={selected} update={update} onLayer={onLayer} entities={inArea}/>)}
    <button onClick={()=>update(d=>addEffect(d,room.id))}>{t('Add state effect')}</button>
    <div className="pe-room-delete"><button onClick={()=>update(d=>deleteRoom(d,room.id))}>{t('Delete room; keep layers')}</button><button onClick={()=>{if(confirm(t('Delete this room and its layers? This can be undone.')))update(d=>deleteRoom(d,room.id,true));}}>{t('Delete room and layers')}</button></div>
    <p className="pe-note">{t('Save the project to retain rooms and state effect settings. Card YAML contains native rendering only.')}</p>
  </div>;
}
function EffectEditor({doc,room,effect,selected,update,onLayer,entities}:{doc:Document;room:Room;effect:Effect;selected:string[];update:Update;onLayer:(id:string)=>void;entities:string[]}){
  const [draft,setDraft]=useState(effect),[urls,setUrls]=useState({on:'',off:''});
  useEffect(()=>setDraft(effect),[effect]);
  const dirty=JSON.stringify(draft)!==JSON.stringify(effect);
  return <section className="pe-effect"><h3>{effect.name||t('State effect')}</h3><Text label="Effect name" value={draft.name} onChange={name=>setDraft({...draft,name})}/>
    <label className="pe-field"><span>{t('Controlling entity')}</span><input list={'pe-area-'+effect.id} value={draft.entity} onChange={e=>setDraft({...draft,entity:e.target.value,onStates:e.target.value.startsWith('light.')?['on']:draft.onStates,offStates:e.target.value.startsWith('light.')?['off']:draft.offStates})}/></label><datalist id={'pe-area-'+effect.id}>{entities.map(id=><option key={id} value={id}/>)}</datalist>
    <Text label="On states (comma separated)" value={draft.onStates.join(', ')} onChange={v=>setDraft({...draft,onStates:v.split(',').map(s=>s.trim())})}/>
    <Text label="Off states (comma separated)" value={draft.offStates.join(', ')} onChange={v=>setDraft({...draft,offStates:v.split(',').map(s=>s.trim())})}/>
    {(['on','off'] as const).map(side=><div key={side} className="pe-effect-branch">
      <Fill label={side==='on'?'On fill':'Off fill'} color={draft[side].color} opacity={draft[side].opacity} onChange={(color,opacity)=>setDraft({...draft,[side]:{...draft[side],color,opacity}})}/>
      <strong>{t(side==='on'?'On layers':'Off layers')}</strong>
      {effect[side].wrappers.map(id=><div key={id} className="pe-branch-row"><button onClick={()=>onLayer(id)}>{rows(doc).find(r=>r.layer.id===id)?.layer.name||t('Condition')}</button><button disabled={dirty} onClick={()=>update(d=>detachBranch(d,room.id,effect.id,side,id))}>{t('Remove from branch')}</button></div>)}
      <button disabled={!selected.length||dirty||!effect.entity} onClick={()=>update(d=>assignBranch(d,room.id,effect.id,side,selected))}>{t(side==='on'?'Use selected as on layers':'Use selected as off layers')}</button>
      <Text label="Image URL" value={urls[side]} onChange={v=>setUrls({...urls,[side]:v})}/><button disabled={!urls[side].trim()||dirty||!effect.entity} onClick={()=>update(d=>newBranchImage(d,room.id,effect.id,side,urls[side]))}>{t('Add branch image')}</button>
    </div>)}
    <button className="fp-primary" onClick={()=>update(d=>saveEffect(d,room.id,draft))}>{t('Apply state settings')}</button><button onClick={()=>update(d=>deleteEffect(d,room.id,effect.id))}>{t('Delete state effect')}</button>
    {dirty&&<p className="pe-note">{t('Apply state settings before assigning layers. Unsaved settings are discarded when leaving this room.')}</p>}
  </section>;
}
