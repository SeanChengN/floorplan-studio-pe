import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importCard, move, rows, setMeta } from './model';
import { usePicture } from './store';
const card='type: picture-elements\nimage: /local/demo.png\nelements:\n  - type: state-icon\n    entity: light.example\n    style:\n      left: 20%\n      top: 30%\n';
describe('project history and persistence',()=>{
  beforeEach(()=>{
    vi.stubGlobal('localStorage',{getItem:vi.fn(),setItem:vi.fn()});
    usePicture.setState({project:null,doc:null,past:[],future:[],selected:[],storageError:false});
  });
  it('undoes a complete drag once and preserves metadata in history',()=>{
    const a=importCard(card);usePicture.getState().set(a);const id=rows(a)[0].layer.id;
    const b=move(a,[id],5,10);usePicture.getState().set(b);
    const c=setMeta(b,id,{locked:true,hidden:true});usePicture.getState().set(c);
    usePicture.getState().undo();expect(usePicture.getState().doc).toEqual(b);
    usePicture.getState().undo();expect(usePicture.getState().doc).toEqual(a);
    usePicture.getState().redo();expect(usePicture.getState().doc).toEqual(b);
    usePicture.getState().redo();expect(usePicture.getState().doc).toEqual(c);
  });
  it('keeps redo and temporary visibility outside content history',()=>{
    const a=importCard(card),id=rows(a)[0].layer.id;usePicture.getState().set(a);
    const b=move(a,[id],5,10);usePicture.getState().set(b);usePicture.getState().undo();
    usePicture.getState().set(setMeta(usePicture.getState().doc!,id,{hidden:true}),false);
    expect(usePicture.getState().future).toHaveLength(1);usePicture.getState().redo();
    expect(usePicture.getState().doc!.card).toEqual(b.card);expect(rows(usePicture.getState().doc!)[0].layer.hidden).toBe(true);
    usePicture.getState().undo();expect(usePicture.getState().doc!.card).toEqual(a.card);expect(rows(usePicture.getState().doc!)[0].layer.hidden).toBe(true);
  });
  it('does not add a no-op history entry, and keeps document after a quota failure',()=>{
    const d=importCard(card);usePicture.getState().set(d);usePicture.getState().set(d);
    expect(usePicture.getState().past).toHaveLength(0);
    vi.mocked(localStorage.setItem).mockImplementation(()=>{throw new Error('Quota exceeded')});
    const next=move(d,[rows(d)[0].layer.id],1,1);usePicture.getState().set(next);
    expect(usePicture.getState().storageError).toBe(true);expect(usePicture.getState().doc).toEqual(next);
  });
});
