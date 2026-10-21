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
  return <details className="pe-arrangement"><summary>{t('Arrange')}</summary><div className="pe-arrangement-body">
    <label className="pe-field"><span>{t('Align to')}</span><select aria-label={t('Align to')} value={reference.kind} onChange={e=>{const kind=e.target.value as Reference['kind'];setReference(kind==='key'?{kind,id:selected[0]||''}:{kind});onKey(kind==='key'?selected[0]||'':'');}}>
      <option value="selection">{t('Selection bounds')}</option><option value="key">{t('Key object')}</option><option value="canvas">{t('Canvas')}</option>
    </select></label>
    {ref.kind==='key'&&<label className="pe-field"><span>{t('Key object')}</span><select aria-label={t('Key object')} value={key} onChange={e=>{setReference({kind:'key',id:e.target.value});onKey(e.target.value);}}>{selected.map(id=><option key={id} value={id}>{all.find(r=>r.layer.id===id)?.layer.name||all.find(r=>r.layer.id===id)?.element.entity||id}</option>)}</select></label>}
    <strong>{t('Align')}</strong><div className="pe-arrange-grid">{edges.map(edge=><button key={edge} title={alignReason||t(edgeLabels[edge])} disabled={!!alignReason} onClick={()=>update(d=>arrangement(d,selected,measure,edge,false,ref))}>{t(edgeLabels[edge])}</button>)}</div>
    {alignReason&&<p className="pe-note">{alignReason}</p>}
    <strong>{t('Distribute within selection')}</strong><div className="pe-arrange-grid">{edges.map(edge=><button key={edge} title={distributeReason||t(edgeLabels[edge])} disabled={!!distributeReason} onClick={()=>update(d=>arrangement(d,selected,measure,edge,true,ref))}>{t(edgeLabels[edge])}</button>)}</div>
    {distributeReason&&<p className="pe-note">{distributeReason}</p>}
  </div></details>;
}
