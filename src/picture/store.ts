import { create } from 'zustand';
import { Document, importProject } from './model';

const KEY = 'floorplan-studio-pe-project-v1';
let recovery: string | null = null;
function restore(): Document | null {
  try { recovery = localStorage.getItem(KEY); return recovery ? importProject(recovery) : null; }
  catch { return null; }
}
const initial = restore();
interface State {
  doc: Document | null; past: Document[]; future: Document[]; selected: string[]; storageError: boolean; recovery: string | null;
  set: (doc: Document, history?: boolean) => void; select: (ids: string[]) => void; undo: () => void; redo: () => void;
}
export const usePicture = create<State>((set, get) => ({
  doc: initial, past: [], future: [], selected: [], storageError: !!recovery && !initial, recovery: !initial ? recovery : null,
  set: (doc, history = true) => {
    const old = get();
    if (JSON.stringify(old.doc) === JSON.stringify(doc)) return;
    let storageError = false;
    try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch { storageError = true; }
    set({ doc, storageError, past: history && old.doc ? [...old.past.slice(-99), old.doc] : old.past, future: [] });
  },
  select: selected => set({ selected }),
  undo: () => { const s = get(); if (!s.past.length || !s.doc) return; const doc = s.past[s.past.length - 1]; let storageError = false; try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch { storageError = true; } set({ doc, past: s.past.slice(0, -1), future: [s.doc, ...s.future], storageError }); },
  redo: () => { const s = get(); if (!s.future.length || !s.doc) return; const doc = s.future[0]; let storageError = false; try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch { storageError = true; } set({ doc, past: [...s.past, s.doc], future: s.future.slice(1), storageError }); },
}));
