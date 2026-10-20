// Run after bundling src/picture/model.ts to .validation/model.cjs.
// Real configurations remain local; output contains counts only.
const fs=require('fs'),assert=require('assert/strict'),m=require('../.validation/model.cjs');
for(const file of process.argv.slice(2)){
 const value=JSON.parse(fs.readFileSync(file,'utf8')),cards=Array.isArray(value)?value:[value];
 for(const card of cards){
  const doc=m.importCard(JSON.stringify(card));assert.deepEqual(m.parse(m.exportCard(doc)),card);
  const rs=m.rows(doc),target=rs.find(r=>r.element.type==='state-icon'&&m.canMove(r));
  const moved=m.move(doc,[target.layer.id],1,-1),expected=structuredClone(card);
  const expectedDoc={...doc,card:expected};
  const targets=m.selectionWithGroups(expectedDoc,[target.layer.id]);
  for(const r of targets){r.element.style.left=Number((parseFloat(r.element.style.left)+1).toFixed(5))+'%';r.element.style.top=Number((parseFloat(r.element.style.top)-1).toFixed(5))+'%';}
  assert.deepEqual(moved.card,expected);
  assert.deepEqual(m.importProject(JSON.stringify(doc)),doc);
  const groups=new Set(rs.map(r=>r.layer.group).filter(Boolean));
  console.log(JSON.stringify({topLevelElements:card.elements.length,totalNodes:rs.length,linkedGroups:groups.size,clippedImages:rs.filter(r=>r.element.style?.['clip-path']).length,roundTrip:true,coordinateOnly:true,linkedElementsMoved:targets.length}));
 }
}
