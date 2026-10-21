import { nanoid } from 'nanoid';
import { clone, Config, Document, EditorError, layersFor, locked, remove, rows, Row, validateCard } from './model';
import { clipFor, Measurements, Point, validPolygon } from './geometry';
import { Branch, Effect, Room } from './room-types';
export function roomFor(d:Document,id:string):Room {const r=d.rooms.find(r=>r.id===id);if(!r)throw new EditorError('missingRoom');return r;}
const find=(d:Document,id:string)=>{const r=rows(d).find(r=>r.layer.id===id);if(!r)throw new EditorError('missingLayer');return r;};
const protectedTree=(r:Row)=>locked(r)||r.layer.children.some(function check(l):boolean{return l.locked||l.children.some(check);});
const color=(s:string)=>/^#[\da-f]{6}$/i.test(s);
const opacity=(n:number)=>Number.isFinite(n)&&n>=0&&n<=1;
function checkRoom(r:Room){if(!validPolygon(r.polygon)||!Number.isFinite(r.aspect)||r.aspect<=0||!color(r.fill)||!opacity(r.opacity))throw new EditorError('invalidPolygon');}
function push(d:Document,e:Config,name:string){const l=layersFor([e])[0];l.name=name;d.card.elements.push(e);d.layers.push(l);return l.id;}
export function createRoom(d:Document,polygon:Point[],aspect:number):Document{
  const next=clone(d),r:Room={id:nanoid(),name:'',polygon:clone(polygon),aspect,fill:'#8cc9db',opacity:0,members:[],clipLayers:[],effects:[]};checkRoom(r);next.rooms.push(r);return next;
}
export function roomFromLayer(d:Document,id:string,measure:Measurements,aspect:number):Document{
  const g=measure[id];if(!g?.precise||!g.polygon)throw new EditorError('polygonUnavailable');
  let next=createRoom(d,g.polygon,aspect);next=assignRoom(next,next.rooms[next.rooms.length-1].id,[id]);return next;
}
export function assignRoom(d:Document,roomId:string,ids:string[],unassign=false):Document{
  const next=clone(d),r=roomFor(next,roomId),all=rows(next),root=all.filter(a=>ids.includes(a.layer.id));
  const assigned=all.filter(a=>root.some(x=>x.layer.id===a.layer.id||a.ancestors.some(p=>p.id===x.layer.id))).map(a=>a.layer.id);
  for(const room of next.rooms){
    if(unassign&&room.id!==roomId)continue;
    if(room.id!==roomId||unassign){
      const managed=[room.baseId,...room.effects.flatMap(e=>[...e.on.wrappers,...e.off.wrappers,e.on.fillId,e.off.fillId])].filter(Boolean);
      if(all.some(a=>assigned.includes(a.layer.id)&&(managed.includes(a.layer.id)||a.ancestors.some(p=>managed.includes(p.id)))))throw new EditorError('effectConflict');
    }
    room.members=room.members.filter(id=>!assigned.includes(id));
    if(room.id!==roomId||unassign)room.clipLayers=room.clipLayers.filter(id=>!assigned.includes(id));
  }
  if(!unassign)r.members=[...new Set([...r.members,...assigned])];return next;
}
export function fillElement(r:Room,fill:string,alpha:number):Config{
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${1000/r.aspect}" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="${fill}"/></svg>`;
  return {type:'image',image:'data:image/svg+xml,'+encodeURIComponent(svg),style:{left:'50%',top:'50%',width:'100%',height:'100%',transform:'translate(-50%, -50%)','clip-path':clipFor(r.polygon),opacity:alpha,'pointer-events':'none'},tap_action:{action:'none'},hold_action:{action:'none'},double_tap_action:{action:'none'}};
}
function managedFill(d:Document,id:string,e:Config){
  const r=find(d,id);if(protectedTree(r))throw new EditorError('locked');
  if(r.element.type!=='image'||!r.element.image?.startsWith('data:image/svg+xml,'))throw new EditorError('effectConflict');
  r.siblings[r.index]={...r.element,image:e.image,style:{...r.element.style,...e.style}};
}
function writeFill(d:Document,id:string|undefined,e:Config,name:string):string{
  if(id){managedFill(d,id,e);return id;}const next=push(d,e,name);find(d,next).layer.locked=false;return next;
}
function checkEffect(e:Effect){
  if(!e.entity||!e.onStates.length&&!e.offStates.length||[...e.onStates,...e.offStates].some(s=>!s||['unknown','unavailable'].includes(s))||e.onStates.some(s=>e.offStates.includes(s))||![e.on,e.off].every(b=>color(b.color)&&opacity(b.opacity)))throw new EditorError('invalidEffect');
}
const conditions=(e:Effect,side:'on'|'off')=>[{condition:'state',entity:e.entity,state:e[side==='on'?'onStates':'offStates']}];
function checkWrapper(d:Document,id:string,e:Effect,side:'on'|'off'){
  const r=find(d,id);if(protectedTree(r))throw new EditorError('locked');
  if(r.element.type!=='conditional'||JSON.stringify(r.element.conditions)!==JSON.stringify(conditions(e,side)))throw new EditorError('effectConflict');return r;
}
export function updateRoom(d:Document,id:string,patch:Partial<Pick<Room,'name'|'areaId'|'fill'|'opacity'|'polygon'>>):Document{
  const next=clone(d),r=roomFor(next,id);Object.assign(r,clone(patch));checkRoom(r);
  if('fill' in patch||'opacity'in patch||'polygon'in patch){
    if(r.baseId||r.opacity>0)r.baseId=writeFill(next,r.baseId,fillElement(r,r.fill,r.opacity),r.name);
    for(const e of r.effects)for(const side of ['on','off'] as const){const b=e[side];if(b.fillId){const wrap=checkWrapper(next,b.fillId,e,side);const child=wrap.layer.children[0];if(!child||wrap.element.elements.length!==1)throw new EditorError('effectConflict');managedFill(next,child.id,fillElement(r,b.color,b.opacity));}}
    for(const layerId of r.clipLayers){const target=find(next,layerId);if(protectedTree(target))throw new EditorError('locked');if(target.element.type!=='image')throw new EditorError('polygonUnavailable');const s=target.element.style;if(s?.left!=='50%'||s?.top!=='50%'||s?.width!=='100%'||!/^translate\(\s*-50%\s*,\s*-50%\s*\)$/.test(s.transform||''))throw new EditorError('polygonUnavailable');target.element.style['clip-path']=clipFor(r.polygon);}
  }return next;
}
export function setRoomClip(d:Document,roomId:string,id:string,enabled:boolean):Document{
  const next=clone(d),r=roomFor(next,roomId);if(!r.members.includes(id))throw new EditorError('missingLayer');
  r.clipLayers=r.clipLayers.filter(x=>x!==id);if(enabled)r.clipLayers.push(id);return enabled?updateRoom(next,roomId,{polygon:r.polygon}):next;
}
export function addEffect(d:Document,roomId:string):Document{
  const next=clone(d),r=roomFor(next,roomId),branch=():Branch=>({color:'#ffc107',opacity:0,wrappers:[]});
  r.effects.push({id:nanoid(),name:'',entity:'',onStates:['on'],offStates:['off'],on:branch(),off:{...branch(),color:'#6b7280'}});return next;
}
export function saveEffect(d:Document,roomId:string,effect:Effect):Document{
  checkEffect(effect);const next=clone(d),r=roomFor(next,roomId),old=r.effects.find(e=>e.id===effect.id);if(!old)throw new EditorError('invalidEffect');
  const e=clone(effect);for(const side of ['on','off'] as const){
    // Branch references can only be changed by the assignment/removal operations.
    e[side].wrappers=[...old[side].wrappers];e[side].fillId=old[side].fillId;
    for(const id of old[side].wrappers){const target=checkWrapper(next,id,old,side);target.element.conditions=conditions(e,side);}
    if(old[side].fillId){const target=checkWrapper(next,old[side].fillId!,old,side);target.element.conditions=conditions(e,side);if(target.layer.children.length!==1)throw new EditorError('effectConflict');managedFill(next,target.layer.children[0].id,fillElement(r,e[side].color,e[side].opacity));}
    else if(e[side].opacity>0){const el={type:'conditional',conditions:conditions(e,side),elements:[fillElement(r,e[side].color,e[side].opacity)]};const id=push(next,el,e.name);const rr=find(next,id);rr.layer.locked=false;rr.layer.children[0].locked=false;e[side].fillId=id;}
  }
  r.effects[r.effects.indexOf(old)]=e;return next;
}
export function assignBranch(d:Document,roomId:string,effectId:string,side:'on'|'off',ids:string[]):Document{
  let next=assignRoom(d,roomId,ids);const room=roomFor(next,roomId),effect=room.effects.find(e=>e.id===effectId);if(!effect)throw new EditorError('invalidEffect');checkEffect(effect);
  const roots=rows(next).filter(r=>ids.includes(r.layer.id)&&!r.ancestors.some(a=>ids.includes(a.id)));
  if(!roots.length)throw new EditorError('missingLayer');
  const owned=new Set(next.rooms.flatMap(r=>r.effects.flatMap(e=>[...e.on.wrappers,...e.off.wrappers,...[e.on.fillId,e.off.fillId].filter(Boolean) as string[]])));
  for(const r of roots){if(protectedTree(r))throw new EditorError('locked');if(owned.has(r.layer.id)||r.ancestors.some(a=>owned.has(a.id))||rows(next).some(x=>owned.has(x.layer.id)&&x.ancestors.some(a=>a.id===r.layer.id)))throw new EditorError('effectConflict');}
  for(const r of roots){const wrapper={type:'conditional',conditions:conditions(effect,side),elements:[r.element]};const meta=layersFor([wrapper])[0];meta.locked=false;meta.children=[r.layer];r.siblings[r.index]=wrapper;r.metas[r.index]=meta;effect[side].wrappers.push(meta.id);room.members.push(meta.id);}
  validateCard(next.card);return next;
}
export function detachBranch(d:Document,roomId:string,effectId:string,side:'on'|'off',wrapperId:string):Document{
  const next=clone(d),room=roomFor(next,roomId),e=room.effects.find(e=>e.id===effectId);if(!e||!e[side].wrappers.includes(wrapperId))throw new EditorError('invalidEffect');
  const r=checkWrapper(next,wrapperId,e,side);r.siblings.splice(r.index,1,...r.element.elements);r.metas.splice(r.index,1,...r.layer.children);e[side].wrappers=e[side].wrappers.filter(id=>id!==wrapperId);room.members=room.members.filter(id=>id!==wrapperId);return next;
}
export function deleteEffect(d:Document,roomId:string,id:string):Document{
  let next=clone(d);let e=roomFor(next,roomId).effects.find(e=>e.id===id);if(!e)throw new EditorError('invalidEffect');
  for(const side of ['on','off'] as const){for(const wrapper of [...e[side].wrappers])next=detachBranch(next,roomId,id,side,wrapper);if(e[side].fillId)next=remove(next,[e[side].fillId!]);}
  roomFor(next,roomId).effects=roomFor(next,roomId).effects.filter(e=>e.id!==id);return next;
}
export function deleteRoom(d:Document,id:string,contents=false):Document{
  const room=roomFor(d,id);let next=contents?remove(d,[...room.members,...[room.baseId,...room.effects.flatMap(e=>[e.on.fillId,e.off.fillId])].filter(Boolean) as string[]]):clone(d);
  next.rooms=next.rooms.filter(r=>r.id!==id);return next;
}
export function newBranchImage(d:Document,roomId:string,effectId:string,side:'on'|'off',url:string):Document{
  if(!url.trim())throw new EditorError('missingImage');let next=clone(d);const r=roomFor(next,roomId),el=fillElement(r,'#ffffff',1);el.image=url.trim();const id=push(next,el,'');find(next,id).layer.locked=false;return assignBranch(next,roomId,effectId,side,[id]);
}
