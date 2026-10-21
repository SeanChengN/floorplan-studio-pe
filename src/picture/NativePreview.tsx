import { CSSProperties, useEffect, useRef, useState } from 'react';
import { HassLike } from '../ha/hassBridge';
import { iconPath } from '../ui/icons';
import { t } from '../i18n';
import { Config } from './model';
import { matches } from './preview';

export interface Bounds { left: number; top: number; width: number; height: number }
export function NativePreview({ card, hass, onBounds }: { card: Config; hass: HassLike | null; onBounds: (b: Bounds | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const mounted = useRef<(HTMLElement & { hass: HassLike; setConfig: (c: Config) => void }) | null>(null);
  const latest = useRef({card, hass, onBounds}); latest.current = {card, hass, onBounds};
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false; setFailed(false);
    let observer: ResizeObserver | undefined, frame = 0;
    onBounds(null);
    if (!hass || !host.current || !(window as any).loadCardHelpers) return;
    const w = window as unknown as { loadCardHelpers?: () => Promise<{ createCardElement: (c: Config) => HTMLElement & { hass: HassLike; setConfig: (c: Config) => void } }> };
    (async () => {
      try {
        if (!w.loadCardHelpers) throw new Error('No HA helpers');
        const helpers = await w.loadCardHelpers();
        if (cancelled || !host.current) return;
        const el = helpers.createCardElement(latest.current.card);
        el.hass = latest.current.hass!; el.style.cssText = 'display:block;width:100%;pointer-events:none';
        el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true');
        host.current.replaceChildren(el); mounted.current = el;
        // Read the actual picture coordinate system, excluding an optional card title.
        let attempts = 0;
        const locate = () => {
          if (cancelled) return;
          const root = el.shadowRoot?.querySelector<HTMLElement>('#root');
          if (!root) { if (++attempts < 180) frame = requestAnimationFrame(locate); return; }
          const measure = () => {
            if (!host.current) return;
            const a = host.current.parentElement!.getBoundingClientRect(), b = root.getBoundingClientRect();
            if (!a.width || !a.height || !b.width || !b.height) return;
            latest.current.onBounds({left:(b.left-a.left)/a.width,top:(b.top-a.top)/a.height,width:b.width/a.width,height:b.height/a.height});
          };
          observer = new ResizeObserver(measure); observer.observe(root); observer.observe(host.current!); measure();
        };
        frame = requestAnimationFrame(locate);
      } catch { if (!cancelled) setFailed(true); }
    })();
    return () => { cancelled = true; observer?.disconnect(); cancelAnimationFrame(frame); mounted.current = null; host.current?.replaceChildren(); };
  }, [!!hass]);
  useEffect(() => { if (mounted.current) { try { mounted.current.setConfig(card); setFailed(false); } catch { setFailed(true); } } }, [card]);
  useEffect(() => { if (mounted.current && hass) mounted.current.hass = hass; }, [hass]);
  return <div className="pe-native">
    <div ref={host}/>
    {failed && <p className="pe-render-error">{t('Cannot create native preview. Reload HA and check required resources.')}</p>}
    {(!hass || !(window as any).loadCardHelpers) && <Fallback card={card} states={hass?.states||{}} />}
  </div>;
}
function css(style: Config = {}): CSSProperties {
  return Object.fromEntries(Object.entries(style).map(([k, v]) => [k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])) as CSSProperties;
}
function Fallback({ card, states }: { card: Config; states:Record<string,{state:string}> }) {
  function elements(es: Config[]): any {
    return es.map((e, i) => {
      if (e.type === 'conditional') return matches(e.conditions, states) ? <div key={i}>{elements(e.elements)}</div> : null;
      const style: CSSProperties = { position: 'absolute', ...css(e.style) };
      if (e.type === 'image') return <img key={i} src={e.state_image?.[states[e.entity]?.state]||e.image} style={style} draggable={false} />;
      if (e.type === 'state-label') return <span key={i} style={style}>{states[e.entity]?.state||'—'}</span>;
      if (['state-icon', 'icon'].includes(e.type)) return <svg key={i} viewBox="0 0 24 24" style={{ width: 24, height: 24, fill: 'currentColor', ...style }}><path d={iconPath((e.icon || 'help-circle-outline').replace('mdi:', ''))} /></svg>;
      return null;
    });
  }
  return <div className="pe-fallback"><img className="pe-base" src={card.image} draggable={false}/>{elements(card.elements)}</div>;
}
