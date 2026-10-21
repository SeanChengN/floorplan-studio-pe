// Local-only acceptance harness. Supply HA_URL / HA_TOKEN in the process environment.
// Never saves credentials, full state registries, or complete dashboards.
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const base=process.env.HA_URL, token=process.env.HA_TOKEN;
if(!base||!token)throw new Error('HA_URL and HA_TOKEN are required');
const out=path.join(process.cwd(),'.validation');await fs.mkdir(out,{recursive:true});
const ws=new WebSocket(base.replace(/^http/,'ws')+'/api/websocket');
let serial=0;const pending=new Map();
await new Promise((resolve,reject)=>{
 const timer=setTimeout(()=>{ws.close();reject(new Error('HA read timed out'));},15000);
 ws.onerror=()=>{clearTimeout(timer);reject(new Error('HA socket failed'));};
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='auth_required')ws.send(JSON.stringify({type:'auth',access_token:token}));if(m.type==='auth_invalid'){clearTimeout(timer);reject(new Error('HA authentication rejected'));}if(m.type==='auth_ok'){clearTimeout(timer);resolve();}if(m.id&&pending.has(m.id)){const {resolve,reject,timer}=pending.get(m.id);pending.delete(m.id);clearTimeout(timer);m.success?resolve(m.result):reject(new Error('HA read failed'));}};
});
const read=data=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(new Error('HA read timed out'));},15000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,...data}));});
let cards=[];
try{
 const dashboards=process.env.HA_DASHBOARD?[{url_path:process.env.HA_DASHBOARD}]:await read({type:'lovelace/dashboards/list'});
 for(const dashboard of dashboards){
  let config;try{config=await read({type:'lovelace/config',url_path:dashboard.url_path});}catch{continue;}
  for(const view of config.views||[]){if(process.env.HA_VIEW&&view.path!==process.env.HA_VIEW)continue;const found=[];const visit=v=>{if(!v||typeof v!=='object')return;if(v.type==='picture-elements')found.push(v);Object.values(v).forEach(visit);};visit(view);cards.push(...found);}
 }
 cards.sort((a,b)=>b.elements.length-a.elements.length);if(!cards.length)throw new Error('No picture-elements card found');cards=[cards[0]];
}finally{ws.close();}
await fs.writeFile(path.join(out,'live-cards.json'),JSON.stringify(cards),'utf8');
console.log(JSON.stringify({liveRead:true,cards:cards.length,topLevelCounts:cards.map(c=>c.elements.length)}));
if(process.env.HA_BROWSER!=='1')process.exit(0);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
 const context=await browser.newContext({viewport:{width:1600,height:1000},locale:'zh-CN'});
 await context.addInitScript(({base,token})=>localStorage.setItem('hassTokens',JSON.stringify({hassUrl:base,access_token:token,token_type:'Bearer',expires_in:86400,expires:Date.now()+86400000,clientId:base+'/',refresh_token:''})),{base,token});
 const page=await context.newPage();
 const prohibited=[];
 page.on('websocket',socket=>socket.on('framesent',event=>{
  try {const data=JSON.parse(String(event.payload));if(['call_service','lovelace/config/save','lovelace/resources/create','lovelace/resources/update'].includes(data.type))prohibited.push(data.type);}catch{ /* protocol control frame */ }
 }));
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>!!document.querySelector('home-assistant')?.hass,{timeout:30000});
 await page.addScriptTag({path:path.join(process.cwd(),'dist-hacs/floorplan-studio-pe.js'),type:'module'});
 await page.waitForFunction(()=>!!customElements.get('floorplan-studio-pe-card'));
 await page.evaluate(()=>{
  const ha=document.querySelector('home-assistant');const editor=document.createElement('floorplan-studio-pe-card');
  editor.style.cssText='position:fixed;inset:0;z-index:99999;background:#141b24';editor.setConfig({height:'100vh'});editor.hass=ha.hass;document.body.append(editor);
 });
 await page.getByRole('button',{name:'导入卡片',exact:true}).first().click();
 await page.getByRole('textbox',{name:'卡片 YAML / JSON',exact:true}).fill(JSON.stringify(cards[0]));
 await page.getByRole('button',{name:'导入',exact:true}).click();
 await page.locator('.pe-stage > .pe-native hui-picture-elements-card').waitFor({timeout:20000});
 await page.waitForFunction(()=>document.querySelector('floorplan-studio-pe-card')?.shadowRoot?.querySelector('hui-picture-elements-card')?.shadowRoot?.querySelector('#root')?.getBoundingClientRect().height>100);
 const model=require('../.validation/model.cjs');
 let current=await page.evaluate(()=>(()=>{const l=JSON.parse(localStorage.getItem('floorplan-studio-library-v3')),p=l.projects.find(p=>p.id===l.activeId);return p.floors.find(f=>f.id===p.activeFloorId).document;})());
 assert.deepEqual(current.card,cards[0]);
 if(process.env.HA_TOOLS==='1'){const {nativeTools}=await import('./native-tools.mjs');await nativeTools(page,out,model,cards[0]);current=await page.evaluate(()=>(()=>{const l=JSON.parse(localStorage.getItem('floorplan-studio-library-v3')),p=l.projects.find(p=>p.id===l.activeId);return p.floors.find(f=>f.id===p.activeFloorId).document;})());}
 const target=model.rows(current).find(r=>r.element.type==='state-icon'&&model.canMove(r));
 const handle=page.locator('.pe-handle').filter({hasText:'+'});
 const node=page.getByRole('button',{name:target.element.entity,exact:true}).filter({hasText:'+'}).first();
 await node.waitFor();
 const rect=await node.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.mouse.move(rect.x+rect.width/2+40,rect.y+rect.height/2+20,{steps:6});await page.mouse.up();
 const moved=await page.evaluate(()=>(()=>{const l=JSON.parse(localStorage.getItem('floorplan-studio-library-v3')),p=l.projects.find(p=>p.id===l.activeId);return p.floors.find(f=>f.id===p.activeFloorId).document;})());
 assert.notDeepEqual(moved.card,current.card);
 const movedRow=model.rows(moved).find(r=>r.layer.id===target.layer.id);
 const dx=parseFloat(movedRow.element.style.left)-parseFloat(target.element.style.left),dy=parseFloat(movedRow.element.style.top)-parseFloat(target.element.style.top);
 assert.deepEqual(moved.card,model.move(current,[target.layer.id],dx,dy).card);
 await page.getByRole('button',{name:'撤销',exact:true}).click();
 assert.deepEqual((await page.evaluate(()=>(()=>{const l=JSON.parse(localStorage.getItem('floorplan-studio-library-v3')),p=l.projects.find(p=>p.id===l.activeId);return p.floors.find(f=>f.id===p.activeFloorId).document;})())).card,cards[0]);
 console.log(JSON.stringify({nativeDrag:true,coordinateOnly:true,undo:true,handles:await handle.count()}));
 const settle=()=>page.evaluate(async()=>{
   const root=document.querySelector('floorplan-studio-pe-card');
   const collect=(n)=>[n,...[...n.querySelectorAll('*')].flatMap(e=>e.shadowRoot?collect(e.shadowRoot):[e])];
   for(let i=0;i<4;i++){for(const e of collect(root.shadowRoot))if(e.updateComplete)await e.updateComplete;await new Promise(requestAnimationFrame);}
   await Promise.all(collect(root.shadowRoot).filter(e=>e.tagName==='IMG'&&!e.complete).map(e=>Promise.race([new Promise(r=>{e.addEventListener('load',r,{once:true});e.addEventListener('error',r,{once:true});}),new Promise(r=>setTimeout(r,5000))])));
 });
 await settle();
 await page.locator('floorplan-studio-pe-card').screenshot({path:path.join(out,'ha-editor.png')});
 console.log(JSON.stringify({nativeEditorMounted:true,haVersion:await page.evaluate(()=>document.querySelector('home-assistant').hass.config.version)}));
 // Same native preview and same imported configuration, with local-only state overrides.
 await page.getByRole('combobox',{name:'实时状态',exact:true}).selectOption('sim');
 await page.getByRole('button',{name:'全部关闭',exact:true}).click();
 await settle();await page.locator('floorplan-studio-pe-card').screenshot({path:path.join(out,'ha-all-off.png')});
 await page.getByRole('button',{name:'全部开启',exact:true}).click();
 await settle();await page.locator('floorplan-studio-pe-card').screenshot({path:path.join(out,'ha-all-on.png')});
 await page.getByRole('button',{name:'预览',exact:true}).click();
 for(const width of [360,390,430]){await page.setViewportSize({width,height:844});await settle();await page.locator('floorplan-studio-pe-card').screenshot({path:path.join(out,`ha-preview-${width}.png`)});}
 // Render the exported configuration directly with HA, outside the editor.
 await page.evaluate(async card=>{
  document.querySelector('floorplan-studio-pe-card').style.display='none';
  const helpers=await window.loadCardHelpers();const native=helpers.createCardElement(card);native.hass=document.querySelector('home-assistant').hass;
  const panel=document.createElement('div');panel.id='pe-export-acceptance';panel.style.cssText='position:fixed;inset:0;z-index:99999;background:#1e2230;pointer-events:none';panel.append(native);document.body.append(panel);
 },model.parse(model.exportCard(current)));
 for(const width of [360,390,430]){
  await page.setViewportSize({width,height:844});
  await page.waitForFunction(()=>document.querySelector('#pe-export-acceptance hui-picture-elements-card')?.shadowRoot?.querySelector('#root')?.getBoundingClientRect().width>300);
  await page.evaluate(async()=>{const el=document.querySelector('#pe-export-acceptance hui-picture-elements-card');await el.updateComplete;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);});
  await page.locator('#pe-export-acceptance').screenshot({path:path.join(out,`ha-exported-${width}.png`)});
 }
 if(prohibited.length)throw new Error('Unexpected write operation in preview');
 console.log(JSON.stringify({nativePreview:true,exportedNativeCard:true,widths:[360,390,430],productionWrites:false,deviceCalls:0}));
}finally{await browser.close();}
