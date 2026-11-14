/* Friendly local SVG illustrations: no external icon fonts or services. */
globalThis.TeamOpsIcons=(()=>{const shapes={
home:'<path fill="#f2cf9a" d="m5 14 11-9 11 9v13H5z"/><path fill="#f9ede0" d="M10 16h12v11H10z"/><path fill="#8bb4a1" d="M14 20h5v7h-5z"/><path d="m3 14 13-11 13 11"/><path d="M24 5v5"/>',
folder:'<path fill="#edc887" d="M3 9a3 3 0 0 1 3-3h7l4 4h9a3 3 0 0 1 3 3v12H3z"/><path fill="#f5dfb5" d="M3 14h26l-3 13H6z"/><path d="M12 21h8"/>',
task:'<rect x="6" y="6" width="21" height="23" rx="5" fill="#d9eadc"/><rect x="12" y="3" width="9" height="6" rx="2" fill="#f1d3b5"/><path d="m11 18 4 4 8-9"/>',
people:'<circle cx="12" cy="11" r="5" fill="#edc9b3"/><circle cx="24" cy="13" r="4" fill="#d6c6e7"/><path fill="#a9c9b4" d="M3 28v-4a9 9 0 0 1 18 0v4z"/><path fill="#d6c6e7" d="M22 20a6 6 0 0 1 8 6v2h-6"/>',
bell:'<path fill="#f5d590" d="M7 23c3-4 1-10 4-14a7 7 0 0 1 11 0c3 4 1 10 4 14z"/><path d="M5 24h23M13 28q4 4 7 0M16 3v2"/><circle cx="25" cy="6" r="4" fill="#e4a9ac" stroke="none"/>',
note:'<path fill="#f5e5b6" d="M6 3h17l5 6v19H6z"/><path d="M22 3v7h6M11 14h11M11 19h8M11 24h7"/>',
trash:'<path fill="#e7d2d0" d="m8 10 2 19h13l2-19z"/><path d="M5 9h23M12 5h9M14 14v10M20 14v10"/>',
settings:'<path fill="#d5dfed" d="m12 3 9 1 2 6 6 4-2 10-6 2-4 5-9-4-1-6-5-5 4-8 6-1z"/><circle cx="16" cy="17" r="6" fill="#fffaf0"/>',
search:'<circle cx="14" cy="13" r="9" fill="#dcebe0"/><circle cx="14" cy="13" r="5" fill="#fffdf7" stroke="none"/><path d="m21 20 8 8" stroke-width="4"/>',
repair:'<path fill="#ebc5bf" d="M20 4a8 8 0 0 0-9 10L3 24l5 5 10-9A8 8 0 0 0 29 9l-6 5-5-4z"/>',
bolt:'<path fill="#d6c5e5" d="m18 2-12 17h9l-1 12 13-18h-9z"/>',
flower:'<path d="M16 19v12m0-5q-9-8-11-2 5 7 11 2" fill="#a9cbb0"/><path fill="#eab9b7" d="M16 5c-7-8-13 1-7 6-10 0-8 11 0 10-3 9 8 12 10 3 7 6 14-3 7-8 9-4 3-14-4-9 1-9-10-10-6-2z"/><circle cx="16" cy="15" r="5" fill="#f8dc8e"/>',
plus:'<path d="M16 7v18M7 16h18"/>',close:'<path d="m9 9 14 14M23 9 9 23"/>'};
const aliases={'⌂':'home','▧':'folder','☑':'task','♧':'people','✧':'bell','▤':'note','♲':'trash','⚙':'settings','⌕':'search','⚒':'repair','ϟ':'bolt','✿':'flower','＋':'plus','✕':'close'};
function icon(name){return '<svg class="friendly-icon" viewBox="0 0 32 34" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+(shapes[name]||shapes.flower)+'</svg>'}
function decorate(root=document){for(const el of root.querySelectorAll('.glyph,.type-icon,.stat-icon,.brand-icon,[data-icon]')){const name=el.dataset.icon||aliases[el.textContent.trim()];if(name)el.innerHTML=icon(name)}for(const el of root.querySelectorAll('h2')){const n=el.firstChild;if(n?.nodeType===3&&aliases[n.textContent.trim()[0]]){const text=n.textContent.trim(),span=document.createElement('span');span.className='heading-icon';span.innerHTML=icon(aliases[text[0]]);n.textContent=text.slice(1).trimStart();el.prepend(span)}}}
return {icon,decorate};})();
