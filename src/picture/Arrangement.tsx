import { useEffect, useState } from 'react';
import { t } from '../i18n';
import { Document, rows } from './model';
import { arrangement, edgeLabels, edges, Measurements, Reference } from './geometry';
export function Arrangement({doc,selected,measure,update,onKey}:{doc:Document;selected:string[];measure:Measurements;update:(fn:(d:Document)=>Document)=>void;onKey:(id:string)=>void}){
  const [reference,setReference]=useState<Reference>({kind:'selection'});
  const key=reference.kind==='key'?(selected.includes(reference.id)?reference.id:selected[0]||''):'';
  const ref:Reference=reference.kind==='key'?{kind:'key',id:key}:reference;
  useEffect(()=>onKey(key),[key,onKey]);
  function reason(distribute:boolean){try{arrangement(doc,selected,measure,'left',distribute,ref);return '';}catch(e){return t((e as {key:string}).key);}}
  const alignReason=reason(false),distributeReason=reason(true),all=rows(doc);
  return <div className="pe-arrangement-inline" role="toolbar" aria-label={t('Arrange')}>
    <label className="pe-field"><span>{t('Align to')}</span><select aria-label={t('Align to')} value={reference.kind} onChange={e=>{const kind=e.target.value as Reference['kind'];setReference(kind==='key'?{kind,id:selected[0]||''}:{kind});onKey(kind==='key'?selected[0]||'':'');}}>
      <option value="selection">{t('Selection bounds')}</option><option value="key">{t('Key object')}</option><option value="canvas">{t('Canvas')}</option>
    </select></label>
    {ref.kind==='key'&&<label className="pe-field"><span>{t('Key object')}</span><select aria-label={t('Key object')} value={key} onChange={e=>{setReference({kind:'key',id:e.target.value});onKey(e.target.value);}}>{selected.map(id=><option key={id} value={id}>{all.find(r=>r.layer.id===id)?.layer.name||all.find(r=>r.layer.id===id)?.element.entity||id}</option>)}</select></label>}
    {[false,true].map(distribute=><div className="pe-icon-group" role="group" aria-label={t(distribute?'Distribute within selection':'Align')} key={String(distribute)}>{edges.map(edge=>{const label=t(distribute?'Distribute':'Align')+' · '+t(edgeLabels[edge]),why=distribute?distributeReason:alignReason;return <span key={edge} title={why?label+' — '+why:label}><button className="pe-arrange-icon" aria-label={label} disabled={!!why} onClick={()=>update(d=>arrangement(d,selected,measure,edge,distribute,ref))}><ArrangeIcon edge={edge} distribute={distribute}/></button></span>;})}</div>)}
  </div>;
}
function ArrangeIcon({edge,distribute}:{edge:string;distribute:boolean}){
  const vertical=['top','centerY','bottom'].includes(edge),center=['centerX','centerY'].includes(edge),end=['right','bottom'].includes(edge);
  return <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g transform={vertical?'translate(24 0) rotate(90)':undefined} fill="currentColor">
    {distribute?<>{[3,11,19].map((x,i)=><g key={x}><rect x={x} y="2" width="1" height="20" opacity=".55"/><rect x={x-(center?[1,3,2][i]:end?[2,6,4][i]:0)} y={5+i*5} width={[3,7,5][i]} height="3"/></g>)}</>:<><rect x={center?11:end?20:3} y="2" width="1" height="20" opacity=".65"/>{[7,13,9].map((w,i)=><rect key={i} x={center?11.5-w/2:end?20-w:4} y={4+i*6} width={w} height="4" rx=".5"/>)}</>}
  </g></svg>;
}
