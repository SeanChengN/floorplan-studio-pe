import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { t } from '../i18n';
import { usePicture } from '../picture/store';
import { listProjects } from '../persist/db';
import { blankDocument, importWorkspace, migrateDrawing, newWorkspace, archiveFloor, restoreFloor } from './project';
import { readLibrary, saveWorkspace, preserveImportedProject } from './library';
import { Workspace } from './types';
import { download } from '../picture/Editor';

export function ProjectControls({onImport,onImage,onError}:{onImport:()=>void;onImage:()=>void;onError:(s:string)=>void}){
  const state=usePicture(),p=state.project;
  const [open,setOpen]=useState(false),[items,setItems]=useState<Workspace[]>([]),[trash,setTrash]=useState(false);
  const refresh=()=>{try{setItems(readLibrary().projects);}catch(e){onError(String(e));}};
  useEffect(()=>{let active=true;(async()=>{try{const old=await listProjects();for(const legacy of old){if(readLibrary().projects.some(x=>x.id==='drawing-'+legacy.id))continue;const key='fps-legacy-before-v3-'+legacy.id;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(legacy));saveWorkspace(migrateDrawing(legacy),false);}if(active&&open)refresh();}catch(e){if(active)onError(t('Legacy projects could not be migrated. Their original data is retained.'));}})();return()=>{active=false;};},[]);
  function load(project:Workspace){state.load(project);setOpen(false);}
  return <>
    <button onClick={()=>{refresh();setOpen(true);}}>{t('Projects')}</button>
    {p&&<><input className="ws-project-name" aria-label={t('Project name')} value={p.name} onChange={e=>state.change(p=>({...p,name:e.target.value}))}/><select aria-label={t('Floor')} value={p.activeFloorId} onChange={e=>state.change(p=>({...p,activeFloorId:e.target.value}))}>{p.floors.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><button title={t('Add floor')} onClick={()=>state.change(p=>{const id=nanoid();p.floors.push({id,name:t('Floor')+' '+(p.floors.length+1),document:blankDocument()});p.activeFloorId=id;return p;})}>＋</button><button disabled={p.floors.length<2} title={t(p.floors.length<2?'Keep at least one floor':'Delete floor (recoverable)')} onClick={()=>{if(confirm(t('Move the current floor to the recycle bin? It can be restored.')))state.change(archiveFloor);}}>{t('Delete floor')}</button></>}
    {open&&<div className="pe-modal-shade"><div className="pe-modal" role="dialog" aria-label={t('Projects')}>
      <h2>{t('Projects')}</h2><div className="ws-starts"><button onClick={()=>load(newWorkspace(undefined,t('Untitled project')))}>{t('Blank drawing')}</button><button onClick={()=>{setOpen(false);onImage();}}>{t('Import background')}</button><button onClick={()=>{setOpen(false);onImport();}}>{t('Import card')}</button></div>
      <label className="pe-field"><span>{t('Import project')}</span><input type="file" accept=".json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{load(preserveImportedProject(importWorkspace(await f.text())));}catch(err){onError(String(err));}}}/></label>
      <label className="pe-check"><input type="checkbox" checked={trash} onChange={e=>setTrash(e.target.checked)}/>{t('Recycle bin')}</label>
      <div className="ws-project-list">{items.filter(x=>!!x.archived===trash).map(x=><div className="ws-project-row" key={x.id}><span>{x.name} <small>{x.floors.length} {t('Floors')}</small></span>{!trash&&<button onClick={()=>load(x)}>{t('Open')}</button>}<button onClick={()=>download(x.name+'.json',JSON.stringify(x,null,2))}>{t('Download')}</button><button onClick={()=>{try{saveWorkspace({...x,archived:!trash});if(!trash&&state.project?.id===x.id)state.load(newWorkspace(undefined,t('Untitled project')));refresh();}catch(err){onError(String(err));}}}>{t(trash?'Restore':'Move to recycle bin')}</button></div>)}</div>
      {p&&!!p.archivedFloors?.length&&<section><h3>{t('Deleted floors in current project')}</h3>{p.archivedFloors.map(f=><div className="ws-project-row" key={f.id}><span>{f.name}</span><button onClick={()=>state.change(p=>restoreFloor(p,f.id))}>{t('Restore')}</button></div>)}</section>}
      <button onClick={()=>setOpen(false)}>{t('Close')}</button>
    </div></div>}
  </>;
}
