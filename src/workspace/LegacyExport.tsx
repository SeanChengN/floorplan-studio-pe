import { useState } from 'react';
import { t } from '../i18n';
import { Project } from '../model/schema';
import { buildHaFloorplan } from '../export/haFloorplan';
import { buildFloorplanSvg } from '../export/svg';
import { svgToPngBlob } from '../export/png';
import { download } from '../picture/Editor';

export function LegacyExport({project,onError}:{project:Project;onError:(s:string)=>void}){
  const [format,setFormat]=useState('json');
  async function run(){try{const f=project.floors.find(f=>f.id===project.activeFloorId)||project.floors[0],opts={image:'embed' as const,imageBaseName:'floor',localDir:'floorplan',svgDelivery:'inline' as const};
    if(format==='json')download('original-drawing.json',JSON.stringify(project,null,2));
    if(format==='yaml')download('original-drawing.yaml',buildHaFloorplan(project,f,opts).yaml);
    if(format==='svg')download('original-drawing.svg',buildFloorplanSvg(project,f,opts));
    if(format==='png'){const blob=await svgToPngBlob(buildFloorplanSvg(project,f,opts),f.canvas.width,f.canvas.height),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='original-drawing.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch(e){onError(String(e));}}
  return <><select aria-label={t('Original drawing format')} value={format} onChange={e=>setFormat(e.target.value)}>{['json','yaml','svg','png'].map(x=><option key={x}>{x}</option>)}</select><button title={t('Exports the preserved original drawing before migration.')} onClick={()=>void run()}>{t('Export original drawing')}</button></>;
}
