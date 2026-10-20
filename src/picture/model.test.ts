import { describe, expect, it } from 'vitest';
import { add, clone, dump, duplicate, exportCard, importCard, importProject, link, move, parse, previewCard, remove, reorder, replaceElement, rows, setMeta } from './model';
import { matches, simulatedHass } from './preview';
const icon = (state: string) => ({ type:'conditional',conditions:[{entity:'light.room',state}],elements:[{type:'state-icon',entity:'light.room',style:{left:'25%',top:'30%',opacity:.5,transform:'translate(-50%, -50%)','--state-icon-color':'white'},tap_action:{action:'toggle'},custom_unknown:{keep:[1,'yes',false]}}] });
const fixture = () => ({ type:'picture-elements',image:'/local/off.png?v=original',title:'原生户型',elements:[
  {type:'image',image:'/local/on.png',style:{left:'50%',top:'50%',width:'100%',opacity:.38,'clip-path':'polygon(0% 0%,50% 0%,50% 50%)'},tap_action:{action:'none'}},
  icon('on'),icon('off'),
  {type:'state-label',entity:'sensor.temperature',style:{left:'80%',top:'70%',opacity:.5},suffix:' °C',tap_action:{action:'more-info'}},
  {type:'custom:unknown',style:{left:'15%',top:'15%'},advanced:{a:1}},
] });
describe('lossless configuration editing',()=>{
  it('round-trips arbitrary fields, types, nested conditions, strings and metadata without leaking editor state',()=>{
    const raw=fixture(),doc=importCard(dump(raw));
    expect(parse(exportCard(doc))).toEqual(raw);
    expect(importProject(JSON.stringify(doc))).toEqual(doc);
    expect(exportCard(doc)).not.toContain('backgroundLocked');
  });
  it('only moves coordinates for an explicit mutually exclusive same-position pair',()=>{
    const doc=importCard(dump(fixture())),rs=rows(doc),id=rs.find(r=>r.element.type==='state-icon')!.layer.id;
    const next=move(doc,[id],10,-2),expected=fixture();
    for(const i of [1,2]) Object.assign((expected.elements[i] as any).elements[0].style,{left:'35%',top:'28%'});
    expect(next.card).toEqual(expected); expect(doc.card).toEqual(fixture());
  });
  it('does not link different positions or nonexclusive conditions',()=>{
    const raw=fixture(); (raw.elements[2] as any).elements[0].style.left='40%';
    expect(rows(importCard(dump(raw))).filter(r=>r.layer.group)).toHaveLength(0);
    (raw.elements[2] as any).elements[0].style.left='25%';(raw.elements[2] as any).conditions[0].state='on';
    expect(rows(importCard(dump(raw))).filter(r=>r.layer.group)).toHaveLength(0);
  });
  it('links off versus active excluding unknown/unavailable without grouping unrelated devices',()=>{
    const raw=fixture();(raw.elements[1] as any).conditions=[{entity:'light.room',state_not:'off'},{entity:'light.room',state_not:'unavailable'},{entity:'light.room',state_not:'unknown'}];
    const doc=importCard(dump(raw)),icons=rows(doc).filter(r=>r.element.type==='state-icon');
    expect(icons[0].layer.group).toBeTruthy();expect(icons[0].layer.group).toBe(icons[1].layer.group);
  });
  it('rejects invalid YAML, invalid trees, cycles and unsafe keys',()=>{
    for(const input of ['type: picture-elements\nelements: nope','type: entities\nentities: []','a: &a [*a]','__proto__: 1','type: picture-elements\nelements: [{type: conditional, conditions: []}]']) expect(()=>importCard(input)).toThrow();
  });
  it('locks full-size lighting overlays and ancestor subtrees, including linked targets',()=>{
    let doc=importCard(dump(fixture()));const rs=rows(doc);
    expect(rs[0].layer.locked).toBe(true);
    expect(()=>remove(doc,[rs[0].layer.id])).toThrow();
    expect(()=>reorder(doc,rs[1].layer.id,-1)).toThrow();
    doc=setMeta(doc,rs[3].layer.id,{locked:true});
    expect(()=>move(doc,[rs[2].layer.id],1,0)).toThrow();
    expect(()=>replaceElement(doc,rs[3].layer.id,icon('off'))).toThrow();
  });
  it('keeps hiding and naming metadata separate, with full preview ignoring temporary hiding',()=>{
    let doc=importCard(dump(fixture()));const id=rows(doc)[0].layer.id;
    doc=setMeta(doc,id,{hidden:true,name:'灯光图层'});
    expect(parse(exportCard(doc))).toEqual(fixture());
    expect(previewCard(doc,true).elements.some((e:any)=>e.type==='image')).toBe(false);
    expect(previewCard(doc,false).elements.some((e:any)=>e.type==='image')).toBe(true);
  });
  it('allows editing conditions without altering locked image descendants',()=>{
    const raw={type:'picture-elements',image:'/local/off.png',elements:[{type:'conditional',conditions:[{entity:'light.room',state:'on'}],elements:[fixture().elements[0]]}]};
    const doc=importCard(dump(raw)),id=rows(doc)[0].layer.id;
    const e=clone(doc.card.elements[0]);e.conditions=[{entity:'light.room',state:'off'}];
    expect(replaceElement(doc,id,e).card.elements[0].elements).toEqual(raw.elements[0].elements);
    e.elements=[];expect(()=>replaceElement(doc,id,e)).toThrow();
  });
  it('moves conditional containers together without moving children into other conditions',()=>{
    const doc=importCard(dump(fixture())),rs=rows(doc),id=rs[1].layer.id;
    const next=reorder(doc,id,1);
    expect(next.card.elements[2]).toEqual(doc.card.elements[1]);expect(next.layers[2].id).toBe(id);
  });
  it('supports duplicate/delete and keeps stable IDs unique',()=>{
    const doc=importCard(dump(fixture())),id=rows(doc)[1].layer.id,next=duplicate(doc,[id]);
    expect(next.card.elements.length).toBe(6);
    expect(new Set(rows(next).map(r=>r.layer.id)).size).toBe(rows(next).length);
    expect(remove(next,[next.layers[2].id])).toEqual(doc);
  });
  it('supports explicit link/unlink and rejects complex positions',()=>{
    let doc=importCard(dump(fixture()));const id=rows(doc)[2].layer.id;
    doc=link(doc,[id],true);expect(rows(doc)[2].layer.group).toBeUndefined();
    let raw=clone(rows(doc)[2].element);raw.style.left='calc(50% - 5px)';doc=replaceElement(doc,id,raw);
    expect(()=>move(doc,[id],1,1)).toThrow();
    raw=clone(rows(doc)[2].element);raw.style.left='50%';raw.style.transform='rotate(20deg)';doc=replaceElement(doc,id,raw);
    expect(()=>move(doc,[id],1,1)).toThrow();
  });
  it('adds correct default actions and preserves existing ones',()=>{
    let doc=importCard(dump(fixture()));doc=add(doc,'state-icon','climate.test');doc=add(doc,'state-icon','light.test');
    expect(doc.card.elements.at(-2).tap_action.action).toBe('more-info');expect(doc.card.elements.at(-1).tap_action.action).toBe('toggle');
    expect(doc.card.elements[1]).toEqual(fixture().elements[1]);
  });
  it('rejects corrupted project sidecars',()=>{
    const doc=importCard(dump(fixture()));doc.layers[1].id=doc.layers[0].id;
    expect(()=>importProject(JSON.stringify(doc))).toThrow();
  });
});
describe('safe previews',()=>{
  it('disables all actions and does not execute unknown custom elements',()=>{
    const doc=importCard(dump(fixture())),safe=previewCard(doc,false);
    expect(safe.elements.some((e:any)=>e.type==='custom:unknown')).toBe(false);
    expect(safe.elements[1].elements[0].tap_action).toEqual({action:'none'});
    expect(safe.elements[1].elements[0].hold_action).toEqual({action:'none'});
    expect(doc.card.elements[1].elements[0].tap_action).toEqual({action:'toggle'});
  });
  it('simulates states without modifying live states and denies service calls',async()=>{
    let called=false;const live={states:{'light.room':{entity_id:'light.room',state:'on',attributes:{}}},callService:async()=>{called=true;}};
    const simulated=simulatedHass(live,{'light.room':'off'})!;
    expect(simulated.states['light.room'].state).toBe('off');expect(live.states['light.room'].state).toBe('on');
    await expect(simulated.callService!('light','turn_on')).rejects.toThrow();expect(called).toBe(false);
  });
  it('retains lighting precedence for main/night, unknown states, fixed ambient and independent fish image',()=>{
    const main=[{entity:'light.bath',state:'on'}];const night=[{entity:'light.bath',state:'off'},{entity:'light.night',state:'on'}];
    for(const bath of ['on','off','unknown','unavailable']) for(const n of ['on','off']) {
      const s={'light.bath':{state:bath},'light.night':{state:n},'light.fish':{state:'off'}};
      expect(matches(main,s)&&matches(night,s)).toBe(false);expect(matches(main,s)).toBe(bath==='on');
      expect(matches(night,s)).toBe(bath==='off'&&n==='on');expect(matches([],s)).toBe(true);
      expect(matches([{entity:'light.fish',state:'on'}],s)).toBe(false);
    }
  });
});
