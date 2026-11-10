/** Editor-only behavior. Never included in exported pages. */
export const editorBridge = `<script>(()=>{
let queued=false;
const send=data=>parent.postMessage(data,'*');
document.addEventListener('click',e=>{
 if(e.target.closest('[data-interactive],.pagelet-lightbox'))return;
 const section=e.target.closest('[data-section]');
 if(e.target.closest('a'))e.preventDefault();
 if(section){
  send({type:'pagelet:select',id:section.dataset.section});
  document.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));
  section.classList.add('selected');
  if(e.target.closest('.hero-image,.artwork'))send({type:'pagelet:image',id:section.dataset.section});
 }
});
document.addEventListener('focusin',e=>{const el=e.target.closest('[data-edit]');if(el)el.dataset.original=el.innerText;});
document.addEventListener('focusout',e=>{
 const el=e.target.closest('[data-edit]'),section=el?.closest('[data-section]');
 if(!section)return;
 const value=el.innerText.replace(/\\r/g,'').slice(0,el.dataset.edit==='buttonLabel'?100:4000);
 if(value!==el.dataset.original)send({type:'pagelet:edit',id:section.dataset.section,field:el.dataset.edit,value});
});
document.addEventListener('keydown',e=>{
 const el=e.target.closest('[data-edit]');if(!el)return;
 if(e.key==='Escape'){e.preventDefault();el.innerText=el.dataset.original||'';el.blur();}
 if(e.key==='Enter'&&(e.ctrlKey||e.metaKey||el.dataset.edit==='buttonLabel')){e.preventDefault();el.blur();}
});
document.addEventListener('paste',e=>{
 const el=e.target.closest('[data-edit]');if(!el)return;
 e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));
});
addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(()=>{send({type:'pagelet:scroll',y:scrollY});queued=false;});}},{passive:true});
addEventListener('message',e=>{
 if(e.source!==parent)return;
 if(e.data?.type==='pagelet:focus'){
  const el=[...document.querySelectorAll('[data-section]')].find(el=>el.dataset.section===e.data.id);
  document.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));
  if(el){el.classList.add('selected');el.scrollIntoView({behavior:'smooth',block:'start'});}
 }
});
})();</script>`;

export const editorCss = `[data-edit]{cursor:text;white-space:pre-wrap;outline-offset:4px;min-width:1em;min-height:1em}[data-edit]:hover{outline:1px dashed #718563}[data-edit]:focus{outline:2px solid #718563;background:color-mix(in srgb,var(--bg) 85%,transparent)}.hero-image,.artwork{cursor:pointer}.hero-image:hover{outline:2px dashed #718563;outline-offset:5px}[data-section]:after{pointer-events:none}`;
