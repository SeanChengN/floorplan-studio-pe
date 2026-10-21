import { create } from 'zustand';
import { clone, Document, importProject, pruneRooms, rows } from './model';

const KEY = 'floorplan-studio-pe-project-v1';
let recovery: string | null = null;
let migrationError = false;
let pendingV1: string | null = null;
function persist(doc:Document){
  if(pendingV1){const backup=KEY+'-v1-backup';if(!localStorage.getItem(backup))localStorage.setItem(backup,pendingV1);pendingV1=null;}
  localStorage.setItem(KEY,JSON.stringify(doc));
}
function restore(): Document | null {
  try {
    recovery = localStorage.getItem(KEY);if(!recovery)return null;
    const doc=importProject(recovery);
    if(JSON.parse(recovery).version===1){pendingV1=recovery;try {persist(doc);}catch{migrationError=true;}}
    return doc;
  }
  catch { return null; }
}
const initial = restore();
interface State {
  doc: Document | null; past: Document[]; future: Document[]; selected: string[]; storageError: boolean; recovery: string | null;
  set: (doc: Document, history?: boolean) => void; select: (ids: string[]) => void; undo: () => void; redo: () => void;
}
export const usePicture = create<State>((set, get) => ({
  doc: initial, past: [], future: [], selected: [], storageError: migrationError || !!recovery && !initial, recovery: !initial || migrationError ? recovery : null,
  set: (doc, history = true) => {
    doc=pruneRooms(clone(doc));
    const old = get();
    if (JSON.stringify(old.doc) === JSON.stringify(doc)) return;
    let storageError = false;
    try { persist(doc); } catch { storageError = true; }
    const ids=new Set(rows(doc).map(r=>r.layer.id));
    set({ doc, selected:old.selected.filter(id=>ids.has(id)), storageError, past: history && old.doc ? [...old.past.slice(-99), old.doc] : old.past, future: [] });
  },
  select: selected => set({ selected }),
  undo: () => { const s = get(); if (!s.past.length || !s.doc) return; const doc = s.past[s.past.length - 1]; let storageError = false; try { persist(doc); } catch { storageError = true; } set({ doc, selected:s.selected.filter(id=>rows(doc).some(r=>r.layer.id===id)), past: s.past.slice(0, -1), future: [s.doc, ...s.future], storageError }); },
  redo: () => { const s = get(); if (!s.future.length || !s.doc) return; const doc = s.future[0]; let storageError = false; try { persist(doc); } catch { storageError = true; } set({ doc, selected:s.selected.filter(id=>rows(doc).some(r=>r.layer.id===id)), past: [...s.past, s.doc], future: s.future.slice(1), storageError }); },
}));
