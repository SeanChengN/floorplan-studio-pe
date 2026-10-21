import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd();
const browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL || 'msedge'});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-CN'});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://studio.test/**',async route=>{
  const url=new URL(route.request().url());
  const relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  const file=path.resolve(root,'dist',relative);
  if(!file.startsWith(path.join(root,'dist')+path.sep)){await route.abort();return;}
  try{await route.fulfill({body:await fs.readFile(file),contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});}catch{await route.fulfill({status:404,body:'Not found'});}
});
try{
 await page.goto('http://studio.test/');
 await page.getByRole('button',{name:'载入示例',exact:true}).click();
 await page.locator('.pe-handle').first().waitFor();
 await page.screenshot({path:path.join(root,'.validation','desktop.png')});
 const getDoc=()=>page.evaluate(()=>(()=>{const l=JSON.parse(localStorage.getItem('floorplan-studio-library-v3')),p=l.projects.find(p=>p.id===l.activeId);return p.floors.find(f=>f.id===p.activeFloorId).document;})());
 const original=await getDoc();
 const handle=page.locator('.pe-handle').first(),box=await handle.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+50,box.y+box.height/2+25,{steps:5});await page.mouse.up();
 const moved=await getDoc();assert.notEqual(moved.card.elements[0].style.left,original.card.elements[0].style.left);
 assert.deepEqual(moved.card.elements[0].tap_action,original.card.elements[0].tap_action);
 await page.getByRole('button',{name:'撤销',exact:true}).click();assert.deepEqual((await getDoc()).card,original.card);
 await page.getByRole('button',{name:'重做',exact:true}).click();assert.deepEqual((await getDoc()).card,moved.card);
 await page.getByRole('button',{name:'导出卡片',exact:true}).click();
 assert.match(await page.getByRole('textbox',{name:'卡片 YAML / JSON',exact:true}).inputValue(),/type: picture-elements/);
 await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.getByRole('button',{name:'导入卡片',exact:true}).click();
 await page.getByRole('textbox',{name:'卡片 YAML / JSON',exact:true}).fill('type: broken');
 await page.getByRole('button',{name:'导入',exact:true}).click();assert.deepEqual((await getDoc()).card,moved.card);
 await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'关闭',exact:true}).click();
 await page.reload();assert.deepEqual((await getDoc()).card,moved.card);
 await page.getByRole('combobox',{name:'Language / 语言'}).selectOption('en');
 await page.getByRole('button',{name:'Projects',exact:true}).waitFor();
 await page.getByRole('combobox',{name:'Language / 语言'}).selectOption('zh-Hans');
 await page.getByRole('button',{name:'项目',exact:true}).waitFor();
 await page.screenshot({path:path.join(root,'.validation','drawing-zh.png')});
 await page.getByRole('button',{name:'预览',exact:true}).click();
 for(const width of [360,390,430]){await page.setViewportSize({width,height:844});await page.screenshot({path:path.join(root,'.validation',`preview-${width}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['Chinese/English switch','unified drawing workspace','drag coordinates','undo/redo','export','invalid import preserves document','reload persistence','360/390/430 layout'],pageErrors:errors},null,2));
}finally{await browser.close();}
