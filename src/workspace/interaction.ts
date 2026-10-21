import { Point } from '../model/schema';
import { snapAngle, snapPoint } from '../canvas/geometry';

/** Shared by room, wall, opening and selection tools; independent of project storage. */
export function pointerPoint(client:Point,rect:{left:number;top:number;width:number;height:number},size:{width:number;height:number},grid=0):Point {
  const p={x:(client.x-rect.left)/rect.width*size.width,y:(client.y-rect.top)/rect.height*size.height};
  return grid>0?snapPoint(p,grid):p;
}
export function nextSegment(points:Point[],p:Point,angleSnap:boolean):Point {
  return points.length&&angleSnap?snapAngle(points[points.length-1],p):p;
}
