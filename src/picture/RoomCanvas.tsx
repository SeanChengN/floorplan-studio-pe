import { useRef, useState } from 'react';
import { t } from '../i18n';
import { Point, validPolygon } from './geometry';
import { Room } from './room-types';
import { Bounds } from './NativePreview';
import { pictureStyle } from './SelectionOverlay';
export function RoomCanvas({room,bounds,drawing,editing,onCreate,onChange,onCancel,onBusy}:{room?:Room;bounds:Bounds|null;drawing:boolean;editing:boolean;onCreate:(p:Point[])=>void;onChange:(p:Point[])=>void;onCancel:()=>void;onBusy:(b:boolean)=>void}){
  const svg=useRef<SVGSVGElement>(null),[points,setPoints]=useState<Point[]>([]),[draft,setDraft]=useState<Point[]|null>(null),[vertex,setVertex]=useState<number|null>(null);
  const drag=useRef<{points:Point[];start:Point;index:number|null;next:Point[]}|null>(null);
  const local=(x:number,y:number):Point=>{const r=svg.current!.getBoundingClientRect();return{x:Math.max(0,Math.min(100,(x-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(y-r.top)/r.height*100))};};
  const ps=drawing?points:draft||room?.polygon||[];
  function finish(){if(validPolygon(points)){onCreate(points);setPoints([]);}else if(points.length)onCreate(points);}
  const begin=(e:React.PointerEvent,index:number|null)=>{if(!editing||!room||drawing||e.button!==0)return;e.preventDefault();e.stopPropagation();svg.current?.focus();setVertex(index);e.currentTarget.setPointerCapture(e.pointerId);drag.current={points:room.polygon,start:local(e.clientX,e.clientY),index,next:room.polygon};onBusy(true);};
  function end(cancel=false){const d=drag.current;drag.current=null;onBusy(false);setDraft(null);if(d&&!cancel&&JSON.stringify(d.next)!==JSON.stringify(d.points))onChange(d.next);}
  return <div className={'pe-room-canvas '+(drawing?'drawing ':'')+(editing?'editing':'')} style={pictureStyle(bounds)}>
    <svg ref={svg} tabIndex={0} aria-label={t('Room boundary')} viewBox="0 0 100 100" preserveAspectRatio="none"
      onClick={e=>{if(!drawing||e.detail>1)return;svg.current?.focus();const p=local(e.clientX,e.clientY);setPoints(old=>old.length&&Math.hypot(old[old.length-1].x-p.x,old[old.length-1].y-p.y)<.01?old:[...old,p]);}}
      onDoubleClick={e=>{e.preventDefault();e.stopPropagation();if(drawing){finish();return;}if(!editing||!room)return;const p=local(e.clientX,e.clientY);let closest=0,best=Infinity;room.polygon.forEach((a,i)=>{const b=room.polygon[(i+1)%room.polygon.length],dx=b.x-a.x,dy=b.y-a.y;const k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));const rect=svg.current!.getBoundingClientRect();const dist=Math.hypot((p.x-a.x-k*dx)*rect.width/100,(p.y-a.y-k*dy)*rect.height/100);if(dist<best){best=dist;closest=i;}});if(best>10)return;const a=room.polygon[closest],b=room.polygon[(closest+1)%room.polygon.length],dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));const next=[...room.polygon];next.splice(closest+1,0,{x:a.x+k*dx,y:a.y+k*dy});onChange(next);}}
      onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(['Enter','Escape','Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();}if(e.key==='Enter'&&drawing)finish();if(e.key==='Escape'){setPoints([]);end(true);onCancel();}if(['Delete','Backspace'].includes(e.key)&&!drawing&&room&&vertex!==null){onChange(room.polygon.filter((_,i)=>i!==vertex));setVertex(null);}}}
      onPointerMove={e=>{const d=drag.current;if(!d)return;const p=local(e.clientX,e.clientY);d.next=d.points.map((a,i)=>d.index===null?{x:a.x+p.x-d.start.x,y:a.y+p.y-d.start.y}:i===d.index?p:a);setDraft(d.next);}}
      onPointerUp={()=>end()} onPointerCancel={()=>end(true)}>
      {drawing&&<rect width="100" height="100" fill="transparent" className="pe-draw-target"/>}
      {ps.length>0&&<polygon points={ps.map(p=>`${p.x},${p.y}`).join(' ')} className={'pe-room-polygon '+(draft&&!validPolygon(draft)?'invalid':'')} onPointerDown={e=>begin(e,null)}/>}
      {!drawing&&editing&&room&&ps.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r=".65" className={'pe-room-vertex '+(vertex===i?'active':'')} onPointerDown={e=>begin(e,i)}/>)}
    </svg>
    {drawing&&<div className="pe-draw-hint">{t('Click points; Enter or double-click to finish; Esc to cancel.')} <button onClick={e=>{e.stopPropagation();finish();}}>{t('Finish room')}</button><button onClick={onCancel}>{t('Cancel')}</button></div>}
  </div>;
}
