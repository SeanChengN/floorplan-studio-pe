import { describe, expect, it } from 'vitest';
import { arrangement, Edge, edges, geometryFor, Measurements, parsePolygon, validPolygon, zoomAt } from './geometry';
import { dump, importCard, rows, setMeta } from './model';
const icon=(left:number,top:number)=>({type:'state-label',entity:'sensor.test',style:{left:left+'%',top:top+'%',transform:'translate(-50%, -50%)'},custom:{keep:true}});
function fixture(){const doc=importCard(dump({type:'picture-elements',image:'/local/demo.png',elements:[icon(20,25),icon(35,55),icon(80,80)]}));const measure:Measurements={};rows(doc).forEach((r,i)=>{const w=[10,20,8][i],h=[8,12,6][i];measure[r.layer.id]=geometryFor({x:parseFloat(r.element.style.left)-w/2,y:parseFloat(r.element.style.top)-h/2,width:w,height:h},undefined,{width:100,height:100});});return{doc,measure,ids:rows(doc).map(r=>r.layer.id)};}
const value=(r:{x:number;y:number;width:number;height:number},e:Edge)=>e==='left'?r.x:e==='centerX'?r.x+r.width/2:e==='right'?r.x+r.width:e==='top'?r.y:e==='centerY'?r.y+r.height/2:r.y+r.height;
describe('measured arrangement',()=>{
  for(const edge of edges)it(`aligns ${edge} using actual sizes and preserves other fields`,()=>{
    const {doc,measure,ids}=fixture(),next=arrangement(doc,ids,measure,edge),axis=['left','centerX','right'].includes(edge)?'left':'top';
    const anchors=rows(next).map((r,i)=>{const old=rows(doc)[i],g=measure[r.layer.id].bounds,d=parseFloat(r.element.style[axis])-parseFloat(old.element.style[axis]);expect(r.element.custom).toEqual(old.element.custom);expect(r.element.style[axis==='left'?'top':'left']).toEqual(old.element.style[axis==='left'?'top':'left']);return value({...g,[axis==='left'?'x':'y']:g[axis==='left'?'x':'y']+d},edge);});
    expect(Math.max(...anchors)-Math.min(...anchors)).toBeLessThan(.00001);
  });
  for(const edge of edges)it(`distributes ${edge} while fixing endpoints`,()=>{
    const {doc,measure,ids}=fixture(),next=arrangement(doc,ids,measure,edge,true),axis=['left','centerX','right'].includes(edge)?'left':'top';
    expect(next.card.elements[0]).toEqual(doc.card.elements[0]);expect(next.card.elements[2]).toEqual(doc.card.elements[2]);
    const anchors=rows(next).map((r,i)=>{const g=measure[r.layer.id].bounds,d=parseFloat(r.element.style[axis])-parseFloat(doc.card.elements[i].style[axis]);return value({...g,[axis==='left'?'x':'y']:g[axis==='left'?'x':'y']+d},edge);});expect(anchors[1]-anchors[0]).toBeCloseTo(anchors[2]-anchors[1],4);
  });
  it('supports a fixed key and a single object on the canvas',()=>{const{doc,measure,ids}=fixture();expect(arrangement(doc,ids,measure,'right',false,{kind:'key',id:ids[1]}).card.elements[1]).toEqual(doc.card.elements[1]);expect(arrangement(doc,[ids[0]],measure,'left',false,{kind:'canvas'}).card.elements[0].style.left).toBe('5%');});
  it('moves linked elements once as one unit and atomically refuses locked/missing measurements',()=>{
    const {doc,measure,ids}=fixture();doc.layers[0].group=doc.layers[1].group='pair';const next=arrangement(doc,[ids[0],ids[1],ids[2]],measure,'left');expect(parseFloat(next.card.elements[0].style.left)-20).toBe(parseFloat(next.card.elements[1].style.left)-35);
    expect(()=>arrangement(doc,ids,measure,'left',true)).toThrow();const original=structuredClone(doc);expect(()=>arrangement(setMeta(doc,ids[1],{locked:true}),ids,measure,'left')).toThrow();expect(()=>arrangement(doc,ids,{},'left')).toThrow();expect(doc).toEqual(original);
  });
});
describe('polygon geometry and cursor zoom',()=>{
  it('converts mixed px/percent clipping to image coordinates',()=>{const ps=parsePolygon('polygon(0px 0%, 50% 0px, 100px 50px)',{x:10,y:20,width:40,height:30},{width:200,height:100});expect(ps).toEqual([{x:10,y:20},{x:30,y:20},{x:30,y:35}]);expect(geometryFor({x:0,y:0,width:100,height:100},'circle(20%)',{width:500,height:500}).precise).toBe(false);});
  it('rejects degenerate and self-crossing polygons including overlapping edges',()=>{expect(validPolygon([{x:1,y:1},{x:90,y:1},{x:90,y:90},{x:1,y:90}])).toBe(true);for(const ps of [[{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}],[{x:0,y:0},{x:10,y:0},{x:20,y:0}],[{x:0,y:0},{x:0,y:0},{x:10,y:10}],[{x:-1,y:0},{x:10,y:0},{x:10,y:10}]])expect(validPolygon(ps)).toBe(false);});
  it('keeps the cursor point fixed and clamps wheel zoom',()=>{const p={x:120,y:-80},pan={x:40,y:12},next=zoomAt(1,pan,p,1.5);expect((p.x-next.pan.x)/next.zoom).toBe((p.x-pan.x));expect((p.y-next.pan.y)/next.zoom).toBe((p.y-pan.y));expect(zoomAt(1,pan,p,100).zoom).toBe(4);expect(zoomAt(1,pan,p,.001).zoom).toBe(.25);});
});
