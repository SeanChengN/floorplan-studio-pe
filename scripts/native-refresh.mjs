import assert from 'node:assert/strict';
/** Reproduce the HA host pushing new state objects without touching editor content. */
export async function nativeRefresh(page) {
  const result=await page.evaluate(async()=>{
    const editor=document.querySelector('floorplan-studio-pe-card'),ha=document.querySelector('home-assistant');
    const cards=[...editor.shadowRoot.querySelectorAll('hui-picture-elements-card')];
    const before=cards.map(c=>c.shadowRoot?.querySelector('#root')?.firstElementChild);
    const original=cards.map(c=>c.setConfig);let resets=0;
    cards.forEach(c=>{const fn=c.setConfig;c.setConfig=function(config){resets++;return fn.call(this,config);};});
    const base=ha.hass;
    try {
      for(let i=0;i<40;i++){
        editor.hass={...base,states:{...base.states,'sensor.fps_refresh_probe':{entity_id:'sensor.fps_refresh_probe',state:String(i),attributes:{}}}};
        await new Promise(r=>setTimeout(r,50));
      }
      return {pushes:40,nativeCards:cards.length,configResets:resets,rootsRetained:cards.every((c,i)=>c.shadowRoot?.querySelector('#root')?.firstElementChild===before[i])};
    }finally{cards.forEach((c,i)=>c.setConfig=original[i]);editor.hass=base;}
  });
  console.log(JSON.stringify({nativeRefresh:result}));
  assert.equal(result.nativeCards,2);assert.equal(result.configResets,0,'Live state pushes must not rebuild native configuration');assert.equal(result.rootsRetained,true);
}
