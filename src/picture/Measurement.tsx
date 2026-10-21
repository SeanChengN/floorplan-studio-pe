import { useEffect, useMemo, useRef } from 'react';
import { HassLike } from '../ha/hassBridge';
import { Config, Document, previewCard, rows } from './model';
import { geometryFor, Measurements } from './geometry';
import { NativePreview } from './NativePreview';

/** Isolated safe native card: all supported leaves are measured regardless of conditions/visibility. */
export function Measurement({doc,hass,onMeasure}:{doc:Document;hass:HassLike|null;onMeasure:(m:Measurements)=>void}){
  const host=useRef<HTMLDivElement>(null),latest=useRef(onMeasure);latest.current=onMeasure;
  const all=useMemo(()=>rows(doc),[doc]);
  const card=useMemo(()=>{
    const safe=previewCard(doc,false),leaves:Config[]=[];
    const flatten=(es:Config[])=>es.forEach(e=>e.type==='conditional'?flatten(e.elements):leaves.push(e));flatten(safe.elements);
    const supported=all.filter(r=>r.element.type!=='conditional'&&['image','icon','state-icon','state-label'].includes(r.element.type));
    // previewCard keeps supported leaves in the exact original traversal order.
    return {...safe,title:undefined,elements:leaves.map((e,i)=>({...e,style:{...e.style,'--fps-pe-id':supported[i].layer.id}}))};
  },[doc,all]);
  useEffect(()=>{
    let stopped=false,frame=0;const resize=new ResizeObserver(schedule),mutation=new MutationObserver(schedule);
    const observed=new Set<Element>();let last='';
    function schedule(){if(!frame&&!stopped)frame=requestAnimationFrame(measure);}
    function measure(){
      frame=0;if(stopped||!host.current)return;
      const native=host.current.querySelector('hui-picture-elements-card');
      const root=native?.shadowRoot?.querySelector<HTMLElement>('#root')||host.current.querySelector<HTMLElement>('.pe-fallback');
      const next:Measurements={};
      if(root){
        const base=root.getBoundingClientRect();
        if(base.width&&base.height)for(const el of root.querySelectorAll<HTMLElement>('[style]')){
          const id=el.style.getPropertyValue('--fps-pe-id').trim();if(!id)continue;
          const row=all.find(r=>r.layer.id===id);if(!row)continue;
          const rect=el.getBoundingClientRect(),style=getComputedStyle(el);if(!rect.width||!rect.height)continue;
          if(!observed.has(el)){resize.observe(el);observed.add(el);}
          const s=row.element.style||{},transform=s.transform;
          const simple=!row.ancestors.some(a=>all.find(r=>r.layer.id===a.id)?.element.style)&&!['rotate','scale','translate','right','bottom'].some(k=>k in s)&&(!transform||transform==='none'||/^translate\(\s*-50%\s*,\s*-50%\s*\)$/.test(transform));
          next[id]=geometryFor({x:(rect.left-base.left)/base.width*100,y:(rect.top-base.top)/base.height*100,width:rect.width/base.width*100,height:rect.height/base.height*100},row.element.style?.['clip-path'],{width:parseFloat(style.width)||el.offsetWidth,height:parseFloat(style.height)||el.offsetHeight},simple);
        }
        if(!observed.has(root)){resize.observe(root);mutation.observe(root,{childList:true,subtree:true,attributes:true});observed.add(root);}
      }
      const signature=JSON.stringify(next);if(signature!==last){last=signature;latest.current(next);}
    }
    if(host.current){resize.observe(host.current);mutation.observe(host.current,{childList:true,subtree:true});}
    const timer=setInterval(schedule,250);schedule();document.fonts?.ready.then(schedule);
    return()=>{stopped=true;cancelAnimationFrame(frame);clearInterval(timer);resize.disconnect();mutation.disconnect();};
  },[card,all]);
  return <div className="pe-measure" ref={host} aria-hidden="true"><NativePreview card={card} hass={hass} onBounds={()=>{}}/></div>;
}
