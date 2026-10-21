import { clone, Config, Document, EditorError, rows } from '../picture/model';
import { Room } from '../picture/room-types';
import { matches } from '../picture/preview';
import { addEffect, assignBranch, assignRoom, detachBranch, saveEffect } from '../picture/rooms';

export interface StateView { id:string; entity:string; value:string; nodes:string[]; mapped:string[]; conditions:Config[][]; effectId?:string; side?:'on'|'off'; complex?:boolean }
export function roomViews(doc:Document,room:Room):StateView[]{
  const result:StateView[]=[],all=rows(doc),claimed=new Set<string>();
  const add=(entity:string,value:string,node?:string,mapped=false,conditions:Config[]=[])=>{
    const id=JSON.stringify([entity,value]);let v=result.find(v=>v.id===id);
    if(!v){v={id,entity,value,nodes:[],mapped:[],conditions:[]};result.push(v);}
    if(node&&!v.nodes.includes(node)){v.nodes.push(node);v.conditions.push(conditions);if(mapped)v.mapped.push(node);}return v;
  };
  for(const e of room.effects)for(const side of ['on','off'] as const){
    const values=side==='on'?e.onStates:e.offStates;
    for(const value of values){const v=add(e.entity,value);v.effectId=e.id;v.side=side;for(const id of [...e[side].wrappers,...e[side].fillId?[e[side].fillId!]:[]]){const r=all.find(r=>r.layer.id===id);if(r){add(e.entity,value,id,false,[...r.conditions,...(r.element.conditions||[])]);claimed.add(id);}}}
  }
  for(const r of all){
    if(!room.members.includes(r.layer.id)||claimed.has(r.layer.id)||r.ancestors.some(a=>claimed.has(a.id)))continue;
    if(r.element.type==='conditional'){
      const cs=r.element.conditions as Config[],c=cs.find(c=>(!c.condition||c.condition==='state')&&typeof c.entity==='string'&&(typeof c.state==='string'||Array.isArray(c.state)));
      if(c){for(const value of Array.isArray(c.state)?c.state:[c.state]){add(c.entity,value,r.layer.id,false,[...r.conditions,...cs]);}claimed.add(r.layer.id);}
    }else if(r.element.entity&&r.element.state_image){for(const value of Object.keys(r.element.state_image))add(r.element.entity,value,r.layer.id,true,r.conditions);claimed.add(r.layer.id);}
    else if(r.conditions.length){const c=r.conditions.find(c=>(!c.condition||c.condition==='state')&&c.entity&&(typeof c.state==='string'||Array.isArray(c.state)));if(c){for(const value of Array.isArray(c.state)?c.state:[c.state])add(c.entity,value,r.layer.id,false,r.conditions);claimed.add(r.layer.id);}}
  }
  // A missing counterpart means the original base image, not a generated dark layer.
  for(const v of [...result])if(['on','off'].includes(v.value))add(v.entity,v.value==='on'?'off':'on');
  const entities=[...new Set(result.map(v=>v.entity))];
  return result.sort((a,b)=>entities.indexOf(a.entity)-entities.indexOf(b.entity)||(a.value==='on'?-1:b.value==='on'?1:a.value.localeCompare(b.value)));
}
export function stateSatisfied(view:StateView,states:Record<string,{state:string}>):boolean {
  return states[view.entity]?.state===view.value&&(!view.conditions.length||view.conditions.some(cs=>matches(cs,states)));
}
export function assignState(doc:Document,roomId:string,v:StateView,ids:string[]):Document {
  const managed=doc.rooms.flatMap(room=>room.effects.flatMap(effect=>(['on','off'] as const).flatMap(side=>effect[side].wrappers.map(id=>({room,effect,side,id})))));
  const transferring=managed.find(x=>ids.includes(x.id)&&!x.effect[x.side==='on'?'onStates':'offStates'].includes(v.value));
  if(transferring){
    if(transferring.room.id!==roomId)throw new EditorError('effectConflict');
    const r=rows(doc).find(r=>r.layer.id===transferring.id)!;
    const next=detachBranch(doc,roomId,transferring.effect.id,transferring.side,transferring.id);
    return assignState(next,roomId,v,[...ids.filter(id=>id!==transferring.id),...r.layer.children.map(l=>l.id)]);
  }
  if(doc.rooms.some(room=>room.effects.some(e=>[e.on.fillId,e.off.fillId].some(id=>id&&ids.includes(id)))))throw new EditorError('effectConflict');
  let next=assignRoom(doc,roomId,ids);
  const room=next.rooms.find(r=>r.id===roomId)!;
  const existing=roomViews(next,room).find(x=>x.id===v.id);
  if(ids.every(id=>existing?.nodes.includes(id)||rows(next).find(r=>r.layer.id===id)?.ancestors.some(a=>existing?.nodes.includes(a.id))))return next;
  const selected=rows(next).filter(r=>ids.includes(r.layer.id)&&!r.ancestors.some(a=>ids.includes(a.id)));
  const remaining:string[]=[];
  for(const r of selected){
    if(existing?.nodes.includes(r.layer.id))continue;
    const condition=r.element.type==='conditional'&&r.element.conditions.find((c:Config)=>c.entity===v.entity&&(!c.condition||c.condition==='state')&&c.state!==undefined);
    if(condition){if(r.layer.locked||r.ancestors.some(a=>a.locked)||rows(next).some(x=>x.ancestors.some(a=>a.id===r.layer.id)&&x.layer.locked))throw new EditorError('locked');condition.state=v.value;}
    else remaining.push(r.layer.id);
  }
  if(!remaining.length)return next;
  let effect=room.effects.find(e=>e.entity===v.entity&&[...e.onStates,...e.offStates].includes(v.value));
  if(!effect){next=addEffect(next,roomId);effect=next.rooms.find(r=>r.id===roomId)!.effects.slice(-1)[0]!;effect.entity=v.entity;effect.onStates=[v.value==='off'?'on':v.value];effect.offStates=v.value==='off'||v.value==='on'?['off']:[];next=saveEffect(next,roomId,effect);}
  return assignBranch(next,roomId,effect.id,effect.onStates.includes(v.value)?'on':'off',remaining);
}
/** Apply editor masks to a clone only. Native conditions and export are untouched. */
export function visibleDocument(doc:Document,states:Record<string,{state:string}>):Document {
  const next=clone(doc),all=rows(next);
  for(const room of next.rooms){
    const hidden=new Set<string>();if(room.hidden){room.members.forEach(id=>hidden.add(id));if(room.baseId)hidden.add(room.baseId);room.effects.forEach(e=>[e.on,e.off].forEach(b=>{b.wrappers.forEach(id=>hidden.add(id));if(b.fillId)hidden.add(b.fillId);}));}
    const views=roomViews(next,room);
    for(const v of views)if(room.hiddenStates?.includes(v.id))for(const id of v.nodes){const shared=views.some(other=>other.id!==v.id&&other.nodes.includes(id));if(!shared||states[v.entity]?.state===v.value)hidden.add(id);}
    for(const r of all)if(hidden.has(r.layer.id))r.layer.hidden=true;
  }return next;
}
