export interface RoomPoint { x:number; y:number }
export interface Branch { color:string; opacity:number; wrappers:string[]; fillId?:string }
export interface Effect { id:string; name:string; entity:string; onStates:string[]; offStates:string[]; on:Branch; off:Branch }
export interface Room { id:string; name:string; areaId?:string; polygon:RoomPoint[]; aspect:number; fill:string; opacity:number; members:string[]; clipLayers:string[]; baseId?:string; effects:Effect[] }
