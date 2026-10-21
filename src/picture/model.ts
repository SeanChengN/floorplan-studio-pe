import yaml from 'js-yaml';
import { nanoid } from 'nanoid';
import type { Room } from './room-types';
import { validPolygon } from './geometry';
import type { Drawing } from '../workspace/types';

// The imported configuration is the source of truth. Metadata never enters it.
export type Config = Record<string, any>;
export interface Layer { id: string; name: string; locked: boolean; hidden: boolean; group?: string; children: Layer[] }
export interface Document { format: 'fps-picture-project'; version: 2; card: Config; layers: Layer[]; backgroundLocked: boolean; rooms: Room[]; drawing?: Drawing }
export interface Row { layer: Layer; element: Config; siblings: Config[]; metas: Layer[]; index: number; depth: number; ancestors: Layer[]; conditions: Config[]; managedDrawing?:boolean }
export const clone = <T,>(value: T): T => structuredClone(value);
export class EditorError extends Error { constructor(public key: string) { super(key); } }
const object = (v: any): v is Config => v !== null && typeof v === 'object' && !Array.isArray(v);

function validateElements(elements: unknown, depth = 0): asserts elements is Config[] {
  if (!Array.isArray(elements) || depth > 32) throw new EditorError('invalidElements');
  for (const e of elements) {
    if (!object(e) || typeof e.type !== 'string') throw new EditorError('invalidElements');
    if (e.type === 'conditional') {
      if (!Array.isArray(e.conditions)) throw new EditorError('invalidConditions');
      validateElements(e.elements, depth + 1);
    }
  }
}
export function validateCard(card: unknown): asserts card is Config {
  if (!object(card) || card.type !== 'picture-elements') throw new EditorError('invalidCard');
  if (!card.image && !card.image_entity && !card.camera_image && !card.state_image) throw new EditorError('missingImage');
  validateElements(card.elements);
}
export function parse(text: string): any {
  // JSON schema avoids implicit YAML dates and preserves HA's string-like scalars.
  const data = yaml.load(text, { schema: yaml.JSON_SCHEMA });
  const seen = new WeakSet<object>();
  const visit = (v: any, depth = 0) => {
    if (depth > 80) throw new EditorError('invalidElements');
    if (v && typeof v === 'object') {
      if (seen.has(v)) throw new EditorError('recursiveYaml');
      seen.add(v);
      for (const [k, child] of Object.entries(v)) {
        if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new EditorError('unsafeKey');
        visit(child, depth + 1);
      }
      seen.delete(v);
    } else if (typeof v === 'number' && !Number.isFinite(v)) throw new EditorError('invalidNumber');
  };
  visit(data);
  return data;
}
export const dump = (value: unknown) => yaml.dump(value, { schema: yaml.JSON_SCHEMA, lineWidth: -1, noRefs: true });
const children = (e: Config): Config[] => e.type === 'conditional' ? e.elements : [];
const autoLocked = (e: Config) => e.type === 'image' && (e.style?.width === '100%' || !!e.style?.['clip-path']);
export function layersFor(elements: Config[]): Layer[] {
  return elements.map(e => ({ id: nanoid(), name: '', locked: autoLocked(e), hidden: false, children: layersFor(children(e)) }));
}
export function rows(doc: Document): Row[] {
  const out: Row[] = [];
  function visit(es: Config[], ls: Layer[], ancestors: Layer[], conditions: Config[]) {
    es.forEach((element, index) => {
      const layer = ls[index];
      out.push({ layer, element, siblings: es, metas: ls, index, ancestors, depth: ancestors.length, conditions, ...(doc.drawing&&Object.values(doc.drawing.bindings).includes(layer.id)?{managedDrawing:true}:{}) });
      visit(children(element), layer.children, [...ancestors, layer], [...conditions, ...(element.type === 'conditional' ? element.conditions : [])]);
    });
  }
  visit(doc.card.elements, doc.layers, [], []);
  return out;
}
export const locked = (r: Row) => r.layer.locked || r.ancestors.some(l => l.locked);
export const hidden = (r: Row) => r.layer.hidden || r.ancestors.some(l => l.hidden);
export const position = (e: Config) => {
  const s = e.style;
  if (!s || typeof s.left !== 'string' || typeof s.top !== 'string') return null;
  const pct = /^-?(?:\d+\.?\d*|\.\d+)%$/;
  if (!pct.test(s.left) || !pct.test(s.top)) return null;
  return { x: parseFloat(s.left), y: parseFloat(s.top) };
};
export function canMove(r: Row): boolean {
  if (locked(r) || r.managedDrawing || !position(r.element)) return false;
  const s = r.element.style;
  return !['right', 'bottom', 'rotate', 'scale', 'translate'].some(k => k in s) &&
    (!s.transform || s.transform === 'none' || /^translate\(\s*-50%\s*,\s*-50%\s*\)$/.test(s.transform));
}
function pairKey(r: Row): string | undefined {
  if (!['state-icon', 'icon'].includes(r.element.type) || !r.element.entity || !position(r.element) || !r.conditions.length) return;
  if (r.conditions.some(c => c.entity !== r.element.entity || (c.condition && c.condition !== 'state') || Object.keys(c).some(k => !['condition', 'entity', 'state', 'state_not'].includes(k)) || (c.state === undefined && c.state_not === undefined))) return;
  return JSON.stringify([r.element.entity, position(r.element)]);
}
function exclusive(a: Row, b: Row): boolean {
  const list = (v: unknown): string[] => Array.isArray(v) ? v.filter(x=>typeof x==='string') : typeof v==='string' ? [v] : [];
  const constraints = [...a.conditions, ...b.conditions];
  let allowed: Set<string> | null = null;
  const denied = new Set<string>();
  for (const c of constraints) {
    if (c.state !== undefined) { const values = list(c.state); allowed = allowed ? new Set(values.filter(x=>allowed!.has(x))) : new Set(values); }
    list(c.state_not).forEach(v=>denied.add(v));
  }
  return allowed !== null && [...allowed].every(v=>denied.has(v));
}
export function importCard(text: string): Document {
  const card = parse(text); validateCard(card);
  const doc: Document = { format: 'fps-picture-project', version: 2, card, layers: layersFor(card.elements), backgroundLocked: true, rooms: [] };
  const candidates = new Map<string, Row[]>();
  for (const r of rows(doc)) { const key = pairKey(r); if (key) candidates.set(key, [...(candidates.get(key) || []), r]); }
  for (const rs of candidates.values()) {
    if (rs.length === 2 && exclusive(rs[0], rs[1])) {
      const group = nanoid(); rs.forEach(r => r.layer.group = group);
    }
  }
  return doc;
}
export function importProject(text: string): Document {
  const doc = parse(text);
  if (!object(doc) || doc.format !== 'fps-picture-project' || ![1,2].includes(doc.version) || typeof doc.backgroundLocked !== 'boolean') throw new EditorError('invalidProject');
  validateCard(doc.card);
  const ids = new Set<string>();
  function check(es: Config[], ls: any) {
    if (!Array.isArray(ls) || ls.length !== es.length) throw new EditorError('invalidProject');
    es.forEach((e, i) => {
      const l = ls[i];
      if (!object(l) || typeof l.id !== 'string' || ids.has(l.id) || typeof l.name !== 'string' || typeof l.locked !== 'boolean' || typeof l.hidden !== 'boolean' || (l.group !== undefined && typeof l.group !== 'string')) throw new EditorError('invalidProject');
      ids.add(l.id); check(children(e), l.children);
    });
  }
  check(doc.card.elements, doc.layers);
  if(doc.version===1){doc.version=2;doc.rooms=[];}
  validateRooms(doc,ids);
  return doc as Document;
}
function validateRooms(doc:Config,ids:Set<string>){
  const used=new Set<string>(),roomIds=new Set<string>(),effectIds=new Set<string>();
  const refs=(xs:unknown)=>Array.isArray(xs)&&xs.every(x=>typeof x==='string'&&ids.has(x))&&new Set(xs).size===xs.length;
  const color=(v:unknown)=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v);
  const opacity=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
  if(!Array.isArray(doc.rooms))throw new EditorError('invalidProject');
  for(const r of doc.rooms){
    if(!object(r)||typeof r.id!=='string'||roomIds.has(r.id)||typeof r.name!=='string'||(r.areaId!==undefined&&typeof r.areaId!=='string')||!Array.isArray(r.polygon)||r.polygon.length<3||r.polygon.length>500||r.polygon.some((p:any)=>!object(p)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>100||p.y<0||p.y>100)||!Number.isFinite(r.aspect)||r.aspect<=0||!color(r.fill)||!opacity(r.opacity)||!refs(r.members)||!refs(r.clipLayers)||r.clipLayers.some((id:string)=>!r.members.includes(id))||(r.baseId!==undefined&&!ids.has(r.baseId))||!Array.isArray(r.effects))throw new EditorError('invalidProject');
    if(!validPolygon(r.polygon))throw new EditorError('invalidProject');
    if((r.hidden!==undefined&&typeof r.hidden!=='boolean')||(r.hiddenStates!==undefined&&(!Array.isArray(r.hiddenStates)||r.hiddenStates.some((x:unknown)=>typeof x!=='string')))||(r.stateNames!==undefined&&(!object(r.stateNames)||Object.values(r.stateNames).some(x=>typeof x!=='string'))))throw new EditorError('invalidProject');
    roomIds.add(r.id);for(const id of r.members){if(used.has(id))throw new EditorError('invalidProject');used.add(id);}
    for(const e of r.effects){
      if(!object(e)||typeof e.id!=='string'||effectIds.has(e.id)||typeof e.name!=='string'||typeof e.entity!=='string'||!Array.isArray(e.onStates)||!Array.isArray(e.offStates)||[...e.onStates,...e.offStates].some(s=>typeof s!=='string'||!s||['unknown','unavailable'].includes(s))||e.onStates.some((s:string)=>e.offStates.includes(s)))throw new EditorError('invalidProject');
      effectIds.add(e.id);for(const b of [e.on,e.off])if(!object(b)||!color(b.color)||!opacity(b.opacity)||!refs(b.wrappers)||(b.fillId!==undefined&&!ids.has(b.fillId)))throw new EditorError('invalidProject');
    }
  }
}
export function pruneRooms(d:Document):Document{
  const ids=new Set(rows(d).map(r=>r.layer.id));
  if(d.drawing){const drawing=d.drawing;drawing.walls=drawing.walls.filter(w=>ids.has(drawing.bindings[w.id]));drawing.openings=drawing.openings.filter(o=>ids.has(drawing.bindings[o.id])&&drawing.walls.some(w=>w.id===o.wallId));const objects=new Set([...drawing.walls,...drawing.openings].map(x=>x.id));drawing.bindings=Object.fromEntries(Object.entries(drawing.bindings).filter(([id])=>objects.has(id)));}
  for(const r of d.rooms){r.members=r.members.filter(id=>ids.has(id));r.clipLayers=r.clipLayers.filter(id=>r.members.includes(id));if(r.baseId&&!ids.has(r.baseId))delete r.baseId;for(const e of r.effects)for(const b of [e.on,e.off]){b.wrappers=b.wrappers.filter(id=>ids.has(id));if(b.fillId&&!ids.has(b.fillId))delete b.fillId;}}
  return d;
}
export const exportCard = (doc: Document) => dump(doc.card);
export function selectionWithGroups(doc: Document, ids: string[]): Row[] {
  const all = rows(doc), groups = new Set(all.filter(r => ids.includes(r.layer.id)).map(r => r.layer.group).filter(Boolean));
  return all.filter(r => ids.includes(r.layer.id) || (r.layer.group && groups.has(r.layer.group)));
}
export function move(doc: Document, ids: string[], dx: number, dy: number): Document {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy)) return doc;
  const result = clone(doc), targets = selectionWithGroups(result, ids);
  if (!targets.length || targets.some(r => !canMove(r))) throw new EditorError('cannotMove');
  for (const r of targets) {
    const p = position(r.element)!;
    r.element.style.left = `${Number((p.x + dx).toFixed(5))}%`;
    r.element.style.top = `${Number((p.y + dy).toFixed(5))}%`;
  }
  return result;
}
const find = (doc: Document, id: string) => { const r = rows(doc).find(r => r.layer.id === id); if (!r) throw new EditorError('missingLayer'); return r; };
const subtreeLocked = (l: Layer): boolean => l.locked || l.children.some(subtreeLocked);
export function replaceElement(doc: Document, id: string, value: Config): Document {
  validateElements([value]);
  const d = clone(doc), r = find(d, id);
  const protectsChildren = (old: Config[], next: Config[], ls: Layer[]): boolean => ls.some((l,i) =>
    l.locked ? JSON.stringify(old[i]) !== JSON.stringify(next[i]) : protectsChildren(children(old[i]), next[i] ? children(next[i]) : [], l.children));
  if (locked(r) || protectsChildren(children(r.element), children(value), r.layer.children)) throw new EditorError('locked');
  // Raw edits retain positional metadata for surviving children, never trust config IDs.
  const reconcile = (es: Config[], old: Layer[]): Layer[] => es.map((e, i) => ({ ...(old[i] || layersFor([e])[0]), children: reconcile(children(e), old[i]?.children || []) }));
  r.layer.children = reconcile(children(value), r.layer.children);
  r.siblings[r.index] = clone(value);
  return pruneRooms(d);
}
export function setMeta(doc: Document, id: string, patch: Partial<Pick<Layer, 'name' | 'hidden' | 'locked'>>): Document {
  const d = clone(doc); Object.assign(find(d, id).layer, patch); return d;
}
export function reorder(doc: Document, id: string, delta: -1 | 1): Document {
  const d = clone(doc), r = find(d, id), index = r.index + delta;
  if (index < 0 || index >= r.siblings.length) return doc;
  if (locked(r) || subtreeLocked(r.layer) || subtreeLocked(r.metas[index])) throw new EditorError('locked');
  [r.siblings[r.index], r.siblings[index]] = [r.siblings[index], r.siblings[r.index]];
  [r.metas[r.index], r.metas[index]] = [r.metas[index], r.metas[r.index]];
  return d;
}
export function remove(doc: Document, ids: string[]): Document {
  ids=withOpenings(doc,ids);
  const d = clone(doc), rs = rows(d).filter(r => ids.includes(r.layer.id));
  if (rs.some(r => locked(r) || subtreeLocked(r.layer))) throw new EditorError('locked');
  rs.filter(r => !r.ancestors.some(a => ids.includes(a.id))).reverse().forEach(r => { r.siblings.splice(r.index, 1); r.metas.splice(r.index, 1); });
  return pruneRooms(d);
}
export function duplicate(doc: Document, ids: string[]): Document {
  ids=withOpenings(doc,ids);
  const d = clone(doc), rs = rows(d).filter(r => ids.includes(r.layer.id));
  if (rs.some(r => locked(r) || subtreeLocked(r.layer))) throw new EditorError('locked');
  const groups = new Map<string, string>(),copies=new Map<string,string>();
  const copyMeta = (l: Layer): Layer => {
    if (l.group && !groups.has(l.group)) groups.set(l.group, nanoid());
    const id=nanoid();copies.set(l.id,id);return { ...l, id, group: l.group ? groups.get(l.group) : undefined, children: l.children.map(copyMeta) };
  };
  rs.filter(r => !r.ancestors.some(a => ids.includes(a.id))).reverse().forEach(r => {
    r.siblings.splice(r.index + 1, 0, clone(r.element)); r.metas.splice(r.index + 1, 0, copyMeta(r.layer));
  });
  if(d.drawing){const drawing=d.drawing,objects=new Map<string,string>();for(const w of [...drawing.walls]){const layer=copies.get(drawing.bindings[w.id]);if(layer){const id=nanoid();objects.set(w.id,id);drawing.walls.push({...clone(w),id});drawing.bindings[id]=layer;}}for(const o of [...drawing.openings]){const layer=copies.get(drawing.bindings[o.id]);if(layer){const id=nanoid();drawing.openings.push({...clone(o),id,wallId:objects.get(o.wallId)||o.wallId});drawing.bindings[id]=layer;}}}
  return d;
}
function withOpenings(doc:Document,ids:string[]):string[]{
  const drawing=doc.drawing;if(!drawing)return ids;const all=rows(doc),selected=new Set(all.filter(r=>ids.includes(r.layer.id)||r.ancestors.some(a=>ids.includes(a.id))).map(r=>r.layer.id));
  return [...new Set([...ids,...drawing.openings.filter(o=>selected.has(drawing.bindings[o.wallId])).map(o=>drawing.bindings[o.id])])];
}
export function link(doc: Document, ids: string[], unlink = false): Document {
  const d = clone(doc), rs = rows(d).filter(r => ids.includes(r.layer.id));
  if (rs.some(r => !canMove(r)) || (!unlink && rs.length < 2)) throw new EditorError('cannotLink');
  const group = unlink ? undefined : nanoid(); rs.forEach(r => r.layer.group = group); return d;
}
export function add(doc: Document, type: string, entity = '', parentId?: string): Document {
  const d = clone(doc);
  const e: Config = type === 'conditional' ? { type, conditions: [], elements: [] } : {
    type, ...(entity ? { entity } : {}),
    ...(type === 'image' ? { image: '' } : {}),
    ...(type === 'icon' ? { icon: 'mdi:lightbulb-outline' } : {}),
    style: { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', opacity: 0.5 },
    tap_action: { action: entity.startsWith('light.') ? 'toggle' : 'more-info' },
    hold_action: { action: 'more-info' }, double_tap_action: { action: 'none' },
  };
  if (parentId) {
    const r = find(d, parentId);
    if (locked(r)) throw new EditorError('locked');
    if (r.element.type !== 'conditional') throw new EditorError('invalidConditions');
    r.element.elements.push(e); r.layer.children.push(layersFor([e])[0]);
  } else { d.card.elements.push(e); d.layers.push(layersFor([e])[0]); }
  return d;
}

// A separate preview copy strips actions. Unsupported custom elements are not executed.
export function previewCard(doc: Document, editing: boolean): Config {
  const card = clone(doc.card);
  const clean = (value: any): any => {
    if (Array.isArray(value)) return value.map(clean);
    if (!object(value)) return value;
    return Object.fromEntries(Object.entries(value).filter(([key]) => !['card_mod'].includes(key)).map(([key, v]) => [key, key.endsWith('_action') ? { action: 'none' } : clean(v)]));
  };
  function visit(es: Config[], ls: Layer[]): Config[] {
    return es.flatMap((e, i) => {
      if (editing && ls[i].hidden) return [];
      if (!['image', 'conditional', 'state-icon', 'state-label', 'icon'].includes(e.type)) return [];
      const v = clean(e);
      for (const key of ['tap_action', 'hold_action', 'double_tap_action']) v[key] = { action: 'none' };
      if (e.type === 'conditional') v.elements = visit(e.elements, ls[i].children);
      return [v];
    });
  }
  const safe = clean(card); safe.elements = visit(card.elements, doc.layers);
  safe.tap_action = safe.hold_action = safe.double_tap_action = { action: 'none' };
  return safe;
}
