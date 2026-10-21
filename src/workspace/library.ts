import { Workspace } from './types';
import { nanoid } from 'nanoid';
import { t } from '../i18n';
import { importWorkspace } from './project';

export const LIBRARY_KEY='floorplan-studio-library-v3';
export const OLD_KEY='floorplan-studio-pe-project-v1';
export interface Library { activeId:string; projects:Workspace[] }
export const readLibrary=():Library=>{const raw=localStorage.getItem(LIBRARY_KEY);if(!raw)return{activeId:'',projects:[]};const p=JSON.parse(raw);if(!Array.isArray(p.projects))throw new Error('Invalid project library');return{activeId:p.activeId,projects:p.projects.map((x:unknown)=>importWorkspace(JSON.stringify(x)))};};
/** Importing an older download must never overwrite the current project. */
export function preserveImportedProject(p:Workspace):Workspace {
  return readLibrary().projects.some(x=>x.id===p.id)?{...p,id:nanoid(),name:p.name+' ('+t('Imported copy')+')',archived:false}:p;
}
export function saveWorkspace(p:Workspace,activate=true){const lib=readLibrary();const i=lib.projects.findIndex(x=>x.id===p.id);if(i<0)lib.projects.push(p);else lib.projects[i]=p;if(activate)lib.activeId=p.id;localStorage.setItem(LIBRARY_KEY,JSON.stringify(lib));}
export function restoreWorkspace():{project:Workspace|null;recovery:string|null;failed:boolean}{
  let recovery:string|null=null;
  try{
    const lib=readLibrary();const current=lib.projects.find(p=>p.id===lib.activeId&&!p.archived)||lib.projects.find(p=>!p.archived);if(current)return{project:current,recovery:null,failed:false};
    // A populated library (including only archived projects) has already migrated.
    if(lib.projects.length)return{project:null,recovery:null,failed:false};
    recovery=localStorage.getItem(OLD_KEY);if(!recovery)return{project:null,recovery:null,failed:false};
    const project=importWorkspace(recovery);project.id='migrated-native-v1';
    try{const backup=OLD_KEY+'-before-v3';if(!localStorage.getItem(backup))localStorage.setItem(backup,recovery);saveWorkspace(project);return{project,recovery:null,failed:false};}
    catch{return{project,recovery,failed:true};}
  }catch{let raw=recovery;try{raw=raw||localStorage.getItem(LIBRARY_KEY);}catch{}return{project:null,recovery:raw,failed:typeof localStorage!=='undefined'};}
}
