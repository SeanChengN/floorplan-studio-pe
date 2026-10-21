import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { getHass, HassLike, subscribeHass } from '../ha/hassBridge';
import { t } from '../i18n';
import { add, canMove, clone, Document, dump, duplicate, EditorError, exportCard, hidden, importCard, link, locked, move, parse, position, previewCard, remove, reorder, replaceElement, rows, setMeta } from './model';
import { usePicture } from './store';
import { entityIds, simulatedHass } from './preview';
import { Bounds, NativePreview } from './NativePreview';
import { demoCard } from './demo';
import { Actions, Conditions } from './StructuredFields';
import { Arrangement } from './Arrangement';
import { Measurement } from './Measurement';
import { Measurements, Point, zoomAt } from './geometry';
import { SelectionOverlay } from './SelectionOverlay';
import { RoomCanvas } from './RoomCanvas';
import { RoomInspector } from './RoomPanel';
import { createRoom, roomFromLayer, updateRoom } from './rooms';
import { readRegistry, Registry } from './registry';
import { ProjectControls } from '../workspace/Projects';
import { blankDocument, importWorkspace, newWorkspace } from '../workspace/project';
import { defaultDrawing, editDrawing } from '../workspace/drawing';
import { DrawingCanvas } from '../workspace/DrawingCanvas';
import { DrawingInspector } from '../workspace/DrawingInspector';
import { RoomTree } from '../workspace/RoomTree';
import { StateInspector } from '../workspace/StateInspector';
import { assignState, roomViews, StateView, visibleDocument } from '../workspace/states';
import { Tool } from '../workspace/types';
import { Candidates } from '../workspace/Candidates';
import { loadImageFile } from '../ui/imageLoad';
import { LegacyExport } from '../workspace/LegacyExport';
import { preserveImportedProject } from '../workspace/library';

export function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const button = (label: string, action: () => void, disabled = false) => <button type="button" onClick={action} disabled={disabled}>{t(label)}</button>;

export default function PictureEditor() {
  const state = usePicture(), { doc, selected } = state;
  const [hass, setHass] = useState<HassLike | null>(getHass);
  const [modal, setModal] = useState<'import' | 'export' | 'project' | 'help' | null>(null);
  const [text, setText] = useState(''), [error, setError] = useState('');
  const [editing, setEditing] = useState(true), [simulate, setSimulate] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [newType, setNewType] = useState('state-icon'), [entity, setEntity] = useState('');
  const [inside, setInside] = useState(false), [background, setBackground] = useState(false);
  const [search, setSearch] = useState('');
  const [sidebar,setSidebar]=useState<'layers'|'rooms'>('rooms'),[roomId,setRoomId]=useState('');
  const [drawingRoom,setDrawingRoom]=useState(false),[editRoom,setEditRoom]=useState(false),[showRanges,setShowRanges]=useState(true),[keyId,setKeyId]=useState('');
  const [measure,setMeasure]=useState<Measurements>({});
  const [registry,setRegistry]=useState<Registry>({areas:{},entities:{},devices:{},failed:false});
  const roomBusy=useRef(false),space=useRef(false),imageInput=useRef<HTMLInputElement>(null);
  const [tool,setTool]=useState<Tool>('select'),[stateId,setStateId]=useState('');
  const vectorId=doc?.drawing&&Object.keys(doc.drawing.bindings).find(id=>doc.drawing!.bindings[id]===selected[0]);
  useEffect(()=>{const up=(e:KeyboardEvent)=>{if(e.code==='Space')space.current=false;};window.addEventListener('keyup',up);return()=>window.removeEventListener('keyup',up);},[]);
  useEffect(()=>{setRoomId('');setStateId('');setTool('select');setDrawingRoom(false);setEditRoom(false);setMeasure({});setOverrides({});setSimulate(false);setPan({x:0,y:0});setZoom(1);state.select([]);},[state.project?.id,state.project?.activeFloorId]);
  const all = useMemo(() => doc ? rows(doc) : [], [doc]);
  const active = all.find(r => r.layer.id === selected[0]);
  const [draft, setDraft] = useState(''), [draftError, setDraftError] = useState('');
  const [sourceDirty, setSourceDirty] = useState(false);
  const sourceTarget = useRef('');
  const [tempDoc, setTempDoc] = useState<Document | null>(null);
  const renderDoc = tempDoc || doc;
  const activeRoom=doc?.rooms.find(r=>r.id===roomId);
  useEffect(()=>{if(roomId&&!doc?.rooms.some(r=>r.id===roomId)){setRoomId('');setEditRoom(false);setDrawingRoom(false);}},[doc,roomId]);
  const previewHass = useMemo(() => simulatedHass(hass, simulate ? overrides : {}), [hass, simulate, overrides]);
  const safeCard = useMemo(() => renderDoc ? previewCard(editing?visibleDocument(renderDoc,previewHass?.states||{}):renderDoc, editing) : null, [renderDoc, editing, previewHass]);
  const activeState=activeRoom&&doc?roomViews(doc,activeRoom).find(v=>v.id===stateId):undefined;
  const ids = useMemo(() => doc ? entityIds(doc.card) : [], [doc]);
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(1.5), [imageError, setImageError] = useState(false);
  const drawing=doc?.drawing||{...defaultDrawing(),height:1200/aspect};
  const [stageWidth, setStageWidth] = useState(600);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const drag = useRef<{ doc: Document; ids: string[]; x: number; y: number; width: number; height: number; moved: Document | null } | null>(null);
  const panDrag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  useEffect(() => subscribeHass(setHass), []);
  useEffect(()=>{let alive=true;if(hass)readRegistry(hass).then(r=>{if(alive)setRegistry(r);});return()=>{alive=false;};},[!!hass,hass?.areas,hass?.entities]);
  useEffect(()=>{if(!scroll.current)return;const el=scroll.current;const wheel=(e:WheelEvent)=>{
    e.preventDefault();if(drag.current||roomBusy.current||panDrag.current)return;
    const rect=el.getBoundingClientRect(),delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?rect.height:1);
    const next=zoomAt(zoom,pan,{x:e.clientX-rect.left-rect.width/2,y:e.clientY-rect.top-rect.height/2},Math.exp(-Math.max(-300,Math.min(300,delta))*.002));setZoom(next.zoom);setPan(next.pan);
  };el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[zoom,pan,!!doc]);
  useEffect(() => {
    const image = new Image(); let alive = true; setImageError(false);
    image.onload = () => { if (alive && image.naturalHeight) setAspect(image.naturalWidth / image.naturalHeight); };
    image.onerror = () => { if (alive) setImageError(true); };
    image.src = doc?.card.image || '';
    return () => { alive = false; };
  }, [doc?.card.image]);
  useEffect(() => {
    if (!scroll.current) return;
    const obs = new ResizeObserver(([e]) => setStageWidth(Math.max(240, Math.min(e.contentRect.width - 48, (e.contentRect.height - 48) * aspect))));
    obs.observe(scroll.current); return () => obs.disconnect();
  }, [aspect, !!doc, editing]);
  const run = (fn: () => void) => { try { fn(); setError(''); } catch (e) { setError(message(e)); } };
  const update = (fn: (d: Document) => Document) => {
    if (sourceDirty && !confirm(t('Discard unapplied YAML changes?'))) return;
    if (doc) run(() => { const base=doc.drawing?doc:{...doc,drawing:{...defaultDrawing(),height:1200/aspect}};const next=fn(base); state.set(next); setSourceDirty(false); });
  };
  const history = (redo = false) => {
    if (sourceDirty && !confirm(t('Discard unapplied YAML changes?'))) return;
    setSourceDirty(false); redo ? state.redo() : state.undo();
  };
  function select(ids: string[]) {
    if (sourceDirty && !confirm(t('Discard unapplied YAML changes?'))) return;
    setSourceDirty(false); state.select(ids);setStateId('');setTool('select');setBackground(false);setRoomId('');setEditRoom(false);setDrawingRoom(false);
  }
  useEffect(() => {
    const target = background ? 'background' : active?.layer.id || '';
    if (!sourceDirty || sourceTarget.current !== target) {
      setDraft(active && !background ? dump(active.element) : ''); setDraftError(''); sourceTarget.current = target;
    }
  }, [active?.element, active?.layer.id, background, sourceDirty]);
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => { if (sourceDirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onBeforeUnload); return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [sourceDirty]);
  function key(e: React.KeyboardEvent) {
    if (!editing || e.nativeEvent.isComposing || (e.target instanceof HTMLElement && (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName) || e.target.isContentEditable))) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); history(e.shiftKey); return; }
    if(e.code==='Space'){e.preventDefault();space.current=true;return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();history(true);return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();update(d=>duplicate(d,selected));return;}
    if(!e.ctrlKey&&!e.metaKey&&['v','m','r','w'].includes(e.key.toLowerCase())){e.preventDefault();setDrawingTool(({v:'select',m:'marker',r:'room',w:'wall'} as Record<string,Tool>)[e.key.toLowerCase()]);return;}
    if(drawingRoom||roomId||tool!=='select')return;
    if (e.key==='Delete'&&vectorId){e.preventDefault();update(d=>editDrawing(d,x=>{x.walls=x.walls.filter(w=>w.id!==vectorId);x.openings=x.openings.filter(o=>o.id!==vectorId&&o.wallId!==vectorId);}));return;}
    if(vectorId)return;
    if (e.key === 'Delete' && selected.length) { e.preventDefault(); update(d => remove(d, selected)); return; }
    const delta: Record<string, number[]> = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
    if (delta[e.key] && selected.length) { e.preventDefault(); const step = e.shiftKey ? 1 : 0.1; update(d => move(d, selected, delta[e.key][0]*step, delta[e.key][1]*step)); }
  }
  function showModal(m: typeof modal) { if(m==='export'&&state.project?.exportWarnings?.length){setError(t('Native export blocked by legacy features:')+' '+state.project.exportWarnings.join('; '));return;}setModal(m); setText(m === 'export' && doc ? exportCard(doc) : ''); setError(''); }
  function doImport() {
    run(() => {
      const next = modal === 'project' ? preserveImportedProject(importWorkspace(text)) : newWorkspace(importCard(text),t('Imported card'));
      if (sourceDirty && !confirm(t('Discard unapplied YAML changes?'))) return;
      state.load(next); state.select([]); setSourceDirty(false); setBackground(false);setRoomId('');setDrawingRoom(false);setEditRoom(false);setMeasure({}); setOverrides({}); setModal(null); setZoom(1); setPan({x:0,y:0});
    });
  }
  const name = (r: typeof all[number]) => r.layer.name || r.element.entity || t(r.element.type === 'conditional' ? 'Condition' : r.element.type === 'image' ? 'Image' : r.element.type === 'state-label' ? 'Temperature / state' : 'Icon');
  function field(label: string, value: any, change: (v: string) => void, disabled = false, type = 'text') {
    return <label className="pe-field"><span>{t(label)}</span><input type={type} value={value ?? ''} disabled={disabled} onChange={e => change(e.target.value)} /></label>;
  }
  function prop(key: string, value: string, style = false) {
    if (!active) return;
    const e = clone(active.element);
    if (style) { e.style = { ...e.style }; e.style[key] = key === 'opacity' && value !== '' ? Number(value) : value; }
    else e[key] = value;
    update(d => replaceElement(d, active.layer.id, e));
  }
  function coordinate(axis: 'x' | 'y', value: string) {
    if (!active || !value.trim()) return;
    const p = position(active.element), n = Number(value);
    if (p && Number.isFinite(n)) update(d => move(d, [active.layer.id], axis === 'x' ? n-p.x : 0, axis === 'y' ? n-p.y : 0));
  }
  function endDrag(cancel = false) {
    if (drag.current?.moved && !cancel) state.set(drag.current.moved);
    drag.current = null; panDrag.current = null; setTempDoc(null);
  }
  function chooseRoom(id:string){setStateId('');setTool('select');if(sourceDirty&&!confirm(t('Discard unapplied YAML changes?')))return;setSourceDirty(false);setBackground(false);setRoomId(id);setEditRoom(false);setDrawingRoom(false);}
  function finishRoom(points:Point[]){
    if(!doc)return;
    if(sourceDirty&&!confirm(t('Discard unapplied YAML changes?')))return;
    run(()=>{const next=activeRoom?updateRoom(doc,activeRoom.id,{polygon:points}):createRoom(doc,points,aspect);state.set(next);setSourceDirty(false);setRoomId(activeRoom?.id||next.rooms[next.rooms.length-1].id);setDrawingRoom(false);setEditRoom(true);setSidebar('rooms');});
  }
  function chooseState(id:string,v:StateView){chooseRoom(id);setStateId(v.id);if(v.entity){setSimulate(true);setOverrides(old=>({...old,[v.entity]:v.value}));}}
  function assign(id:string,v:StateView,ids:string[]){
    if(!doc||!ids.length)return;
    const room=doc.rooms.find(r=>r.id===id)!,existing=roomViews(doc,room).find(x=>x.id===v.id);
    const changes=ids.some(id=>!existing?.nodes.includes(id));
    if(changes&&!confirm(t('Apply this display rule to the selected layers?')+'\n'+v.entity+' = '+v.value+'\n'+t('Existing additional conditions remain. Locked layers must be unlocked.')))return;
    update(d=>assignState(d,id,v,ids));
  }
  function setDrawingTool(next:Tool){setTool(next);setRoomId('');setStateId('');setDrawingRoom(next==='room');setEditRoom(false);}
  function mask(fn:(d:Document)=>Document){if(doc)run(()=>state.set(fn(doc),false));}
  async function importBackground(file:File){try{const img=await loadImageFile(file),d=blankDocument();d.card.image=img.dataUri;d.drawing!.width=img.naturalW;d.drawing!.height=img.naturalH;state.load(newWorkspace(d,file.name));}catch(e){setError(message(e));}}
  return <section className="pe-editor" tabIndex={0} onKeyDown={key}>
    <header className="pe-toolbar">
      <ProjectControls onImport={()=>showModal('import')} onImage={()=>imageInput.current?.click()} onError={setError}/>
      <input ref={imageInput} hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f)void importBackground(f);e.target.value='';}}/>
      {button('Import card', () => showModal('import'))}{button('Open project', () => showModal('project'))}
      {button('Save project', () => doc && download('floorplan-project.json', JSON.stringify(state.project, null, 2)), !doc)}
      <span className="pe-divider" />
      {button('Undo', () => history(), !state.past.length)}{button('Redo', () => history(true), !state.future.length)}
      <span className="pe-spacer" />
      {button(editing ? 'Preview' : 'Edit', () => { setEditing(!editing); setTempDoc(null); }, !doc)}
      <button className="fp-primary" onClick={() => showModal('export')} disabled={!doc}>{t('Export card')}</button>
      {button('Help', () => showModal('help'))}
      {state.project?.legacy&&<LegacyExport project={state.project.legacy} onError={setError}/>}
    </header>
    {error && !modal && <div className="pe-error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    {state.storageError && <div className="pe-error">{t('Local save failed. Download your project to keep a backup.')}{state.recovery && button('Download recovery data', () => download('recovery.txt', state.recovery!))}</div>}
    {!doc ? <div className="pe-empty"><span className="pe-empty-icon">▧</span><h1>{t('Floorplan workspace')}</h1><p>{t('Import your picture-elements card to start editing.')}</p><p>{t('Your original lighting images and conditions stay in the exported card.')}</p><div>{button('Blank drawing',()=>state.load(newWorkspace(undefined,t('Untitled project'))))}{button('Import background',()=>imageInput.current?.click())}{button('Import card', () => showModal('import'))}{button('Load demo', () => state.set(importCard(dump(demoCard))))}</div></div> : <>
      <div className={'pe-workspace' + (!editing ? ' pe-preview-only' : '')}>
        {editing && <aside className="pe-layers"><div className="pe-side-tabs"><button className={sidebar==='layers'?'active':''} onClick={()=>setSidebar('layers')}>{t('Stacking order')} {all.length}</button><button className={sidebar==='rooms'?'active':''} onClick={()=>setSidebar('rooms')}>{t('Rooms')} {doc.rooms.length}</button></div>
          <div className="pe-room-create"><button onClick={()=>{if(sourceDirty&&!confirm(t('Discard unapplied YAML changes?')))return;setSourceDirty(false);setRoomId('');setSidebar('rooms');setDrawingRoom(true);}}>{t('Draw room')}</button><button disabled={selected.length!==1||!measure[selected[0]]?.polygon||!measure[selected[0]]?.precise} onClick={()=>{if(sourceDirty&&!confirm(t('Discard unapplied YAML changes?')))return;run(()=>{const next=roomFromLayer(doc,selected[0],measure,aspect);state.set(next);setSourceDirty(false);setRoomId(next.rooms[next.rooms.length-1].id);setSidebar('rooms');});}}>{t('Room from clipping')}</button></div>
          {sidebar==='rooms'?<RoomTree doc={doc} activeRoom={roomId} activeState={stateId} hass={previewHass} simulating={simulate} onRoom={chooseRoom} onState={chooseState} onSelect={select} selected={selected} update={update} mask={mask} onAssign={assign}/>:<>
          <input aria-label={t('Search layers')} placeholder={t('Search layers')} value={search} onChange={e => setSearch(e.target.value)}/>
          <button className={'pe-background ' + (background ? 'active' : '')} onClick={() => { if (sourceDirty && !confirm(t('Discard unapplied YAML changes?'))) return; setSourceDirty(false); setBackground(true);setRoomId('');setEditRoom(false);setDrawingRoom(false); state.select([]); }}>{doc.backgroundLocked ? '🔒 ' : ''}{t('Background')}</button>
          <div className="pe-layer-list">
          {all.filter(r => !search || `${name(r)} ${r.element.type}`.toLowerCase().includes(search.toLowerCase())).map(r => <div key={r.layer.id} className={'pe-layer-row ' + (selected.includes(r.layer.id) ? 'selected ' : '') + (hidden(r) ? 'muted' : '')} style={{ paddingLeft: 8 + r.depth*14 }}>
            <button className="pe-layer-name" onClick={e => select(e.shiftKey ? selected.includes(r.layer.id) ? selected.filter(id => id !== r.layer.id) : [...selected, r.layer.id] : [r.layer.id])} title={r.element.type}>{r.element.type === 'conditional' ? '▾ ' : r.element.type === 'image' ? '▧ ' : '◉ '}{name(r)}{r.layer.group ? ' ↔' : ''}</button>
            <button title={t(r.layer.hidden ? 'Show' : 'Hide temporarily')} aria-label={t(r.layer.hidden ? 'Show' : 'Hide temporarily')} onClick={() => mask(d => setMeta(d, r.layer.id, { hidden: !r.layer.hidden }))}>{r.layer.hidden ? '○' : '●'}</button>
            <button title={t(r.layer.locked ? 'Unlock' : 'Lock')} aria-label={t(r.layer.locked ? 'Unlock' : 'Lock')} onClick={() => update(d => setMeta(d, r.layer.id, { locked: !r.layer.locked }))}>{locked(r) ? '🔒' : '◇'}</button>
          </div>)}
          </div>
          <div className="pe-layer-tools">{button('Move earlier', () => active && update(d => reorder(d, active.layer.id, -1)), !active || locked(active))}{button('Move later', () => active && update(d => reorder(d, active.layer.id, 1)), !active || locked(active))}
          {button('Duplicate', () => update(d => duplicate(d, selected)), !selected.length)}{button('Delete', () => update(d => remove(d, selected)), !selected.length)}
          {button('Link movement', () => update(d => link(d, selected)), selected.length < 2)}{button('Unlink movement', () => update(d => link(d, selected, true)), !selected.length)}</div>
          <p className="pe-note">{t('Reordering changes image overlap. Conditional groups move together.')}</p>
          </>}
        </aside>}
        <main className="pe-canvas-column">
          {editing&&<div className="ws-tool-strip" role="toolbar" aria-label={t('Drawing tools')}>
            {(['select','marker','room','wall','door','window'] as Tool[]).map(x=><button key={x} className={tool===x?'active':''} onClick={()=>setDrawingTool(x)}>{t({select:'Select',marker:'Entity',room:'Room',wall:'Wall',door:'Door',window:'Window'}[x])}</button>)}
            <label className="pe-check"><input type="checkbox" checked={drawing.showGrid} onChange={e=>update(d=>({...d,drawing:{...drawing,showGrid:e.target.checked}}))}/>{t('Grid')}</label>
            <label className="pe-check"><input type="checkbox" checked={drawing.snap} onChange={e=>update(d=>({...d,drawing:{...drawing,snap:e.target.checked}}))}/>{t('Snap to grid')}</label>
            <label className="pe-check"><input type="checkbox" checked={drawing.angles} onChange={e=>update(d=>({...d,drawing:{...drawing,angles:e.target.checked}}))}/>{t('Angle snap')}</label>
          </div>}
          <div className="pe-view-tools"><select aria-label={t('Live states')} value={simulate ? 'sim' : 'live'} onChange={e => setSimulate(e.target.value === 'sim')}><option value="live">{t('Live states')}</option><option value="sim">{t('Simulated states')}</option></select>
            {editing&&<><Arrangement doc={doc} selected={roomId||vectorId?[]:selected} measure={measure} update={update} onKey={setKeyId}/><label className="pe-check"><input type="checkbox" checked={showRanges} onChange={e=>setShowRanges(e.target.checked)}/>{t('Show selected ranges')}</label></>}
            <span className="pe-spacer"/>{button('−', () => setZoom(z => Math.max(.25,z-.25)))}<span>{Math.round(zoom*100)}%</span>{button('+', () => setZoom(z => Math.min(4,z+.25)))}{button('Fit', () => {setZoom(1);setPan({x:0,y:0});})}
          </div>
          {simulate && <div className="pe-simulation">{button('All off', () => setOverrides(Object.fromEntries(ids.filter(id => id.startsWith('light.')).map(id => [id,'off']))))}{button('All on', () => setOverrides(Object.fromEntries(ids.filter(id => id.startsWith('light.')).map(id => [id,'on']))))}{button('Return to live', () => {setOverrides({});setSimulate(false);})}<strong>{t('Simulating')}</strong>
            <details><summary>{t('Entity states')}</summary>{ids.map(id => <label key={id}>{id}<input list="pe-states" value={overrides[id] ?? hass?.states[id]?.state ?? ''} onChange={e => setOverrides({...overrides,[id]:e.target.value})}/></label>)}</details><datalist id="pe-states">{['on','off','unknown','unavailable','cool','heat'].map(s => <option key={s} value={s}/>)}</datalist>
          </div>}
          <div className="pe-scroll" ref={scroll} onContextMenu={e => e.preventDefault()}
            onPointerDownCapture={e => { if (e.button === 1 || e.button===0&&space.current) { e.preventDefault();e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); panDrag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y}; } }}
            onPointerMove={e => {
              if (panDrag.current) { const p=panDrag.current; setPan({x:p.px+e.clientX-p.x,y:p.py+e.clientY-p.y}); }
              if (drag.current) { const d=drag.current; try { const next=move(d.doc,d.ids,(e.clientX-d.x)/d.width*100,(e.clientY-d.y)/d.height*100); d.moved=next; setTempDoc(next); } catch (err) {setError(message(err));} }
            }} onPointerUp={() => endDrag()} onPointerCancel={() => endDrag(true)}>
            <div className="pe-stage" ref={stage} style={{ width: stageWidth, height: stageWidth/aspect, transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})` }}>
              {safeCard && <NativePreview card={safeCard} hass={previewHass} onBounds={b=>setBounds(old=>JSON.stringify(old)===JSON.stringify(b)?old:b)}/>}<div className="pe-glass" />
              {editing&&renderDoc&&<><Measurement doc={renderDoc} hass={previewHass} onMeasure={setMeasure}/>{showRanges&&<SelectionOverlay doc={renderDoc} selected={selected} measure={measure} bounds={bounds} keyId={keyId} background={background}/>}</>}
              {editing&&!drawingRoom&&!editRoom&&<DrawingCanvas key={tool+state.project?.activeFloorId} doc={doc.drawing?doc:{...doc,drawing}} bounds={bounds} displayWidth={stageWidth*zoom*(bounds?.width||1)} tool={tool} selected={selected} onSelect={select} onRoom={chooseRoom} update={update} onBusy={b=>{roomBusy.current=b;}} onDone={()=>setDrawingTool('select')} onMarker={p=>update(d=>{const n=add(d,newType==='conditional'?'state-icon':newType,entity);const el=n.card.elements[n.card.elements.length-1];el.style.left=p.x+'%';el.style.top=p.y+'%';return n;})}/>}
              {editing && tool==='select' && !drawingRoom && !editRoom && (renderDoc ? rows(renderDoc) : []).filter(r => r.element.type !== 'conditional' && !hidden(r)).map(r => {
                const p=position(r.element); if (!p||Object.values(doc.drawing?.bindings||{}).includes(r.layer.id)) return null;
                const isSelected=selected.includes(r.layer.id);
                if (r.element.type === 'image' && !isSelected) return null;
                return <button key={r.layer.id} className={'pe-handle '+(isSelected?'selected ':'')+(locked(r)?'locked':'')} title={`${name(r)}${!canMove(r)?' · '+t('Complex position: edit coordinates in YAML.'):''}`} aria-label={name(r)} style={{ left:`${(bounds?.left||0)*100+p.x*(bounds?.width||1)}%`,top:`${(bounds?.top||0)*100+p.y*(bounds?.height||1)}%` } as CSSProperties}
                  onPointerDown={e => {
                    if(e.button!==0) return; e.preventDefault(); e.stopPropagation();
                    (e.currentTarget.closest('.pe-editor') as HTMLElement)?.focus();
                    if(sourceDirty && !confirm(t('Discard unapplied YAML changes?'))) return;
                    setSourceDirty(false); setBackground(false);setRoomId('');setEditRoom(false);
                    const ids=e.shiftKey ? selected.includes(r.layer.id)?selected.filter(id=>id!==r.layer.id):[...selected,r.layer.id] : selected.includes(r.layer.id)?selected:[r.layer.id];
                    state.select(ids);
                    if(canMove(r) && doc && stage.current && ids.includes(r.layer.id)) { const rect=stage.current.getBoundingClientRect(); e.currentTarget.setPointerCapture(e.pointerId); drag.current={doc,ids,x:e.clientX,y:e.clientY,width:rect.width*(bounds?.width||1),height:rect.height*(bounds?.height||1),moved:null}; }
                  }}><span>{locked(r)?'◇':'+'}</span></button>;
              })}
              {editing&&(drawingRoom||editRoom||showRanges&&activeRoom)&&<RoomCanvas key={`${drawingRoom}:${roomId}`} room={activeRoom} settings={drawing} displayWidth={stageWidth*zoom*(bounds?.width||1)} displayHeight={stageWidth/aspect*zoom*(bounds?.height||1)} bounds={bounds} drawing={drawingRoom} editing={editRoom} onCreate={finishRoom} onChange={polygon=>activeRoom&&update(d=>updateRoom(d,activeRoom.id,{polygon}))} onCancel={()=>{setDrawingRoom(false);setEditRoom(false);setTool('select');}} onBusy={b=>{roomBusy.current=b;}}/>}
            </div>
          </div>
          <footer className="pe-status"><span>{t(hass ? 'Native HA preview' : 'Layout preview only — open in HA to verify rendering.')}</span><span>{editing?t('Drag to move · Shift-click to select more · Middle-drag to pan'):t('Preview never controls devices.')}</span></footer>
          {imageError && <p className="pe-error">{t('Image could not be loaded. Check its URL and permissions.')}</p>}
        </main>
        {editing && <aside className="pe-inspector"><h2>{t('Properties')}</h2>
          {activeRoom&&!activeState&&<Candidates key={activeRoom.id} doc={doc} room={activeRoom} registry={registry} measure={measure} update={update}/>}
          {activeState&&activeRoom?<StateInspector key={roomId+stateId} doc={doc} room={activeRoom} view={activeState} hass={previewHass} selected={selected} update={update} onLayer={id=>select([id])} onAssign={ids=>assign(roomId,activeState,ids)}/>:vectorId?<DrawingInspector doc={doc} id={vectorId} update={update}/>:activeRoom?<RoomInspector doc={doc} room={activeRoom} registry={registry} selected={selected} update={update} onDraw={()=>setDrawingRoom(true)} onEdit={()=>setEditRoom(!editRoom)} editing={editRoom} onLayer={id=>select([id])} entityIds={Object.keys(hass?.states||{})}/>:background ? <>{button(doc.backgroundLocked?'Unlock':'Lock',()=>update(d=>({...d,backgroundLocked:!d.backgroundLocked})))}{field('Image URL',doc.card.image,v=>update(d=>({...d,card:{...d.card,image:v}})),doc.backgroundLocked)}</> : active ? <>
            {field('Name',active.layer.name,v=>update(d=>setMeta(d,active.layer.id,{name:v})))}
            <p className="pe-note">{active.element.type}{active.layer.group?' · '+t('Linked'):''}{selected.length>1?' · '+selected.length+' '+t('Selected'):''}</p>
            {measure[active.layer.id]&&!measure[active.layer.id].precise&&<p className="pe-note">{t('Exact clipping outline is unavailable; arrangement is disabled.')}</p>}
            {locked(active) && <p className="pe-note">{t('Locked layers must be unlocked before changing their contents.')}</p>}
            {hidden(active)&&<p className="pe-note">{t('Temporarily hidden; selected range is still shown.')}</p>}
            {active.element.type==='conditional' && <Conditions value={active.element.conditions} disabled={locked(active)} apply={conditions=>update(d=>replaceElement(d,active.layer.id,{...active.element,conditions}))}/>}
            {active.element.type!=='conditional' && <>
              {field('Entity',active.element.entity,v=>prop('entity',v),locked(active))}
              <div className="pe-two">{field('Left (%)',position(active.element)?.x,v=>coordinate('x',v),!canMove(active),'number')}{field('Top (%)',position(active.element)?.y,v=>coordinate('y',v),!canMove(active),'number')}</div>
              {!canMove(active) && !locked(active) && <p className="pe-note">{t('Complex position: edit coordinates in YAML.')}</p>}
              {field('Opacity',active.element.style?.opacity,v=>prop('opacity',v,true),locked(active),'number')}
              {active.element.type==='image' ? <>{field('Image URL',active.element.image,v=>prop('image',v),locked(active))}{field('Clipping (clip-path)',active.element.style?.['clip-path'],v=>prop('clip-path',v,true),locked(active))}{field('Width',active.element.style?.width,v=>prop('width',v,true),locked(active))}</> : <>{field('Icon name',active.element.icon,v=>prop('icon',v),locked(active))}{field('Color',active.element.style?.color,v=>prop('color',v,true),locked(active))}{field('Font size',active.element.style?.['font-size'],v=>prop('font-size',v,true),locked(active))}</>}
            </>}
            {active.element.type!=='conditional' && <Actions value={active.element} disabled={locked(active)} apply={(key,action)=>update(d=>replaceElement(d,active.layer.id,{...active.element,[key]:action}))}/>}
            <label className="pe-field"><span>{t('Raw YAML')}</span><textarea spellCheck={false} value={draft} onChange={e=>{setDraft(e.target.value);setSourceDirty(true);}} rows={14} disabled={locked(active)}/></label>
            <button disabled={locked(active)||!sourceDirty} onClick={()=>{try {const next=replaceElement(doc,active.layer.id,parse(draft));state.set(next);setSourceDirty(false);setDraftError('');}catch(e){setDraftError(message(e));}}}>{t('Apply YAML')}</button>
            {draftError && <p className="pe-error" role="alert">{draftError}</p>}
          </> : <p className="pe-note">{t('Select a layer to edit its properties.')}</p>}
          <section className="pe-add"><h2>{t('Add element')}</h2><label className="pe-field"><span>{t('Type')}</span><select value={newType} onChange={e=>setNewType(e.target.value)}>{[['state-icon','Icon'],['state-label','Temperature / state'],['image','Image'],['conditional','Condition'],['icon','Static icon']].map(([v,label])=><option key={v} value={v}>{t(label)}</option>)}</select></label>
            <label className="pe-field"><span>{t('Entity')}</span><input list="pe-entities" value={entity} onChange={e=>setEntity(e.target.value)} placeholder="light.example"/></label>
            <datalist id="pe-entities">{Object.entries(hass?.states||{}).map(([id,s])=><option key={id} value={id}>{s.attributes.friendly_name||id}</option>)}</datalist>
            {active?.element.type==='conditional' && <label><input type="checkbox" checked={inside} onChange={e=>setInside(e.target.checked)}/>{t('Add inside selected condition')}</label>}
            {button('Add element',()=>update(d=>add(d,newType,entity,inside && active?.element.type==='conditional'?active.layer.id:undefined)))}
          </section>
        </aside>}
      </div>
      <div className="pe-footnote">{t('Preview never controls devices.')} {t('Unsupported elements are preserved in export; omitted from safe preview.')} <span>{!state.storageError && t('Saved locally')}</span></div>
    </>}
    {modal && <div className="pe-modal-shade"><div className="pe-modal" role="dialog" aria-modal="true" aria-label={t(modal==='help'?'Help':modal==='export'?'Export card':modal==='project'?'Open project':'Import card')}>
      <h2>{t(modal==='help'?'Help':modal==='export'?'Export card':modal==='project'?'Open project':'Import card')}</h2>
      {modal==='help' ? <><p>{t('Drag to move · Shift-click to select more · Middle-drag to pan')}</p><p>{t('Select matching icons and link movement to move them together.')}</p><p>{t('Reordering changes image overlap. Conditional groups move together.')}</p><p>{t('Export includes temporarily hidden layers. Editor locks and names are excluded.')}</p><p>{t('Preview never controls devices.')}</p></> : <>
        <p>{t(modal==='export'?'Export includes temporarily hidden layers. Editor locks and names are excluded.':'Import opens a separate project; existing projects remain in the library.')}</p>
        {modal!=='export' && <label>{t('Select a file')}<input type="file" accept=".yaml,.yml,.json" onChange={e=>{const f=e.target.files?.[0];if(f) f.text().then(setText).catch(err=>setError(message(err)));}}/></label>}
        <textarea aria-label={t(modal==='project'?'Project JSON':'Card YAML / JSON')} spellCheck={false} value={text} onChange={e=>setText(e.target.value)} readOnly={modal==='export'} rows={18}/>
      </>}
      {error && <p className="pe-error" role="alert">{error}</p>}
      <div className="pe-modal-actions">{button('Close',()=>setModal(null))}{modal==='export'?<>{button('Download',()=>download('picture-elements.yaml',text))}{button('Copy',()=>{navigator.clipboard.writeText(text).then(()=>setError(t('Copied'))).catch(e=>setError(message(e)));})}</>:modal!=='help' && button('Import',doImport)}</div>
    </div></div>}
  </section>;
}
function message(e: unknown) {
  if(e instanceof EditorError) return t(e.key);
  return `${t('Operation failed')}: ${e instanceof Error ? e.message : String(e)}`;
}
