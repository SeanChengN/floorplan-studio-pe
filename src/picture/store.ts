import { create } from 'zustand';
import { clone, Document, pruneRooms, rows } from './model';
import { Workspace } from '../workspace/types';
import { activeDocument, newWorkspace, withDocument } from '../workspace/project';
import { restoreWorkspace, saveWorkspace } from '../workspace/library';

// Temporary masks are editor state, not content history. Carry them through undo/redo.
function syncVisibility(snapshot:Workspace,current:Workspace):Workspace {
  const next=clone(snapshot);
  for(const f of next.floors){const source=current.floors.find(x=>x.id===f.id)?.document;if(!source)continue;
    const layerMap=new Map(rows(source).map(r=>[r.layer.id,r.layer]));
    for(const r of rows(f.document)){const m=layerMap.get(r.layer.id);if(m)r.layer.hidden=m.hidden;}
    for(const room of f.document.rooms){const m=source.rooms.find(r=>r.id===room.id);if(m){room.hidden=m.hidden;room.hiddenStates=clone(m.hiddenStates||[]);}}
  }return next;
}
const restored=restoreWorkspace();
interface State {
  project:Workspace|null; doc:Document|null; past:Workspace[]; future:Workspace[]; selected:string[];
  storageError:boolean; recovery:string|null;
  set:(doc:Document,history?:boolean)=>void; load:(p:Workspace)=>void; change:(fn:(p:Workspace)=>Workspace)=>void;
  select:(ids:string[])=>void; undo:()=>void; redo:()=>void;
}
function persist(p:Workspace):boolean {try{if(restored.failed&&restored.recovery){const key='fps-recovery-before-v3';if(!localStorage.getItem(key))localStorage.setItem(key,restored.recovery);}saveWorkspace(p);return false;}catch{return true;}}
export const usePicture=create<State>((set,get)=>({
  project:restored.project,doc:restored.project?activeDocument(restored.project):null,past:[],future:[],selected:[],storageError:restored.failed,recovery:restored.recovery,
  load:project=>set({project,doc:activeDocument(project),past:[],future:[],selected:[],storageError:persist(project)}),
  change:fn=>{const s=get();if(!s.project)return;const project=fn(clone(s.project));if(JSON.stringify(project)===JSON.stringify(s.project))return;project.updatedAt=Date.now();set({project,doc:activeDocument(project),past:[...s.past.slice(-99),s.project],future:[],storageError:persist(project)});},
  set:(doc,history=true)=>{
    doc=pruneRooms(clone(doc));const s=get();if(JSON.stringify(s.doc)===JSON.stringify(doc))return;
    const previous=s.doc&&s.project?s.project:null,project=previous?withDocument(previous,doc):newWorkspace(doc);
    const ids=new Set(rows(doc).map(r=>r.layer.id));
    set({project,doc,selected:s.selected.filter(id=>ids.has(id)),past:history&&previous?[...s.past.slice(-99),previous]:s.past.map(p=>syncVisibility(p,project)),future:history?[]:s.future.map(p=>syncVisibility(p,project)),storageError:persist(project)});
  },
  select:selected=>set({selected}),
  undo:()=>{const s=get();if(!s.past.length||!s.project)return;const project=s.past[s.past.length-1],doc=activeDocument(project);set({project,doc,past:s.past.slice(0,-1),future:[s.project,...s.future],selected:s.selected.filter(id=>rows(doc).some(r=>r.layer.id===id)),storageError:persist(project)});},
  redo:()=>{const s=get();if(!s.future.length||!s.project)return;const project=s.future[0],doc=activeDocument(project);set({project,doc,past:[...s.past,s.project],future:s.future.slice(1),selected:s.selected.filter(id=>rows(doc).some(r=>r.layer.id===id)),storageError:persist(project)});},
}));
