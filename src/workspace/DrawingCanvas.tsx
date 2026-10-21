import { useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { t } from '../i18n';
import { Document, locked, position, rows } from '../picture/model';
import { Bounds } from '../picture/NativePreview';
import { pictureStyle } from '../picture/SelectionOverlay';
import { nearestWallT, polylinePath } from '../canvas/geometry';
import { Point } from '../model/schema';
import { Tool } from './types';
import { pointerPoint, nextSegment } from './interaction';
import { defaultDrawing, editDrawing, newWall, openingGeometry } from './drawing';

export function DrawingCanvas({doc,bounds,tool,selected,onSelect,onRoom,update,onBusy,onDone,onMarker,displayWidth=600}:{doc:Document;bounds:Bounds|null;tool:Tool;selected:string[];onSelect:(ids:string[])=>void;onRoom:(id:string)=>void;update:(fn:(d:Document)=>Document)=>void;onBusy:(b:boolean)=>void;onDone:()=>void;displayWidth?:number;onMarker:(p:Point)=>void}){
  const d=doc.drawing||defaultDrawing(),svg=useRef<SVGSVGElement>(null);
  const [points,setPoints]=useState<Point[]>([]),[cursor,setCursor]=useState<Point|null>(null),[marquee,setMarquee]=useState<{start:Point;end:Point}|null>(null),[delta,setDelta]=useState<Point|null>(null);
  const drag=useRef<{id:string;start:Point;end:Point;vertex?:number}|null>(null);
  const point=(x:number,y:number)=>pointerPoint({x,y},svg.current!.getBoundingClientRect(),d,d.snap?d.grid:0);
  const canEdit=(id:string)=>{const r=rows(doc).find(r=>r.layer.id===d.bindings[id]);return !r||!locked(r);};
  function finish(){if(points.length>=2){update(doc=>newWall(doc,points));setPoints([]);setCursor(null);onDone();}}
  function begin(e:React.PointerEvent,id:string,vertex?:number){if(e.button!==0||tool!=='select')return;e.stopPropagation();e.preventDefault();onSelect(e.shiftKey?[...new Set([...selected,d.bindings[id]])]:[d.bindings[id]]);if(!canEdit(id))return;svg.current?.focus();e.currentTarget.setPointerCapture(e.pointerId);const p=point(e.clientX,e.clientY);drag.current={id,start:p,end:p,vertex};onBusy(true);}
  function end(cancel=false){const a=drag.current;drag.current=null;setDelta(null);onBusy(false);if(a&&!cancel)update(doc=>editDrawing(doc,d=>{const w=d.walls.find(w=>w.id===a.id);if(w)w.points=w.points.map((p,i)=>a.vertex===undefined?{x:p.x+a.end.x-a.start.x,y:p.y+a.end.y-a.start.y}:i===a.vertex?a.end:p);else{const o=d.openings.find(o=>o.id===a.id),hit=o&&nearestWallT(a.end,d.walls.filter(w=>w.id===o.wallId));if(o&&hit)o.t=hit.t;}}));}
  return <div className={'ws-drawing-canvas '+(tool!=='select'?'drawing':'')} style={pictureStyle(bounds)}><svg ref={svg} viewBox={`0 0 ${d.width} ${d.height}`} preserveAspectRatio="none" tabIndex={0} aria-label={t('Drawing canvas')}
    onPointerDown={e=>{if(e.button!==0)return;svg.current?.focus();if(tool==='select'){const p=point(e.clientX,e.clientY);setMarquee({start:p,end:p});e.currentTarget.setPointerCapture(e.pointerId);onBusy(true);}}}
    onClick={e=>{if(tool==='select'||e.detail>1)return;const p=point(e.clientX,e.clientY);if(tool==='marker'){onMarker({x:p.x/d.width*100,y:p.y/d.height*100});onDone();return;}if(tool==='wall'){setPoints([...points,nextSegment(points,p,d.angles)]);}else if(tool==='door'||tool==='window'){const hit=nearestWallT(p,d.walls);if(hit&&hit.d<Math.max(30,d.grid))update(doc=>editDrawing(doc,d=>d.openings.push({id:nanoid(),wallId:hit.wallId,t:hit.t,width:60,kind:tool,color:tool==='door'?'#e6bc77':'#88cdeb'})));}}}
    onDoubleClick={e=>{if(tool==='wall'){e.preventDefault();finish();}}}
    onPointerMove={e=>{const p=point(e.clientX,e.clientY);setCursor(p);if(marquee)setMarquee({...marquee,end:p});if(drag.current){drag.current.end=p;setDelta({x:p.x-drag.current.start.x,y:p.y-drag.current.start.y});}}}
    onPointerUp={()=>{if(marquee){const {start:a,end:b}=marquee;onSelect(rows(doc).filter(r=>{const p=position(r.element);return p&&r.element.type!=='image'&&p.x*d.width/100>=Math.min(a.x,b.x)&&p.x*d.width/100<=Math.max(a.x,b.x)&&p.y*d.height/100>=Math.min(a.y,b.y)&&p.y*d.height/100<=Math.max(a.y,b.y);}).map(r=>r.layer.id));setMarquee(null);onBusy(false);}end();}}
    onPointerCancel={()=>{setMarquee(null);end(true);}}
    onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(['Enter','Escape','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();}if(e.key==='Enter')finish();if(e.key==='Escape'){setPoints([]);setMarquee(null);end(true);onDone();}if(e.key==='Backspace')setPoints(points.slice(0,-1));}}>
    <defs><pattern id="ws-grid" width={d.grid} height={d.grid} patternUnits="userSpaceOnUse"><path d={`M ${d.grid} 0 H 0 V ${d.grid}`} fill="none" stroke="#adc5dc" strokeOpacity=".18" strokeWidth=".5"/></pattern></defs>
    <rect width={d.width} height={d.height} fill={d.showGrid?'url(#ws-grid)':'transparent'} className="ws-drawing-target"/>
    {tool==='select'&&doc.rooms.map(r=><polygon key={r.id} points={r.polygon.map(p=>`${p.x*d.width/100},${p.y*d.height/100}`).join(' ')} fill="transparent" stroke="#8cddfa" strokeOpacity=".25" vectorEffect="non-scaling-stroke" style={{pointerEvents:'stroke',cursor:'pointer'}} onPointerDown={e=>{e.stopPropagation();onRoom(r.id);}}/>)}
    {d.walls.map(w=>{const selectedWall=selected.includes(d.bindings[w.id]),ps=drag.current?.id===w.id&&delta?w.points.map((p,i)=>drag.current?.vertex===undefined||drag.current?.vertex===i?{x:p.x+delta.x,y:p.y+delta.y}:p):w.points;return <g key={w.id}><path d={polylinePath(ps)} fill="none" stroke={selectedWall?'#8cddfa':'transparent'} strokeWidth={Math.max(10,w.thickness)} strokeOpacity=".5" style={{pointerEvents:tool==='select'?'stroke':'none',cursor:'move'}} onPointerDown={e=>begin(e,w.id)}/>{selectedWall&&ps.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={5*d.width/displayWidth} fill="#8cddfa" style={{pointerEvents:'all',cursor:'crosshair'}} onPointerDown={e=>begin(e,w.id,i)}/>)}</g>;})}
    {d.openings.map(o=>{const w=d.walls.find(w=>w.id===o.wallId);if(!w)return null;const p=openingGeometry(o,w);return <rect key={o.id} transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`} x={-o.width/2} y={-10} width={o.width} height={20} fill="transparent" stroke={selected.includes(d.bindings[o.id])?'#8cddfa':'transparent'} style={{pointerEvents:tool==='select'?'all':'none'}} onPointerDown={e=>begin(e,o.id)}/>;})}
    {points.length>0&&<path d={polylinePath([...points,...cursor?[nextSegment(points,cursor,d.angles)]:[]])} stroke="#8cddfa" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke"/>}
    {marquee&&<rect x={Math.min(marquee.start.x,marquee.end.x)} y={Math.min(marquee.start.y,marquee.end.y)} width={Math.abs(marquee.start.x-marquee.end.x)} height={Math.abs(marquee.start.y-marquee.end.y)} fill="#8cddfa22" stroke="#8cddfa" vectorEffect="non-scaling-stroke"/>}
  </svg>{tool==='wall'&&<div className="pe-draw-hint">{t('Click points; Enter or double-click to finish; Esc to cancel.')} <button onClick={finish}>{t('Finish')}</button></div>}</div>;
}
