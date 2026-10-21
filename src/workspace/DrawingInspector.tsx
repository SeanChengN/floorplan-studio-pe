import { t } from '../i18n';
import { Document } from '../picture/model';
import { editDrawing } from './drawing';
export function DrawingInspector({doc,id,update}:{doc:Document;id:string;update:(fn:(d:Document)=>Document)=>void}){
  const d=doc.drawing!,w=d.walls.find(w=>w.id===id),o=d.openings.find(o=>o.id===id),obj=w||o;if(!obj)return null;
  return <div><h3>{t(w?'Wall':o!.kind==='door'?'Door':'Window')}</h3><label className="pe-field"><span>{t('Color')}</span><input type="color" value={obj.color} onChange={e=>update(doc=>editDrawing(doc,d=>{const x=[...d.walls,...d.openings].find(x=>x.id===id)!;x.color=e.target.value;}))}/></label>
    <label className="pe-field"><span>{t(w?'Thickness':'Width')}</span><input type="number" min="1" value={w?w.thickness:o!.width} onChange={e=>update(doc=>editDrawing(doc,d=>{if(w)d.walls.find(x=>x.id===id)!.thickness=Number(e.target.value);else d.openings.find(x=>x.id===id)!.width=Number(e.target.value);}))}/></label>
    {o&&<label className="pe-field"><span>{t('Position on wall')}</span><input type="range" min="0" max="1" step="0.01" value={o.t} onChange={e=>update(doc=>editDrawing(doc,d=>{d.openings.find(x=>x.id===id)!.t=Number(e.target.value);}))}/></label>}
    <button onClick={()=>update(doc=>editDrawing(doc,d=>{d.walls=d.walls.filter(x=>x.id!==id);d.openings=d.openings.filter(x=>x.id!==id&&x.wallId!==id);} ))}>{t('Delete')}</button>
  </div>;
}
