import { canMove, clone, Document, EditorError, position, rows, selectionWithGroups } from './model';
export interface Point { x: number; y: number }
export interface Rect { x: number; y: number; width: number; height: number }
export interface Geometry { box: Rect; bounds: Rect; polygon?: Point[]; cssClip?: string; precise: boolean }
export type Measurements = Record<string, Geometry>;
export type Edge = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';
export const edges: Edge[] = ['left', 'centerX', 'right', 'top', 'centerY', 'bottom'];
export const edgeLabels: Record<Edge,string> = { left:'Left', centerX:'Horizontal center', right:'Right', top:'Top', centerY:'Vertical center', bottom:'Bottom' };
export function union(rects: Rect[]): Rect {
  const x=Math.min(...rects.map(r=>r.x)),y=Math.min(...rects.map(r=>r.y));
  return {x,y,width:Math.max(...rects.map(r=>r.x+r.width))-x,height:Math.max(...rects.map(r=>r.y+r.height))-y};
}
export function polygonBounds(points: Point[]): Rect { return union(points.map(p=>({...p,width:0,height:0}))); }
const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function validPolygon(ps: Point[]): boolean {
  if(ps.length<3 || ps.length>500 || ps.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>100||p.y<0||p.y>100)) return false;
  if(Math.abs(ps.reduce((n,p,i)=>n+p.x*ps[(i+1)%ps.length].y-p.y*ps[(i+1)%ps.length].x,0))<.00001)return false;
  const between=(a:number,b:number,c:number)=>c>=Math.min(a,b)-1e-8&&c<=Math.max(a,b)+1e-8;
  const on=(a:Point,b:Point,c:Point)=>Math.abs(cross(a,b,c))<1e-8&&between(a.x,b.x,c.x)&&between(a.y,b.y,c.y);
  for(let i=0;i<ps.length;i++){
    const a=ps[i],b=ps[(i+1)%ps.length];if(Math.hypot(a.x-b.x,a.y-b.y)<1e-7)return false;
    for(let j=i+1;j<ps.length;j++){
      if(j===i+1||(i===0&&j===ps.length-1))continue;
      const c=ps[j],d=ps[(j+1)%ps.length];
      if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return false;
    }
  }return true;
}
export function parsePolygon(value: string, box: Rect, pixels: {width:number;height:number}): Point[] | null {
  const m=/^polygon\(\s*(?:(?:nonzero|evenodd)\s*,\s*)?(.+)\)$/i.exec(value.trim());if(!m)return null;
  const ps:Point[]=[];
  for(const part of m[1].split(',')){
    const v=/^\s*(-?(?:\d+\.?\d*|\.\d+))(%|px)\s+(-?(?:\d+\.?\d*|\.\d+))(%|px)\s*$/.exec(part);if(!v)return null;
    const x=Number(v[1])/(v[2]==='%'?100:pixels.width),y=Number(v[3])/(v[4]==='%'?100:pixels.height);
    if(!Number.isFinite(x)||!Number.isFinite(y))return null;
    ps.push({x:box.x+x*box.width,y:box.y+y*box.height});
  }return ps.length>=3?ps:null;
}
export function clipFor(ps: Point[],box: Rect={x:0,y:0,width:100,height:100}): string {
  return `polygon(${ps.map(p=>`${Number(((p.x-box.x)/box.width*100).toFixed(6))}% ${Number(((p.y-box.y)/box.height*100).toFixed(6))}%`).join(', ')})`;
}
export function geometryFor(box:Rect,clip:string|undefined,pixels:{width:number;height:number},supported=true):Geometry{
  const polygon=clip&&clip!=='none'?parsePolygon(clip,box,pixels):undefined;
  return {box,bounds:polygon?polygonBounds(polygon):box,polygon:polygon||undefined,cssClip:clip,precise:supported&&(!clip||clip==='none'||!!polygon)};
}
const axis=(edge:Edge)=>['left','centerX','right'].includes(edge)?'x':'y';
const anchor=(r:Rect,e:Edge)=>e==='left'?r.x:e==='right'?r.x+r.width:e==='centerX'?r.x+r.width/2:e==='top'?r.y:e==='bottom'?r.y+r.height:r.y+r.height/2;
export type Reference = {kind:'selection'} | {kind:'canvas'} | {kind:'key';id:string};
export function arrangement(doc:Document,ids:string[],measure:Measurements,edge:Edge,distribute=false,reference:Reference={kind:'selection'}):Document{
  const targets=selectionWithGroups(doc,ids),units=new Map<string,{ids:string[];rects:Rect[];rect:Rect}>();
  if(!targets.length||targets.some(r=>!canMove(r)||!measure[r.layer.id]?.precise))throw new EditorError('layoutUnavailable');
  for(const r of targets){const key=r.layer.group||r.layer.id;const u=units.get(key)||{ids:[],rects:[],rect:{x:0,y:0,width:0,height:0}};u.ids.push(r.layer.id);u.rects.push(measure[r.layer.id].bounds);u.rect=union(u.rects);units.set(key,u);}
  const us=[...units.values()];
  if(us.length<(distribute?3:reference.kind==='canvas'?1:2))throw new EditorError('layoutSelection');
  let dest:number[];
  if(distribute){us.sort((a,b)=>anchor(a.rect,edge)-anchor(b.rect,edge));const first=anchor(us[0].rect,edge),last=anchor(us[us.length-1].rect,edge);dest=us.map((_,i)=>first+(last-first)*i/(us.length-1));}
  else{
    const ref=reference.kind==='canvas'?{x:0,y:0,width:100,height:100}:reference.kind==='key'?us.find(u=>u.ids.includes(reference.id))?.rect:union(us.map(u=>u.rect));
    if(!ref)throw new EditorError('layoutSelection');dest=us.map(()=>anchor(ref,edge));
  }
  const delta=new Map<string,number>();us.forEach((u,i)=>u.ids.forEach(id=>delta.set(id,dest[i]-anchor(u.rect,edge))));
  const next=clone(doc);for(const r of rows(next)){const d=delta.get(r.layer.id);if(d===undefined||Math.abs(d)<1e-8)continue;const p=position(r.element)!;const key=axis(edge)==='x'?'left':'top';r.element.style[key]=`${Number(((key==='left'?p.x:p.y)+d).toFixed(5))}%`;}
  return next;
}
export function zoomAt(zoom:number,pan:Point,cursor:Point,factor:number){
  const next=Math.max(.25,Math.min(4,zoom*factor));return {zoom:next,pan:{x:cursor.x-(cursor.x-pan.x)*next/zoom,y:cursor.y-(cursor.y-pan.y)*next/zoom}};
}
