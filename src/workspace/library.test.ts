import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LIBRARY_KEY, OLD_KEY, permanentlyDeleteProject, preserveImportedProject, readLibrary, restoreWorkspace, saveWorkspace } from './library';
import { newWorkspace } from './project';
let data:Map<string,string>;
beforeEach(()=>{data=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)||null,setItem:(k:string,v:string)=>data.set(k,v)});});
afterEach(()=>vi.unstubAllGlobals());
it('only purges archived projects, preserving other projects and active selection',()=>{
 const a=newWorkspace(),b=newWorkspace();saveWorkspace(a);saveWorkspace({...b,archived:true},false);
 expect(()=>permanentlyDeleteProject(a.id)).toThrow();permanentlyDeleteProject(b.id);
 expect(readLibrary().projects).toEqual([a]);expect(readLibrary().activeId).toBe(a.id);expect(readLibrary().deletedIds).toEqual([b.id]);
 expect(preserveImportedProject(b).id).not.toBe(b.id);expect(()=>saveWorkspace(b)).toThrow();
});
it('does not resurrect a permanently deleted migrated project when the library is empty',()=>{
 const p=newWorkspace();p.id='migrated-native-v1';p.archived=true;saveWorkspace(p);
 data.set(OLD_KEY,JSON.stringify(p.floors[0].document));permanentlyDeleteProject(p.id);
 expect(restoreWorkspace().project).toBeNull();expect(readLibrary().projects).toHaveLength(0);
 expect(data.has(OLD_KEY)).toBe(true);
});
it('leaves the stored project intact if the atomic deletion write fails',()=>{
 const p={...newWorkspace(),archived:true};saveWorkspace(p);const before=data.get(LIBRARY_KEY);
 vi.stubGlobal('localStorage',{getItem:(k:string)=>data.get(k)||null,setItem:()=>{throw new Error('Quota');}});
 expect(()=>permanentlyDeleteProject(p.id)).toThrow('Quota');expect(data.get(LIBRARY_KEY)).toBe(before);
});
