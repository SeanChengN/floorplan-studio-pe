import { Config } from './model';
import { HassLike } from '../ha/hassBridge';

export function simulatedHass(hass: HassLike | null, overrides: Record<string, string>): HassLike | null {
  if (!hass && !Object.keys(overrides).length) return null;
  hass = hass || {states:{}};
  const states = { ...hass.states };
  for (const [id, state] of Object.entries(overrides)) {
    states[id] = { ...(states[id] || { entity_id: id, attributes: {} }), state };
  }
  // Keep HA prototype methods for formatting, but deny mutation-capable transports.
  return new Proxy(hass, {
    get(target, key) {
      if (key === 'states') return states;
      if (['callService', 'callApi', 'callWS', 'sendWS', 'connection', 'auth'].includes(String(key))) {
        if (['connection', 'auth'].includes(String(key))) return undefined;
        return () => Promise.reject(new Error('Preview is read-only'));
      }
      return Reflect.get(target, key);
    },
  });
}
// Layout fallback only. Native HA evaluates full conditions in the real preview.
export function matches(conditions: Config[], states: Record<string, { state: string }>): boolean {
  return conditions.every(c => {
    if (c.condition === 'and') return matches(c.conditions || [], states);
    if (c.condition === 'or') return (c.conditions || []).some((x: Config) => matches([x], states));
    if (c.condition && c.condition !== 'state') return false;
    if (!c.entity) return false;
    const state = states[c.entity]?.state;
    if (state === undefined) return false;
    const include = c.state === undefined || (Array.isArray(c.state) ? c.state.includes(state) : c.state === state);
    const exclude = c.state_not === undefined || !(Array.isArray(c.state_not) ? c.state_not.includes(state) : c.state_not === state);
    return include && exclude;
  });
}
export function entityIds(card: Config): string[] {
  const ids = new Set<string>();
  const visit = (v: any) => {
    if (!v || typeof v !== 'object') return;
    if (typeof v.entity === 'string') ids.add(v.entity);
    Object.values(v).forEach(visit);
  };
  visit(card); return [...ids].sort();
}
