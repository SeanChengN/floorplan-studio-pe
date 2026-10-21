import { Document, rows } from './model';
import { Measurements, union } from './geometry';
import { Bounds } from './NativePreview';
export const pictureStyle=(b:Bounds|null)=>({left:`${(b?.left||0)*100}%`,top:`${(b?.top||0)*100}%`,width:`${(b?.width||1)*100}%`,height:`${(b?.height||1)*100}%`});
export function SelectionOverlay({doc,selected,measure,bounds,keyId,background}:{doc:Document;selected:string[];measure:Measurements;bounds:Bounds|null;keyId:string;background:boolean}){
  const all=rows(doc),targets=all.filter(r=>selected.includes(r.layer.id)||r.ancestors.some(a=>selected.includes(a.id))),gs=targets.map(r=>({id:r.layer.id,g:measure[r.layer.id]})).filter(x=>x.g);
  return <div className="pe-selection-overlay" style={pictureStyle(bounds)}>
    {gs.filter(x=>!x.g.polygon&&x.g.cssClip&&x.g.cssClip!=='none').map(({id,g})=><div key={id} className="pe-clip-tint" style={{left:`${g.box.x}%`,top:`${g.box.y}%`,width:`${g.box.width}%`,height:`${g.box.height}%`,clipPath:g.cssClip}}/>)}
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {background&&<rect x="0" y="0" width="100" height="100" className="pe-range"/>}
      {gs.map(({id,g})=><g key={id} className={id===keyId?'pe-key-range':''} data-range-id={id}>
        <rect x={g.box.x} y={g.box.y} width={g.box.width} height={g.box.height} className="pe-range"/>
        {g.polygon&&<polygon points={g.polygon.map(p=>`${p.x},${p.y}`).join(' ')} className="pe-clip-range"/>}
      </g>)}
      {selected.some(id=>all.find(r=>r.layer.id===id)?.element.type==='conditional')&&gs.length>0&&(()=>{const b=union(gs.map(x=>x.g.bounds));return <rect x={b.x} y={b.y} width={b.width} height={b.height} className="pe-group-range"/>;})()}
    </svg>
  </div>;
}
