import assert from 'node:assert/strict';
import path from 'node:path';
// Called inside the ephemeral HA acceptance browser. Never saves credentials or writes dashboards.
export async function nativeTools(page,out,model,card){
 const getDoc=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('floorplan-studio-pe-project-v1')));
 const original=await getDoc(),rs=model.rows(original),imageIndex=rs.findIndex(r=>r.element.type==='image'&&r.element.style?.['clip-path']?.startsWith('polygon('));
 assert.ok(imageIndex>=0);await page.locator('.pe-layer-row').nth(imageIndex).locator('.pe-layer-name').click();await page.locator('.pe-clip-range').waitFor({timeout:15000});
 await page.getByRole('button',{name:'从裁剪创建房间',exact:true}).click();assert.deepEqual((await getDoc()).card,card);
 await page.getByRole('spinbutton',{name:'基础填充 不透明度',exact:true}).fill('0.1');
 await page.getByRole('button',{name:'添加状态效果',exact:true}).click();await page.getByRole('combobox',{name:'控制实体',exact:true}).fill('light.synthetic_acceptance');
 await page.getByRole('spinbutton',{name:'开启填充 不透明度',exact:true}).fill('0.3');await page.getByRole('spinbutton',{name:'关闭填充 不透明度',exact:true}).fill('0.05');await page.getByRole('button',{name:'应用状态设置',exact:true}).click();
 const configured=await getDoc();assert.equal(configured.rooms[0].effects[0].on.opacity,.3);assert.deepEqual(model.parse(model.exportCard(configured)),configured.card);
 await page.locator('floorplan-studio-pe-card').screenshot({path:path.join(out,'native-tools-room.png')});
 await page.getByRole('button',{name:'图层 '+model.rows(configured).length,exact:true}).click();
 const candidates=model.rows(configured).map((r,i)=>({r,i})).filter(({r})=>model.canMove(r)&&['state-icon','state-label'].includes(r.element.type));
 const first=candidates[0],second=candidates.find(({r})=>r.layer.id!==first.r.layer.id&&(!r.layer.group||r.layer.group!==first.r.layer.group));assert.ok(second);
 for(const [index,item]of [first,second].entries())await page.locator('.pe-layer-row').nth(item.i).locator('.pe-layer-name').click({modifiers:index?['Shift']:[]});
 await page.getByText('排列',{exact:true}).click();await page.waitForFunction(()=>!document.querySelector('floorplan-studio-pe-card')?.shadowRoot?.querySelector('.pe-arrange-grid button')?.disabled,{timeout:15000});
 const before=await getDoc();await page.locator('.pe-arrange-grid').first().getByRole('button').first().click();assert.notDeepEqual((await getDoc()).card,before.card);
 await page.waitForFunction(ids=>{const sr=document.querySelector('floorplan-studio-pe-card').shadowRoot,root=sr.querySelector('.pe-measure hui-picture-elements-card').shadowRoot.querySelector('#root');const nodes=[...root.querySelectorAll('[style]')].filter(el=>ids.includes(el.style.getPropertyValue('--fps-pe-id').trim()));return nodes.length===2&&Math.abs(nodes[0].getBoundingClientRect().left-nodes[1].getBoundingClientRect().left)<.5;},[first.r.layer.id,second.r.layer.id]);
 await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual((await getDoc()).card,before.card);await page.getByText('排列',{exact:true}).click();
 // Return the editor to the original imported card so the existing acceptance checks stay isolated.
 await page.getByRole('button',{name:'导入卡片',exact:true}).first().click();await page.getByRole('textbox',{name:'卡片 YAML / JSON',exact:true}).fill(JSON.stringify(card));await page.getByRole('button',{name:'导入',exact:true}).click();
 // Separately render the configured output as a native card with local-only simulated states.
 const summary=await page.evaluate(async config=>{
  const helpers=await window.loadCardHelpers(),ha=document.querySelector('home-assistant').hass;
  const panel=document.createElement('div');panel.id='pe-tools-output';panel.style.cssText='position:fixed;inset:0;z-index:100000;background:#1b2733;pointer-events:none';document.body.append(panel);
  const card=helpers.createCardElement(config);card.setAttribute('inert','');panel.append(card);
  const counts={};const collect=n=>[n,...(n.shadowRoot?collect(n.shadowRoot):[]),...[...n.children||[]].flatMap(collect)];
  for(const state of ['on','off','unknown','unavailable']){
   const states={...ha.states,'light.synthetic_acceptance':{entity_id:'light.synthetic_acceptance',state,attributes:{}}};
   card.hass=new Proxy(ha,{get(target,key){if(key==='states')return states;if(['callService','callApi','callWS','sendWS','connection','auth'].includes(String(key)))return undefined;return Reflect.get(target,key);}});
   for(let i=0;i<5;i++){for(const el of collect(card))if(el.updateComplete)await el.updateComplete;await new Promise(requestAnimationFrame);}
   const images=collect(card).filter(e=>e.style?.opacity&&String(e.tagName).startsWith('HUI-'));
   counts[state]=images.filter(e=>[.3,.05].includes(Number(e.style.opacity))).map(e=>Number(e.style.opacity));
  }
  panel.remove();return counts;
 },configured.card);
 assert.deepEqual(summary.on,[.3]);assert.deepEqual(summary.off,[.05]);assert.deepEqual(summary.unknown,[]);assert.deepEqual(summary.unavailable,[]);
 console.log(JSON.stringify({nativeTools:true,inactiveClipping:true,nativeMeasuredAlignment:true,roomNativeOutput:summary,deviceActions:false}));
}
