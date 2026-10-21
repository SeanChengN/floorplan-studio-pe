import { useRef, useState } from 'react';
import { t } from '../i18n';
import { Point, validPolygon } from './geometry';
import { Room } from './room-types';
import { pointerPoint } from '../workspace/interaction';
import { Drawing } from '../workspace/types';
import { Bounds } from './NativePreview';
import { pictureStyle } from './SelectionOverlay';
export function RoomCanvas({room,bounds,drawing,editing,onCreate,onChange,onCancel,onBusy,settings,displayWidth=600,displayHeight=400}:{room?:Room;bounds:Bounds|null;drawing:boolean;editing:boolean;onCreate:(p:Point[])=>void;onChange:(p:Point[])=>void;onCancel:()=>void;onBusy:(b:boolean)=>void;settings?:Drawing;displayWidth?:number;displayHeight?:number}){
  const svg=useRef<SVGSVGElement>(null),[points,setPoints]=useState<Point[]>([]),[draft,setDraft]=useState<Point[]|null>(null),[vertex,setVertex]=useState<number|null>(null),[cursor,setCursor]=useState<Point|null>(null);
  const drag=useRef<{points:Point[];start:Point;index:number|null;next:Point[]}|null>(null);
  const local=(x:number,y:number):Point=>{const size=settings||{width:100,height:100},p=pointerPoint({x,y},svg.current!.getBoundingClientRect(),size,settings?.snap?settings.grid:0);return{x:Math.max(0,Math.min(100,p.x/size.width*100)),y:Math.max(0,Math.min(100,p.y/size.height*100))};};
  const ps=drawing?points:draft||room?.polygon||[];
  function finish(){if(validPolygon(points)){onCreate(points);setPoints([]);}else if(points.length)onCreate(points);}
  const begin=(e:React.PointerEvent,index:number|null)=>{if(!editing||!room||drawing||e.button!==0)return;e.preventDefault();e.stopPropagation();svg.current?.focus();setVertex(index);e.currentTarget.setPointerCapture(e.pointerId);drag.current={points:room.polygon,start:local(e.clientX,e.clientY),index,next:room.polygon};onBusy(true);};
  function end(cancel=false){const d=drag.current;drag.current=null;onBusy(false);setDraft(null);if(d&&!cancel&&JSON.stringify(d.next)!==JSON.stringify(d.points))onChange(d.next);}
  return <div className={'pe-room-canvas '+(drawing?'drawing ':'')+(editing?'editing':'')} style={pictureStyle(bounds)}>
    <svg ref={svg} tabIndex={0} aria-label={t('Room boundary')} viewBox="0 0 100 100" preserveAspectRatio="none"
      onClick={e=>{if(!drawing||e.detail>1)return;svg.current?.focus();const p=local(e.clientX,e.clientY);if(points.length>=3&&Math.hypot((p.x-points[0].x)*displayWidth/100,(p.y-points[0].y)*displayHeight/100)<10){finish();return;}setPoints(old=>old.length&&Math.hypot(old[old.length-1].x-p.x,old[old.length-1].y-p.y)<.01?old:[...old,p]);}}
      onDoubleClick={e=>{e.preventDefault();e.stopPropagation();if(drawing){finish();return;}if(!editing||!room)return;const p=local(e.clientX,e.clientY);let closest=0,best=Infinity;room.polygon.forEach((a,i)=>{const b=room.polygon[(i+1)%room.polygon.length],dx=b.x-a.x,dy=b.y-a.y;const k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));const rect=svg.current!.getBoundingClientRect();const dist=Math.hypot((p.x-a.x-k*dx)*rect.width/100,(p.y-a.y-k*dy)*rect.height/100);if(dist<best){best=dist;closest=i;}});if(best>10)return;const a=room.polygon[closest],b=room.polygon[(closest+1)%room.polygon.length],dx=b.x-a.x,dy=b.y-a.y,k=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));const next=[...room.polygon];next.splice(closest+1,0,{x:a.x+k*dx,y:a.y+k*dy});onChange(next);}}
      onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(['Enter','Escape','Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();}if(e.key==='Enter'&&drawing)finish();if(e.key==='Escape'){setPoints([]);end(true);onCancel();}if(e.key==='Backspace'&&drawing)setPoints(points.slice(0,-1));if(['Delete','Backspace'].includes(e.key)&&!drawing&&room&&vertex!==null){onChange(room.polygon.filter((_,i)=>i!==vertex));setVertex(null);}}}
      onPointerMove={e=>{const p=local(e.clientX,e.clientY);if(drawing)setCursor(p);const d=drag.current;if(!d)return;d.next=d.points.map((a,i)=>d.index===null?{x:a.x+p.x-d.start.x,y:a.y+p.y-d.start.y}:i===d.index?p:a);setDraft(d.next);}}
      onPointerUp={()=>end()} onPointerCancel={()=>end(true)}>
      {settings?.showGrid&&<defs><pattern id="ws-room-grid" width={settings.grid/settings.width*100} height={settings.grid/settings.height*100} patternUnits="userSpaceOnUse"><path d={`M ${settings.grid/settings.width*100} 0 H 0 V ${settings.grid/settings.height*100}`} fill="none" stroke="#adc5dc" strokeOpacity=".2" strokeWidth=".1"/></pattern></defs>}
      {drawing&&<rect width="100" height="100" fill={settings?.showGrid?'url(#ws-room-grid)':'transparent'} className="pe-draw-target"/>}
      {ps.length>0&&<polygon points={(drawing&&cursor?[...ps,cursor]:ps).map(p=>`${p.x},${p.y}`).join(' ')} className={'pe-room-polygon '+((draft&&!validPolygon(draft)||drawing&&ps.length>=3&&!validPolygon(ps))?'invalid':'')} onPointerDown={e=>begin(e,null)}/>}
      {drawing&&ps.map((p,i)=><ellipse key={i} cx={p.x} cy={p.y} rx={500/displayWidth} ry={500/displayHeight} fill={i===0?"#ffd175":"#8cddfa"} style={{pointerEvents:"none"}}/>)}
      {!drawing&&editing&&room&&ps.map((p,i)=><ellipse key={i} cx={p.x} cy={p.y} rx={500/displayWidth} ry={500/displayHeight} className={'pe-room-vertex '+(vertex===i?'active':'')} onPointerDown={e=>begin(e,i)}/>)}
    </svg>
    {drawing&&<div className="pe-draw-hint">{t('Click points; Enter or double-click to finish; Esc to cancel.')} <button onClick={e=>{e.stopPropagation();finish();}}>{t('Finish room')}</button><button onClick={onCancel}>{t('Cancel')}</button></div>}
  </div>;
}
