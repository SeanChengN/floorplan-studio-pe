import { nanoid } from 'nanoid';
import { t } from '../i18n';
import { clone, Document, dump, importCard, importProject, parse, EditorError } from '../picture/model';
import { Workspace } from './types';
import { defaultDrawing, editDrawing, validateDrawing } from './drawing';
import { Project } from '../model/schema';
import { buildPictureElements } from '../export/pictureElements';
import { createRoom, updateRoom } from '../picture/rooms';

export const blankImage='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#253140"/></svg>');
export function blankDocument():Document {const d=importCard(dump({type:'picture-elements',image:blankImage,elements:[]}));d.drawing=defaultDrawing();return d;}
export function newWorkspace(document=blankDocument(),name=t('Untitled project')):Workspace {
  const id=nanoid(),floor=nanoid(),now=Date.now();return{format:'fps-studio-project',version:3,id,name,createdAt:now,updatedAt:now,activeFloorId:floor,floors:[{id:floor,name:t('Floor')+' 1',document}]};
}
export const activeDocument=(p:Workspace)=>p.floors.find(f=>f.id===p.activeFloorId)!.document;
export function withDocument(p:Workspace,d:Document):Workspace {const n=clone(p);n.floors.find(f=>f.id===n.activeFloorId)!.document=d;n.updatedAt=Date.now();return n;}
export function importWorkspace(text:string):Workspace {
  const p=parse(text);
  if(p?.format==='fps-picture-project'){const d=importProject(text);if(d.drawing)validateDrawing(d.drawing);return newWorkspace(d);}
  if(p?.format==='fps-studio-project'){
    if(p.version!==3||typeof p.id!=='string'||typeof p.name!=='string'||!Array.isArray(p.floors)||!p.floors.length||!p.floors.some((f:any)=>f.id===p.activeFloorId))throw new EditorError('invalidProject');
    const ids=new Set<string>();for(const f of p.floors){if(typeof f.id!=='string'||ids.has(f.id)||typeof f.name!=='string')throw new EditorError('invalidProject');ids.add(f.id);f.document=importProject(JSON.stringify(f.document));if(f.document.drawing)validateDrawing(f.document.drawing);}
    return p;
  }
  if(p?.schemaVersion===1&&p.id&&Array.isArray(p.floors)&&p.floors.length)return migrateDrawing(p);
  throw new EditorError('invalidProject');
}
export function migrateDrawing(legacy:Project):Workspace {
  const p=newWorkspace(undefined,legacy.name);p.id='drawing-'+legacy.id;p.legacy=clone(legacy);p.exportWarnings=[];
  p.floors=legacy.floors.map(f=>{
    if(!f.canvas||f.canvas.width<=0||f.canvas.height<=0||!Array.isArray(f.markers)||!Array.isArray(f.rooms))throw new EditorError('invalidProject');
    let d=importCard(buildPictureElements(legacy,f,{image:'embed',imageBaseName:'floor',localDir:'floorplan'}).yaml);
    if(!f.background.dataUri)d.card.image=blankImage;
    d.drawing={...defaultDrawing(),width:f.canvas.width,height:f.canvas.height,grid:legacy.settings.grid,snap:legacy.settings.snapGrid,angles:legacy.settings.snapAngle};
    d=editDrawing(d,x=>{x.walls=clone(f.walls);x.openings=clone(f.openings);});
    for(const r of f.rooms){
      d=createRoom(d,r.polygon.map(v=>({x:v.x/f.canvas.width*100,y:v.y/f.canvas.height*100})),f.canvas.width/f.canvas.height);
      const target=d.rooms[d.rooms.length-1];target.name=r.name;target.areaId=r.areaId;
      d=updateRoom(d,target.id,{fill:r.fill,opacity:r.opacity});
    }
    // Preserve the complete original for its original exporter; flag features the native adapter cannot faithfully express.
    if(f.rooms.some(r=>r.stateRules.length||Object.values(r.actions).some(a=>a.kind!=='none')))p.exportWarnings!.push(`${f.name}: ${t('Legacy room rules or actions')}`);
    if(f.markers.length)p.exportWarnings!.push(`${f.name}: ${t('Legacy marker appearance or actions')}`);
    if(f.background.rotation||f.background.x||f.background.y||f.background.scale!==1||f.background.opacity!==1)p.exportWarnings!.push(`${f.name}: ${t('Legacy background transform')}`);
    if(Object.values(f.layers).some(l=>!l.visible))p.exportWarnings!.push(`${f.name}: ${t('Legacy hidden drawing categories')}`);
    return{id:f.id,name:f.name,document:d};
  });p.activeFloorId=p.floors.some(f=>f.id===legacy.activeFloorId)?legacy.activeFloorId:p.floors[0].id;return p;
}
