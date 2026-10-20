import { Config } from './model';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#222b36"/><path d="M90 90H1110V710H90ZM600 90V710M90 400H600" fill="none" stroke="#91a0ac" stroke-width="12"/><path d="M100 100H590V390H100Z" fill="#354857"/><path d="M100 410H590V700H100Z" fill="#35404b"/><path d="M610 100H1100V700H610Z" fill="#414c54"/><g fill="#9caab5"><rect x="150" y="140" width="220" height="150" rx="8"/><rect x="160" y="470" width="160" height="80" rx="8"/><rect x="780" y="200" width="120" height="340" rx="8"/></g></svg>`;
export const demoCard: Config = { type: 'picture-elements', image: `data:image/svg+xml,${encodeURIComponent(svg)}`, elements: [
  { type:'state-icon', entity:'light.demo_room', style:{left:'30%',top:'30%',opacity:.5,transform:'translate(-50%, -50%)'},tap_action:{action:'toggle'} },
  { type:'state-label', entity:'sensor.demo_temperature', style:{left:'70%',top:'60%',opacity:.5,transform:'translate(-50%, -50%)'},tap_action:{action:'more-info'} },
] };
