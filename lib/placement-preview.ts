/** Runs only inside the sandboxed placement dialog. */
export const placementTools = `<style>
html{scroll-behavior:auto}.section{cursor:crosshair}.placing{outline:2px solid #287154;outline-offset:-2px}
.placing.grid:before{content:'';position:absolute;inset:0;z-index:3;pointer-events:none;background-image:linear-gradient(90deg,#277a5777 1px,transparent 1px),linear-gradient(#277a5777 1px,transparent 1px);background-size:10% 10%}
.place-grip{position:absolute;left:var(--mx);top:var(--my);z-index:4;transform:translate(-50%,-50%);border:2px solid white;border-radius:50%;background:#215b43;color:white;line-height:1;width:26px;height:26px;display:grid;place-items:center;cursor:grab;touch-action:none}
</style><script>(()=>{
let active=null,original='',role='front',grid=true,drag=null,preferred='front',point={x:50,y:50};
const byId=id=>Array.from(document.querySelectorAll('[data-section]')).find(s=>s.dataset.section===id);
function position(x,y){
 if(!active)return;
 point={x,y};
 active.style.setProperty('--mx',x+'%');active.style.setProperty('--my',y+'%');
 const coords=x+'% '+y+'%';
 const overlay=active.querySelector(role==='button'?'.button-skin':'.front-media');
 if((role==='front'||role==='button')&&overlay){overlay.style.setProperty('--mx',x+'%');overlay.style.setProperty('--my',y+'%');}
 if(role==='background'){
  const bg=active.querySelector('.section-background-image');if(bg){bg.style.backgroundPosition=coords;if(bg.firstElementChild)bg.firstElementChild.style.objectPosition=coords;}
 }
 if(role==='hero'){const el=active.querySelector('.hero-image>*');if(el)el.style.objectPosition=coords;}
}
addEventListener('message',e=>{
 if(e.source!==parent)return;
 const d=e.data;
 if(d?.type==='placement:frame'){
  if(active){active.outerHTML=original;active=null;}
  const before=byId(d.id);if(!before)return;
  original=before.outerHTML;before.outerHTML=d.html;active=byId(d.id);role=d.role;
  active.classList.add('placing');
  const grip=document.createElement('span');grip.className='place-grip';grip.textContent='✥';grip.setAttribute('aria-hidden','true');const gripHost=role==='button'?active.querySelector('a.button'):role==='hero'?active.querySelector('.hero-image'):active;
  if(gripHost){gripHost.style.position='relative';gripHost.append(grip);}
  if(d.focus)active.scrollIntoView({block:'center'});
 }
 if(d?.type==='placement:position'||d?.type==='placement:frame'){
  grid=d.grid;preferred=d.preferred;active?.classList.toggle('grid',grid);position(d.x,d.y);
 }
});
function locate(e){
 const node=document.elementFromPoint(e.clientX,e.clientY),section=node?.closest('[data-section]');
 if(!section)return;
 const btn=node.closest('a.button') || (node.closest('.place-grip')&&role==='button'?active?.querySelector('a.button'):null);
 const next=btn?'button':preferred==='button'?(section.querySelector('a.button')?'button':'front'):preferred==='hero'?(section.dataset.label==='hero'?'hero':'front'):preferred;
 const r=(next==='button'?section.querySelector('a.button'):next==='hero'?section.querySelector('.hero-image,.artwork'):section)?.getBoundingClientRect();
 if(!r||!r.width||!r.height)return;
 const step=grid&&!e.altKey?10:1;
 const quant=n=>Math.min(100,Math.max(0,Math.round(n/step)*step));
 const x=quant((e.clientX-r.left)*100/r.width),y=quant((e.clientY-r.top)*100/r.height);
 if(active===section&&role===next)position(x,y);
 parent.postMessage({type:'placement:pick',id:section.dataset.section,role:next,x,y},'*');
}
document.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
document.addEventListener('pointerdown',e=>{
 if(e.button!==0||!e.target.closest('[data-section]'))return;
 if(e.pointerType==='touch'&&!e.target.closest('.place-grip'))return;
 e.preventDefault();drag=e.pointerId;document.documentElement.setPointerCapture(drag);locate(e);
});
document.addEventListener('pointermove',e=>{
 if(e.pointerId!==drag)return;
 if(e.clientY<35)scrollBy(0,-22);else if(e.clientY>innerHeight-35)scrollBy(0,22);
 locate(e);
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,()=>{drag=null;});
document.addEventListener('dragstart',e=>e.preventDefault());
})();</script>`;

