import { useState } from 'react';
import App from './App';
import PictureEditor from './picture/Editor';
import { Language, setLanguage, t, useLanguage } from './i18n';
export default function Studio() {
  const [mode,setMode]=useState<'picture'|'drawing'>('picture');
  const lang=useLanguage();
  return <div className="studio-shell"><nav className="studio-nav"><strong>Floorplan Studio PE</strong><button className={mode==='picture'?'active':''} onClick={()=>setMode('picture')}>{t('Existing card')}</button><button className={mode==='drawing'?'active':''} onClick={()=>setMode('drawing')}>{t('Drawing studio')}</button><select aria-label="Language / 语言" value={lang} onChange={e=>setLanguage(e.target.value as Language)}><option value="auto">{t('Follow HA')}</option><option value="zh-Hans">简体中文</option><option value="en">English</option></select></nav><div className="studio-content"><div style={{height:'100%',display:mode==='picture'?'block':'none'}}><PictureEditor/></div>{mode==='drawing'&&<App/>}</div></div>;
}
