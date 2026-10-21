import { describe, expect, it, vi } from 'vitest';
import { clone, dump, duplicate, exportCard, importCard, remove, rows, setMeta } from '../picture/model';
import { assignRoom, createRoom } from '../picture/rooms';
import { assignState, roomViews, stateSatisfied, visibleDocument } from './states';
import { blankDocument, importWorkspace, newWorkspace, withDocument } from './project';
import { editDrawing, newWall } from './drawing';
import { createMarker, createProject, createRoom as oldRoom } from '../model/defaults';
import { migrateDrawing } from './project';
import { pointerPoint, nextSegment } from './interaction';
import { preserveImportedProject, LIBRARY_KEY } from './library';

function fixture(){
  let d=importCard(dump({type:'picture-elements',image:'/local/synthetic.png',custom:{preserve:true},elements:['light.study','switch.aquarium'].flatMap(entity=>['on','off'].map(state=>({type:'conditional',conditions:[{entity,state}],elements:[{type:'state-icon',entity,style:{left:'20%',top:'30%'},tap_action:{action:'more-info'}}]})))}));
  d=createRoom(d,[{x:1,y:1},{x:90,y:1},{x:90,y:90},{x:1,y:90}],1.5);return assignRoom(d,d.rooms[0].id,d.layers.map(l=>l.id));
}
describe('unified projects and room states',()=>{
  it('classifies existing conditions without generating wrappers; simulates independent combinations',()=>{
    const d=fixture(),before=exportCard(d),views=roomViews(d,d.rooms[0]);expect(views).toHaveLength(4);
    for(const a of ['on','off'])for(const b of ['on','off']){const states={'light.study':{state:a},'switch.aquarium':{state:b}};expect(views.filter(v=>stateSatisfied(v,states))).toHaveLength(2);expect(exportCard(visibleDocument(d,states))).toBe(before);}
    expect(views.filter(v=>stateSatisfied(v,{'light.study':{state:'unavailable'}}))).toHaveLength(0);
    expect(exportCard(assignState(d,d.rooms[0].id,views[0],[views[0].nodes[0]]))).toBe(before);
  });
  it('preserves children masks when room visibility is restored and never changes exported config',()=>{
    let d=fixture();d=setMeta(d,d.layers[0].children[0].id,{hidden:true});const original=clone(d);d.rooms[0].hidden=true;
    const masked=visibleDocument(d,{});expect(masked.layers.every(l=>l.hidden)).toBe(true);expect(exportCard(masked)).toBe(exportCard(original));
    d.rooms[0].hidden=false;expect(visibleDocument(d,{}).layers).toEqual(original.layers);
  });
  it('recognizes state_image variants without duplicating native elements',()=>{
    let d=importCard(dump({type:'picture-elements',image:'/local/base.png',elements:[{type:'image',entity:'light.test',state_image:{on:'/local/on.png',off:'/local/off.png'}}]}));
    d=createRoom(d,[{x:0,y:0},{x:90,y:0},{x:90,y:90}],1);d=assignRoom(d,d.rooms[0].id,[d.layers[0].id]);const views=roomViews(d,d.rooms[0]);expect(views).toHaveLength(2);
    d.rooms[0].hiddenStates=[views.find(v=>v.value==='off')!.id];expect(visibleDocument(d,{'light.test':{state:'on'}}).layers[0].hidden).toBe(false);expect(visibleDocument(d,{'light.test':{state:'off'}}).layers[0].hidden).toBe(true);
  });
  it('changes a direct state condition in place and preserves unrelated nested fields',()=>{
    const d=fixture(),v=roomViews(d,d.rooms[0])[1],id=d.layers[0].id;const changed=assignState(d,d.rooms[0].id,v,[id]);expect(changed.card.elements).toHaveLength(4);expect(changed.card.elements[0].conditions[0].state).toBe('off');expect(changed.card.elements[0].elements).toEqual(d.card.elements[0].elements);
    expect(()=>assignState(setMeta(d,id,{locked:true}),d.rooms[0].id,v,[id])).toThrow();expect(d.card.elements[0].conditions[0].state).toBe('on');
  });
  it('stores multiple floors in one v3 document and round trips metadata and unknown config',()=>{
    const d=fixture(),p=newWorkspace(d,'Study');p.floors.push({id:'second',name:'Second',document:blankDocument()});const round=importWorkspace(JSON.stringify(p));expect(round).toEqual(p);expect(exportCard(round.floors[0].document)).toBe(exportCard(d));expect(withDocument(p,d).floors[1]).toEqual(p.floors[1]);
  });
  it('keeps existing native elements untouched when drawing a wall and moving its door',()=>{
    const original=fixture();let d=newWall(original,[{x:100,y:100},{x:600,y:100}]);const wall=d.drawing!.walls[0];
    d=editDrawing(d,x=>x.openings.push({id:'door',wallId:wall.id,t:.4,width:50,color:'#ffffff',kind:'door'}));const before=clone(d);d=editDrawing(d,x=>{x.walls[0].points[1].y=200;});
    expect(d.card.elements.slice(0,4)).toEqual(original.card.elements);expect(d.drawing!.bindings).toEqual(before.drawing!.bindings);expect(d.card.elements[5].image).not.toBe(before.card.elements[5].image);
    const locked=setMeta(d,d.drawing!.bindings.door,{locked:true});expect(()=>editDrawing(locked,x=>{x.walls[0].points[0].x=0;})).toThrow();expect(rows(locked)).toHaveLength(rows(d).length);
  });
  it('preserves legacy source and floors, and blocks inaccurate native export',()=>{
    const legacy=createProject('Legacy'),floor=legacy.floors[0];floor.rooms.push(oldRoom([{x:0,y:0},{x:200,y:0},{x:200,y:200}],'Study'));const m=createMarker(100,200,'sensor.test');m.stateRules=[{id:'heat',mode:'gradient',min:0,max:40,minColor:'#112233',maxColor:'#aabbcc'}];floor.markers.push(m);
    const saved=clone(legacy),migrated=migrateDrawing(legacy);expect(legacy).toEqual(saved);expect(migrated.legacy).toEqual(saved);expect(migrated.exportWarnings!.length).toBeGreaterThan(0);expect(migrated.floors[0].document.rooms[0].name).toBe('Study');expect(importWorkspace(JSON.stringify(migrated))).toEqual(migrated);
  });
  it('imports a saved revision as a separate project without overwriting its current copy',()=>{
    const p=newWorkspace(fixture(),'Study');const raw=JSON.stringify({activeId:p.id,projects:[p]});
    vi.stubGlobal('localStorage',{getItem:(key:string)=>key===LIBRARY_KEY?raw:null});
    try{const copy=preserveImportedProject(p);expect(copy.id).not.toBe(p.id);expect(copy.floors).toEqual(p.floors);expect(localStorage.getItem(LIBRARY_KEY)).toBe(raw);}finally{vi.unstubAllGlobals();}
  });
  it('blocks silent loss of plain legacy marker styling even without state rules',()=>{
    const p=createProject('Legacy');p.floors[0].markers.push(createMarker(100,100,'light.test'));
    expect(migrateDrawing(p).exportWarnings).toHaveLength(1);
  });
  it('uses the same coordinate conversion for drawing under zoom and title offsets',()=>{
    expect(pointerPoint({x:500,y:350},{left:100,top:150,width:800,height:400},{width:1200,height:600},20)).toEqual({x:600,y:300});
    const snapped=nextSegment([{x:0,y:0}],{x:100,y:2},true);expect(Math.abs(snapped.y)).toBeLessThan(.001);
  });
  it('preserves inactive shared state-image branches when another branch is hidden',()=>{
    const d=fixture(),first=d.card.elements[0];first.conditions[0].state=['on','off'];d.rooms[0].hiddenStates=[JSON.stringify(['light.study','off'])];const shown=visibleDocument(d,{'light.study':{state:'on'}});expect(shown.layers[0].hidden).toBe(false);expect(exportCard(shown)).toBe(exportCard(d));
  });
  it('rejects malformed imported drawing metadata before loading',()=>{
    const p=newWorkspace();p.floors[0].document.drawing!.grid=0;expect(()=>importWorkspace(JSON.stringify(p))).toThrow();
    const d=fixture();(d.rooms[0] as any).hiddenStates={};expect(()=>importWorkspace(JSON.stringify(newWorkspace(d)))).toThrow();
  });
  it('duplicates walls with editable openings and deletes both atomically from native layer controls',()=>{
    let d=newWall(blankDocument(),[{x:10,y:10},{x:200,y:10}]);const w=d.drawing!.walls[0];d=editDrawing(d,x=>x.openings.push({id:'door',wallId:w.id,t:.5,width:40,kind:'door',color:'#abcdef'}));
    const copied=duplicate(d,[d.drawing!.bindings[w.id]]);expect(copied.drawing!.walls).toHaveLength(2);expect(copied.drawing!.openings).toHaveLength(2);expect(copied.drawing!.openings[1].wallId).toBe(copied.drawing!.walls[1].id);
    const deleted=remove(copied,[copied.drawing!.bindings[w.id]]);expect(deleted.drawing!.walls).toHaveLength(1);expect(deleted.drawing!.openings).toHaveLength(1);expect(deleted.card.elements).toHaveLength(2);
    const locked=setMeta(d,d.drawing!.bindings.door,{locked:true});expect(()=>remove(locked,[locked.drawing!.bindings[w.id]])).toThrow();
  });
});
