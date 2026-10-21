import { nanoid } from 'nanoid';
import { t } from '../i18n';
import { clone, Document, EditorError, layersFor, locked, rows } from '../picture/model';
import { Drawing } from './types';
import { Opening, Wall } from '../model/schema';
import { pointAlongWall, polylinePath } from '../canvas/geometry';

export const defaultDrawing = (): Drawing => ({ width:1200, height:800, walls:[], openings:[], bindings:{}, grid:20, snap:true, angles:true, showGrid:true });
export function validateDrawing(d:Drawing){
  const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n),ids=new Set<string>();
  if(!d||!finite(d.width)||!finite(d.height)||d.width<=0||d.height<=0||!finite(d.grid)||d.grid<=0||!Array.isArray(d.walls)||!Array.isArray(d.openings)||!d.bindings||typeof d.bindings!=='object'||[d.snap,d.angles,d.showGrid].some(v=>typeof v!=='boolean'))throw new EditorError('invalidDrawing');
  for(const o of [...d.walls,...d.openings]){if(typeof o.id!=='string'||ids.has(o.id)||typeof o.color!=='string')throw new EditorError('invalidDrawing');ids.add(o.id);}
  if(d.walls.some(w=>!Array.isArray(w.points)||w.points.length<2||!finite(w.thickness)||w.thickness<=0||w.points.some(p=>!p||!finite(p.x)||!finite(p.y)))||d.openings.some(o=>!finite(o.t)||o.t<0||o.t>1||!finite(o.width)||o.width<=0||!['door','window'].includes(o.kind)||!d.walls.some(w=>w.id===o.wallId)))throw new EditorError('invalidDrawing');
}
const escape = (s:string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function openingGeometry(o:Opening,w:Wall) {
  const p=pointAlongWall(w,o.t),a=pointAlongWall(w,Math.max(0,o.t-.0001)),b=pointAlongWall(w,Math.min(1,o.t+.0001));
  return {...p,angle:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI};
}
export function drawingSvg(d:Drawing,id:string):string {
  const w=d.walls.find(w=>w.id===id),o=d.openings.find(o=>o.id===id);
  let body='';
  if(w)body=`<path d="${polylinePath(w.points)}" fill="none" stroke="${escape(w.color)}" stroke-width="${w.thickness}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(o){const wall=d.walls.find(w=>w.id===o.wallId);if(!wall)throw new EditorError('missingWall');const p=openingGeometry(o,wall);body=`<g transform="translate(${p.x} ${p.y}) rotate(${p.angle})"><rect x="${-o.width/2}" y="${-(wall.thickness+2)/2}" width="${o.width}" height="${wall.thickness+2}" fill="${escape(o.color)}"/><path d="M ${-o.width/2} 0 H ${o.width/2}" stroke="#182434" stroke-width="2"/>${o.kind==='door'?`<path d="M ${-o.width/2} 0 V ${-o.width} A ${o.width} ${o.width} 0 0 1 ${o.width/2} 0" fill="none" stroke="${escape(o.color)}" stroke-width="2"/>`:''}</g>`;}
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}">${body}</svg>`;
}
/** Only explicitly changed objects and dependent openings are regenerated. */
export function editDrawing(doc:Document,change:(d:Drawing)=>void):Document {
  const next=clone(doc),before=next.drawing||defaultDrawing(),d=clone(before);change(d);
  validateDrawing(d);
  const objects=[...d.walls,...d.openings],oldObjects=[...before.walls,...before.openings];
  for(const [id,layerId] of Object.entries(before.bindings))if(!objects.some(o=>o.id===id)){
    const r=rows(next).find(r=>r.layer.id===layerId);if(r){if(locked(r))throw new EditorError('locked');r.siblings.splice(r.index,1);r.metas.splice(r.index,1);}delete d.bindings[id];
  }
  for(const obj of objects){
    const previous=oldObjects.find(x=>x.id===obj.id),opening='wallId'in obj;
    if(previous&&JSON.stringify(previous)===JSON.stringify(obj)&&(!opening||JSON.stringify(before.walls.find(w=>w.id===obj.wallId))===JSON.stringify(d.walls.find(w=>w.id===obj.wallId)))&&d.width===before.width&&d.height===before.height)continue;
    const r=rows(next).find(r=>r.layer.id===d.bindings[obj.id]);if(r&&locked(r))throw new EditorError('locked');
    const el={type:'image',image:'data:image/svg+xml,'+encodeURIComponent(drawingSvg(d,obj.id)),style:{left:'50%',top:'50%',width:'100%',transform:'translate(-50%, -50%)','pointer-events':'none'},tap_action:{action:'none'},hold_action:{action:'none'},double_tap_action:{action:'none'}};
    if(r){r.siblings[r.index]={...r.element,image:el.image};}else{const meta=layersFor([el])[0];meta.locked=false;meta.name=t(opening?(obj.kind==='door'?'Door':'Window'):'Wall');next.card.elements.push(el);next.layers.push(meta);d.bindings[obj.id]=meta.id;}
  }
  next.drawing=d;return next;
}
export function newWall(doc:Document,points:{x:number;y:number}[]):Document {return editDrawing(doc,d=>d.walls.push({id:nanoid(),points,thickness:8,color:'#b7c1cd'}));}
