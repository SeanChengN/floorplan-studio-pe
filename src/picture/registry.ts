import { HassLike } from '../ha/hassBridge';
export interface Registry { areas:Record<string,{name:string}>; entities:Record<string,{area_id?:string|null;device_id?:string|null}>; devices:Record<string,{area_id?:string|null}>; failed:boolean }
export function areaFor(reg:Registry,id:string){const e=reg.entities[id];return e?.area_id||(e?.device_id?reg.devices[e.device_id]?.area_id:undefined)||undefined;}
export async function readRegistry(hass:HassLike):Promise<Registry>{
  const h=hass as HassLike & {devices?:Registry['devices'];callWS?:(m:{type:string})=>Promise<any[]>};
  const result:Registry={areas:hass.areas||{},entities:hass.entities||{},devices:h.devices||{},failed:false};
  if(!h.callWS)return result;
  const requests=[['areas','config/area_registry/list','area_id'],['entities','config/entity_registry/list','entity_id'],['devices','config/device_registry/list','id']] as const;
  for(const [key,type,idKey] of requests){if(h[key])continue;try{const list=await h.callWS({type});result[key]=Object.fromEntries(list.map(x=>[x[idKey],x]));}catch{result.failed=true;}}
  return result;
}
