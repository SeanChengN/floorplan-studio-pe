import PictureEditor from './picture/Editor';
import { Language, setLanguage, t, useLanguage } from './i18n';
export default function Studio() {
  const lang=useLanguage();
  return <div className="studio-shell"><nav className="studio-nav"><strong>Floorplan Studio PE</strong><select aria-label="Language / 语言" value={lang} onChange={e=>setLanguage(e.target.value as Language)}><option value="auto">{t('Follow HA')}</option><option value="zh-Hans">简体中文</option><option value="en">English</option></select></nav><div className="studio-content"><PictureEditor/></div></div>;
}
