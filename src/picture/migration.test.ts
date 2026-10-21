import { describe, expect, it, vi } from 'vitest';
import { importCard } from './model';
const key='floorplan-studio-pe-project-v1';
function old(){const d:any=importCard('type: picture-elements\nimage: /local/test.png\nelements: []');d.version=1;delete d.rooms;return JSON.stringify(d);}
describe('recoverable browser migration',()=>{
  it('backs up the exact v1 payload before writing the v3 library and never replaces a prior backup',async()=>{
    vi.resetModules();const raw=old(),map=new Map([[key,raw]]),writes:string[]=[];
    vi.stubGlobal('localStorage',{getItem:(k:string)=>map.get(k)||null,setItem:(k:string,v:string)=>{writes.push(k);map.set(k,v);}});
    const {usePicture}=await import('./store');expect(usePicture.getState().doc?.version).toBe(2);expect(writes).toEqual([key+'-before-v3','floorplan-studio-library-v3']);expect(map.get(key+'-before-v3')).toBe(raw);expect(map.get(key)).toBe(raw);
    map.set(key,raw);vi.resetModules();await import('./store');expect(map.get(key+'-before-v3')).toBe(raw);expect(writes.filter(k=>k===key+'-before-v3')).toHaveLength(1);vi.unstubAllGlobals();
  });
  it('retains v1 data and exposes recovery on backup quota failure',async()=>{
    vi.resetModules();const raw=old();vi.stubGlobal('localStorage',{getItem:(k:string)=>k===key?raw:null,setItem:()=>{throw new Error('Quota');}});
    const {usePicture}=await import('./store');expect(usePicture.getState().doc?.version).toBe(2);expect(usePicture.getState().storageError).toBe(true);expect(usePicture.getState().recovery).toBe(raw);vi.unstubAllGlobals();
  });
});
