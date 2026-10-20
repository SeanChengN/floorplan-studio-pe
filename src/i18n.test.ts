import { describe, expect, it } from 'vitest';
import { setLanguage, t, zh } from './i18n';
import { setHass } from './ha/hassBridge';
describe('localization',()=>{
  it('uses HA locale then manual override, retaining technical IDs',()=>{
    setHass({states:{},locale:{language:'zh-Hans'}} as any);setLanguage('auto');
    expect(t('Import card')).toBe('导入卡片');expect(t('light.example')).toBe('light.example');
    setLanguage('en');expect(t('Import card')).toBe('Import card');
    setLanguage('zh-Hans');expect(t('invalidCard')).toContain('picture-elements');
    setHass(null);setLanguage('auto');
  });
  it('has no empty Chinese translations',()=>{
    expect(Object.keys(zh).length).toBeGreaterThan(250);
    for(const value of Object.values(zh))expect(value.trim().length).toBeGreaterThan(0);
  });
});
